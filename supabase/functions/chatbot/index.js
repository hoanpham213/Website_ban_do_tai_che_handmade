// Edge Function: chatbot AI tư vấn
// POST { message: string, conversationId?: number }
// Trả về { reply: string, conversationId?: number, fallback?: boolean }

import { corsHeaders, json, errorResponse, readJson } from '../_shared/http.js';
import { createUserClient } from '../_shared/supabase.js';
import { chat, LlmNotConfiguredError } from '../_shared/llm.js';
import { toolDefinitions, runTool } from './tools.js';

const MAX_MESSAGE_LENGTH = 500;
const MAX_TOOL_ROUNDS = 3;
const HISTORY_LIMIT = 10;

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
