// Sifalo Pay — hosted checkout.
// Body: { plan: "pro" | "team", billing_cycle: "monthly" | "yearly" }
// Creates a payment + pending subscription, then asks Sifalo for a hosted
// checkout URL. Prices are ALWAYS read server-side from pricing_plans.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SIFALO_USER = Deno.env.get("SIFALO_API_USERNAME") ?? "";
const SIFALO_KEY = Deno.env.get("SIFALO_API_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
const basic = btoa(`${SIFALO_USER}:${SIFALO_KEY}`);

const j = (b: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ success: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return j({ success: false, error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimsErr || !claims?.claims?.sub) return j({ success: false, error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  let body: { plan?: string; billing_cycle?: string; return_url?: string };
  try { body = await req.json(); } catch { return j({ success: false, error: "Invalid JSON" }, 400); }

  const plan = String(body.plan ?? "").toLowerCase();
  const cycle = body.billing_cycle === "yearly" ? "yearly" : "monthly";
  if (!["pro", "team"].includes(plan)) return j({ success: false, error: "Invalid plan" }, 400);
  if (!SIFALO_USER || !SIFALO_KEY) {
    return j({ success: false, error: "Sifalo credentials not configured" }, 500);
  }

  const { data: planRow } = await admin
    .from("pricing_plans")
    .select("id, code, name, price, currency, billing_cycle")
    .eq("code", plan)
    .eq("billing_cycle", cycle)
    .eq("is_active", true)
    .maybeSingle();
  if (!planRow) return j({ success: false, error: "Plan not found" }, 404);

  const amount = Number(planRow.price);
  const currency = planRow.currency ?? "USD";
  const orderId = `cbc_${userId.slice(0, 8)}_${plan}_${cycle}_${Date.now()}`;

  const APP_ORIGIN = "https://app.cashbookcharm.online";
  const returnUrl = `${APP_ORIGIN}/billing/return?order_id=${orderId}`;

  const { error: payErr } = await admin.from("payments").insert({
    user_id: userId,
    plan_id: planRow.id,
    plan,
    billing_cycle: cycle,
    order_id: orderId,
    amount,
    currency,
    payment_method: "sifalo_checkout",
    status: "pending",
  });
  if (payErr) {
    console.error("[sifalo-checkout] payment insert", payErr);
    return j({ success: false, error: "Failed to create payment" }, 500);
  }

  const expire = new Date(Date.now() + (cycle === "yearly" ? 365 : 30) * 86400_000).toISOString();
  await admin.from("subscriptions").insert({
    user_id: userId,
    plan_id: planRow.id,
    plan,
    billing_cycle: cycle,
    status: "pending",
    amount,
    payment_gateway: "sifalo",
    order_id: orderId,
    start_date: new Date().toISOString(),
    expire_date: expire,
  });

  const payload = {
    gateway: "checkout",
    amount: String(amount),
    currency,
    order_id: orderId,
    description: `${planRow.name} (${cycle})`,
    return_url: returnUrl,
    cancel_url: `${APP_ORIGIN}/pricing`,
  };
  console.log("[sifalo-checkout] request", payload);

  let data: Record<string, unknown> = {};
  let raw = "";
  try {
    const res = await fetch("https://api.sifalopay.com/gateway/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
      body: JSON.stringify(payload),
    });
    raw = await res.text();
    console.log("[sifalo-checkout] response", res.status, raw.slice(0, 800));
    try { data = JSON.parse(raw); } catch { /* non-JSON */ }
  } catch (e) {
    console.error("[sifalo-checkout] network error", e);
    await admin.from("payments").update({ status: "failed" }).eq("order_id", orderId);
    await admin.from("subscriptions").update({ status: "failed" }).eq("order_id", orderId);
    return j({ success: false, error: "Payment gateway unreachable" }, 502);
  }

  const nested = (data.data ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = (data[k] ?? nested[k]) as string | undefined;
      if (v) return String(v);
    }
    return "";
  };

  let checkoutUrl = pick("checkout_url", "checkoutUrl", "payment_url", "redirect_url", "url", "link");
  const key = pick("key");
  const token = pick("token");
  if (!checkoutUrl && key && token) {
    // Sifalo hosted checkout: values come back already percent-encoded.
    checkoutUrl = `https://pay.sifalo.com/checkout/?key=${key}&token=${token}`;
  }
  const sid = pick("sid", "session_id", "transaction_id");
  const code = String(data.code ?? data.status ?? "");
  const message = pick("response", "message") || "Checkout could not be started";


  await admin.from("payments")
    .update({ sid: sid || null, sifalo_code: Number(code) || null, sifalo_response: data })
    .eq("order_id", orderId);
  if (sid) await admin.from("subscriptions").update({ sifalo_sid: sid }).eq("order_id", orderId);

  if (!checkoutUrl) {
    await admin.from("payments").update({ status: "failed" }).eq("order_id", orderId);
    await admin.from("subscriptions").update({ status: "failed" }).eq("order_id", orderId);
    return j({ success: false, error: message, code }, 400);
  }

  return j({ success: true, checkoutUrl, order_id: orderId, sid, amount, currency });
});
