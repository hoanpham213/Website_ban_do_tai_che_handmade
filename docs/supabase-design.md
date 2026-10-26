# GOM – Thiết kế lại theo Supabase

Tài liệu này thay thế các phần **người dùng, phân quyền, đặt hàng, thanh toán, chatbot** trong "GOM – Thiết kế cơ sở dữ liệu" khi triển khai trên Supabase. Các phần còn lại (thuộc tính động, tồn kho, snapshot, trạng thái đơn) giữ nguyên nguyên tắc, chỉ đổi cách thực thi.

Mã nguồn tương ứng: `supabase/migrations/` (5 file, chạy theo thứ tự tên), `supabase/seed.sql`, `supabase/cron.sql`, `supabase/functions/`.

## 1. Kiến trúc

```
Trình duyệt (HTML/JS + Tailwind, chỉ có publishable key)
   │
   ├── Supabase Auth ............ đăng ký, đăng nhập, băm mật khẩu
   ├── Bảng (PostgREST + RLS) ... ĐỌC dữ liệu; ghi giỏ hàng, địa chỉ, hồ sơ, đánh giá
   ├── Hàm RPC (PostgreSQL) ..... GHI dữ liệu nhạy cảm: đặt/hủy đơn, kho, trạng thái đơn
   ├── Storage .................. ảnh sản phẩm (bucket product-images)
   └── Edge Functions ........... chatbot, tạo thanh toán, nhận callback thanh toán
            │  (giữ LLM_API_KEY, PAYMENT_SECRET, service role key)
            ├── Dịch vụ LLM
            └── Cổng thanh toán (thử nghiệm)
```

Ba quy tắc xuyên suốt:

1. **Client chỉ đọc qua RLS.** Bảng nào không có policy cho phép thì bị chặn, kể cả khi đã đăng nhập.
2. **Dữ liệu tiền, kho, trạng thái đơn chỉ ghi qua hàm RPC.** Client không có quyền ghi vào `orders`, `order_items`, `payments`, `inventories`, `inventory_transactions`, `order_status_histories`. Giá và tổng tiền do database tính.
3. **Secret chỉ nằm trong Edge Functions.** Frontend chỉ có `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`; cả hai đều công khai.

## 2. Thay đổi so với thiết kế CSDL trước

| Thiết kế cũ | Bản Supabase | Lý do |
| --- | --- | --- |
| Hệ quản trị chưa chốt | PostgreSQL | Supabase dùng PostgreSQL |
| `users` có `password_hash` | `profiles` (khóa chính = `auth.users.id`), không có cột mật khẩu | Supabase Auth quản lý và băm mật khẩu |
| Bảng `roles` | Cột `profiles.role` (CUSTOMER/ADMIN) + hàm `is_admin()` | Chỉ 2 vai trò; policy RLS gọn hơn |
| Tầng "Backend" tự viết | Hàm RPC + trigger + RLS + Edge Functions | Không cần server riêng |
| Đặt hàng = nhiều lệnh từ backend | Hàm `place_order` chạy trọn trong 1 transaction | Giữ hàng và tạo đơn không thể tách rời |
| Thời hạn thanh toán, phí ship, trạng thái được hủy cố định | Bảng `store_settings` (1 dòng, admin sửa) | Không hardcode quy tắc nghiệp vụ |
| `product_images.image_url` | `product_images.storage_path` | Lưu đường dẫn trong bucket, URL tạo khi hiển thị |
| "1 địa chỉ mặc định" kiểm tra ở ứng dụng | Unique index có điều kiện | PostgreSQL chặn được ngay trong database |
| "Thuộc tính phải thuộc danh mục" kiểm tra ở ứng dụng | Trigger `pav_validate` | Chặn ở database |
| Đổi danh mục: ứng dụng tự dọn thuộc tính | Trigger tự xóa thuộc tính không thuộc danh mục mới | Chặn ở database |
| Lịch sử chat lưu cả khách vãng lai | Chỉ lưu cho người đã đăng nhập | RLS gắn hội thoại với `auth.uid()` |

## 3. Ma trận quyền (RLS)

