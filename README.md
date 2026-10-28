# GOM – Website mua bán sản phẩm tái chế và handmade trực tuyến

Đồ án tốt nghiệp. Repo chứa tài liệu phân tích thiết kế và mã nguồn.

**Công nghệ:** HTML5, CSS3, JavaScript (không framework), Tailwind CSS v4, Vite (dev server và build), Supabase (PostgreSQL, Auth, Storage, Edge Functions).

## Cấu trúc thư mục

```
gom/
├── docs/
│   ├── de-cuong/               # Đề cương ĐATN
│   ├── diagrams/               # Use Case, tuần tự, hoạt động, ERD (.puml + ảnh)
│   ├── supabase-design.md      # Kiến trúc, quyền, luồng dữ liệu trên Supabase
│   └── database-design.md      # (xuất từ tài liệu thiết kế CSDL, dạng Markdown)
├── frontend/
│   ├── *.html, admin/*.html    # Mỗi trang 1 file HTML
│   ├── .env.example            # Biến môi trường CÔNG KHAI
│   └── src/
│       ├── app.js              # Khởi tạo chung mọi trang: layout, kiểm tra đăng nhập, xử lý lỗi
│       ├── config/             # env.js, site.js (thương hiệu), constants.js (trạng thái, phân trang)
│       ├── lib/                # supabase.js (client duy nhất), dom.js, format.js, errors.js, events.js
│       ├── services/           # MỌI lệnh gọi Supabase; không đụng tới DOM
│       ├── components/         # ui/, common/, layout/, product/, chat/, auth/, home/ – hàm trả về phần tử DOM
│       ├── pages/              # Logic riêng của từng trang
│       └── styles/main.css     # Tailwind + design tokens (bảng màu nâu – be, đặt tên brand / cream / earth / stone)
└── supabase/
    ├── migrations/             # Schema, trigger, RLS, hàm RPC, storage (chạy theo thứ tự)
    ├── seed.sql                # Danh mục, thuộc tính, vật liệu, FAQ mẫu (không có admin mặc định)
    ├── cron.sql                # Lịch chạy định kỳ (cần bật pg_cron)
    ├── config.functions.toml   # Đoạn cấu hình cần thêm vào config.toml
    └── functions/              # Edge Functions: chatbot, payment-create, payment-callback
```

### Quy ước code

- `services/`, `lib/`, `config/` **không dùng DOM**. Khi chuyển sang React, các thư mục này dùng lại nguyên vẹn; chỉ `components/` và `pages/` phải viết lại.
- Nội dung động luôn hiển thị qua `el()` trong `lib/dom.js` (dùng `textContent`). Không dùng `innerHTML` với dữ liệu người dùng.
- Class Tailwind viết đầy đủ, không ghép chuỗi (ví dụ `bg-brand-700`, không viết `bg-${color}-700`), vì Tailwind chỉ nhận diện được class viết nguyên.
- Mọi thao tác bất đồng bộ có đủ 4 trạng thái: đang tải, thành công, rỗng, lỗi. Nút gửi dùng `runWithLoading` để chặn bấm nhiều lần.

## Trạng thái

- [x] Đề cương, thiết kế CSDL, biểu đồ UML
- [x] Thiết kế Supabase: schema, RLS, hàm nghiệp vụ, storage
- [x] Khung frontend: layout, component dùng chung, trang chủ, danh sách và chi tiết sản phẩm, đăng nhập, đăng ký
- [x] Trang người dùng: Giới thiệu, tab Tái chế / Handmade, Yêu thích, quên / đặt lại mật khẩu
- [x] Giỏ hàng, thanh toán (COD), đơn hàng của tôi, chi tiết đơn, tài khoản (hồ sơ, sổ địa chỉ, đổi mật khẩu)
- [ ] Đánh giá sản phẩm sau khi nhận hàng, trái tim yêu thích trên thẻ sản phẩm
- [ ] Trang quản trị (khung trang đã có)
- [ ] Chatbot: chọn nhà cung cấp LLM, cài đặt `supabase/functions/_shared/llm.js`
- [ ] Thanh toán trực tuyến: chọn cổng, cài đặt `payment-create`, `payment-callback`

## Nhật ký thay đổi

Quy ước: **mỗi lần Claude sửa code hoặc tài liệu, ghi thêm một mục ở ĐẦU danh sách dưới đây** (mới nhất trên cùng): thời gian thực (giờ Việt Nam, UTC+7), việc đã làm, các file đã tạo / sửa. Đọc mục này trước khi bắt đầu sửa tiếp để biết hiện trạng.

- **2026-10-29 05:01** – Trong hộp thoại đăng nhập, bấm "Đăng ký" sẽ đổi sang form đăng ký (Họ tên, Email, Mật khẩu có nút con mắt) ngay trong hộp thoại; thêm nút mũi tên quay lại (góc trái) để về form đăng nhập; trang `/register.html` dùng chung form mới. File mới: `components/auth/RegisterForm.js`. File sửa: `components/auth/LoginDialog.js`, `components/auth/LoginForm.js`, `components/ui/Icon.js`, `pages/register.js`.
- **2026-10-27 02:18** – Thêm mục "Nhật ký thay đổi" này vào README; sửa vài chỗ mô tả đã cũ (tên class màu `leaf-` → `brand-`, thêm thư mục `components/auth/`, `components/home/`). File: `README.md`.
- **2026-10-27 02:10** – Đổi biểu tượng nút xem mật khẩu: con mắt = đang hiện mật khẩu, con mắt gạch chéo = đang che. File: `frontend/src/components/ui/FormField.js`.
- **2026-10-27 02:05** – Bấm icon người dùng khi chưa đăng nhập thì mở thẳng form đăng nhập dạng hộp thoại (đóng bằng bấm ra ngoài, Esc hoặc nút X); form dùng chung với trang `/login.html`; thêm nút con mắt ở ô mật khẩu; đăng nhập Google/Facebook đã viết sẵn nhưng ẩn (bật bằng `socialProviders` trong `config/site.js` sau khi cấu hình Supabase). File mới: `components/auth/LoginForm.js`, `components/auth/LoginDialog.js`. File sửa: `components/layout/Header.js`, `pages/login.js`, `components/ui/FormField.js`, `components/ui/Icon.js`, `services/auth.js`, `config/site.js`.
- **2026-10-26 23:20** – (Hip tự sửa) làm sáng nền header ở đầu trang. File: `components/layout/Header.js`.

