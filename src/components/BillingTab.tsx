import { useEffect, useState } from "react";
import { Loader2, CreditCard, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { BillingLogo } from "@/components/BillingLogo";
import { cn } from "@/lib/utils";

type Subscription = {
  id: string;
  plan: string;
  billing_cycle: string;
  status: string;
  amount: number | null;
  payment_gateway: string | null;
  customer_account: string | null;
  start_date: string | null;
  expire_date: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  plan: string | null;
  billing_cycle: string | null;
  amount: number | null;
  payment_method: string | null;
  order_id: string | null;
  status: string | null;
  created_at: string | null;
};

const STATUS_STYLE: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  active:    { label: "Active",    icon: CheckCircle2, className: "bg-[hsl(var(--cash-in))/0.15] text-[hsl(var(--cash-in))]" },
  success:   { label: "Paid",      icon: CheckCircle2, className: "bg-[hsl(var(--cash-in))/0.15] text-[hsl(var(--cash-in))]" },
  paid:      { label: "Paid",      icon: CheckCircle2, className: "bg-[hsl(var(--cash-in))/0.15] text-[hsl(var(--cash-in))]" },
  completed: { label: "Paid",      icon: CheckCircle2, className: "bg-[hsl(var(--cash-in))/0.15] text-[hsl(var(--cash-in))]" },
  trial:     { label: "Trial",     icon: Clock,        className: "bg-primary/15 text-primary" },
  pending:   { label: "Pending",   icon: Clock,        className: "bg-amber-500/15 text-amber-600" },
  failed:    { label: "Failed",    icon: XCircle,      className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelled", icon: XCircle,      className: "bg-muted text-muted-foreground" },
  expired:   { label: "Expired",   icon: XCircle,      className: "bg-muted text-muted-foreground" },
};

export function BillingTab() {
  const { user } = useAuth();
  const { plan, onTrial, trialDaysLeft } = usePlan();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setSubs((s as Subscription[]) || []);
      setPayments((p as unknown as PaymentRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const activeSub = subs.find((s) => s.status === "active") || subs[0];

  // Prefer the real payment ledger; fall back to subscription rows.
  const history = payments.length > 0
    ? payments.map((p) => ({
        id: p.id,
        created_at: p.created_at ?? new Date().toISOString(),
        plan: p.plan ?? "—",
        billing_cycle: p.billing_cycle ?? "—",
        amount: p.amount,
        method: p.payment_method ?? "sifalo",
        account: p.order_id ?? null,
        status: (p.status ?? "pending").toLowerCase(),
      }))
    : subs.map((s) => ({
        id: s.id,
        created_at: s.created_at,
        plan: s.plan,
        billing_cycle: s.billing_cycle,
        amount: s.amount,
        method: s.payment_gateway ?? "—",
        account: s.customer_account,
        status: s.status,
      }));

  if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      {/* Current plan */}
      <SectionCard className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BillingLogo className="h-12 w-12" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current plan</p>
              <h3 className="text-xl font-bold capitalize">{plan}{onTrial && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary align-middle">Trial</span>}</h3>
              {onTrial && (
                <p className="mt-0.5 text-xs text-muted-foreground">{trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} of trial remaining</p>
              )}
              {activeSub?.expire_date && !onTrial && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Renews on {new Date(activeSub.expire_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <Link to="/pricing">
            <Button className="rounded-xl gap-2">
              <CreditCard className="h-4 w-4" /> {plan === "starter" || onTrial ? "Upgrade plan" : "Change plan"}
            </Button>
          </Link>
        </div>
      </SectionCard>

      {/* History */}
      <SectionCard className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-bold">Payment history</h3>
        </div>

        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No payments yet. Upgrade to Pro or Team to unlock premium features.
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Plan</th>
                  <th className="px-3 py-2 font-semibold">Cycle</th>
                  <th className="px-3 py-2 font-semibold">Amount</th>
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const meta = STATUS_STYLE[h.status] ?? STATUS_STYLE.pending;
                  const Icon = meta.icon;
                  return (
                    <tr key={h.id} className="border-t border-border/60">
                      <td className="px-3 py-2.5">{new Date(h.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 capitalize font-medium">{h.plan}</td>
                      <td className="px-3 py-2.5 capitalize text-muted-foreground">{h.billing_cycle}</td>
                      <td className="px-3 py-2.5 font-mono">{h.amount != null ? `$${Number(h.amount).toFixed(2)}` : "—"}</td>
                      <td className="px-3 py-2.5 capitalize text-muted-foreground">
                        {h.method || "—"}
                        {h.account && <span className="ml-1 text-xs normal-case">· {h.account}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold", meta.className)}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
