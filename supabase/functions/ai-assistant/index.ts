// CHARM AI — CashbookCharm business assistant.
// The model decides which business-data tools to call; every tool runs here
// with the caller's own login (RLS enforced) and all money math happens in code.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MAX_ROWS = 5000;

type Json = Record<string, unknown>;
type Msg = { role: "user" | "assistant"; content: string };
type Ctx = { db: SupabaseClient; ownerId: string; cashbookId: string; used: Set<string>; metrics: Json };

const reply = (body: Json) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fail = (message: string) => reply({ success: false, answer: message, message, reply: message, category: "error", response_type: "error", data: [] });

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const isIn = (t: string) => t === "in" || t === "credit";
const isOut = (t: string) => t === "out" || t === "debit";

function range(args: Json) {
  const from = typeof args.from === "string" && args.from ? new Date(args.from) : null;
  const to = typeof args.to === "string" && args.to ? new Date(args.to) : null;
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(String(args.to))) to.setUTCDate(to.getUTCDate() + 1); // inclusive end day
  return { from: from && !isNaN(+from) ? from.toISOString() : null, to: to && !isNaN(+to) ? to.toISOString() : null };
}

async function txns(ctx: Ctx, args: Json, cols = "id,type,amount,category,note,date,customer_id,payment_method") {
  ctx.used.add("transactions");
  const { from, to } = range(args);
  let q = ctx.db.from("transactions").select(cols).eq("cashbook_id", ctx.cashbookId).order("date", { ascending: false }).limit(MAX_ROWS);
  if (from) q = q.gte("date", from);
  if (to) q = q.lt("date", to);
  const { data, error } = await q;
  if (error) throw new Error("db");
  return (data ?? []) as unknown as { id: string; type: string; amount: number; category: string; note: string | null; date: string; customer_id: string | null; payment_method: string }[];
}

async function customers(ctx: Ctx) {
  ctx.used.add("customers");
  const { data, error } = await ctx.db.from("customers").select("id,name,phone,email,balance").eq("cashbook_id", ctx.cashbookId).order("name").limit(MAX_ROWS);
  if (error) throw new Error("db");
  return data ?? [];
}

async function invoices(ctx: Ctx) {
  ctx.used.add("invoices");
  const { data, error } = await ctx.db.from("invoices").select("id,invoice_number,customer_id,issue_date,due_date,total,paid,balance,status").eq("cashbook_id", ctx.cashbookId).limit(MAX_ROWS);
  if (error) throw new Error("db");
  return data ?? [];
}

function totals(rows: { type: string; amount: number }[]) {
  const income = r2(rows.filter((t) => isIn(t.type)).reduce((a, t) => a + Number(t.amount), 0));
  const expenses = r2(rows.filter((t) => isOut(t.type)).reduce((a, t) => a + Number(t.amount), 0));
  return { income, expenses, net_profit: r2(income - expenses), transaction_count: rows.length };
}

async function receivables(ctx: Ctx) {
  const [cs, inv, tx] = await Promise.all([customers(ctx), invoices(ctx), txns(ctx, {}, "type,amount,customer_id")]);
  const now = Date.now();
  return cs.map((c) => {
    const mine = tx.filter((t) => t.customer_id === c.id);
    const open = inv.filter((i) => i.customer_id === c.id && i.status !== "cancelled" && Number(i.balance) > 0);
    return {
      name: c.name, phone: c.phone,
      paid_to_you: r2(mine.filter((t) => isIn(t.type)).reduce((a, t) => a + Number(t.amount), 0)),
      paid_out: r2(mine.filter((t) => isOut(t.type)).reduce((a, t) => a + Number(t.amount), 0)),
      recorded_balance: r2(Number(c.balance)),
      unpaid_invoice_balance: r2(open.reduce((a, i) => a + Number(i.balance), 0)),
      overdue_invoice_balance: r2(open.filter((i) => i.due_date && Date.parse(i.due_date) < now).reduce((a, i) => a + Number(i.balance), 0)),
    };
  });
}