| Bảng | Khách vãng lai | Khách hàng | Quản trị viên | Ghi bằng cách nào |
| --- | --- | --- | --- | --- |
| store_settings | Đọc | Đọc | Đọc, sửa | Trực tiếp (admin) |
| profiles | — | Đọc, sửa họ tên/SĐT của mình | Đọc tất cả | Trigger tạo; `admin_set_user_status` |
| addresses | — | Toàn quyền của mình | — | Trực tiếp; `set_default_address` |
| categories, attributes, attribute_options, category_attributes, materials | Đọc | Đọc | Toàn quyền | Trực tiếp (admin) |
| products và bảng con (ảnh, thuộc tính, vật liệu) | Đọc sản phẩm ACTIVE | Đọc sản phẩm ACTIVE | Toàn quyền | Trực tiếp (admin), trigger kiểm tra |
| inventories | Đọc (sản phẩm ACTIVE) | Đọc | Đọc | Chỉ qua hàm |
| inventory_transactions | — | — | Đọc | Chỉ qua hàm |
| carts | — | Đọc giỏ của mình | — | Trigger tạo khi đăng ký |
| cart_items | — | Toàn quyền trong giỏ của mình | — | Trực tiếp, trigger kiểm tra |
| orders, order_items, order_status_histories, payments | — | Đọc đơn của mình | Đọc tất cả | Chỉ qua hàm |
| reviews | Qua hàm `get_product_reviews` | Thêm khi đã nhận hàng; đọc của mình | Đọc, ẩn/hiện | Trực tiếp (có điều kiện) |
| knowledge_entries | Đọc mục đang bật | Đọc mục đang bật | Toàn quyền | Trực tiếp (admin) |
| chat_conversations, chat_messages | — | Của mình | — | Edge Function chatbot, bằng phiên của người dùng |

Quyền cột: khách hàng chỉ sửa được `profiles.full_name`, `profiles.phone`; không đọc được `payments.provider_response`; khi tạo đánh giá chỉ ghi được `order_item_id`, `rating`, `comment`.

## 4. Hàm RPC

| Hàm | Ai gọi | Việc làm |
| --- | --- | --- |
| `search_products` | Mọi người | Tìm, lọc theo danh mục, giá, vật liệu, thuộc tính; phân trang |
| `get_product_reviews` | Mọi người | Đánh giá đang hiển thị của một sản phẩm, không lộ thông tin đơn |
| `place_order` | Khách hàng | Kiểm tra giỏ, giá, địa chỉ → giữ hàng → tạo đơn, dòng hàng, thanh toán, nhật ký → xóa giỏ |
| `cancel_my_order` | Khách hàng | Hủy đơn của mình ở trạng thái cho phép, trả hàng về kho |
| `confirm_order_received` | Khách hàng | DELIVERED → COMPLETED |
| `set_default_address` | Khách hàng | Đổi địa chỉ mặc định |
| `admin_update_order_status` | Quản trị viên | Chuyển trạng thái theo bảng hợp lệ, kèm tác động kho và thanh toán |
| `admin_mark_refunded` | Quản trị viên | Đơn CANCELLED + PAID → REFUNDED |
| `admin_adjust_stock` | Quản trị viên | Nhập kho / điều chỉnh, luôn ghi nhật ký, chặn độc bản > 1 |
| `admin_set_user_status` | Quản trị viên | Khóa / mở khóa tài khoản |
| `admin_dashboard_stats` | Quản trị viên | Doanh thu, đơn theo trạng thái, bán chạy, khối lượng tái sử dụng |
| `prepare_online_payment` | Chỉ server | Gán mã giao dịch mới trước khi chuyển sang cổng |
| `record_payment_result` | Chỉ server | Ghi kết quả thanh toán, gọi lặp lại vẫn an toàn |
| `expire_unpaid_orders` | pg_cron | Hủy đơn trực tuyến quá hạn, trả hàng về kho |
| `auto_complete_orders` | pg_cron | Đơn giao quá N ngày → COMPLETED |

Mã lỗi nghiệp vụ (ví dụ `OUT_OF_STOCK`, `PRICE_CHANGED`) được đổi thành tiếng Việt ở `frontend/src/lib/errors.js`.

## 5. Các luồng chính

**Đăng ký.** Frontend gọi `supabase.auth.signUp` (gửi kèm họ tên). Trigger `on_auth_user_created` tạo `profiles` với vai trò CUSTOMER và tạo `carts`. Vai trò không bao giờ lấy từ dữ liệu client gửi.

**Thêm vào giỏ.** Frontend ghi thẳng `cart_items`. RLS bảo đảm đúng giỏ của mình; trigger chặn sản phẩm không ACTIVE và sản phẩm độc bản số lượng > 1. Giỏ không giữ hàng.

**Đặt hàng** (`place_order`, một transaction):

1. Kiểm tra đăng nhập, tài khoản ACTIVE, phương thức thanh toán, địa chỉ thuộc khách.
2. Khóa các sản phẩm trong giỏ, tính lại tổng; khác tổng khách đang thấy → `PRICE_CHANGED`.
3. Giữ hàng từng sản phẩm theo `product_id` tăng dần: tăng `reserved` chỉ khi `on_hand − reserved ≥ q`. Một sản phẩm không đủ → `OUT_OF_STOCK`, rollback toàn bộ.
4. Tạo `orders` (snapshot địa chỉ, `payment_deadline` nếu ONLINE), `order_items` (snapshot tên, giá, khối lượng), `payments` (UNPAID), nhật ký kho RESERVE, lịch sử trạng thái.
5. Xóa giỏ. Trả mã đơn.

