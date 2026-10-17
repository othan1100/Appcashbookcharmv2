-- 1. Team invite tokens must not be visible to ordinary members
DROP POLICY IF EXISTS "Members view invites" ON public.team_invites;

CREATE POLICY "Owners and team admins view invites" ON public.team_invites
FOR SELECT TO authenticated
USING (
  public.team_member_role(auth.uid(), team_id) IN ('owner'::public.team_member_role, 'admin'::public.team_member_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2. Audit logs may no longer be inserted directly by clients
DROP POLICY IF EXISTS "Users insert audit logs" ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE ALL ON public.audit_logs FROM anon;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

CREATE OR REPLACE FUNCTION public.log_audit(
  _team_id uuid,
  _action text,
  _entity_type text DEFAULT NULL,
  _entity_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _team_id IS NOT NULL AND NOT public.is_team_member(auth.uid(), _team_id) THEN
    RAISE EXCEPTION 'Not a member of this team';
  END IF;
  IF _action IS NULL OR length(_action) = 0 OR length(_action) > 120 THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  INSERT INTO public.audit_logs (team_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (_team_id, auth.uid(), _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit(uuid, text, text, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(uuid, text, text, text, jsonb) TO authenticated;

-- 3. Secure invite acceptance
CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.team_invites%ROWTYPE;
  t public.teams%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.team_invites WHERE token = _token;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF inv.status <> 'pending'::public.team_invite_status THEN
    RAISE EXCEPTION 'This invitation is no longer valid';
  END IF;
  IF inv.expires_at < now() THEN
    UPDATE public.team_invites SET status = 'expired'::public.team_invite_status WHERE id = inv.id;
    RAISE EXCEPTION 'This invitation has expired';
  END IF;

  SELECT * INTO t FROM public.teams WHERE id = inv.team_id;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Team no longer exists';
  END IF;

  IF t.owner_id = auth.uid() THEN
    UPDATE public.team_invites SET status = 'accepted'::public.team_invite_status WHERE id = inv.id;
    RETURN jsonb_build_object('team_id', t.id, 'team_name', t.name, 'role', 'owner', 'already_member', true);
  END IF;

  IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = t.id AND user_id = auth.uid()) THEN
    UPDATE public.team_invites SET status = 'accepted'::public.team_invite_status WHERE id = inv.id;
    RETURN jsonb_build_object('team_id', t.id, 'team_name', t.name, 'role', inv.role, 'already_member', true);
  END IF;

  IF public.team_member_count(t.id) >= t.member_limit THEN
    RAISE EXCEPTION 'This team has reached its member limit';
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (t.id, auth.uid(), inv.role);

  UPDATE public.team_invites SET status = 'accepted'::public.team_invite_status WHERE id = inv.id;

  INSERT INTO public.audit_logs (team_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (t.id, auth.uid(), 'member.joined', 'member', auth.uid()::text, jsonb_build_object('role', inv.role));

  RETURN jsonb_build_object('team_id', t.id, 'team_name', t.name, 'role', inv.role, 'already_member', false);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_invite(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;

-- 4. In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  category text NOT NULL DEFAULT 'general',
  link text,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_user(
  _title text,
  _body text DEFAULT NULL,
  _category text DEFAULT 'general',
  _link text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.notifications (user_id, title, body, category, link, metadata)
  VALUES (auth.uid(), _title, _body, COALESCE(_category, 'general'), _link, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_user(text, text, text, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.notify_user(text, text, text, text, jsonb) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;