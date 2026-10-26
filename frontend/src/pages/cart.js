import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { getCartItems, updateCartItem, removeCartItem, calcCartSubtotal } from '../services/cart.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/States.js';
import { ButtonLink } from '../components/ui/Button.js';
import { showToast } from '../components/ui/Toast.js';
import { confirmDialog } from '../components/common/ConfirmDialog.js';
import { CartItem, cartItemProblem } from '../components/cart/CartItem.js';
import { CartSummary } from '../components/cart/CartSummary.js';

initPage({
  title: 'Giỏ hàng',
  access: 'customer',
  render: async (main) => {
    const content = el('div');
    render(main, PageHeading('Giỏ hàng'), content);

    const handleQuantity = async (item, quantity) => {
      try {
        await updateCartItem(item.id, quantity);
        await load();
      } catch (error) {
        showToast(toUserMessage(error), 'error');
      }
    };
    const handleRemove = async (item) => {
      const ok = await confirmDialog({
        title: 'Xóa khỏi giỏ hàng?',
        message: item.products ? `Bỏ "${item.products.name}" khỏi giỏ hàng.` : 'Bỏ sản phẩm này khỏi giỏ hàng.',
        confirmLabel: 'Xóa',
        danger: true,
      });
      if (!ok) return;
      try {
        await removeCartItem(item.id);
        await load();
      } catch (error) {
        showToast(toUserMessage(error), 'error');
      }
    };

    async function load() {
      if (!content.hasChildNodes()) render(content, LoadingSkeleton({ count: 4 }));
      try {
        const items = await getCartItems();
        if (items.length === 0) {
          render(content, EmptyState({
            title: 'Giỏ hàng đang trống',
            message: 'Hãy chọn vài món đồ tái chế hoặc handmade bạn thích.',
            action: ButtonLink({ label: 'Xem sản phẩm', href: '/products.html' }),
          }));
          return;
        }

        const hasProblem = items.some((item) => cartItemProblem(item));
        const checkout = hasProblem
          ? el('p', { className: 'rounded-lg bg-amber-50 p-3 text-sm text-amber-800', text: 'Vui lòng xử lý các sản phẩm được đánh dấu trước khi thanh toán.' })
          : ButtonLink({ label: 'Tiến hành thanh toán', href: '/checkout.html', className: 'w-full' });

        render(content, el('div', { className: 'grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start' }, [
          el('ul', { className: 'space-y-3' }, items.map((item) => CartItem({ item, onQuantityChange: handleQuantity, onRemove: handleRemove }))),
          el('div', { className: 'lg:sticky lg:top-20' }, [
            CartSummary({
              subtotal: calcCartSubtotal(items),
              action: checkout,
              note: 'Giỏ hàng không giữ hàng. Sản phẩm độc bản có thể được người khác đặt trước.',
            }),
          ]),
        ]));
      } catch (error) {
        render(content, ErrorState({ message: toUserMessage(error), onRetry: load }));
      }
    }
    await load();
  },
});
