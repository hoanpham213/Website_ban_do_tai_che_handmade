import { el } from '../../lib/dom.js';

/**
 * Gom giá trị thuộc tính của sản phẩm theo từng thuộc tính (thuộc tính nhiều giá trị như "Màu sắc" gộp lại).
 * values: product_attribute_values kèm attributes(code, name, unit) và attribute_options(value).
 * @returns {Array<{ name: string, values: string[] }>}
 */
export function groupAttributeValues(values) {
  const groups = new Map();
  for (const item of values ?? []) {
    const attribute = item.attributes;
    if (!attribute) continue;
    const hasNumber = item.value_number !== null && item.value_number !== undefined;
    const text = item.attribute_options?.value
      ?? (hasNumber ? `${Number(item.value_number).toLocaleString('vi-VN')}${attribute.unit ? ` ${attribute.unit}` : ''}` : item.value_text);
    if (!text) continue;
    const group = groups.get(attribute.code) ?? { name: attribute.name, values: [] };
    group.values.push(text);
    groups.set(attribute.code, group);
  }
  return [...groups.values()];
}

/** Bảng "Thông tin sản phẩm" (màu sắc, kích thước, tình trạng...). Không có thuộc tính nào thì không hiển thị. */
export function ProductAttributes({ values }) {
  const groups = groupAttributeValues(values);
  if (groups.length === 0) return null;
  return el('section', { attrs: { 'aria-labelledby': 'product-attributes-title' } }, [
    el('h2', { className: 'font-semibold text-stone-900', text: 'Thông tin sản phẩm', attrs: { id: 'product-attributes-title' } }),
    el('dl', { className: 'mt-2 divide-y divide-cream-200 rounded-xl bg-white ring-1 ring-cream-200' }, groups.map((group) =>
      el('div', { className: 'flex gap-3 px-4 py-2 text-sm' }, [
        el('dt', { className: 'w-28 shrink-0 text-stone-500', text: group.name }),
        el('dd', { className: 'text-stone-800', text: group.values.join(', ') }),
      ]))),
  ]);
}
