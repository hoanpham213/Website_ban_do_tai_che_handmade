// Gửi tin nhắn tới Edge Function chatbot. API key của LLM nằm ở server, không ở đây.
import { supabase } from '../lib/supabase.js';
import { CHAT_MAX_LENGTH } from '../config/constants.js';

export async function sendChatMessage(message, conversationId = null) {
  const text = message.trim();
  if (!text || text.length > CHAT_MAX_LENGTH) throw new Error('INVALID_MESSAGE');
  const { data, error } = await supabase.functions.invoke('chatbot', {
    body: { message: text, conversationId },
  });
  if (error) {
    // Function trả mã lỗi dạng { error: 'RATE_LIMITED' }; đổi thành Error(mã) để toUserMessage dịch ra tiếng Việt.
    const code = await readErrorCode(error);
    throw code ? new Error(code) : error;
  }
  return data; // { reply, conversationId, fallback }
}

async function readErrorCode(error) {
  if (typeof error.context?.json !== 'function') return null;
  try {
    return (await error.context.json())?.error ?? null;
  } catch (parseError) {
    console.error(parseError);
    return null;
  }
}
