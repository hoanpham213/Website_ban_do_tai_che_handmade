// Khởi tạo chung cho MỌI trang: CSS, header/footer, kiểm tra đăng nhập, xử lý lỗi.
// Mỗi trang chỉ cần: initPage({ title, access, render }).
//
// Lưu ý bảo mật: kiểm tra `access` ở đây chỉ để chuyển hướng cho tiện.
// Quyền thật nằm ở RLS và các hàm trong database.

import './styles/main.css';
import { el, render as renderInto, safeInternalPath } from './lib/dom.js';
import { SITE } from './config/site.js';
import { missingEnv } from './config/env.js';
import { toUserMessage } from './lib/errors.js';
import { on, EVENTS } from './lib/events.js';
import { getCurrentProfile, signOut } from './services/auth.js';
import { getCartCount } from './services/cart.js';
import { Header } from './components/layout/Header.js';
import { Footer } from './components/layout/Footer.js';
import { ErrorState, LoadingSkeleton } from './components/common/States.js';
import { ChatWidget } from './components/chat/ChatWidget.js';
import { showToast } from './components/ui/Toast.js';

/**
 * @param {{ title: string,
 *           access?: 'public' | 'guest-only' | 'customer' | 'admin',
 *           fullWidth?: boolean,  // true: nội dung tràn hết màn hình, header đè lên đầu trang (dùng cho banner trang chủ)
 *           render: (main: HTMLElement, ctx: { profile: object|null }) => Promise<void>|void }} options
 */
export async function initPage({ title, access = 'public', fullWidth = false, render }) {
  document.title = `${title} – ${SITE.name}`;
  const root = document.getElementById('app');
  const main = el('main', { className: fullWidth ? 'flex-1' : 'page-container flex-1 py-6', attrs: { id: 'main' } }, [
    LoadingSkeleton(),
  ]);
  root.className = 'flex min-h-screen flex-col';

  if (missingEnv.length > 0) {
    renderInto(root, el('main', { className: 'mx-auto max-w-xl p-6' }, [
      ErrorState({
        message: `Thiếu cấu hình: ${missingEnv.join(', ')}. Sao chép frontend/.env.example thành frontend/.env, điền giá trị rồi chạy lại.`,
      }),
    ]));
    return;
  }

  let profile = null;
  try {
    profile = await getCurrentProfile();
  } catch (error) {
    // Không chặn trang công khai chỉ vì lỗi đọc hồ sơ
    console.error(error);
  }

  // Chuyển hướng theo quyền (chỉ phục vụ trải nghiệm)
  const here = window.location.pathname + window.location.search;
  if ((access === 'customer' || access === 'admin') && !profile) {
    window.location.replace(`/login.html?next=${encodeURIComponent(here)}`);
    return;
  }
  if (access === 'guest-only' && profile) {
    window.location.replace(safeInternalPath(new URLSearchParams(window.location.search).get('next')));
    return;
  }

  const area = access === 'admin' ? 'admin' : 'shop';
  const header = Header({
    profile,
    cartCount: 0,
    area,
    overlay: fullWidth,
    onSignOut: async () => {
      try {
        await signOut();
        window.location.assign('/');
      } catch (error) {
        showToast(toUserMessage(error), 'error');
      }
    },
  });

  renderInto(root, header.element, main, Footer(), area === 'shop' ? ChatWidget() : null);

  if (profile && area === 'shop') {
    const refreshCart = () => getCartCount().then(header.setCartCount).catch(console.error);
    refreshCart();
    on(EVENTS.CART_CHANGED, refreshCart);
  }

  if (access === 'admin' && profile?.role !== 'ADMIN') {
    renderInto(main, ErrorState({ message: 'Bạn không có quyền truy cập trang quản trị.' }));
    return;
  }
  if (profile?.status === 'LOCKED') {
    showToast('Tài khoản đang bị khóa, một số chức năng sẽ không dùng được.', 'error', 8000);
  }

  try {
    await render(main, { profile });
  } catch (error) {
    renderInto(main, ErrorState({ message: toUserMessage(error), onRetry: () => window.location.reload() }));
  }
}

/** Khung tiêu đề trang dùng chung. */
export function PageHeading(title, subtitle) {
  return el('div', { className: 'mb-6' }, [
    el('h1', { className: 'text-2xl font-bold text-stone-900 sm:text-3xl', text: title }),
    subtitle ? el('p', { className: 'mt-1 text-stone-600', text: subtitle }) : null,
  ]);
}
