import { el, render } from '../../lib/dom.js';
import { SITE } from '../../config/site.js';
import { EVENTS, emit } from '../../lib/events.js';
import { getFaqEntries } from '../../services/knowledge.js';
import { Icon } from '../ui/Icon.js';
import { Button } from '../ui/Button.js';
import { LoadingSkeleton } from '../common/States.js';

/** Khu "Hỗ trợ" cuối trang chủ: cam kết (SITE.commitments) → câu hỏi thường gặp → liên hệ. */
export function SupportSection() {
  const faqBody = el('div');
  loadFaq(faqBody);

  return el('section', { className: 'mb-12', attrs: { 'aria-labelledby': 'support-title' } }, [
    el('h2', { className: 'mb-4 text-2xl font-bold text-stone-900 sm:text-3xl', text: 'Vì sao chọn GOM & hỗ trợ', attrs: { id: 'support-title' } }),
    CommitmentStrip(),
    el('div', { className: 'mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]' }, [
      el('div', {}, [
        el('h3', { className: 'mb-2 text-lg font-semibold text-stone-900', text: 'Câu hỏi thường gặp' }),
        faqBody,
      ]),
      ContactCard(),
    ]),
  ]);
}

function CommitmentStrip() {
  return el('ul', { className: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4' },
    SITE.commitments.map((item) => el('li', { className: 'flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-cream-200' }, [
      el('span', { className: 'flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700' }, [
        Icon({ name: item.icon }),
      ]),
      el('div', {}, [
        el('p', { className: 'text-sm font-semibold text-stone-900', text: item.title }),
        el('p', { className: 'mt-0.5 text-sm text-stone-600', text: item.text }),
      ]),
    ])));
}

async function loadFaq(container) {
  render(container, LoadingSkeleton({ variant: 'lines', count: 4 }));
  try {
    const entries = await getFaqEntries();
    if (entries.length === 0) {
      render(container, el('p', { className: 'text-sm text-stone-600', text: 'Chưa có câu hỏi thường gặp. Bạn cứ hỏi trợ lý GOM nhé.' }));
      return;
    }
    render(container, el('div', { className: 'divide-y divide-cream-200 rounded-xl bg-white ring-1 ring-cream-200' },
      entries.map((entry) => el('details', { className: 'group px-4' }, [
        el('summary', { className: 'flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium text-stone-800' }, [
          el('span', { text: entry.title }),
          Icon({ name: 'chevron', className: 'text-xs text-stone-500 transition group-open:rotate-180' }),
        ]),
        el('p', { className: 'whitespace-pre-line pb-3 text-sm text-stone-600', text: entry.content }),
      ]))));
  } catch (error) {
    console.error(error);
    render(container, el('div', { className: 'flex items-center gap-3 text-sm text-stone-600' }, [
      el('span', { text: 'Không tải được câu hỏi thường gặp.' }),
      Button({ label: 'Thử lại', variant: 'secondary', onClick: () => loadFaq(container) }),
    ]));
  }
}

function ContactCard() {
  const { email, phone } = SITE.contact;
  const row = (icon, label, href) => el('a', {
    className: 'flex min-h-11 items-center gap-3 text-sm text-stone-700 hover:text-brand-700',
    attrs: { href },
  }, [Icon({ name: icon, className: 'w-4 text-brand-700' }), el('span', { text: label })]);

  return el('div', { className: 'rounded-xl bg-cream-50 p-5 ring-1 ring-cream-200' }, [
    el('h3', { className: 'text-lg font-semibold text-stone-900', text: 'Cần hỗ trợ?' }),
    el('p', { className: 'mt-1 text-sm text-stone-600', text: 'Hỏi trợ lý GOM về sản phẩm, đơn hàng hoặc chính sách.' }),
    el('div', { className: 'mt-4' }, [
      Button({ label: 'Hỏi trợ lý GOM', onClick: () => emit(EVENTS.OPEN_CHAT) }),
    ]),
    email || phone
      ? el('div', { className: 'mt-4 space-y-1 border-t border-cream-200 pt-3' }, [
          email ? row('mail', email, `mailto:${email}`) : null,
          phone ? row('phone', phone, `tel:${phone.replace(/[^\d+]/g, '')}`) : null,
        ])
      : null,
  ]);
}
