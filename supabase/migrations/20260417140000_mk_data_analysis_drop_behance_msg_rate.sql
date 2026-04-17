-- Gỡ cột Behance + «Tỉ lệ CĐ tin nhắn» khỏi mk_data_analysis (đồng bộ với admin-report-mkt).
-- Chạy trên Supabase: SQL Editor hoặc `supabase db push` / migration pipeline.

ALTER TABLE public.mk_data_analysis
  DROP COLUMN IF EXISTS ti_le_chuyen_doi_tin_nhan,
  DROP COLUMN IF EXISTS be_project_views,
  DROP COLUMN IF EXISTS be_appreciations,
  DROP COLUMN IF EXISTS be_followers;
