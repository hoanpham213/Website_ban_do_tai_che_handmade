import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { signUp } from '../services/auth.js';
import { FormField, setFieldError, clearFormErrors } from '../components/ui/FormField.js';
import { Button, runWithLoading } from '../components/ui/Button.js';
import { EmptyState } from '../components/common/States.js';

const MIN_PASSWORD_LENGTH = 8;

initPage({
  title: 'Đăng ký',
  access: 'guest-only',
  render: (main) => {
    const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
    const submit = Button({ label: 'Tạo tài khoản', type: 'submit', className: 'w-full' });
    const form = el('form', { className: 'space-y-4', attrs: { novalidate: true } }, [
      FormField({ name: 'fullName', label: 'Họ và tên', required: true, autocomplete: 'name', maxLength: 100 }),
      FormField({ name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email' }),
      FormField({
        name: 'password', label: 'Mật khẩu', type: 'password', required: true,
        autocomplete: 'new-password', hint: `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`,
      }),
      formError,
      submit,
    ]);
    const card = el('div', { className: 'mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-cream-200' }, [
      PageHeading('Tạo tài khoản'), form,
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
          if (needsEmailConfirmation) {
            render(card, EmptyState({
              title: 'Kiểm tra email của bạn',
              message: `Chúng tôi đã gửi liên kết xác nhận tới ${email}. Xác nhận xong bạn có thể đăng nhập.`,
            }));
          } else {
            window.location.assign('/');
          }
        } catch (error) {
          formError.textContent = toUserMessage(error);
        }
      }, 'Đang tạo tài khoản...');
    });

    render(main, card);
  },
});
