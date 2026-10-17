
-- =========================================================
-- 1. TABLES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'My Team',
  member_limit integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  email text,
  role public.team_role NOT NULL DEFAULT 'editor',
  status public.team_member_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.team_role NOT NULL DEFAULT 'editor',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status public.team_invite_status NOT NULL DEFAULT 'pending',
  invited_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS team_invites_unique_pending
  ON public.team_invites (team_id, lower(email)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS team_members_user_idx ON public.team_members (user_id);
CREATE INDEX IF NOT EXISTS team_members_owner_idx ON public.team_members (owner_id);

DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS team_members_updated_at ON public.team_members;
CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS team_invites_updated_at ON public.team_invites;
CREATE TRIGGER team_invites_updated_at BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS team_members_limit ON public.team_members;
CREATE TRIGGER team_members_limit BEFORE INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_team_member_limit();

-- =========================================================
-- 2. ROLE HELPERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.team_role_of(_team_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS public.team_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.owner_id = _user_id)
      THEN 'owner'::public.team_role
    ELSE (SELECT m.role FROM public.team_members m
          WHERE m.team_id = _team_id AND m.user_id = _user_id AND m.status = 'active' LIMIT 1)
  END
$$;

CREATE OR REPLACE FUNCTION public.team_of_owner(_owner uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.teams WHERE owner_id = _owner LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.role_on_owner_data(_owner uuid, _user uuid)
RETURNS public.team_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _owner = _user THEN 'owner'::public.team_role
    ELSE (SELECT m.role FROM public.team_members m
          WHERE m.owner_id = _owner AND m.user_id = _user AND m.status = 'active' LIMIT 1)
  END
$$;

CREATE OR REPLACE FUNCTION public.can_access_owner_data(_owner uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.role_on_owner_data(_owner, _user) IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.can_write_owner_data(_owner uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.role_on_owner_data(_owner, _user) IN ('owner','admin','editor')
$$;

CREATE OR REPLACE FUNCTION public.can_delete_owner_data(_owner uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.role_on_owner_data(_owner, _user) IN ('owner','admin')
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin(_owner uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.role_on_owner_data(_owner, _user) IN ('owner','admin')
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.team_role_of(_team_id, _user_id) IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team(_team_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.team_role_of(_team_id, _user_id) IN ('owner','admin')
$$;

-- Owner-only: invitations, role changes, member removal.
CREATE OR REPLACE FUNCTION public.can_manage_members(_team_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.team_role_of(_team_id, _user_id) = 'owner'
$$;

CREATE OR REPLACE FUNCTION public.can_edit_team(_team_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.team_role_of(_team_id, _user_id) IN ('owner','admin','editor')
$$;

CREATE OR REPLACE FUNCTION public.has_cashbook_access(_user_id uuid, _cashbook_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cashbooks c
    WHERE c.id = _cashbook_id
      AND (c.user_id = _user_id OR public.can_access_owner_data(c.user_id, _user_id))
  )
$$;

CREATE OR REPLACE FUNCTION public.team_member_count(_team_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*)::int FROM public.team_members WHERE team_id = _team_id AND status = 'active')
       + (SELECT count(*)::int FROM public.teams WHERE id = _team_id)
$$;

-- Returns the caller's effective workspace: their own team or the team they joined.
CREATE OR REPLACE FUNCTION public.my_workspace()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _t public.teams;
  _role public.team_role;
  _owner_name text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('role', NULL); END IF;

  SELECT * INTO _t FROM public.teams WHERE owner_id = _uid;
  IF _t.id IS NOT NULL THEN
    _role := 'owner';
  ELSE
    SELECT t.* INTO _t FROM public.teams t
      JOIN public.team_members m ON m.team_id = t.id
      WHERE m.user_id = _uid AND m.status = 'active' LIMIT 1;
    IF _t.id IS NULL THEN RETURN jsonb_build_object('role', NULL); END IF;
    SELECT m.role INTO _role FROM public.team_members m
      WHERE m.team_id = _t.id AND m.user_id = _uid;
  END IF;

  SELECT COALESCE(p.display_name, p.business_name, p.email) INTO _owner_name
    FROM public.profiles p WHERE p.user_id = _t.owner_id;

  RETURN jsonb_build_object(
    'team_id', _t.id,
    'team_name', _t.name,
    'owner_id', _t.owner_id,
    'owner_name', COALESCE(_owner_name, _t.name),
    'role', _role,
    'member_limit', _t.member_limit,
    'seats_used', public.team_member_count(_t.id)
  );
END $$;

-- =========================================================
-- 3. RLS FOR TEAM TABLES
-- =========================================================
DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_team_member(id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS teams_insert ON public.teams;
CREATE POLICY teams_insert ON public.teams FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS teams_update ON public.teams;
CREATE POLICY teams_update ON public.teams FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS teams_delete ON public.teams;
CREATE POLICY teams_delete ON public.teams FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS team_members_select ON public.team_members;
CREATE POLICY team_members_select ON public.team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_team(team_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS team_members_write ON public.team_members;
CREATE POLICY team_members_write ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_members(team_id, auth.uid()));
DROP POLICY IF EXISTS team_members_update ON public.team_members;
CREATE POLICY team_members_update ON public.team_members FOR UPDATE TO authenticated
  USING (public.can_manage_members(team_id, auth.uid()))
  WITH CHECK (public.can_manage_members(team_id, auth.uid()));
DROP POLICY IF EXISTS team_members_delete ON public.team_members;
CREATE POLICY team_members_delete ON public.team_members FOR DELETE TO authenticated
  USING (public.can_manage_members(team_id, auth.uid()));

DROP POLICY IF EXISTS team_invites_select ON public.team_invites;
CREATE POLICY team_invites_select ON public.team_invites FOR SELECT TO authenticated
  USING (public.can_manage_members(team_id, auth.uid()));
DROP POLICY IF EXISTS team_invites_insert ON public.team_invites;
CREATE POLICY team_invites_insert ON public.team_invites FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_members(team_id, auth.uid()) AND invited_by = auth.uid());
DROP POLICY IF EXISTS team_invites_update ON public.team_invites;
CREATE POLICY team_invites_update ON public.team_invites FOR UPDATE TO authenticated
  USING (public.can_manage_members(team_id, auth.uid()))
  WITH CHECK (public.can_manage_members(team_id, auth.uid()));
DROP POLICY IF EXISTS team_invites_delete ON public.team_invites;
CREATE POLICY team_invites_delete ON public.team_invites FOR DELETE TO authenticated
  USING (public.can_manage_members(team_id, auth.uid()));

-- =========================================================
-- 4. ROLE-AWARE RLS ON BUSINESS DATA
-- =========================================================
DROP POLICY IF EXISTS "Access owned or shared cashbooks" ON public.cashbooks;
DROP POLICY IF EXISTS "Users view own cashbooks" ON public.cashbooks;
DROP POLICY IF EXISTS "Users insert own cashbooks" ON public.cashbooks;
DROP POLICY IF EXISTS "Users update own cashbooks" ON public.cashbooks;
DROP POLICY IF EXISTS "Users delete own cashbooks" ON public.cashbooks;
DROP POLICY IF EXISTS cashbooks_select ON public.cashbooks;
DROP POLICY IF EXISTS cashbooks_insert ON public.cashbooks;
DROP POLICY IF EXISTS cashbooks_update ON public.cashbooks;
DROP POLICY IF EXISTS cashbooks_delete ON public.cashbooks;
DROP POLICY IF EXISTS "team can read owner cashbooks" ON public.cashbooks;

CREATE POLICY cashbooks_select ON public.cashbooks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_owner_data(user_id, auth.uid()));
CREATE POLICY cashbooks_insert ON public.cashbooks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.can_write_owner_data(user_id, auth.uid()));
CREATE POLICY cashbooks_update ON public.cashbooks FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_write_owner_data(user_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.can_write_owner_data(user_id, auth.uid()));
CREATE POLICY cashbooks_delete ON public.cashbooks FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_delete_owner_data(user_id, auth.uid()));

DROP POLICY IF EXISTS "Access customers in cashbook" ON public.customers;
DROP POLICY IF EXISTS "Users view own customers" ON public.customers;
DROP POLICY IF EXISTS "Users insert own customers" ON public.customers;
DROP POLICY IF EXISTS "Users update own customers" ON public.customers;
DROP POLICY IF EXISTS "Users delete own customers" ON public.customers;
DROP POLICY IF EXISTS "team reads customers" ON public.customers;
DROP POLICY IF EXISTS "team inserts customers" ON public.customers;
DROP POLICY IF EXISTS "team updates customers" ON public.customers;
DROP POLICY IF EXISTS "team deletes customers" ON public.customers;

CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_owner_data(user_id, auth.uid()));
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.can_write_owner_data(user_id, auth.uid()));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_write_owner_data(user_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.can_write_owner_data(user_id, auth.uid()));
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_delete_owner_data(user_id, auth.uid()));

DROP POLICY IF EXISTS "Access transactions in cashbook" ON public.transactions;
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users delete own transactions" ON public.transactions;
DROP POLICY IF EXISTS "team reads transactions" ON public.transactions;
DROP POLICY IF EXISTS "team inserts transactions" ON public.transactions;
DROP POLICY IF EXISTS "team updates transactions" ON public.transactions;
DROP POLICY IF EXISTS "team deletes transactions" ON public.transactions;

CREATE POLICY transactions_select ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_owner_data(user_id, auth.uid()));
CREATE POLICY transactions_insert ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.can_write_owner_data(user_id, auth.uid()));
CREATE POLICY transactions_update ON public.transactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_write_owner_data(user_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.can_write_owner_data(user_id, auth.uid()));
CREATE POLICY transactions_delete ON public.transactions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_delete_owner_data(user_id, auth.uid()));

