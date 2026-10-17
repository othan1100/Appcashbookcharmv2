import { BillingLogo } from "@/components/BillingLogo";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Crown, Sparkles, Users, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/SectionCard";
import { usePlan, type PlanType } from "@/hooks/usePlan";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PlanRow = {
  id: string;
  code: string | null;
  name: string;
  billing_cycle: string;
  price: number;
  currency: string | null;
  tagline: string | null;
  features: string[];
  highlighted: boolean;
  sort_order: number;
};

type PlanCard = {
  code: string;
  name: string;
  tagline: string | null;
  features: string[];
  highlighted: boolean;
  sort_order: number;
  monthly: number;
  yearly: number;
};

const ICONS: Record<string, typeof Crown> = { pro: Crown, team: Users };

export default function Pricing() {
  const { t } = useI18n();
  const { plan: currentPlan, loading: planLoading } = usePlan();
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const selectedParam = searchParams.get("selected");
  const [supportWa, setSupportWa] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Pricing — CashbookCharm";
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        (supabase.from("pricing_plans") as any).select("*").eq("is_active", true).order("sort_order"),
        supabase.from("app_settings").select("support_whatsapp").eq("id", 1).maybeSingle(),
      ]);
      setRows(((p as unknown as PlanRow[]) || []).map((x) => ({
        ...x,
        features: Array.isArray(x.features) ? x.features : [],
      })));
      setSupportWa((s as { support_whatsapp?: string | null } | null)?.support_whatsapp ?? null);
      setLoading(false);
    })();
  }, []);

  const plans = useMemo<PlanCard[]>(() => {
    const map = new Map<string, PlanCard>();
    for (const r of rows) {
      const code = (r.code ?? r.name).toLowerCase();
      const card = map.get(code) ?? {
        code, name: r.name, tagline: r.tagline, features: r.features,
        highlighted: r.highlighted, sort_order: r.sort_order, monthly: 0, yearly: 0,
      };
      if (r.billing_cycle === "yearly") card.yearly = Number(r.price);
      else card.monthly = Number(r.price);
      if (r.features?.length) card.features = r.features;
      map.set(code, card);
    }
    return [...map.values()].sort((a, b) => a.sort_order - b.sort_order);
  }, [rows]);

  const waLink = supportWa ? `https://wa.me/${supportWa.replace(/[^0-9]/g, "")}` : null;

  const startCheckout = async (code: string) => {
    setBusy(code);
    try {
      const { data, error } = await supabase.functions.invoke("sifalo-checkout", {
        body: {
          plan: code,
          billing_cycle: yearly ? "yearly" : "monthly",
          return_url: `https://app.cashbookcharm.online/billing/return`,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success || !data?.checkoutUrl) throw new Error(data?.error || "Checkout could not be started");
      window.location.href = data.checkoutUrl as string;
    } catch (e) {
      setBusy(null);
      toast({ title: "Payment failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <header className="text-center max-w-2xl mx-auto px-2">
        <BillingLogo className="mx-auto mb-4 h-14 w-14" />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{t("pricing")}</p>
        <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{t("chooseYourPlan")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("pricingTagline")}</p>

        <div className="mt-5 inline-flex items-center gap-2 sm:gap-3 rounded-full border border-border/60 bg-card px-3 py-2 sm:px-4 max-w-full">
          <span className={cn("text-xs sm:text-sm font-medium", yearly ? "text-muted-foreground" : "text-foreground")}>{t("monthly")}</span>
          <Switch checked={yearly} onCheckedChange={setYearly} aria-label="Toggle yearly billing" />
          <span className={cn("text-xs sm:text-sm font-medium flex items-center gap-1.5 flex-wrap justify-center", yearly ? "text-foreground" : "text-muted-foreground")}>
            {t("yearly")}
            <span className="rounded-full bg-[hsl(var(--cash-in))]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--cash-in))]">Save 20%</span>
          </span>
        </div>

        {!planLoading && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("yourCurrentPlan")}: <span className="font-semibold text-foreground capitalize">{currentPlan}</span>
          </p>
        )}

        {selectedParam && (
          <div className="mx-auto mt-4 max-w-sm rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary">
            You selected the <span className="capitalize">{selectedParam}</span> Plan — continue below to complete your payment.
          </div>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SectionCard className="relative flex flex-col p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Starter</h3>
              <p className="text-xs text-muted-foreground">Try the basics</p>
            </div>
          </div>
          <div className="mt-4"><span className="text-3xl font-bold">Free</span></div>
          <ul className="mt-5 space-y-2 flex-1">
            {["1 cashbook", "Basic transactions", "Customer balances", "Mobile + desktop access"].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {currentPlan === "starter"
              ? <Button disabled className="w-full rounded-xl">{t("currentPlan")}</Button>
              : <Button variant="outline" disabled className="w-full rounded-xl">Free tier</Button>}
          </div>
        </SectionCard>

        {plans.map((p) => {
          const Icon = ICONS[p.code] ?? Crown;
          const isCurrent = currentPlan === (p.code as PlanType);
          const isRecommended = highlightParam === p.code;
          const price = yearly ? p.yearly : p.monthly;
          const monthlyEquivalent = yearly && p.yearly ? p.yearly / 12 : null;

          return (
            <SectionCard key={p.code}
              className={cn(
                "relative flex flex-col p-6",
                p.highlighted && "border-primary/60 ring-1 ring-primary/30",
                isRecommended && "border-primary ring-2 ring-primary/60 shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]",
              )}>
              {(isRecommended || p.highlighted) && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground whitespace-nowrap">
                  {isRecommended ? "Recommended for you" : t("mostPopular")}
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  {p.tagline && <p className="text-xs text-muted-foreground">{p.tagline}</p>}
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-1 flex-wrap">
                <span className="text-3xl font-bold">${Number(price).toFixed(2)}</span>
                <span className="text-sm text-muted-foreground">{yearly ? t("perYear") : t("perMonth")}</span>
              </div>
              {monthlyEquivalent && (
                <p className="mt-1 text-xs text-muted-foreground">
                  ${monthlyEquivalent.toFixed(2)}{t("perMonth")} · {t("billedYearly")}
                </p>
              )}
              <ul className="mt-5 space-y-2 flex-1">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-2">
                {isCurrent ? (
                  <Button disabled className="w-full rounded-xl">{t("currentPlan")}</Button>
                ) : currentPlan === "pro" && p.code === "team" ? (
                  <Button asChild variant="outline" className="w-full rounded-xl gap-2">
                    <a href={waLink ?? "https://wa.me/252619172003"} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />Contact Sales</a>
                  </Button>
                ) : (
                  <Button onClick={() => startCheckout(p.code)} disabled={busy === p.code} className="w-full rounded-xl gap-2">
                    {busy === p.code && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("upgrade")} — Pay with Sifalo
                  </Button>
                )}
                {isCurrent && waLink && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer"
                     className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary py-2 text-sm font-medium hover:bg-secondary/80">
                    <MessageCircle className="h-4 w-4" /> WhatsApp support
                  </a>
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground max-w-lg mx-auto px-4">
        Payments are processed securely by Sifalo Pay. You'll be redirected to a secure checkout page and returned here once payment is confirmed.
      </p>
    </div>
  );
}
