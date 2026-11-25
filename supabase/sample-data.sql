-- =====================================================================
-- GOM – DỮ LIỆU MẪU để xem giao diện (14 sản phẩm: Giấy, Thủy tinh, Gỗ, Nhựa, Vải)
-- Chạy SAU khi đã chạy GOM_setup_full.sql (cần seed.sql: danh mục, thuộc tính, vật liệu).
-- Chạy trong SQL Editor, quyền chủ dự án. Chạy lại nhiều lần vẫn an toàn (bỏ qua slug đã có).
--
-- * Mọi mô tả bắt đầu bằng "[Mẫu]" để không nhầm với nội dung thật. Tên, giá, câu chuyện chỉ là ví dụ.
-- * Ảnh: mỗi sản phẩm trỏ tới đường dẫn  sample/<slug>.png  trong bucket product-images.
--   Phải TẢI ẢNH LÊN (xem GOM_anh_mau.zip): Storage → product-images → Upload folder "sample".
--   Chưa tải ảnh thì sản phẩm vẫn hiện nhưng ảnh bị trống.
-- * Làm đúng luồng của hệ thống: tạo DRAFT → thêm thuộc tính, vật liệu, ảnh, tồn kho → chuyển ACTIVE
--   (trigger kiểm tra đủ thuộc tính bắt buộc và có ảnh).
-- =====================================================================

do $$
declare
  p    record;
  v_id bigint;
