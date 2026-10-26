// Đọc danh mục, sản phẩm. RLS chỉ trả sản phẩm ACTIVE cho khách.
import { supabase } from '../lib/supabase.js';
import { PAGE_SIZE, PRODUCT_IMAGE_BUCKET } from '../config/constants.js';

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('sort_order');
  if (error) throw error;
  return data;
}

/** Bộ lọc thuộc tính của một danh mục (chỉ thuộc tính is_filterable). */
export async function getCategoryFilters(categoryId) {
  const { data, error } = await supabase
    .from('category_attributes')
    .select('sort_order, attributes ( id, code, name, data_type, unit, attribute_options ( id, value, sort_order ) )')
    .eq('category_id', categoryId)
    .eq('is_filterable', true)
    .order('sort_order');
  if (error) throw error;
  return data.map((row) => row.attributes);
}

export async function getMaterials() {
  const { data, error } = await supabase.from('materials').select('id, name').order('name');
  if (error) throw error;
  return data;
}

/**
 * Tìm kiếm có phân trang. Trả { items, total }.
 * @param {{ line?: 'recycled'|'handmade'|null, categoryId?: number, keyword?: string, minPrice?: number,
 *           maxPrice?: number, materialIds?: number[], optionIds?: number[], sort?: string, page?: number }} params
 */
export async function searchProducts(params = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const { data, error } = await supabase.rpc('search_products', {
    p_category_id: params.categoryId ?? null,
    p_keyword: params.keyword?.trim() || null,
    p_min_price: params.minPrice ?? null,
    p_max_price: params.maxPrice ?? null,
    p_material_ids: params.materialIds?.length ? params.materialIds : null,
    p_option_ids: params.optionIds?.length ? params.optionIds : null,
    p_sort: params.sort ?? 'newest',
    p_limit: params.limit ?? PAGE_SIZE,
    p_offset: (page - 1) * (params.limit ?? PAGE_SIZE),
    p_line: params.line ?? null,
  });
  if (error) throw error;
  return { items: data, total: data.length > 0 ? Number(data[0].total_count) : 0 };
}

export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select(`id, name, slug, price, sale_type, is_recycled, is_handmade, description, origin_story,
             categories ( id, name, slug ),
             product_images ( storage_path, alt_text, sort_order, is_primary ),
             product_materials ( weight_grams, materials ( id, name ) ),
             product_attribute_values ( value_number, value_text,
               attributes ( code, name, unit ), attribute_options ( value ) ),
             inventories ( on_hand, reserved )`)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProductReviews(productId) {
  const { data, error } = await supabase.rpc('get_product_reviews', { p_product_id: productId });
  if (error) throw error;
  return data;
}

export function getImageUrl(storagePath) {
  if (!storagePath) return null;
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

/** Đường dẫn ảnh chính của sản phẩm (ảnh is_primary, sau đó theo sort_order). */
export function getPrimaryImagePath(product) {
  const images = [...(product?.product_images ?? [])]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  return images[0]?.storage_path ?? null;
}

/** Số lượng còn bán được = tồn thực tế - đang giữ. */
export function getAvailable(product) {
  const inv = Array.isArray(product.inventories) ? product.inventories[0] : product.inventories;
  return inv ? Math.max(0, inv.on_hand - inv.reserved) : 0;
}
