// Chức năng quản trị. Ẩn menu admin chỉ là giao diện; quyền thật do RLS và
// các hàm admin_* trong database kiểm tra (is_admin()).
import { supabase } from '../lib/supabase.js';
import { PAGE_SIZE, PRODUCT_IMAGE_BUCKET } from '../config/constants.js';

// ---------- Đơn hàng ----------
export async function listOrders({ status, page = 1 } = {}) {
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from('orders')
    .select('id, order_code, status, total_amount, recipient_name, created_at, payments ( method, status )', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (status) query = query.eq('status', status);
  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data, total: count ?? 0 };
}

export async function updateOrderStatus(orderId, toStatus, note) {
  const { error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: orderId, p_to_status: toStatus, p_note: note || null,
  });
  if (error) throw error;
}

export async function markRefunded(orderId) {
  const { error } = await supabase.rpc('admin_mark_refunded', { p_order_id: orderId });
  if (error) throw error;
}

// ---------- Kho ----------
export async function adjustStock(productId, type, quantity, note) {
  const { data, error } = await supabase.rpc('admin_adjust_stock', {
    p_product_id: productId, p_type: type, p_quantity: quantity, p_note: note || null,
  });
  if (error) throw error;
  return data; // tồn mới
}

// ---------- Người dùng ----------
export async function listUsers(page = 1) {
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { items: data, total: count ?? 0 };
}

export async function setUserStatus(userId, status) {
  const { error } = await supabase.rpc('admin_set_user_status', { p_user_id: userId, p_status: status });
  if (error) throw error;
}

// ---------- Thống kê ----------
export async function getDashboardStats(from, to) {
  const { data, error } = await supabase.rpc('admin_dashboard_stats', {
    p_from: from.toISOString(), p_to: to.toISOString(),
  });
  if (error) throw error;
  return data;
}

// ---------- Ảnh sản phẩm ----------
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // khớp giới hạn của bucket

export async function uploadProductImage(productId, file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('INVALID_IMAGE_TYPE');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('IMAGE_TOO_LARGE');

  const extension = file.type.split('/')[1];
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}
