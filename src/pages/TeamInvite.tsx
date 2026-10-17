import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users, Loader2, CheckCircle2 } from "lucide-react";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type AcceptResult = {
  team_id?: string;
  team_name?: string;
  role?: string;
  already_member?: boolean;
  owner_name?: string | null;
  owner_cashbook_id?: string | null;
};

/**
 * Dedicated invitation landing page.
 * Acceptance runs entirely through the `accept_team_invite` security-definer
 * function so the token, expiry, status and seat limit are validated on the
 * server — the client never needs read access to invite tokens.
 */
export default function TeamInvite() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("invite");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<AcceptResult | null>(null);

  useEffect(() => {
    document.title = "Team invitation — CashbookCharm";
  }, []);

  // Signed-out visitors are sent to login and returned here afterwards.
  useEffect(() => {
    if (authLoading || user || !token) return;
    try {
      localStorage.setItem("cbc_pending_billing_return", `/team-invite?invite=${token}`);
    } catch { /* ignore */ }
    navigate("/login", { replace: true });
  }, [authLoading, user, token, navigate]);

  const accept = async () => {
    if (!user || !token) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_team_invite", { _token: token });
    setBusy(false);
    if (error) {
      return toast({ title: "Couldn't join the team", description: error.message, variant: "destructive" });
    }
    const res = (data ?? {}) as AcceptResult;
    setResult(res);
    setDone(true);
    toast({
      title: res.already_member ? "You're already on this team" : "You joined the team",
      description: res.team_name ? `Welcome to ${res.team_name}.` : undefined,
    });
  };

  if (!token) {
    return (
      <SectionCard className="mx-auto max-w-md p-8 text-center">
        <h2 className="text-xl font-bold">No invitation found</h2>
        <p className="mt-1 text-sm text-muted-foreground">This link is missing an invitation token.</p>
        <Button variant="outline" className="mt-5 rounded-xl" onClick={() => navigate("/")}>Go to dashboard</Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="mx-auto max-w-md p-8 text-center">
      {done ? (
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
      ) : (
        <Users className="mx-auto h-10 w-10 text-primary" />
      )}

      {done ? (
        <>
          <h2 className="mt-3 text-xl font-bold">You are already using the Team Plan.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You were invited by:{" "}
            <span className="font-semibold text-foreground">{result?.owner_name ?? "your team owner"}</span>
          </p>
          {result?.team_name && (
            <p className="mt-1 text-sm text-muted-foreground">
              You now share the <span className="font-semibold text-foreground">{result.team_name}</span> workspace
              {result.role ? <> as <span className="font-semibold text-foreground capitalize">{result.role}</span></> : null}.
            </p>
          )}
          <Button className="mt-5 w-full rounded-xl" onClick={() => { window.location.href = "/"; }}>
            Open the shared workspace
          </Button>
        </>
      ) : (
        <>
          <h2 className="mt-3 text-xl font-bold">Accept team invitation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You've been invited to collaborate on a CashbookCharm team.
          </p>
          <Button onClick={accept} disabled={busy} className="mt-5 w-full rounded-xl">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept invitation"}
          </Button>
        </>
      )}
    </SectionCard>
  );
}
