import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { getCategories, getCategoryFilters, getMaterials, searchProducts } from '../services/products.js';
import { ProductGrid } from '../components/product/ProductCard.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/States.js';
import { Pagination } from '../components/common/Display.js';
import { Button } from '../components/ui/Button.js';
import { PAGE_SIZE, SORT_OPTIONS, PRODUCT_LINES, MATERIAL_GROUPS } from '../config/constants.js';

// Trạng thái lọc nằm trên URL để có thể chia sẻ link và bấm Back.
// Bộ lọc thuộc tính (màu sắc, kích thước...) lấy theo danh mục đang chọn (getCategoryFilters).
const toPrice = (value) => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 && value !== null && value !== '' ? number : null;
};

function readState() {
  const params = new URLSearchParams(window.location.search);
  const line = params.get('line');
  const material = params.get('material');
  const categoryId = Number(params.get('category')) || null;
  const optionIds = categoryId
    ? (params.get('options') ?? '').split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  return {
    material: Object.hasOwn(MATERIAL_GROUPS, material) ? material : null,
    line: Object.hasOwn(PRODUCT_LINES, line) ? line : null,
    categoryId,
    optionIds,
    minPrice: toPrice(params.get('min')),
    maxPrice: toPrice(params.get('max')),
    keyword: params.get('q') ?? '',
    sort: SORT_OPTIONS.some((o) => o.value === params.get('sort')) ? params.get('sort') : 'newest',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
}

function writeState(state) {
  const params = new URLSearchParams();
  if (state.line) params.set('line', state.line);
  if (state.material) params.set('material', state.material);
  if (state.categoryId) params.set('category', state.categoryId);
  if (state.keyword) params.set('q', state.keyword);
  if (state.minPrice !== null) params.set('min', state.minPrice);
  if (state.maxPrice !== null) params.set('max', state.maxPrice);
  if (state.optionIds.length > 0) params.set('options', state.optionIds.join(','));
  if (state.sort !== 'newest') params.set('sort', state.sort);
  if (state.page > 1) params.set('page', state.page);
  history.pushState(null, '', `?${params}`);
}

initPage({
  title: 'Sản phẩm',
  render: async (main) => {
    const categories = await getCategories();
    const results = el('div', { className: 'space-y-6' });
    let state = readState();

    const keywordInput = el('input', {
      className: 'min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base',
      attrs: { type: 'search', name: 'q', value: state.keyword, placeholder: 'Tìm sản phẩm...', 'aria-label': 'Từ khóa', maxlength: 100 },
    });
    const categorySelect = el('select', {
      className: 'min-h-11 rounded-lg border border-stone-300 bg-white px-3',
      attrs: { 'aria-label': 'Danh mục' },
    }, [
      el('option', { text: 'Tất cả danh mục', attrs: { value: '' } }),
      ...categories.map((c) => el('option', { text: c.name, attrs: { value: c.id, selected: c.id === state.categoryId } })),
    ]);
    const sortSelect = el('select', {
      className: 'min-h-11 rounded-lg border border-stone-300 bg-white px-3',
      attrs: { 'aria-label': 'Sắp xếp' },
    }, SORT_OPTIONS.map((o) => el('option', { text: o.label, attrs: { value: o.value, selected: o.value === state.sort } })));

    const apply = (changes) => {
      state = { ...state, ...changes };
      writeState(state);
      updateFilterSummary();
      load();
    };

    // ----- Bộ lọc giá + thuộc tính -----
    const NUMBER_INPUT_CLASS = 'min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base';
    const minInput = el('input', { className: NUMBER_INPUT_CLASS, attrs: { type: 'number', inputmode: 'numeric', min: 0, step: 1000, name: 'min', placeholder: 'Từ (đ)', 'aria-label': 'Giá thấp nhất' } });
    const maxInput = el('input', { className: NUMBER_INPUT_CLASS, attrs: { type: 'number', inputmode: 'numeric', min: 0, step: 1000, name: 'max', placeholder: 'Đến (đ)', 'aria-label': 'Giá cao nhất' } });
    const attributeBox = el('div', { className: 'space-y-4' });
    const filtersCache = new Map();
    const filterSummary = el('summary', { className: 'flex min-h-11 cursor-pointer items-center font-medium text-stone-800' });

    const activeFilterCount = () => (state.minPrice !== null || state.maxPrice !== null ? 1 : 0) + state.optionIds.length;
    function updateFilterSummary() {
      const count = activeFilterCount();
      filterSummary.textContent = count > 0 ? `Bộ lọc (${count})` : 'Bộ lọc';
    }

    async function buildAttributeFilters() {
      const categoryId = state.categoryId;
      if (!categoryId) {
        render(attributeBox, el('p', { className: 'text-sm text-stone-500', text: 'Chọn một danh mục để lọc theo màu sắc, kích thước...' }));
        return;
      }
      render(attributeBox, LoadingSkeleton({ count: 2 }));
      try {
        if (!filtersCache.has(categoryId)) filtersCache.set(categoryId, await getCategoryFilters(categoryId));
        if (categoryId !== state.categoryId) return; // đã đổi danh mục trong lúc tải
        const groups = filtersCache.get(categoryId).filter((attribute) => attribute.attribute_options?.length > 0);
        if (groups.length === 0) {
          render(attributeBox, el('p', { className: 'text-sm text-stone-500', text: 'Danh mục này chưa có bộ lọc thuộc tính.' }));
          return;
        }
        render(attributeBox, ...groups.map((attribute) => el('fieldset', { className: 'space-y-2' }, [
          el('legend', { className: 'text-sm font-medium text-stone-700', text: attribute.name }),
          el('div', { className: 'flex flex-wrap gap-2' }, [...attribute.attribute_options]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((option) => el('label', {
              className: 'inline-flex min-h-11 cursor-pointer items-center rounded-full border border-stone-300 bg-white px-4 text-sm text-stone-700 '
                + 'has-[:checked]:border-brand-700 has-[:checked]:bg-brand-700 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600',
            }, [
              el('input', {
                className: 'sr-only',
                attrs: { type: 'checkbox', value: option.id, checked: state.optionIds.includes(option.id) },
                on: { change: () => apply({ optionIds: [...attributeBox.querySelectorAll('input:checked')].map((box) => Number(box.value)), page: 1 }) },
              }),
              el('span', { text: option.value }),
            ]))),
        ])));
      } catch (error) {
        render(attributeBox, ErrorState({ message: toUserMessage(error), onRetry: buildAttributeFilters }));
      }
    }

    function applyPrice(event) {
      event.preventDefault();
      let minPrice = toPrice(minInput.value);
      let maxPrice = toPrice(maxInput.value);
      if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
      minInput.value = minPrice ?? '';
      maxInput.value = maxPrice ?? '';
      apply({ minPrice, maxPrice, page: 1 });
    }

    function clearFilters() {
      minInput.value = '';
      maxInput.value = '';
      apply({ minPrice: null, maxPrice: null, optionIds: [], page: 1 });
      buildAttributeFilters();
    }

    // Đưa các ô nhập về đúng với state (dùng khi bấm Back / Forward)
    function syncControls() {
      keywordInput.value = state.keyword;
      categorySelect.value = String(state.categoryId ?? '');
      sortSelect.value = state.sort;
      minInput.value = state.minPrice ?? '';
      maxInput.value = state.maxPrice ?? '';
      updateFilterSummary();
      buildAttributeFilters();
    }

    const filterPanel = el('details', { className: 'mb-6 rounded-xl bg-white px-4 shadow-sm ring-1 ring-cream-200' }, [
      filterSummary,
      el('div', { className: 'space-y-4 pb-4' }, [
        el('form', { className: 'space-y-2', on: { submit: applyPrice } }, [
          el('p', { className: 'text-sm font-medium text-stone-700', text: 'Khoảng giá' }),
          el('div', { className: 'grid grid-cols-[1fr_1fr_auto] gap-2' }, [
            minInput, maxInput,
            Button({ label: 'Áp dụng', type: 'submit', variant: 'secondary' }),
          ]),
        ]),
        attributeBox,
        Button({ label: 'Xóa bộ lọc', variant: 'secondary', onClick: clearFilters }),
      ]),
    ]);

    const filterForm = el('form', {
      className: 'mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]',
      attrs: { role: 'search' },
      on: { submit: (e) => { e.preventDefault(); apply({ keyword: keywordInput.value.trim(), page: 1 }); } },
    }, [keywordInput, categorySelect, sortSelect]);
    categorySelect.addEventListener('change', () => {
      // Đổi danh mục thì bộ lọc thuộc tính cũ không còn đúng -> bỏ
      apply({ categoryId: Number(categorySelect.value) || null, optionIds: [], page: 1 });
      buildAttributeFilters();
    });
    sortSelect.addEventListener('change', () => apply({ sort: sortSelect.value, page: 1 }));
    window.addEventListener('popstate', () => { state = readState(); syncControls(); load(); });

    // Tab Tất cả / Tái chế / Handmade: là link thật (tải lại trang) để menu trên header
    // cũng đánh dấu đúng mục đang xem. Đổi tab thì bắt đầu lại bộ lọc.
    const current = state.line ? PRODUCT_LINES[state.line] : null;
    const materialGroup = state.material ? MATERIAL_GROUPS[state.material] : null;
    const pageTitle = materialGroup?.label ?? current?.label ?? 'Sản phẩm';
    document.title = `${pageTitle} – GOM`;
    const tabHref = (line) => (line ? `/products.html?line=${line}` : '/products.html');
    const heading = PageHeading(pageTitle, materialGroup ? 'Sản phẩm làm từ vật liệu này' : current?.description ?? 'Đồ tái chế và handmade');
    const tabs = el('nav', { className: 'mb-4 flex gap-2 overflow-x-auto', attrs: { 'aria-label': 'Dòng sản phẩm' } },
      [[null, 'Tất cả'], ...Object.entries(PRODUCT_LINES).map(([k, v]) => [k, v.label])].map(([key, label]) => el('a', {
        className: 'inline-flex min-h-11 shrink-0 items-center rounded-full border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 '
          + 'aria-[current=page]:border-brand-700 aria-[current=page]:bg-brand-700 aria-[current=page]:text-white',
        text: label,
        attrs: { href: tabHref(key), 'aria-current': state.line === key ? 'page' : null },
      })));

    render(main, heading, tabs, filterForm, filterPanel, results);
    if (activeFilterCount() > 0) filterPanel.open = true;
    updateFilterSummary();
    buildAttributeFilters();

    // Nhóm vật liệu trên menu -> danh sách id vật liệu trong database (so khớp theo tên)
    let materialsCache = null;
    async function resolveMaterialIds() {
      if (!materialGroup) return undefined;
      materialsCache ??= await getMaterials();
      const keyword = materialGroup.keyword.normalize('NFC').toLowerCase();
      return materialsCache
        .filter((m) => m.name.normalize('NFC').toLowerCase().includes(keyword))
        .map((m) => m.id);
    }

    async function load() {
      render(results, LoadingSkeleton({ variant: 'cards', count: 8 }));
      try {
        const materialIds = await resolveMaterialIds();
        if (materialGroup && materialIds.length === 0) {
          // Không có vật liệu nào khớp: không được bỏ lọc (sẽ hiện nhầm toàn bộ sản phẩm)
          render(results, EmptyState({ title: 'Chưa có sản phẩm', message: `Chưa có sản phẩm làm từ ${materialGroup.label.toLowerCase()}.` }));
          return;
        }
        const { items, total } = await searchProducts({ ...state, materialIds });
        if (items.length === 0) {
          render(results, EmptyState({ title: 'Không tìm thấy sản phẩm', message: activeFilterCount() > 0 ? 'Thử bỏ bớt bộ lọc hoặc dùng từ khóa khác.' : 'Thử từ khóa khác.' }));
          return;
        }
        render(results,
          ProductGrid({ products: items }),
          Pagination({ page: state.page, total, pageSize: PAGE_SIZE, onChange: (page) => apply({ page }) }));
      } catch (error) {
        render(results, ErrorState({ message: toUserMessage(error), onRetry: load }));
      }
    }
    await load();
  },
});
