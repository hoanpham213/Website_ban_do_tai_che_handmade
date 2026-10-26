import { el } from '../../lib/dom.js';
import { SITE } from '../../config/site.js';
import { CalloutBubble } from './CalloutBubble.js';
import logoFullUrl from '../../assets/logo-full.png';
import bannerUrl from '../../assets/hero-banner.webp';

// Chú thích các vật trên kệ. x, y = vị trí chóp đuôi bong bóng (% theo ảnh hero-banner.webp);
// tail = bên có đuôi. CẦN CẬP NHẬT nội dung chú thích cho đúng sản phẩm thật. Chỉ hiện từ màn hình md.
const CALLOUTS = [
  { text: 'Giấy tái chế', x: 21.5, y: 25.5, tail: 'right' },
  { text: 'Hoa tái chế từ chai nhựa', x: 34.5, y: 23.5, tail: 'left' },
  { text: 'Tranh handmade kính màu', x: 13.5, y: 38, tail: 'left' },
  { text: 'Túi handmade từ vải tái chế', x: 35.5, y: 40.5, tail: 'left' },
  { text: 'Tranh handmade từ vỏ sò và nilon', x: 29.5, y: 60.5, tail: 'left' },

];
const CALLOUT_STAGGER_MS = 180;
const TYPING_DELAY_MS = 28;   // thời gian giữa hai ký tự
const REVEAL_MS = 700;        // thời gian logo hiện ra
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Đoạn chữ được "gõ" từ từ. Phần chưa gõ vẫn chiếm chỗ (ẩn bằng invisible) nên bố cục không bị nhảy;
 * trình đọc màn hình đọc toàn văn qua sr-only thay vì từng ký tự.
 * @returns {{ element: HTMLElement, type: () => Promise<void> }}
 */
function TypedParagraph(text) {
  const typed = el('span', { attrs: { 'aria-hidden': 'true' } });
  const rest = el('span', { className: 'invisible', text, attrs: { 'aria-hidden': 'true' } });
  const element = el('p', {}, [el('span', { className: 'sr-only', text }), typed, rest]);
  const characters = Array.from(text);

  const showAll = () => { typed.textContent = text; rest.textContent = ''; };
  if (reduceMotion()) showAll(); else { typed.textContent = ''; }

  return {
    element,
    async type() {
      if (reduceMotion()) return;
      for (let i = 1; i <= characters.length; i += 1) {
        typed.textContent = characters.slice(0, i).join('');
        rest.textContent = characters.slice(i).join('');
        await wait(TYPING_DELAY_MS);
      }
    },
  };
}

/**
 * Banner đầu trang chủ, cao và rộng bằng cả màn hình.
 * Ảnh nền là ảnh dựng sẵn (tường + kệ + ánh sáng) với phần trống bên phải dành cho chữ.
 * Header (trong suốt) đè lên phía trên banner nên cần dùng cùng initPage({ fullWidth: true }).
 *   Màn hình nhỏ: chữ nằm trên nền kem mờ ở phía trên.  Từ md: chữ nằm ở nửa phải.
 */
export function HeroBanner() {
  const background = el('img', {
    className: 'block h-full w-full',
    attrs: { src: bannerUrl, alt: 'Kệ gỗ góc trưng bày đồ tái chế và handmade', width: 1920, height: 1122, fetchpriority: 'high' },
  });
  // Khung cùng tỉ lệ ảnh, phủ kín banner (giống object-cover, neo bên trái) để bong bóng luôn đúng vị trí vật
  const bubbles = CALLOUTS.map(CalloutBubble);
  const scene = el('div', {
    className: 'absolute left-0 top-1/2 aspect-[1920/1122] w-[max(100%,calc(max(100dvh,34rem)*1.711))] -translate-y-1/2',
  }, [background, ...bubbles.map((bubble) => bubble.element)]);
  const logo = el('img', {
    className: 'h-auto w-64 transition duration-700 sm:w-80 lg:w-96',
    attrs: { src: logoFullUrl, alt: `${SITE.name} – ${SITE.tagline}`, width: 1442, height: 513 },
  });
  const paragraphs = SITE.message.map(TypedParagraph);
  const text = el('div', {
    className: 'relative z-10 mx-[15px] mt-24 flex flex-col items-center rounded-2xl bg-cream-50/75 p-5 text-center backdrop-blur-sm '
      + 'md:mx-0 md:ml-auto md:mt-0 md:h-full md:w-1/2 md:items-start md:justify-center md:rounded-none md:bg-transparent md:p-0 md:px-12 md:text-left md:backdrop-blur-none lg:px-20',
  }, [
    // Logo đầy đủ (chữ GOM + slogan) đóng vai tiêu đề chính của trang
    el('h1', {}, [logo]),
    el('div', { className: 'mt-6 max-w-2xl space-y-3 text-lg font-semibold leading-relaxed text-brand-800 sm:text-xl lg:text-2xl' },
      paragraphs.map((paragraph) => paragraph.element)),
  ]);

  const section = el('section', {
    className: 'relative h-dvh min-h-[34rem] w-full overflow-hidden bg-cream-100',
    attrs: { 'aria-label': 'Giới thiệu' },
  }, [scene, text]);

  // Trình tự: logo hiện dần → gõ đoạn 1 → gõ đoạn 2
  (async () => {
    if (!reduceMotion()) {
      logo.classList.add('opacity-0', 'translate-y-3');
      await wait(250);
      logo.classList.remove('opacity-0', 'translate-y-3');
      await wait(REVEAL_MS);
    }
    // Bong bóng chú thích hiện lần lượt cùng lúc chữ bắt đầu được gõ
    bubbles.forEach((bubble, index) => setTimeout(bubble.show, index * CALLOUT_STAGGER_MS));
    for (const paragraph of paragraphs) await paragraph.type();
  })();

  return section;
}
