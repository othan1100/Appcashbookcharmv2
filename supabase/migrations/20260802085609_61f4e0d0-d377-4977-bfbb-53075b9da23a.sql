
-- 1. Fix mutable search_path on handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id, display_name, business_name, country, city, email, avatar_url,
    plan_type, plan_updated_at, trial_ends_at, trial_plan
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'display_name'
    ),
    NEW.raw_user_meta_data ->> 'business_name',
    NEW.raw_user_meta_data ->> 'country',
    NEW.raw_user_meta_data ->> 'city',
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url',
    'starter', now(), now() + interval '14 days', 'pro'
  );

  INSERT INTO public.cashbooks (user_id, name, description)
  VALUES (NEW.id, 'Main Cashbook', 'Default cashbook for all transactions');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, billing_cycle, status, start_date, expire_date)
  VALUES (NEW.id, 'starter', 'trial', 'trial', now(), now() + interval '14 days');

  RETURN NEW;
END;
$function$;

-- 2. Revoke anon/public EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_member_role(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.team_member_role(uuid, uuid) TO authenticated, service_role;

-- 3. Restrict avatar reads to the owner
DROP POLICY IF EXISTS "Avatars are readable by authenticated users" ON storage.objects;
CREATE POLICY "Users read own avatar"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
