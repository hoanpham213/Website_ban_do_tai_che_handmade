import { el } from '../../lib/dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Đuôi bong bóng chat (nét nâu 2 cạnh ngoài, nền kem che viền bong bóng). */
function Tail() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 14');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'absolute h-3.5 w-4 overflow-visible fill-cream-50 stroke-brand-700');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M13 0 L2 13 L2 0');
  path.setAttribute('stroke-width', '3');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('stroke-linecap', 'round');
  svg.append(path);
  return svg;
}

/**
 * Bong bóng chú thích nhỏ ghim vào một vật trong ảnh.
 * x, y: vị trí chóp đuôi bong bóng, tính bằng % theo ảnh nền (không phụ thuộc kích thước màn hình).
 * tail: 'left' → đuôi ở góc trái dưới (bong bóng mở sang phải); 'right' → đuôi ở góc phải dưới (mở sang trái).
 * @returns {{ element: HTMLElement, show: () => void }}
 */
export function CalloutBubble({ text, x, y, tail = 'left' }) {
  const isLeft = tail === 'left';
  const tailSvg = Tail();
  tailSvg.classList.add(isLeft ? 'left-3' : 'right-3', 'top-[calc(100%-3.5px)]');
  if (!isLeft) tailSvg.classList.add('-scale-x-100');

  const element = el('div', {
    className: 'pointer-events-none absolute z-10 hidden scale-75 opacity-0 transition duration-300 ease-out md:block '
      + (isLeft ? 'origin-bottom-left -translate-x-[14px] ' : 'origin-bottom-right translate-x-[calc(-100%+14px)] ')
      + '-translate-y-[calc(100%+10px)]',
    attrs: { style: `left:${x}%;top:${y}%` },
  }, [
    el('div', {
      className: 'whitespace-nowrap rounded-full border-[3px] border-brand-700 bg-cream-50 px-3.5 py-1 text-xs font-semibold text-brand-800 shadow-sm lg:text-sm',
      text,
    }),
    tailSvg,
  ]);

  return {
    element,
    show: () => element.classList.remove('scale-75', 'opacity-0'),
  };
}