begin
  for p in
    select * from (values
      -- slug, tên, danh mục, giá, loại bán, tái chế, handmade, vật liệu 1, gram 1, vật liệu 2, gram 2,
      -- tồn, màu, phong cách, kích thước, tình trạng, mô tả, câu chuyện
      ('so-tay-bia-giay-tai-che', 'Sổ tay bìa giấy tái chế', 'do-dung-gia-dinh', 85000, 'STOCK', true, true,
        'Giấy tái chế', 120, null, null, 12, 'Nâu', null, 'Vừa', 'Mới làm',
        'Sổ tay khâu tay, bìa làm từ giấy bìa cứng đã qua sử dụng, ruột giấy kem.',
        'Bìa sổ được gom từ thùng giấy của các cửa hàng nhỏ, cắt, ép và khâu tay.'),
      ('hop-dung-but-giay-bao', 'Hộp đựng bút cuộn từ giấy báo', 'do-trang-tri', 65000, 'STOCK', true, true,
        'Giấy tái chế', 150, null, null, 20, 'Kem', 'Mộc mạc', 'Nhỏ', 'Mới làm',
        'Hộp đựng bút cuộn tay từ giấy báo cũ, phủ lớp keo bóng chống ẩm.',
        'Mỗi hộp là khoảng 40 trang báo cũ được cuộn thành ống rồi xếp lại thành thân hộp.'),
      ('tranh-giay-cuon-la-xanh', 'Tranh giấy cuộn lá xanh', 'do-trang-tri', 320000, 'UNIQUE', true, true,
        'Giấy tái chế', 200, null, null, 1, 'Xanh lá', 'Hiện đại', 'Lớn', 'Mới làm',
        'Tranh treo tường kỹ thuật giấy cuộn, khung gỗ nhẹ. Chỉ có một chiếc.',
        'Tranh làm từ giấy tạp chí cũ, chọn những mảng màu xanh để cuộn từng dải nhỏ.'),

      ('binh-hoa-chai-thuy-tinh', 'Bình cắm hoa từ chai thủy tinh', 'do-trang-tri', 120000, 'STOCK', true, false,
        'Thủy tinh', 450, null, null, 15, 'Xanh lá', 'Tối giản', 'Vừa', 'Tái sử dụng – còn tốt',
        'Chai thủy tinh được làm sạch, mài miệng an toàn, dùng cắm hoa khô hoặc hoa tươi.',
        'Chai được thu gom từ quán cà phê, rửa sạch và mài nhẵn miệng chai.'),
      ('den-hu-thuy-tinh-vintage', 'Đèn hũ thủy tinh phong cách vintage', 'do-trang-tri', 180000, 'UNIQUE', true, true,
        'Thủy tinh', 520, null, null, 1, 'Kem', 'Vintage', 'Vừa', 'Tái sử dụng – còn tốt',
        'Hũ thủy tinh cũ gắn dây đèn ánh vàng ấm. Chỉ có một chiếc.',
        'Hũ được lấy từ một tiệm tạp hóa cũ, giữ nguyên nhãn in nổi trên thân.'),
      ('bo-2-coc-chai-cat', 'Bộ 2 cốc làm từ chai thủy tinh cắt', 'do-dung-gia-dinh', 150000, 'STOCK', true, true,
        'Thủy tinh', 600, null, null, 10, null, null, 'Nhỏ', 'Mới làm',
        'Hai chiếc cốc cắt từ đáy chai, mài nhẵn miệng cốc.',
        'Phần đáy chai chắc và dày, rất hợp làm cốc uống nước.'),

      ('khay-go-pallet-da-nang', 'Khay gỗ pallet đa năng', 'do-dung-gia-dinh', 220000, 'STOCK', true, true,
        'Gỗ pallet', 1200, null, null, 8, 'Nâu', null, 'Vừa', 'Mới làm',
        'Khay đựng đồ có hai quai cầm, bào nhẵn và phủ dầu bảo vệ gỗ.',
        'Gỗ lấy từ pallet vận chuyển đã qua sử dụng, được xử lý và bào nhẵn.'),
      ('ke-treo-tuong-go-pallet', 'Kệ treo tường gỗ pallet', 'do-trang-tri', 350000, 'UNIQUE', true, true,
        'Gỗ pallet', 2500, null, null, 1, 'Nâu', 'Mộc mạc', 'Lớn', 'Mới làm',
        'Kệ hai tầng treo tường, giữ vân gỗ tự nhiên. Chỉ có một chiếc.',
        'Các thanh gỗ được chọn theo vân và màu, ghép lại không dùng đinh lộ ra ngoài.'),
      ('gia-de-dien-thoai-go', 'Giá để điện thoại bằng gỗ', 'do-dung-gia-dinh', 75000, 'STOCK', true, true,
        'Gỗ pallet', 180, null, null, 25, 'Nâu', null, 'Nhỏ', 'Mới làm',
        'Giá đỡ điện thoại và máy tính bảng nhỏ gọn, đế chống trượt.',
        'Làm từ phần gỗ thừa khi cắt pallet, tận dụng gần như toàn bộ vật liệu.'),

      ('tui-deo-chai-pet-det', 'Túi đeo dệt từ vỏ chai PET', 'tui-tai-che', 195000, 'STOCK', true, true,
        'Nhựa PET', 280, 'Vải vụn', 40, 9, 'Xanh dương', 'Hiện đại', 'Vừa', null,
        'Túi đeo chéo dệt từ sợi nhựa PET, lót vải vụn, có khóa kéo.',
        'Vỏ chai được cắt thành sợi, dệt tay thành tấm rồi may thành túi.'),
      ('chau-cay-chai-nhua-pet', 'Chậu cây từ chai nhựa PET', 'do-trang-tri', 55000, 'STOCK', true, true,
        'Nhựa PET', 80, null, null, 30, 'Xanh lá', 'Hiện đại', 'Nhỏ', 'Mới làm',
        'Chậu mini có lỗ thoát nước, phù hợp sen đá và cây để bàn.',
        'Chai nước được cắt, sơn phủ lớp bền màu và khoan lỗ thoát nước.'),
      ('vi-cam-tay-nhua-ep-nhiet', 'Ví cầm tay nhựa PET ép nhiệt', 'tui-tai-che', 140000, 'UNIQUE', true, true,
        'Nhựa PET', 90, null, null, 1, 'Nhiều màu', 'Hiện đại', 'Nhỏ', null,
        'Ví cầm tay từ túi nilon nhiều màu ép nhiệt thành tấm. Chỉ có một chiếc.',
        'Các mảng màu từ túi nilon được xếp lớp và ép nhiệt, nên không chiếc nào giống chiếc nào.'),

      ('tui-tote-vai-jean-cu', 'Túi tote vải jean cũ', 'tui-tai-che', 230000, 'STOCK', true, true,
        'Vải jean cũ', 350, null, null, 6, 'Xanh dương', 'Mộc mạc', 'Lớn', null,
        'Túi tote may từ quần jean cũ, giữ lại túi và đường chỉ nổi gốc.',
        'Mỗi chiếc dùng hai ống quần jean đã sờn, giặt sạch và cắt may thủ công.'),
      ('goi-trang-tri-vai-vun', 'Gối trang trí ghép từ vải vụn', 'do-trang-tri', 160000, 'STOCK', true, true,
        'Vải vụn', 250, null, null, 7, 'Nhiều màu', 'Vintage', 'Vừa', 'Mới làm',
        'Vỏ gối ghép patchwork từ vải vụn, ruột bông, có khóa tháo giặt.',
        'Các mảnh vải thừa từ tiệm may được ghép thành họa tiết patchwork.')
    ) as t(slug, name, cat, price, sale, rec, hand, mat1, g1, mat2, g2, stock, color, style, size, cond, descr, story)
  loop
    insert into public.products (category_id, name, slug, description, origin_story, price, sale_type, is_recycled, is_handmade)
    select c.id, p.name, p.slug, '[Mẫu] ' || p.descr, p.story, p.price, p.sale, p.rec, p.hand
    from public.categories c where c.slug = p.cat
    on conflict (slug) do nothing
    returning id into v_id;

    if v_id is null then continue; end if;   -- đã có từ lần chạy trước

    insert into public.product_attribute_values (product_id, attribute_id, option_id)
    select v_id, ao.attribute_id, ao.id
    from public.attribute_options ao
    join public.attributes a on a.id = ao.attribute_id
    where (a.code, ao.value) in (('color', p.color), ('style', p.style), ('size', p.size), ('condition', p.cond));

    insert into public.product_materials (product_id, material_id, weight_grams)
    select v_id, m.id, x.grams
    from (values (p.mat1, p.g1), (p.mat2, p.g2)) as x(mat, grams)
    join public.materials m on m.name = x.mat
    where x.mat is not null;

    insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary)
    values (v_id, 'sample/' || p.slug || '.png', p.name, 0, true);

    update public.inventories set on_hand = p.stock where product_id = v_id;
    insert into public.inventory_transactions (product_id, type, quantity, note)
    values (v_id, 'IMPORT', p.stock, 'Dữ liệu mẫu');

    update public.products set status = 'ACTIVE' where id = v_id;
  end loop;
end;
$$;

-- Kiểm tra nhanh sau khi chạy: phải ra 14 dòng, mọi dòng status = ACTIVE
-- select p.name, p.status, p.price, i.on_hand from public.products p
--   join public.inventories i on i.product_id = p.id where p.description like '[Mẫu]%' order by p.id;

-- Muốn xóa dữ liệu mẫu (CHỈ khi chưa có đơn hàng nào chứa các sản phẩm này):
-- delete from public.products where description like '[Mẫu]%';
