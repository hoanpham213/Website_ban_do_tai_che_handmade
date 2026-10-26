import { initPage, PageHeading } from '../app.js';
import { el, render } from '../lib/dom.js';
import { SITE } from '../config/site.js';
import { PRODUCT_LINES } from '../config/constants.js';
import { ButtonLink } from '../components/ui/Button.js';

// Nội dung lấy từ config/site.js để sửa một chỗ là đổi cả trang chủ lẫn trang này.

initPage({
  title: 'Giới thiệu',
  render: (main) => {
    const { mission, values } = SITE.about;
    const { email, phone, address } = SITE.contact;
    const contacts = [
      email ? ['Email', email] : null,
      phone ? ['Điện thoại', phone] : null,
      address ? ['Địa chỉ', address] : null,
    ].filter(Boolean);

    render(main, el('div', { className: 'mx-auto max-w-3xl space-y-10' }, [
      el('section', {}, [
        PageHeading(`Về ${SITE.name}`, SITE.tagline),
        el('p', { className: 'text-lg leading-relaxed text-stone-700', text: mission }),
      ]),

      el('section', {}, [
        el('h2', { className: 'mb-4 text-xl font-semibold text-stone-900', text: 'Điều chúng tôi theo đuổi' }),
        el('ul', { className: 'grid gap-4 sm:grid-cols-3' }, values.map((value) => el('li', {
          className: 'rounded-xl bg-white p-4 shadow-sm ring-1 ring-cream-200',
        }, [
          el('h3', { className: 'font-semibold text-brand-700', text: value.title }),
          el('p', { className: 'mt-1 text-sm text-stone-600', text: value.text }),
        ]))),
      ]),

      el('section', { className: 'rounded-xl bg-brand-100 p-6' }, [
        el('h2', { className: 'text-xl font-semibold text-brand-800', text: 'Khám phá sản phẩm' }),
        el('div', { className: 'mt-4 flex flex-col gap-3 sm:flex-row' },
          Object.entries(PRODUCT_LINES).map(([key, line]) =>
            ButtonLink({ label: line.label, href: `/products.html?line=${key}`, variant: 'secondary' }))),
      ]),

      contacts.length > 0
        ? el('section', {}, [
            el('h2', { className: 'mb-3 text-xl font-semibold text-stone-900', text: 'Liên hệ' }),
            el('dl', { className: 'space-y-1 text-stone-700' }, contacts.map(([term, value]) => el('div', { className: 'flex gap-2' }, [
              el('dt', { className: 'font-medium', text: `${term}:` }),
              el('dd', { text: value }),
            ]))),
          ])
        : null,
    ]));
  },
});
