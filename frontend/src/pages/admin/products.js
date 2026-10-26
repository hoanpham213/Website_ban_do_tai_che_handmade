import { initPage, PageHeading } from '../../app.js';
import { render } from '../../lib/dom.js';
import { EmptyState } from '../../components/common/States.js';

// KHUNG TRANG – chưa triển khai.
// Gợi ý: Ghi trực tiếp products, product_attribute_values, product_materials, product_images (RLS chỉ cho admin). Ảnh: admin.uploadProductImage. Sản phẩm mới luôn lưu DRAFT trước.

initPage({
  title: 'Quản lý sản phẩm',
  access: 'admin',
  render: (main) => {
    render(main, PageHeading('Quản lý sản phẩm'), EmptyState({ title: 'Trang đang được xây dựng' }));
  },
});
