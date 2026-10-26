// Đọc và kiểm tra biến môi trường khi khởi động.
// Thiếu biến -> app.js hiện thông báo lỗi rõ ràng trên trang, không dùng giá trị giả.

const values = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

export const missingEnv = Object.freeze(
  Object.entries(values).filter(([, value]) => !value).map(([name]) => name),
);

export const env = Object.freeze({
  supabaseUrl: values.VITE_SUPABASE_URL,
  supabasePublishableKey: values.VITE_SUPABASE_PUBLISHABLE_KEY,
});
