// Đổi lỗi từ Supabase / hàm RPC thành thông báo dễ hiểu.
// Mã lỗi nghiệp vụ đến từ `raise exception '...'` trong supabase/migrations.

const MESSAGES = {
  NOT_AUTHENTICATED: 'Vui lòng đăng nhập để tiếp tục.',
  ACCOUNT_LOCKED: 'Tài khoản của bạn đang bị khóa. Vui lòng liên hệ cửa hàng.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  CART_EMPTY: 'Giỏ hàng đang trống.',
  PRODUCT_UNAVAILABLE: 'Có sản phẩm trong giỏ không còn được bán. Vui lòng xem lại giỏ hàng.',
  OUT_OF_STOCK: 'Có sản phẩm vừa hết hàng. Vui lòng điều chỉnh giỏ hàng.',
  PRICE_CHANGED: 'Giá hoặc phí giao hàng vừa thay đổi. Vui lòng kiểm tra lại tổng tiền.',
  ADDRESS_INVALID: 'Địa chỉ giao hàng không hợp lệ.',
  INVALID_PAYMENT_METHOD: 'Phương thức thanh toán không hợp lệ.',
  UNIQUE_MAX_ONE: 'Sản phẩm độc bản chỉ mua được 1 chiếc.',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
  ORDER_NOT_CANCELLABLE: 'Đơn hàng đã được xử lý, không thể hủy.',
  INVALID_TRANSITION: 'Không thể chuyển đơn sang trạng thái này.',
  ONLINE_ORDER_NOT_PAID: 'Đơn thanh toán trực tuyến chưa được thanh toán.',
  PAYMENT_NOT_ALLOWED: 'Đơn này không thể thanh toán lúc này (có thể đã hết hạn).',
  PAYMENT_NOT_CONFIGURED: 'Thanh toán trực tuyến chưa được cấu hình.',
  PAYMENT_PROVIDER_NOT_IMPLEMENTED: 'Thanh toán trực tuyến đang được phát triển.',
  PRODUCT_INCOMPLETE: 'Sản phẩm thiếu thuộc tính bắt buộc hoặc chưa có ảnh.',
  PRODUCT_MUST_START_AS_DRAFT: 'Sản phẩm mới phải được lưu nháp trước.',
  CHANGE_CATEGORY_REQUIRES_DRAFT: 'Chuyển sản phẩm về nháp trước khi đổi danh mục.',
  UNIQUE_REQUIRES_STOCK_AT_MOST_ONE: 'Sản phẩm độc bản chỉ được có tối đa 1 chiếc trong kho.',
  ATTRIBUTE_NOT_IN_CATEGORY: 'Thuộc tính không thuộc danh mục của sản phẩm.',
  ATTRIBUTE_VALUE_TYPE_MISMATCH: 'Giá trị thuộc tính không đúng kiểu.',
  ATTRIBUTE_SINGLE_VALUE_ONLY: 'Thuộc tính này chỉ được chọn một giá trị.',
  STOCK_BELOW_RESERVED: 'Tồn kho không được thấp hơn số đang giữ cho đơn hàng.',
  INVALID_QUANTITY: 'Số lượng không hợp lệ.',
  REFUND_NOT_ALLOWED: 'Chỉ hoàn tiền cho đơn đã hủy và đã thanh toán.',
  CANNOT_CHANGE_SELF: 'Không thể tự khóa tài khoản của chính mình.',
  INVALID_IMAGE_TYPE: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.',
  IMAGE_TOO_LARGE: 'Ảnh vượt quá 5 MB.',
  INVALID_MESSAGE: 'Tin nhắn trống hoặc quá dài.',
  // Supabase Auth
  invalid_credentials: 'Email hoặc mật khẩu không đúng.',
  email_not_confirmed: 'Vui lòng xác nhận email trước khi đăng nhập.',
  user_already_exists: 'Email này đã được đăng ký.',
  weak_password: 'Mật khẩu quá yếu. Vui lòng dùng ít nhất 8 ký tự.',
  over_request_rate_limit: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  over_email_send_rate_limit: 'Đã gửi quá nhiều email. Vui lòng thử lại sau ít phút.',
  same_password: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
  session_not_found: 'Liên kết đã hết hạn. Vui lòng yêu cầu gửi lại email.',
  // PostgreSQL: vi phạm RLS (ví dụ thêm sản phẩm đã ngừng bán vào yêu thích)
  42501: 'Không thể thực hiện thao tác này.',
};

const DEFAULT_MESSAGE = 'Đã có lỗi xảy ra. Vui lòng thử lại.';

/** Trả về thông báo cho người dùng; ghi chi tiết ra console để lập trình viên xem. */
export function toUserMessage(error) {
  if (!error) return DEFAULT_MESSAGE;
  console.error(error);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Mất kết nối mạng. Vui lòng kiểm tra và thử lại.';
  }
  const key = error.code && MESSAGES[error.code] ? error.code : error.message;
  return MESSAGES[key] ?? DEFAULT_MESSAGE;
}
