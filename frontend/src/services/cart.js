// Giỏ hàng. Giỏ KHÔNG giữ hàng; giá luôn là giá hiện tại của sản phẩm.
// Database chặn: sản phẩm không ACTIVE, sản phẩm độc bản số lượng > 1, giỏ của người khác.
import { supabase } from '../lib/supabase.js';
import { emit, EVENTS } from '../lib/events.js';

async function getCartId() {
  const { data, error } = await supabase.from('carts').select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('NOT_AUTHENTICATED');
  return data.id;
}

export async function getCartItems() {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`id, quantity, added_at,
             products ( id, name, slug, price, sale_type, status,
                        product_images ( storage_path, is_primary, sort_order ),
                        inventories ( on_hand, reserved ) )`)
    .order('added_at');
  if (error) throw error;
  return data;
}

export async function getCartCount() {
  const { data, error } = await supabase.from('cart_items').select('quantity');
  if (error) throw error;
  return data.reduce((sum, item) => sum + item.quantity, 0);
}

export async function addToCart(productId, quantity = 1) {
  const cartId = await getCartId();
  const { data: existing, error: readError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .maybeSingle();
  if (readError) throw readError;

  const { error } = existing
    ? await supabase.from('cart_items').update({ quantity: existing.quantity + quantity }).eq('id', existing.id)
    : await supabase.from('cart_items').insert({ cart_id: cartId, product_id: productId, quantity });
  if (error) throw error;
  emit(EVENTS.CART_CHANGED);
}

export async function updateCartItem(itemId, quantity) {
  const { error } = await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
  if (error) throw error;
  emit(EVENTS.CART_CHANGED);
}

export async function removeCartItem(itemId) {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
  if (error) throw error;
  emit(EVENTS.CART_CHANGED);
}

/** Tạm tính theo giá hiện tại, chỉ để hiển thị. Database tự tính lại khi đặt hàng. */
export function calcCartSubtotal(items) {
  return items.reduce((sum, item) => sum + (item.products ? Number(item.products.price) * item.quantity : 0), 0);
}
