-- Fix: permission denied for table dh_moc_lich_tuyen_sinh (PostgREST / service_role).

grant usage on schema public to postgres, service_role;

grant select, insert, update, delete on table public.dh_moc_lich_tuyen_sinh to postgres, service_role;