// Tiện ích HTTP dùng chung cho Edge Functions.
// ALLOWED_ORIGIN: domain của website (đặt bằng `supabase secrets set`), không dùng "*" ở production.

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '';

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Lỗi trả cho client: chỉ mã + thông báo ngắn, không lộ stack trace
export function errorResponse(code, status = 400) {
  return json({ error: code }, status);
}

export function requireEnv(names) {
  const missing = names.filter((name) => !Deno.env.get(name));
  if (missing.length > 0) {
    // Ghi log phía server để biết thiếu gì; client chỉ nhận mã lỗi chung
    console.error(`Thiếu biến môi trường: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