*Các mục dưới đây được ghi bổ sung từ lịch sử làm việc; thời gian lấy theo giờ lưu file nên chỉ chính xác tới phút.*

- **2026-10-11 05:52** – Thêm bong bóng chú thích ghim vào các vật trên kệ ở banner, hiện cùng lúc chữ bắt đầu gõ (nội dung chú thích tùy chỉnh trong `CALLOUTS`). File: `components/home/CalloutBubble.js` (mới), `components/home/HeroBanner.js`.
- **2026-10-11 05:48** – Nền header ở đầu trang hơi đục để thấy rõ icon và logo. File: `components/layout/Header.js`.
- **2026-10-11 05:47** – Hiệu ứng banner: logo hiện dần, hai đoạn thông điệp được gõ từng chữ (tắt khi người dùng bật "giảm chuyển động"). File: `components/home/HeroBanner.js`.
- **2026-10-11 05:42** – Thay logo (header dùng phần chữ GOM, banner dùng logo đầy đủ kèm slogan) và slogan thành "Đồ tái chế • Handmade • Giá trị mới". File: `assets/logo.png`, `assets/logo-full.png`, `config/site.js`, `components/home/HeroBanner.js`.
- **2026-10-11 05:12** – Banner trang chủ tràn màn hình dùng ảnh nền dựng sẵn (tường + kệ), thông điệp thương hiệu nằm ở `SITE.message`; bỏ 2 nút "Xem sản phẩm" / "Về GOM". File: `components/home/HeroBanner.js`, `assets/hero-banner.webp`, `pages/home.js`, `app.js` (tùy chọn `fullWidth`), `config/site.js`.
- **2026-10-11 05:04** – Header: nút menu popup (Sản phẩm xổ xuống Giấy / Thủy tinh / Gỗ / Nhựa, Giới thiệu, Giỏ hàng, Yêu thích), kính lúp bấm mới hiện ô tìm kiếm, popup user (Tài khoản, Đăng xuất). File: `components/layout/Header.js`, `config/site.js`, `config/constants.js`, `pages/products.js`.
- **2026-10-11 04:45** – Đổi bảng màu toàn site sang tông nâu – be (Deep Espresso, Rich Earth, Soft Mushroom, Warm Putty, Bone White) qua design tokens; đổi tên class `leaf-` thành `brand-`. File: `styles/main.css` và các file dùng class màu.

## Cài đặt lần đầu

Cần: Node.js (bản LTS), tài khoản Supabase. Các lệnh dưới đây bạn tự chạy; mỗi lệnh có ghi mục đích.

**1. Cài thư viện frontend** (tạo thư mục `frontend/node_modules`)

```bash
cd frontend
npm install
```

**2. Tạo project trên Supabase Dashboard**, lấy *Project URL* và *Publishable key*, rồi:

```bash
cp .env.example .env      # Windows: copy .env.example .env
```

Mở `frontend/.env` và điền 2 giá trị. Không đặt service role / secret key vào file này.

**3. Đưa schema lên Supabase.** Cách đơn giản nhất: mở **SQL Editor** trên Dashboard, lần lượt chạy nội dung 5 file trong `supabase/migrations/` theo thứ tự tên, rồi chạy `supabase/seed.sql`.
Hoặc dùng Supabase CLI (`npx supabase init`, `npx supabase link`, `npx supabase db push`). Nếu dùng CLI, chép đoạn trong `supabase/config.functions.toml` vào `supabase/config.toml`.

**4. Chạy website ở máy**

```bash
npm run dev               # mở http://localhost:5173
```

**4b. Cho phép link "Quên mật khẩu":** Supabase Dashboard → Authentication → URL Configuration → *Redirect URLs*, thêm `http://localhost:5173/reset-password.html` (và địa chỉ thật khi triển khai).

**5. Tạo tài khoản quản trị:** đăng ký trên website, sau đó chạy trong SQL Editor:

```sql
update public.profiles set role = 'ADMIN' where email = 'email-cua-ban@example.com';
```

**6. (Khi cần) Bật pg_cron** trên Dashboard rồi chạy `supabase/cron.sql`, để đơn thanh toán trực tuyến quá hạn tự hủy.

## Bảo mật – bắt buộc

- Không commit `.env`, `supabase/functions/.env`, API key của LLM, khóa cổng thanh toán, service role key.
- Lỡ đẩy secret lên GitHub: thu hồi và tạo khóa mới ngay. Xóa file thôi không đủ vì secret vẫn còn trong lịch sử commit.
- Quyền thật nằm ở RLS và hàm trong database. Ẩn nút trên giao diện không phải là bảo mật.

## Quy ước Git

- `main`: luôn chạy được. `dev`: gộp chức năng. Mỗi chức năng một nhánh `feature/...` tách từ `dev`.
- Commit nhỏ, mô tả rõ: `feat(cart): ...`, `fix(order): ...`, `docs: ...`.
