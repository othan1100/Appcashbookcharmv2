ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
        NEW.raw_user_meta_data ->> 'display_name',
        split_part(COALESCE(NEW.email, ''), '@', 1)
      ),
      NEW.raw_user_meta_data ->> 'business_name',
      NEW.raw_user_meta_data ->> 'country',
      NEW.raw_user_meta_data ->> 'city',
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.raw_user_meta_data ->> 'picture'
      ),
      'starter', now(), now() + interval '14 days', 'pro'
    )
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.cashbooks (user_id, name, description)
    VALUES (NEW.id, 'Main Cashbook', 'Default cashbook for all transactions');
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: cashbook insert failed for %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: role insert failed for %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.subscriptions (user_id, plan, billing_cycle, status, start_date, expire_date)
    VALUES (NEW.id, 'starter', 'trial', 'trial', now(), now() + interval '14 days');
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: subscription insert failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;