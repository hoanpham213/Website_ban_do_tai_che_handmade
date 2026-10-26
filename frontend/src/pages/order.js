import { initPage, PageHeading } from '../app.js';
import { el, render, getQueryParam } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { formatDateTime, formatPrice } from '../lib/format.js';
import { getMyOrder, cancelMyOrder, confirmOrderReceived } from '../services/orders.js';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from '../config/constants.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/States.js';
import { StatusBadge } from '../components/common/Display.js';
import { Button, ButtonLink, runWithLoading } from '../components/ui/Button.js';
import { showToast } from '../components/ui/Toast.js';
import { confirmDialog } from '../components/common/ConfirmDialog.js';
import { CartSummary } from '../components/cart/CartSummary.js';

// Chỉ để quyết định có hiện nút hay không. Database (store_settings) mới là nơi quyết định thật.
const CANCELLABLE = ['PENDING', 'CONFIRMED'];
const cardClass = 'space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-cream-200';
const cardTitle = (text) => el('h2', { className: 'font-semibold text-stone-900', text });

function OrderActions(order, reload) {
  const actions = [];
  if (CANCELLABLE.includes(order.status)) {
    const cancel = Button({ label: 'Hủy đơn', variant: 'secondary' });
    cancel.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: 'Hủy đơn hàng?', message: `Đơn ${order.order_code} sẽ bị hủy và không thể khôi phục.`, confirmLabel: 'Hủy đơn', danger: true });
      if (!ok) return;
      runWithLoading(cancel, async () => {
        try {
          await cancelMyOrder(order.order_code, 'Khách hủy');
          showToast('Đã hủy đơn hàng', 'success');
          await reload();
        } catch (error) {
          showToast(toUserMessage(error), 'error');
        }
      }, 'Đang hủy...');
    });
    actions.push(cancel);
  }
  if (order.status === 'DELIVERED') {
    const confirm = Button({ label: 'Đã nhận được hàng' });
    confirm.addEventListener('click', () => runWithLoading(confirm, async () => {
      try {
        await confirmOrderReceived(order.order_code);
        showToast('Cảm ơn bạn đã xác nhận!', 'success');
        await reload();
      } catch (error) {
        showToast(toUserMessage(error), 'error');
      }
    }, 'Đang xác nhận...'));
    actions.push(confirm);
  }
  return actions.length > 0 ? el('div', { className: 'flex flex-col gap-2 sm:flex-row' }, actions) : null;
}

function OrderView(order, { isNew, reload }) {
  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  const history = [...(order.order_status_histories ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return el('div', { className: 'space-y-4' }, [
    isNew
      ? el('div', { className: 'rounded-xl bg-brand-100 p-4 text-brand-800', attrs: { role: 'status' } }, [
          el('p', { className: 'font-semibold', text: 'Đặt hàng thành công!' }),
          el('p', { className: 'text-sm', text: `Mã đơn của bạn là ${order.order_code}. Cửa hàng sẽ xác nhận đơn sớm.` }),
        ])
      : null,
    el('div', { className: 'flex flex-wrap items-center gap-3' }, [
      StatusBadge({ status: order.status, statusMap: ORDER_STATUS }),
      el('span', { className: 'text-sm text-stone-500', text: `Đặt lúc ${formatDateTime(order.created_at)}` }),
    ]),
    order.cancel_reason ? el('p', { className: 'text-sm text-red-700', text: `Lý do hủy: ${order.cancel_reason}` }) : null,
    OrderActions(order, reload),

    el('div', { className: 'grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start' }, [
      el('div', { className: 'space-y-4' }, [
        el('section', { className: cardClass }, [
          cardTitle('Sản phẩm'),
          el('ul', { className: 'divide-y divide-cream-200' }, order.order_items.map((item) => el('li', { className: 'flex justify-between gap-3 py-2 text-sm' }, [
            el('span', { className: 'text-stone-800', text: `${item.product_name} × ${item.quantity}` }),
            el('span', { className: 'shrink-0 font-medium', text: formatPrice(item.unit_price * item.quantity) }),
          ]))),
        ]),
        el('section', { className: cardClass }, [
          cardTitle('Giao tới'),
          el('p', { className: 'text-sm font-medium text-stone-900', text: `${order.recipient_name} · ${order.recipient_phone}` }),
          el('p', { className: 'text-sm text-stone-700', text: `${order.ship_street_address}, ${order.ship_ward}, ${order.ship_province}` }),
          order.customer_note ? el('p', { className: 'text-sm text-stone-500', text: `Ghi chú: ${order.customer_note}` }) : null,
        ]),
        history.length > 0
          ? el('section', { className: cardClass }, [
              cardTitle('Lịch sử đơn hàng'),
              el('ol', { className: 'space-y-2 border-l-2 border-brand-100 pl-4' }, history.map((h) => el('li', { className: 'text-sm' }, [
                el('p', { className: 'font-medium text-stone-800', text: ORDER_STATUS[h.to_status]?.label ?? h.to_status }),
                el('p', { className: 'text-xs text-stone-500', text: formatDateTime(h.created_at) }),
                h.note ? el('p', { className: 'text-stone-600', text: h.note }) : null,
              ]))),
            ])
          : null,
      ]),
      el('div', { className: 'space-y-4 lg:sticky lg:top-20' }, [
        CartSummary({ subtotal: Number(order.subtotal), shippingFee: Number(order.shipping_fee) }),
        payment
          ? el('section', { className: cardClass }, [
              cardTitle('Thanh toán'),
              el('p', { className: 'text-sm text-stone-700', text: PAYMENT_METHOD[payment.method]?.label ?? payment.method }),
              StatusBadge({ status: payment.status, statusMap: PAYMENT_STATUS }),
            ])
          : null,
      ]),
    ]),
  ]);
}

initPage({
  title: 'Chi tiết đơn hàng',
  access: 'customer',
  render: async (main) => {
    const code = getQueryParam('code');
    const isNew = getQueryParam('new') === '1';
    const content = el('div');
    render(main, PageHeading(code ? `Đơn hàng ${code}` : 'Chi tiết đơn hàng'), content);

    async function load() {
      if (!content.hasChildNodes()) render(content, LoadingSkeleton({ count: 6 }));
      try {
        const order = code ? await getMyOrder(code) : null;
        if (!order) {
          render(content, EmptyState({
            title: 'Không tìm thấy đơn hàng',
            action: ButtonLink({ label: 'Xem đơn hàng của tôi', href: '/orders.html', variant: 'secondary' }),
          }));
          return;
        }
        render(content, OrderView(order, { isNew, reload: load }));
      } catch (error) {
        render(content, ErrorState({ message: toUserMessage(error), onRetry: load }));
      }
    }
    await load();
  },
});
