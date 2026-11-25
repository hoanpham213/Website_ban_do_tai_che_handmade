import { el, render } from '../../lib/dom.js';
import { getImageUrl } from '../../services/products.js';

const placeholder = () => el('div', {
  className: 'flex h-full w-full items-center justify-center text-sm text-stone-500',
  text: 'Chưa có ảnh',
});

/**
 * Thư viện ảnh sản phẩm: ảnh lớn + dải ảnh nhỏ (chỉ hiện khi có từ 2 ảnh trở lên).
 * @param {{ images: Array<{ storage_path: string, alt_text?: string|null }>, alt: string }} props
 *   images: đã sắp xếp (ảnh chính đứng đầu). alt: mô tả dự phòng khi ảnh không có alt_text.
 */
export function ImageGallery({ images, alt }) {
  const photos = images
    .map((image) => ({ url: getImageUrl(image.storage_path), alt: image.alt_text || alt }))
    .filter((photo) => photo.url);

  const frame = el('div', { className: 'aspect-square overflow-hidden rounded-xl bg-cream-100' });
  if (photos.length === 0) {
    render(frame, placeholder());
    return el('div', {}, [frame]);
  }

  const main = el('img', { className: 'h-full w-full object-cover', attrs: { width: 800, height: 800 } });
  // Ảnh lỗi (đường dẫn sai, đã bị xóa): hiện khung "Chưa có ảnh" thay vì ảnh vỡ
  main.addEventListener('error', () => render(frame, placeholder()));

  const thumbs = photos.map((photo, index) => el('button', {
    className: 'h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream-100 ring-2 ring-transparent '
      + 'aria-[current=true]:ring-brand-700',
    attrs: { type: 'button', 'aria-label': `Xem ảnh ${index + 1}`, 'aria-current': 'false' },
    on: { click: () => show(index) },
  }, [el('img', { className: 'h-full w-full object-cover', attrs: { src: photo.url, alt: '', loading: 'lazy', width: 64, height: 64 } })]));

  function show(index) {
    main.src = photos[index].url;
    main.alt = photos[index].alt;
    render(frame, main);
    thumbs.forEach((thumb, i) => thumb.setAttribute('aria-current', String(i === index)));
  }
  show(0);

  return el('div', { className: 'space-y-3' }, [
    frame,
    photos.length > 1 ? el('div', { className: 'flex gap-2 overflow-x-auto pb-1' }, thumbs) : null,
  ]);
}
