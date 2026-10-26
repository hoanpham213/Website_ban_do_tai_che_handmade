import { initPage, PageHeading } from '../app.js';
import { el, render, getQueryParam, safeInternalPath } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { signIn } from '../services/auth.js';
import { FormField, setFieldError, clearFormErrors } from '../components/ui/FormField.js';
import { Button, runWithLoading } from '../components/ui/Button.js';

initPage({
  title: 'Đăng nhập',
  access: 'guest-only',
  render: (main) => {
    const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
    const submit = Button({ label: 'Đăng nhập', type: 'submit', className: 'w-full' });
    const form = el('form', { className: 'space-y-4', attrs: { novalidate: true } }, [
      FormField({ name: 'email', label: 'Email', type: 'email', required: true, autocomplete: 'email' }),
      FormField({ name: 'password', label: 'Mật khẩu', type: 'password', required: true, autocomplete: 'current-password' }),
      el('p', { className: 'text-right text-sm' }, [
        el('a', { className: 'text-brand-700 hover:underline', text: 'Quên mật khẩu?', attrs: { href: '/forgot-password.html' } }),
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
          window.location.assign(safeInternalPath(getQueryParam('next')));
        } catch (error) {
          formError.textContent = toUserMessage(error);
        }
      }, 'Đang đăng nhập...');
    });

    render(main, el('div', { className: 'mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-cream-200' }, [
      PageHeading('Đăng nhập'),
      form,
      el('p', { className: 'mt-4 text-center text-sm text-stone-600' }, [
        'Chưa có tài khoản? ',
        el('a', { className: 'font-medium text-brand-700 hover:underline', text: 'Đăng ký', attrs: { href: '/register.html' } }),
      ]),
    ]));
  },
});
