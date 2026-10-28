// Biểu tượng Font Awesome Free (gói @fortawesome/fontawesome-free, nạp CSS ở styles/main.css).
// Dùng qua tên ngắn để các nơi gọi không phụ thuộc tên class của thư viện;
// muốn thêm icon: thêm một dòng vào ICONS (tra tên tại fontawesome.com/icons, bản Free).

const ICONS = {
  menu: 'fa-bars',
  user: 'fa-user',
  heart: 'fa-heart',
  cart: 'fa-cart-shopping',
  search: 'fa-magnifying-glass',
  close: 'fa-xmark',
  back: 'fa-arrow-left',
  chevron: 'fa-chevron-down',
  eye: 'fa-eye',
  eyeSlash: 'fa-eye-slash',
  google: 'fa-google',
  facebook: 'fa-facebook-f',
};

const BRAND_ICONS = new Set(['google', 'facebook']);

/**
 * @param {{ name: keyof ICONS, className?: string, filled?: boolean }} props
 *   filled: dùng bản đặc (fa-solid); mặc định icon có bản viền (fa-regular) như trái tim sẽ là nét viền,
 *   các icon chỉ có bản đặc (bars, user, cart...) luôn dùng fa-solid.
 * className: thêm class Tailwind, ví dụ kích thước chữ 'text-xl'.
 * Icon chỉ để trang trí (aria-hidden); nút/link chứa icon phải có aria-label hoặc chữ đi kèm.
 */
export function Icon({ name, className = '', filled = false }) {
  const hasOutline = name === 'heart';
  const style = BRAND_ICONS.has(name) ? 'fa-brands' : hasOutline && !filled ? 'fa-regular' : 'fa-solid';
  const icon = document.createElement('i');
  icon.className = `${style} ${ICONS[name] ?? ''} ${className}`.trim();
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}
