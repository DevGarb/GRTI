CREATE OR REPLACE FUNCTION public.tv_notify_ticket_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_row public.tickets;
  v_slug text;
begin
  if (TG_OP = 'DELETE') then
    v_row := OLD;
  else
    v_row := NEW;
    if TG_OP = 'UPDATE' and OLD.status is not distinct from NEW.status
       and OLD.assigned_to is not distinct from NEW.assigned_to
       and OLD.started_at is not distinct from NEW.started_at
       and OLD.closed_at is not distinct from NEW.closed_at
       and OLD.organization_id is not distinct from NEW.organization_id then
      return NEW;
    end if;
  end if;

  select slug into v_slug from public.organizations where id = v_row.organization_id;
  if v_slug is null then
    return case when TG_OP = 'DELETE' then OLD else NEW end;
  end if;

  perform realtime.send(
    jsonb_build_object('id', v_row.id, 'op', TG_OP),
    'ticket_changed',
    'tv:' || v_slug,
    false
  );

  return case when TG_OP = 'DELETE' then OLD else NEW end;
exception when others then
  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$$;

DROP TRIGGER IF EXISTS tv_notify_ticket_changed_trg ON public.tickets;
CREATE TRIGGER tv_notify_ticket_changed_trg
AFTER UPDATE OR DELETE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.tv_notify_ticket_changed();

CREATE OR REPLACE FUNCTION public.tv_notify_task_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_slug text;
  v_org uuid;
begin
  if TG_OP = 'UPDATE' and OLD.status is not distinct from NEW.status then
    return NEW;
  end if;

  v_org := NEW.organization_id;
  if v_org is null then
    select organization_id into v_org from public.projects where id = NEW.project_id;
  end if;

  select slug into v_slug from public.organizations where id = v_org;
  if v_slug is null then
    return NEW;
  end if;

  perform realtime.send(
    jsonb_build_object('id', NEW.id, 'status', NEW.status),
    'task_changed',
    'tv:' || v_slug,
    false
  );

  return NEW;
exception when others then
  return NEW;
end;
$$;

DROP TRIGGER IF EXISTS tv_notify_task_changed_trg ON public.project_tasks;
CREATE TRIGGER tv_notify_task_changed_trg
AFTER INSERT OR UPDATE OF status ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.tv_notify_task_changed();