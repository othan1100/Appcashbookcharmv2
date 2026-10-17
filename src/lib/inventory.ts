import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCashbook } from "@/hooks/useActiveCashbook";
import { formatMoney } from "@/lib/format";

// Loose client for tables added after the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export const PAY_METHODS = ["Cash", "Card", "Bank", "Mobile"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export type Product = {
  id: string; user_id: string; cashbook_id: string; name: string; sku: string | null; unit: string;
  buying_price: number; selling_price: number; current_stock: number; minimum_stock: number;
  supplier: string | null; is_active: boolean;
};

/** Loads rows from a table for the active cashbook; reloads on cashbook change. */
export function useCashbookRows<T>(table: string, select = "*", order = "created_at", ascending = false) {
  const { activeId } = useActiveCashbook();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!activeId) { setData([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await db.from(table).select(select).eq("cashbook_id", activeId).order(order, { ascending });
    setData((rows as T[]) || []);
    setLoading(false);
  }, [activeId, table, select, order, ascending]);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh, activeId };
}

export const useProducts = () => useCashbookRows<Product>("products", "*", "name", true);

export function errText(e: unknown) {
  const m = (e as { message?: string })?.message ?? String(e);
  return m.replace(/^.*?Exception:\s*/i, "");
}

export function printDocument(title: string, body: string) {
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body{font-family:system-ui,sans-serif;color:#0f172a;padding:40px;max-width:760px;margin:auto}
    h1{color:#2563eb;margin:0 0 4px} table{width:100%;border-collapse:collapse;margin:20px 0}
    th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left} td.r,th.r{text-align:right}
    .muted{color:#64748b;font-size:13px} .tot td{font-weight:700;border:none}
  </style></head><body>${body}<script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export const money = (n: unknown) => formatMoney(Number(n) || 0);
