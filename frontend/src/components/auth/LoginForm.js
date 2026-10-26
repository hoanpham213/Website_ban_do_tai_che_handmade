import { el } from '../../lib/dom.js';
import { SITE } from '../../config/site.js';
import { toUserMessage } from '../../lib/errors.js';
import { signIn, signInWithProvider } from '../../services/auth.js';
import { FormField, setFieldError, clearFormErrors } from '../ui/FormField.js';
import { Button, runWithLoading } from '../ui/Button.js';
import { Icon } from '../ui/Icon.js';

const SOCIAL_LABELS = { google: 'Tiếp tục với Google', facebook: 'Tiếp tục với Facebook' };

/** Nút đăng nhập mạng xã hội, chỉ hiện các nhà cung cấp được bật trong SITE.socialProviders. */
function SocialButtons(formError) {
  const providers = SITE.socialProviders.filter((provider) => provider in SOCIAL_LABELS);
  if (providers.length === 0) return null;

  const buttons = providers.map((provider) => {
    const button = el('button', {
      className: 'flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-100 px-4 text-sm font-medium text-stone-800 hover:bg-stone-200 disabled:opacity-60',
      attrs: { type: 'button' },
    }, [Icon({ name: provider }), SOCIAL_LABELS[provider]]);
    button.addEventListener('click', () => runWithLoading(button, async () => {
      try {
        await signInWithProvider(provider);
      } catch (error) {
        formError.textContent = toUserMessage(error);
      }
    }, 'Đang chuyển trang...'));
    return button;
  });

  return el('div', { className: 'space-y-3' }, [
    el('div', { className: 'flex items-center gap-3 text-sm text-stone-500' }, [
      el('span', { className: 'h-px flex-1 bg-stone-300' }),
      'hoặc',
      el('span', { className: 'h-px flex-1 bg-stone-300' }),
    ]),
    ...buttons,
  ]);
}

/**
 * Form đăng nhập dùng chung cho trang /login.html và hộp thoại ở header.
 * @param {{ onSuccess: () => void }} props  gọi sau khi đăng nhập thành công (chuyển trang / tải lại trang)
 */
export function LoginForm({ onSuccess }) {
  const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
  const submit = Button({ label: 'Đăng nhập', type: 'submit', className: 'w-full rounded-full' });
  const form = el('form', { className: 'space-y-4', attrs: { novalidate: true } }, [
    FormField({ name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email' }),
    FormField({ name: 'password', label: 'Mật khẩu', type: 'password', required: true, autocomplete: 'current-password', revealable: true }),
    el('p', { className: 'text-sm' }, [
      el('a', { className: 'text-brand-700 hover:underline', text: 'Bạn quên mật khẩu?', attrs: { href: '/forgot-password.html' } }),
    ]),
    formError,
    submit,
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormErrors(form);
    formError.textContent = '';
    const email = form.email.value.trim();
    const password = form.password.value;

    let valid = true;
    if (!/^\S+@\S+\.\S+$/.test(email)) { setFieldError(form, 'email', 'Email không hợp lệ.'); valid = false; }
    if (!password) { setFieldError(form, 'password', 'Vui lòng nhập mật khẩu.'); valid = false; }
    if (!valid) return;

    runWithLoading(submit, async () => {
      try {
        await signIn({ email, password });
        onSuccess();
      } catch (error) {
        formError.textContent = toUserMessage(error);
      }
    }, 'Đang đăng nhập...');
  });

  return el('div', { className: 'space-y-5' }, [
    form,
    SocialButtons(formError),
    el('p', { className: 'text-sm text-stone-700' }, [
      'Bạn chưa có tài khoản? ',
      el('a', { className: 'font-semibold text-brand-600 underline hover:text-brand-800', text: 'Đăng ký', attrs: { href: '/register.html' } }),
    ]),
  ]);
}
