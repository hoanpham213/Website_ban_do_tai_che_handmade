// Đơn hàng của khách. Tạo / hủy đơn CHỈ qua hàm RPC (database tính giá, giữ hàng).
// Đọc đơn: RLS chỉ trả đơn của người đang đăng nhập.
import { supabase } from '../lib/supabase.js';
import { PAGE_SIZE } from '../config/constants.js';
import { emit, EVENTS } from '../lib/events.js';

export async function getShippingFee() {
  const { data, error } = await supabase.from('store_settings').select('shipping_fee').single();
  if (error) throw error;
  return Number(data.shipping_fee);
}

/** expectedTotal: tổng tiền đang hiển thị; database từ chối nếu không khớp (PRICE_CHANGED). */
export async function placeOrder({ addressId, paymentMethod, expectedTotal, customerNote }) {
  const { data, error } = await supabase.rpc('place_order', {
    p_address_id: addressId,
    p_payment_method: paymentMethod,
    p_expected_total: expectedTotal,
    p_customer_note: customerNote || null,
  });
  if (error) throw error;
  emit(EVENTS.CART_CHANGED);
  return data[0]; // { order_id, order_code, total_amount, payment_deadline }
}

export async function startOnlinePayment(orderCode) {
  const { data, error } = await supabase.functions.invoke('payment-create', { body: { orderCode } });
  if (error) throw error;
  return data.paymentUrl;
}

export async function cancelMyOrder(orderCode, reason) {
  const { error } = await supabase.rpc('cancel_my_order', { p_order_code: orderCode, p_reason: reason });
  if (error) throw error;
}

export async function confirmOrderReceived(orderCode) {
  const { error } = await supabase.rpc('confirm_order_received', { p_order_code: orderCode });
  if (error) throw error;
}

export async function listMyOrders(page = 1) {
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await supabase
    .from('orders')
    .select('order_code, status, total_amount, created_at, payments ( method, status )', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { items: data, total: count ?? 0 };
}

export async function getMyOrder(orderCode) {
  const { data, error } = await supabase
    .from('orders')
    .select(`id, order_code, status, recipient_name, recipient_phone, ship_province, ship_ward,
             ship_street_address, customer_note, subtotal, shipping_fee, total_amount,
             payment_deadline, cancel_reason, created_at,
             order_items ( id, product_id, product_name, unit_price, quantity, reused_weight_grams ),
             payments ( method, status, paid_at ),
             order_status_histories ( from_status, to_status, note, created_at )`)
    .eq('order_code', orderCode)
    .maybeSingle();
  if (error) throw error;
  return data;
}
