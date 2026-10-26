import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { getCartItems, calcCartSubtotal } from '../services/cart.js';
import { listAddresses, createAddress } from '../services/addresses.js';
import { getShippingFee, placeOrder } from '../services/orders.js';
import { PAYMENT_METHOD } from '../config/constants.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/States.js';
import { Button, ButtonLink, runWithLoading } from '../components/ui/Button.js';
import { showToast } from '../components/ui/Toast.js';
import { CartItem, cartItemProblem } from '../components/cart/CartItem.js';
import { CartSummary } from '../components/cart/CartSummary.js';
import { AddressForm, AddressText } from '../components/account/AddressForm.js';

// Thanh toán trực tuyến chưa có cổng thanh toán (xem supabase/functions/payment-create).
// Bật lại khi đã cài đặt: thêm 'ONLINE' vào danh sách này.
const ENABLED_PAYMENT_METHODS = ['COD'];
const NOTE_MAX_LENGTH = 500; // khớp CHECK của orders.customer_note

const sectionClass = 'space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-cream-200';
const sectionTitle = (text) => el('h2', { className: 'font-semibold text-stone-900', text });

/** Chọn địa chỉ giao hàng hoặc thêm địa chỉ mới. Trả về phần tử + hàm đọc id đang chọn. */
function AddressPicker({ addresses, selectedId, onAdded }) {
  const container = el('section', { className: sectionClass }, [sectionTitle('Địa chỉ giao hàng')]);
  let currentId = selectedId;

  const showForm = (allowCancel) => {
    render(container, sectionTitle('Thêm địa chỉ giao hàng'), AddressForm({
      submitLabel: 'Lưu và dùng địa chỉ này',
      onSubmit: async (address) => {
        const created = await createAddress(address);
        onAdded(created.id);
      },
      onCancel: allowCancel ? () => showList() : undefined,
    }));
  };

  const showList = () => {
    const options = addresses.map((address) => el('label', {
      className: 'flex cursor-pointer gap-3 rounded-lg border border-stone-200 p-3 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-100',
    }, [
      el('input', {
        className: 'mt-1 h-4 w-4 accent-brand-700',
        attrs: { type: 'radio', name: 'addressId', value: address.id, checked: address.id === currentId },
        on: { change: () => { currentId = address.id; } },
      }),
      el('div', {}, [
        AddressText({ address }),
        address.is_default ? el('span', { className: 'mt-1 inline-block text-xs font-medium text-brand-700', text: 'Mặc định' }) : null,
      ]),
    ]));
    render(container,
      sectionTitle('Địa chỉ giao hàng'),
      el('div', { className: 'space-y-2', attrs: { role: 'radiogroup', 'aria-label': 'Địa chỉ giao hàng' } }, options),
      Button({ label: '+ Thêm địa chỉ mới', variant: 'secondary', onClick: () => showForm(true) }));
  };

  if (addresses.length === 0) showForm(false); else showList();
  return { element: container, getSelectedId: () => currentId };
}