-- Team members may read the owner's profile (business name, active cashbook).
DROP POLICY IF EXISTS "team reads owner profile" ON public.profiles;
CREATE POLICY "team reads owner profile" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_owner_data(user_id, auth.uid()));

-- Audit log visibility for the team.
DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_team(team_id, auth.uid()));

-- =========================================================
-- 5. INVITE RPCs
-- =========================================================
CREATE OR REPLACE FUNCTION public.upgrade_to_team_plan(_team_name text DEFAULT 'My Team')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _team uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  INSERT INTO public.teams (owner_id, name)
  VALUES (_uid, COALESCE(NULLIF(_team_name,''), 'My Team'))
  ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _team;
  RETURN _team;
END $$;

CREATE OR REPLACE FUNCTION public.get_invite_preview(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv public.team_invites; _t public.teams; _owner_name text; _owner_email text;
BEGIN
  SELECT * INTO _inv FROM public.team_invites WHERE token = _token;
  IF _inv.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Invitation not found'); END IF;
  SELECT * INTO _t FROM public.teams WHERE id = _inv.team_id;
  IF _t.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Team no longer exists'); END IF;
  SELECT COALESCE(p.display_name, p.business_name, p.email), p.email
    INTO _owner_name, _owner_email FROM public.profiles p WHERE p.user_id = _t.owner_id;
  RETURN jsonb_build_object(
    'ok', true,
    'team_id', _t.id,
    'team_name', _t.name,
    'role', _inv.role,
    'email', _inv.email,
    'status', _inv.status,
    'expired', (_inv.expires_at < now()),
    'owner_id', _t.owner_id,
    'owner_name', COALESCE(_owner_name, _t.name),
    'owner_email', COALESCE(_owner_email, '')
  );
END $$;

CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _inv public.team_invites;
  _t public.teams;
  _owner_name text;
  _owner_cashbook uuid;
  _already boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;

  SELECT * INTO _inv FROM public.team_invites WHERE token = _token FOR UPDATE;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'invalid_invite'; END IF;
  IF _inv.status = 'revoked' THEN RAISE EXCEPTION 'revoked_invite'; END IF;
  IF _inv.expires_at < now() AND _inv.status <> 'accepted' THEN
    UPDATE public.team_invites SET status = 'expired' WHERE id = _inv.id;
    RAISE EXCEPTION 'expired_invite';
  END IF;
  IF lower(_inv.email) <> _email THEN RAISE EXCEPTION 'wrong_email'; END IF;

  SELECT * INTO _t FROM public.teams WHERE id = _inv.team_id;
  IF _t.id IS NULL THEN RAISE EXCEPTION 'team_missing'; END IF;

  SELECT true INTO _already FROM public.team_members
    WHERE team_id = _t.id AND user_id = _uid AND status = 'active';

  INSERT INTO public.team_members (team_id, owner_id, user_id, email, role, status)
  VALUES (_t.id, _t.owner_id, _uid, _email, _inv.role, 'active')
  ON CONFLICT (team_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, status = 'active', email = EXCLUDED.email;

  UPDATE public.team_invites
     SET status = 'accepted', accepted_at = now()
   WHERE id = _inv.id AND status <> 'accepted';

  SELECT COALESCE(p.display_name, p.business_name, p.email),
         COALESCE(p.active_cashbook_id, (SELECT c.id FROM public.cashbooks c WHERE c.user_id = _t.owner_id ORDER BY c.created_at LIMIT 1))
    INTO _owner_name, _owner_cashbook
    FROM public.profiles p WHERE p.user_id = _t.owner_id;

  -- Join the owner's workspace: team plan + the owner's active cashbook.
  UPDATE public.profiles
     SET plan_type = 'team',
         plan_updated_at = now(),
         active_cashbook_id = COALESCE(_owner_cashbook, active_cashbook_id)
   WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'team_id', _t.id,
    'team_name', _t.name,
    'role', _inv.role,
    'already_member', COALESCE(_already, false),
    'owner_id', _t.owner_id,
    'owner_name', COALESCE(_owner_name, _t.name),
    'owner_cashbook_id', _owner_cashbook
  );
END $$;

CREATE OR REPLACE FUNCTION public.revoke_team_member(_member_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _team uuid;
BEGIN
  SELECT id INTO _team FROM public.teams WHERE owner_id = _uid;
  IF _team IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _member_user_id = _uid THEN RAISE EXCEPTION 'cannot_revoke_owner'; END IF;
  DELETE FROM public.team_members WHERE team_id = _team AND user_id = _member_user_id;
  UPDATE public.profiles SET plan_type = 'starter', plan_updated_at = now()
   WHERE user_id = _member_user_id AND plan_type = 'team';
END $$;

CREATE OR REPLACE FUNCTION public.set_team_member_role(_member_user_id uuid, _role public.team_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _team uuid;
BEGIN
  SELECT id INTO _team FROM public.teams WHERE owner_id = _uid;
  IF _team IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _role = 'owner' THEN RAISE EXCEPTION 'cannot_assign_owner'; END IF;
  UPDATE public.team_members SET role = _role
   WHERE team_id = _team AND user_id = _member_user_id;
END $$;

DROP FUNCTION IF EXISTS public.peek_team_invite(text);

REVOKE ALL ON FUNCTION public.accept_team_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_team_member_role(uuid, public.team_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_to_team_plan(text) TO authenticated;
