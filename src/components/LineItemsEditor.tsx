import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, type Product } from "@/lib/inventory";

export type Line = { product_id: string; quantity: string; price: string };

/** Product / quantity / price rows. `priceOf` picks the default price when a product is chosen. */
export function LineItemsEditor({ products, lines, onChange, priceLabel, priceOf, showStock = true }: {
  products: Product[]; lines: Line[]; onChange: (l: Line[]) => void; priceLabel: string;
  priceOf: (p: Product) => number; showStock?: boolean;
}) {
  const set = (i: number, patch: Partial<Line>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_70px_90px_32px] gap-2 text-xs text-muted-foreground">
        <span>Product</span><span>Qty</span><span>{priceLabel}</span><span />
      </div>
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_70px_90px_32px] gap-2">
          <Select value={l.product_id} onValueChange={(v) => { const p = products.find((x) => x.id === v); set(i, { product_id: v, price: p ? String(priceOf(p)) : l.price }); }}>
            <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}{showStock ? ` (${Number(p.current_stock)} ${p.unit})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" min="0" value={l.quantity} onChange={(e) => set(i, { quantity: e.target.value })} />
          <Input type="number" min="0" step="0.01" value={l.price} onChange={(e) => set(i, { price: e.target.value })} />
          <Button variant="ghost" size="icon" aria-label="Remove line" onClick={() => onChange(lines.filter((_, j) => j !== i))} disabled={lines.length === 1}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => onChange([...lines, { product_id: "", quantity: "1", price: "0" }])}><Plus className="mr-1 h-4 w-4" />Add line</Button>
        <span className="text-sm font-semibold">Subtotal {money(total)}</span>
      </div>
    </div>
  );
}

export const emptyLine = (): Line => ({ product_id: "", quantity: "1", price: "0" });

export function validLines(lines: Line[]) {
  const ok = lines.filter((l) => l.product_id && Number(l.quantity) > 0 && Number(l.price) >= 0);
  return ok.length === lines.length && ok.length > 0 ? ok : null;
}