Sản phẩm độc bản đi qua đúng luồng này với tồn = 1: người thứ hai bị chặn ở bước 3.

**Thanh toán trực tuyến.** Sau khi có mã đơn, frontend gọi Edge Function `payment-create`. Function xác minh đơn thuộc người gọi (dùng client của chính họ, RLS áp dụng), gọi `prepare_online_payment` bằng quyền server, rồi tạo URL theo cổng. Cổng gọi về `payment-callback`; function kiểm tra chữ ký rồi gọi `record_payment_result`. Tiền về sau khi đơn đã hết hạn thì đơn ở trạng thái CANCELLED + PAID và nằm trong danh sách cần hoàn tiền.

**Hết hạn thanh toán.** pg_cron chạy `expire_unpaid_orders` mỗi phút: đơn ONLINE chưa PAID quá `payment_deadline` → CANCELLED, trả hàng về kho.

**Hủy đơn.** Khách gọi `cancel_my_order` (trạng thái cho phép lấy từ `store_settings`); admin dùng `admin_update_order_status` với CANCELLED. Cả hai khóa dòng đơn rồi dùng chung hàm nội bộ `private.cancel_order`: giảm `reserved`, ghi RELEASE, ghi lịch sử. Hủy lần hai bị chặn vì trạng thái không còn hợp lệ.

**Admin xử lý đơn.** `admin_update_order_status` chỉ cho các bước: PENDING → CONFIRMED/CANCELLED; CONFIRMED → PROCESSING/CANCELLED; PROCESSING → SHIPPING/CANCELLED; SHIPPING → DELIVERED; DELIVERED → COMPLETED. Đơn ONLINE phải PAID mới CONFIRMED. SHIPPING trừ `on_hand` và `reserved` (SHIP). DELIVERED với COD đặt payment = PAID.

**Đánh giá.** Khách ghi `reviews` với `order_item_id`. Policy chỉ cho phép khi dòng hàng thuộc đơn của chính họ và đơn đã DELIVERED/COMPLETED; UNIQUE `order_item_id` chặn đánh giá hai lần.

**Chatbot.** Edge Function `chatbot` tạo client bằng phiên của người gọi, nên mọi truy vấn của các hàm công cụ đều chịu RLS. Hàm tra đơn không nhận `user_id`: dù mô hình AI có hỏi đơn của người khác, database cũng chỉ trả đơn của người đang đăng nhập. Khách chưa đăng nhập nhận `LOGIN_REQUIRED`. LLM lỗi hoặc chưa cấu hình → câu trả lời dự phòng.

**Thêm sản phẩm (admin).** Sản phẩm mới bắt buộc là DRAFT; trigger tạo dòng `inventories` = 0. Admin nhập thuộc tính (trigger kiểm tra thuộc danh mục, đúng kiểu), vật liệu, ảnh (Storage, chỉ admin tải lên), rồi nhập kho bằng `admin_adjust_stock`. Chuyển ACTIVE chỉ thành công khi đủ thuộc tính bắt buộc và có ít nhất một ảnh.

## 6. Biến môi trường và secret

| Biến | Đặt ở đâu | Công khai? |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | `frontend/.env` | Có |
| `ALLOWED_ORIGIN` | `supabase secrets set` | Không |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | `supabase secrets set` | Không |
| `PAYMENT_PROVIDER`, `PAYMENT_MERCHANT_ID`, `PAYMENT_SECRET`, `PAYMENT_RETURN_URL` | `supabase secrets set` | Không |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase tự cấp cho Edge Functions | Không, không bao giờ đưa vào frontend |

## 7. Cấp quyền quản trị viên

Không có tài khoản admin mặc định. Đăng ký tài khoản bình thường, rồi chạy trong **SQL Editor** của Supabase (quyền chủ dự án):

```sql
update public.profiles set role = 'ADMIN' where email = 'email-cua-ban@example.com';
```

Client không tự đổi được `role` vì không có quyền cột này.

## 8. Còn cần quyết định

| Việc | Ảnh hưởng |
| --- | --- |
| Nhà cung cấp LLM | Cài đặt `supabase/functions/_shared/llm.js` |
| Cổng thanh toán thử nghiệm | Cài đặt `payment-create`, `payment-callback` |
| Phí giao hàng thật | `store_settings.shipping_fee` (seed đang để 30.000đ làm ví dụ) |
| Bật xác nhận email khi đăng ký | Cài đặt Auth trên Dashboard; trang đăng ký đã xử lý cả hai trường hợp |
| Giới hạn số lần gọi chatbot | Hiện chưa có; khách chưa đăng nhập gọi được nên cần chặn lạm dụng trước khi demo công khai |
| Bật pg_cron | Không bật thì đơn quá hạn không tự hủy |
