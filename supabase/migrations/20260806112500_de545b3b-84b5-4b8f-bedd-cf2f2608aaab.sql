-- 1. Pricing
UPDATE public.pricing_plans SET price = 5.99 WHERE lower(coalesce(code, name)) = 'pro' AND billing_cycle = 'monthly';
UPDATE public.pricing_plans SET price = 45.99 WHERE lower(coalesce(code, name)) = 'pro' AND billing_cycle = 'yearly';
UPDATE public.pricing_plans SET price = 8.99 WHERE lower(coalesce(code, name)) = 'team' AND billing_cycle = 'monthly';
UPDATE public.pricing_plans SET price = 69.99 WHERE lower(coalesce(code, name)) = 'team' AND billing_cycle = 'yearly';

-- 2. Customer avatars
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3. Feedback center
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS replied_at timestamptz;
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS user_email text;

-- 4. Permanent owner protection
CREATE OR REPLACE FUNCTION public.is_protected_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND lower(email) = 'othan1100@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_permanent_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  target := COALESCE(OLD.user_id, NEW.user_id);
  IF public.is_protected_owner(target) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'The permanent owner account cannot be modified';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
      RAISE EXCEPTION 'The permanent owner account cannot be modified';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS protect_permanent_owner_roles ON public.user_roles;
CREATE TRIGGER protect_permanent_owner_roles
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_permanent_owner();

-- Owner always keeps the admin role
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role FROM public.profiles WHERE lower(email) = 'othan1100@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Feedback policies (admins manage, users read their own)
DROP POLICY IF EXISTS "Admins can manage all feedback" ON public.feedback;
CREATE POLICY "Admins can manage all feedback" ON public.feedback
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));