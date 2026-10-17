
-- pricing_plans enrichment
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS highlighted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.pricing_plans SET code = lower(name) WHERE code IS NULL;

UPDATE public.pricing_plans SET
  tagline = 'For growing businesses',
  highlighted = true,
  sort_order = 1,
  features = '["Unlimited cashbooks","PDF / CSV exports","Customer reminders","Attachments & receipts","AI import from image","Priority support"]'::jsonb
WHERE code = 'pro';

UPDATE public.pricing_plans SET
  tagline = 'Collaborate with your team',
  sort_order = 2,
  features = '["Everything in Pro","Team members & roles (up to 10)","Shared cashbooks","Audit logs","Dedicated support"]'::jsonb
WHERE code = 'team';

CREATE UNIQUE INDEX IF NOT EXISTS pricing_plans_code_cycle_idx
  ON public.pricing_plans (code, billing_cycle);

-- subscriptions enrichment
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS payment_gateway text,
  ADD COLUMN IF NOT EXISTS customer_account text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS subscriptions_order_id_idx ON public.subscriptions (order_id);
CREATE INDEX IF NOT EXISTS subscriptions_sid_idx ON public.subscriptions (sifalo_sid);

-- payments enrichment
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS billing_cycle text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_order_id_key ON public.payments (order_id);

-- Grants
GRANT SELECT ON public.pricing_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing_plans TO authenticated;
GRANT ALL ON public.pricing_plans TO service_role;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active plans" ON public.pricing_plans;
CREATE POLICY "Anyone can view active plans" ON public.pricing_plans
  FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "Admins manage plans" ON public.pricing_plans;
CREATE POLICY "Admins manage plans" ON public.pricing_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS pricing_plans_updated_at ON public.pricing_plans;
CREATE TRIGGER pricing_plans_updated_at BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Signup trigger fix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id, display_name, business_name, country, city,
    plan_type, plan_updated_at, trial_ends_at, trial_plan
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'business_name',
    NEW.raw_user_meta_data ->> 'country',
    NEW.raw_user_meta_data ->> 'city',
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
