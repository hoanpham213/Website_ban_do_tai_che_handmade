// Gửi tin nhắn tới Edge Function chatbot. API key của LLM nằm ở server, không ở đây.
import { supabase } from '../lib/supabase.js';
import { CHAT_MAX_LENGTH } from '../config/constants.js';

export async function sendChatMessage(message, conversationId = null) {
  const text = message.trim();
  if (!text || text.length > CHAT_MAX_LENGTH) throw new Error('INVALID_MESSAGE');
  const { data, error } = await supabase.functions.invoke('chatbot', {
    body: { message: text, conversationId },
  });
  if (error) throw error;
  return data; // { reply, conversationId, fallback }
}
