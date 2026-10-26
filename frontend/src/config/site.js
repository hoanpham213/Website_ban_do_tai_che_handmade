// Thông tin thương hiệu và điều hướng. Thông tin liên hệ: CẦN CẬP NHẬT.
// Chuỗi rỗng = không hiển thị.

export const SITE = Object.freeze({
  name: 'GOM',
  tagline: 'Đồ tái chế • Handmade • Giá trị mới',
  // Thông điệp thương hiệu hiển thị ở banner trang chủ (mỗi phần tử là một đoạn).
  message: [
    'GOM có ý nghĩa gom góp những giá trị cũ, biến vật liệu cũ thành sản phẩm hữu ích và độc đáo.',
    'GOM nhằm hướng người mua tới các sản phẩm xanh - khuyến khích giảm thiểu rác thải và lan tỏa lối sống xanh.',
  ],
  contact: {
    email: '',
    phone: '',
    address: '',
  },
  // Giới thiệu ngắn hiển thị ở trang chủ và trang Giới thiệu. CẦN CẬP NHẬT theo câu chuyện thật.
  about: {
    mission: 'GOM gom nhặt những vật liệu tưởng như bỏ đi – vải jean cũ, chai nhựa, gỗ pallet – '
      + 'và trao cho chúng một cuộc đời mới qua bàn tay của những người thợ thủ công.',
    values: [
      { title: 'Tái chế có trách nhiệm', text: 'Mỗi sản phẩm ghi rõ vật liệu và khối lượng được tái sử dụng.' },
      { title: 'Làm bằng tay', text: 'Sản phẩm được làm thủ công, nhiều món là độc bản – chỉ có một chiếc.' },
      { title: 'Minh bạch nguồn gốc', text: 'Câu chuyện của từng món đồ được kể lại trên trang sản phẩm.' },
    ],
  },
  // Menu popup (nút ☰). children = mục con hiển thị thụt vào dưới mục cha.
  // key: 'cart' -> hiện thêm số lượng trong giỏ. Giỏ hàng, Yêu thích yêu cầu đăng nhập (trang tự chuyển hướng).
  menu: [
    {
      label: 'Sản phẩm',
      href: '/products.html',
      children: [
        { label: 'Giấy', href: '/products.html?material=giay' },
        { label: 'Thủy tinh', href: '/products.html?material=thuy-tinh' },
        { label: 'Gỗ', href: '/products.html?material=go' },
        { label: 'Nhựa', href: '/products.html?material=nhua' },
      ],
    },
    { label: 'Giới thiệu', href: '/about.html' },
    { label: 'Giỏ hàng', href: '/cart.html', key: 'cart' },
    { label: 'Yêu thích', href: '/favorites.html' },
  ],
  // Popup tài khoản (nút người dùng), khi đã đăng nhập. Mục "Đăng xuất" luôn nằm cuối.
  accountNav: [
    { label: 'Tài khoản', href: '/account.html' },
  ],
  adminNav: [
    { label: 'Tổng quan', href: '/admin/' },
    { label: 'Sản phẩm', href: '/admin/products.html' },
    { label: 'Danh mục & thuộc tính', href: '/admin/categories.html' },
    { label: 'Tồn kho', href: '/admin/inventory.html' },
    { label: 'Đơn hàng', href: '/admin/orders.html' },
    { label: 'Người dùng', href: '/admin/users.html' },
    { label: 'FAQ & chính sách', href: '/admin/knowledge.html' },
  ],
});
