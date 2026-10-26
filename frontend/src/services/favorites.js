// Danh sách yêu thích (cần đăng nhập). RLS: mỗi người chỉ đọc/thêm/xóa của mình,
// chỉ thêm được sản phẩm đang bán. user_id do database tự điền (default auth.uid()).
import { supabase } from '../lib/supabase.js';
import { emit, EVENTS } from '../lib/events.js';

/**
 * Danh sách yêu thích, mới nhất trước.
 * Sản phẩm đã ngừng bán: RLS ẩn sản phẩm nên `products` = null; trang nên cho phép xóa.
 */
export async function getFavorites() {
  const { data, error } = await supabase
    .from('favorites')
    .select(`product_id, created_at,
             products ( id, name, slug, price, sale_type, is_recycled, is_handmade,
                        product_images ( storage_path, is_primary, sort_order ),
                        inventories ( on_hand, reserved ) )`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Tập id sản phẩm đã yêu thích, dùng để tô trái tim trên danh sách sản phẩm. */
export async function getFavoriteIds() {
  const { data, error } = await supabase.from('favorites').select('product_id');
  if (error) throw error;
  return new Set(data.map((row) => row.product_id));
}

export async function isFavorite(productId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function addFavorite(productId) {
  // ignoreDuplicates: bấm 2 lần (hoặc 2 tab) không gây lỗi trùng khóa
  const { error } = await supabase
    .from('favorites')
    .upsert({ product_id: productId }, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
  if (error) throw error;
  emit(EVENTS.FAVORITES_CHANGED, { productId, isFavorite: true });
}

export async function removeFavorite(productId) {
  const { error } = await supabase.from('favorites').delete().eq('product_id', productId);
  if (error) throw error;
  emit(EVENTS.FAVORITES_CHANGED, { productId, isFavorite: false });
}
