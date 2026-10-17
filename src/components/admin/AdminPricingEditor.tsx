import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  code: string | null;
  name: string;
  billing_cycle: string;
  price: number;
  tagline: string | null;
  features: string[];
  highlighted: boolean;
  is_active: boolean;
  sort_order: number;
};

type Card = {
  code: string;
  name: string;
  tagline: string | null;
  features: string[];
  highlighted: boolean;
  is_active: boolean;
  sort_order: number;
  monthly: number;
  yearly: number;
  monthlyId?: string;
  yearlyId?: string;
};

export function AdminPricingEditor({ readOnly }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("pricing_plans") as any).select("*").order("sort_order");
    if (error) toast({ title: "Failed to load plans", description: error.message, variant: "destructive" });
    setRows(((data as unknown as Row[]) || []).map((r) => ({
      ...r,
      features: Array.isArray(r.features) ? r.features : [],
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo<Card[]>(() => {
    const map = new Map<string, Card>();
    for (const r of rows) {
      const code = (r.code ?? r.name).toLowerCase();
      const c = map.get(code) ?? {
        code, name: r.name, tagline: r.tagline, features: r.features,
        highlighted: r.highlighted, is_active: r.is_active, sort_order: r.sort_order,
        monthly: 0, yearly: 0,
      };
      if (r.billing_cycle === "yearly") { c.yearly = Number(r.price); c.yearlyId = r.id; }
      else { c.monthly = Number(r.price); c.monthlyId = r.id; }
      if (r.features?.length) c.features = r.features;
      map.set(code, c);
    }
    return [...map.values()].sort((a, b) => a.sort_order - b.sort_order);
  }, [rows]);

  useEffect(() => { setCards(grouped); }, [grouped]);

  const update = (code: string, patch: Partial<Card>) =>
    setCards((cs) => cs.map((c) => (c.code === code ? { ...c, ...patch } : c)));

  const save = async (c: Card) => {
    if (readOnly) return;
    setSavingCode(c.code);
    const shared = {
      name: c.name, tagline: c.tagline, features: c.features,
      highlighted: c.highlighted, is_active: c.is_active, sort_order: c.sort_order,
    };
    const updates = [
      c.monthlyId ? (supabase.from("pricing_plans") as any).update({ ...shared, price: Number(c.monthly) }).eq("id", c.monthlyId) : null,
      c.yearlyId ? (supabase.from("pricing_plans") as any).update({ ...shared, price: Number(c.yearly) }).eq("id", c.yearlyId) : null,
    ].filter(Boolean);
    const results = await Promise.all(updates as Promise<{ error: { message: string } | null }>[]);
    setSavingCode(null);
    const err = results.find((r) => r.error)?.error;
    if (err) return toast({ title: "Save failed", description: err.message, variant: "destructive" });
    toast({ title: `${c.name} plan saved` });
    load();
  };

  const applyDiscount = (c: Card, pct = 20) =>
    update(c.code, { yearly: Math.round(Number(c.monthly) * 12 * (1 - pct / 100) * 100) / 100 });

  if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((c) => (
        <SectionCard key={c.code} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">{c.name}</h3>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{c.code}</span>
          </div>

          <div className="space-y-2">
            <Label>Plan name</Label>
            <Input value={c.name} disabled={readOnly} onChange={(e) => update(c.code, { name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input value={c.tagline || ""} disabled={readOnly} onChange={(e) => update(c.code, { tagline: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Monthly price (USD)</Label>
              <Input type="number" step="0.01" min="0" disabled={readOnly}
                value={c.monthly} onChange={(e) => update(c.code, { monthly: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Yearly price (USD)</Label>
              <Input type="number" step="0.01" min="0" disabled={readOnly}
                value={c.yearly} onChange={(e) => update(c.code, { yearly: Number(e.target.value) })} />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={readOnly}
            onClick={() => applyDiscount(c)} className="w-full">
            Set yearly = monthly × 12 − 20%
          </Button>

          <div className="space-y-2">
            <Label>Features (one per line)</Label>
            <Textarea rows={5} disabled={readOnly}
              value={(c.features || []).join("\n")}
              onChange={(e) => update(c.code, { features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={!!c.highlighted} disabled={readOnly}
                onCheckedChange={(v) => update(c.code, { highlighted: v })} />
              <Label className="text-sm">Highlight as popular</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={c.is_active !== false} disabled={readOnly}
                onCheckedChange={(v) => update(c.code, { is_active: v })} />
              <Label className="text-sm">Active</Label>
            </div>
          </div>

          <Button onClick={() => save(c)} disabled={readOnly || savingCode === c.code} className="w-full gap-2 rounded-xl">
            {savingCode === c.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save {c.name}
          </Button>
        </SectionCard>
      ))}
    </div>
  );
}

export function AdminAppSettings({ readOnly }: { readOnly?: boolean }) {
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setEmail((data as { support_email?: string | null }).support_email || "");
        setWhatsapp((data as { support_whatsapp?: string | null }).support_whatsapp || "");
        setMessage((data as { support_message?: string | null }).support_message || "");
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({
      id: 1, support_email: email || null, support_whatsapp: whatsapp || null, support_message: message || null,
    });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Settings saved" });
  };

  if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <SectionCard className="p-5 space-y-4 max-w-2xl">
      <div>
        <h3 className="text-base font-bold">Support contact</h3>
        <p className="text-sm text-muted-foreground">Shown to all users on the Settings → Support section.</p>
      </div>
      <div className="space-y-2">
        <Label>Support email</Label>
        <Input type="email" value={email} disabled={readOnly} onChange={(e) => setEmail(e.target.value)} placeholder="info.support@cashbookcharm.com" />
      </div>
      <div className="space-y-2">
        <Label>Support WhatsApp (E.164 format)</Label>
        <Input value={whatsapp} disabled={readOnly} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+252619172003" />
        <p className="text-xs text-muted-foreground">Pro &amp; Team customers will see a "Chat on WhatsApp" button using this number.</p>
      </div>
      <div className="space-y-2">
        <Label>Support message</Label>
        <Input value={message} disabled={readOnly} onChange={(e) => setMessage(e.target.value)} placeholder="We're here to help..." />
      </div>
      <Button onClick={save} disabled={readOnly || saving} className="gap-2 rounded-xl">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
      </Button>
    </SectionCard>
  );
}
