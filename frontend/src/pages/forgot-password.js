import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { requestPasswordReset } from '../services/auth.js';
import { FormField, setFieldError, clearFormErrors } from '../components/ui/FormField.js';
import { Button, runWithLoading } from '../components/ui/Button.js';
import { EmptyState } from '../components/common/States.js';

initPage({
  title: 'Quên mật khẩu',
  access: 'guest-only',
  render: (main) => {
    const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
    const submit = Button({ label: 'Gửi liên kết đặt lại', type: 'submit', className: 'w-full' });
    const form = el('form', { className: 'space-y-4', attrs: { novalidate: true } }, [
      el('p', { className: 'text-sm text-stone-600', text: 'Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết để bạn đặt mật khẩu mới.' }),
      FormField({ name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email' }),
      formError,
      submit,
    ]);
    const card = el('div', { className: 'mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-cream-200' }, [
      PageHeading('Quên mật khẩu'),
      form,
      el('p', { className: 'mt-4 text-center text-sm' }, [
        el('a', { className: 'font-medium text-brand-700 hover:underline', text: 'Quay lại đăng nhập', attrs: { href: '/login.html' } }),
      ]),
    ]);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormErrors(form);
      formError.textContent = '';
      const email = form.email.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        setFieldError(form, 'email', 'Email không hợp lệ.');
        return;
      }

      runWithLoading(submit, async () => {
        try {
          await requestPasswordReset(email, `${window.location.origin}/reset-password.html`);
          // Thông báo giống nhau dù email có tồn tại hay không
          render(card, EmptyState({
            title: 'Kiểm tra email của bạn',
            message: `Nếu ${email} đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút. Hãy kiểm tra cả thư mục Spam.`,
          }));
        } catch (error) {
          formError.textContent = toUserMessage(error);
        }
      }, 'Đang gửi...');
    });

    render(main, card);
  },
});