const dateProps = {
  from: { type: ["string", "null"], description: "Start date YYYY-MM-DD (inclusive), or null for all time" },
  to: { type: ["string", "null"], description: "End date YYYY-MM-DD (inclusive), or null for up to now" },
};
const fn = (name: string, description: string, properties: Json = {}) => ({
  type: "function", name, description, strict: true,
  parameters: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
});

const TOOLS = [
  fn("get_profit_loss", "Income, expenses, net profit and transaction count for a date range. Use for income, spending, profit, sales from the cashbook, and business summary.", dateProps),
  fn("compare_periods", "Compare income, expenses and profit between two date ranges with percentage change.", {
    a_from: dateProps.from, a_to: dateProps.to, b_from: dateProps.from, b_to: dateProps.to,
  }),
  fn("get_cash_balance", "Current cash balance: all money in minus all money out in this cashbook."),
  fn("get_category_summary", "Totals per category for income or expenses in a date range, biggest first.", {
    ...dateProps, direction: { type: "string", enum: ["income", "expense"] },
  }),
  fn("get_monthly_trend", "Income, expenses and profit per month in a date range. Use for best month, trends and growth.", dateProps),
  fn("get_transactions", "Find individual transactions, newest first, optionally filtered by text (category, note, customer name) and direction.", {
    ...dateProps, search: { type: ["string", "null"] }, direction: { type: "string", enum: ["income", "expense", "any"] },
    limit: { type: "integer", description: "1-50" },
  }),
  fn("get_customers", "All customers with their payment totals, recorded balance, unpaid and overdue invoice balances. Use for who owes money, unpaid or overdue customers, and customer lists."),
  fn("get_customer_history", "One customer's details, balances and recent transactions, matched by name.", { name: { type: "string" } }),
  fn("get_top_customers", "Customers ranked by money received from them in a date range.", dateProps),
  fn("get_invoices", "Invoices from product sales, with status filter.", { status: { type: "string", enum: ["unpaid", "overdue", "paid", "all"] } }),
  fn("get_sales_summary", "Product sales from invoices: total sold, cost, gross profit and top products in a date range.", dateProps),
  fn("get_inventory", "Products with stock levels, stock value and low-stock flags.", { low_stock_only: { type: "boolean" } }),
];

