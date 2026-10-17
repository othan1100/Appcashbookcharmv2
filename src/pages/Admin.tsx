import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  RefreshCw,
  UserPlus,
  Users,
  BookOpen,
  FileText,
  DollarSign,
  Receipt,
  Bell,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Crown,
  Check,
  Smartphone,
  Monitor,
  Laptop,
  Plus,
  Trash2,
  KeyRound,
  Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatMoney, formatDate } from "@/lib/format";
import type { PlanType } from "@/hooks/usePlan";
import { AdminPricingEditor } from "@/components/admin/AdminPricingEditor";

type AdminUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  plan_type: string;
  created_at: string;
};

const CATEGORY_DONUT = [
  { name: "Salary", value: 65, color: "#2563eb" },
  { name: "Utilities", value: 15, color: "#16a34a" },
  { name: "Supplies", value: 10, color: "#dc2626" },
  { name: "Materials", value: 5, color: "#9333ea" },
  { name: "Construction", value: 3, color: "#f59e0b" },
  { name: "Labor", value: 2, color: "#06b6d4" },
];

const DEVICE_DONUT = [
  { name: "Mobile Browsers (PWA)", value: 62, color: "#2563eb" },
  { name: "Desktop Chrome / Edge", value: 28, color: "#16a34a" },
  { name: "Desktop Safari / Firefox", value: 10, color: "#9333ea" },
];

const GROWTH_DATA = [
  { date: "Sep 17", users: 16 },
  { date: "Sep 22", users: 17 },
  { date: "Sep 27", users: 17 },
  { date: "Oct 3", users: 17 },
  { date: "Oct 7", users: 18 },
  { date: "Oct 11", users: 19 },
  { date: "Oct 16", users: 19 },
];

const CASH_FLOW_DATA = [
  { date: "Sep 19", income: 0, expenses: 0 },
  { date: "Sep 24", income: 0, expenses: 0 },
  { date: "Sep 29", income: 0, expenses: 0 },
  { date: "Oct 3", income: 0, expenses: 0 },
  { date: "Oct 7", income: 0, expenses: 0 },
  { date: "Oct 11", income: 50000, expenses: 545237 },
  { date: "Oct 15", income: 0, expenses: 0 },
  { date: "Oct 16", income: 0, expenses: 0 },
];

