## Fix: grants + RLS cho bảng `public.dt_ly_thuyet_nen_tang`

Chạy SQL này trong Supabase SQL Editor (project Sine Art, không phải CINS) nếu
trang `/kien-thuc-nen-tang` trả "không có bài khớp" dù DB đã có data. Nguyên
nhân phổ biến:

- `anon` / `authenticated` thiếu `GRANT SELECT` (RLS policy chỉ active sau khi
  role có base grant).
- RLS đã bật nhưng chưa có policy SELECT cho public.
- Cột `slug` chưa tồn tại / thiếu `UNIQUE`.

```sql
-- (1) Base GRANTS -----------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.dt_ly_thuyet_nen_tang to anon, authenticated;
grant all    on public.dt_ly_thuyet_nen_tang to service_role;

-- (2) RLS policies ----------------------------------------------------------
alter table public.dt_ly_thuyet_nen_tang enable row level security;

drop policy if exists "public read dt_ly_thuyet_nen_tang"
  on public.dt_ly_thuyet_nen_tang;

create policy "public read dt_ly_thuyet_nen_tang"
  on public.dt_ly_thuyet_nen_tang
  for select
  to anon, authenticated
  using (true);

-- (3) Cột `slug` (Option B trong brief §3) ----------------------------------
alter table public.dt_ly_thuyet_nen_tang
  add column if not exists slug text;

create unique index if not exists dt_ly_thuyet_slug_unique
  on public.dt_ly_thuyet_nen_tang(slug)
  where slug is not null;

-- (4) Backfill slug cho các row đang NULL -----------------------------------
create extension if not exists unaccent;

update public.dt_ly_thuyet_nen_tang
set slug = regexp_replace(
  regexp_replace(
    lower(unaccent(coalesce(ten_ly_thuyet, 'bai-' || id::text))),
    '[^a-z0-9]+', '-', 'g'
  ),
  '(^-+|-+$)', '', 'g'
)
where slug is null or btrim(slug) = '';

-- (5) Sequence (nếu id là SERIAL / IDENTITY) --------------------------------
do $$
declare
  seq_name text;
begin
  for seq_name in
    select pg_get_serial_sequence('public.dt_ly_thuyet_nen_tang', column_name)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dt_ly_thuyet_nen_tang'
      and pg_get_serial_sequence('public.dt_ly_thuyet_nen_tang', column_name) is not null
  loop
    execute format(
      'grant usage, select, update on sequence %s to anon, authenticated, service_role',
      seq_name
    );
  end loop;
end $$;

-- (6) Tags GIN index (brief §1) ---------------------------------------------
create index if not exists idx_dt_ly_thuyet_tags
  on public.dt_ly_thuyet_nen_tang using gin(tags);
```

## Smoke test (sau khi chạy)

```sql
set role anon;
select id, slug, ten_ly_thuyet, thuoc_nhom
from public.dt_ly_thuyet_nen_tang
order by id;
reset role;
```

Nếu lệnh này ra >= 1 row → Next.js sẽ thấy data. Nếu vẫn 0 → check lại policy
(`using (true)` không bị lọc) hoặc bảng trống.

## Debug Next.js side

Dev console (terminal `next dev`) giờ sẽ log `[ly-thuyet]` prefix nếu query
thất bại hoặc trả 0 rows. Ví dụ:

- `createStaticClient() returned null — thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY?`
  → thiếu env. Kiểm tra `.env.local`.
- `fetchAllLyThuyet primary query failed, retrying without slug column: ...`
  → schema cache chưa refresh hoặc thiếu column. Chạy SQL trên.
- `fetchAllLyThuyet returned 0 rows — table trống hoặc anon SELECT bị RLS chặn.`
  → RLS policy chưa đúng. Chạy SQL trên.
