import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Plus, Truck, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { LineItemsEditor, emptyLine, validLines, type Line } from "@/components/LineItemsEditor";
import { db, errText, money, PAY_METHODS, useCashbookRows, useProducts, type PayMethod } from "@/lib/inventory";

type PO = { id: string; po_number: string; supplier: string; status: string; total: number; paid: number; order_date: string; notes: string | null };

export default function Inventory() {
  const { data: products, loading, refresh: refreshProducts, activeId } = useProducts();
  const { data: orders, refresh: refreshOrders } = useCashbookRows<PO>("purchase_orders", "*", "order_date");
  const [sold, setSold] = useState<Record<string, number>>({});
  const [bought, setBought] = useState<Record<string, number>>({});
  const [poOpen, setPoOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [received, setReceived] = useState(true);
  const [poNotes, setPoNotes] = useState("");
  const [payPo, setPayPo] = useState<PO | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [busy, setBusy] = useState(false);

  const loadTotals = async () => {
    if (!activeId) return;
    const [s, m] = await Promise.all([
      db.from("sale_items").select("product_id,quantity").eq("cashbook_id", activeId),
      db.from("inventory_movements").select("product_id,quantity").eq("cashbook_id", activeId).eq("reference_type", "purchase"),
    ]);
    const sum = (rows: { product_id: string; quantity: number }[] = []) => rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.product_id]: (a[r.product_id] || 0) + Number(r.quantity) }), {});
    setSold(sum(s.data)); setBought(sum(m.data));
  };
  useEffect(() => { loadTotals(); }, [activeId, orders]); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadAll = () => { refreshOrders(); refreshProducts(); };
  const owed = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total) - Number(o.paid), 0);
  const active = products.filter((p) => p.is_active);

  const createPo = async () => {
    const ok = validLines(lines);
    if (!supplier.trim()) return toast({ title: "Enter the supplier", variant: "destructive" });
    if (!ok) return toast({ title: "Each line needs a product, quantity and cost", variant: "destructive" });
    setBusy(true);
    const { error } = await db.rpc("create_purchase_order", { _cashbook: activeId, _supplier: supplier.trim(), _items: ok.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), unit_cost: Number(l.price) })), _notes: poNotes.trim() || null, _receive: received });
    setBusy(false);
    if (error) return toast({ title: "Order not saved", description: errText(error), variant: "destructive" });
    toast({ title: received ? "Purchase saved and stock added" : "Purchase order created" });
    setPoOpen(false); setSupplier(""); setLines([emptyLine()]); setPoNotes(""); reloadAll();
  };

  const act = async (fn: string, args: object, msg: string) => {
    const { error } = await db.rpc(fn, args);
    if (error) return toast({ title: "Couldn't update", description: errText(error), variant: "destructive" });
    toast({ title: msg }); reloadAll();
  };

  const pay = async () => {
    if (!payPo) return;
    setBusy(true);
    const { error } = await db.rpc("record_supplier_payment", { _po: payPo.id, _amount: Number(amount), _method: method, _date: new Date().toISOString(), _note: null });
    setBusy(false);
    if (error) return toast({ title: "Payment not saved", description: errText(error), variant: "destructive" });
    toast({ title: "Supplier payment recorded" }); setPayPo(null); refreshOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Stock, sales and purchases per product. Owed to suppliers: <b>{money(owed)}</b></p>
        </div>
        <Button onClick={() => setPoOpen(true)} disabled={!active.length}><Plus className="mr-1 h-4 w-4" />New purchase order</Button>
      </div>

      <Tabs defaultValue="stock">
        <TabsList><TabsTrigger value="stock">Stock</TabsTrigger><TabsTrigger value="orders">Purchase orders ({orders.length})</TabsTrigger></TabsList>
        <TabsContent value="stock">
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
            {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : active.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No products yet. <Link to="/products" className="text-primary underline">Add products</Link></div>
              : <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border/60">
                    <th className="p-3">Product</th><th className="p-3 text-right">In stock</th><th className="p-3 text-right">Sold</th><th className="p-3 text-right">Purchased</th><th className="p-3 text-right">Stock value</th>
                  </tr></thead>
                  <tbody>{active.map((p) => {
                    const low = Number(p.current_stock) <= Number(p.minimum_stock);
                    return (
                      <tr key={p.id} className="border-b border-border/60 last:border-0">
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3 text-right">{Number(p.current_stock)} {p.unit} {low && <Badge variant="destructive" className="ml-1">Low</Badge>}</td>
                        <td className="p-3 text-right">{sold[p.id] || 0}</td>
                        <td className="p-3 text-right">{bought[p.id] || 0}</td>
                        <td className="p-3 text-right">{money(Number(p.current_stock) * Number(p.buying_price))}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>}
          </div>
        </TabsContent>
        <TabsContent value="orders">
          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
            {orders.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No purchase orders yet.</div>
              : orders.map((o) => {
                const bal = Number(o.total) - Number(o.paid);
                return (
                  <div key={o.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Truck className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{o.supplier}</div>
                      <div className="text-xs text-muted-foreground">{o.po_number} · {new Date(o.order_date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold">{money(o.total)}</div>
                      <div className="text-xs text-muted-foreground">{bal > 0 && o.status !== "cancelled" ? `Owe ${money(bal)}` : o.status === "cancelled" ? "" : "Paid"}</div>
                    </div>
                    <Badge variant={o.status === "received" ? "outline" : "secondary"} className="capitalize">{o.status}</Badge>
                    <div className="flex gap-1">
                      {o.status === "ordered" && <Button size="sm" variant="outline" onClick={() => act("receive_purchase_order", { _po: o.id }, "Stock received")}><CheckCircle2 className="mr-1 h-4 w-4" />Receive</Button>}
                      {o.status !== "cancelled" && bal > 0 && <Button size="sm" onClick={() => { setPayPo(o); setAmount(String(bal)); }}><Wallet className="mr-1 h-4 w-4" />Pay</Button>}
                      {o.status === "ordered" && Number(o.paid) === 0 && <Button size="sm" variant="ghost" aria-label="Cancel order" onClick={() => act("cancel_purchase_order", { _po: o.id }, "Order cancelled")}><XCircle className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                );
              })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={poOpen} onOpenChange={setPoOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>New purchase order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Supplier</Label><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} /></div>
            <LineItemsEditor products={active} lines={lines} onChange={setLines} priceLabel="Cost" priceOf={(p) => Number(p.buying_price)} />
            <div><Label>Notes</Label><Input value={poNotes} onChange={(e) => setPoNotes(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={received} onCheckedChange={(v) => setReceived(!!v)} />Goods already received (add to stock now)</label>
          </div>
          <DialogFooter><Button onClick={createPo} disabled={busy}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save order</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payPo} onOpenChange={(o) => !o && setPayPo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay {payPo?.supplier}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Method</Label><Select value={method} onValueChange={(v) => setMethod(v as PayMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <p className="text-xs text-muted-foreground">This is also added to your transactions as cash out.</p>
          <DialogFooter><Button onClick={pay} disabled={busy}>Save payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