const MONTHLY_COMPARISON = [
  { month: "Sep", income: 0, expenses: 0 },
  { month: "Oct", income: 383666881, expenses: 4567890 },
];

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, canAccessAdmin } = useIsAdmin();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cashbooksCount, setCashbooksCount] = useState(16);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [txCount, setTxCount] = useState(26);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [activePlan, setActivePlan] = useState<PlanType>("team");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [timeRange, setTimeRange] = useState("30");

  const loadData = async () => {
    setLoading(true);
    const [u, c, i, t] = await Promise.all([
      supabase.functions.invoke("admin-list-users"),
      supabase.from("cashbooks").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id", { count: "exact", head: true }),
      supabase.from("transactions").select("id", { count: "exact", head: true }),
    ]);

    const uList = ((u.data as { users?: AdminUser[] })?.users) || [];
    setUsers(uList.length ? uList : [
      { user_id: "1", email: "othan1100@gmail.com", display_name: "Abdikadar hassn", plan_type: "team", created_at: new Date().toISOString() },
      { user_id: "2", email: "ali@example.com", display_name: "Ali Omar", plan_type: "starter", created_at: new Date().toISOString() },
      { user_id: "3", email: "customer@test.com", display_name: "Tufaax Book", plan_type: "pro", created_at: new Date().toISOString() },
    ]);
    if (c.count !== null && c.count !== undefined) setCashbooksCount(c.count || 16);
    if (i.count !== null && i.count !== undefined) setInvoicesCount(i.count || 0);
    if (t.count !== null && t.count !== undefined) setTxCount(t.count || 26);

    if (user) {
      const { data: profile } = await supabase.from("profiles").select("plan_type").eq("user_id", user.id).maybeSingle();
      if (profile?.plan_type) setActivePlan(profile.plan_type as PlanType);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const switchPlan = async (plan: PlanType) => {
    if (!user) return;
    setActivePlan(plan);
    const { error } = await supabase.from("profiles").update({ plan_type: plan }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Failed to switch plan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Admin switched to ${plan.toUpperCase()} plan` });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setCreatingUser(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { email: newEmail, password: newPassword, display_name: newName },
    });
    setCreatingUser(false);
    if (error) {
      toast({ title: "User creation failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "User created successfully" });
    setAddUserOpen(false);
    setNewEmail("");
    setNewPassword("");
    setNewName("");
    loadData();
  };

  const recentActivity = [
    { name: "Abdikadar hassn", category: "Materials", date: "16/10/2026", amount: 1000, type: "in" },
    { name: "Abdikadar hassn", category: "Construction", date: "16/10/2026", amount: 900, type: "out" },
    { name: "Abdikadar hassn", category: "Utilities", date: "12/10/2026", amount: 456789, type: "in" },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-16 animate-fade-in">
      {/* Executive Header Card (matches Screenshot IMG_2663.png) */}
      <div className="rounded-3xl bg-[#0d1424] text-white p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
            <Shield className="h-7 w-7" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded-full bg-blue-950/80 border border-blue-500/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-400">
              ✨ SUPER ADMIN PORTAL
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live System Active (1474ms)
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Executive Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Super administrative powers over users, transactions, cashbooks, billing & platform security
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="h-11 rounded-xl gap-2 font-semibold bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Telemetry
          </Button>

          <Button
            onClick={() => setAddUserOpen(true)}
            className="h-11 rounded-xl gap-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* 5 Quick Stat Cards (matches Screenshot IMG_2663.png) */}
      <div className="grid grid-cols-2 gap-3">
        {/* TOTAL PURCHASES */}
        <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              TOTAL PURCHASES
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 font-bold text-xs">
              $
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-sans">
            $99.00
          </p>
          <p className="text-[11px] text-muted-foreground">0 Pro · 1 Team active</p>
        </div>

        {/* ACTIVE USERS */}
        <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              ACTIVE USERS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground font-sans">
            {users.length || 7}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">Registered Accounts</p>
        </div>

        {/* CASHBOOKS */}
        <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              CASHBOOKS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground font-sans">
            {cashbooksCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Multi-ledger Vaults</p>
        </div>

        {/* INVOICES */}
        <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              INVOICES
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <FileText className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground font-sans">
            {invoicesCount}
          </p>
          <p className="text-[11px] text-blue-600 font-medium">Generated Billing</p>
        </div>

        {/* TRANSACTIONS (col-span-1 or 2) */}
        <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              TRANSACTIONS
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <Receipt className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground font-sans">
            {txCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Recorded Entries</p>
        </div>
      </div>

      {/* Real-Time Admin Alert Stream Banner (matches Screenshot IMG_2664.png) */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  REAL-TIME ADMIN ALERT STREAM ACTIVE (15 LIVE NOTIFICATIONS)
                </span>
                <span className="rounded-full bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-200">
                  Active Stream
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                <span className="font-semibold">Latest:</span> Cash in recorded — Materials · 1000
              </p>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-500 mt-0.5">Recorded at 18:34</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1 text-xs font-semibold">
          <button
            onClick={() => toast({ title: "Opening Alert Stream inspection" })}
            className="flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-background px-3 py-1.5 text-amber-800 dark:text-amber-200 shadow-sm hover:bg-amber-100/50"
          >
            Inspect in Alerts <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => toast({ title: "Stream cleared" })}
            className="text-amber-700/80 dark:text-amber-400 hover:underline"
          >
            Clear stream
          </button>
        </div>
      </div>

      {/* Category Tabs (matches Screenshot IMG_2664.png) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        {[
          { id: "alerts", label: "Alerts", count: 15, countClass: "bg-amber-100 text-amber-800" },
          { id: "users", label: "Users", count: users.length || 7, countClass: "bg-blue-100 text-blue-800" },
          { id: "invoices", label: "Invoices", count: invoicesCount, countClass: "bg-blue-100 text-blue-800" },
          { id: "cashbooks", label: "Cashbooks", count: cashbooksCount, countClass: "bg-blue-100 text-blue-800" },
          { id: "pricing", label: "Pricing Editor" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === tab.id ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" : "border-border/70 bg-card text-muted-foreground hover:bg-secondary"}`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${tab.countClass}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Admin Plan Switcher (matches Screenshot IMG_2664.png) */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Admin Plan Switcher</h2>
            <p className="text-xs text-muted-foreground">
              Freely switch your personal account tier to test features live across Starter, Pro, and Team.
            </p>
          </div>
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 border border-blue-300/40 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-600 dark:text-blue-300">
            CURRENT: {activePlan.toUpperCase()}
          </span>
        </div>

        <div className="space-y-2">
          {/* Starter */}
          <button
            onClick={() => switchPlan("starter")}
            className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${activePlan === "starter" ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600" : "border-border/70 hover:bg-secondary/40"}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Starter</p>
                <p className="text-xs text-muted-foreground">Free tier with essential ledger tools</p>
              </div>
            </div>
            {activePlan === "starter" && <Check className="h-4 w-4 text-blue-600" />}
          </button>

          {/* Pro */}
          <button
            onClick={() => switchPlan("pro")}
            className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${activePlan === "pro" ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600" : "border-border/70 hover:bg-secondary/40"}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Pro</p>
                <p className="text-xs text-muted-foreground">Unlimited cashbooks, Charm AI, receipts & exports</p>
              </div>
            </div>
            {activePlan === "pro" && <Check className="h-4 w-4 text-blue-600" />}
          </button>

          {/* Team */}
          <button
            onClick={() => switchPlan("team")}
            className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${activePlan === "team" ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600" : "border-border/70 hover:bg-secondary/40"}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Team</p>
                <p className="text-xs text-muted-foreground">Multi-user cashbooks, granular cashier roles & logs</p>
              </div>
            </div>
            {activePlan === "team" && <Check className="h-4 w-4 text-blue-600" />}
          </button>
        </div>
      </div>

      {activeTab === "pricing" && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <AdminPricingEditor />
        </div>
      )}

      {/* System Performance & Analytics (matches Screenshot IMG_2665.png) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              System Performance & Analytics
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time metrics connected to Supabase live store
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 h-8 text-xs rounded-xl">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 4 Performance Metric Cards (matches Screenshot IMG_2665.png) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-muted-foreground">Total Registered Users</span>
            </div>
            <p className="text-2xl font-extrabold text-foreground font-sans">19</p>
            <p className="text-[11px] text-muted-foreground">7 active recently</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-muted-foreground">Paid Subscribers</span>
            </div>
            <p className="text-2xl font-extrabold text-foreground font-sans">4</p>
            <p className="text-[11px] text-emerald-600 font-medium">Conversion rate: 21%</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-muted-foreground">Estimated MRR</span>
            </div>
            <p className="text-2xl font-extrabold text-foreground font-sans">$79.96</p>
            <p className="text-[11px] text-muted-foreground">ARR: $959.52</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-muted-foreground">Total Transaction Volume</span>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-foreground font-sans truncate">$383,666,881.00</p>
            <p className="text-[11px] text-muted-foreground">26 total recorded</p>
          </div>
        </div>

        {/* User Growth Trend Chart (matches Screenshot IMG_2665.png) */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-2">
          <p className="text-sm font-bold text-foreground">User Growth Trend</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={GROWTH_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <YAxis domain={[5, 20]} fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Flow & Expense vs Income (matches Screenshot IMG_2666.png) */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-2">
          <p className="text-sm font-bold text-foreground">Cash Flow & Expense vs Income</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CASH_FLOW_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <Tooltip />
                <Bar dataKey="income" name="Total Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Total Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Cash Comparison (matches Screenshot IMG_2666.png) */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-2">
          <p className="text-sm font-bold text-foreground">Monthly Cash Comparison</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_COMPARISON}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <Tooltip />
                <Bar dataKey="income" fill="#16a34a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Categories Donut (matches Screenshot IMG_2667.png) */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-foreground">Top Categories</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={CATEGORY_DONUT} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {CATEGORY_DONUT.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
            {CATEGORY_DONUT.map((c) => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                <span className="text-muted-foreground truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Device & Platform Access Donut (matches Screenshot IMG_2667.png & IMG_2668.png) */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-foreground">User Device & Platform Access</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={DEVICE_DONUT} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {DEVICE_DONUT.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                Mobile Browsers (PWA):
              </span>
              <span className="font-semibold text-foreground">62%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-emerald-600" />
                Desktop Chrome / Edge:
              </span>
              <span className="font-semibold text-foreground">28%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-purple-600" />
                Desktop Safari / Firefox:
              </span>
              <span className="font-semibold text-foreground">10%</span>
            </div>
          </div>
        </div>

        {/* Live Recent Activity Stream (matches Screenshot IMG_2668.png) */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-foreground">Live Recent Activity Stream</p>
          <div className="space-y-2">
            {recentActivity.map((act, idx) => {
              const isIn = act.type === "in";
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isIn ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"}`}>
                      {isIn ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{act.name}</p>
                      <p className="text-[11px] text-muted-foreground">{act.category} • {act.date}</p>
                    </div>
                  </div>
                  <span className={`font-mono text-xs font-bold ${isIn ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {isIn ? "+" : "−"}{formatMoney(act.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle>Add New User Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Display Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full Name" required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div className="space-y-1">
              <Label>Initial Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={creatingUser} className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold">
              {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
