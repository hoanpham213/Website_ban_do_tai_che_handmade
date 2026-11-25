// Edge Function: chatbot AI tư vấn
// POST { message: string, conversationId?: number }
// Trả về { reply: string, conversationId?: number, fallback?: boolean }

import { corsHeaders, json, errorResponse, readJson } from '../_shared/http.js';
import { createUserClient, createAdminClient } from '../_shared/supabase.js';
import { chat, LlmNotConfiguredError } from '../_shared/llm.js';
import { toolDefinitions, runTool } from './tools.js';

const MAX_MESSAGE_LENGTH = 500;
const MAX_TOOL_ROUNDS = 3;
const HISTORY_LIMIT = 10;

// Giới hạn số lần gọi (đếm trong database, xem migration 0007). Đổi bằng `supabase secrets set`.
const LIMITS = {
  perMinute: readLimit('CHAT_LIMIT_PER_MINUTE', 8),       // mỗi người gọi / phút
  perDay: readLimit('CHAT_LIMIT_PER_DAY', 60),            // mỗi người gọi / ngày
  globalPerDay: readLimit('CHAT_LIMIT_GLOBAL_PER_DAY', 1500), // cả hệ thống / ngày: trần chi phí LLM
};

function readLimit(name, fallback) {
  const value = Number.parseInt(Deno.env.get(name) ?? '', 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn của cửa hàng GOM (sản phẩm tái chế và handmade).
- Chỉ trả lời về sản phẩm, đơn hàng, chính sách của GOM. Từ chối lịch sự các chủ đề khác.
- Giá, tồn kho, trạng thái đơn: CHỈ lấy từ kết quả các hàm được cung cấp. Không tự đoán.
- Nếu hàm trả về LOGIN_REQUIRED, đề nghị khách đăng nhập. Nếu NOT_FOUND, nói rõ là không tìm thấy.
- Trả lời ngắn gọn bằng tiếng Việt.`;

const FALLBACK_REPLY =
  'Xin lỗi, trợ lý đang tạm gián đoạn. Bạn có thể tìm sản phẩm ở trang Sản phẩm hoặc xem đơn tại mục Đơn hàng của tôi.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 405);

  const body = await readJson(req);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_LENGTH) return errorResponse('INVALID_MESSAGE');

  const client = createUserClient(req);
  const { data: userData } = await client.auth.getUser();
  const userId = userData?.user?.id ?? null;

  // Chặn lạm dụng TRƯỚC khi đọc lịch sử hay gọi LLM (mỗi lần gọi LLM tốn tiền).
  const quota = await consumeQuota(await getActorKey(req, userId));
  if (quota === 'UNAVAILABLE') {
    // Không kiểm tra được hạn mức thì không gọi LLM (an toàn về chi phí), trả câu xin lỗi chung.
    return json({ reply: FALLBACK_REPLY, conversationId: null, fallback: true });
  }
  if (quota !== 'OK') return errorResponse(quota, 429);   // RATE_LIMITED | DAILY_LIMIT | CHAT_BUSY

  // Lịch sử hội thoại: chỉ cho người đã đăng nhập, RLS bảo đảm chỉ đọc hội thoại của mình
  let conversationId = Number.isInteger(body?.conversationId) ? body.conversationId : null;
  let history = [];
  if (userId && conversationId) {
    const { data, error } = await client
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .in('role', ['USER', 'ASSISTANT'])
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) conversationId = null;            // không thuộc người dùng hoặc lỗi -> bắt đầu mới
    else history = data.reverse().map((m) => ({ role: m.role.toLowerCase(), content: m.content }));
  }

  const messages = [...history, { role: 'user', content: message }];

  let reply;
  let fallback = false;
  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const result = await chat({ system: SYSTEM_PROMPT, messages, tools: toolDefinitions });
      if (result.type === 'text') {
        reply = result.text;
        break;
      }
      const toolResult = await runTool(result.name, result.args, { client, userId });
      messages.push({ role: 'tool', toolName: result.name, content: JSON.stringify(toolResult) });
    }
    if (!reply) throw new Error('TOO_MANY_TOOL_ROUNDS');
  } catch (err) {
    if (!(err instanceof LlmNotConfiguredError)) console.error('chatbot error:', err?.message);
    reply = FALLBACK_REPLY;
    fallback = true;
  }

  if (userId) {
    conversationId = await saveExchange(client, userId, conversationId, message, reply);
  }

  return json({ reply, conversationId, fallback });
});

// Người gọi: user id nếu đã đăng nhập, ngược lại là mã băm của IP (không lưu IP gốc).
// cf-connecting-ip do hạ tầng Supabase đặt, client không giả mạo được; x-forwarded-for chỉ là phương án dự phòng.
async function getActorKey(req, userId) {
  if (userId) return `u:${userId}`;
  const ip = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? 'unknown';
  return `ip:${await sha256Hex(ip)}`;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Trả 'OK' | 'RATE_LIMITED' | 'DAILY_LIMIT' | 'CHAT_BUSY' | 'UNAVAILABLE' (lỗi database)
async function consumeQuota(actorKey) {
  const { data, error } = await createAdminClient().rpc('consume_chat_quota', {
    p_actor: actorKey,
    p_per_minute: LIMITS.perMinute,
    p_per_day: LIMITS.perDay,
    p_global_per_day: LIMITS.globalPerDay,
  });
  if (error) {
    console.error('chat quota failed:', error.message);
    return 'UNAVAILABLE';
  }
  return data;
}

async function saveExchange(client, userId, conversationId, message, reply) {
  let id = conversationId;
  if (!id) {
    const { data, error } = await client
      .from('chat_conversations')
      .insert({ user_id: userId })
      .select('id')
      .single();
    if (error) {
      console.error('save conversation failed:', error.message);
      return null;
    }
    id = data.id;
  }
  const { error } = await client.from('chat_messages').insert([
    { conversation_id: id, role: 'USER', content: message },
    { conversation_id: id, role: 'ASSISTANT', content: reply },
  ]);
  if (error) console.error('save messages failed:', error.message);
  return id;
}
