import { el } from '../../lib/dom.js';
import { SITE } from '../../config/site.js';
import { Icon } from '../ui/Icon.js';
import logoUrl from '../../assets/logo.png';

const LINK_CLASS = 'rounded-md px-2.5 py-1.5 text-sm font-medium text-brand-800 hover:bg-cream-100 aria-[current=page]:bg-brand-100 aria-[current=page]:text-brand-700';
const ICON_BUTTON_CLASS = 'relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-brand-700 hover:bg-cream-200/60';

// Đầu trang: nền kem rất nhạt (25%) để icon và logo vẫn nhìn rõ trên ảnh; khi cuộn xuống thì đậm hơn (50%) + làm nhòe nền.
const HEADER_TOP = ['border-transparent', 'bg-cream-50/70', 'backdrop-blur-sm'];
const HEADER_SCROLLED = ['border-cream-200', 'bg-cream-50/85', 'backdrop-blur-md'];

/** Link đang mở: so đường dẫn cùng ?line= và ?material= (để phân biệt các mục con của Sản phẩm). */
function isCurrent(href) {
  const target = new URL(href, window.location.origin);
  const here = window.location;
  const samePath = target.pathname === here.pathname || (target.pathname === '/' && here.pathname === '/index.html');
  const param = (search, name) => new URLSearchParams(search).get(name);
  return samePath
    && param(target.search, 'line') === param(here.search, 'line')
    && param(target.search, 'material') === param(here.search, 'material');
}

const linkAttrs = (href) => ({ href, 'aria-current': isCurrent(href) ? 'page' : null });
const links = (items) => items.map((item) => el('a', { className: LINK_CLASS, text: item.label, attrs: linkAttrs(item.href) }));

/**
 * Popup mở bằng một nút. Đóng khi: bấm lại nút, bấm ra ngoài, nhấn Esc, chọn một link,
 * hoặc bấm phần tử có thuộc tính data-close.
 * Mở popup này sẽ tự đóng popup kia (bấm vào nút của popup kia là "bấm ra ngoài" popup này).
 */
function PopupMenu({ id, label, buttonContent, items, align = 'left', widthClass = 'w-44' }) {
  const panel = el('div', {
    className: `absolute top-full z-50 mt-1 hidden max-w-[calc(100vw-30px)] flex-col rounded-xl bg-cream-50 p-1 shadow-lg ring-1 ring-cream-200 ${widthClass} ${align === 'right' ? 'right-0' : 'left-0'}`,
    attrs: { id },
  }, items);
  const button = el('button', {
    className: ICON_BUTTON_CLASS,
    attrs: { type: 'button', 'aria-controls': id, 'aria-expanded': 'false', 'aria-label': label },
  }, buttonContent);
  const element = el('div', { className: 'relative' }, [button, panel]);

  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  const setOpen = (open) => {
    panel.classList.toggle('hidden', !open);
    panel.classList.toggle('flex', open);
    button.setAttribute('aria-expanded', String(open));
  };

  button.addEventListener('click', () => setOpen(!isOpen()));
  panel.addEventListener('click', (event) => { if (event.target.closest('a, [data-close]')) setOpen(false); });
  document.addEventListener('click', (event) => { if (isOpen() && !element.contains(event.target)) setOpen(false); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });
  return { element, button };
}

/** Mục có mục con (Sản phẩm → Giấy, Thủy tinh, Gỗ, Nhựa): xổ xuống ngay bên dưới, mũi tên bên phải để thu/mở. */
function MenuGroup(item, groupId) {
  const list = el('div', { className: 'ml-2 flex flex-col border-l border-cream-200 pl-1', attrs: { id: groupId } }, links(item.children));
  const toggle = el('button', {
    className: `${ICON_BUTTON_CLASS} min-h-8 min-w-8 text-sm aria-expanded:[&>i]:rotate-180`,
    attrs: { type: 'button', 'aria-expanded': 'true', 'aria-controls': groupId, 'aria-label': `Thu gọn hoặc mở ${item.label}` },
    on: {
      click: () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        list.classList.toggle('hidden', !open);
        list.classList.toggle('flex', open);
      },
    },
  }, [Icon({ name: 'chevron', className: 'text-xs transition-transform' })]);
  return el('div', {}, [
    el('div', { className: 'flex items-center' }, [
      el('a', { className: `${LINK_CLASS} flex-1`, text: item.label, attrs: linkAttrs(item.href) }),
      toggle,
    ]),
    list,
  ]);
}

