// Verifies a Sifalo Pay payment by order_id (or sid) and activates the plan.
// Idempotent: repeated calls never double-activate.
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
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ ok: false, status: "failed", error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return j({ ok: false, status: "failed", error: "Unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsErr || !claims?.claims?.sub) return j({ ok: false, status: "failed", error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  let body: { order_id?: string; sid?: string };
  try { body = await req.json(); } catch { return j({ ok: false, status: "failed", error: "Invalid JSON" }, 400); }
  const orderId = String(body.order_id ?? "").trim();
  const sidIn = String(body.sid ?? "").trim();
  if (!orderId && !sidIn) return j({ ok: false, status: "failed", error: "order_id or sid required" }, 400);

  let q = admin.from("payments").select("*").eq("user_id", userId);
  q = orderId ? q.eq("order_id", orderId) : q.eq("sid", sidIn);
  const { data: payment } = await q.maybeSingle();
  if (!payment) return j({ ok: false, status: "failed", error: "Payment not found" }, 404);

  const { data: sub } = await admin.from("subscriptions").select("*")
    .eq("user_id", userId).eq("order_id", payment.order_id).maybeSingle();

  if (payment.status === "success" && sub?.status === "active") {
    return j({ ok: true, status: "success", already_active: true, plan: payment.plan });
  }

  // Persist the sid Sifalo appended to the return URL, if it's new.
  if (sidIn && sidIn !== payment.sid) {
    await admin.from("payments").update({ sid: sidIn }).eq("id", payment.id);
    if (sub) await admin.from("subscriptions").update({ sifalo_sid: sidIn }).eq("id", sub.id);
    payment.sid = sidIn;
  }

  // Ask Sifalo for the payment status.
  // verify.php is a POST endpoint that takes JSON { sid } (or { order_id }).
  const ref = payment.sid || sidIn || "";
  const verifyBody: Record<string, string> = ref ? { sid: ref } : { order_id: payment.order_id };
  let code = "";
  let statusText = "";
  try {
    const res = await fetch("https://api.sifalopay.com/gateway/verify.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${basic}` },
      body: JSON.stringify(verifyBody),
    });
    const raw = await res.text();
    console.log("[sifalo-verify] request", verifyBody, "response", res.status, raw.slice(0, 600));
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(raw); } catch { /* non-JSON */ }
    const nested = (data.data ?? {}) as Record<string, unknown>;
    code = String(data.code ?? nested.code ?? "");
    statusText = String(data.status ?? nested.status ?? data.payment_status ?? "").toLowerCase();
    const returnedSid = String(data.sid ?? nested.sid ?? "");
    if (returnedSid && returnedSid !== payment.sid) {
      await admin.from("payments").update({ sid: returnedSid }).eq("id", payment.id);
    }
    await admin.from("payments")
      .update({ sifalo_code: Number(code) || null, sifalo_response: data })
      .eq("id", payment.id);
  } catch (e) {
    console.error("[sifalo-verify] error", e);
    return j({ ok: false, status: "pending", error: "Could not reach payment gateway" });
  }



  const success = code === "601" || ["success", "paid", "completed", "approved"].some((s) => statusText.includes(s));
  const failed = ["fail", "cancel", "reject", "declin", "error"].some((s) => statusText.includes(s)) ||
    ["602", "604", "605"].includes(code);

  if (!success) {
    const next = failed ? "failed" : "pending";
    await admin.from("payments").update({ status: next }).eq("id", payment.id);
    if (sub) await admin.from("subscriptions").update({ status: next }).eq("id", sub.id);
    return j({ ok: false, status: next, plan: payment.plan, error: failed ? "Payment failed or was cancelled" : "Payment not confirmed yet" });
  }

  const cycle = payment.billing_cycle === "yearly" ? "yearly" : "monthly";
  const expire = new Date(Date.now() + (cycle === "yearly" ? 365 : 30) * 86400_000).toISOString();

  await admin.from("payments").update({ status: "success" }).eq("id", payment.id);
  if (sub) {
    await admin.from("subscriptions").update({
      status: "active", start_date: new Date().toISOString(), expire_date: expire,
    }).eq("id", sub.id);
  }
  await admin.from("profiles").update({
    plan_type: payment.plan,
    plan_updated_at: new Date().toISOString(),
    subscription_expires: expire,
    trial_ends_at: null,
    trial_plan: null,
  }).eq("user_id", userId);


  // --- Payment receipt email + in-app notification ---------------------------
  const planName = String(payment.plan ?? "").replace(/^./, (c) => c.toUpperCase()) + " Plan";
  try {
    await admin.from("notifications").insert({
      user_id: userId,
      title: "Payment successful",
      body: `Your ${planName} (${cycle}) subscription is now active.`,
      category: "payment",
      link: "/settings?tab=billing",
      metadata: { order_id: payment.order_id, amount: payment.amount },
    });
  } catch (e) {
    console.error("[sifalo-verify] notification failed", e);
  }

  try {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    const { data: profile } = await admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
    if (email) {
      const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({
          to: email,
          type: "payment-receipt",
          data: {
            name: profile?.display_name ?? email.split("@")[0],
            customerName: profile?.display_name ?? email.split("@")[0],
            planName,
            billingPeriod: cycle === "yearly" ? "Yearly" : "Monthly",
            amount: String(payment.amount ?? ""),
            currency: String(payment.currency ?? "USD"),
            paymentDate: new Date().toISOString().slice(0, 10),
            transactionId: String(payment.sid ?? payment.order_id ?? "-"),
            receiptNumber: String(payment.order_id ?? ""),
            paymentMethod: "Sifalo Pay",
            status: "Paid",
          },
        }),
      });
      console.log("[sifalo-verify] receipt email", emailRes.status, await emailRes.text());
    }
  } catch (e) {
    console.error("[sifalo-verify] receipt email failed", e);
  }

  console.log("[sifalo-verify] activated", { userId, plan: payment.plan });
  return j({ ok: true, status: "success", plan: payment.plan, expire_date: expire });
});
