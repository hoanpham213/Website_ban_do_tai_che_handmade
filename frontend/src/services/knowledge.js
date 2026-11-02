// Đọc FAQ cho khách (RLS chỉ cho khách thấy mục đang bật). Admin sửa ở /admin/knowledge.html.
import { supabase } from '../lib/supabase.js';

/** Các mục FAQ đang bật, theo thứ tự sort_order. Bỏ mục còn nội dung giữ chỗ "[Cần cập nhật]". */
export async function getFaqEntries(limit = 5) {
  const { data, error } = await supabase
    .from('knowledge_entries')
    .select('id, title, content')
    .eq('type', 'FAQ')
    .eq('is_active', true)
    .order('sort_order')
    .limit(limit + 10);
  if (error) throw error;
  return data.filter((row) => !row.content.trim().startsWith('[Cần cập nhật]')).slice(0, limit);
}
