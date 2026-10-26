import { initPage, PageHeading } from '../../app.js';
import { render } from '../../lib/dom.js';
import { EmptyState } from '../../components/common/States.js';

// KHUNG TRANG – chưa triển khai.
// Gợi ý: Dùng admin.getDashboardStats.

initPage({
  title: 'Tổng quan',
  access: 'admin',
  render: (main) => {
    render(main, PageHeading('Tổng quan'), EmptyState({ title: 'Trang đang được xây dựng' }));
  },
});
