// Đánh giá: gắn với dòng hàng đã mua (order_item), database kiểm tra đã nhận hàng.
import { supabase } from '../lib/supabase.js';

export async function createReview({ orderItemId, rating, comment }) {
  const { error } = await supabase.from('reviews').insert({
    order_item_id: orderItemId,
    rating,
    comment: comment?.trim() || null,
  });
  if (error) throw error;
}
