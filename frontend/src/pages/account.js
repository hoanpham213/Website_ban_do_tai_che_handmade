import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { toUserMessage } from '../lib/errors.js';
import { updateProfile, updatePassword } from '../services/auth.js';
import { listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '../services/addresses.js';
import { FormField, setFieldError, clearFormErrors } from '../components/ui/FormField.js';
import { Button, runWithLoading } from '../components/ui/Button.js';
import { showToast } from '../components/ui/Toast.js';
import { confirmDialog } from '../components/common/ConfirmDialog.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/States.js';
import { AddressForm, AddressText, PHONE_PATTERN } from '../components/account/AddressForm.js';

const MIN_PASSWORD_LENGTH = 8;
const cardClass = 'space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-cream-200 sm:p-6';
const cardTitle = (text, id) => el('h2', { className: 'text-lg font-semibold text-stone-900', text, attrs: { id } });

/** Hồ sơ: chỉ sửa được họ tên và số điện thoại (database chỉ cấp quyền 2 cột này). */
function ProfileSection(profile) {
  const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
  const submit = Button({ label: 'Lưu thay đổi', type: 'submit' });
  const form = el('form', { className: 'space-y-3', attrs: { novalidate: true } }, [
    el('div', { className: 'space-y-1' }, [
      el('p', { className: 'text-sm font-medium text-stone-700', text: 'Email' }),
      el('p', { className: 'text-stone-900', text: profile.email }),
    ]),
    el('div', { className: 'grid gap-3 sm:grid-cols-2' }, [
      FormField({ name: 'fullName', label: 'Họ và tên', required: true, autocomplete: 'name', maxLength: 100, value: profile.full_name ?? '' }),
      FormField({ name: 'phone', label: 'Số điện thoại', type: 'tel', autocomplete: 'tel', maxLength: 15, value: profile.phone ?? '' }),
    ]),
    formError,
    el('div', { className: 'flex justify-end' }, [submit]),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormErrors(form);
    formError.textContent = '';
    const fullName = form.fullName.value.trim();
    const phone = form.phone.value.trim();
    let valid = true;
    if (!fullName) { setFieldError(form, 'fullName', 'Vui lòng nhập họ tên.'); valid = false; }
    if (phone && !PHONE_PATTERN.test(phone)) { setFieldError(form, 'phone', 'Số điện thoại gồm 8–15 chữ số.'); valid = false; }
    if (!valid) return;

    runWithLoading(submit, async () => {
      try {
        await updateProfile({ fullName, phone });
        showToast('Đã lưu thông tin', 'success');
      } catch (error) {
        formError.textContent = toUserMessage(error);
      }
    }, 'Đang lưu...');
  });

  return el('section', { className: cardClass, attrs: { id: 'profile', 'aria-labelledby': 'profile-title' } }, [
    cardTitle('Thông tin cá nhân', 'profile-title'), form,
  ]);
}

/** Sổ địa chỉ: thêm, sửa, xóa, đặt mặc định. */
function AddressSection() {
  const body = el('div', { className: 'space-y-3' });
  const section = el('section', { className: cardClass, attrs: { id: 'addresses', 'aria-labelledby': 'addresses-title' } }, [
    cardTitle('Sổ địa chỉ', 'addresses-title'), body,
  ]);

  const act = async (task, successMessage) => {
    try {
      await task();
      if (successMessage) showToast(successMessage, 'success');
      await load();
    } catch (error) {
      showToast(toUserMessage(error), 'error');
    }
  };

  const showForm = (address) => render(body, AddressForm({
    initial: address ?? {},
    onSubmit: async (data) => {
      if (address) await updateAddress(address.id, data); else await createAddress(data);
      showToast('Đã lưu địa chỉ', 'success');
      await load();
    },
    onCancel: () => load(),
  }));

  const AddressRow = (address) => {
    const setDefault = address.is_default ? null : Button({ label: 'Đặt mặc định', variant: 'ghost', className: 'text-sm' });
    setDefault?.addEventListener('click', () => runWithLoading(setDefault, () => act(() => setDefaultAddress(address.id), 'Đã đổi địa chỉ mặc định')));
    const remove = Button({ label: 'Xóa', variant: 'ghost', className: 'text-sm text-red-700' });
    remove.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: 'Xóa địa chỉ?', message: 'Đơn hàng đã đặt không bị ảnh hưởng.', confirmLabel: 'Xóa', danger: true });
      if (ok) runWithLoading(remove, () => act(() => deleteAddress(address.id), 'Đã xóa địa chỉ'));
    });

    return el('li', { className: 'flex flex-col gap-2 rounded-lg border border-stone-200 p-3 sm:flex-row sm:items-start sm:justify-between' }, [
      el('div', {}, [
        AddressText({ address }),
        address.is_default ? el('span', { className: 'mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800', text: 'Mặc định' }) : null,
      ]),
      el('div', { className: 'flex flex-wrap gap-1' }, [
        Button({ label: 'Sửa', variant: 'ghost', className: 'text-sm', onClick: () => showForm(address) }),
        setDefault,
        remove,
      ]),
    ]);
  };

  async function load() {
    render(body, LoadingSkeleton({ count: 2 }));
    try {
      const addresses = await listAddresses();
      render(body,
        addresses.length > 0
          ? el('ul', { className: 'space-y-2' }, addresses.map(AddressRow))
          : EmptyState({ title: 'Chưa có địa chỉ', message: 'Thêm địa chỉ để đặt hàng nhanh hơn.' }),
        Button({ label: '+ Thêm địa chỉ', variant: 'secondary', onClick: () => showForm(null) }));
    } catch (error) {
      render(body, ErrorState({ message: toUserMessage(error), onRetry: load }));
    }
  }
  load();
  return section;
}

