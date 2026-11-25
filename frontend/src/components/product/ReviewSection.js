import { el, render } from '../../lib/dom.js';
import { toUserMessage } from '../../lib/errors.js';
import { formatDate } from '../../lib/format.js';
import { getProductReviews } from '../../services/products.js';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/States.js';

const MAX_RATING = 5;
const REVIEW_LIMIT = 50; // khớp limit của hàm get_product_reviews

/** Hiển thị số sao bằng ký tự; đọc to bằng aria-label. */
export function StarRating({ rating, className = '' }) {
  const value = Math.min(MAX_RATING, Math.max(0, Math.round(Number(rating)) || 0));
  return el('span', {
    className: `text-amber-500 ${className}`,
    text: '★'.repeat(value) + '☆'.repeat(MAX_RATING - value),
    attrs: { role: 'img', 'aria-label': `${value} trên ${MAX_RATING} sao` },
  });
}

/**
 * Khu "Đánh giá của khách hàng": tự tải dữ liệu, có đủ trạng thái đang tải / rỗng / lỗi.
 * Chỉ hiển thị đánh giá khách đã nhận hàng (database kiểm tra, xem get_product_reviews).
 */
export function ReviewSection({ productId }) {
  const body = el('div', { className: 'mt-4' });
  const section = el('section', { attrs: { 'aria-labelledby': 'reviews-title' } }, [
    el('h2', { className: 'text-xl font-semibold text-stone-900', text: 'Đánh giá của khách hàng', attrs: { id: 'reviews-title' } }),
    body,
  ]);

  async function load() {
    render(body, LoadingSkeleton({ count: 2 }));
    try {
      const reviews = await getProductReviews(productId);
      if (reviews.length === 0) {
        render(body, EmptyState({ title: 'Chưa có đánh giá', message: 'Đánh giá xuất hiện sau khi khách nhận được hàng.' }));
        return;
      }
      const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      const countText = reviews.length >= REVIEW_LIMIT ? `${REVIEW_LIMIT} đánh giá gần nhất` : `${reviews.length} đánh giá`;
      render(body,
        el('p', { className: 'mb-4 flex items-center gap-2 text-sm text-stone-600' }, [
          el('span', { className: 'text-2xl font-bold text-stone-900', text: average.toFixed(1) }),
          StarRating({ rating: average, className: 'text-lg' }),
          el('span', { text: `· ${countText}` }),
        ]),
        el('ul', { className: 'space-y-3' }, reviews.map((review) => el('li', {
          className: 'rounded-xl bg-white p-4 shadow-sm ring-1 ring-cream-200',
        }, [
          el('div', { className: 'flex flex-wrap items-center gap-x-3 gap-y-1' }, [
            StarRating({ rating: review.rating }),
            el('span', { className: 'text-sm font-medium text-stone-800', text: review.reviewer_name }),
            el('span', { className: 'text-xs text-stone-500', text: formatDate(review.created_at) }),
          ]),
          review.comment ? el('p', { className: 'mt-2 whitespace-pre-line text-stone-700', text: review.comment }) : null,
        ]))));
    } catch (error) {
      render(body, ErrorState({ message: toUserMessage(error), onRetry: load }));
    }
  }

  load();
  return section;
}
