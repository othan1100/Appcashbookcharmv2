import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Archive, Boxes, Loader2, MoreVertical, Package, Pencil, Plus, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCashbook } from "@/hooks/useActiveCashbook";
import { useCashbooks } from "@/hooks/useData";
import { formatMoney } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { StatCard } from "@/components/StatCard";

type Product = {
  id: string; user_id: string; cashbook_id: string; name: string; sku: string | null; category: string | null;
  unit: string; buying_price: number; selling_price: number; current_stock: number; minimum_stock: number;
  supplier: string | null; is_active: boolean;
};

type Form = { name: string; sku: string; category: string; unit: string; buying_price: string; selling_price: string; minimum_stock: string; supplier: string; opening_stock: string };
const emptyForm: Form = { name: "", sku: "", category: "", unit: "pcs", buying_price: "0", selling_price: "0", minimum_stock: "0", supplier: "", opening_stock: "0" };

const stockState = (p: Product) => p.current_stock <= 0 ? "out" : p.current_stock <= p.minimum_stock ? "low" : "ok";

export default function Products() {
  const { user } = useAuth();
  const { activeId } = useActiveCashbook();
  const { data: cashbooks } = useCashbooks();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"active" | "low" | "archived">("active");
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockKind, setStockKind] = useState("stock_in");
  const [stockQty, setStockQty] = useState("");
  const [stockNote, setStockNote] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);

  const load = useCallback(async () => {
    if (!user || !activeId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").eq("cashbook_id", activeId).order("name");
    if (error) toast({ title: "Couldn't load products", description: error.message, variant: "destructive" });
    setItems((data as Product[]) || []);
    setLoading(false);
  }, [user, activeId]);
  useEffect(() => { load(); }, [load]);

  const active = items.filter((p) => p.is_active);
  const lowCount = active.filter((p) => stockState(p) !== "ok").length;
  const stockValue = active.reduce((s, p) => s + Number(p.current_stock) * Number(p.buying_price), 0);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((p) => view === "archived" ? !p.is_active : p.is_active && (view === "active" || stockState(p) !== "ok"))
      .filter((p) => !term || [p.name, p.sku, p.category, p.supplier].some((v) => v?.toLowerCase().includes(term)));
  }, [items, q, view]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku ?? "", category: p.category ?? "", unit: p.unit, buying_price: String(p.buying_price), selling_price: String(p.selling_price), minimum_stock: String(p.minimum_stock), supplier: p.supplier ?? "", opening_stock: "0" });
    setFormOpen(true);
  };

  const save = async () => {
    const name = form.name.trim();
    const buy = Number(form.buying_price), sell = Number(form.selling_price), min = Number(form.minimum_stock), opening = Number(form.opening_stock);
    if (!name) return toast({ title: "Product name is required", variant: "destructive" });
    if ([buy, sell, min, opening].some((n) => !Number.isFinite(n) || n < 0)) return toast({ title: "Prices and stock can't be negative", variant: "destructive" });
    const fields = { name, sku: form.sku.trim() || null, category: form.category.trim() || null, unit: form.unit.trim() || "pcs", buying_price: buy, selling_price: sell, minimum_stock: min, supplier: form.supplier.trim() || null };
    setBusy(true);
    if (editing) {
      const { error } = await supabase.from("products").update(fields).eq("id", editing.id);
      setBusy(false);
      if (error) return toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      toast({ title: "Product updated" });
    } else {
      const owner = cashbooks.find((c) => c.id === activeId)?.user_id;
      if (!activeId || !owner) { setBusy(false); return toast({ title: "Choose a cashbook first", variant: "destructive" }); }
      const { data, error } = await supabase.from("products").insert({ ...fields, cashbook_id: activeId, user_id: owner, current_stock: 0 }).select("id").single();
      if (error || !data) { setBusy(false); return toast({ title: "Couldn't add product", description: error?.message, variant: "destructive" }); }
      if (opening > 0) {
        const { error: e2 } = await supabase.rpc("adjust_inventory", { _product: data.id, _quantity: opening, _kind: "stock_in", _note: "Opening stock" });
        if (e2) toast({ title: "Product added, but opening stock failed", description: e2.message, variant: "destructive" });
      }
      setBusy(false);
      toast({ title: "Product added" });
    }
    setFormOpen(false);
    load();
  };

  const submitStock = async () => {
    if (!stockTarget) return;
    const qty = Number(stockQty);
    if (!Number.isFinite(qty) || qty === 0 || (stockKind !== "adjustment" && qty < 0)) return toast({ title: "Enter a valid quantity", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.rpc("adjust_inventory", { _product: stockTarget.id, _quantity: qty, _kind: stockKind, _note: stockNote.trim() || null });
    setBusy(false);
    if (error) return toast({ title: "Stock not changed", description: error.message, variant: "destructive" });
    toast({ title: "Stock updated" });
    setStockTarget(null);
    load();
  };

  const setActive = async (p: Product, is_active: boolean) => {
    const { error } = await supabase.from("products").update({ is_active }).eq("id", p.id);
    if (error) return toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    toast({ title: is_active ? "Product restored" : "Product removed from catalog" });
    setArchiveTarget(null);
    load();
  };

  const f = (k: keyof Form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Your catalog and stock levels for this cashbook.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />Add product</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Active products" value={String(active.length)} icon={Package} variant="info" />
        <StatCard label="Low or out of stock" value={String(lowCount)} icon={AlertTriangle} variant="cash-out" />
        <StatCard label="Stock value (cost)" value={formatMoney(stockValue)} icon={Boxes} variant="neutral" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, SKU, category, supplier" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {(["active", "low", "archived"] as const).map((v) => (
          <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>
            {v === "active" ? "All" : v === "low" ? `Low stock (${lowCount})` : "Removed"}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : shown.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No products yet. Add your first product to start tracking stock." : "No products match."}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {shown.map((p) => {
              const st = stockState(p);
              return (
                <div key={p.id} className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      {p.sku && <span className="text-xs text-muted-foreground">#{p.sku}</span>}
                      {p.category && <Badge variant="secondary">{p.category}</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Buy {formatMoney(Number(p.buying_price))} · Sell {formatMoney(Number(p.selling_price))}{p.supplier ? ` · ${p.supplier}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{Number(p.current_stock)} {p.unit}</div>
                    {p.is_active && (
                      <Badge variant={st === "ok" ? "outline" : "destructive"} className="mt-0.5">
                        {st === "out" ? "Out of stock" : st === "low" ? `Low · min ${Number(p.minimum_stock)}` : "In stock"}
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Product actions"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {p.is_active ? (
                        <>
                          <DropdownMenuItem onClick={() => { setStockTarget(p); setStockKind("stock_in"); setStockQty(""); setStockNote(""); }}><SlidersHorizontal className="mr-2 h-4 w-4" />Change stock</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(p)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setArchiveTarget(p)}><Archive className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => setActive(p, true)}><RotateCcw className="mr-2 h-4 w-4" />Restore</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input {...f("name")} placeholder="e.g. Rice 25kg" /></div>
            <div><Label>SKU</Label><Input {...f("sku")} /></div>
            <div><Label>Category</Label><Input {...f("category")} /></div>
            <div><Label>Unit</Label><Input {...f("unit")} placeholder="pcs, kg, box" /></div>
            <div><Label>Supplier</Label><Input {...f("supplier")} /></div>
            <div><Label>Buying price</Label><Input type="number" min="0" step="0.01" {...f("buying_price")} /></div>
            <div><Label>Selling price</Label><Input type="number" min="0" step="0.01" {...f("selling_price")} /></div>
            <div><Label>Minimum stock</Label><Input type="number" min="0" {...f("minimum_stock")} /></div>
            {!editing && <div><Label>Opening stock</Label><Input type="number" min="0" {...f("opening_stock")} /></div>}
          </div>
          {editing && <p className="text-xs text-muted-foreground">To change the quantity, use "Change stock" so it's recorded in stock history.</p>}
          <DialogFooter><Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockTarget} onOpenChange={(o) => !o && setStockTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change stock · {stockTarget?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Current: {Number(stockTarget?.current_stock ?? 0)} {stockTarget?.unit}</p>
          <div className="space-y-3">
            <div><Label>Type</Label>
              <Select value={stockKind} onValueChange={setStockKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock_in">Stock in (received)</SelectItem>
                  <SelectItem value="stock_out">Stock out (used / lost)</SelectItem>
                  <SelectItem value="purchase_return">Returned to supplier</SelectItem>
                  <SelectItem value="adjustment">Correction (+ or −)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantity</Label><Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} /></div>
            <div><Label>Note</Label><Input value={stockNote} onChange={(e) => setStockNote(e.target.value)} placeholder="Optional" /></div>
          </div>
          <DialogFooter><Button onClick={submitStock} disabled={busy}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Update stock</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {archiveTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed from your catalog. Past sales and stock history stay intact, and you can restore it from "Removed".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveTarget && setActive(archiveTarget, false)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
