import { el } from '../../lib/dom.js';
import { FormField, setFieldError, clearFormErrors } from '../ui/FormField.js';
import { Button, runWithLoading } from '../ui/Button.js';
import { toUserMessage } from '../../lib/errors.js';

// Phải khớp CHECK của bảng addresses (supabase/migrations/..._schema.sql)
export const PHONE_PATTERN = /^[0-9+ ]{8,15}$/;

/**
 * Form thêm / sửa địa chỉ giao hàng. Dùng ở trang Tài khoản và trang Thanh toán.
 * Địa chỉ theo 2 cấp hành chính: Tỉnh/Thành phố và Phường/Xã.
 * @param {{ initial?: object, submitLabel?: string,
 *           onSubmit: (address: { recipientName, recipientPhone, province, ward, streetAddress }) => Promise<void>,
 *           onCancel?: Function }} props
 */
export function AddressForm({ initial = {}, submitLabel = 'Lưu địa chỉ', onSubmit, onCancel }) {
  const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
  const submit = Button({ label: submitLabel, type: 'submit' });

  const form = el('form', { className: 'space-y-3', attrs: { novalidate: true } }, [
    el('div', { className: 'grid gap-3 sm:grid-cols-2' }, [
      FormField({ name: 'recipientName', label: 'Người nhận', required: true, autocomplete: 'name', maxLength: 100, value: initial.recipient_name ?? '' }),
      FormField({ name: 'recipientPhone', label: 'Số điện thoại', type: 'tel', required: true, autocomplete: 'tel', maxLength: 15, value: initial.recipient_phone ?? '' }),
      FormField({ name: 'province', label: 'Tỉnh / Thành phố', required: true, autocomplete: 'address-level1', maxLength: 100, value: initial.province ?? '' }),
      FormField({ name: 'ward', label: 'Phường / Xã', required: true, autocomplete: 'address-level2', maxLength: 100, value: initial.ward ?? '' }),
    ]),
    FormField({ name: 'streetAddress', label: 'Số nhà, tên đường', required: true, autocomplete: 'street-address', maxLength: 255, value: initial.street_address ?? '' }),
    formError,
    el('div', { className: 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end' }, [
      onCancel ? Button({ label: 'Hủy', variant: 'ghost', onClick: onCancel }) : null,
      submit,
    ]),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormErrors(form);
    formError.textContent = '';
    const address = {
      recipientName: form.recipientName.value.trim(),
      recipientPhone: form.recipientPhone.value.trim(),
      province: form.province.value.trim(),
      ward: form.ward.value.trim(),
      streetAddress: form.streetAddress.value.trim(),
    };

    let valid = true;
    const require = (name, message) => { if (!address[name]) { setFieldError(form, name, message); valid = false; } };
    require('recipientName', 'Vui lòng nhập tên người nhận.');
    require('province', 'Vui lòng nhập tỉnh / thành phố.');
    require('ward', 'Vui lòng nhập phường / xã.');
    require('streetAddress', 'Vui lòng nhập địa chỉ.');
    if (!PHONE_PATTERN.test(address.recipientPhone)) {
      setFieldError(form, 'recipientPhone', 'Số điện thoại gồm 8–15 chữ số.');
      valid = false;
    }
    if (!valid) return;

    runWithLoading(submit, async () => {
      try {
        await onSubmit(address);
      } catch (error) {
        formError.textContent = toUserMessage(error);
      }
    }, 'Đang lưu...');
  });

  return form;
}

/** Hiển thị một địa chỉ dạng văn bản. */
export function AddressText({ address }) {
  return el('div', { className: 'text-sm text-stone-700' }, [
    el('p', { className: 'font-medium text-stone-900' }, [
      address.recipient_name,
      el('span', { className: 'font-normal text-stone-500', text: ` · ${address.recipient_phone}` }),
    ]),
    el('p', { text: `${address.street_address}, ${address.ward}, ${address.province}` }),
  ]);
}
