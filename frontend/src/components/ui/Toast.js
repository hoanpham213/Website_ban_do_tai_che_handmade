import { el } from '../../lib/dom.js';

const TONES = {
  success: 'bg-brand-700 text-white',
  error: 'bg-red-700 text-white',
  info: 'bg-stone-800 text-white',
};

function getContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = el('div', {
      className: 'fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end',
      attrs: { id: 'toast-container', role: 'status', 'aria-live': 'polite' },
    });
    document.body.append(container);
  }
  return container;
}

/** Thông báo ngắn tự ẩn sau vài giây. */
export function showToast(message, tone = 'info', durationMs = 4000) {
  const toast = el('div', {
    className: `w-full max-w-sm rounded-lg px-4 py-3 text-sm shadow-lg ${TONES[tone] ?? TONES.info}`,
    text: message,
  });
  getContainer().append(toast);
  setTimeout(() => toast.remove(), durationMs);
}
