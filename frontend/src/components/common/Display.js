// Thành phần hiển thị nhỏ: giá, nhãn trạng thái, phân trang.
import { el } from '../../lib/dom.js';
import { formatPrice } from '../../lib/format.js';

export function PriceDisplay({ amount, className = '' }) {
  return el('span', { className: `font-semibold text-earth-700 ${className}`, text: formatPrice(amount) });
}

const TONE_CLASSES = {
  success: 'bg-brand-100 text-brand-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-sky-100 text-sky-800',
  neutral: 'bg-stone-100 text-stone-700',
};

/** statusMap: ORDER_STATUS hoặc PAYMENT_STATUS trong config/constants.js */
export function StatusBadge({ status, statusMap }) {
  const meta = statusMap[status] ?? { label: status, tone: 'neutral' };
  return el('span', {
    className: `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[meta.tone]}`,
    text: meta.label,
  });
}

/** Phân trang đơn giản: Trước / Trang x/y / Sau */
export function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const button = (label, target, disabled) =>
    el('button', {
      className: 'min-h-11 rounded-lg border border-stone-300 bg-white px-4 text-sm disabled:opacity-50',
      text: label,
      attrs: { type: 'button', disabled },
      on: { click: () => onChange(target) },
    });
  return el('nav', { className: 'flex items-center justify-center gap-3', attrs: { 'aria-label': 'Phân trang' } }, [
    button('Trước', page - 1, page <= 1),
    el('span', { className: 'text-sm text-stone-600', text: `Trang ${page}/${totalPages}` }),
    button('Sau', page + 1, page >= totalPages),
  ]);
}
