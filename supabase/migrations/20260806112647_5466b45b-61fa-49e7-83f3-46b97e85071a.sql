CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inv public.team_invites%ROWTYPE;
  t public.teams%ROWTYPE;
  owner_name text;
  owner_cashbook uuid;
  already boolean := false;
  final_role public.team_member_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.team_invites WHERE token = _token;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF inv.status <> 'pending'::public.team_invite_status AND inv.status <> 'accepted'::public.team_invite_status THEN
    RAISE EXCEPTION 'This invitation is no longer valid';
  END IF;
  IF inv.status = 'pending'::public.team_invite_status AND inv.expires_at < now() THEN
    UPDATE public.team_invites SET status = 'expired'::public.team_invite_status WHERE id = inv.id;
    RAISE EXCEPTION 'This invitation has expired';
  END IF;

  SELECT * INTO t FROM public.teams WHERE id = inv.team_id;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Team no longer exists';
  END IF;

  SELECT COALESCE(display_name, business_name, email), active_cashbook_id
    INTO owner_name, owner_cashbook
    FROM public.profiles WHERE user_id = t.owner_id;

  IF owner_cashbook IS NULL THEN
    SELECT id INTO owner_cashbook FROM public.cashbooks
     WHERE user_id = t.owner_id ORDER BY created_at LIMIT 1;
  END IF;

  IF t.owner_id = auth.uid() THEN
    final_role := 'owner'::public.team_member_role;
    already := true;
  ELSIF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = t.id AND user_id = auth.uid()) THEN
    SELECT role INTO final_role FROM public.team_members WHERE team_id = t.id AND user_id = auth.uid();
    already := true;
  ELSE
    IF public.team_member_count(t.id) >= t.member_limit THEN
      RAISE EXCEPTION 'This team has reached its member limit';
    END IF;
    INSERT INTO public.team_members (team_id, user_id, role) VALUES (t.id, auth.uid(), inv.role);
    final_role := inv.role;
    INSERT INTO public.audit_logs (team_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (t.id, auth.uid(), 'member.joined', 'member', auth.uid()::text, jsonb_build_object('role', inv.role));
  END IF;

  UPDATE public.team_invites SET status = 'accepted'::public.team_invite_status WHERE id = inv.id;

  -- Members of a team always operate on the Team plan and inside the owner's workspace.
  UPDATE public.profiles
     SET plan_type = 'team',
         plan_updated_at = now(),
         active_cashbook_id = COALESCE(owner_cashbook, active_cashbook_id)
   WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'team_id', t.id,
    'team_name', t.name,
    'role', final_role,
    'already_member', already,
    'owner_name', owner_name,
    'owner_cashbook_id', owner_cashbook
  );
END;
$function$;