import { el } from '../../lib/dom.js';
import { SITE } from '../../config/site.js';
import { LoginForm } from './LoginForm.js';
import { Icon } from '../ui/Icon.js';
import logoUrl from '../../assets/logo.png';

let openDialog = null;

/**
 * Mở form đăng nhập dạng hộp thoại. Đóng khi bấm ra ngoài, nhấn Esc hoặc bấm nút X.
 * Dùng thẻ <dialog> gốc nên có sẵn bẫy focus và phím Esc. Đăng nhập xong thì tải lại trang để header/giỏ hàng cập nhật.
 */
export function openLoginDialog() {
  if (openDialog) return;

  const closeButton = el('button', {
    className: 'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100',
    attrs: { type: 'button', 'aria-label': 'Đóng' },
  }, [Icon({ name: 'close', className: 'text-lg' })]);

  const dialog = el('dialog', {
    className: 'm-auto w-[calc(100%-2rem)] max-w-sm overflow-visible rounded-3xl bg-white p-0 shadow-xl backdrop:bg-black/40',
    attrs: { 'aria-label': 'Đăng nhập' },
  }, [
    el('div', { className: 'relative max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl p-6 sm:p-8' }, [
      closeButton,
      el('img', { className: 'mx-auto mb-6 h-12 w-auto', attrs: { src: logoUrl, alt: SITE.name, width: 140, height: 48 } }),
      LoginForm({ onSuccess: () => window.location.reload() }),
    ]),
  ]);

  const close = () => dialog.close();
  closeButton.addEventListener('click', close);
  // Bấm vào vùng nền tối bên ngoài (chính phần tử <dialog>) thì đóng
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    dialog.remove();
    openDialog = null;
  });

  document.body.append(dialog);
  openDialog = dialog;
  dialog.showModal();
}
