import { el } from '../../lib/dom.js';
import { openModal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';

/**
 * Hỏi xác nhận trước thao tác quan trọng. Trả về Promise<boolean>.
 * @param {{ title: string, message: string, confirmLabel?: string, danger?: boolean }} props
 */
export function confirmDialog({ title, message, confirmLabel = 'Xác nhận', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (value) => {
      answered = true;
      resolve(value);
      modal.close();
    };
    const modal = openModal({
      title,
      content: el('p', { className: 'text-sm text-stone-600', text: message }),
      actions: [
        Button({ label: 'Hủy', variant: 'ghost', onClick: () => answer(false) }),
        Button({ label: confirmLabel, variant: danger ? 'danger' : 'primary', onClick: () => answer(true) }),
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}
