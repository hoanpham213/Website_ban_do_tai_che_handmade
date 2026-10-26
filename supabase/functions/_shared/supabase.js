import { createClient } from 'npm:@supabase/supabase-js@2';

// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY do Supabase tự cấp cho Edge Functions.

// Client chạy bằng phiên của người gọi: RLS vẫn áp dụng.
// Dùng cho mọi thao tác đọc dữ liệu thay mặt người dùng (chatbot, kiểm tra quyền sở hữu đơn).
export function createUserClient(req) {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
}

// Client quyền cao (bỏ qua RLS). CHỈ dùng sau khi đã kiểm tra quyền,
// và chỉ để gọi các hàm dành riêng cho server (prepare_online_payment, record_payment_result).
export function createAdminClient() {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}
