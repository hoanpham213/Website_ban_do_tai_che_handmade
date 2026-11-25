-- =====================================================================
-- GOM – 0007: Giới hạn số lần gọi chatbot
-- * Edge Function `chatbot` cho khách chưa đăng nhập gọi (verify_jwt = false),
--   mỗi lần gọi có thể tốn tiền LLM -> đếm số lần gọi trong database.
-- * Ba lớp chặn: theo người gọi mỗi phút, theo người gọi mỗi ngày, và tổng cả
--   hệ thống mỗi ngày (trần chi phí, kể cả khi kẻ xấu đổi IP liên tục).
-- * Người gọi = user id (đã đăng nhập) hoặc mã băm của IP (khách). Không lưu IP gốc.
-- * Bảng và hàm chỉ service_role dùng được (Edge Function gọi bằng client quyền cao
--   SAU khi đã xác định người gọi). Trình duyệt không đọc, không ghi được.
-- * Ngày tính theo UTC (đổi ngày lúc 07:00 giờ Việt Nam).
-- =====================================================================

create table public.chat_rate_limits (
  bucket         text        not null,   -- 'm:<người gọi>' | 'd:<người gọi>' | 'g' (toàn hệ thống)
  window_start   timestamptz not null,   -- đầu phút hoặc đầu ngày
  request_count  integer     not null default 0,
  primary key (bucket, window_start)
);

-- Bật RLS và không tạo policy nào: anon / authenticated không có quyền gì
alter table public.chat_rate_limits enable row level security;
revoke all on public.chat_rate_limits from anon, authenticated;

-- Trả về: 'OK' | 'RATE_LIMITED' (quá nhanh) | 'DAILY_LIMIT' (hết lượt ngày) | 'CHAT_BUSY' (cả hệ thống hết lượt ngày)
create or replace function public.consume_chat_quota(
  p_actor           text,
  p_per_minute      integer,
  p_per_day         integer,
  p_global_per_day  integer
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_minute timestamptz := date_trunc('minute', now());
  v_day    timestamptz := date_trunc('day', now());
  v_count  integer;
begin
  if p_actor is null or p_actor = '' then
    raise exception 'INVALID_ACTOR';
  end if;

  -- 1. Theo người gọi, mỗi phút
  insert into public.chat_rate_limits as r (bucket, window_start, request_count)
  values ('m:' || p_actor, v_minute, 1)
  on conflict (bucket, window_start) do update set request_count = r.request_count + 1
  returning r.request_count into v_count;
  if v_count > p_per_minute then return 'RATE_LIMITED'; end if;

  -- 2. Theo người gọi, mỗi ngày
  insert into public.chat_rate_limits as r (bucket, window_start, request_count)
  values ('d:' || p_actor, v_day, 1)
  on conflict (bucket, window_start) do update set request_count = r.request_count + 1
  returning r.request_count into v_count;
  if v_count > p_per_day then return 'DAILY_LIMIT'; end if;

  -- 3. Toàn hệ thống, mỗi ngày (chỉ đếm khi người gọi chưa bị chặn ở trên)
  insert into public.chat_rate_limits as r (bucket, window_start, request_count)
  values ('g', v_day, 1)
  on conflict (bucket, window_start) do update set request_count = r.request_count + 1
  returning r.request_count into v_count;
  if v_count > p_global_per_day then return 'CHAT_BUSY'; end if;

  return 'OK';
end;
$$;

revoke execute on function public.consume_chat_quota(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_chat_quota(text, integer, integer, integer) to service_role;
