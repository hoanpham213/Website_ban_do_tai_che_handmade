// Lớp trung gian gọi mô hình ngôn ngữ (LLM).
// Mục đích: đổi nhà cung cấp (Gemini, OpenAI, Ollama...) chỉ cần sửa file này.
//
// Biến môi trường (đặt bằng `supabase secrets set`, KHÔNG đưa vào frontend):
//   LLM_PROVIDER  – tên nhà cung cấp (CẦN QUYẾT ĐỊNH)
//   LLM_API_KEY   – khóa API
//   LLM_MODEL     – tên model
//
// Hợp đồng của hàm chat():
//   input:  { system, messages: [{ role: 'user'|'assistant'|'tool', content, toolName? }], tools }
//   output: { type: 'text', text } hoặc { type: 'tool_call', name, args }

export class LlmNotConfiguredError extends Error {}

export async function chat({ system, messages, tools }) {
  const provider = Deno.env.get('LLM_PROVIDER');
  const apiKey = Deno.env.get('LLM_API_KEY');
  if (!provider || !apiKey) {
    throw new LlmNotConfiguredError('LLM_NOT_CONFIGURED');
  }

  // TODO: cài đặt lời gọi API cho nhà cung cấp đã chọn.
  // Yêu cầu khi cài đặt:
  //   - đặt timeout (ví dụ 15 giây) để chatbot không treo
  //   - chuyển `tools` sang định dạng function calling của nhà cung cấp
  //   - không ghi apiKey vào log
  void system;
  void messages;
  void tools;
  throw new LlmNotConfiguredError(`LLM_PROVIDER_NOT_IMPLEMENTED:${provider}`);
}
