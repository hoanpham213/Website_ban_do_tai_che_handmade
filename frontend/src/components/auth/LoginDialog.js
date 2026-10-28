import { el, render } from '../../lib/dom.js';
import { SITE } from '../../config/site.js';
import { LoginForm } from './LoginForm.js';
import { RegisterForm } from './RegisterForm.js';
import { Icon } from '../ui/Icon.js';
import logoUrl from '../../assets/logo.png';

let openDialog = null;

/**
 * Mở hộp thoại đăng nhập / đăng ký. Đóng khi bấm ra ngoài, nhấn Esc hoặc bấm nút X.
 * Bấm "Đăng ký" đổi sang form đăng ký; nút mũi tên quay lại (góc trái) đưa về form đăng nhập.
 * Dùng thẻ <dialog> gốc nên có sẵn bẫy focus và phím Esc. Đăng nhập / đăng ký xong thì tải lại trang để header, giỏ hàng cập nhật.
 */
export function openLoginDialog() {
  if (openDialog) return;

  const ICON_BUTTON = 'absolute top-3 flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100';
  const closeButton = el('button', {
    className: `${ICON_BUTTON} right-3`,
    attrs: { type: 'button', 'aria-label': 'Đóng' },
  }, [Icon({ name: 'close', className: 'text-lg' })]);
  const backButton = el('button', {
    className: `${ICON_BUTTON} left-3 hidden`,
    attrs: { type: 'button', 'aria-label': 'Quay lại đăng nhập' },
  }, [Icon({ name: 'back', className: 'text-lg' })]);
  const body = el('div');

  const dialog = el('dialog', {
    className: 'm-auto w-[calc(100%-2rem)] max-w-sm overflow-visible rounded-3xl bg-white p-0 shadow-xl backdrop:bg-black/40',
    attrs: { 'aria-label': 'Đăng nhập' },
  }, [
    el('div', { className: 'relative max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl p-6 sm:p-8' }, [
      backButton,
      closeButton,
      el('img', { className: 'mx-auto mb-6 h-12 w-auto', attrs: { src: logoUrl, alt: SITE.name, width: 140, height: 48 } }),
      body,
    ]),
  ]);

  const reload = () => window.location.reload();
  const show = (view) => {
    const isRegister = view === 'register';
    dialog.setAttribute('aria-label', isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập');
    backButton.classList.toggle('hidden', !isRegister);
    render(body, isRegister
      ? RegisterForm({ onSuccess: reload, onSwitchToLogin: () => show('login') })
      : LoginForm({ onSuccess: reload, onSwitchToRegister: () => show('register') }));
    body.querySelector('input')?.focus();
  };
  backButton.addEventListener('click', () => show('login'));

  const close = () => dialog.close();
  closeButton.addEventListener('click', close);
  // Bấm vào vùng nền tối bên ngoài (chính phần tử <dialog>) thì đóng
  dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    dialog.remove();
    openDialog = null;
  });

  show('login');
  document.body.append(dialog);
  openDialog = dialog;
  dialog.showModal();
}