async function runTool(ctx: Ctx, name: string, a: Json): Promise<unknown> {
  switch (name) {
    case "get_profit_loss": {
      const t = totals(await txns(ctx, a, "type,amount"));
      Object.assign(ctx.metrics, { income: t.income, expenses: t.expenses, profit: t.net_profit });
      return { period: { from: a.from, to: a.to }, ...t };
    }
    case "compare_periods": {
      const [x, y] = await Promise.all([txns(ctx, { from: a.a_from, to: a.a_to }, "type,amount"), txns(ctx, { from: a.b_from, to: a.b_to }, "type,amount")]);
      const A = totals(x), B = totals(y);
      const pct = (n: number, o: number) => (o === 0 ? null : r2(((n - o) / Math.abs(o)) * 100));
      return { first: A, second: B, change_percent_second_vs_first: { income: pct(B.income, A.income), expenses: pct(B.expenses, A.expenses), net_profit: pct(B.net_profit, A.net_profit) } };
    }
    case "get_cash_balance": {
      const t = totals(await txns(ctx, {}, "type,amount"));
      ctx.metrics.cash_balance = t.net_profit;
      return { cash_balance: t.net_profit, total_in: t.income, total_out: t.expenses };
    }
    case "get_category_summary": {
      const rows = (await txns(ctx, a, "type,amount,category")).filter((t) => (a.direction === "income" ? isIn(t.type) : isOut(t.type)));
      const m = new Map<string, number>();
      rows.forEach((t) => m.set(t.category || "Uncategorized", (m.get(t.category || "Uncategorized") ?? 0) + Number(t.amount)));
      const total = rows.reduce((s, t) => s + Number(t.amount), 0);
      return { total: r2(total), categories: [...m].sort((p, q) => q[1] - p[1]).slice(0, 20).map(([category, amount]) => ({ category, amount: r2(amount), share_percent: total ? r2((amount / total) * 100) : 0 })) };
    }
    case "get_monthly_trend": {
      const m = new Map<string, { type: string; amount: number }[]>();
      (await txns(ctx, a, "type,amount,date")).forEach((t) => { const k = t.date.slice(0, 7); m.set(k, [...(m.get(k) ?? []), t]); });
      return { months: [...m].sort().map(([month, rows]) => ({ month, ...totals(rows) })) };
    }
    case "get_transactions": {
      const [rows, cs] = await Promise.all([txns(ctx, a), customers(ctx)]);
      const names = new Map(cs.map((c) => [c.id, c.name]));
      const s = typeof a.search === "string" ? a.search.toLowerCase() : "";
      const list = rows.filter((t) => (a.direction === "income" ? isIn(t.type) : a.direction === "expense" ? isOut(t.type) : true))
        .filter((t) => !s || `${t.category} ${t.note ?? ""} ${names.get(t.customer_id ?? "") ?? ""}`.toLowerCase().includes(s));
      const lim = Math.min(50, Math.max(1, Number(a.limit) || 10));
      return { matches: list.length, ...totals(list), items: list.slice(0, lim).map((t) => ({ date: t.date.slice(0, 10), direction: isIn(t.type) ? "in" : "out", amount: r2(t.amount), category: t.category, note: t.note, customer: names.get(t.customer_id ?? "") ?? null, method: t.payment_method })) };
    }
    case "get_customers": {
      const list = await receivables(ctx);
      ctx.metrics.outstanding = r2(list.reduce((s, c) => s + c.unpaid_invoice_balance, 0));
      return { count: list.length, customers: list.slice(0, 200) };
    }
    case "get_customer_history": {
      const q = String(a.name ?? "").toLowerCase().trim();
      const all = await receivables(ctx);
      const matches = all.filter((c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()));
      if (matches.length !== 1) return { matches: matches.map((c) => ({ name: c.name, phone: c.phone })), note: matches.length ? "Several customers match; ask which one." : "No customer with that name." };
      const cs = await customers(ctx);
      const id = cs.find((c) => c.name === matches[0].name)?.id;
      const tx = (await txns(ctx, {})).filter((t) => t.customer_id === id).slice(0, 25);
      return { customer: matches[0], recent_transactions: tx.map((t) => ({ date: t.date.slice(0, 10), direction: isIn(t.type) ? "in" : "out", amount: r2(t.amount), category: t.category, note: t.note })) };
    }
    case "get_top_customers": {
      const [rows, cs] = await Promise.all([txns(ctx, a, "type,amount,customer_id"), customers(ctx)]);
      const m = new Map<string, number>();
      rows.filter((t) => isIn(t.type) && t.customer_id).forEach((t) => m.set(t.customer_id!, (m.get(t.customer_id!) ?? 0) + Number(t.amount)));
      const names = new Map(cs.map((c) => [c.id, c.name]));
      return { top: [...m].sort((p, q) => q[1] - p[1]).slice(0, 10).map(([id, amount]) => ({ name: names.get(id) ?? "Unknown", received: r2(amount) })) };
    }
    case "get_invoices": {
      const [inv, cs] = await Promise.all([invoices(ctx), customers(ctx)]);
      const names = new Map(cs.map((c) => [c.id, c.name]));
      const now = Date.now();
      const list = inv.filter((i) => {
        const open = i.status !== "cancelled" && Number(i.balance) > 0;
        if (a.status === "unpaid") return open;
        if (a.status === "overdue") return open && i.due_date && Date.parse(i.due_date) < now;
        if (a.status === "paid") return i.status === "paid";
        return true;
      });
      return { count: list.length, total_outstanding: r2(list.reduce((s, i) => s + Number(i.balance), 0)), invoices: list.slice(0, 50).map((i) => ({ number: i.invoice_number, customer: names.get(i.customer_id ?? "") ?? null, issued: String(i.issue_date).slice(0, 10), due: i.due_date ? String(i.due_date).slice(0, 10) : null, total: r2(i.total), paid: r2(i.paid), balance: r2(i.balance), status: i.status })) };
    }
    case "get_sales_summary": {
      ctx.used.add("sales");
      const { from, to } = range(a);
      let q = ctx.db.from("sales").select("id,total,sale_date,sale_items(quantity,total,cost_price,products(name))").eq("cashbook_id", ctx.cashbookId).limit(MAX_ROWS);
      if (from) q = q.gte("sale_date", from);
      if (to) q = q.lt("sale_date", to);
      const { data, error } = await q;
      if (error) throw new Error("db");
      let cost = 0; const prod = new Map<string, { qty: number; revenue: number }>();
      (data ?? []).forEach((s: any) => (s.sale_items ?? []).forEach((it: any) => {
        cost += Number(it.cost_price) * Number(it.quantity);
        const k = it.products?.name ?? "Product"; const p = prod.get(k) ?? { qty: 0, revenue: 0 };
        prod.set(k, { qty: p.qty + Number(it.quantity), revenue: p.revenue + Number(it.total) });
      }));
      const total = (data ?? []).reduce((s: number, x: any) => s + Number(x.total), 0);
      return { sales_count: data?.length ?? 0, total_sales: r2(total), cost_of_goods: r2(cost), gross_profit: r2(total - cost), average_sale: data?.length ? r2(total / data.length) : 0, top_products: [...prod].sort((p, q) => q[1].revenue - p[1].revenue).slice(0, 10).map(([name, v]) => ({ name, quantity: v.qty, revenue: r2(v.revenue) })) };
    }
    case "get_inventory": {
      ctx.used.add("products");
      const { data, error } = await ctx.db.from("products").select("name,sku,unit,current_stock,minimum_stock,buying_price,selling_price,is_active").eq("cashbook_id", ctx.cashbookId).limit(MAX_ROWS);
      if (error) throw new Error("db");
      const list = (data ?? []).map((p) => ({ ...p, low_stock: Number(p.current_stock) <= Number(p.minimum_stock) }));
      return { product_count: list.length, stock_value_at_cost: r2(list.reduce((s, p) => s + Number(p.current_stock) * Number(p.buying_price), 0)), products: list.filter((p) => !a.low_stock_only || p.low_stock).slice(0, 100) };
    }
  }
  return { error: "Unknown tool" };
}

