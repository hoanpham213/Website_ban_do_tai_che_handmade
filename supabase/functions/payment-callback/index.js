// Edge Function: cổng thanh toán gọi về sau khi khách thanh toán (IPN/webhook)
// Cổng thanh toán không có JWT của Supabase, nên function này phải tắt verify_jwt
// (xem supabase/config.toml) và TỰ xác thực bằng chữ ký của cổng.

import { json, errorResponse, requireEnv } from '../_shared/http.js';
import { createAdminClient } from '../_shared/supabase.js';

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') return errorResponse('METHOD_NOT_ALLOWED', 405);
  if (!requireEnv(['PAYMENT_PROVIDER', 'PAYMENT_SECRET'])) {
    return errorResponse('PAYMENT_NOT_CONFIGURED', 503);
  }

  // TODO: theo tài liệu của cổng đã chọn:
  //   1. Đọc tham số (query hoặc body).
  //   2. Kiểm tra chữ ký bằng PAYMENT_SECRET. Sai chữ ký -> từ chối, KHÔNG cập nhật gì.
  //   3. Kiểm tra số tiền khớp payments.amount.
  //   4. Lấy transactionRef, success từ tham số đã xác thực.
  const verified = null; // { transactionRef, success, raw }
  if (!verified) return errorResponse('PAYMENT_PROVIDER_NOT_IMPLEMENTED', 501);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('record_payment_result', {
    p_transaction_ref: verified.transactionRef,
    p_success: verified.success,
    p_response: verified.raw,
  });
  if (error) {
    console.error('record_payment_result failed:', error.message);
    return errorResponse('INTERNAL_ERROR', 500);
  }
  // Gọi lặp lại vẫn an toàn: hàm trả ALREADY_PROCESSED
  return json({ result: data });
});
