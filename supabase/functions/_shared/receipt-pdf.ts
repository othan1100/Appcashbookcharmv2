// Minimal dependency-free PDF writer for CashbookCharm payment receipts.
// Produces a single-page A4 invoice with the brand header, customer and
// subscription details, plan benefits and a company footer.

import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { BRAND } from "./email-brand.ts";

interface Op {
  text: string;
}

const A4 = { w: 595.28, h: 841.89 };

function esc(s: string): string {
  // Latin-1 safe: drop characters the base-14 fonts cannot render.
  return s
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

class Page {
  private ops: Op[] = [];
  y = A4.h - 56;

  rect(x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
    this.ops.push({ text: `${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x} ${y} ${w} ${h} re f` });
  }

  text(x: number, y: number, s: string, size = 10, bold = false, rgb: [number, number, number] = [0.06, 0.09, 0.16]) {
    this.ops.push({
      text: `BT ${rgb[0]} ${rgb[1]} ${rgb[2]} rg /${bold ? "FB" : "FR"} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`,
    });
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.ops.push({ text: `0.886 0.910 0.941 RG 0.8 w ${x1} ${y1} m ${x2} ${y2} l S` });
  }

  stream(): string {
    return this.ops.map((o) => o.text).join("\n");
  }
}

export interface ReceiptData {
  receiptNumber: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  billingPeriod: string;
  amount: string;
  currency: string;
  paymentDate: string;
  transactionId: string;
  paymentMethod: string;
  status: string;
  benefits: string[];
}

export async function buildReceiptPdf(d: ReceiptData): Promise<Uint8Array> {
  const p = new Page();
  const M = 48;

  // Header band
  p.rect(0, A4.h - 96, A4.w, 96, [0.145, 0.388, 0.922]);
  p.text(M + 46, A4.h - 54, "CashbookCharm", 17, true, [1, 1, 1]);
  p.text(M + 46, A4.h - 68, "Simple bookkeeping for modern businesses.", 9, false, [0.92, 0.95, 1]);
  p.text(A4.w - M - 92, A4.h - 54, "PAYMENT RECEIPT", 11, true, [1, 1, 1]);

  let y = A4.h - 132;
  p.text(M, y, `Receipt number: ${d.receiptNumber}`, 10, true);
  p.text(A4.w - M - 180, y, `Date: ${d.paymentDate}`, 10);
  y -= 26;
  p.line(M, y, A4.w - M, y);

  // Billed to
  y -= 24;
  p.text(M, y, "BILLED TO", 9, true, [0.42, 0.45, 0.5]);
  y -= 16;
  p.text(M, y, d.customerName, 12, true);
  y -= 14;
  p.text(M, y, d.customerEmail, 10, false, [0.28, 0.33, 0.41]);

  // Subscription details
  y -= 30;
  p.text(M, y, "SUBSCRIPTION DETAILS", 9, true, [0.42, 0.45, 0.5]);
  y -= 8;
  const rows: Array<[string, string]> = [
    ["Plan", d.planName],
    ["Billing period", d.billingPeriod],
    ["Payment method", d.paymentMethod],
    ["Transaction ID", d.transactionId],
    ["Status", d.status],
  ];
  for (const [k, v] of rows) {
    y -= 20;
    p.text(M, y, k, 10, false, [0.42, 0.45, 0.5]);
    p.text(M + 180, y, v, 10, true);
    p.line(M, y - 7, A4.w - M, y - 7);
  }

  // Total
  y -= 34;
  p.rect(M, y - 12, A4.w - M * 2, 40, [0.949, 0.965, 1]);
  p.text(M + 16, y + 6, "Amount paid", 11, true, [0.145, 0.388, 0.922]);
  p.text(A4.w - M - 140, y + 4, `${d.currency} ${d.amount}`, 15, true, [0.145, 0.388, 0.922]);

  // Plan benefits
  y -= 52;
  p.text(M, y, "YOUR PLAN BENEFITS", 9, true, [0.42, 0.45, 0.5]);
  const benefitSpacing = Math.min(17, (y - 118) / Math.max(1, d.benefits.length));
  for (const b of d.benefits) {
    y -= benefitSpacing;
    p.rect(M + 1, y + 2, 5, 5, [0.145, 0.388, 0.922]);
    p.text(M + 14, y, b, 9);
  }

  // Footer
  p.line(M, 96, A4.w - M, 96);
  p.text(M, 80, "CashbookCharm", 10, true);
  p.text(M, 66, "https://cashbookcharm.online  |  support@cashbookcharm.online", 9, false, [0.42, 0.45, 0.5]);
  p.text(M, 52, "This receipt was generated automatically. Thank you for your business.", 8, false, [0.58, 0.61, 0.67]);
  p.text(M, 38, "(c) 2026 CashbookCharm. All rights reserved.", 8, false, [0.58, 0.61, 0.67]);

  const pdf = await PDFDocument.load(assemble(p.stream()));
  const response = await fetch(BRAND.logo);
  if (!response.ok) throw new Error(`Receipt logo could not load (${response.status})`);
  const logo = await pdf.embedJpg(await response.arrayBuffer());
  pdf.getPages()[0].drawImage(logo, { x: M, y: A4.h - 74, width: 34, height: 34 });
  return pdf.save();
}

function assemble(content: string): Uint8Array {
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /FR 5 0 R /FB 6 0 R >> >> /Contents 4 0 R >>`,
  );
  objects.push(`__STREAM__`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const offsets: number[] = [];
  const push = (s: string) => {
    const b = enc.encode(s);
    chunks.push(b);
    offset += b.length;
  };

  push("%PDF-1.4\n");
  objects.forEach((o, i) => {
    offsets.push(offset);
    if (o === "__STREAM__") {
      push(`${i + 1} 0 obj\n<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream\nendobj\n`);
    } else {
      push(`${i + 1} 0 obj\n${o}\nendobj\n`);
    }
  });

  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
