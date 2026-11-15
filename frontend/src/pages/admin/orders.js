import { initPage, PageHeading } from '../../app.js';
import { el, render } from '../../lib/dom.js';
import { toUserMessage } from '../../lib/errors.js';
import { formatDateTime, formatPrice } from '../../lib/format.js';
import { listOrders, getOrderForAdmin, updateOrderStatus, markRefunded } from '../../services/admin.js';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD, PAGE_SIZE } from '../../config/constants.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/common/States.js';
import { StatusBadge, Pagination } from '../../components/common/Display.js';
import { Button, runWithLoading } from '../../components/ui/Button.js';
import { FormField } from '../../components/ui/FormField.js';
import { openModal } from '../../components/ui/Modal.js';
import { showToast } from '../../components/ui/Toast.js';
import { confirmDialog } from '../../components/common/ConfirmDialog.js';

// Chỉ để quyết định hiện nút nào. Database (admin_update_order_status) mới là nơi kiểm tra thật.
const NEXT_STEP = {
  PENDING: { to: 'CONFIRMED', label: 'Xác nhận đơn' },
  CONFIRMED: { to: 'PROCESSING', label: 'Bắt đầu chuẩn bị hàng' },
  PROCESSING: { to: 'SHIPPING', label: 'Giao cho vận chuyển (xuất kho)' },
  SHIPPING: { to: 'DELIVERED', label: 'Đã giao thành công' },
  DELIVERED: { to: 'COMPLETED', label: 'Hoàn thành đơn' },
};
const ADMIN_CANCELLABLE = ['PENDING', 'CONFIRMED', 'PROCESSING'];
const REFUND_FILTER = 'REFUND';
const FILTERS = [
  { value: '', label: 'Tất cả' },
  ...Object.entries(ORDER_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
  { value: REFUND_FILTER, label: 'Cần hoàn tiền' },
];

const firstPayment = (order) => (Array.isArray(order.payments) ? order.payments[0] : order.payments);
const sectionTitle = (text) => el('h3', { className: 'text-sm font-semibold text-stone-900', text });

// ---------- Hủy đơn: hỏi lý do ----------
function askCancelReason(order) {
  return new Promise((resolve) => {
    let answered = false;
    const field = FormField({ name: 'cancel-reason', label: 'Lý do hủy (không bắt buộc)', multiline: true, maxLength: 255 });
    const finish = (value) => { answered = true; resolve(value); modal.close(); };
    const modal = openModal({
      title: `Hủy đơn ${order.order_code}?`,
      content: el('div', { className: 'space-y-3' }, [
        el('p', { className: 'text-sm text-stone-600', text: 'Số lượng đang giữ chỗ sẽ được trả lại kho. Thao tác này không thể hoàn tác.' }),
        field,
      ]),
      actions: [
        Button({ label: 'Quay lại', variant: 'ghost', onClick: () => finish(null) }),
        Button({ label: 'Hủy đơn', variant: 'danger', onClick: () => finish(field.querySelector('textarea').value.trim()) }),
      ],
      onClose: () => { if (!answered) resolve(null); },
    });
  });
}

// ---------- Chi tiết một đơn (hộp thoại) ----------
function OrderDetail(order, { onDone }) {
  const payment = firstPayment(order);
  const history = [...(order.order_status_histories ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const step = NEXT_STEP[order.status];
  const canCancel = ADMIN_CANCELLABLE.includes(order.status);
  const needsRefund = order.status === 'CANCELLED' && payment?.status === 'PAID';
  const onlineUnpaid = step?.to === 'CONFIRMED' && payment?.method === 'ONLINE' && payment?.status !== 'PAID';

  const act = (button, task, successMessage, busyLabel) =>
    runWithLoading(button, async () => {
      try {
        await task();
        showToast(successMessage, 'success');
        onDone();
      } catch (error) {
        showToast(toUserMessage(error), 'error');
      }
    }, busyLabel);

  const buttons = [];
  if (step) {
    const next = Button({ label: step.label, disabled: onlineUnpaid });
    next.addEventListener('click', () => act(next, () => updateOrderStatus(order.id, step.to), 'Đã cập nhật trạng thái đơn', 'Đang cập nhật...'));
    buttons.push(next);
  }
  if (canCancel) {
    const cancel = Button({ label: 'Hủy đơn', variant: 'danger' });
    cancel.addEventListener('click', async () => {
      const reason = await askCancelReason(order);
      if (reason === null) return;
      act(cancel, () => updateOrderStatus(order.id, 'CANCELLED', reason), 'Đã hủy đơn', 'Đang hủy...');
    });
    buttons.push(cancel);
  }
  if (needsRefund) {
    const refund = Button({ label: 'Đã hoàn tiền cho khách' });
    refund.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Xác nhận đã hoàn tiền?',
        message: 'Hệ thống chỉ ghi nhận, không tự chuyển tiền. Hãy hoàn tiền cho khách trước khi xác nhận.',
      });
      if (ok) act(refund, () => markRefunded(order.id), 'Đã ghi nhận hoàn tiền', 'Đang xử lý...');
    });
    buttons.push(refund);
  }

  return el('div', { className: 'max-h-[65vh] space-y-4 overflow-y-auto pr-1' }, [
    el('div', { className: 'flex flex-wrap items-center gap-2' }, [
      StatusBadge({ status: order.status, statusMap: ORDER_STATUS }),
      el('span', { className: 'text-xs text-stone-500', text: `Đặt lúc ${formatDateTime(order.created_at)}` }),
    ]),
    order.cancel_reason ? el('p', { className: 'text-sm text-red-700', text: `Lý do hủy: ${order.cancel_reason}` }) : null,
    onlineUnpaid ? el('p', { className: 'rounded-lg bg-amber-50 p-3 text-sm text-amber-800', text: 'Đơn thanh toán trực tuyến, cần thanh toán xong mới xác nhận được.' }) : null,
    needsRefund ? el('p', { className: 'rounded-lg bg-amber-50 p-3 text-sm text-amber-800', text: 'Đơn đã hủy nhưng khách đã thanh toán: cần hoàn tiền thủ công.' }) : null,

    el('section', { className: 'space-y-1' }, [
      sectionTitle('Sản phẩm'),
      el('ul', { className: 'divide-y divide-cream-200 text-sm' }, order.order_items.map((item) => el('li', { className: 'flex justify-between gap-3 py-1.5' }, [
        el('span', { text: `${item.product_name} × ${item.quantity}` }),
        el('span', { className: 'shrink-0 font-medium', text: formatPrice(item.unit_price * item.quantity) }),
      ]))),
      el('p', { className: 'text-right text-sm text-stone-600', text: `Phí vận chuyển: ${formatPrice(order.shipping_fee)}` }),
      el('p', { className: 'text-right font-semibold text-earth-700', text: `Tổng: ${formatPrice(order.total_amount)}` }),
    ]),
    el('section', { className: 'space-y-1 text-sm' }, [
      sectionTitle('Giao tới'),
      el('p', { className: 'font-medium', text: `${order.recipient_name} · ${order.recipient_phone}` }),
      el('p', { text: `${order.ship_street_address}, ${order.ship_ward}, ${order.ship_province}` }),
      order.customer_note ? el('p', { className: 'text-stone-500', text: `Ghi chú của khách: ${order.customer_note}` }) : null,
    ]),
    payment ? el('section', { className: 'space-y-1 text-sm' }, [
      sectionTitle('Thanh toán'),
      el('p', { text: PAYMENT_METHOD[payment.method]?.label ?? payment.method }),
      StatusBadge({ status: payment.status, statusMap: PAYMENT_STATUS }),
    ]) : null,
    history.length > 0 ? el('section', { className: 'space-y-1' }, [
      sectionTitle('Lịch sử'),
      el('ol', { className: 'space-y-1 border-l-2 border-brand-100 pl-3 text-sm' }, history.map((h) => el('li', {}, [
        el('span', { className: 'font-medium', text: ORDER_STATUS[h.to_status]?.label ?? h.to_status }),
        el('span', { className: 'text-xs text-stone-500', text: ` · ${formatDateTime(h.created_at)}` }),
        h.note ? el('p', { className: 'text-stone-600', text: h.note }) : null,
      ]))),
    ]) : null,
    buttons.length > 0 ? el('div', { className: 'flex flex-col gap-2 border-t border-cream-200 pt-3 sm:flex-row' }, buttons) : null,
  ]);
}

