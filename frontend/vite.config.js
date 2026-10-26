import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

// Website nhiều trang (multi-page): mỗi trang là một file HTML.
// Thêm trang mới: tạo file .html và thêm tên vào danh sách này.
const pages = [
  // Trang người dùng
  'index', 'about', 'products', 'product', 'favorites', 'cart', 'checkout',
  'login', 'register', 'forgot-password', 'reset-password',
  'account', 'orders', 'order',
  // Trang quản trị
  'admin/index', 'admin/products', 'admin/categories', 'admin/inventory',
  'admin/orders', 'admin/users', 'admin/knowledge',
];

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page.replace('/', '-'), resolve(root, `${page}.html`)])),
    },
  },
});
