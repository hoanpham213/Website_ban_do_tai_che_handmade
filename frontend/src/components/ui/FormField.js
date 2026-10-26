import { el } from '../../lib/dom.js';
import { Icon } from './Icon.js';

const INPUT_CLASS =
  'block w-full min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base ' +
  'placeholder:text-stone-400 focus:border-brand-600 aria-[invalid=true]:border-red-600';

/**
 * Ô nhập có nhãn và chỗ hiện lỗi. Dùng cho input, textarea.
 * @param {{ name: string, label: string, type?: string, required?: boolean, value?: string,
 *           placeholder?: string, autocomplete?: string, multiline?: boolean, maxLength?: number, hint?: string,
 *           revealable?: boolean }} props   revealable: ô mật khẩu có nút con mắt hiện/ẩn
 */
export function FormField({
  name, label, type = 'text', required = false, value = '', placeholder,
  autocomplete, multiline = false, maxLength, hint, revealable = false,
}) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const attrs = {
    id, name, required, placeholder, autocomplete,
    maxlength: maxLength, 'aria-describedby': errorId,
  };

  const control = multiline
    ? el('textarea', { className: `${INPUT_CLASS} min-h-24`, text: value, attrs: { ...attrs, rows: 4 } })
    : el('input', { className: `${INPUT_CLASS}${revealable ? ' pr-12' : ''}`, attrs: { ...attrs, type, value } });
  const field = revealable && type === 'password' ? withRevealButton(control) : control;

  return el('div', { className: 'space-y-1', attrs: { 'data-field': name } }, [
    el('label', { className: 'block text-sm font-medium text-stone-700', text: label, attrs: { for: id } }, [
      required ? el('span', { className: 'text-red-700', text: ' *', attrs: { 'aria-hidden': 'true' } }) : null,
    ]),
    field,
    hint ? el('p', { className: 'text-xs text-stone-500', text: hint }) : null,
    el('p', { className: 'text-sm text-red-700', attrs: { id: errorId, 'aria-live': 'polite' } }),
  ]);
}

/** Bọc ô mật khẩu với nút con mắt: mắt = mật khẩu đang hiển thị, mắt gạch chéo = mật khẩu đang bị che. Bấm để đổi. */
function withRevealButton(input) {
  const button = el('button', {
    className: 'absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone-600 hover:text-brand-700',
    attrs: { type: 'button', 'aria-label': 'Hiện mật khẩu', 'aria-pressed': 'false' },
  }, [Icon({ name: 'eyeSlash' })]);   // đang ẩn mật khẩu → hiện mắt gạch chéo
  button.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(show));
    button.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    button.replaceChildren(Icon({ name: show ? 'eye' : 'eyeSlash' }));   // mắt = đang xem được, mắt gạch chéo = đang ẩn
  });
  return el('div', { className: 'relative' }, [input, button]);
}

/** Hiện / xóa lỗi của một ô trong form. */
export function setFieldError(form, name, message = '') {
  const wrapper = form.querySelector(`[data-field="${name}"]`);
  if (!wrapper) return;
  const control = wrapper.querySelector('input, textarea, select');
  const error = wrapper.querySelector(`#field-${name}-error`);
  control?.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (error) error.textContent = message;
}

export function clearFormErrors(form) {
  form.querySelectorAll('[data-field]').forEach((wrapper) => setFieldError(form, wrapper.dataset.field, ''));
}
