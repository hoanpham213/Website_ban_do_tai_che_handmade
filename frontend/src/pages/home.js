import { initPage } from '../app.js';
import { el, render } from '../lib/dom.js';
import { getBestSellingProducts, getMaterials, searchProducts } from '../services/products.js';
import { HeroBanner } from '../components/home/HeroBanner.js';
import { ProductShowcase } from '../components/home/ProductShowcase.js';
import { SupportSection } from '../components/home/SupportSection.js';
import { MATERIAL_GROUPS } from '../config/constants.js';

// Thứ tự: Banner → Bán chạy → Sản phẩm tiêu biểu theo vật liệu → Hỗ trợ.
initPage({
  title: 'Trang chủ',
  fullWidth: true,
  render: (main) => {
    // Bán chạy theo doanh số thật (hàm get_best_selling_products, migration 0008).
    // Khi chưa có đơn nào, thứ tự giống "mới nhất".
    const bestSellers = ProductShowcase({
      id: 'best-sellers-title',
      title: 'Sản phẩm bán chạy',
      href: '/products.html',
      emptyMessage: 'Cửa hàng đang chuẩn bị những món đồ đầu tiên.',
      loadItems: () => getBestSellingProducts(4),
    });

    // Danh sách vật liệu chỉ tải một lần, dùng chung cho cả 4 khu.
    let materialsPromise = null;
    const loadMaterials = () => {
      materialsPromise ??= getMaterials().catch((error) => { materialsPromise = null; throw error; });
      return materialsPromise;
    };

    const materialSections = Object.entries(MATERIAL_GROUPS).map(([key, group]) => ProductShowcase({
      id: `material-${key}-title`,
      title: group.label,
      href: group.page ?? `/products.html?material=${key}`,
      hideWhenEmpty: true,
      loadItems: async () => {
        const keyword = group.keyword.normalize('NFC').toLowerCase();
        const materialIds = (await loadMaterials())
          .filter((m) => m.name.normalize('NFC').toLowerCase().includes(keyword))
          .map((m) => m.id);
        // Không có vật liệu khớp: không được bỏ lọc (sẽ hiện nhầm toàn bộ sản phẩm)
        if (materialIds.length === 0) return [];
        return (await searchProducts({ materialIds, sort: 'newest', limit: 4 })).items;
      },
    }));

    render(main,
      HeroBanner(),
      el('div', { className: 'page-container py-8' }, [bestSellers, ...materialSections, SupportSection()]),
    );
  },
});
