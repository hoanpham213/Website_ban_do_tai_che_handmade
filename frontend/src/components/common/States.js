// Các trạng thái hiển thị dùng chung: đang tải, rỗng, lỗi.
import { el } from '../../lib/dom.js';
import { Button } from '../ui/Button.js';

/** Khung xương khi đang tải. variant: 'cards' | 'lines' */
export function LoadingSkeleton({ variant = 'lines', count = 3 } = {}) {
  const items = Array.from({ length: count }, () =>
    variant === 'cards'
      ? el('div', { className: 'space-y-3' }, [
          el('div', { className: 'aspect-square animate-pulse rounded-lg bg-cream-200' }),
          el('div', { className: 'h-4 w-3/4 animate-pulse rounded bg-cream-200' }),
          el('div', { className: 'h-4 w-1/3 animate-pulse rounded bg-cream-200' }),
        ])
      : el('div', { className: 'h-4 w-full animate-pulse rounded bg-cream-200' }),
  );
  return el('div', {
    className: variant === 'cards' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' : 'space-y-3',
    attrs: { 'aria-busy': 'true', 'aria-label': 'Đang tải' },
  }, items);
}

export function EmptyState({ title, message, action } = {}) {
  return el('div', { className: 'rounded-xl border border-dashed border-earth-300 bg-white px-6 py-10 text-center' }, [
    el('p', { className: 'font-medium text-stone-800', text: title ?? 'Chưa có dữ liệu' }),
    message ? el('p', { className: 'mt-1 text-sm text-stone-500', text: message }) : null,
    action ? el('div', { className: 'mt-4' }, [action]) : null,
  ]);
}

export function ErrorState({ message, onRetry } = {}) {
  return el('div', { className: 'rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center', attrs: { role: 'alert' } }, [
    el('p', { className: 'font-medium text-red-800', text: message ?? 'Không tải được dữ liệu.' }),
    onRetry ? el('div', { className: 'mt-4' }, [Button({ label: 'Thử lại', variant: 'secondary', onClick: onRetry })]) : null,
  ]);
}
