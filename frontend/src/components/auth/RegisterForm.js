import { el, render } from '../../lib/dom.js';
import { toUserMessage } from '../../lib/errors.js';
import { signUp } from '../../services/auth.js';
import { FormField, setFieldError, clearFormErrors } from '../ui/FormField.js';
import { Button, runWithLoading } from '../ui/Button.js';
import { EmptyState } from '../common/States.js';

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Form đăng ký (Họ tên, Email, Mật khẩu) dùng chung cho trang /register.html và hộp thoại ở header.
 * @param {{ onSuccess: () => void, onSwitchToLogin?: () => void }} props
 *   onSuccess: gọi khi đăng ký xong và đã có phiên đăng nhập (không cần xác nhận email)
 *   onSwitchToLogin: nếu có (trong hộp thoại) thì "Đăng nhập" / "Quay lại đăng nhập" đổi về form đăng nhập; nếu không thì là link tới /login.html
 */
export function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
  const submit = Button({ label: 'Tạo tài khoản', type: 'submit', className: 'w-full rounded-full' });
  const form = el('form', { className: 'space-y-4', attrs: { novalidate: true } }, [
    FormField({ name: 'fullName', label: 'Họ và tên', required: true, autocomplete: 'name', maxLength: 100 }),
    FormField({ name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email' }),
    FormField({
      name: 'password', label: 'Mật khẩu', type: 'password', required: true, revealable: true,
      autocomplete: 'new-password', hint: `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`,
    }),
    formError,
    submit,
  ]);

  const loginLink = el('a', {
    className: 'font-semibold text-brand-600 underline hover:text-brand-800',
    text: 'Đăng nhập',
    attrs: { href: '/login.html' },
    on: onSwitchToLogin ? { click: (event) => { event.preventDefault(); onSwitchToLogin(); } } : undefined,
  });
  const container = el('div', { className: 'space-y-5' }, [
    form,
    el('p', { className: 'text-sm text-stone-700' }, ['Bạn đã có tài khoản? ', loginLink]),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormErrors(form);
    formError.textContent = '';
    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;

    let valid = true;
    if (!fullName) { setFieldError(form, 'fullName', 'Vui lòng nhập họ tên.'); valid = false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setFieldError(form, 'email', 'Email không hợp lệ.'); valid = false; }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(form, 'password', `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      valid = false;
    }
    if (!valid) return;

    runWithLoading(submit, async () => {
      try {
        const { needsEmailConfirmation } = await signUp({ email, password, fullName });
        if (!needsEmailConfirmation) {
          onSuccess();
          return;
        }
        render(container, EmptyState({
          title: 'Kiểm tra email của bạn',
          message: `Chúng tôi đã gửi liên kết xác nhận tới ${email}. Xác nhận xong bạn có thể đăng nhập.`,
          action: onSwitchToLogin ? Button({ label: 'Quay lại đăng nhập', variant: 'secondary', onClick: onSwitchToLogin }) : null,
        }));
      } catch (error) {
        formError.textContent = toUserMessage(error);
      }
    }, 'Đang tạo tài khoản...');
  });

  return container;
}
