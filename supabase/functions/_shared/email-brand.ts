// CashbookCharm shared email design system.
// Reusable EmailLayout / EmailHeader / EmailFooter / EmailButton primitives
// rendered as email-safe HTML tables (works in every client, no build step).

export const BRAND = {
  name: "CashbookCharm",
  logo: "https://cashbook-charm.lovable.app/__l5e/assets-v1/4b3024ac-06c4-48f5-8668-a0387833b6f8/cashbookcharm-billing-logo.jpeg",
  tagline: "Simple bookkeeping for modern businesses.",
  site: "https://cashbookcharm.online",
  app: "https://app.cashbookcharm.online",
  support: "support@cashbookcharm.online",
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  ink: "#0F172A",
  body: "#475569",
  muted: "#94A3B8",
  border: "#E2E8F0",
  surface: "#FFFFFF",
  canvas: "#F4F6FB",
  social: {
    x: "https://x.com/cashbookcharm",
    instagram: "https://instagram.com/cashbookcharm",
    youtube: "https://youtube.com/@cashbookcharm",
  },
};

export function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function EmailButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 8px;"><tr><td style="border-radius:12px;background:${BRAND.primary};">
    <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

function EmailHeader(): string {
  return `<tr><td style="padding:26px 28px;background:linear-gradient(135deg,${BRAND.primaryDark},${BRAND.primary});">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px;">
        <img src="${BRAND.logo}" width="40" height="40" alt="${BRAND.name}" style="display:block;width:40px;height:40px;border-radius:12px;border:0;outline:none;text-decoration:none;" />
      </td>
      <td style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.02em;">${BRAND.name}</div>
        <div style="color:rgba(255,255,255,0.82);font-size:12px;margin-top:2px;">${BRAND.tagline}</div>
      </td>
    </tr></table>
  </td></tr>`;
}

function socialLink(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin:0 6px;padding:6px 10px;border:1px solid ${BRAND.border};border-radius:8px;color:${BRAND.body};font-size:12px;font-weight:600;text-decoration:none;">${label}</a>`;
}

function EmailFooter(): string {
  return `<tr><td style="padding:22px 28px 28px;border-top:1px solid ${BRAND.border};background:#FBFCFE;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="font-size:14px;font-weight:700;color:${BRAND.ink};">${BRAND.name}</div>
    <div style="font-size:13px;color:${BRAND.body};margin-top:2px;">${BRAND.tagline}</div>
    <div style="margin-top:12px;font-size:12px;color:${BRAND.body};line-height:1.7;">
      Website: <a href="${BRAND.site}" style="color:${BRAND.primary};text-decoration:none;">cashbookcharm.online</a><br>
      Support: <a href="mailto:${BRAND.support}" style="color:${BRAND.primary};text-decoration:none;">${BRAND.support}</a>
    </div>
    <div style="margin-top:14px;">
      ${socialLink("X", BRAND.social.x)}${socialLink("Instagram", BRAND.social.instagram)}${socialLink("YouTube", BRAND.social.youtube)}
    </div>
    <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:${BRAND.muted};">
      You received this email because you created an account, subscribed to ${BRAND.name}, or used our services.<br>
      <a href="${BRAND.app}/settings?tab=notifications" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>
      &nbsp;·&nbsp; © 2026 ${BRAND.name}. All rights reserved.
    </p>
  </td></tr>`;
}

/** Full responsive shell used by every CashbookCharm email. */
export function EmailLayout(opts: {
  title: string;
  body: string;
  cta?: { label: string; url: string };
  preheader?: string;
  securityNote?: boolean;
}): string {
  const { title, body, cta, preheader, securityNote } = opts;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${BRAND.surface};border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
        ${EmailHeader()}
        <tr><td style="padding:30px 28px 6px;">
          <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:${BRAND.ink};letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
          <div style="font-size:15px;line-height:1.7;color:${BRAND.body};">${body}</div>
          ${cta ? EmailButton(cta.label, cta.url) : ""}
          ${cta ? `<p style="font-size:11px;color:${BRAND.muted};word-break:break-all;margin:4px 0 0;">Or paste this link into your browser:<br>${cta.url}</p>` : ""}
          ${securityNote ? `<p style="margin:20px 0 0;padding:12px 14px;background:#F1F5F9;border-radius:10px;font-size:12px;color:${BRAND.body};">This is an automated security email from ${BRAND.name}. Please do not reply. If you did not request it, you can safely ignore this message.</p>` : ""}
        </td></tr>
        <tr><td style="height:18px;"></td></tr>
        ${EmailFooter()}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Bulleted feature list rendered as a card. */
export function FeatureCard(heading: string, features: string[]): string {
  const rows = features
    .map(
      (f) =>
        `<tr><td style="padding:6px 0;font-size:14px;color:${BRAND.ink};">
          <span style="display:inline-block;width:18px;height:18px;border-radius:9px;background:${BRAND.primary}1A;color:${BRAND.primary};text-align:center;line-height:18px;font-size:11px;font-weight:700;margin-right:8px;">✓</span>${escapeHtml(f)}
        </td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid ${BRAND.border};border-radius:14px;background:#FBFCFE;">
    <tr><td style="padding:16px 18px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.primary};margin-bottom:8px;">${escapeHtml(heading)}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
    </td></tr>
  </table>`;
}

/** Key/value summary table (payment details). */
export function SummaryTable(rows: Array<[string, string]>): string {
  const body = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:9px 0;font-size:13px;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border};">${escapeHtml(k)}</td>
          <td style="padding:9px 0;font-size:13px;font-weight:600;color:${BRAND.ink};text-align:right;border-bottom:1px solid ${BRAND.border};">${escapeHtml(v)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${body}</table>`;
}

export const PLAN_BENEFITS: Record<string, string[]> = {
  starter: [
    "1 Cashbook",
    "Basic transaction tracking",
    "Income and expense management",
    "Basic reports",
    "14-day free trial",
  ],
  pro: [
    "New Sales",
    "Sales Invoices",
    "Product Catalog Management",
    "Inventory Management",
    "Credit & Receivables Management",
    "Returns & Credit Notes",
    "Unlimited cashbooks",
    "Charm AI Financial Assistant",
    "Image scanner import from receipt",
    "Previous Recurring Payment",
    "Advanced Reports",
    "Direct Customer Call",
    "Email & WhatsApp Contact",
    "PDF / CSV exports",
    "Customer reminders (WhatsApp & SMS)",
    "Attachments & receipts",
    "WhatsApp Support within 30 minutes",
    "Email Support",
    "CSV Transactions Bulk Import"
],
  team: [
    "Everything in Pro (Sales, Invoices, Inventory, etc.)",
    "Team members & roles (up to 10)",
    "Shared cashbooks with role permissions",
    "Audit logs & full change history",
    "Team Dashboard & Activity Tracking",
    "Team Invitations & Member Roles",
    "Real-time Team Updates",
    "Priority WhatsApp Support within 30 minutes",
    "Dedicated Email Support"
],

};


export function planKey(name?: string): "starter" | "pro" | "team" {
  const n = (name ?? "").toLowerCase();
  if (n.includes("team")) return "team";
  if (n.includes("pro")) return "pro";
  return "starter";
}
