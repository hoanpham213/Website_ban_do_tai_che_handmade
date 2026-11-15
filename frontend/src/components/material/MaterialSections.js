// Nội dung trang riêng của một nhóm vật liệu (Giấy, Thủy tinh, Gỗ, Nhựa), dùng chung cho mọi nhóm.
// Thứ tự: Sản phẩm tiêu biểu → Tất cả sản phẩm (giá thấp đến cao, phân trang).
// Footer do app.js thêm sẵn. Muốn thêm khu thông tin mới: thêm một phần tử vào mảng cuối hàm.
import { el, render } from '../../lib/dom.js';
import { toUserMessage } from '../../lib/errors.js';
import { findMaterialIds, searchProducts } from '../../services/products.js';
import { MATERIAL_GROUPS, PAGE_SIZE } from '../../config/constants.js';
import { ProductGrid } from '../product/ProductCard.js';
import { ProductShowcase } from '../home/ProductShowcase.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/States.js';
import { Pagination } from '../common/Display.js';

const ALL_ID = 'material-all';

/** @param {keyof typeof MATERIAL_GROUPS} materialKey */
export function MaterialSections(materialKey) {
  const group = MATERIAL_GROUPS[materialKey];
  const name = group.label.toLowerCase();

  // Tìm id vật liệu một lần; lỗi thì cho thử lại.
  let idsPromise = null;
  const loadMaterialIds = () => {
    idsPromise ??= findMaterialIds(group.keyword).catch((error) => { idsPromise = null; throw error; });
    return idsPromise;
  };

  // 1) Sản phẩm tiêu biểu. Tạm: 4 sản phẩm mới nhất (đổi nguồn ở đây khi có dữ liệu bán hàng).
  const featured = ProductShowcase({
    id: `featured-${materialKey}-title`,
    title: 'Sản phẩm tiêu biểu',
    href: `#${ALL_ID}`,
    hideWhenEmpty: true,
    loadItems: async () => {
      const materialIds = await loadMaterialIds();
      // Không có vật liệu khớp: không được bỏ lọc (sẽ hiện nhầm toàn bộ sản phẩm)
      if (materialIds.length === 0) return [];
      return (await searchProducts({ materialIds, sort: 'newest', limit: 4 })).items;
    },
  });

  // 2) Tất cả sản phẩm, giá tăng dần. Số trang nằm trên URL (?page=) để chia sẻ link và bấm Back.
  const listBody = el('div', { className: 'space-y-6' });
  let page = Math.max(1, Number(new URLSearchParams(window.location.search).get('page')) || 1);

  async function loadList() {
    render(listBody, LoadingSkeleton({ variant: 'cards', count: 8 }));
    try {
      const materialIds = await loadMaterialIds();
      if (materialIds.length === 0) {
        render(listBody, EmptyState({ title: 'Chưa có sản phẩm', message: `Chưa có sản phẩm làm từ ${name}.` }));
        return;
      }
      const { items, total } = await searchProducts({ materialIds, sort: 'price_asc', page });
      if (items.length === 0) {
        render(listBody, EmptyState({ title: 'Chưa có sản phẩm', message: `Chưa có sản phẩm làm từ ${name}.` }));
        return;
      }
      render(listBody,
        ProductGrid({ products: items }),
        Pagination({
          page, total, pageSize: PAGE_SIZE,
          onChange: (next) => {
            page = next;
            history.pushState(null, '', next > 1 ? `?page=${next}` : window.location.pathname);
            loadList();
            document.getElementById(ALL_ID)?.scrollIntoView({ behavior: 'smooth' });
          },
        }));
    } catch (error) {
      render(listBody, ErrorState({ message: toUserMessage(error), onRetry: loadList }));
    }
  }
  window.addEventListener('popstate', () => {
    page = Math.max(1, Number(new URLSearchParams(window.location.search).get('page')) || 1);
    loadList();
  });
  loadList();

  const allSection = el('section', { className: 'mb-12', attrs: { id: ALL_ID, 'aria-labelledby': `${ALL_ID}-title` } }, [
    el('div', { className: 'mb-4' }, [
      el('h2', { className: 'text-2xl font-bold text-stone-900 sm:text-3xl', text: `Tất cả sản phẩm ${name}`, attrs: { id: `${ALL_ID}-title` } }),
      el('p', { className: 'mt-1 text-sm text-stone-500', text: 'Sắp xếp theo giá từ thấp đến cao' }),
    ]),
    listBody,
  ]);

  // 3) Khu thông tin bổ sung: chưa quyết định nội dung, thêm vào đây khi có.
  return el('div', {}, [featured, allSection]);
}