/**
 * Nút kính lúp: bấm vào mới hiện ô nhập, mở rộng ngay cạnh icon (từ màn hình sm trở lên).
 * Đóng khi nhấn Esc hoặc bấm ra ngoài lúc ô còn trống. Có từ khóa + Enter (hoặc bấm lại kính lúp) → sang trang Sản phẩm.
 */
function ExpandingSearch() {
  const current = new URLSearchParams(window.location.search).get('q') ?? '';
  const input = el('input', {
    className: 'w-0 min-w-0 bg-transparent text-sm text-brand-800 opacity-0 outline-none transition-all duration-200 placeholder:text-brand-500',
    attrs: { id: 'site-search', type: 'search', name: 'q', value: current, placeholder: 'Tìm sản phẩm...', 'aria-label': 'Tìm sản phẩm', maxlength: 100, autocomplete: 'off', tabindex: '-1' },
  });
  const button = el('button', {
    className: ICON_BUTTON_CLASS,
    attrs: { type: 'button', 'aria-label': 'Tìm kiếm', 'aria-expanded': 'false', 'aria-controls': 'site-search' },
  }, [Icon({ name: 'search', className: 'text-lg' })]);
  const form = el('form', {
    className: 'hidden items-center rounded-full border border-transparent transition-colors sm:flex',
    attrs: { role: 'search' },
  }, [button, input]);

  const OPEN_INPUT = ['sm:w-36', 'md:w-48', 'lg:w-72', 'opacity-100', 'pr-3'];
  const OPEN_FORM = ['border-cream-200', 'bg-cream-50/70'];
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  const setOpen = (open) => {
    input.classList.toggle('w-0', !open);
    input.classList.toggle('opacity-0', !open);
    OPEN_INPUT.forEach((c) => input.classList.toggle(c, open));
    OPEN_FORM.forEach((c) => form.classList.toggle(c, open));
    input.tabIndex = open ? 0 : -1;
    button.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  };

  button.addEventListener('click', () => {
    if (!isOpen()) setOpen(true);
    else if (input.value.trim()) form.requestSubmit();
    else setOpen(false);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const keyword = input.value.trim();
    window.location.assign(keyword ? `/products.html?q=${encodeURIComponent(keyword)}` : '/products.html');
  });
  document.addEventListener('click', (event) => { if (isOpen() && !input.value.trim() && !form.contains(event.target)) setOpen(false); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });
  return form;
}

/** Hàng tìm kiếm cho màn hình nhỏ (< sm): kính lúp bấm vào thì hiện hàng này ngay dưới header. */
function MobileSearch() {
  const input = el('input', {
    className: 'min-h-11 w-full min-w-0 bg-transparent px-4 text-sm text-brand-800 outline-none placeholder:text-brand-500',
    attrs: { type: 'search', name: 'q', value: new URLSearchParams(window.location.search).get('q') ?? '', placeholder: 'Tìm sản phẩm...', 'aria-label': 'Tìm sản phẩm', maxlength: 100, autocomplete: 'off' },
  });
  const row = el('form', {
    className: 'page-container hidden pb-2 sm:hidden',
    attrs: { id: 'mobile-search', role: 'search' },
    on: {
      submit: (event) => {
        event.preventDefault();
        const keyword = input.value.trim();
        window.location.assign(keyword ? `/products.html?q=${encodeURIComponent(keyword)}` : '/products.html');
      },
    },
  }, [
    el('div', { className: 'flex items-center rounded-full border border-cream-200 bg-cream-50/80 pr-1' }, [
      input,
      el('button', { className: `${ICON_BUTTON_CLASS} min-h-9 min-w-9`, attrs: { type: 'submit', 'aria-label': 'Tìm kiếm' } }, [Icon({ name: 'search' })]),
    ]),
  ]);
  const button = el('button', {
    className: `${ICON_BUTTON_CLASS} sm:hidden`,
    attrs: { type: 'button', 'aria-controls': 'mobile-search', 'aria-expanded': 'false', 'aria-label': 'Tìm kiếm' },
    on: {
      click: () => {
        const open = row.classList.toggle('hidden') === false;
        button.setAttribute('aria-expanded', String(open));
        if (open) input.focus();
      },
    },
  }, [Icon({ name: 'search', className: 'text-lg' })]);
  return { button, row };
}

