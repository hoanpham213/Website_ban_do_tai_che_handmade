import { initPage, PageHeading } from '../../app.js';
import { render } from '../../lib/dom.js';
import { EmptyState } from '../../components/common/States.js';

// KHUNG TRANG – chưa triển khai.
// Gợi ý: Bảng categories, attributes, attribute_options, category_attributes.

initPage({
  title: 'Danh mục và thuộc tính',
  access: 'admin',
  render: (main) => {
    render(main, PageHeading('Danh mục và thuộc tính'), EmptyState({ title: 'Trang đang được xây dựng' }));
  },
});
