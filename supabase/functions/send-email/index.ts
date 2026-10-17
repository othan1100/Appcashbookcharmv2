// CashbookCharm central email sender (Resend).
//
// Two entry paths:
//  1. Supabase Auth "Send Email" hook  -> body { user, email_data }
//     Sends security emails from noreply@cashbookcharm.online
//  2. App calls via supabase.functions.invoke("send-email", { body })
//     -> body { to, type, data } with sender routed by purpose.
//
// Sender responsibilities (do not mix):
//   noreply@  Authentication + security only
//   hello@    Welcome, onboarding, product & marketing
//   billing@  Receipts, invoices, subscription billing
//   support@  Customer support conversations
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  BRAND,
  EmailLayout,
  FeatureCard,
  SummaryTable,
  PLAN_BENEFITS,
  planKey,
  escapeHtml,
} from "../_shared/email-brand.ts";
import { buildReceiptPdf, toBase64 } from "../_shared/receipt-pdf.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = BRAND.app;

type EmailType =
  | "welcome"
  | "verify-email"
  | "forgot-password"
  | "reset-password"
  | "magic-link"
  | "security-alert"
  | "product-update"
  | "support"
  | "team-invitation"
  | "payment-receipt"
  | "billing";

const NOREPLY = `CashbookCharm <noreply@cashbookcharm.online>`;
const HELLO = `CashbookCharm <hello@cashbookcharm.online>`;
const BILLING = `CashbookCharm Billing <billing@cashbookcharm.online>`;
const SUPPORT = `CashbookCharm Support <support@cashbookcharm.online>`;

const SENDERS: Record<EmailType, string> = {
  // 1. Authentication + security only
  "verify-email": NOREPLY,
  "forgot-password": NOREPLY,
  "reset-password": NOREPLY,
  "magic-link": NOREPLY,
  "security-alert": NOREPLY,
  // 2. Welcome, product communication & marketing
  "welcome": HELLO,
  "product-update": HELLO,
  "team-invitation": HELLO,
  // 3. Billing & payments
  "payment-receipt": BILLING,
  "billing": BILLING,
  // 4. Customer support
  "support": SUPPORT,
};

// Auth/security mail must never invite a reply.
const NO_REPLY_TYPES = new Set<EmailType>([
  "verify-email",
  "forgot-password",
  "reset-password",
  "magic-link",
  "security-alert",
]);

type Data = Record<string, string | undefined>;

function receiptRows(d: Data) {
  return [
    ["Customer", d.customerName || d.name || ""],
    ["Plan", d.planName || ""],
    ["Billing period", d.billingPeriod || ""],
    ["Amount paid", `${d.currency || "USD"} ${d.amount || "0.00"}`],
    ["Payment date", d.paymentDate || new Date().toISOString().slice(0, 10)],
    ["Transaction ID", d.transactionId || ""],
    ["Payment method", d.paymentMethod || "Sifalo Pay"],
    ["Status", d.status || "Paid"],
  ] as Array<[string, string]>;
}

