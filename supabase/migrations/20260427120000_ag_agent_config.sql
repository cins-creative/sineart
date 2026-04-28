-- Cấu hình Agent (singleton id = 1): nội dung do tư vấn viên sửa — ghép vào system prompt trong /api/agent-context.
create table if not exists public.ag_agent_config (
  id smallint primary key default 1,
  consultant_instructions text not null default '',
  updated_at timestamptz not null default now(),
  constraint ag_agent_config_singleton check (id = 1)
);

comment on table public.ag_agent_config is 'Singleton agent settings; consultant_instructions appended to core SYSTEM_PROMPT.';

insert into public.ag_agent_config (id, consultant_instructions)
values (1, '')
on conflict (id) do nothing;

alter table public.ag_agent_config enable row level security;

create policy "ag_agent_config_no_direct_anon"
  on public.ag_agent_config
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.ag_agent_config_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ag_agent_config_updated on public.ag_agent_config;
create trigger ag_agent_config_updated
  before update on public.ag_agent_config
  for each row
  execute function public.ag_agent_config_set_updated_at();
