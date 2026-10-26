import { initPage, PageHeading } from '../app.js';
import { el, render, getQueryParam, safeInternalPath } from '../lib/dom.js';
import { LoginForm } from '../components/auth/LoginForm.js';

initPage({
  title: 'Đăng nhập',
  access: 'guest-only',
  render: (main) => {
    render(main, el('div', { className: 'mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-cream-200' }, [
      PageHeading('Đăng nhập'),
      LoginForm({ onSuccess: () => window.location.assign(safeInternalPath(getQueryParam('next'))) }),
    ]));
  },
});
