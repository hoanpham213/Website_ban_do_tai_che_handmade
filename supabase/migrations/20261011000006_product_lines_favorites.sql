-- =====================================================================
-- GOM – 0006: Phân loại Tái chế / Handmade và danh sách Yêu thích
-- * Một sản phẩm có thể vừa tái chế vừa handmade -> 2 cờ riêng,
--   bắt buộc bật ít nhất 1 cờ (admin phải chọn khi tạo sản phẩm).
-- * search_products thêm tham số p_line và trả về 2 cờ để hiện nhãn.
--   Đổi danh sách tham số nên phải DROP hàm cũ (tránh 2 phiên bản song song).
-- * favorites: mỗi người chỉ đọc/thêm/xóa của mình; chỉ thêm được sản phẩm ACTIVE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cờ phân loại sản phẩm
-- ---------------------------------------------------------------------
alter table public.products
  add column is_recycled boolean not null default false,
  add column is_handmade boolean not null default false,
  add constraint products_line_check check (is_recycled or is_handmade);

-- ---------------------------------------------------------------------
-- 2. Hàm tìm kiếm: thêm bộ lọc theo dòng sản phẩm
-- p_line: null = tất cả, 'recycled' = tái chế, 'handmade' = handmade
-- ---------------------------------------------------------------------
drop function if exists public.search_products(bigint, text, numeric, numeric, bigint[], bigint[], text, integer, integer);

create function public.search_products(
  p_category_id   bigint   default null,
  p_keyword       text     default null,
  p_min_price     numeric  default null,
  p_max_price     numeric  default null,
  p_material_ids  bigint[] default null,
  p_option_ids    bigint[] default null,
  p_sort          text     default 'newest',
  p_limit         integer  default 12,
  p_offset        integer  default 0,
  p_line          text     default null
) returns table (
  id bigint, name text, slug text, price numeric, sale_type text,
  category_id bigint, is_recycled boolean, is_handmade boolean,
  image_path text, available integer, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with selected as (
    select ao.attribute_id, ao.id as option_id
    from public.attribute_options ao
    where p_option_ids is not null and ao.id = any (p_option_ids)
  ),
  filtered as (
    select p.*
    from public.products p
    where p.status = 'ACTIVE'
      and (p_line is null
           or (p_line = 'recycled' and p.is_recycled)
           or (p_line = 'handmade' and p.is_handmade))
      and (p_category_id is null or p.category_id = p_category_id)
      and (p_keyword is null or p_keyword = '' or p.name ilike '%' || p_keyword || '%')
      and (p_min_price is null or p.price >= p_min_price)
      and (p_max_price is null or p.price <= p_max_price)
      and (p_material_ids is null or exists (
            select 1 from public.product_materials pm
            where pm.product_id = p.id and pm.material_id = any (p_material_ids)))
      and not exists (
            select 1 from (select distinct s.attribute_id from selected s) a
            where not exists (
              select 1 from public.product_attribute_values v
              join selected s2 on s2.option_id = v.option_id
              where v.product_id = p.id and v.attribute_id = a.attribute_id))
  )
  select f.id, f.name, f.slug, f.price, f.sale_type, f.category_id, f.is_recycled, f.is_handmade,
         (select i.storage_path from public.product_images i
           where i.product_id = f.id order by i.is_primary desc, i.sort_order limit 1),
         coalesce((select inv.on_hand - inv.reserved from public.inventories inv where inv.product_id = f.id), 0),
         count(*) over ()
  from filtered f
  order by
    case when p_sort = 'price_asc'  then f.price end asc,
    case when p_sort = 'price_desc' then f.price end desc,
    f.created_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 48)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
grant execute on function public.search_products(bigint, text, numeric, numeric, bigint[], bigint[], text, integer, integer, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Danh sách yêu thích
-- ---------------------------------------------------------------------
create table public.favorites (
  user_id    uuid   not null default auth.uid() references public.profiles (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index favorites_product_idx on public.favorites (product_id);

alter table public.favorites enable row level security;

create policy "favorites: read own" on public.favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites: insert own active product" on public.favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.products p where p.id = product_id and p.status = 'ACTIVE')
  );

create policy "favorites: delete own" on public.favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Không có thao tác sửa; khách chưa đăng nhập không có quyền gì
revoke all on public.favorites from anon;
revoke update on public.favorites from authenticated;
