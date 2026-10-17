import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export type TeamPermissions = {
  /** Customer + transaction editing — available to every team role except viewer. */
  editData: boolean;
  manageMembers: boolean;
  manageInvites: boolean;
  workspaceSettings: boolean;
  billing: boolean;
  analytics: boolean;
  deleteTeam: boolean;
};

function permissionsFor(role: TeamRole | null): TeamPermissions {
  const full = role === "owner" || role === "admin";
  return {
    editData: role === "owner" || role === "admin" || role === "editor",
    manageMembers: full,
    manageInvites: full,
    workspaceSettings: full,
    billing: role === "owner",
    analytics: full,
    deleteTeam: role === "owner",
  };
}

/**
 * Resolves the signed-in user's role inside their team (if any) and the
 * permissions that role grants. Members (editor) may only edit customers and
 * transactions; admins get everything except owner-only billing/deletion.
 */
export function useTeamRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<TeamRole | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setRole(null); setTeamId(null); setLoading(false); return; }
      const { data: owned } = await supabase.from("teams").select("id").eq("owner_id", user.id).limit(1);
      if (cancelled) return;
      if (owned?.[0]) {
        setTeamId(owned[0].id);
        setRole("owner");
        setLoading(false);
        return;
      }
      const { data: member } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", user.id)
        .limit(1);
      if (cancelled) return;
      if (member?.[0]) {
        setTeamId(member[0].team_id);
        setRole(member[0].role as TeamRole);
      } else {
        setTeamId(null);
        setRole(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { role, teamId, loading, can: permissionsFor(role) };
}
