import { el } from '../../lib/dom.js';
import { toUserMessage } from '../../lib/errors.js';
import { isFavorite, addFavorite, removeFavorite } from '../../services/favorites.js';
import { Icon } from '../ui/Icon.js';
import { showToast } from '../ui/Toast.js';

/**
 * Nút trái tim thêm/bỏ yêu thích.
 * Chưa đăng nhập: bấm sẽ chuyển tới trang đăng nhập rồi quay lại.
 * @param {{ productId: number, profile: object|null }} props
 */
export function FavoriteButton({ productId, profile }) {
  let active = false;
  let busy = false;

  const label = el('span', { text: 'Yêu thích' });
  const button = el('button', {
    className: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium '
      + 'text-stone-700 hover:bg-cream-100 aria-pressed:border-earth-500 aria-pressed:text-earth-700 disabled:opacity-60',
    attrs: { type: 'button', 'aria-pressed': 'false' },
  });

  const paint = () => {
    button.setAttribute('aria-pressed', String(active));
    label.textContent = active ? 'Đã yêu thích' : 'Yêu thích';
    button.replaceChildren(Icon({ name: 'heart', filled: active }), label);
  };
  paint();

  button.addEventListener('click', async () => {
    if (!profile) {
      window.location.assign(`/login.html?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (busy) return; // chặn bấm liên tục
    busy = true;
    button.disabled = true;
    try {
      if (active) await removeFavorite(productId); else await addFavorite(productId);
      active = !active;
      paint();
      showToast(active ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích', 'success');
    } catch (error) {
      showToast(toUserMessage(error), 'error');
    } finally {
      busy = false;
      button.disabled = false;
    }
  });

  // Đọc trạng thái ban đầu (không chặn hiển thị trang)
  if (profile) {
    isFavorite(productId)
      .then((value) => { active = value; paint(); })
      .catch((error) => console.error(error));
  }

  return button;
}
