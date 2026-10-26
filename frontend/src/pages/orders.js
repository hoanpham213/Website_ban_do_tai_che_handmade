import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { formatDateTime, formatPrice } from '../lib/format.js';
import { listMyOrders } from '../services/orders.js';
import { ORDER_STATUS, PAYMENT_METHOD, PAGE_SIZE } from '../config/constants.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/States.js';
import { StatusBadge, Pagination } from '../components/common/Display.js';
import { ButtonLink } from '../components/ui/Button.js';

function OrderRow(order) {
  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  return el('li', {}, [
    el('a', {
      className: 'flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-cream-200 hover:ring-brand-500 sm:flex-row sm:items-center sm:justify-between',
      attrs: { href: `/order.html?code=${encodeURIComponent(order.order_code)}` },
    }, [
      el('div', { className: 'space-y-1' }, [
        el('p', { className: 'font-semibold text-stone-900', text: order.order_code }),
        el('p', { className: 'text-sm text-stone-500', text: `${formatDateTime(order.created_at)} · ${PAYMENT_METHOD[payment?.method]?.label ?? ''}` }),
      ]),
      el('div', { className: 'flex items-center justify-between gap-3 sm:justify-end' }, [
        StatusBadge({ status: order.status, statusMap: ORDER_STATUS }),
        el('span', { className: 'font-semibold text-earth-700', text: formatPrice(order.total_amount) }),
      ]),
    ]),
  ]);
}

initPage({
  title: 'Đơn hàng của tôi',
  access: 'customer',
  render: async (main) => {
    const content = el('div', { className: 'space-y-6' });
    render(main, PageHeading('Đơn hàng của tôi'), content);
    let page = Math.max(1, Number(new URLSearchParams(location.search).get('page')) || 1);

    async function load() {
      render(content, LoadingSkeleton({ count: 4 }));
      try {
        const { items, total } = await listMyOrders(page);
        if (items.length === 0) {
          render(content, EmptyState({
            title: 'Bạn chưa có đơn hàng nào',
            action: ButtonLink({ label: 'Mua sắm ngay', href: '/products.html' }),
          }));
          return;
        }
        render(content,
          el('ul', { className: 'space-y-3' }, items.map(OrderRow)),
          Pagination({
            page, total, pageSize: PAGE_SIZE,
            onChange: (next) => { page = next; history.pushState(null, '', `?page=${page}`); load(); },
          }));
      } catch (error) {
        render(content, ErrorState({ message: toUserMessage(error), onRetry: load }));
      }
    }
    await load();
  },
});
