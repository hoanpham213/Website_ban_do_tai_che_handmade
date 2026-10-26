# Biểu đồ phân tích thiết kế – GOM

Mỗi biểu đồ gồm file nguồn `.puml` (PlantUML) và ảnh đã render (`.png` để chèn vào báo cáo, `.svg` để phóng to không vỡ nét). Muốn sửa thì sửa file `.puml`, rồi render lại. Không sửa trực tiếp file ảnh.

## Danh sách

| Loại | File | Nội dung |
| --- | --- | --- |
| Use Case | `usecase/uc-00-tong-quat` | Use Case tổng quát toàn hệ thống |
| Use Case | `usecase/uc-01-tai-khoan` | Đăng ký, đăng nhập, hồ sơ, địa chỉ |
| Use Case | `usecase/uc-02-mua-hang` | Giỏ hàng, đặt hàng, thanh toán, theo dõi, hủy, đánh giá |
| Use Case | `usecase/uc-03-quan-tri-san-pham-kho` | Danh mục, thuộc tính, sản phẩm, vật liệu, tồn kho |
| Use Case | `usecase/uc-04-quan-tri-don-thong-ke` | Đơn hàng, người dùng, FAQ, thống kê |
| Use Case | `usecase/uc-05-chatbot` | Chatbot AI tư vấn |
| Tuần tự | `sequence/sd-01-dang-ky` | Đăng ký |
| Tuần tự | `sequence/sd-02-dang-nhap` | Đăng nhập |
| Tuần tự | `sequence/sd-03-them-gio-hang` | Thêm vào giỏ |
| Tuần tự | `sequence/sd-04-dat-hang` | Đặt hàng, giữ hàng chống bán vượt |
| Tuần tự | `sequence/sd-05-thanh-toan-truc-tuyen` | Callback cổng thanh toán |
| Tuần tự | `sequence/sd-06-huy-don` | Khách hủy đơn |
| Tuần tự | `sequence/sd-07-danh-gia` | Đánh giá sản phẩm |
| Tuần tự | `sequence/sd-08-chatbot-tra-cuu-don` | Chatbot tra cứu đơn (function calling) |
| Hoạt động | `activity/ad-01-dat-hang` | Đặt hàng |
| Hoạt động | `activity/ad-02-xu-ly-don-hang` | Vòng đời xử lý đơn |
| Hoạt động | `activity/ad-03-huy-don` | Hủy đơn, hoàn tiền |
| Hoạt động | `activity/ad-04-them-san-pham` | Thêm sản phẩm và đăng bán |
| Hoạt động | `activity/ad-05-chatbot` | Chatbot trả lời câu hỏi |
| ERD | `erd/erd-tong-quan` | Toàn bộ bảng và quan hệ (không cột) |
| ERD | `erd/erd-chi-tiet` | Toàn bộ bảng, đủ cột, PK/FK |
| ERD | `erd/erd-nhom-san-pham` | Nhóm sản phẩm, thuộc tính động, vật liệu, kho |
| ERD | `erd/erd-nhom-mua-hang` | Nhóm giỏ, đơn, thanh toán, kho, đánh giá |

Trong báo cáo nên dùng ERD theo nhóm (dễ đọc khi in), và để ERD chi tiết ở phụ lục.

## Sửa và render lại

- `_style.puml`: màu sắc, font dùng chung.
- `erd/_entities.puml`, `erd/_relations.puml`: định nghĩa bảng và quan hệ dùng chung cho `erd-tong-quan` và `erd-chi-tiet`. Hai file ERD theo nhóm được sinh từ đây, nên khi đổi cột thì sửa cả các file nhóm.

**Cách 1 – VS Code (dễ nhất):** cài extension *PlantUML* (jebbs.plantuml), cài Java và Graphviz. Mở file `.puml`, bấm `Alt + D` để xem trước, chuột phải → *Export Current Diagram* để xuất ảnh.

**Cách 2 – dòng lệnh:** tải `plantuml.jar` từ trang phát hành của PlantUML, cài Java và Graphviz, rồi chạy trong thư mục này:

```bash
java -jar plantuml.jar -charset UTF-8 -tpng "**/*.puml"
java -jar plantuml.jar -charset UTF-8 -tsvg "**/*.puml"
```

Các file bắt đầu bằng `_` là file dùng chung để `!include`, PlantUML sẽ bỏ qua khi không có `@startuml`.
