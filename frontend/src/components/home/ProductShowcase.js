import { el, render } from '../../lib/dom.js';
import { toUserMessage } from '../../lib/errors.js';
import { ProductCard } from '../product/ProductCard.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/States.js';

const SHOWCASE_COUNT = 4;

/**
 * Một khu sản phẩm trên trang chủ: tiêu đề + liên kết "Xem tất cả" + lưới sản phẩm.
 * loadItems: async () => mảng sản phẩm (dòng từ search_products).
 * hideWhenEmpty: true -> không có sản phẩm thì ẩn cả khu (dùng cho các khu theo vật liệu).
 */
export function ProductShowcase({ id, title, href, loadItems, hideWhenEmpty = false, emptyMessage }) {
  const body = el('div');
  const section = el('section', { className: 'mb-12', attrs: { 'aria-labelledby': id } }, [
    el('div', { className: 'mb-4 flex items-end justify-between gap-4' }, [
      el('h2', { className: 'text-2xl font-bold text-stone-900 sm:text-3xl', text: title, attrs: { id } }),
      el('a', {
        className: 'inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-earth-700 hover:text-brand-700',
        text: 'Xem tất cả →',
        attrs: { href, 'aria-label': `Xem tất cả: ${title}` },
      }),
    ]),
    body,
  ]);

  async function load() {
    render(body, LoadingSkeleton({ variant: 'cards', count: SHOWCASE_COUNT }));
    try {
      const items = await loadItems();
      if (items.length === 0) {
        if (hideWhenEmpty) section.hidden = true;
        else render(body, EmptyState({ title: 'Chưa có sản phẩm', message: emptyMessage }));
        return;
      }
      section.hidden = false;
      render(body, el('div', { className: 'grid grid-cols-2 gap-4 lg:grid-cols-4' },
        items.slice(0, SHOWCASE_COUNT).map((product) => ProductCard({ product }))));
    } catch (error) {
      section.hidden = false;
      render(body, ErrorState({ message: toUserMessage(error), onRetry: load }));
    }
  }

  load();
  return section;
}
