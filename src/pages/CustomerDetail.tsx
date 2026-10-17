import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Loader2,
  Share2,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCustomers, useTransactions } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/format";
import { generateCustomerStatement } from "@/lib/pdf";
import { useBusinessName } from "@/hooks/useBusinessName";
import { toast } from "@/hooks/use-toast";
import { CustomerImportDialog } from "@/components/CustomerImportDialog";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customers, loading: cLoading, refresh: refreshCust } = useCustomers();
  const { data: transactions, loading: tLoading, refresh: refreshTx } = useTransactions();
  const businessName = useBusinessName();
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const customer = useMemo(() => customers.find((c) => c.id === id), [customers, id]);
  const txs = useMemo(() => transactions.filter((t) => t.customer_id === id), [transactions, id]);
  const balance = useMemo(
    () => txs.reduce((s, t) => s + (t.type === "in" ? Number(t.amount) : -Number(t.amount)), 0),
    [txs],
  );
  const totals = useMemo(() => ({
    cashIn: txs.filter((t) => t.type === "in").reduce((s, t) => s + Number(t.amount), 0),
    cashOut: txs.filter((t) => t.type === "out").reduce((s, t) => s + Number(t.amount), 0),
  }), [txs]);

  if (cLoading || tLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/customers")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Button>
        <p className="text-sm text-muted-foreground">Customer not found.</p>
      </div>
    );
  }

  const positive = balance >= 0;

  const handleDeleteCustomer = async () => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name}?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("customers").delete().eq("id", customer.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Customer deleted" });
    navigate("/customers");
  };

  const generatePDF = () => {
    if (txs.length === 0) {
      return toast({ title: "No transactions", description: `${customer.name} has no transactions yet.` });
    }
    generateCustomerStatement({
      businessName,
      customer: { name: customer.name, phone: customer.phone, email: customer.email },
      transactions: txs.map((t) => ({
        date: t.date,
        type: t.type,
        category: t.category,
        payment_method: t.payment_method,
        note: t.note,
        amount: Number(t.amount),
      })),
    });
  };

  const sendWhatsApp = () => {
    if (!customer.phone) return toast({ title: "No phone", description: "Customer has no phone number on file." });
    const lines = txs
      .slice(0, 15)
      .map((t) => `${formatDate(t.date)} · ${t.type === "in" ? "+" : "−"}${formatMoney(Number(t.amount))} · ${t.category}`)
      .join("\n");
    const summary = `*${businessName} — Statement*\nCustomer: ${customer.name}\nNet Balance: ${formatMoney(balance)}\n\n${lines}`;
    window.open(`https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(summary)}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-8 animate-fade-in">
      {/* Top Header Row (matches Screenshot IMG_2616.jpeg) */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/customers")}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All customers</span>
        </button>

        <button
          onClick={handleDeleteCustomer}
          disabled={deleting}
          className="flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>{deleting ? "Deleting..." : "Delete Customer"}</span>
        </button>
      </div>

      {/* Main Profile & Actions Card (matches Screenshot IMG_2616.jpeg) */}
      <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-2xl font-bold uppercase text-blue-700 dark:text-blue-300 shadow-sm">
            {customer.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-foreground">{customer.name}</h1>
            {customer.phone && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-blue-600" />
                <span>{customer.phone}</span>
              </p>
            )}
            {customer.email && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-blue-600" />
                <span>{customer.email}</span>
              </p>
            )}
          </div>
        </div>

        {/* NET BALANCE */}
        <div className="pt-1">
          <p className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-tight ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {positive ? "+" : "−"}{formatMoney(Math.abs(balance)).replace("-", "")}
          </p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
            NET BALANCE
          </p>
        </div>

        {/* 6 Action Buttons (2 columns) */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            onClick={() => customer.phone ? window.open(`tel:${customer.phone}`) : toast({ title: "No phone number" })}
            className="h-11 rounded-xl gap-2 font-medium border-border/80 text-foreground"
          >
            <Phone className="h-4 w-4 text-emerald-600" />
            <span>Call</span>
          </Button>

          <Button
            variant="outline"
            onClick={sendWhatsApp}
            className="h-11 rounded-xl gap-2 font-medium border-border/80 text-foreground"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <span>WhatsApp</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => customer.email ? window.open(`mailto:${customer.email}`) : toast({ title: "No email address" })}
            className="h-11 rounded-xl gap-2 font-medium border-border/80 text-foreground"
          >
            <Mail className="h-4 w-4 text-blue-600" />
            <span>Email</span>
          </Button>

          <Button
            variant="outline"
            onClick={generatePDF}
            className="h-11 rounded-xl gap-2 font-medium border-border/80 text-foreground"
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Statement</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate(`/invoices?customer=${customer.id}`)}
            className="h-11 rounded-xl gap-2 font-medium border-border/80 text-foreground"
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Create Invoice</span>
          </Button>

          <Button
            variant="outline"
            onClick={generatePDF}
            className="h-11 rounded-xl gap-2 font-medium border-border/80 text-foreground"
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <span>Export PDF</span>
          </Button>
        </div>

        {/* Previous Recurring Payment Full Width Button */}
        <Button
          onClick={() => setImportOpen(true)}
          className="h-12 w-full gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
        >
          <Sparkles className="h-4 w-4" />
          <span>Previous Recurring Payment</span>
        </Button>
      </div>

      {/* 2 Stat Cards (TOTAL INCOME / TOTAL EXPENSES) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            TOTAL INCOME
          </p>
          <p className="font-mono text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            +{formatMoney(totals.cashIn)}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            TOTAL EXPENSES
          </p>
          <p className="font-mono text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
            −{formatMoney(totals.cashOut)}
          </p>
        </div>
      </div>

      {/* TRANSACTIONS Card */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          TRANSACTIONS
        </p>
        <p className="text-2xl font-extrabold text-foreground">{txs.length}</p>

        {txs.length > 0 && (
          <ul className="divide-y divide-border/60 pt-2">
            {txs.map((t) => {
              const isIn = t.type === "in";
              return (
                <li key={t.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {isIn ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{t.category}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <span className={`font-mono text-xs font-bold ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
                    {isIn ? "+" : "−"}{formatMoney(Number(t.amount)).replace("-", "")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CustomerImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        customer={customer}
        onSaved={() => {
          refreshTx();
          refreshCust();
        }}
      />
    </div>
  );
}