function PaymentPicker() {
  let method = ENABLED_PAYMENT_METHODS[0];
  const options = Object.entries(PAYMENT_METHOD).map(([key, meta]) => {
    const enabled = ENABLED_PAYMENT_METHODS.includes(key);
    return el('label', {
      className: 'flex gap-3 rounded-lg border border-stone-200 p-3 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-100 '
        + (enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'),
    }, [
      el('input', {
        className: 'mt-1 h-4 w-4 accent-brand-700',
        attrs: { type: 'radio', name: 'paymentMethod', value: key, checked: key === method, disabled: !enabled },
        on: { change: () => { method = key; } },
      }),
      el('div', {}, [
        el('p', { className: 'text-sm font-medium text-stone-900', text: meta.label }),
        enabled ? null : el('p', { className: 'text-xs text-stone-500', text: 'Đang phát triển' }),
      ]),
    ]);
  });
  return {
    element: el('section', { className: sectionClass }, [
      sectionTitle('Phương thức thanh toán'),
      el('div', { className: 'space-y-2', attrs: { role: 'radiogroup', 'aria-label': 'Phương thức thanh toán' } }, options),
    ]),
    getMethod: () => method,
  };
}

initPage({
  title: 'Thanh toán',
  access: 'customer',
  render: async (main) => {
    const content = el('div');
    render(main, PageHeading('Thanh toán'), content);

    async function load(preferredAddressId) {
      render(content, LoadingSkeleton({ count: 6 }));
      try {
        const [items, addresses, shippingFee] = await Promise.all([getCartItems(), listAddresses(), getShippingFee()]);

        if (items.length === 0) {
          render(content, EmptyState({
            title: 'Giỏ hàng đang trống',
            action: ButtonLink({ label: 'Xem sản phẩm', href: '/products.html' }),
          }));
          return;
        }
        if (items.some((item) => cartItemProblem(item))) {
          render(content, EmptyState({
            title: 'Giỏ hàng có sản phẩm cần xử lý',
            message: 'Một số sản phẩm đã hết hàng hoặc ngừng bán.',
            action: ButtonLink({ label: 'Về giỏ hàng', href: '/cart.html' }),
          }));
          return;
        }

        const defaultId = preferredAddressId ?? (addresses.find((a) => a.is_default) ?? addresses[0])?.id ?? null;
        const addressPicker = AddressPicker({ addresses, selectedId: defaultId, onAdded: (id) => load(id) });
        const paymentPicker = PaymentPicker();
        const noteInput = el('textarea', {
          className: 'block min-h-20 w-full rounded-lg border border-stone-300 px-3 py-2 text-base',
          attrs: { id: 'customer-note', maxlength: NOTE_MAX_LENGTH, rows: 3, placeholder: 'Ví dụ: giao giờ hành chính' },
        });

        const subtotal = calcCartSubtotal(items);
        const total = subtotal + shippingFee;
        const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
        const placeButton = Button({ label: 'Đặt hàng', className: 'w-full' });

        placeButton.addEventListener('click', () => {
          formError.textContent = '';
          const addressId = addressPicker.getSelectedId();
          if (!addressId) {
            formError.textContent = 'Vui lòng chọn hoặc thêm địa chỉ giao hàng.';
            return;
          }
          runWithLoading(placeButton, async () => {
            try {
              const order = await placeOrder({
                addressId,
                paymentMethod: paymentPicker.getMethod(),
                expectedTotal: total,
                customerNote: noteInput.value.trim(),
              });
              window.location.assign(`/order.html?code=${encodeURIComponent(order.order_code)}&new=1`);
            } catch (error) {
              const code = error?.message;
              if (code === 'PRICE_CHANGED' || code === 'OUT_OF_STOCK' || code === 'PRODUCT_UNAVAILABLE') {
                showToast(toUserMessage(error), 'error', 6000);
                await load(addressId); // tải lại giá và tồn kho mới nhất
                return;
              }
              formError.textContent = toUserMessage(error);
            }
          }, 'Đang đặt hàng...');
        });

        render(content, el('div', { className: 'grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start' }, [
          el('div', { className: 'space-y-4' }, [
            addressPicker.element,
            paymentPicker.element,
            el('section', { className: sectionClass }, [
              el('label', { className: 'font-semibold text-stone-900', text: 'Ghi chú cho cửa hàng', attrs: { for: 'customer-note' } }),
              noteInput,
            ]),
            el('section', { className: sectionClass }, [
              sectionTitle(`Sản phẩm (${items.length})`),
              el('ul', { className: 'space-y-2' }, items.map((item) => CartItem({ item, readOnly: true }))),
            ]),
          ]),
          el('div', { className: 'lg:sticky lg:top-20' }, [
            CartSummary({
              subtotal,
              shippingFee,
              note: 'Giá và tồn kho được kiểm tra lại khi đặt hàng.',
              action: el('div', { className: 'space-y-2' }, [formError, placeButton]),
            }),
          ]),
        ]));
      } catch (error) {
        render(content, ErrorState({ message: toUserMessage(error), onRetry: () => load(preferredAddressId) }));
      }
    }
    await load();
  },
});
