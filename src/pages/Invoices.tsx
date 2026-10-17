import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { FileText, Loader2, Pencil, Plus, Printer, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers } from "@/hooks/useData";
import { useBusinessName } from "@/hooks/useBusinessName";
import { toast } from "@/hooks/use-toast";
import { db, errText, esc, money, PAY_METHODS, printDocument, useCashbookRows, useProducts, type PayMethod } from "@/lib/inventory";

type Inv = {
  id: string; sale_id: string; customer_id: string | null; invoice_number: string; issue_date: string; due_date: string | null;
  subtotal: number; discount: number; total: number; paid: number; balance: number; status: string;
};
type Detail = {
  items: { product_id: string; quantity: number; unit_price: number; total: number }[];
  payments: { amount: number; payment_method: string; payment_date: string; note: string | null }[];
  notes: string | null;
};

export default function Invoices() {
  const [params, setParams] = useSearchParams();
  const { data: invoices, loading, refresh } = useCashbookRows<Inv>("invoices", "*", "issue_date");
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const businessName = useBusinessName();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(params.get("open") || null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [mode, setMode] = useState<"view" | "pay" | "edit">("view");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [note, setNote] = useState("");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const inv = invoices.find((i) => i.id === openId) ?? null;
  const custName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "Walk-in customer";
  const prodName = (id: string) => products.find((p) => p.id === id)?.name ?? "Product";
  const outstanding = invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.balance), 0);

  const loadDetail = async (i: Inv) => {
    const [items, pays, sale] = await Promise.all([
      db.from("sale_items").select("product_id,quantity,unit_price,total").eq("sale_id", i.sale_id),
      db.from("invoice_payments").select("amount,payment_method,payment_date,note").eq("invoice_id", i.id).order("payment_date"),
      db.from("sales").select("notes").eq("id", i.sale_id).maybeSingle(),
    ]);
    setDetail({ items: items.data || [], payments: pays.data || [], notes: sale.data?.notes ?? null });
  };
  useEffect(() => { setDetail(null); setMode("view"); if (inv) loadDetail(inv); }, [openId, inv?.paid]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { setOpenId(null); if (params.get("open")) setParams({}); };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return invoices.filter((i) => (status === "all" || i.status === status) && (!t || i.invoice_number.toLowerCase().includes(t) || custName(i.customer_id).toLowerCase().includes(t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, q, status, customers]);

  const pay = async () => {
    if (!inv) return;
    setBusy(true);
    const { error } = await db.rpc("record_invoice_payment", { _invoice: inv.id, _amount: Number(amount), _method: method, _date: new Date().toISOString(), _note: note.trim() || null });
    setBusy(false);
    if (error) return toast({ title: "Payment not saved", description: errText(error), variant: "destructive" });
    toast({ title: "Payment recorded" }); setMode("view"); refresh();
  };

  const saveEdit = async () => {
    if (!inv) return;
    setBusy(true);
    const { error } = await db.rpc("update_invoice_details", { _invoice: inv.id, _due: due ? new Date(due).toISOString() : null, _notes: notes.trim() || null });
    setBusy(false);
    if (error) return toast({ title: "Couldn't save", description: errText(error), variant: "destructive" });
    toast({ title: "Invoice updated" }); setMode("view"); refresh(); loadDetail(inv);
  };

  const print = () => {
    if (!inv || !detail) return;
    const c = customers.find((x) => x.id === inv.customer_id);
    printDocument(inv.invoice_number, `
      <h1>${esc(businessName || "Invoice")}</h1><div class="muted">Invoice ${esc(inv.invoice_number)}</div>
      <p><b>Bill to:</b> ${esc(c?.name ?? "Walk-in customer")}${c?.phone ? `<br>${esc(c.phone)}` : ""}${c?.email ? `<br>${esc(c.email)}` : ""}</p>
      <p class="muted">Issued ${new Date(inv.issue_date).toLocaleDateString()}${inv.due_date ? ` · Due ${new Date(inv.due_date).toLocaleDateString()}` : ""}</p>
      <table><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr>
      ${detail.items.map((it) => `<tr><td>${esc(prodName(it.product_id))}</td><td class="r">${Number(it.quantity)}</td><td class="r">${money(it.unit_price)}</td><td class="r">${money(it.total)}</td></tr>`).join("")}
      <tr class="tot"><td colspan="3" class="r">Subtotal</td><td class="r">${money(inv.subtotal)}</td></tr>
      <tr class="tot"><td colspan="3" class="r">Discount</td><td class="r">${money(inv.discount)}</td></tr>
      <tr class="tot"><td colspan="3" class="r">Total</td><td class="r">${money(inv.total)}</td></tr>
      <tr class="tot"><td colspan="3" class="r">Paid</td><td class="r">${money(inv.paid)}</td></tr>
      <tr class="tot"><td colspan="3" class="r">Balance due</td><td class="r">${money(inv.balance)}</td></tr></table>
      ${detail.notes ? `<p class="muted">${esc(detail.notes)}</p>` : ""}<p class="muted">Thank you for your business.</p>`);
  };

  const badge = (s: string) => <Badge variant={s === "paid" ? "outline" : s === "cancelled" ? "secondary" : "destructive"} className="capitalize">{s}</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales invoices</h1>
          <p className="text-sm text-muted-foreground">Outstanding: <b>{money(outstanding)}</b></p>
        </div>
        <Button asChild><Link to="/sales"><Plus className="mr-1 h-4 w-4" />New sale & invoice</Link></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search invoice or customer" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {["all", "unpaid", "partial", "paid"].map((s) => <Button key={s} size="sm" variant={status === s ? "default" : "outline"} className="capitalize" onClick={() => setStatus(s)}>{s}</Button>)}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : shown.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No invoices.</div>
          : <div className="divide-y divide-border/60">{shown.map((i) => (
              <button key={i.id} onClick={() => setOpenId(i.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-secondary/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{custName(i.customer_id)}</div>
                  <div className="text-xs text-muted-foreground">{i.invoice_number} · {new Date(i.issue_date).toLocaleDateString()}{i.due_date ? ` · due ${new Date(i.due_date).toLocaleDateString()}` : ""}</div>
                </div>
                <div className="text-right"><div className="font-semibold">{money(i.total)}</div>{badge(i.status)}</div>
              </button>
            ))}</div>}
      </div>

      <Dialog open={!!inv} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          {inv && <>
            <DialogHeader><DialogTitle className="flex items-center gap-2">{inv.invoice_number} {badge(inv.status)}</DialogTitle></DialogHeader>
            <div className="text-sm text-muted-foreground">{custName(inv.customer_id)} · issued {new Date(inv.issue_date).toLocaleDateString()}{inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString()}` : ""}</div>
            {!detail ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <>
              <div className="divide-y divide-border/60 rounded-xl border border-border/60">
                {detail.items.map((it, k) => (
                  <div key={k} className="flex justify-between p-3 text-sm"><span>{prodName(it.product_id)} × {Number(it.quantity)} @ {money(it.unit_price)}</span><b>{money(it.total)}</b></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span>Discount</span><span className="text-right">{money(inv.discount)}</span>
                <span>Total</span><b className="text-right">{money(inv.total)}</b>
                <span>Paid</span><span className="text-right">{money(inv.paid)}</span>
                <span>Balance due</span><b className="text-right">{money(inv.balance)}</b>
              </div>
              {detail.payments.length > 0 && <div className="text-sm"><div className="mb-1 font-medium">Payments</div>
                {detail.payments.map((p, k) => <div key={k} className="flex justify-between text-muted-foreground"><span>{new Date(p.payment_date).toLocaleDateString()} · {p.payment_method}{p.note ? ` · ${p.note}` : ""}</span><span>{money(p.amount)}</span></div>)}
              </div>}
              {detail.notes && <p className="text-sm text-muted-foreground">Notes: {detail.notes}</p>}

              {mode === "pay" && <div className="space-y-3 rounded-xl border border-border/60 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                  <div><Label>Method</Label><Select value={method} onValueChange={(v) => setMethod(v as PayMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-2"><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
                </div>
                <Button onClick={pay} disabled={busy} className="w-full">Save payment</Button>
              </div>}
              {mode === "edit" && <div className="space-y-3 rounded-xl border border-border/60 p-3">
                <div><Label>Due date</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
                <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                <p className="text-xs text-muted-foreground">Items and amounts are locked to keep stock correct. To change them, record a return.</p>
                <Button onClick={saveEdit} disabled={busy} className="w-full">Save changes</Button>
              </div>}
            </>}
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setDue(inv.due_date?.slice(0, 10) ?? ""); setNotes(detail?.notes ?? ""); setMode("edit"); }}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
              <Button variant="outline" onClick={print} disabled={!detail}><Printer className="mr-1 h-4 w-4" />Print</Button>
              {Number(inv.balance) > 0 && <Button onClick={() => { setAmount(String(inv.balance)); setNote(""); setMode("pay"); }}><Wallet className="mr-1 h-4 w-4" />Record payment</Button>}
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
