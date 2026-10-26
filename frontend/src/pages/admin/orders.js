import { initPage, PageHeading } from '../../app.js';
import { render } from '../../lib/dom.js';
import { EmptyState } from '../../components/common/States.js';

// KHUNG TRANG – chưa triển khai.
// Gợi ý: Dùng admin.listOrders, updateOrderStatus, markRefunded.

initPage({
  title: 'Quản lý đơn hàng',
  access: 'admin',
  render: (main) => {
    render(main, PageHeading('Quản lý đơn hàng'), EmptyState({ title: 'Trang đang được xây dựng' }));
  },
});