function render(type: EmailType, d: Data): { subject: string; html: string } {
  const name = d.name || d.customerName || "there";

  switch (type) {
    case "welcome":
      return {
        subject: "Welcome to CashbookCharm 🎉",
        html: EmailLayout({
          title: `Welcome, ${escapeHtml(name)}!`,
          preheader: "Your CashbookCharm account is ready — start tracking today.",
          body: `<p>Your CashbookCharm account has been created and your <strong>14-day Pro trial</strong> has started. You can begin managing your business records straight away.</p>
            ${FeatureCard("What you can do", [
              "Track income and expenses",
              "Manage customers",
              "Monitor transactions",
              "Generate reports",
            ])}
            <p>Need a hand getting started? Just email <a href="mailto:${BRAND.support}" style="color:${BRAND.primary};">${BRAND.support}</a>.</p>`,
          cta: { label: "Get Started", url: d.url || APP_URL },
        }),
      };

    case "verify-email":
      return {
        subject: "Verify your CashbookCharm account",
        html: EmailLayout({
          title: "Verify your email address",
          preheader: "Confirm your email to activate your CashbookCharm account.",
          body: `<p>Hi ${escapeHtml(name)}, please confirm your email address to activate your CashbookCharm account.</p>
            <p>Verifying your email keeps your account secure and makes sure you can always recover access.</p>`,
          cta: { label: "Verify Email", url: d.url || APP_URL },
          securityNote: true,
        }),
      };

    case "forgot-password":
    case "reset-password":
      return {
        subject: "Reset your CashbookCharm password",
        html: EmailLayout({
          title: "Reset your password",
          preheader: "A password reset was requested for your account.",
          body: `<p>We received a request to reset the password for your CashbookCharm account.</p>
            <p>This link expires in <strong>60 minutes</strong> and can be used once.</p>`,
          cta: { label: "Reset Password", url: d.url || `${APP_URL}/reset-password` },
          securityNote: true,
        }),
      };

    case "magic-link":
      return {
        subject: "Your CashbookCharm sign-in link",
        html: EmailLayout({
          title: "Sign in to CashbookCharm",
          body: `<p>Use the secure link below to sign in. It expires shortly and can only be used once.</p>`,
          cta: { label: "Sign In", url: d.url || APP_URL },
          securityNote: true,
        }),
      };

    case "security-alert":
      return {
        subject: d.subject || "Security update on your CashbookCharm account",
        html: EmailLayout({
          title: d.title || "Security update",
          body: d.body || `<p>A security setting on your account was changed.</p>`,
          cta: d.url ? { label: "Review account", url: d.url } : undefined,
          securityNote: true,
        }),
      };

    case "team-invitation":
      return {
        subject: "You have been invited to join a CashbookCharm team 🚀",
        html: EmailLayout({
          title: `Join ${escapeHtml(d.teamName || "the team")} on CashbookCharm`,
          preheader: `${d.inviterName || "A teammate"} invited you to collaborate.`,
          body: `<p><strong>${escapeHtml(d.inviterName || "A teammate")}</strong> invited you to join <strong>${escapeHtml(d.teamName || "their team")}</strong> as <strong>${escapeHtml(d.role || "member")}</strong>.</p>
            ${d.message ? `<p style="padding:12px 14px;background:#F1F5F9;border-radius:10px;">${escapeHtml(d.message)}</p>` : ""}
            <p>Accept the invitation to start collaborating on shared cashbooks right away.</p>`,
          cta: { label: "Accept Invitation", url: d.url || `${APP_URL}/team` },
        }),
      };

    case "payment-receipt": {
      const key = planKey(d.planName);
      return {
        subject: "Payment Successful - Your CashbookCharm Receipt",
        html: EmailLayout({
          title: "Payment successful 🎉",
          preheader: `Receipt for your ${d.planName || "CashbookCharm"} subscription.`,
          body: `<p>Thank you, ${escapeHtml(name)}. Your payment has been received and your subscription is now <strong>Active ✅</strong>.</p>
            ${SummaryTable(receiptRows(d))}
            ${FeatureCard(`Your ${d.planName || "plan"} benefits`, PLAN_BENEFITS[key])}
            <p style="font-size:13px;color:${BRAND.muted};">A PDF copy of this receipt is attached for your records.</p>`,
          cta: { label: "View Subscription", url: d.url || `${APP_URL}/settings?tab=billing` },
        }),
      };
    }

    case "billing":
      return {
        subject: d.subject || "Your CashbookCharm billing update",
        html: EmailLayout({
          title: d.title || "Billing update",
          body: d.body || "<p>There is an update on your CashbookCharm subscription.</p>",
          cta: { label: "View Billing", url: d.url || `${APP_URL}/settings?tab=billing` },
        }),
      };

    case "product-update":
      return {
        subject: d.subject || "What's new in CashbookCharm",
        html: EmailLayout({
          title: d.title || "What's new in CashbookCharm",
          body: d.body || "<p>We've shipped new improvements to help you run your books faster.</p>",
          cta: { label: "Open CashbookCharm", url: d.url || APP_URL },
        }),
      };

    case "support":
    default:
      return {
        subject: d.subject || "CashbookCharm support",
        html: EmailLayout({
          title: d.title || "We're on it",
          body: d.body || "<p>Our support team has received your message and will reply shortly.</p>",
          cta: d.url ? { label: "Open CashbookCharm", url: d.url } : undefined,
        }),
      };
  }
}

// ---- Supabase Auth hook support -------------------------------------------

const AUTH_ACTION_TO_TYPE: Record<string, EmailType> = {
  signup: "verify-email",
  invite: "team-invitation",
  magiclink: "magic-link",
  recovery: "reset-password",
  email_change: "verify-email",
  email_change_current: "verify-email",
  email_change_new: "verify-email",
  reauthentication: "security-alert",
};

