-- =====================================================================
-- GOM – 0003: Row Level Security và quyền cột
-- Nguyên tắc:
--   * Bật RLS cho MỌI bảng. Không có policy = bị chặn.
--   * Khách (anon) chỉ đọc dữ liệu công khai của cửa hàng.
--   * Khách hàng chỉ đọc/ghi dữ liệu của chính mình.
--   * Đơn hàng, thanh toán, tồn kho, nhật ký: client KHÔNG có quyền ghi;
--     mọi thay đổi đi qua hàm RPC ở migration 0004.
--   * Ẩn nút trên giao diện KHÔNG phải là bảo mật; quyền nằm ở đây.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Hàm kiểm tra quyền (security definer để đọc profiles mà không vướng RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'ADMIN' and p.status = 'ACTIVE'
  );
$$;
-- anon cũng cần quyền gọi vì các policy đọc công khai có dùng is_admin();
-- với anon, auth.uid() là null nên hàm luôn trả false.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Bật RLS
-- ---------------------------------------------------------------------
alter table public.store_settings          enable row level security;
alter table public.profiles                enable row level security;
alter table public.addresses               enable row level security;
alter table public.categories              enable row level security;
alter table public.attributes              enable row level security;
alter table public.attribute_options       enable row level security;
alter table public.category_attributes     enable row level security;
alter table public.products                enable row level security;
alter table public.product_attribute_values enable row level security;
alter table public.product_images          enable row level security;
alter table public.materials               enable row level security;
alter table public.product_materials       enable row level security;
alter table public.inventories             enable row level security;
alter table public.inventory_transactions  enable row level security;
alter table public.carts                   enable row level security;
alter table public.cart_items              enable row level security;
alter table public.orders                  enable row level security;
alter table public.order_items             enable row level security;
alter table public.order_status_histories  enable row level security;
alter table public.payments                enable row level security;
alter table public.reviews                 enable row level security;
alter table public.knowledge_entries       enable row level security;
alter table public.chat_conversations      enable row level security;
alter table public.chat_messages           enable row level security;

-- ---------------------------------------------------------------------
-- Cấu hình cửa hàng: ai cũng đọc (phí ship hiển thị ở checkout), admin sửa
-- ---------------------------------------------------------------------
create policy "store_settings: public read" on public.store_settings
  for select to anon, authenticated using (true);
create policy "store_settings: admin update" on public.store_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Hồ sơ: đọc của mình (admin đọc tất cả); chỉ sửa họ tên, SĐT.
-- role, status chỉ đổi qua hàm admin_set_user_status hoặc SQL Editor.
-- ---------------------------------------------------------------------
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Địa chỉ: toàn quyền trên địa chỉ của chính mình
-- ---------------------------------------------------------------------
create policy "addresses: own" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Danh mục, thuộc tính, vật liệu: ai cũng đọc; admin ghi
-- ---------------------------------------------------------------------
create policy "categories: public read active" on public.categories
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "categories: admin write" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "attributes: public read" on public.attributes
  for select to anon, authenticated using (true);
create policy "attributes: admin write" on public.attributes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "attribute_options: public read" on public.attribute_options
  for select to anon, authenticated using (true);
create policy "attribute_options: admin write" on public.attribute_options
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "category_attributes: public read" on public.category_attributes
  for select to anon, authenticated using (true);
create policy "category_attributes: admin write" on public.category_attributes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "materials: public read" on public.materials
  for select to anon, authenticated using (true);
create policy "materials: admin write" on public.materials
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Sản phẩm và dữ liệu con: khách chỉ thấy sản phẩm ACTIVE; admin thấy tất cả
-- ---------------------------------------------------------------------
create policy "products: public read active" on public.products
  for select to anon, authenticated using (status = 'ACTIVE' or (select public.is_admin()));
create policy "products: admin write" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "pav: read with product" on public.product_attribute_values
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'ACTIVE')
    or (select public.is_admin())
  );
create policy "pav: admin write" on public.product_attribute_values
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_images: read with product" on public.product_images
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'ACTIVE')
    or (select public.is_admin())
  );
create policy "product_images: admin write" on public.product_images
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_materials: read with product" on public.product_materials
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'ACTIVE')
    or (select public.is_admin())
  );
create policy "product_materials: admin write" on public.product_materials
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Kho: đọc được để hiển thị còn/hết hàng; KHÔNG ai ghi trực tiếp
-- (kể cả admin – dùng admin_adjust_stock để luôn có nhật ký)
-- ---------------------------------------------------------------------
create policy "inventories: read with product" on public.inventories
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'ACTIVE')
    or (select public.is_admin())
  );
create policy "inventory_transactions: admin read" on public.inventory_transactions
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Giỏ hàng: chỉ của mình. Giỏ được tạo tự động khi đăng ký.
-- ---------------------------------------------------------------------
create policy "carts: read own" on public.carts
  for select to authenticated using (user_id = (select auth.uid()));

create policy "cart_items: own" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------
-- Đơn hàng và dữ liệu con: CHỈ ĐỌC (của mình, hoặc admin)
-- ---------------------------------------------------------------------
create policy "orders: read own or admin" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "order_items: read own or admin" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

create policy "osh: read own or admin" on public.order_status_histories
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

create policy "payments: read own or admin" on public.payments
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );

-- provider_response chứa dữ liệu thô từ cổng thanh toán: khách không cần đọc
revoke select on public.payments from anon, authenticated;
grant select (id, order_id, method, provider, amount, status, transaction_ref, paid_at, refunded_at, created_at, updated_at)
  on public.payments to authenticated;

-- ---------------------------------------------------------------------
-- Đánh giá: tạo khi đã mua và đã nhận hàng; admin ẩn/hiện.
-- Trang sản phẩm đọc qua hàm get_product_reviews (0004).
-- ---------------------------------------------------------------------
create policy "reviews: read own or admin" on public.reviews
  for select to authenticated using (
    exists (
      select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id and o.user_id = (select auth.uid())
    )
    or (select public.is_admin())
  );
create policy "reviews: insert if purchased" on public.reviews
  for insert to authenticated with check (
    exists (
      select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
      where oi.id = order_item_id
        and o.user_id = (select auth.uid())
        and o.status in ('DELIVERED','COMPLETED')
    )
  );
create policy "reviews: admin update" on public.reviews
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke insert, update, delete on public.reviews from anon, authenticated;
grant insert (order_item_id, rating, comment) on public.reviews to authenticated;
grant update (is_visible) on public.reviews to authenticated;   -- policy chỉ cho admin

-- ---------------------------------------------------------------------
-- FAQ, chính sách: ai cũng đọc mục đang bật; admin ghi
-- ---------------------------------------------------------------------
create policy "knowledge: public read active" on public.knowledge_entries
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "knowledge: admin write" on public.knowledge_entries
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Lịch sử chat: chỉ của mình (Edge Function chatbot ghi bằng phiên của người dùng)
-- ---------------------------------------------------------------------
create policy "chat_conversations: own" on public.chat_conversations
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "chat_messages: own" on public.chat_messages
  for all to authenticated
  using (exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));
