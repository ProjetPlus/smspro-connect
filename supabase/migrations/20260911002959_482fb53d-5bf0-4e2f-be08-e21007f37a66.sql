
create or replace function public.is_privileged_actor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), current_user) in ('service_role','postgres')
      or private.has_role(auth.uid(), 'admin'::app_role)
$$;

-- PROFILES: block self-service changes to credits / status
create or replace function public.guard_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged_actor() then
    return new;
  end if;
  new.sms_credits := old.sms_credits;
  new.account_status := old.account_status;
  new.phone_verified_at := old.phone_verified_at;
  new.id := old.id;
  return new;
end;
$$;

drop trigger if exists guard_profile_sensitive_fields on public.profiles;
create trigger guard_profile_sensitive_fields
before update on public.profiles
for each row execute function public.guard_profile_sensitive_fields();

-- SIGNUP APPLICATIONS: only admins/system may set review fields
create or replace function public.guard_signup_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged_actor() then
    return new;
  end if;
  new.status := old.status;
  new.admin_notes := old.admin_notes;
  new.documents_validation_status := old.documents_validation_status;
  new.documents_checked_at := old.documents_checked_at;
  new.reviewed_at := old.reviewed_at;
  new.reviewed_by := old.reviewed_by;
  new.credited_at := old.credited_at;
  new.credited_sms := old.credited_sms;
  new.paid_at := old.paid_at;
  new.payment_order_id := old.payment_order_id;
  new.tracking_code := old.tracking_code;
  new.user_id := old.user_id;
  return new;
end;
$$;

drop trigger if exists guard_signup_review_fields on public.signup_applications;
create trigger guard_signup_review_fields
before update on public.signup_applications
for each row execute function public.guard_signup_review_fields();

create or replace function public.guard_signup_insert_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged_actor() then
    return new;
  end if;
  new.status := 'pending';
  new.documents_validation_status := 'pending';
  new.admin_notes := null;
  new.documents_checked_at := null;
  new.reviewed_at := null;
  new.reviewed_by := null;
  new.credited_at := null;
  new.credited_sms := 0;
  new.paid_at := null;
  new.payment_order_id := null;
  return new;
end;
$$;

drop trigger if exists guard_signup_insert_fields on public.signup_applications;
create trigger guard_signup_insert_fields
before insert on public.signup_applications
for each row execute function public.guard_signup_insert_fields();

-- ORDERS: clients may only create pending orders priced from the package
create or replace function public.guard_order_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pkg record;
begin
  if public.is_privileged_actor() then
    return new;
  end if;

  select price_fcfa, sms_volume, active into pkg
  from public.packages where id = new.package_id;

  if pkg is null or not pkg.active then
    raise exception 'Package introuvable ou inactif';
  end if;

  new.status := 'pending';
  new.amount_fcfa := pkg.price_fcfa;
  new.sms_volume := pkg.sms_volume;
  new.provider_transaction_id := null;
  new.provider_payload := null;
  return new;
end;
$$;

drop trigger if exists guard_order_insert on public.orders;
create trigger guard_order_insert
before insert on public.orders
for each row execute function public.guard_order_insert();

create or replace function public.guard_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged_actor() then
    return new;
  end if;
  raise exception 'Modification de commande non autorisée';
end;
$$;

drop trigger if exists guard_order_update on public.orders;
create trigger guard_order_update
before update on public.orders
for each row execute function public.guard_order_update();
