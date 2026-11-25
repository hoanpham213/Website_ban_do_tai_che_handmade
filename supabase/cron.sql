-- =====================================================================
-- GOM – Lịch chạy định kỳ (KHÔNG nằm trong migrations, chạy tay khi đã sẵn sàng)
-- Bước 1: bật extension pg_cron trên Supabase Dashboard (mục Integrations > Cron).
-- Bước 2: chạy file này trong SQL Editor.
-- =====================================================================

-- Mỗi phút: hủy đơn thanh toán trực tuyến quá hạn, trả hàng về kho
select cron.schedule('gom-expire-unpaid-orders', '* * * * *',
  $$ select public.expire_unpaid_orders(); $$);

-- Mỗi giờ: tự hoàn thành đơn đã giao quá số ngày cấu hình
select cron.schedule('gom-auto-complete-orders', '0 * * * *',
  $$ select public.auto_complete_orders(); $$);

-- Mỗi ngày 03:30 (UTC): xóa bộ đếm giới hạn chatbot đã quá 2 ngày (cần migration 0007)
select cron.schedule('gom-cleanup-chat-rate-limits', '30 3 * * *',
  $$ delete from public.chat_rate_limits where window_start < now() - interval '2 days'; $$);
