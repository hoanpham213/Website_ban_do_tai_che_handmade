import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { RegisterForm } from '../components/auth/RegisterForm.js';

initPage({
  title: 'Đăng ký',
  access: 'guest-only',
  render: (main) => {
    render(main, el('div', { className: 'mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-cream-200' }, [
      PageHeading('Tạo tài khoản'),
      RegisterForm({ onSuccess: () => window.location.assign('/') }),
    ]));
  },
});
