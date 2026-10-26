import { initPage, PageHeading } from '../../app.js';
import { render } from '../../lib/dom.js';
import { EmptyState } from '../../components/common/States.js';

// KHUNG TRANG – chưa triển khai.
// Gợi ý: Dùng admin.listUsers, setUserStatus.

initPage({
  title: 'Người dùng',
  access: 'admin',
  render: (main) => {
    render(main, PageHeading('Người dùng'), EmptyState({ title: 'Trang đang được xây dựng' }));
  },
});
