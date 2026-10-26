-- =====================================================================
-- GOM – 0002: Trigger giữ nhất quán dữ liệu
-- Lỗi nghiệp vụ dùng mã chữ in hoa (ví dụ PRODUCT_INCOMPLETE) để frontend
-- đổi thành thông báo tiếng Việt trong src/lib/errors.js.
-- =====================================================================

-- ---------------------------------------------------------------------
-- updated_at tự cập nhật
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'store_settings','profiles','addresses','categories','attributes','products',
    'materials','inventories','carts','orders','payments','reviews','knowledge_entries'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Tạo profile + giỏ hàng khi có tài khoản mới trong Supabase Auth.
-- Vai trò LUÔN là CUSTOMER, không đọc vai trò từ dữ liệu client gửi lên.
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100)
  );
  insert into public.carts (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Đồng bộ email khi người dùng đổi email trong Auth
create or replace function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_profile_email();

-- ---------------------------------------------------------------------
-- Sản phẩm
-- ---------------------------------------------------------------------

-- Mỗi sản phẩm có đúng 1 dòng tồn kho, tạo cùng lúc với sản phẩm
create or replace function private.create_inventory_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventories (product_id) values (new.id);
  return new;
end;
$$;

create trigger products_create_inventory
  after insert on public.products
  for each row execute function private.create_inventory_row();

-- Kiểm tra trước khi thêm/sửa sản phẩm
create or replace function private.validate_product()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_missing  integer;
  v_images   integer;
  v_on_hand  integer;
  v_reserved integer;
begin
  -- Sản phẩm mới luôn bắt đầu ở DRAFT (chưa có ảnh, thuộc tính, tồn kho)
  if tg_op = 'INSERT' then
    if new.status <> 'DRAFT' then
      raise exception 'PRODUCT_MUST_START_AS_DRAFT';
    end if;
    return new;
  end if;

  -- Đổi danh mục khi đang bán làm bộ thuộc tính sai lệch -> phải về DRAFT trước
  if new.category_id <> old.category_id and new.status = 'ACTIVE' then
    raise exception 'CHANGE_CATEGORY_REQUIRES_DRAFT';
  end if;

  -- Chuyển sang độc bản: tồn tối đa 1 và không có hàng đang giữ
  if new.sale_type = 'UNIQUE' and old.sale_type <> 'UNIQUE' then
    select on_hand, reserved into v_on_hand, v_reserved
    from public.inventories where product_id = new.id;
    if v_on_hand > 1 or v_reserved > 0 then
      raise exception 'UNIQUE_REQUIRES_STOCK_AT_MOST_ONE';
    end if;
  end if;

  -- Đăng bán: đủ thuộc tính bắt buộc và có ít nhất 1 ảnh
  if new.status = 'ACTIVE' and old.status <> 'ACTIVE' then
    select count(*) into v_missing
    from public.category_attributes ca
    where ca.category_id = new.category_id
      and ca.is_required
      and not exists (
        select 1 from public.product_attribute_values v
        where v.product_id = new.id and v.attribute_id = ca.attribute_id
      );
    select count(*) into v_images
    from public.product_images where product_id = new.id;
    if v_missing > 0 or v_images = 0 then
      raise exception 'PRODUCT_INCOMPLETE'
        using detail = format('missing_required_attributes=%s, images=%s', v_missing, v_images);
    end if;
  end if;

  return new;
end;
$$;

create trigger products_validate
  before insert or update on public.products
  for each row execute function private.validate_product();

-- Sau khi đổi danh mục: xóa giá trị của thuộc tính không thuộc danh mục mới
create or replace function private.cleanup_attributes_after_category_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.product_attribute_values v
  where v.product_id = new.id
    and not exists (
      select 1 from public.category_attributes ca
      where ca.category_id = new.category_id and ca.attribute_id = v.attribute_id
    );
  return new;
end;
$$;

create trigger products_cleanup_attributes
  after update of category_id on public.products
  for each row when (old.category_id is distinct from new.category_id)
  execute function private.cleanup_attributes_after_category_change();

-- Giá trị thuộc tính phải thuộc bộ thuộc tính của danh mục và đúng kiểu dữ liệu
create or replace function private.validate_attribute_value()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_attr   public.attributes%rowtype;
  v_exists boolean;
begin
  select a.* into v_attr from public.attributes a where a.id = new.attribute_id;

  select exists (
    select 1
    from public.products p
    join public.category_attributes ca
      on ca.category_id = p.category_id and ca.attribute_id = new.attribute_id
    where p.id = new.product_id
  ) into v_exists;
  if not v_exists then
    raise exception 'ATTRIBUTE_NOT_IN_CATEGORY';
  end if;

  if (v_attr.data_type = 'SELECT' and new.option_id is null)
     or (v_attr.data_type = 'NUMBER' and new.value_number is null)
     or (v_attr.data_type = 'TEXT' and new.value_text is null) then
    raise exception 'ATTRIBUTE_VALUE_TYPE_MISMATCH';
  end if;

  -- Thuộc tính SELECT một giá trị: không cho thêm option thứ hai
  if v_attr.data_type = 'SELECT' and not v_attr.is_multi_value then
    if exists (
      select 1 from public.product_attribute_values v
      where v.product_id = new.product_id
        and v.attribute_id = new.attribute_id
        and v.id is distinct from new.id
    ) then
      raise exception 'ATTRIBUTE_SINGLE_VALUE_ONLY';
    end if;
  end if;

  return new;
end;
$$;

create trigger pav_validate
  before insert or update on public.product_attribute_values
  for each row execute function private.validate_attribute_value();

-- ---------------------------------------------------------------------
-- Giỏ hàng: chỉ thêm sản phẩm đang bán; sản phẩm độc bản tối đa 1
-- (giỏ KHÔNG giữ hàng; việc giữ hàng xảy ra khi đặt đơn)
-- ---------------------------------------------------------------------
create or replace function private.validate_cart_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status    text;
  v_sale_type text;
begin
  select status, sale_type into v_status, v_sale_type
  from public.products where id = new.product_id;

  if v_status is distinct from 'ACTIVE' then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;
  if v_sale_type = 'UNIQUE' and new.quantity > 1 then
    raise exception 'UNIQUE_MAX_ONE';
  end if;
  return new;
end;
$$;

create trigger cart_items_validate
  before insert or update on public.cart_items
  for each row execute function private.validate_cart_item();
