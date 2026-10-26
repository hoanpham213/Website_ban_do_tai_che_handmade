import { el } from '../../lib/dom.js';
import { getImageUrl, getAvailable, getPrimaryImagePath } from '../../services/products.js';
import { PriceDisplay } from '../common/Display.js';
import { Button } from '../ui/Button.js';

const MAX_QUANTITY = 99; // khớp CHECK của cart_items

/** Số lượng tối đa được chọn cho một dòng giỏ hàng. */
export function maxQuantityOf(product) {
  if (!product) return 0;
  return product.sale_type === 'UNIQUE' ? 1 : Math.min(MAX_QUANTITY, getAvailable(product));
}

/** Dòng giỏ hàng có vấn đề (ngừng bán / không đủ hàng) thì không cho thanh toán. */
export function cartItemProblem(item) {
  const product = item.products;
  if (!product) return 'Sản phẩm không còn được bán. Vui lòng xóa khỏi giỏ.';
  const available = getAvailable(product);
  if (available <= 0) return 'Sản phẩm đã hết hàng.';
  if (item.quantity > available) return `Chỉ còn ${available} sản phẩm. Vui lòng giảm số lượng.`;
  return null;
}

/**
 * Một dòng trong giỏ hàng.
 * item: dòng từ cart.getCartItems(); item.products = null khi sản phẩm đã ngừng bán (RLS ẩn).
 * @param {{ item: object, onQuantityChange: (item, qty: number) => Promise<void>, onRemove: (item) => Promise<void>, readOnly?: boolean }} props
 */
export function CartItem({ item, onQuantityChange, onRemove, readOnly = false }) {
  const product = item.products;
  const problem = cartItemProblem(item);
  const max = maxQuantityOf(product);
  let busy = false;

  // Khóa cả dòng trong lúc gửi request để tránh bấm liên tục
  const guard = async (task) => {
    if (busy) return;
    busy = true;
    row.setAttribute('aria-busy', 'true');
    row.classList.add('opacity-60');
    try { await task(); } finally {
      busy = false;
      row.removeAttribute('aria-busy');
      row.classList.remove('opacity-60');
    }
  };

  const stepButton = (label, ariaLabel, nextQty, disabled) => el('button', {
    className: 'inline-flex h-11 w-11 items-center justify-center text-lg text-stone-700 hover:bg-cream-100 disabled:opacity-40',
    text: label,
    attrs: { type: 'button', 'aria-label': ariaLabel, disabled },
    on: { click: () => guard(() => onQuantityChange(item, nextQty)) },
  });

  const quantityControl = readOnly || !product
    ? el('span', { className: 'text-sm text-stone-600', text: `Số lượng: ${item.quantity}` })
    : el('div', { className: 'inline-flex items-center rounded-lg border border-stone-300 bg-white' }, [
        stepButton('−', 'Giảm số lượng', item.quantity - 1, item.quantity <= 1),
        el('span', { className: 'min-w-8 text-center text-sm font-medium', text: item.quantity, attrs: { 'aria-live': 'polite' } }),
        stepButton('+', 'Tăng số lượng', item.quantity + 1, item.quantity >= max),
      ]);

  const imageUrl = product ? getImageUrl(getPrimaryImagePath(product)) : null;
  const row = el('li', { className: 'flex gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-cream-200 sm:gap-4' }, [
    el('div', { className: 'h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-cream-100 sm:h-24 sm:w-24' }, [
      imageUrl ? el('img', { className: 'h-full w-full object-cover', attrs: { src: imageUrl, alt: product.name, loading: 'lazy' } }) : null,
    ]),
    el('div', { className: 'flex min-w-0 flex-1 flex-col gap-1' }, [
      product
        ? el('a', { className: 'line-clamp-2 font-medium text-stone-800 hover:text-brand-700', text: product.name, attrs: { href: `/product.html?slug=${encodeURIComponent(product.slug)}` } })
        : el('p', { className: 'font-medium text-stone-500', text: 'Sản phẩm không còn được bán' }),
      product ? PriceDisplay({ amount: product.price, className: 'text-sm' }) : null,
      product?.sale_type === 'UNIQUE' ? el('p', { className: 'text-xs text-earth-700', text: 'Độc bản – chỉ mua được 1 chiếc' }) : null,
      problem ? el('p', { className: 'text-sm text-red-700', text: problem, attrs: { role: 'alert' } }) : null,
      el('div', { className: 'mt-auto flex flex-wrap items-center justify-between gap-2 pt-1' }, [
        quantityControl,
        readOnly ? null : Button({ label: 'Xóa', variant: 'ghost', className: 'text-sm', onClick: () => guard(() => onRemove(item)) }),
      ]),
    ]),
  ]);
  return row;
}
