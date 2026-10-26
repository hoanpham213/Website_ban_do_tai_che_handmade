import { initPage } from '../app.js';
import { el, render, getQueryParam } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { formatWeight } from '../lib/format.js';
import { getProductBySlug, getImageUrl, getAvailable } from '../services/products.js';
import { addToCart } from '../services/cart.js';
import { EmptyState } from '../components/common/States.js';
import { PriceDisplay } from '../components/common/Display.js';
import { Button, ButtonLink, runWithLoading } from '../components/ui/Button.js';
import { showToast } from '../components/ui/Toast.js';
import { FavoriteButton } from '../components/product/FavoriteButton.js';
import { ProductLineTags } from '../components/product/ProductCard.js';

initPage({
  title: 'Chi tiết sản phẩm',
  render: async (main, { profile }) => {
    const slug = getQueryParam('slug');
    const product = slug ? await getProductBySlug(slug) : null;
    if (!product) {
      render(main, EmptyState({
        title: 'Không tìm thấy sản phẩm',
        action: ButtonLink({ label: 'Về trang sản phẩm', href: '/products.html', variant: 'secondary' }),
      }));
      return;
    }
    document.title = `${product.name} – GOM`;

    const images = [...product.product_images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
    const available = getAvailable(product);
    const totalWeight = product.product_materials.reduce((sum, m) => sum + m.weight_grams, 0);

    const addButton = Button({
      label: available > 0 ? 'Thêm vào giỏ' : 'Hết hàng',
      disabled: available <= 0,
      className: 'w-full sm:w-auto',
      onClick: () => {
        if (!profile) {
          window.location.assign(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
          return;
        }
        runWithLoading(addButton, async () => {
          try {
            await addToCart(product.id, 1);
            showToast('Đã thêm vào giỏ hàng', 'success');
          } catch (error) {
            showToast(toUserMessage(error), 'error');
          }
        });
      },
    });

    render(main, el('article', { className: 'grid gap-8 md:grid-cols-2' }, [
      el('div', { className: 'space-y-3' }, [
        el('div', { className: 'aspect-square overflow-hidden rounded-xl bg-cream-100' }, [
          images[0] ? el('img', { className: 'h-full w-full object-cover', attrs: { src: getImageUrl(images[0].storage_path), alt: images[0].alt_text || product.name } }) : null,
        ]),
      ]),
      el('div', { className: 'space-y-4' }, [
        el('p', { className: 'text-sm text-stone-500', text: product.categories?.name ?? '' }),
        ProductLineTags({ product }),
        el('h1', { className: 'text-2xl font-bold text-stone-900 sm:text-3xl', text: product.name }),
        PriceDisplay({ amount: product.price, className: 'text-xl' }),
        el('p', {
          className: 'text-sm text-stone-600',
          text: product.sale_type === 'UNIQUE'
            ? (available > 0 ? 'Độc bản – chỉ có 1 chiếc' : 'Độc bản – đã có người đặt')
            : (available > 0 ? `Còn ${available} sản phẩm` : 'Hết hàng'),
        }),
        el('div', { className: 'flex flex-col gap-2 sm:flex-row' }, [
          addButton,
          FavoriteButton({ productId: product.id, profile }),
        ]),
        product.description ? el('p', { className: 'whitespace-pre-line text-stone-700', text: product.description }) : null,
        product.product_materials.length > 0
          ? el('section', { className: 'rounded-xl bg-brand-100 p-4' }, [
              el('h2', { className: 'font-semibold text-brand-800', text: 'Vật liệu tái sử dụng' }),
              el('ul', { className: 'mt-2 space-y-1 text-sm text-stone-700' },
                product.product_materials.map((m) => el('li', { text: `${m.materials.name}: ${formatWeight(m.weight_grams)}` }))),
              el('p', { className: 'mt-2 text-sm font-medium text-brand-800', text: `Tổng: ${formatWeight(totalWeight)} (ước tính)` }),
            ])
          : null,
        product.origin_story
          ? el('section', {}, [
              el('h2', { className: 'font-semibold text-stone-900', text: 'Câu chuyện nguồn gốc' }),
              el('p', { className: 'mt-1 whitespace-pre-line text-stone-700', text: product.origin_story }),
            ])
          : null,
      ]),
    ]));
  },
});
