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
