import { el } from '../../lib/dom.js';
import { formatPrice } from '../../lib/format.js';

/**
 * Bảng tóm tắt tiền: tạm tính, phí giao hàng, tổng cộng. Dùng ở Giỏ hàng, Thanh toán, Chi tiết đơn.
 * Số tiền ở đây chỉ để hiển thị; database tự tính lại khi đặt hàng.
 * @param {{ subtotal: number, shippingFee?: number|null, action?: Node, note?: string }} props
 * shippingFee = null: chưa tính phí giao hàng (hiện "Tính ở bước thanh toán").
 */
export function CartSummary({ subtotal, shippingFee = null, action, note }) {
  const total = subtotal + (shippingFee ?? 0);
  const row = (label, value, strong = false) => el('div', {
    className: `flex justify-between gap-4 ${strong ? 'border-t border-cream-200 pt-3 text-base font-semibold text-stone-900' : 'text-sm text-stone-600'}`,
  }, [el('dt', { text: label }), el('dd', { className: strong ? 'text-earth-700' : '', text: value })]);

  return el('section', { className: 'space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-cream-200', attrs: { 'aria-label': 'Tóm tắt đơn hàng' } }, [
    el('dl', { className: 'space-y-2' }, [
      row('Tạm tính', formatPrice(subtotal)),
      row('Phí giao hàng', shippingFee === null ? 'Tính ở bước thanh toán' : formatPrice(shippingFee)),
      row(shippingFee === null ? 'Tạm tính' : 'Tổng cộng', formatPrice(total), true),
    ]),
    note ? el('p', { className: 'text-xs text-stone-500', text: note }) : null,
    action ?? null,
  ]);
}
