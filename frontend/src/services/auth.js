// Đăng ký, đăng nhập, hồ sơ. Mật khẩu do Supabase Auth băm và lưu, website không chạm vào.
import { supabase } from '../lib/supabase.js';

export async function signUp({ email, password, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: fullName.trim() } }, // vai trò KHÔNG gửi từ đây, database tự đặt CUSTOMER
  });
  if (error) throw error;
  return { needsEmailConfirmation: !data.session };
}

export async function signIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
}

const OAUTH_PROVIDERS = ['google', 'facebook'];

/** Đăng nhập bằng Google / Facebook (trình duyệt chuyển sang trang nhà cung cấp rồi quay lại trang hiện tại). */
export async function signInWithProvider(provider) {
  if (!OAUTH_PROVIDERS.includes(provider)) throw new Error('PROVIDER_NOT_SUPPORTED');
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.href },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Gửi email đặt lại mật khẩu. Supabase luôn trả thành công kể cả khi email chưa đăng ký
 * (không để lộ email nào có tài khoản).
 * @param {string} email
 * @param {string} redirectTo  URL trang đặt mật khẩu mới; phải nằm trong danh sách Redirect URLs của Supabase Auth
 */
export async function requestPasswordReset(email, redirectTo) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
  if (error) throw error;
}

/** Có phiên đăng nhập hay không (kể cả phiên tạm từ link đặt lại mật khẩu). */
export async function hasSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return Boolean(data.session);
}

/** Đặt mật khẩu mới cho người đang đăng nhập. */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Hồ sơ người đang đăng nhập, hoặc null nếu chưa đăng nhập. */
export async function getCurrentProfile() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, status')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile({ fullName, phone }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('NOT_AUTHENTICATED');

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim(), phone: phone?.trim() || null })
    .eq('id', userId);
  if (error) throw error;
}
