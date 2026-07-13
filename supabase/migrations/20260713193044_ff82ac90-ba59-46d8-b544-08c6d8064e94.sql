
create or replace function public.tv_notify_new_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  select slug into v_slug from public.organizations where id = new.organization_id;
  if v_slug is null then
    return new;
  end if;
  perform realtime.send(
    jsonb_build_object(
      'id', new.id,
      'title', new.title,
      'priority', new.priority,
      'created_at', new.created_at
    ),
    'new_ticket',
    'tv:' || v_slug,
    false
  );
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_tv_notify_new_ticket on public.tickets;
create trigger trg_tv_notify_new_ticket
after insert on public.tickets
for each row execute function public.tv_notify_new_ticket();
