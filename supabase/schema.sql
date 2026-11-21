-- Execute este arquivo no SQL Editor do seu projeto Supabase.
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  attending boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references public.rsvps(id) on delete cascade,
  name text not null,
  photo_url text not null,
  created_at timestamptz not null default now()
);

alter table public.rsvps enable row level security;
alter table public.attendees enable row level security;

-- O público só pode visualizar o mural; inserções são feitas pela função RPC.
drop policy if exists "Public can read attendees" on public.attendees;
create policy "Public can read attendees" on public.attendees for select to anon, authenticated using (true);

create or replace function public.submit_rsvp(
  p_name text,
  p_phone text,
  p_attending boolean,
  p_attendees jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_rsvp uuid;
  attendee jsonb;
  current_count integer;
  requested_count integer;
begin
  if length(trim(coalesce(p_name,''))) < 2 then
    raise exception 'Informe seu nome completo.';
  end if;

  requested_count := case when p_attending then jsonb_array_length(coalesce(p_attendees,'[]'::jsonb)) else 0 end;
  if p_attending and (requested_count < 1 or requested_count > 3) then
    raise exception 'Você pode confirmar sua presença com até dois acompanhantes.';
  end if;

  -- Evita que duas confirmações simultâneas ultrapassem os 30 lugares.
  perform pg_advisory_xact_lock(2201082027);
  select count(*) into current_count from public.attendees;
  if p_attending and current_count + requested_count > 30 then
    raise exception 'A mesa já está completa. Entre em contato com os organizadores.';
  end if;

  insert into public.rsvps(name,phone,attending)
  values(trim(p_name),nullif(trim(coalesce(p_phone,'')),''),p_attending)
  returning id into new_rsvp;

  if p_attending then
    for attendee in select * from jsonb_array_elements(p_attendees)
    loop
      if length(trim(coalesce(attendee->>'name',''))) < 2 or coalesce(attendee->>'photo_url','') = '' then
        raise exception 'Cada pessoa precisa de nome e foto.';
      end if;
      insert into public.attendees(rsvp_id,name,photo_url)
      values(new_rsvp,trim(attendee->>'name'),attendee->>'photo_url');
    end loop;
  end if;
  return jsonb_build_object('rsvp_id',new_rsvp,'attendees_added',requested_count);
end;
$$;

revoke all on function public.submit_rsvp(text,text,boolean,jsonb) from public;
grant execute on function public.submit_rsvp(text,text,boolean,jsonb) to anon, authenticated;

-- Bucket público para que as fotos do mural possam ser exibidas.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('guest-photos','guest-photos',true,3145728,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "Anyone can upload guest photos" on storage.objects;
create policy "Anyone can upload guest photos" on storage.objects
for insert to anon, authenticated with check (bucket_id = 'guest-photos');

drop policy if exists "Anyone can view guest photos" on storage.objects;
create policy "Anyone can view guest photos" on storage.objects
for select to anon, authenticated using (bucket_id = 'guest-photos');