/**
 * Thanh điều hướng 3 cột, nền trong suốt:
 *   Trái:  nút menu (popup) + kính lúp tìm kiếm
 *   Giữa:  logo
 *   Phải:  nút người dùng (popup: Tài khoản, Đăng xuất; khách: Đăng nhập, Đăng ký)
 * @param {{ profile: object|null, cartCount: number, onSignOut: Function, area?: 'shop'|'admin', overlay?: boolean }} props
 *   overlay: true → header đè lên phần đầu nội dung bên dưới (banner tràn màn hình)
 * @returns {{ element: HTMLElement, setCartCount: (n: number) => void }}
 */
export function Header({ profile, cartCount = 0, onSignOut, area = 'shop', overlay = false }) {
  const isShop = area === 'shop';
  const cartText = (count) => (count > 0 ? ` (${count})` : '');

  // --- Menu (trái)
  const cartLabel = el('span', { text: `Giỏ hàng${cartText(cartCount)}` });
  const menuItems = isShop
    ? SITE.menu.map((item, index) => {
        if (item.children) return MenuGroup(item, `menu-group-${index}`);
        if (item.key === 'cart') return el('a', { className: LINK_CLASS, attrs: linkAttrs(item.href) }, [cartLabel]);
        return links([item])[0];
      })
    : links(SITE.adminNav);

  const cartBadge = el('span', {
    className: 'absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-earth-500 px-1 text-center text-xs font-semibold leading-5 text-white',
    text: cartCount,
    attrs: { 'aria-hidden': 'true' },
  });
  cartBadge.hidden = !isShop || cartCount <= 0;

  const navMenu = PopupMenu({
    id: 'site-menu',
    label: 'Menu',
    buttonContent: [Icon({ name: 'menu', className: 'text-xl' }), cartBadge],
    items: menuItems,
    widthClass: 'w-44',
  });

  // --- Tìm kiếm (chỉ ở khu vực mua sắm)
  const desktopSearch = isShop ? ExpandingSearch() : null;
  const mobileSearch = isShop ? MobileSearch() : null;

  // --- Người dùng (phải)
  const signOutItem = el('button', {
    className: `${LINK_CLASS} text-left`, text: 'Đăng xuất',
    attrs: { type: 'button', 'data-close': true }, on: { click: onSignOut },
  });
  let userItems;
  if (!profile) {
    userItems = links([{ label: 'Đăng nhập', href: '/login.html' }, { label: 'Đăng ký', href: '/register.html' }]);
  } else if (isShop) {
    userItems = [
      ...links(SITE.accountNav),
      ...(profile.role === 'ADMIN' ? links([{ label: 'Quản trị', href: '/admin/' }]) : []),
      signOutItem,
    ];
  } else {
    userItems = [...links([{ label: 'Về cửa hàng', href: '/' }]), signOutItem];
  }
  const userMenu = PopupMenu({
    id: 'user-menu',
    label: profile ? 'Tài khoản' : 'Đăng nhập hoặc đăng ký',
    buttonContent: [Icon({ name: 'user', className: 'text-xl' })],
    items: userItems,
    align: 'right',
    widthClass: 'w-36',
  });

  // --- Logo (giữa)
  const logo = el('a', {
    className: 'justify-self-center',
    attrs: { href: isShop ? '/' : '/admin/', 'aria-label': `${SITE.name} – ${isShop ? 'Trang chủ' : 'Trang quản trị'}` },
  }, [el('img', { className: 'h-9 w-auto sm:h-10', attrs: { src: logoUrl, alt: SITE.name, width: 104, height: 36 } })]);

  const element = el('header', { className: `sticky top-0 z-40 border-b transition-colors duration-200 ${overlay ? '-mb-[61px] ' : ''}${HEADER_TOP.join(' ')}` }, [
    el('div', { className: 'page-container grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2' }, [
      el('div', { className: 'flex min-w-0 items-center gap-1' }, [navMenu.element, mobileSearch?.button, desktopSearch]),
      logo,
      el('div', { className: 'flex justify-end' }, [userMenu.element]),
    ]),
    mobileSearch?.row,
  ]);

  const updateBackground = () => {
    const scrolled = window.scrollY > 8;
    HEADER_TOP.forEach((c) => element.classList.toggle(c, !scrolled));
    HEADER_SCROLLED.forEach((c) => element.classList.toggle(c, scrolled));
  };
  window.addEventListener('scroll', updateBackground, { passive: true });
  updateBackground();

  return {
    element,
    setCartCount(count) {
      cartBadge.textContent = String(count);
      cartBadge.hidden = count <= 0;
      cartLabel.textContent = `Giỏ hàng${cartText(count)}`;
    },
  };
}
