import { el } from '../../lib/dom.js';

/**
 * Đường dẫn "Trang chủ › Sản phẩm › ...". Mục cuối không có href (trang hiện tại).
 * @param {{ items: Array<{ label: string, href?: string }> }} props
 */
export function Breadcrumb({ items }) {
  return el('nav', { className: 'mb-4 text-sm text-stone-500', attrs: { 'aria-label': 'Đường dẫn' } }, [
    el('ol', { className: 'flex flex-wrap items-center gap-x-2 gap-y-1' }, items.map((item, index) => {
      const isLast = index === items.length - 1;
      return el('li', { className: 'flex items-center gap-2' }, [
        item.href && !isLast
          ? el('a', { className: 'hover:text-brand-700 hover:underline', text: item.label, attrs: { href: item.href } })
          : el('span', { className: isLast ? 'line-clamp-1 text-stone-700' : '', text: item.label, attrs: { 'aria-current': isLast ? 'page' : null } }),
        isLast ? null : el('span', { text: '›', attrs: { 'aria-hidden': 'true' } }),
      ]);
    })),
  ]);
}
