
DROP TABLE IF EXISTS public.invitations;
DROP FUNCTION IF EXISTS public.get_team_role(uuid, uuid);

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF r.proname IN (
      'accept_team_invite','get_invite_preview','my_workspace','set_team_member_role',
      'revoke_team_member','upgrade_to_team_plan','log_audit','notify_user','has_role',
      'has_cashbook_access','is_team_member','can_manage_team','can_manage_members',
      'can_edit_team','team_role_of','team_member_count','can_access_owner_data',
      'can_write_owner_data','can_delete_owner_data','is_team_admin','role_on_owner_data',
      'team_of_owner','is_protected_owner'
    ) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO anon;
