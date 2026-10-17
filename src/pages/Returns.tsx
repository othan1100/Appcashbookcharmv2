import { useEffect, useState } from "react";
import { Loader2, Plus, Printer, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers } from "@/hooks/useData";
import { useBusinessName } from "@/hooks/useBusinessName";
import { toast } from "@/hooks/use-toast";
import { db, errText, esc, money, printDocument, useCashbookRows, useProducts } from "@/lib/inventory";

type Ret = { id: string; return_type: string; sale_id: string | null; supplier: string | null; amount: number; reason: string | null; treatment: string; return_date: string; return_items: { product_id: string; quantity: number; amount: number }[] };
type Sale = { id: string; invoice_number: string; customer_id: string | null };
type SaleItem = { id: string; product_id: string; quantity: number; unit_price: number };
type Kind = "sale_return" | "purchase_return" | "correction";

export default function Returns() {
  const { data: returns, loading, refresh, activeId } = useCashbookRows<Ret>("goods_returns", "*, return_items(product_id,quantity,amount)", "return_date");
  const { data: sales } = useCashbookRows<Sale>("sales", "id,invoice_number,customer_id", "sale_date");
  const { data: products, refresh: refreshProducts } = useProducts();
  const { data: customers } = useCustomers();
  const businessName = useBusinessName();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("sale_return");
  const [saleId, setSaleId] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [treatment, setTreatment] = useState("credit");
  const [reason, setReason] = useState("");
  const [supplier, setSupplier] = useState("");
  const [productId, setProductId] = useState("");
  const [amountQty, setAmountQty] = useState("");
  const [busy, setBusy] = useState(false);

  const prodName = (id: string) => products.find((p) => p.id === id)?.name ?? "Product";
  const saleOf = (id: string | null) => sales.find((s) => s.id === id);
  const custName = (id: string | null | undefined) => customers.find((c) => c.id === id)?.name ?? "Walk-in customer";

  useEffect(() => {
    setQty({});
    if (!saleId) { setSaleItems([]); return; }
    db.from("sale_items").select("id,product_id,quantity,unit_price").eq("sale_id", saleId).then(({ data }: { data: SaleItem[] | null }) => setSaleItems(data || []));
  }, [saleId]);

  const reset = () => { setSaleId(""); setReason(""); setSupplier(""); setProductId(""); setAmountQty(""); setTreatment("credit"); };

  const submit = async () => {
    setBusy(true);
    let error;
    if (kind === "sale_return") {
      const items = saleItems.filter((i) => Number(qty[i.id]) > 0).map((i) => ({ sale_item_id: i.id, product_id: i.product_id, quantity: Number(qty[i.id]) }));
      if (!saleId || !items.length) { setBusy(false); return toast({ title: "Choose a sale and returned quantities", variant: "destructive" }); }
      ({ error } = await db.rpc("process_goods_return", { _sale: saleId, _items: items, _reason: reason.trim() || null, _treatment: treatment, _supplier: null, _cashbook: null }));
    } else if (kind === "purchase_return") {
      if (!productId || !(Number(amountQty) > 0) || !supplier.trim()) { setBusy(false); return toast({ title: "Enter supplier, product and quantity", variant: "destructive" }); }
      ({ error } = await db.rpc("process_goods_return", { _sale: null, _items: [{ product_id: productId, quantity: Number(amountQty) }], _reason: reason.trim() || null, _treatment: "none", _supplier: supplier.trim(), _cashbook: activeId }));
    } else {
      if (!productId || !Number(amountQty)) { setBusy(false); return toast({ title: "Choose a product and a + or − quantity", variant: "destructive" }); }
      ({ error } = await db.rpc("adjust_inventory", { _product: productId, _quantity: Number(amountQty), _kind: "adjustment", _note: reason.trim() || "Stock correction" }));
    }
    setBusy(false);
    if (error) return toast({ title: "Not saved", description: errText(error), variant: "destructive" });
    toast({ title: kind === "correction" ? "Stock corrected" : treatment === "credit" && kind === "sale_return" ? "Credit note created" : "Return recorded" });
    setOpen(false); reset(); refresh(); refreshProducts();
  };

  const printCreditNote = (r: Ret) => {
    const s = saleOf(r.sale_id);
    printDocument(`Credit note`, `
      <h1>${esc(businessName || "Credit note")}</h1><div class="muted">Credit note CN-${esc(r.id.slice(0, 8).toUpperCase())}${s ? ` · for invoice ${esc(s.invoice_number)}` : ""}</div>
      <p><b>Customer:</b> ${esc(custName(s?.customer_id))}<br><span class="muted">${new Date(r.return_date).toLocaleDateString()}</span></p>
      <table><tr><th>Item</th><th class="r">Qty</th><th class="r">Amount</th></tr>
      ${r.return_items.map((i) => `<tr><td>${esc(prodName(i.product_id))}</td><td class="r">${Number(i.quantity)}</td><td class="r">${money(i.amount)}</td></tr>`).join("")}
      <tr class="tot"><td colspan="2" class="r">${r.treatment === "refund" ? "Refunded" : "Credited"}</td><td class="r">${money(r.amount)}</td></tr></table>
      ${r.reason ? `<p class="muted">Reason: ${esc(r.reason)}</p>` : ""}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Returns</h1>
          <p className="text-sm text-muted-foreground">Customer returns, credit notes, returns to suppliers and stock corrections.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />New return</Button>
      </div>
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
        {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : returns.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No returns yet.</div>
          : returns.map((r) => {
            const s = saleOf(r.sale_id);
            return (
              <div key={r.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Undo2 className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.return_type === "sale_return" ? custName(s?.customer_id) : r.supplier}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.return_date).toLocaleDateString()} · {r.return_items.map((i) => `${prodName(i.product_id)} × ${Number(i.quantity)}`).join(", ")}{s ? ` · ${s.invoice_number}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{money(r.amount)}</div>
                  <Badge variant="outline">{r.return_type === "purchase_return" ? "To supplier" : r.treatment === "refund" ? "Refund" : "Credit note"}</Badge>
                </div>
                {r.return_type === "sale_return" && <Button size="icon" variant="ghost" aria-label="Print credit note" onClick={() => printCreditNote(r)}><Printer className="h-4 w-4" /></Button>}
              </div>
            );
          })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>New return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Type</Label>
              <Select value={kind} onValueChange={(v) => { setKind(v as Kind); reset(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale_return">Customer return (from a sale)</SelectItem>
                  <SelectItem value="purchase_return">Return to supplier</SelectItem>
                  <SelectItem value="correction">Stock correction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kind === "sale_return" ? <>
              <div><Label>Sale</Label>
                <Select value={saleId} onValueChange={setSaleId}>
                  <SelectTrigger><SelectValue placeholder="Choose a sale" /></SelectTrigger>
                  <SelectContent>{sales.map((s) => <SelectItem key={s.id} value={s.id}>{s.invoice_number} · {custName(s.customer_id)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {saleItems.map((i) => (
                <div key={i.id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1">{prodName(i.product_id)} <span className="text-muted-foreground">(sold {Number(i.quantity)} @ {money(i.unit_price)})</span></span>
                  <Input className="w-24" type="number" min="0" max={i.quantity} placeholder="0" value={qty[i.id] ?? ""} onChange={(e) => setQty({ ...qty, [i.id]: e.target.value })} />
                </div>
              ))}
              <div><Label>What happens to the money</Label>
                <Select value={treatment} onValueChange={setTreatment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit note (lowers what the customer owes)</SelectItem>
                    <SelectItem value="refund">Refund (cash back to customer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </> : <>
              {kind === "purchase_return" && <div><Label>Supplier</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>}
              <div><Label>Product</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{products.filter((p) => p.is_active).map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({Number(p.current_stock)} {p.unit})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{kind === "correction" ? "Quantity (+ to add, − to remove)" : "Quantity"}</Label><Input type="number" value={amountQty} onChange={(e) => setAmountQty(e.target.value)} /></div>
            </>}
            <div><Label>{kind === "correction" ? "Note" : "Reason"}</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
