import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers } from "@/hooks/useData";
import { toast } from "@/hooks/use-toast";
import { LineItemsEditor, emptyLine, validLines, type Line } from "@/components/LineItemsEditor";
import { db, errText, money, PAY_METHODS, useCashbookRows, useProducts, type PayMethod } from "@/lib/inventory";

type SaleRow = {
  id: string; invoice_number: string; customer_id: string | null; total: number; sale_date: string; notes: string | null;
  invoices: { id: string; status: string; paid: number; balance: number }[];
  sale_items: { quantity: number }[];
};

export default function Sales() {
  const { data: sales, loading, refresh, activeId } = useCashbookRows<SaleRow>("sales", "*, invoices(id,status,paid,balance), sale_items(quantity)", "sale_date");
  const { data: products, refresh: refreshProducts } = useProducts();
  const { data: customers } = useCustomers();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customer, setCustomer] = useState("none");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");

  const custName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "Walk-in customer";
  const active = products.filter((p) => p.is_active);
  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return sales.filter((s) => !t || s.invoice_number.toLowerCase().includes(t) || custName(s.customer_id).toLowerCase().includes(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, q, customers]);

  const reset = () => { setCustomer("none"); setLines([emptyLine()]); setDiscount("0"); setPaid(""); setMethod("Cash"); setDue(""); setNotes(""); };

  const submit = async () => {
    const ok = validLines(lines);
    if (!ok) return toast({ title: "Each line needs a product, quantity and price", variant: "destructive" });
    const paidNum = paid === "" ? total : Number(paid);
    if (!(paidNum >= 0) || paidNum > total) return toast({ title: "Amount paid can't be more than the total", variant: "destructive" });
    if (customer === "none" && paidNum < total) return toast({ title: "Choose a customer for sales on credit", variant: "destructive" });
    setBusy(true);
    const { data, error } = await db.rpc("create_inventory_sale", {
      _cashbook: activeId, _customer: customer === "none" ? null : customer,
      _items: ok.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), unit_price: Number(l.price) })),
      _discount: Number(discount) || 0, _paid: paidNum, _method: method,
      _due: due ? new Date(due).toISOString() : null, _notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) return toast({ title: "Sale not saved", description: errText(error), variant: "destructive" });
    toast({ title: "Sale saved", description: `Invoice ${data.invoice_number}` });
    setOpen(false); reset(); refresh(); refreshProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">Every sale takes stock out and creates an invoice.</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!active.length}><Plus className="mr-1 h-4 w-4" />New sale</Button>
      </div>
      {!active.length && !loading && (
        <p className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">Add products first on the <Link to="/products" className="text-primary underline">Products</Link> page.</p>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search invoice number or customer" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : shown.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No sales yet.</div>
          : <div className="divide-y divide-border/60">{shown.map((s) => {
              const inv = s.invoices?.[0];
              return (
                <Link key={s.id} to={`/invoices?open=${inv?.id ?? ""}`} className="flex items-center gap-3 p-4 hover:bg-secondary/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Receipt className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{custName(s.customer_id)}</div>
                    <div className="text-xs text-muted-foreground">{s.invoice_number} · {new Date(s.sale_date).toLocaleDateString()} · {s.sale_items?.length ?? 0} items</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{money(s.total)}</div>
                    {inv && <Badge variant={inv.status === "paid" ? "outline" : "destructive"}>{inv.status === "paid" ? "Paid" : `Owes ${money(inv.balance)}`}</Badge>}
                  </div>
                </Link>
              );
            })}</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>New sale</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Customer</Label>
              <Select value={customer} onValueChange={setCustomer}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Walk-in customer (paid now)</SelectItem>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <LineItemsEditor products={active} lines={lines} onChange={setLines} priceLabel="Price" priceOf={(p) => Number(p.selling_price)} />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Discount</Label><Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
              <div><Label>Paid now</Label><Input type="number" min="0" placeholder={String(total)} value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
              <div><Label>Payment method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PayMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Due date</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
              <div className="col-span-2"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3 text-sm">
              Total <b>{money(total)}</b> · Remaining on credit <b>{money(Math.max(0, total - (paid === "" ? total : Number(paid) || 0)))}</b>
            </div>
          </div>
          <DialogFooter><Button onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save sale</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