async function openOrderDetail(orderId, onChanged) {
  try {
    const order = await getOrderForAdmin(orderId);
    if (!order) {
      showToast('Không tìm thấy đơn hàng.', 'error');
      return;
    }
    const modal = openModal({
      title: `Đơn ${order.order_code}`,
      content: OrderDetail(order, { onDone: () => { modal.close(); onChanged(); } }),
      actions: [Button({ label: 'Đóng', variant: 'ghost', onClick: () => modal.close() })],
    });
  } catch (error) {
    showToast(toUserMessage(error), 'error');
  }
}

// ---------- Danh sách ----------
function OrderRow(order, onOpen) {
  const payment = firstPayment(order);
  return el('li', {}, [
    el('button', {
      className: 'flex w-full flex-col gap-2 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-cream-200 hover:ring-brand-500 sm:flex-row sm:items-center sm:justify-between',
      attrs: { type: 'button' },
      on: { click: () => onOpen(order.id) },
    }, [
      el('div', { className: 'space-y-1' }, [
        el('p', { className: 'font-semibold text-stone-900', text: order.order_code }),
        el('p', { className: 'text-sm text-stone-500', text: `${order.recipient_name} · ${formatDateTime(order.created_at)} · ${PAYMENT_METHOD[payment?.method]?.label ?? ''}` }),
      ]),
      el('div', { className: 'flex flex-wrap items-center gap-2 sm:justify-end' }, [
        StatusBadge({ status: order.status, statusMap: ORDER_STATUS }),
        payment ? StatusBadge({ status: payment.status, statusMap: PAYMENT_STATUS }) : null,
        el('span', { className: 'font-semibold text-earth-700', text: formatPrice(order.total_amount) }),
      ]),
    ]),
  ]);
}

