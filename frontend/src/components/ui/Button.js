import { el } from '../../lib/dom.js';

// Class đầy đủ (không ghép chuỗi) để Tailwind nhận diện được.
const VARIANTS = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary: 'bg-white text-brand-700 border border-brand-700 hover:bg-brand-100',
  ghost: 'bg-transparent text-stone-700 hover:bg-cream-100',
  danger: 'bg-red-700 text-white hover:bg-red-800',
};

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-60';

/**
 * @param {{ label: string, variant?: keyof VARIANTS, type?: string, onClick?: Function,
 *           disabled?: boolean, className?: string, ariaLabel?: string }} props
 */
export function Button({ label, variant = 'primary', type = 'button', onClick, disabled = false, className = '', ariaLabel }) {
  return el('button', {
    className: `${BASE} ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`,
    text: label,
    attrs: { type, disabled, 'aria-label': ariaLabel },
    on: onClick ? { click: onClick } : undefined,
  });
}

/** Link trông như nút. */
export function ButtonLink({ label, href, variant = 'primary', className = '' }) {
  return el('a', {
    className: `${BASE} ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`,
    text: label,
    attrs: { href },
  });
}

/**
 * Chạy tác vụ bất đồng bộ, khóa nút trong lúc chờ để tránh gửi trùng request.
 * @param {HTMLButtonElement} button
 * @param {() => Promise<any>} task
 * @param {string} [busyLabel]
 */
export async function runWithLoading(button, task, busyLabel = 'Đang xử lý...') {
  if (button.disabled) return undefined;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.textContent = busyLabel;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.textContent = originalLabel;
  }
}
