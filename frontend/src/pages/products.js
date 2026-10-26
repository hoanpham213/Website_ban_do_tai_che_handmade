import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { getCategories, getMaterials, searchProducts } from '../services/products.js';
import { ProductGrid } from '../components/product/ProductCard.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/States.js';
import { Pagination } from '../components/common/Display.js';
import { PAGE_SIZE, SORT_OPTIONS, PRODUCT_LINES, MATERIAL_GROUPS } from '../config/constants.js';

// Trạng thái lọc nằm trên URL để có thể chia sẻ link và bấm Back.
// Bộ lọc theo thuộc tính động (getCategoryFilters) sẽ thêm ở giai đoạn sau.
function readState() {
  const params = new URLSearchParams(window.location.search);
  const line = params.get('line');
  const material = params.get('material');
  return {
    material: Object.hasOwn(MATERIAL_GROUPS, material) ? material : null,
    line: Object.hasOwn(PRODUCT_LINES, line) ? line : null,
    categoryId: Number(params.get('category')) || null,
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
      load();
    };

    const filterForm = el('form', {
      className: 'mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]',
      attrs: { role: 'search' },
      on: { submit: (e) => { e.preventDefault(); apply({ keyword: keywordInput.value.trim(), page: 1 }); } },
    }, [keywordInput, categorySelect, sortSelect]);
    categorySelect.addEventListener('change', () => apply({ categoryId: Number(categorySelect.value) || null, page: 1 }));
    sortSelect.addEventListener('change', () => apply({ sort: sortSelect.value, page: 1 }));
    window.addEventListener('popstate', () => { state = readState(); load(); });

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

    render(main, heading, tabs, filterForm, results);

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
          render(results, EmptyState({ title: 'Không tìm thấy sản phẩm', message: 'Thử từ khóa khác hoặc bỏ bớt bộ lọc.' }));
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
