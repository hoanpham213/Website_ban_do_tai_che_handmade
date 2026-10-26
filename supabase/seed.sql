-- =====================================================================
-- GOM – Dữ liệu khởi tạo (danh mục, thuộc tính, vật liệu, cấu hình)
-- KHÔNG tạo tài khoản admin mặc định. Cách cấp quyền admin: xem README.
-- Nội dung FAQ/chính sách là bản nháp, cần thay bằng chính sách thật.
-- =====================================================================

insert into public.store_settings (id, shipping_fee, payment_timeout_minutes, auto_complete_days)
values (1, 30000, 15, 3)
on conflict (id) do nothing;

insert into public.categories (name, slug, sort_order) values
  ('Túi tái chế',    'tui-tai-che',    1),
  ('Đồ trang trí',   'do-trang-tri',   2),
  ('Đồ dùng gia đình', 'do-dung-gia-dinh', 3)
on conflict (slug) do nothing;

insert into public.attributes (code, name, data_type, is_multi_value) values
  ('color',     'Màu sắc',    'SELECT', true),
  ('style',     'Phong cách', 'SELECT', false),
  ('size',      'Kích thước', 'SELECT', false),
  ('condition', 'Tình trạng', 'SELECT', false)
on conflict (code) do nothing;

insert into public.attribute_options (attribute_id, value, sort_order)
select a.id, v.value, v.sort_order
from public.attributes a
join (values
  ('color', 'Xanh lá', 1), ('color', 'Nâu', 2), ('color', 'Kem', 3), ('color', 'Xanh dương', 4), ('color', 'Nhiều màu', 5),
  ('style', 'Tối giản', 1), ('style', 'Vintage', 2), ('style', 'Mộc mạc', 3), ('style', 'Hiện đại', 4),
  ('size', 'Nhỏ', 1), ('size', 'Vừa', 2), ('size', 'Lớn', 3),
  ('condition', 'Mới làm', 1), ('condition', 'Tái sử dụng – còn tốt', 2)
) as v(code, value, sort_order) on v.code = a.code
on conflict (attribute_id, value) do nothing;

insert into public.category_attributes (category_id, attribute_id, is_required, is_filterable, sort_order)
select c.id, a.id, v.is_required, true, v.sort_order
from (values
  ('tui-tai-che',      'color', true, 1), ('tui-tai-che',      'style', false, 2), ('tui-tai-che',      'size', true, 3),
  ('do-trang-tri',     'color', false, 1), ('do-trang-tri',    'style', true, 2), ('do-trang-tri',     'size', true, 3),
  ('do-trang-tri',     'condition', true, 4),
  ('do-dung-gia-dinh', 'color', false, 1), ('do-dung-gia-dinh', 'size', true, 2), ('do-dung-gia-dinh', 'condition', true, 3)
) as v(category_slug, attribute_code, is_required, sort_order)
join public.categories c on c.slug = v.category_slug
join public.attributes a on a.code = v.attribute_code
on conflict (category_id, attribute_id) do nothing;

insert into public.materials (name) values
  ('Vải jean cũ'), ('Nhựa PET'), ('Gỗ pallet'), ('Giấy tái chế'), ('Vải vụn'), ('Thủy tinh')
on conflict (name) do nothing;

insert into public.knowledge_entries (type, title, content, sort_order) values
  ('POLICY', 'Chính sách giao hàng', '[Cần cập nhật] Phí giao hàng, khu vực và thời gian giao dự kiến.', 1),
  ('POLICY', 'Chính sách thanh toán', '[Cần cập nhật] Các phương thức thanh toán được chấp nhận.', 2),
  ('POLICY', 'Chính sách hủy đơn', '[Cần cập nhật] Khách được hủy khi đơn chưa được đóng gói.', 3),
  ('FAQ', 'Sản phẩm độc bản là gì?', 'Là sản phẩm chỉ có duy nhất một chiếc. Khi đã có người đặt, sản phẩm sẽ không còn mua được.', 1),
  ('FAQ', 'Bảo quản đồ làm từ vải tái chế thế nào?', '[Cần cập nhật] Hướng dẫn giặt và bảo quản.', 2);