initPage({
  title: 'Quản lý đơn hàng',
  access: 'admin',
  render: async (main) => {
    const content = el('div', { className: 'space-y-4' });
    const filterBar = el('div', { className: 'flex flex-wrap gap-2', attrs: { role: 'group', 'aria-label': 'Lọc theo trạng thái' } });
    render(main, PageHeading('Quản lý đơn hàng'), filterBar, content);

    let filter = '';
    let page = 1;

    function drawFilters() {
      render(filterBar, ...FILTERS.map((f) => el('button', {
        className: `min-h-11 rounded-full px-4 text-sm font-medium ${f.value === filter ? 'bg-brand-700 text-white' : 'bg-white text-stone-700 ring-1 ring-cream-200 hover:ring-brand-500'}`,
        text: f.label,
        attrs: { type: 'button', 'aria-pressed': String(f.value === filter) },
        on: { click: () => { filter = f.value; page = 1; drawFilters(); load(); } },
      })));
    }

    async function load() {
      render(content, LoadingSkeleton({ count: 5 }));
      try {
        const { items, total } = await listOrders({
          status: filter && filter !== REFUND_FILTER ? filter : undefined,
          needsRefund: filter === REFUND_FILTER,
          page,
        });
        if (items.length === 0) {
          render(content, EmptyState({ title: 'Không có đơn hàng nào', message: filter ? 'Thử chọn bộ lọc khác.' : undefined }));
          return;
        }
        render(content,
          el('ul', { className: 'space-y-3' }, items.map((o) => OrderRow(o, (id) => openOrderDetail(id, load)))),
          Pagination({ page, total, pageSize: PAGE_SIZE, onChange: (next) => { page = next; load(); } }));
      } catch (error) {
        render(content, ErrorState({ message: toUserMessage(error), onRetry: load }));
      }
    }

    drawFilters();
    await load();
  },
});
