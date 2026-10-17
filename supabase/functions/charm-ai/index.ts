// CHARM AI — bookkeeping assistant.
// Answers natural-language questions (English + Somali) strictly from the
// authenticated user's own Supabase data. RLS is preserved by querying with
// the caller's JWT, never the service role.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type ChatMessage = { role: "user" | "assistant"; content: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Not authenticated" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages.slice(-16) : [];
    const cashbookId: string | null = body?.cashbookId ?? null;
    const lang: string = body?.lang === "so" ? "so" : "en";
    if (messages.length === 0) return json({ error: "No message provided" }, 400);

    // ---- Load the user's real data (RLS-scoped) -------------------------
    let customerQuery = supabase
      .from("customers")
      .select("id, name, phone, balance, cashbook_id")
      .order("name");
    if (cashbookId) customerQuery = customerQuery.eq("cashbook_id", cashbookId);

    let txQuery = supabase
      .from("transactions")
      .select("id, date, type, amount, category, note, payment_method, customer_id, cashbook_id")
      .order("date", { ascending: false })
      .limit(600);
    if (cashbookId) txQuery = txQuery.eq("cashbook_id", cashbookId);

    const [{ data: customers, error: cErr }, { data: transactions, error: tErr }] = await Promise.all([
      customerQuery,
      txQuery,
    ]);
    if (cErr || tErr) return json({ error: (cErr ?? tErr)?.message ?? "Could not read your data" }, 400);

    const nameById = new Map((customers ?? []).map((c) => [c.id, c.name]));

    const customerLines = (customers ?? []).length
      ? (customers ?? [])
          .map((c) => `- ${c.name}${c.phone ? ` (${c.phone})` : ""} | outstanding balance: ${Number(c.balance ?? 0).toFixed(2)}`)
          .join("\n")
      : "(no customers)";

    const txLines = (transactions ?? []).length
      ? (transactions ?? [])
          .map((t) => {
            const who = t.customer_id ? nameById.get(t.customer_id) ?? "Unknown customer" : "No customer";
            return `${String(t.date).slice(0, 10)} | ${t.type} | ${Number(t.amount).toFixed(2)} | ${who} | ${t.category ?? ""}${t.note ? ` | ${t.note}` : ""}`;
          })
          .join("\n")
      : "(no transactions)";

    const today = new Date().toISOString().slice(0, 10);

    const system = `You are CHARM AI, the bookkeeping assistant inside CashbookCharm.
Today's date is ${today}.

You answer ONLY from the DATA below, which belongs to the signed-in user.
Rules:
- Never invent, guess or estimate figures. If the data does not contain the answer, say so plainly.
- Transaction types: "in"/"credit" = money received (payment), "out"/"debit" = money paid out / expense.
- Understand time ranges: today, yesterday, this week, this month, last month, this year, all time. Compute them from today's date.
- Understand and reply in the user's language. Support Somali and English (reply in the language of the question).
- Keep conversation context so follow-up questions like "When?" or "How much does he still owe?" refer to the customer discussed before.
- If the question is ambiguous (e.g. "Did Cali pay?" with no time frame), ask one short clarifying question.
- If more than one customer matches a name, list them and ask which one.
- If no customer matches, say clearly that no such customer exists.
- Format money as $1,234.56 and dates like "August 28, 2026".
- Be concise, friendly and professional. Use markdown: short paragraphs, bullet lists and small tables for multiple results, and bold the key figure.
- The user's preferred reply language is "${lang}" (en = English, so = Somali). Reply in that language unless the question is clearly written in the other one.

APP KNOWLEDGE — how CashbookCharm works (use this to answer "how do I…" questions):
- Dashboard: totals for cash in, cash out, net balance and recent activity for the active cashbook.
- Cashbooks: separate books for each business/branch; Starter = 1 cashbook, Pro/Team = unlimited.
- Transactions: each entry is cash in (money received) or cash out (money paid), with amount, category, payment method (Cash, Card, Bank, Mobile), date, optional customer, note and receipt attachment.
- Customers: each customer has a running balance = what they still owe. Payments received reduce it.
- AI Scan Previous Payment: uploads an old paper ledger or invoice photo and imports the customer plus past transactions automatically.
- Invoices & receipts: entries can carry an attached receipt; reports export professional PDF/CSV statements.
- Reports: daily/weekly/monthly/custom ranges. Starter is limited to 30 days; Pro and Team unlock all ranges and PDF/CSV export.
- Reminders: Pro/Team can send customers payment reminders by email or WhatsApp.
- Team: Team plan supports up to 10 members with Owner/Admin/Editor/Viewer roles, shared cashbooks and audit logs.
- Billing: plans are Starter (free), Pro and Team, paid via Sifalo Pay; new accounts get a 14-day Pro trial.
When asked a "how to" question, give the short step-by-step path inside the app. Never invent features that are not listed here.

DATA — CUSTOMERS (name | phone | outstanding balance owed to the user):
${customerLines}

DATA — TRANSACTIONS (date | type | amount | customer | category | note), newest first:
${txLines}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      if (res.status === 429) return json({ error: "Too many requests. Please try again in a moment." }, 429);
      if (res.status === 402) return json({ error: "AI credits exhausted. Please add credits to continue." }, 402);
      console.error("charm-ai gateway error", res.status, detail);
      return json({ error: "The assistant is unavailable right now." }, 500);
    }

    const data = await res.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? "";
    return json({ reply: reply || "Sorry, I couldn't work that out. Could you rephrase?" });
  } catch (e) {
    console.error("charm-ai error", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
