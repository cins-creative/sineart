-- Bổ sung quyền: lỗi "permission denied for table ag_agent_config" khi app dùng service role / PostgREST.
-- Chạy trên Supabase SQL Editor nếu đã tạo bảng trước đó mà thiếu GRANT.

grant usage on schema public to postgres, service_role;
grant all on table public.ag_agent_config to postgres, service_role;
