import { el } from '../../lib/dom.js';
import { getImageUrl } from '../../services/products.js';
import { PriceDisplay } from '../common/Display.js';
import { PRODUCT_LINES } from '../../config/constants.js';

/**
 * Thẻ sản phẩm. product: một dòng từ search_products
 * ({ name, slug, price, sale_type, image_path, available }).
 */
export function ProductCard({ product }) {
  const imageUrl = getImageUrl(product.image_path);
  const soldOut = product.available <= 0;

  return el('a', {
    className: 'group block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-cream-200 transition hover:shadow-md',
    attrs: { href: `/product.html?slug=${encodeURIComponent(product.slug)}` },
  }, [
    el('div', { className: 'relative aspect-square bg-cream-100' }, [
      imageUrl
        ? el('img', {
            className: 'h-full w-full object-cover',
            attrs: { src: imageUrl, alt: product.name, loading: 'lazy', width: 400, height: 400 },
          })
        : null,
      product.sale_type === 'UNIQUE'
        ? el('span', { className: 'absolute left-2 top-2 rounded-full bg-earth-500 px-2 py-0.5 text-xs font-medium text-white', text: 'Độc bản' })
        : null,
      soldOut
        ? el('span', { className: 'absolute right-2 top-2 rounded-full bg-stone-800/80 px-2 py-0.5 text-xs text-white', text: 'Hết hàng' })
        : null,
    ]),
    el('div', { className: 'space-y-1 p-3' }, [
      ProductLineTags({ product }),
      el('h3', { className: 'line-clamp-2 text-sm font-medium text-stone-800 group-hover:text-brand-700', text: product.name }),
      PriceDisplay({ amount: product.price, className: 'text-sm' }),
    ]),
  ]);
}

/** Nhãn "Tái chế" / "Handmade". Sản phẩm có thể có cả hai. */
export function ProductLineTags({ product }) {
  const tags = Object.entries(PRODUCT_LINES)
    .filter(([key]) => (key === 'recycled' ? product.is_recycled : product.is_handmade))
    .map(([, line]) => el('span', {
      className: 'rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800',
      text: line.label,
    }));
  return tags.length > 0 ? el('div', { className: 'flex flex-wrap gap-1' }, tags) : null;
}

export function ProductGrid({ products }) {
  return el('div', { className: 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' },
    products.map((product) => ProductCard({ product })));
}
