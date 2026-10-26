import { el } from '../../lib/dom.js';
import { sendChatMessage } from '../../services/chatbot.js';
import { toUserMessage } from '../../lib/errors.js';
import { CHAT_MAX_LENGTH } from '../../config/constants.js';

/** Nút chat nổi + khung hội thoại. Nội dung tin nhắn luôn hiển thị bằng textContent. */
export function ChatWidget() {
  let conversationId = null;
  let sending = false;

  const messages = el('div', { className: 'flex-1 space-y-2 overflow-y-auto p-3 text-sm', attrs: { 'aria-live': 'polite' } }, [
    bubble('assistant', 'Xin chào! Bạn cần tìm sản phẩm hay hỏi về đơn hàng?'),
  ]);
  const input = el('input', {
    className: 'min-h-11 flex-1 rounded-lg border border-stone-300 px-3 text-base',
    attrs: { type: 'text', maxlength: CHAT_MAX_LENGTH, placeholder: 'Nhập câu hỏi...', 'aria-label': 'Câu hỏi' },
  });
  const sendButton = el('button', {
    className: 'min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white disabled:opacity-60',
    text: 'Gửi',
    attrs: { type: 'submit' },
  });

  const form = el('form', { className: 'flex gap-2 border-t border-cream-200 p-3', on: { submit: onSubmit } }, [input, sendButton]);
  const panel = el('section', {
    className: 'fixed inset-x-2 bottom-20 z-50 hidden h-[70vh] flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-cream-200 sm:inset-x-auto sm:right-4 sm:w-96',
    attrs: { id: 'chat-panel', 'aria-label': 'Trợ lý GOM' },
  }, [
    el('header', { className: 'bg-brand-700 px-4 py-3 text-sm font-semibold text-white', text: 'Trợ lý GOM' }),
    messages,
    form,
  ]);
  const toggle = el('button', {
    className: 'fixed bottom-4 right-4 z-50 min-h-12 rounded-full bg-brand-700 px-5 text-sm font-semibold text-white shadow-lg',
    text: 'Hỏi GOM',
    attrs: { type: 'button', 'aria-controls': 'chat-panel', 'aria-expanded': 'false' },
    on: {
      click: () => {
        const open = panel.classList.toggle('hidden') === false;
        panel.classList.toggle('flex', open);
        toggle.setAttribute('aria-expanded', String(open));
        if (open) input.focus();
      },
    },
  });

  async function onSubmit(event) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;
    sending = true;
    sendButton.disabled = true;
    messages.append(bubble('user', text));
    input.value = '';
    try {
      const result = await sendChatMessage(text, conversationId);
      conversationId = result.conversationId ?? conversationId;
      messages.append(bubble('assistant', result.reply));
    } catch (error) {
      messages.append(bubble('error', toUserMessage(error)));
    } finally {
      sending = false;
      sendButton.disabled = false;
      messages.scrollTop = messages.scrollHeight;
    }
  }

  return el('div', {}, [panel, toggle]);
}

function bubble(role, text) {
  const styles = {
    user: 'ml-auto bg-brand-100 text-stone-800',
    assistant: 'bg-cream-100 text-stone-800',
    error: 'bg-red-50 text-red-800',
  };
  return el('p', { className: `max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 ${styles[role]}`, text });
}
