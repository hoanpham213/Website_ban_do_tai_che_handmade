import { el } from '../../lib/dom.js';

/**
 * Hộp thoại dùng thẻ <dialog> gốc của trình duyệt (có sẵn bẫy focus, phím Esc).
 * @param {{ title: string, content: Node, actions?: Node[], onClose?: Function }} props
 * @returns {{ dialog: HTMLDialogElement, close: Function }}
 */
export function openModal({ title, content, actions = [], onClose }) {
  const dialog = el('dialog', {
    className:
      'w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-0 shadow-xl backdrop:bg-black/40',
    attrs: { 'aria-labelledby': 'modal-title' },
  }, [
    el('div', { className: 'space-y-4 p-5' }, [
      el('h2', { className: 'text-lg font-semibold text-stone-900', text: title, attrs: { id: 'modal-title' } }),
      content,
      actions.length > 0
        ? el('div', { className: 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end' }, actions)
        : null,
    ]),
  ]);

  const close = () => dialog.close();
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose?.();
  });
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, close };
}
