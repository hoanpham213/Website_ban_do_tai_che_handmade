// Hằng số nghiệp vụ dùng chung. Phải khớp với CHECK trong supabase/migrations.

export const PAGE_SIZE = 12;
export const CHAT_MAX_LENGTH = 500;
export const PRODUCT_IMAGE_BUCKET = 'product-images';

// tone: success | warning | danger | info | neutral (xem components/common/StatusBadge.js)
export const ORDER_STATUS = Object.freeze({
  PENDING: { label: 'Chờ xác nhận', tone: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'info' },
  PROCESSING: { label: 'Đang chuẩn bị', tone: 'info' },
  SHIPPING: { label: 'Đang giao', tone: 'info' },
  DELIVERED: { label: 'Đã giao', tone: 'success' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
});

export const PAYMENT_STATUS = Object.freeze({
  UNPAID: { label: 'Chưa thanh toán', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  FAILED: { label: 'Thanh toán lỗi', tone: 'danger' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'neutral' },
});

export const PAYMENT_METHOD = Object.freeze({
  COD: { label: 'Thanh toán khi nhận hàng' },
  ONLINE: { label: 'Thanh toán trực tuyến (thử nghiệm)' },
});

export const SALE_TYPE = Object.freeze({
  STOCK: { label: 'Theo số lượng' },
  UNIQUE: { label: 'Độc bản' },
});

// Dòng sản phẩm (khóa = giá trị tham số p_line của search_products và ?line= trên URL).
// Một sản phẩm có thể thuộc cả hai.
export const PRODUCT_LINES = Object.freeze({
  recycled: { label: 'Tái chế', description: 'Làm từ vật liệu được tái sử dụng' },
  handmade: { label: 'Handmade', description: 'Làm thủ công bởi người thợ' },
});

// Nhóm vật liệu ở menu Sản phẩm (khóa = giá trị ?material= trên URL).
// keyword: so khớp (không phân biệt hoa thường) với tên vật liệu trong bảng `materials`,
// ví dụ 'giấy' khớp "Giấy tái chế". Thêm nhóm mới: thêm một dòng ở đây và vật liệu tương ứng trong database.
export const MATERIAL_GROUPS = Object.freeze({
  giay: { label: 'Giấy', keyword: 'giấy' },
  'thuy-tinh': { label: 'Thủy tinh', keyword: 'thủy tinh' },
  go: { label: 'Gỗ', keyword: 'gỗ' },
  nhua: { label: 'Nhựa', keyword: 'nhựa' },
});

export const SORT_OPTIONS = Object.freeze([
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
]);