function instructions(lang: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `You are Charm, the business assistant inside CashbookCharm. Today is ${today} (dates are UTC).
- For any question about the user's own business numbers, call the tools. Never invent, estimate or recalculate figures; report the exact numbers tools return. If a tool returns nothing, say there is no data for that period.
- Convert phrases like today, last week, this month, last 30 days, January, between January and March into from/to dates. Weeks start Monday.
- In this app, money "in" is income/payments received and "out" is expenses. A customer owes money when they have an unpaid invoice balance or a positive recorded balance.
- If a period is genuinely needed and missing (e.g. "How much did I make?"), ask one short question. For follow-ups, reuse the subject and period from earlier turns.
- You may also give general business advice, marketing ideas, pricing tips and draft WhatsApp/SMS messages. Label such answers as general advice and never add made-up statistics.
- Politely decline topics unrelated to business.
- Reply in the user's language: Somali if they write Somali, otherwise English (preferred: ${lang === "so" ? "Somali" : "English"}). Use simple, natural Somali.
- Be concise. Format money like $1,234.56. Use short markdown lists or small tables. Never mention tools, databases or internal names.`;
}

async function callModel(input: unknown[], apiKey: string): Promise<{ status: number; output: Json[] }> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model: MODEL, input, tools: TOOLS, stream: true, store: false, reasoning: { effort: "low", summary: "auto" }, include: ["reasoning.encrypted_content"] }),
  });
  if (!res.ok || !res.body) { await res.text().catch(() => ""); return { status: res.status, output: [] }; }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = ""; let output: Json[] = []; let failed = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "response.completed") output = ev.response?.output ?? [];
        if (ev.type === "response.failed" || ev.type === "error") failed = true;
      } catch { /* partial line */ }
    }
  }
  return { status: failed ? 500 : 200, output };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return fail("Please sign in to use Charm AI.");
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }, auth: { persistSession: false },
    });
    const { data: auth } = await db.auth.getUser();
    const user = auth?.user;
    if (!user) return fail("Your session has expired. Please sign in again.");

    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
    if (!message) return fail("Please type a question.");
    const lang = body?.lang === "so" ? "so" : "en";
    const history: Msg[] = (Array.isArray(body?.history) ? body.history : [])
      .filter((m: Msg) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
      .slice(-12).map((m: Msg) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    // Cashbook: client-supplied id is only a hint — RLS decides if this user may see it.
    let cashbook: { id: string; user_id: string } | null = null;
    if (typeof body?.cashbookId === "string") {
      const { data } = await db.from("cashbooks").select("id,user_id").eq("id", body.cashbookId).maybeSingle();
      cashbook = data;
      if (!cashbook) return fail("You don't have access to that cashbook.");
    } else {
      const { data } = await db.from("cashbooks").select("id,user_id").eq("user_id", user.id).order("created_at").limit(1).maybeSingle();
      cashbook = data;
    }
    if (!cashbook) return fail("No cashbook found. Create a cashbook first.");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return fail("Charm AI is not configured yet.");

    const ctx: Ctx = { db, ownerId: cashbook.user_id, cashbookId: cashbook.id, used: new Set(), metrics: {} };
    const input: unknown[] = [
      { role: "system", content: instructions(lang) },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    for (let step = 0; step < 8; step++) {
      const { status, output } = await callModel(input, apiKey);
      if (status === 429) return fail("Charm is busy right now. Please try again in a moment.");
      if (status === 402) return fail("Charm AI credits have run out. Please contact support to top up.");
      if (status !== 200) return fail("Charm couldn't answer right now. Please try again.");
      input.push(...output);
      const calls = output.filter((o) => o.type === "function_call");
      if (calls.length === 0) {
        const text = output.filter((o) => o.type === "message")
          .flatMap((o) => (o.content as Json[] ?? []).map((c) => (c.text as string) ?? "")).join("").trim();
        if (!text) return fail("Charm couldn't answer that. Please rephrase your question.");
        const usedData = ctx.used.size > 0;
        return reply({
          success: true, answer: text, message: text, reply: text, language: /[ʼ']?\b(waa|maxaa|imisa|lacag|macaamiil)\b/i.test(message) ? "so" : lang,
          category: usedData ? "business" : "business_help", response_type: usedData ? "business_answer" : "general",
          data_used: [...ctx.used], metrics: ctx.metrics, data: [],
        });
      }
      for (const c of calls) {
        let result: unknown;
        try { result = await runTool(ctx, String(c.name), JSON.parse(String(c.arguments || "{}"))); }
        catch { result = { error: "Data temporarily unavailable" }; }
        input.push({ type: "function_call_output", call_id: c.call_id, output: JSON.stringify(result) });
      }
    }
    return fail("That question needed too many steps. Please ask something more specific.");
  } catch (e) {
    console.error("ai-assistant error", e);
    return fail("Something went wrong. Please try again.");
  }
});
