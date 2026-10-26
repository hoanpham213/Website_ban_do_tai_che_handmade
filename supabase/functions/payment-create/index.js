// Edge Function: tạo yêu cầu thanh toán trực tuyến cho một đơn
// POST { orderCode: string }  (cần đăng nhập)
// Trả về { paymentUrl: string }
//
// Biến môi trường (supabase secrets set):
//   PAYMENT_PROVIDER, PAYMENT_MERCHANT_ID, PAYMENT_SECRET, PAYMENT_RETURN_URL
// Cổng thanh toán cụ thể: CẦN QUYẾT ĐỊNH.

import { corsHeaders, json, errorResponse, readJson, requireEnv } from '../_shared/http.js';
import { createUserClient, createAdminClient } from '../_shared/supabase.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 405);

  const body = await readJson(req);
  const orderCode = typeof body?.orderCode === 'string' ? body.orderCode.trim() : '';
  if (!orderCode) return errorResponse('INVALID_ORDER_CODE');

  // 1. Xác minh người gọi và quyền sở hữu đơn bằng client của chính họ (RLS)
  const userClient = createUserClient(req);
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return errorResponse('NOT_AUTHENTICATED', 401);

  const { data: order, error: orderError } = await userClient
    .from('orders')
    .select('id, order_code')
    .eq('order_code', orderCode)
    .maybeSingle();
  if (orderError) return errorResponse('INTERNAL_ERROR', 500);
  if (!order) return errorResponse('ORDER_NOT_FOUND', 404);

  if (!requireEnv(['PAYMENT_PROVIDER', 'PAYMENT_SECRET', 'PAYMENT_RETURN_URL'])) {
    return errorResponse('PAYMENT_NOT_CONFIGURED', 503);
  }

  // 2. Gán mã giao dịch mới bằng quyền server (hàm tự kiểm tra trạng thái, hạn thanh toán)
  const transactionRef = `${order.order_code}-${crypto.randomUUID().slice(0, 8)}`;
  const admin = createAdminClient();
  const { data: amount, error: prepareError } = await admin.rpc('prepare_online_payment', {
    p_order_id: order.id,
    p_transaction_ref: transactionRef,
  });
  if (prepareError) return errorResponse(prepareError.message, 409);

  // 3. TODO: tạo URL thanh toán theo tài liệu của cổng đã chọn (ký bằng PAYMENT_SECRET).
  //    Số tiền lấy từ `amount` (database), KHÔNG lấy từ client.
  void amount;
  return errorResponse('PAYMENT_PROVIDER_NOT_IMPLEMENTED', 501);
});