function PasswordSection() {
  const formError = el('p', { className: 'text-sm text-red-700', attrs: { role: 'alert' } });
  const submit = Button({ label: 'Đổi mật khẩu', type: 'submit' });
  const form = el('form', { className: 'space-y-3', attrs: { novalidate: true } }, [
    el('div', { className: 'grid gap-3 sm:grid-cols-2' }, [
      FormField({ name: 'password', label: 'Mật khẩu mới', type: 'password', required: true, autocomplete: 'new-password', hint: `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` }),
      FormField({ name: 'confirm', label: 'Nhập lại mật khẩu mới', type: 'password', required: true, autocomplete: 'new-password' }),
    ]),
    formError,
    el('div', { className: 'flex justify-end' }, [submit]),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearFormErrors(form);
    formError.textContent = '';
    const password = form.password.value;
    let valid = true;
    if (password.length < MIN_PASSWORD_LENGTH) { setFieldError(form, 'password', `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`); valid = false; }
    if (form.confirm.value !== password) { setFieldError(form, 'confirm', 'Mật khẩu nhập lại không khớp.'); valid = false; }
    if (!valid) return;

    runWithLoading(submit, async () => {
      try {
        await updatePassword(password);
        form.reset();
        showToast('Đã đổi mật khẩu', 'success');
      } catch (error) {
        formError.textContent = toUserMessage(error);
      }
    }, 'Đang lưu...');
  });

  return el('section', { className: cardClass, attrs: { id: 'password', 'aria-labelledby': 'password-title' } }, [
    cardTitle('Đổi mật khẩu', 'password-title'), form,
  ]);
}

initPage({
  title: 'Tài khoản',
  access: 'customer',
  render: (main, { profile }) => {
    // Mục lục: trên mobile là hàng nút cuộn ngang, trên desktop là cột bên trái
    const navLink = (label, href) => el('a', {
      className: 'shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-cream-100',
      text: label,
      attrs: { href },
    });
    const sideNav = el('nav', {
      className: 'flex gap-1 overflow-x-auto lg:sticky lg:top-20 lg:flex-col',
      attrs: { 'aria-label': 'Mục tài khoản' },
    }, [
      navLink('Thông tin cá nhân', '#profile'),
      navLink('Sổ địa chỉ', '#addresses'),
      navLink('Đổi mật khẩu', '#password'),
      navLink('Đơn hàng của tôi', '/orders.html'),
      navLink('Yêu thích', '/favorites.html'),
    ]);

    render(main,
      PageHeading('Tài khoản', profile.full_name || profile.email),
      el('div', { className: 'grid gap-6 lg:grid-cols-[12rem_1fr] lg:items-start' }, [
        sideNav,
        el('div', { className: 'space-y-6' }, [ProfileSection(profile), AddressSection(), PasswordSection()]),
      ]));
  },
});
