// Các hàm chatbot được phép gọi (function calling).
// Tất cả chạy bằng client của NGƯỜI DÙNG => RLS tự giới hạn dữ liệu:
//   - khách chưa đăng nhập: chỉ đọc sản phẩm ACTIVE, FAQ, chính sách
//   - khách đã đăng nhập: thêm đơn hàng của CHÍNH MÌNH
// Không hàm nào nhận user_id từ mô hình AI.

const MAX_RESULTS = 5;

export const toolDefinitions = [
  {
    name: 'search_products',
    description: 'Tìm sản phẩm đang bán theo từ khóa, khoảng giá. Trả về tối đa 5 sản phẩm.',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        min_price: { type: 'number' },
        max_price: { type: 'number' },
      },
    },
  },
  {
    name: 'get_product_detail',
    description: 'Xem chi tiết một sản phẩm theo slug: giá, vật liệu, thuộc tính, còn hàng.',
    parameters: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
  },
  {
    name: 'search_knowledge',
    description: 'Tìm câu hỏi thường gặp hoặc chính sách cửa hàng theo từ khóa.',
    parameters: { type: 'object', properties: { keyword: { type: 'string' } }, required: ['keyword'] },
  },
  {
    name: 'get_my_orders',
    description: 'Liệt kê 5 đơn hàng gần nhất của người đang đăng nhập.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_my_order_detail',
    description: 'Xem trạng thái một đơn hàng của người đang đăng nhập theo mã đơn.',
    parameters: { type: 'object', properties: { order_code: { type: 'string' } }, required: ['order_code'] },
  },
];

function asText(value, maxLength = 100) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function runTool(name, args, { client, userId }) {
  switch (name) {
    case 'search_products': {
      const { data, error } = await client.rpc('search_products', {
        p_keyword: asText(args?.keyword) || null,
        p_min_price: asNumber(args?.min_price),
        p_max_price: asNumber(args?.max_price),
        p_limit: MAX_RESULTS,
      });
      if (error) throw error;
      return data.map((p) => ({ name: p.name, slug: p.slug, price: p.price, available: p.available }));
    }

    case 'get_product_detail': {
      const { data, error } = await client
        .from('products')
        .select(`name, slug, price, sale_type, description, origin_story,
                 categories ( name ),
                 product_materials ( weight_grams, materials ( name ) ),
                 product_attribute_values ( value_number, value_text, attributes ( name, unit ), attribute_options ( value ) ),
                 inventories ( on_hand, reserved )`)
        .eq('slug', asText(args?.slug))
        .maybeSingle();
      if (error) throw error;
      return data ?? { result: 'NOT_FOUND' };
    }

    case 'search_knowledge': {
      const keyword = asText(args?.keyword, 50).replace(/[%_,()]/g, ' ');
      const { data, error } = await client
        .from('knowledge_entries')
        .select('type, title, content')
        .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
        .limit(MAX_RESULTS);
      if (error) throw error;
      return data;
    }

    case 'get_my_orders':
    case 'get_my_order_detail': {
      if (!userId) return { result: 'LOGIN_REQUIRED' };
      let query = client
        .from('orders')
        .select('order_code, status, total_amount, created_at, payments ( method, status )')
        .order('created_at', { ascending: false })
        .limit(MAX_RESULTS);
      if (name === 'get_my_order_detail') {
        query = query.eq('order_code', asText(args?.order_code, 30));
      }
      const { data, error } = await query;   // RLS chỉ trả đơn của người gọi
      if (error) throw error;
      return data.length > 0 ? data : { result: 'NOT_FOUND' };
    }

    default:
      return { result: 'UNKNOWN_TOOL' };
  }
}