async function verifyHookSignature(raw: string, headers: Headers): Promise<boolean> {
  if (!HOOK_SECRET) return true; // no secret configured — hook verification disabled
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) return false;

  const secret = HOOK_SECRET.replace(/^v1,?/, "").replace(/^whsec_/, "");
  const keyBytes = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${raw}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return sigHeader.split(" ").some((p) => p.split(",")[1] === expected);
}

function authHookEmail(payload: Record<string, unknown>): { to: string; type: EmailType; data: Data } {
  const user = payload.user as { email?: string; user_metadata?: Record<string, string> };
  const ed = payload.email_data as Record<string, string>;
  const type = AUTH_ACTION_TO_TYPE[ed.email_action_type] ?? "verify-email";
  const redirect = ed.redirect_to || APP_URL;
  const url =
    `${SUPABASE_URL}/auth/v1/verify?token=${ed.token_hash}&type=${ed.email_action_type}&redirect_to=${encodeURIComponent(redirect)}`;
  return {
    to: user?.email ?? "",
    type,
    data: {
      url,
      name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0],
      token: ed.token,
    },
  };
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY is not configured" }, 500);

    const raw = await req.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const isAuthHook = !!payload.user && !!payload.email_data;

    let to: string | string[];
    let type: EmailType | undefined;
    let data: Data = {};
    let subject: string | undefined;
    let html: string | undefined;
    let text: string | undefined;
    let fromOverride: string | undefined;
    let replyTo: string | undefined;

    if (isAuthHook) {
      if (!(await verifyHookSignature(raw, req.headers))) {
        return json({ error: "Invalid webhook signature" }, 401);
      }
      const mapped = authHookEmail(payload);
      to = mapped.to;
      type = mapped.type;
      data = mapped.data;
      // Auth hook invites are Supabase security invites, not team invites.
      if (type === "team-invitation") type = "verify-email";
    } else {
      // App-triggered email: require a valid signed-in caller.
      const authHeader = req.headers.get("Authorization") ?? "";
      const bearer = authHeader.replace("Bearer ", "").trim();
      const isService = !!SERVICE_ROLE_KEY && bearer === SERVICE_ROLE_KEY;
      if (!isService) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return json({ error: "Unauthorized" }, 401);
      }

      const b = payload as {
        to?: string | string[];
        type?: EmailType;
        data?: Data;
        subject?: string;
        html?: string;
        text?: string;
        from?: string;
        replyTo?: string;
      };
      if (!b.to) return json({ error: "Missing required field: to" }, 400);
      to = b.to;
      type = b.type;
      data = b.data ?? {};
      subject = b.subject;
      html = b.html;
      text = b.text;
      fromOverride = b.from;
      replyTo = b.replyTo;
    }

    if (!to) return json({ error: "Missing recipient" }, 400);

    if (!html && !text && type) {
      const rendered = render(type, data);
      subject = subject || rendered.subject;
      html = rendered.html;
    }
    if (!subject || (!html && !text)) {
      return json({ error: "Missing required fields: subject, and html/text or type" }, 400);
    }

    const from = fromOverride ?? (type ? SENDERS[type] : undefined) ?? NOREPLY;

    const body: Record<string, unknown> = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
    };
    if (html) body.html = html;
    if (text) body.text = text;
    if (replyTo) body.reply_to = replyTo;
    else if (!NO_REPLY_TYPES.has(type as EmailType)) body.reply_to = BRAND.support;

    // Attach a professional PDF invoice to payment receipts.
    if (type === "payment-receipt") {
      const key = planKey(data.planName);
      const pdf = await buildReceiptPdf({
        receiptNumber: data.receiptNumber || `CBC-${Date.now().toString(36).toUpperCase()}`,
        customerName: data.customerName || data.name || "Customer",
        customerEmail: Array.isArray(to) ? to[0] : to,
        planName: data.planName || "CashbookCharm",
        billingPeriod: data.billingPeriod || "Monthly",
        amount: data.amount || "0.00",
        currency: data.currency || "USD",
        paymentDate: data.paymentDate || new Date().toISOString().slice(0, 10),
        transactionId: data.transactionId || "-",
        paymentMethod: data.paymentMethod || "Sifalo Pay",
        status: data.status || "Paid",
        benefits: PLAN_BENEFITS[key],
      });
      body.attachments = [
        { filename: `CashbookCharm-Receipt-${data.transactionId || "invoice"}.pdf`, content: toBase64(pdf) },
      ];
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Resend error:", res.status, JSON.stringify(result));
      return json({ error: result.message ?? "Resend send failed", details: result }, res.status);
    }

    return json({ success: true, id: result.id });
  } catch (err) {
    console.error("send-email error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
