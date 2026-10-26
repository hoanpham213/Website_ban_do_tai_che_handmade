import { initPage, PageHeading } from '../../app.js';
import { render } from '../../lib/dom.js';
import { EmptyState } from '../../components/common/States.js';

// KHUNG TRANG – chưa triển khai.
// Gợi ý: Bảng knowledge_entries (chatbot đọc các mục đang bật).

initPage({
  title: 'FAQ và chính sách',
  access: 'admin',
  render: (main) => {
    render(main, PageHeading('FAQ và chính sách'), EmptyState({ title: 'Trang đang được xây dựng' }));
  },
});
