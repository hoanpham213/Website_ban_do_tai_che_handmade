import { initPage } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { searchProducts } from '../services/products.js';
import { ProductGrid } from '../components/product/ProductCard.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/States.js';
import { HeroBanner } from '../components/home/HeroBanner.js';
import { PRODUCT_LINES } from '../config/constants.js';

initPage({
  title: 'Trang chủ',
  fullWidth: true,
  render: async (main) => {
    const latest = el('section', { attrs: { 'aria-labelledby': 'latest-title' } });
    render(main,
      HeroBanner(),
      el('div', { className: 'page-container py-6' }, [
      // Hai lối vào chính: Tái chế / Handmade
      el('section', { className: 'mb-10 grid gap-4 sm:grid-cols-2', attrs: { 'aria-label': 'Dòng sản phẩm' } },
        Object.entries(PRODUCT_LINES).map(([key, line]) => el('a', {
          className: 'block rounded-2xl bg-white p-6 shadow-sm ring-1 ring-cream-200 transition hover:shadow-md hover:ring-brand-500',
          attrs: { href: `/products.html?line=${key}` },
        }, [
          el('h2', { className: 'text-xl font-semibold text-brand-700', text: line.label }),
          el('p', { className: 'mt-1 text-sm text-stone-600', text: line.description }),
          el('span', { className: 'mt-4 inline-block text-sm font-medium text-earth-700', text: 'Xem sản phẩm →' }),
        ]))),
      latest,
      ]),
    );
    await loadLatest(latest);
  },
});

async function loadLatest(container) {
  render(container, el('h2', { className: 'mb-6 text-2xl font-bold text-stone-900 sm:text-3xl', text: 'Sản phẩm mới', attrs: { id: 'latest-title' } }), LoadingSkeleton({ variant: 'cards', count: 4 }));
  try {
    const { items } = await searchProducts({ sort: 'newest', limit: 8 });
    render(container, container.firstChild,
      items.length > 0
        ? ProductGrid({ products: items })
        : EmptyState({ title: 'Chưa có sản phẩm', message: 'Cửa hàng đang chuẩn bị những món đồ đầu tiên.' }));
  } catch (error) {
    render(container, container.firstChild, ErrorState({ message: toUserMessage(error), onRetry: () => loadLatest(container) }));
  }
}
