import { el } from '../../lib/dom.js';
import { SITE } from '../../config/site.js';

export function Footer() {
  const { email, phone, address } = SITE.contact;
  const contactLines = [
    email ? el('a', { className: 'hover:underline', text: email, attrs: { href: `mailto:${email}` } }) : null,
    phone ? el('a', { className: 'hover:underline', text: phone, attrs: { href: `tel:${phone.replace(/\s/g, '')}` } }) : null,
    address ? el('span', { text: address }) : null,
  ].filter(Boolean);

  return el('footer', { className: 'mt-16 border-t border-cream-200 bg-cream-100' }, [
    el('div', { className: 'page-container flex flex-col gap-2 py-8 text-sm text-stone-600 sm:flex-row sm:justify-between' }, [
      el('div', {}, [
        el('p', { className: 'font-semibold text-brand-700', text: SITE.name }),
        el('p', { text: SITE.tagline }),
      ]),
      contactLines.length > 0 ? el('div', { className: 'flex flex-col gap-1' }, contactLines) : null,
    ]),
  ]);
}
