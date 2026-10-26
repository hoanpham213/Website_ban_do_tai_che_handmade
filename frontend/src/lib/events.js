// Kênh sự kiện đơn giản giữa các phần của trang (ví dụ: giỏ hàng thay đổi -> header cập nhật số lượng).

export const EVENTS = Object.freeze({
  CART_CHANGED: 'gom:cart-changed',
  FAVORITES_CHANGED: 'gom:favorites-changed',
});

export function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name, handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}
