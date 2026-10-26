import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { getFavorites, removeFavorite } from '../services/favorites.js';
import { addToCart } from '../services/cart.js';
import { getImageUrl, getAvailable, getPrimaryImagePath } from '../services/products.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/States.js';
import { PriceDisplay } from '../components/common/Display.js';
import { Button, ButtonLink, runWithLoading } from '../components/ui/Button.js';
import { showToast } from '../components/ui/Toast.js';
import { ProductLineTags } from '../components/product/ProductCard.js';

/** Một dòng yêu thích. product = null khi sản phẩm đã ngừng bán (RLS ẩn đi). */
function FavoriteItem({ favorite, onRemoved }) {
  const product = favorite.products;
  const available = product ? getAvailable(product) : 0;

  const removeButton = Button({ label: 'Bỏ yêu thích', variant: 'ghost', className: 'text-sm' });
  removeButton.addEventListener('click', () => runWithLoading(removeButton, async () => {
    try {
      await removeFavorite(favorite.product_id);
      onRemoved();
    } catch (error) {
      showToast(toUserMessage(error), 'error');
    }
  }, 'Đang bỏ...'));

  const cartButton = product
    ? Button({ label: available > 0 ? 'Thêm vào giỏ' : 'Hết hàng', disabled: available <= 0, className: 'text-sm' })
    : null;
  cartButton?.addEventListener('click', () => runWithLoading(cartButton, async () => {
    try {
      await addToCart(product.id, 1);
      showToast('Đã thêm vào giỏ hàng', 'success');
    } catch (error) {
      showToast(toUserMessage(error), 'error');
    }
  }, 'Đang thêm...'));

  const imageUrl = product ? getImageUrl(getPrimaryImagePath(product)) : null;
  const href = product ? `/product.html?slug=${encodeURIComponent(product.slug)}` : null;

  return el('li', { className: 'flex gap-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-cream-200' }, [
    el('div', { className: 'h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-cream-100 sm:h-28 sm:w-28' }, [
      imageUrl ? el('img', { className: 'h-full w-full object-cover', attrs: { src: imageUrl, alt: product.name, loading: 'lazy' } }) : null,
    ]),
    el('div', { className: 'flex min-w-0 flex-1 flex-col gap-1' }, product
      ? [
          ProductLineTags({ product }),
          el('a', { className: 'line-clamp-2 font-medium text-stone-800 hover:text-brand-700', text: product.name, attrs: { href } }),
          PriceDisplay({ amount: product.price, className: 'text-sm' }),
          el('div', { className: 'mt-auto flex flex-wrap gap-2 pt-2' }, [cartButton, removeButton]),
        ]
      : [
          el('p', { className: 'font-medium text-stone-500', text: 'Sản phẩm không còn được bán' }),
          el('div', { className: 'mt-auto pt-2' }, [removeButton]),
        ]),
  ]);
}

initPage({
  title: 'Yêu thích',
  access: 'customer',
  render: async (main) => {
    const list = el('div');
    render(main, PageHeading('Sản phẩm yêu thích'), list);

    async function load() {
      render(list, LoadingSkeleton({ count: 4 }));
      try {
        const favorites = await getFavorites();
        if (favorites.length === 0) {
          render(list, EmptyState({
            title: 'Chưa có sản phẩm yêu thích',
            message: 'Bấm "Yêu thích" ở trang sản phẩm để lưu lại món bạn thích.',
            action: ButtonLink({ label: 'Xem sản phẩm', href: '/products.html', variant: 'secondary' }),
          }));
          return;
        }
        render(list, el('ul', { className: 'grid gap-3 md:grid-cols-2' },
          favorites.map((favorite) => FavoriteItem({ favorite, onRemoved: load }))));
      } catch (error) {
        render(list, ErrorState({ message: toUserMessage(error), onRetry: load }));
      }
    }
    await load();
  },
});
