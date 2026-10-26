import { el } from '../../lib/dom.js';

const INPUT_CLASS =
  'block w-full min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-base ' +
  'placeholder:text-stone-400 focus:border-brand-600 aria-[invalid=true]:border-red-600';

/**
 * Ô nhập có nhãn và chỗ hiện lỗi. Dùng cho input, textarea.
 * @param {{ name: string, label: string, type?: string, required?: boolean, value?: string,
 *           placeholder?: string, autocomplete?: string, multiline?: boolean, maxLength?: number, hint?: string }} props
 */
export function FormField({
  name, label, type = 'text', required = false, value = '', placeholder,
  autocomplete, multiline = false, maxLength, hint,
}) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const attrs = {
    id, name, required, placeholder, autocomplete,
    maxlength: maxLength, 'aria-describedby': errorId,
  };

  const control = multiline
    ? el('textarea', { className: `${INPUT_CLASS} min-h-24`, text: value, attrs: { ...attrs, rows: 4 } })
    : el('input', { className: INPUT_CLASS, attrs: { ...attrs, type, value } });

  return el('div', { className: 'space-y-1', attrs: { 'data-field': name } }, [
    el('label', { className: 'block text-sm font-medium text-stone-700', text: label, attrs: { for: id } }, [
      required ? el('span', { className: 'text-red-700', text: ' *', attrs: { 'aria-hidden': 'true' } }) : null,
    ]),
    control,
    hint ? el('p', { className: 'text-xs text-stone-500', text: hint }) : null,
    el('p', { className: 'text-sm text-red-700', attrs: { id: errorId, 'aria-live': 'polite' } }),
  ]);
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
