-- =====================================================================
-- GOM – 0001: Bảng, ràng buộc, chỉ mục
-- Hệ quản trị: PostgreSQL (Supabase). Tiền: numeric(12,0) VND. Khối lượng: gam.
-- Mật khẩu do Supabase Auth quản lý (bảng auth.users), không lưu ở đây.
-- =====================================================================

create schema if not exists private;   -- hàm nội bộ, không được API công khai

-- ---------------------------------------------------------------------
-- Cấu hình cửa hàng (1 dòng duy nhất, admin chỉnh được)
-- ---------------------------------------------------------------------
create table public.store_settings (
  id                           smallint primary key default 1 check (id = 1),
  shipping_fee                 numeric(12,0) not null default 0 check (shipping_fee >= 0),
  payment_timeout_minutes      integer not null default 15 check (payment_timeout_minutes between 5 and 1440),
  auto_complete_days           integer not null default 3 check (auto_complete_days between 1 and 30),
  customer_cancellable_statuses text[] not null default array['PENDING','CONFIRMED'],
  updated_at                   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Người dùng
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '' check (char_length(full_name) <= 100),
  phone       text check (phone is null or phone ~ '^[0-9+ ]{8,15}$'),
  role        text not null default 'CUSTOMER' check (role in ('CUSTOMER','ADMIN')),
  status      text not null default 'ACTIVE' check (status in ('ACTIVE','LOCKED')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.addresses (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  recipient_name   text not null check (char_length(recipient_name) between 1 and 100),
  recipient_phone  text not null check (recipient_phone ~ '^[0-9+ ]{8,15}$'),
  province         text not null check (char_length(province) between 1 and 100),
  ward             text not null check (char_length(ward) between 1 and 100),
  street_address   text not null check (char_length(street_address) between 1 and 255),
  is_default       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
-- Mỗi người tối đa 1 địa chỉ mặc định (PostgreSQL hỗ trợ unique có điều kiện)
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;

-- ---------------------------------------------------------------------
-- Danh mục và thuộc tính động
-- ---------------------------------------------------------------------
create table public.categories (
  id          bigint generated always as identity primary key,
  name        text not null unique check (char_length(name) between 1 and 100),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.attributes (
  id             bigint generated always as identity primary key,
  code           text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name           text not null check (char_length(name) between 1 and 100),
  data_type      text not null default 'SELECT' check (data_type in ('SELECT','NUMBER','TEXT')),
  unit           text,
  is_multi_value boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (is_multi_value = false or data_type = 'SELECT')
);

create table public.attribute_options (
  id            bigint generated always as identity primary key,
  attribute_id  bigint not null references public.attributes (id) on delete cascade,
  value         text not null check (char_length(value) between 1 and 100),
  sort_order    integer not null default 0,
  unique (attribute_id, value),
  unique (attribute_id, id)          -- cho khóa ngoại kép từ product_attribute_values
);

create table public.category_attributes (
  category_id    bigint not null references public.categories (id) on delete cascade,
  attribute_id   bigint not null references public.attributes (id),
  is_required    boolean not null default false,
  is_filterable  boolean not null default true,
  sort_order     integer not null default 0,
  primary key (category_id, attribute_id)
);

-- ---------------------------------------------------------------------
-- Sản phẩm
-- ---------------------------------------------------------------------
create table public.products (
  id           bigint generated always as identity primary key,
  category_id  bigint not null references public.categories (id),
  name         text not null check (char_length(name) between 1 and 200),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text,
  origin_story text,
  price        numeric(12,0) not null check (price >= 0),
  sale_type    text not null default 'STOCK' check (sale_type in ('STOCK','UNIQUE')),
  status       text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','HIDDEN','ARCHIVED')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index products_category_status_idx on public.products (category_id, status);
create index products_status_created_idx on public.products (status, created_at desc);

create table public.product_attribute_values (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references public.products (id) on delete cascade,
  attribute_id  bigint not null references public.attributes (id),
  option_id     bigint,
  value_number  numeric(10,2),
  value_text    text check (value_text is null or char_length(value_text) <= 255),
  foreign key (attribute_id, option_id) references public.attribute_options (attribute_id, id),
  check (num_nonnulls(option_id, value_number, value_text) = 1)
);
-- SELECT: không chọn trùng một option; NUMBER/TEXT: mỗi sản phẩm 1 giá trị cho 1 thuộc tính
create unique index pav_option_unique_idx on public.product_attribute_values (product_id, attribute_id, option_id) where option_id is not null;
create unique index pav_scalar_unique_idx on public.product_attribute_values (product_id, attribute_id) where option_id is null;
create index pav_filter_option_idx on public.product_attribute_values (attribute_id, option_id);
create index pav_filter_number_idx on public.product_attribute_values (attribute_id, value_number);

create table public.product_images (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references public.products (id) on delete cascade,
  storage_path  text not null,                      -- đường dẫn trong bucket product-images
  alt_text      text check (alt_text is null or char_length(alt_text) <= 255),
  sort_order    integer not null default 0,
  is_primary    boolean not null default false
);
create index product_images_product_idx on public.product_images (product_id, sort_order);
create unique index product_images_one_primary_idx on public.product_images (product_id) where is_primary;

create table public.materials (
  id          bigint generated always as identity primary key,
  name        text not null unique check (char_length(name) between 1 and 100),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.product_materials (
  product_id    bigint not null references public.products (id) on delete cascade,
  material_id   bigint not null references public.materials (id),
  weight_grams  integer not null check (weight_grams > 0),
  primary key (product_id, material_id)
);
create index product_materials_material_idx on public.product_materials (material_id);

-- ---------------------------------------------------------------------
-- Kho
-- ---------------------------------------------------------------------
create table public.inventories (
  product_id  bigint primary key references public.products (id) on delete cascade,
  on_hand     integer not null default 0 check (on_hand >= 0),
  reserved    integer not null default 0 check (reserved >= 0),
  updated_at  timestamptz not null default now(),
  check (reserved <= on_hand)
);

-- ---------------------------------------------------------------------
-- Giỏ hàng
-- ---------------------------------------------------------------------
create table public.carts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null unique references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.cart_items (
  id          bigint generated always as identity primary key,
  cart_id     bigint not null references public.carts (id) on delete cascade,
  product_id  bigint not null references public.products (id) on delete cascade,
  quantity    integer not null default 1 check (quantity between 1 and 99),
  added_at    timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- ---------------------------------------------------------------------
-- Đơn hàng và thanh toán (client KHÔNG ghi trực tiếp; chỉ qua hàm RPC)
-- ---------------------------------------------------------------------
create sequence public.order_code_seq;

create table public.orders (
  id                   bigint generated always as identity primary key,
  order_code           text not null unique,
  user_id              uuid not null references public.profiles (id),
  status               text not null default 'PENDING'
                       check (status in ('PENDING','CONFIRMED','PROCESSING','SHIPPING','DELIVERED','COMPLETED','CANCELLED')),
  recipient_name       text not null,
  recipient_phone      text not null,
  ship_province        text not null,
  ship_ward            text not null,
  ship_street_address  text not null,
  customer_note        text check (customer_note is null or char_length(customer_note) <= 500),
  subtotal             numeric(12,0) not null check (subtotal >= 0),
  shipping_fee         numeric(12,0) not null default 0 check (shipping_fee >= 0),
  total_amount         numeric(12,0) not null,
  payment_deadline     timestamptz,
  cancel_reason        text check (cancel_reason is null or char_length(cancel_reason) <= 255),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (total_amount = subtotal + shipping_fee)
);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id                   bigint generated always as identity primary key,
  order_id             bigint not null references public.orders (id),
  product_id           bigint not null references public.products (id),   -- RESTRICT: sản phẩm đã bán không xóa được
  product_name         text not null,                                      -- snapshot
  unit_price           numeric(12,0) not null check (unit_price >= 0),     -- snapshot
  quantity             integer not null check (quantity > 0),
  reused_weight_grams  integer not null default 0 check (reused_weight_grams >= 0), -- snapshot, trên 1 sản phẩm
  unique (order_id, product_id)
);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_histories (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references public.orders (id),
  from_status  text,
  to_status    text not null,
  changed_by   uuid references public.profiles (id) on delete set null,  -- NULL = hệ thống
  note         text,
  created_at   timestamptz not null default now()
);
create index osh_order_idx on public.order_status_histories (order_id, created_at);
create index osh_to_status_idx on public.order_status_histories (to_status, created_at);

create table public.payments (
  id                 bigint generated always as identity primary key,
  order_id           bigint not null unique references public.orders (id),
  method             text not null check (method in ('COD','ONLINE')),
  provider           text,
  amount             numeric(12,0) not null check (amount >= 0),
  status             text not null default 'UNPAID' check (status in ('UNPAID','PAID','FAILED','REFUNDED')),
  transaction_ref    text unique,
  paid_at            timestamptz,
  refunded_at        timestamptz,
  provider_response  jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.inventory_transactions (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references public.products (id),
  type        text not null check (type in ('IMPORT','ADJUST','RESERVE','RELEASE','SHIP')),
  quantity    integer not null check (quantity <> 0),
  order_id    bigint references public.orders (id),
  created_by  uuid references public.profiles (id) on delete set null,
  note        text,
  created_at  timestamptz not null default now(),
  check (type = 'ADJUST' or quantity > 0)
);
create index inv_tx_product_idx on public.inventory_transactions (product_id, created_at desc);

-- ---------------------------------------------------------------------
-- Đánh giá
-- ---------------------------------------------------------------------
create table public.reviews (
  id             bigint generated always as identity primary key,
  order_item_id  bigint not null unique references public.order_items (id),
  rating         smallint not null check (rating between 1 and 5),
  comment        text check (comment is null or char_length(comment) <= 2000),
  is_visible     boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Chatbot
-- ---------------------------------------------------------------------
create table public.knowledge_entries (
  id          bigint generated always as identity primary key,
  type        text not null check (type in ('FAQ','POLICY')),
  title       text not null check (char_length(title) between 1 and 255),
  content     text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Lịch sử chat (chỉ lưu cho người đã đăng nhập)
create table public.chat_conversations (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.chat_messages (
  id               bigint generated always as identity primary key,
  conversation_id  bigint not null references public.chat_conversations (id) on delete cascade,
  role             text not null check (role in ('USER','ASSISTANT','TOOL')),
  content          text not null,
  tool_name        text,
  created_at       timestamptz not null default now()
);
create index chat_messages_conv_idx on public.chat_messages (conversation_id, created_at);
