-- =====================================================================
-- GOM – 0004: Hàm nghiệp vụ (RPC)
-- * Mọi hàm security definer đều: set search_path = '', ghi rõ schema,
--   tự kiểm tra auth.uid() / is_admin(), và bị thu hồi quyền của anon
--   trừ khi hàm thực sự công khai.
-- * Mỗi lần gọi RPC là một transaction: raise exception = rollback toàn bộ.
-- * Giá và tổng tiền luôn do database tính, không nhận từ client.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Nội bộ: ghi lịch sử trạng thái
-- ---------------------------------------------------------------------
create or replace function private.log_order_status(
  p_order_id bigint, p_from text, p_to text, p_actor uuid, p_note text
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.order_status_histories (order_id, from_status, to_status, changed_by, note)
  values (p_order_id, p_from, p_to, p_actor, p_note);
$$;

-- ---------------------------------------------------------------------
-- Nội bộ: hủy đơn + trả hàng đang giữ về kho (chỉ dùng cho đơn chưa xuất kho)
-- Người gọi phải đã khóa dòng đơn (select ... for update) trước.
-- ---------------------------------------------------------------------
create or replace function private.cancel_order(
  p_order_id bigint, p_reason text, p_actor uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item  record;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.status not in ('PENDING','CONFIRMED','PROCESSING') then
    raise exception 'ORDER_NOT_CANCELLABLE';
  end if;

  update public.orders
     set status = 'CANCELLED', cancel_reason = left(p_reason, 255)
   where id = p_order_id;

  for v_item in
    select product_id, quantity from public.order_items
    where order_id = p_order_id order by product_id
  loop
    update public.inventories
       set reserved = reserved - v_item.quantity
     where product_id = v_item.product_id;
    insert into public.inventory_transactions (product_id, type, quantity, order_id, created_by, note)
    values (v_item.product_id, 'RELEASE', v_item.quantity, p_order_id, p_actor, 'Hủy đơn');
  end loop;

  perform private.log_order_status(p_order_id, v_order.status, 'CANCELLED', p_actor, p_reason);
  -- Thanh toán đã PAID giữ nguyên: đơn CANCELLED + PAID = danh sách cần hoàn tiền.
end;
$$;

-- =====================================================================
-- HÀM CÔNG KHAI (khách vãng lai gọi được)
-- =====================================================================

-- Tìm kiếm, lọc sản phẩm. Chạy với quyền người gọi (RLS áp dụng).
-- p_option_ids: các giá trị thuộc tính đã chọn. Cùng thuộc tính = HOẶC, khác thuộc tính = VÀ.
create or replace function public.search_products(
  p_category_id   bigint   default null,
  p_keyword       text     default null,
  p_min_price     numeric  default null,
  p_max_price     numeric  default null,
  p_material_ids  bigint[] default null,
  p_option_ids    bigint[] default null,
  p_sort          text     default 'newest',
  p_limit         integer  default 12,
  p_offset        integer  default 0
) returns table (
  id bigint, name text, slug text, price numeric, sale_type text,
  category_id bigint, image_path text, available integer, total_count bigint
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
  select f.id, f.name, f.slug, f.price, f.sale_type, f.category_id,
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
grant execute on function public.search_products(bigint, text, numeric, numeric, bigint[], bigint[], text, integer, integer) to anon, authenticated;

-- Đánh giá hiển thị trên trang sản phẩm (không lộ thông tin đơn hàng)
create or replace function public.get_product_reviews(p_product_id bigint)
returns table (rating smallint, comment text, reviewer_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.rating, r.comment,
         coalesce(nullif(split_part(pr.full_name, ' ', -1), ''), 'Khách hàng'),
         r.created_at
  from public.reviews r
  join public.order_items oi on oi.id = r.order_item_id
  join public.orders o on o.id = oi.order_id
  join public.profiles pr on pr.id = o.user_id
  join public.products p on p.id = oi.product_id
  where oi.product_id = p_product_id and r.is_visible and p.status = 'ACTIVE'
  order by r.created_at desc
  limit 50;
$$;
grant execute on function public.get_product_reviews(bigint) to anon, authenticated;

-- =====================================================================
-- HÀM CỦA KHÁCH HÀNG (cần đăng nhập)
-- =====================================================================

-- Đặt hàng toàn bộ giỏ. Giữ hàng ngay trong transaction này.
-- p_expected_total: tổng tiền khách đang thấy; khác tổng tính lại -> PRICE_CHANGED.
create or replace function public.place_order(
  p_address_id     bigint,
  p_payment_method text,
  p_expected_total numeric,
  p_customer_note  text default null
) returns table (order_id bigint, order_code text, total_amount numeric, payment_deadline timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid       uuid := auth.uid();
  v_status    text;
  v_cart_id   bigint;
  v_addr      public.addresses%rowtype;
  v_settings  public.store_settings%rowtype;
  v_count     integer;
  v_inactive  integer;
  v_subtotal  numeric(12,0);
  v_total     numeric(12,0);
  v_deadline  timestamptz;
  v_order_id  bigint;
  v_code      text;
  v_item      record;
  v_rows      integer;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select status into v_status from public.profiles where id = v_uid;
  if v_status is distinct from 'ACTIVE' then raise exception 'ACCOUNT_LOCKED'; end if;

  if p_payment_method not in ('COD','ONLINE') then raise exception 'INVALID_PAYMENT_METHOD'; end if;

  select * into v_addr from public.addresses where id = p_address_id and user_id = v_uid;
  if not found then raise exception 'ADDRESS_INVALID'; end if;

  select id into v_cart_id from public.carts where user_id = v_uid;
  select * into v_settings from public.store_settings where id = 1;
  if not found then raise exception 'STORE_SETTINGS_MISSING'; end if;

  -- Khóa (chia sẻ) các sản phẩm trong giỏ để giá không đổi giữa chừng
  perform 1 from public.products p
    join public.cart_items ci on ci.product_id = p.id
   where ci.cart_id = v_cart_id
   for share of p;

  select count(*),
         count(*) filter (where p.status <> 'ACTIVE'),
         coalesce(sum(p.price * ci.quantity), 0)
    into v_count, v_inactive, v_subtotal
    from public.cart_items ci join public.products p on p.id = ci.product_id
   where ci.cart_id = v_cart_id;

  if v_count = 0 then raise exception 'CART_EMPTY'; end if;
  if v_inactive > 0 then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  v_total := v_subtotal + v_settings.shipping_fee;
  if p_expected_total is distinct from v_total then
    raise exception 'PRICE_CHANGED' using detail = v_total::text;
  end if;

  -- Giữ hàng: cập nhật có điều kiện, theo product_id tăng dần để tránh deadlock
  for v_item in
    select ci.product_id, ci.quantity from public.cart_items ci
    where ci.cart_id = v_cart_id order by ci.product_id
  loop
    update public.inventories
       set reserved = reserved + v_item.quantity
     where product_id = v_item.product_id
       and on_hand - reserved >= v_item.quantity;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'OUT_OF_STOCK' using detail = v_item.product_id::text;
    end if;
  end loop;

  if p_payment_method = 'ONLINE' then
    v_deadline := now() + make_interval(mins => v_settings.payment_timeout_minutes);
  end if;

  v_code := 'GOM' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD')
            || lpad(nextval('public.order_code_seq')::text, 5, '0');

  insert into public.orders (
    order_code, user_id, recipient_name, recipient_phone, ship_province, ship_ward,
    ship_street_address, customer_note, subtotal, shipping_fee, total_amount, payment_deadline
  ) values (
    v_code, v_uid, v_addr.recipient_name, v_addr.recipient_phone, v_addr.province, v_addr.ward,
    v_addr.street_address, nullif(left(trim(p_customer_note), 500), ''), v_subtotal,
    v_settings.shipping_fee, v_total, v_deadline
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, product_name, unit_price, quantity, reused_weight_grams)
  select v_order_id, p.id, p.name, p.price, ci.quantity,
         coalesce((select sum(pm.weight_grams) from public.product_materials pm where pm.product_id = p.id), 0)
    from public.cart_items ci join public.products p on p.id = ci.product_id
   where ci.cart_id = v_cart_id;

  insert into public.payments (order_id, method, amount) values (v_order_id, p_payment_method, v_total);

  insert into public.inventory_transactions (product_id, type, quantity, order_id, created_by, note)
  select ci.product_id, 'RESERVE', ci.quantity, v_order_id, v_uid, 'Đặt hàng'
    from public.cart_items ci where ci.cart_id = v_cart_id;

  perform private.log_order_status(v_order_id, null, 'PENDING', v_uid, null);

  delete from public.cart_items where cart_id = v_cart_id;

  return query select v_order_id, v_code, v_total, v_deadline;
end;
$$;
revoke execute on function public.place_order(bigint, text, numeric, text) from public, anon;
grant execute on function public.place_order(bigint, text, numeric, text) to authenticated;

-- Khách tự hủy đơn (trạng thái cho phép lấy từ store_settings)
create or replace function public.cancel_my_order(p_order_code text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_order    public.orders%rowtype;
  v_allowed  text[];
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_order from public.orders
   where order_code = p_order_code and user_id = v_uid
   for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select customer_cancellable_statuses into v_allowed from public.store_settings where id = 1;
  if not (v_order.status = any (v_allowed)) then raise exception 'ORDER_NOT_CANCELLABLE'; end if;

  perform private.cancel_order(v_order.id, coalesce(nullif(trim(p_reason), ''), 'Khách hủy'), v_uid);
end;
$$;
revoke execute on function public.cancel_my_order(text, text) from public, anon;
grant execute on function public.cancel_my_order(text, text) to authenticated;

-- Khách xác nhận đã nhận hàng: DELIVERED -> COMPLETED
create or replace function public.confirm_order_received(p_order_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_order from public.orders
   where order_code = p_order_code and user_id = v_uid
   for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status <> 'DELIVERED' then raise exception 'INVALID_TRANSITION'; end if;

  update public.orders set status = 'COMPLETED' where id = v_order.id;
  perform private.log_order_status(v_order.id, 'DELIVERED', 'COMPLETED', v_uid, 'Khách xác nhận đã nhận');
end;
$$;
revoke execute on function public.confirm_order_received(text) from public, anon;
grant execute on function public.confirm_order_received(text) to authenticated;

-- Đặt địa chỉ mặc định (2 lệnh trong 1 transaction)
create or replace function public.set_default_address(p_address_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from public.addresses where id = p_address_id and user_id = v_uid) then
    raise exception 'ADDRESS_INVALID';
  end if;
  update public.addresses set is_default = false where user_id = v_uid and is_default;
  update public.addresses set is_default = true where id = p_address_id;
end;
$$;
revoke execute on function public.set_default_address(bigint) from public, anon;
grant execute on function public.set_default_address(bigint) to authenticated;

-- =====================================================================
-- HÀM CỦA QUẢN TRỊ VIÊN (tự kiểm tra is_admin bên trong)
-- =====================================================================

create or replace function public.admin_update_order_status(
  p_order_id bigint, p_to_status text, p_note text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_order   public.orders%rowtype;
  v_method  text;
  v_pay     text;
  v_allowed text[];
  v_item    record;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  v_allowed := case v_order.status
    when 'PENDING'    then array['CONFIRMED','CANCELLED']
    when 'CONFIRMED'  then array['PROCESSING','CANCELLED']
    when 'PROCESSING' then array['SHIPPING','CANCELLED']
    when 'SHIPPING'   then array['DELIVERED']
    when 'DELIVERED'  then array['COMPLETED']
    else array[]::text[]
  end;
  if not (p_to_status = any (v_allowed)) then raise exception 'INVALID_TRANSITION'; end if;

  select method, status into v_method, v_pay from public.payments where order_id = p_order_id;

  if p_to_status = 'CANCELLED' then
    perform private.cancel_order(p_order_id, coalesce(nullif(trim(p_note), ''), 'Cửa hàng hủy'), v_uid);
    return;
  end if;

  -- Đơn trực tuyến phải thanh toán xong mới được xác nhận
  if p_to_status = 'CONFIRMED' and v_method = 'ONLINE' and v_pay <> 'PAID' then
    raise exception 'ONLINE_ORDER_NOT_PAID';
  end if;

  -- Xuất kho: trừ tồn thực tế và hàng đang giữ
  if p_to_status = 'SHIPPING' then
    for v_item in
      select product_id, quantity from public.order_items
      where order_id = p_order_id order by product_id
    loop
      update public.inventories
         set on_hand = on_hand - v_item.quantity,
             reserved = reserved - v_item.quantity
       where product_id = v_item.product_id;
      insert into public.inventory_transactions (product_id, type, quantity, order_id, created_by, note)
      values (v_item.product_id, 'SHIP', v_item.quantity, p_order_id, v_uid, 'Xuất kho giao hàng');
    end loop;
  end if;

  -- Giao thành công: đơn COD coi như đã thu tiền
  if p_to_status = 'DELIVERED' and v_method = 'COD' and v_pay = 'UNPAID' then
    update public.payments set status = 'PAID', paid_at = now() where order_id = p_order_id;
  end if;

  update public.orders set status = p_to_status where id = p_order_id;
  perform private.log_order_status(p_order_id, v_order.status, p_to_status, v_uid, p_note);
end;
$$;
revoke execute on function public.admin_update_order_status(bigint, text, text) from public, anon;
grant execute on function public.admin_update_order_status(bigint, text, text) to authenticated;

-- Xác nhận đã hoàn tiền thủ công cho đơn đã hủy
create or replace function public.admin_mark_refunded(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.payments pay
     set status = 'REFUNDED', refunded_at = now()
    from public.orders o
   where pay.order_id = o.id and o.id = p_order_id
     and o.status = 'CANCELLED' and pay.status = 'PAID';
  if not found then raise exception 'REFUND_NOT_ALLOWED'; end if;
end;
$$;
revoke execute on function public.admin_mark_refunded(bigint) from public, anon;
grant execute on function public.admin_mark_refunded(bigint) to authenticated;

-- Nhập kho / điều chỉnh tồn (luôn kèm nhật ký)
create or replace function public.admin_adjust_stock(
  p_product_id bigint, p_type text, p_quantity integer, p_note text default null
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv       public.inventories%rowtype;
  v_sale_type text;
  v_new       integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_type not in ('IMPORT','ADJUST') then raise exception 'INVALID_STOCK_TYPE'; end if;
  if p_quantity is null or p_quantity = 0 or (p_type = 'IMPORT' and p_quantity < 0) then
    raise exception 'INVALID_QUANTITY';
  end if;

  select * into v_inv from public.inventories where product_id = p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  select sale_type into v_sale_type from public.products where id = p_product_id;

  v_new := v_inv.on_hand + p_quantity;
  if v_new < v_inv.reserved then raise exception 'STOCK_BELOW_RESERVED'; end if;
  if v_sale_type = 'UNIQUE' and v_new > 1 then raise exception 'UNIQUE_MAX_ONE'; end if;

  update public.inventories set on_hand = v_new where product_id = p_product_id;
  insert into public.inventory_transactions (product_id, type, quantity, created_by, note)
  values (p_product_id, p_type, p_quantity, auth.uid(), p_note);
  return v_new;
end;
$$;
revoke execute on function public.admin_adjust_stock(bigint, text, integer, text) from public, anon;
grant execute on function public.admin_adjust_stock(bigint, text, integer, text) to authenticated;

-- Khóa / mở khóa tài khoản (không tự khóa chính mình)
create or replace function public.admin_set_user_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('ACTIVE','LOCKED') then raise exception 'INVALID_STATUS'; end if;
  if p_user_id = auth.uid() then raise exception 'CANNOT_CHANGE_SELF'; end if;
  update public.profiles set status = p_status where id = p_user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
end;
$$;
revoke execute on function public.admin_set_user_status(uuid, text) from public, anon;
grant execute on function public.admin_set_user_status(uuid, text) to authenticated;

-- Thống kê trong khoảng thời gian [p_from, p_to)
create or replace function public.admin_dashboard_stats(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  with completed as (
    -- Đơn hoàn thành trong kỳ, tính theo thời điểm chuyển sang COMPLETED
    select distinct o.id, o.subtotal
    from public.orders o
    join public.order_status_histories h on h.order_id = o.id and h.to_status = 'COMPLETED'
    where o.status = 'COMPLETED' and h.created_at >= p_from and h.created_at < p_to
  ),
  sold as (
    -- "Đã bán" = đã xuất kho
    select oi.product_id, oi.product_name, oi.quantity, oi.reused_weight_grams
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status in ('SHIPPING','DELIVERED','COMPLETED')
      and o.created_at >= p_from and o.created_at < p_to
  )
  select jsonb_build_object(
    'revenue', (select coalesce(sum(subtotal), 0) from completed),
    'completed_orders', (select count(*) from completed),
    'orders_by_status', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (select status, count(*) as cnt from public.orders
            where created_at >= p_from and created_at < p_to group by status) s),
    'top_products', (
      select coalesce(jsonb_agg(t order by t.quantity desc), '[]'::jsonb)
      from (select product_id, max(product_name) as name, sum(quantity) as quantity
            from sold group by product_id order by sum(quantity) desc limit 5) t),
    'reused_weight_grams', (select coalesce(sum(quantity * reused_weight_grams), 0) from sold)
  ) into v_result;

  return v_result;
end;
$$;
revoke execute on function public.admin_dashboard_stats(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_dashboard_stats(timestamptz, timestamptz) to authenticated;

-- =====================================================================
-- HÀM CHỈ DÀNH CHO SERVER (Edge Functions dùng service role, pg_cron)
-- =====================================================================

-- Chuẩn bị thanh toán trực tuyến: gán mã giao dịch mới (cho phép thử lại khi FAILED)
create or replace function public.prepare_online_payment(p_order_id bigint, p_transaction_ref text)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_pay   public.payments%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_pay from public.payments where order_id = p_order_id for update;

  if v_pay.method <> 'ONLINE' or v_pay.status not in ('UNPAID','FAILED')
     or v_order.status <> 'PENDING' or v_order.payment_deadline <= now() then
    raise exception 'PAYMENT_NOT_ALLOWED';
  end if;

  update public.payments
     set transaction_ref = p_transaction_ref, status = 'UNPAID'
   where id = v_pay.id;
  return v_pay.amount;
end;
$$;
revoke execute on function public.prepare_online_payment(bigint, text) from public, anon, authenticated;
grant execute on function public.prepare_online_payment(bigint, text) to service_role;

-- Ghi kết quả từ cổng thanh toán. Gọi lặp lại nhiều lần vẫn an toàn.
create or replace function public.record_payment_result(
  p_transaction_ref text, p_success boolean, p_response jsonb
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay public.payments%rowtype;
begin
  select * into v_pay from public.payments where transaction_ref = p_transaction_ref for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_pay.status <> 'UNPAID' then return 'ALREADY_PROCESSED'; end if;

  update public.payments
     set status = case when p_success then 'PAID' else 'FAILED' end,
         paid_at = case when p_success then now() end,
         provider_response = p_response
   where id = v_pay.id;
  -- Nếu đơn đã bị hủy do hết hạn mà tiền vẫn về: đơn CANCELLED + PAID
  -- tự xuất hiện trong danh sách cần hoàn tiền của admin.
  return case when p_success then 'PAID' else 'FAILED' end;
end;
$$;
revoke execute on function public.record_payment_result(text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.record_payment_result(text, boolean, jsonb) to service_role;

-- Hủy đơn trực tuyến quá hạn thanh toán (chạy định kỳ bằng pg_cron)
create or replace function public.expire_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    bigint;
  v_count integer := 0;
begin
  for v_id in
    select o.id from public.orders o
    join public.payments pay on pay.order_id = o.id
    where o.status = 'PENDING' and pay.method = 'ONLINE' and pay.status <> 'PAID'
      and o.payment_deadline < now()
    order by o.id
    for update of o skip locked
  loop
    perform private.cancel_order(v_id, 'Hết hạn thanh toán', null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.expire_unpaid_orders() from public, anon, authenticated;

-- Tự hoàn thành đơn đã giao quá N ngày (chạy định kỳ bằng pg_cron)
create or replace function public.auto_complete_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days  integer;
  v_id    bigint;
  v_count integer := 0;
begin
  select auto_complete_days into v_days from public.store_settings where id = 1;
  for v_id in
    select o.id from public.orders o
    where o.status = 'DELIVERED'
      and exists (
        select 1 from public.order_status_histories h
        where h.order_id = o.id and h.to_status = 'DELIVERED'
          and h.created_at < now() - make_interval(days => v_days))
    for update of o skip locked
  loop
    update public.orders set status = 'COMPLETED' where id = v_id;
    perform private.log_order_status(v_id, 'DELIVERED', 'COMPLETED', null, 'Tự động hoàn thành');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.auto_complete_orders() from public, anon, authenticated;

-- Hàm nội bộ không cho ai gọi qua API
revoke all on all functions in schema private from public, anon, authenticated;
revoke usage on schema private from public, anon, authenticated;
