
revoke all on function public.is_privileged_actor() from anon, authenticated;
revoke all on function public.guard_profile_sensitive_fields() from anon, authenticated;
revoke all on function public.guard_signup_review_fields() from anon, authenticated;
revoke all on function public.guard_signup_insert_fields() from anon, authenticated;
revoke all on function public.guard_order_insert() from anon, authenticated;
revoke all on function public.guard_order_update() from anon, authenticated;
