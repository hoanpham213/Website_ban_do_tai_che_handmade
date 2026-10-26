import { createClient } from '@supabase/supabase-js';
import { env, missingEnv } from '../config/env.js';

// Client Supabase DUY NHẤT cho toàn site. Không tạo client ở nơi khác.
// Dùng publishable key: quyền thực tế do RLS trong database quyết định.
// Phiên đăng nhập do supabase-js tự quản lý (lưu trong localStorage của trình duyệt);
// đây là cơ chế chuẩn của nền tảng cho website không có server riêng.
// Thiếu cấu hình -> null; app.js sẽ dừng và báo lỗi trước khi service nào được gọi.
export const supabase = missingEnv.length === 0
  ? createClient(env.supabaseUrl, env.supabasePublishableKey)
  : null;
