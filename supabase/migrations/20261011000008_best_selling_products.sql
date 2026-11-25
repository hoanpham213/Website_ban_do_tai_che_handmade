-- =====================================================================
-- GOM – 0008: Sản phẩm bán chạy cho trang chủ
-- * Khách vãng lai không đọc được order_items (RLS), nên cần hàm security definer
--   để tổng hợp doanh số. Hàm chỉ trả thông tin sản phẩm ACTIVE, KHÔNG trả số đã bán
--   và không lộ thông tin đơn hàng hay người mua.
-- * "Đã bán" tính cùng cách với admin_dashboard_stats: đơn ở trạng thái
--   SHIPPING, DELIVERED hoặc COMPLETED.
-- * Sắp xếp: số lượng đã bán giảm dần, bằng nhau thì sản phẩm mới hơn trước.
--   Khi chưa có đơn nào, kết quả giống "mới nhất" cho tới khi có dữ liệu bán hàng thật.
-- * Các cột trả về giống search_products (trừ total_count) để dùng chung ProductCard.
-- =====================================================================

create or replace function public.get_best_selling_products(p_limit integer default 4)
returns table (
  id bigint, name text, slug text, price numeric, sale_type text,
  category_id bigint, is_recycled boolean, is_handmade boolean,
  image_path text, available integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with sold as (
    select oi.product_id, sum(oi.quantity) as units
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status in ('SHIPPING', 'DELIVERED', 'COMPLETED')
    group by oi.product_id
  )
  select p.id, p.name, p.slug, p.price, p.sale_type, p.category_id, p.is_recycled, p.is_handmade,
         (select i.storage_path from public.product_images i
           where i.product_id = p.id order by i.is_primary desc, i.sort_order limit 1),
         coalesce((select inv.on_hand - inv.reserved from public.inventories inv where inv.product_id = p.id), 0)
  from public.products p
  left join sold s on s.product_id = p.id
  where p.status = 'ACTIVE'
  order by coalesce(s.units, 0) desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 4), 1), 12);
$$;

revoke execute on function public.get_best_selling_products(integer) from public;
grant execute on function public.get_best_selling_products(integer) to anon, authenticated;
