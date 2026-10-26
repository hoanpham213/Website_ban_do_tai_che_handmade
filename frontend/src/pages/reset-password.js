import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { hasSession, updatePassword } from '../services/auth.js';
import { FormField, setFieldError, clearFormErrors } from '../components/ui/FormField.js';
import { Button, ButtonLink, runWithLoading } from '../components/ui/Button.js';
import { EmptyState } from '../components/common/States.js';

const MIN_PASSWORD_LENGTH = 8;

// Liên kết trong email đưa người dùng về đây kèm mã tạm; thư viện Supabase tự đọc mã
// trên URL và tạo phiên đăng nhập tạm. Không có phiên = liên kết sai hoặc đã hết hạn.

initPage({
  title: 'Đặt lại mật khẩu',
  render: async (main) => {
    const card = el('div', { className: 'mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-cream-200' });
    render(main, card);

    if (!(await hasSession())) {
      render(card, EmptyState({
        title: 'Liên kết không hợp lệ hoặc đã hết hạn',
        message: 'Vui lòng yêu cầu gửi lại email đặt lại mật khẩu.',
        action: ButtonLink({ label: 'Gửi lại email', href: '/forgot-password.html', variant: 'secondary' }),
      }));
      return;
    }

    const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
    const submit = Button({ label: 'Lưu mật khẩu mới', type: 'submit', className: 'w-full' });
    const form = el('form', { className: 'space-y-4', attrs: { novalidate: true } }, [
      FormField({
        name: 'password', label: 'Mật khẩu mới', type: 'password', required: true,
        autocomplete: 'new-password', hint: `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`,
      }),
      FormField({ name: 'confirm', label: 'Nhập lại mật khẩu mới', type: 'password', required: true, autocomplete: 'new-password' }),
      formError,
      submit,
    ]);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormErrors(form);
      formError.textContent = '';
      const password = form.password.value;
      const confirm = form.confirm.value;

      let valid = true;
      if (password.length < MIN_PASSWORD_LENGTH) {
        setFieldError(form, 'password', `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
        valid = false;
      }
      if (confirm !== password) { setFieldError(form, 'confirm', 'Mật khẩu nhập lại không khớp.'); valid = false; }
      if (!valid) return;

      runWithLoading(submit, async () => {
        try {
          await updatePassword(password);
          render(card, EmptyState({
            title: 'Đã đổi mật khẩu',
            message: 'Bạn đang đăng nhập với mật khẩu mới.',
            action: ButtonLink({ label: 'Về trang chủ', href: '/' }),
          }));
        } catch (error) {
          formError.textContent = toUserMessage(error);
        }
      }, 'Đang lưu...');
    });

    render(card, PageHeading('Đặt mật khẩu mới'), form);
  },
});
