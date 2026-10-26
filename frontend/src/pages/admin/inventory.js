import { initPage, PageHeading } from '../../app.js';
import { render } from '../../lib/dom.js';
import { EmptyState } from '../../components/common/States.js';

// KHUNG TRANG – chưa triển khai.
// Gợi ý: Dùng admin.adjustStock (IMPORT/ADJUST); lịch sử ở inventory_transactions.

initPage({
  title: 'Tồn kho',
  access: 'admin',
  render: (main) => {
    render(main, PageHeading('Tồn kho'), EmptyState({ title: 'Trang đang được xây dựng' }));
  },
});
