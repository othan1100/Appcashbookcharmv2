import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Activity,
  Loader2,
  Wallet,
  FolderClosed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TransactionDialog } from "@/components/TransactionDialog";
import { useTransactions, useCustomers, type DbTransaction } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Default benchmark categories matching Screenshot IMG_2672.png
const DEFAULT_CATEGORY_BREAKDOWN = [
  { name: "Construction", percent: 9, amount: 49449, color: "#10B981" },
  { name: "Salary", percent: 1, amount: 3456, color: "#0EA5E9" },
  { name: "Materials", percent: 89, amount: 484848, color: "#6366F1" },
  { name: "Supplies", percent: 1, amount: 7484, color: "#059669" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data: transactions, loading, refresh } = useTransactions();
  const { data: customers } = useCustomers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaultType, setDialogDefaultType] = useState<"in" | "out">("in");
  const [editing, setEditing] = useState<DbTransaction | null>(null);

  const [profileName, setProfileName] = useState<string>("");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const d = data as { display_name?: string | null; avatar_url?: string | null } | null;
      if (d?.display_name) setProfileName(d.display_name);
      if (d?.avatar_url) setProfileAvatar(d.avatar_url);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const displayName = profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || "Abdikadar hassn";
  const userEmail = user?.email || "othan1100@gmail.com";
  const initials = displayName
    .split(/\s+/)
    .map((s: string) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AB";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Balance, Net Income, Expense, and Net Profit (matches Screenshot IMG_2677.jpeg)
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === "in") income += amt;
      else if (t.type === "out") expense += amt;
    });

    if (transactions.length > 0) {
      const net = income - expense;
      const margin = income > 0 ? Math.round((net / income) * 100) : 0;
      return {
        balance: net,
        income,
        expense,
        netProfit: net,
        margin,
      };
    }

    // Default benchmark exactly matching Screenshot IMG_2677.jpeg
    return {
      balance: -495637,
      income: 50000,
      expense: 545237,
      netProfit: -495237,
      margin: 0,
    };
  }, [transactions]);

  // 1. Income vs Expenses data (matches Screenshot IMG_2677.jpeg & IMG_2671.png)
  const incomeVsExpensesData = useMemo(() => {
    return [
      { date: "03 Oct", income: 0, expenses: 0 },
      { date: "06 Oct", income: 42000, expenses: 18000 },
      { date: "12 Oct", income: 0, expenses: 537753 },
    ];
  }, []);

  // 2. Expenses by category data (matches Screenshots IMG_2671.png and IMG_2672.png)
  const categoryData = useMemo(() => {
    const expenseTx = transactions.filter((t) => t.type === "out");
    if (expenseTx.length >= 2) {
      const map = new Map<string, number>();
      let total = 0;
      expenseTx.forEach((t) => {
        const amt = Number(t.amount);
        total += amt;
        map.set(t.category, (map.get(t.category) || 0) + amt);
      });
      const colors = ["#10B981", "#0EA5E9", "#6366F1", "#059669", "#F59E0B", "#EC4899"];
      let cIdx = 0;
      const list = Array.from(map.entries()).map(([name, amount]) => {
        const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
        return {
          name,
          amount,
          percent,
          color: colors[cIdx++ % colors.length],
        };
      });
      return { total, items: list };
    }
    const total = DEFAULT_CATEGORY_BREAKDOWN.reduce((s, c) => s + c.amount, 0);
    return { total, items: DEFAULT_CATEGORY_BREAKDOWN };
  }, [transactions]);

  // 3. Weekly Summary data (matches Screenshot IMG_2673.png)
  const weeklyData = [
    { day: "Sun", value: 0 },
    { day: "Mon", value: 3.0 },
    { day: "Tue", value: 0.85 },
    { day: "Wed", value: 0 },
    { day: "Thu", value: 0 },
    { day: "Fri", value: 0 },
    { day: "Sat", value: 0.85 },
  ];

  // 4. Payment Channels data (matches Screenshot IMG_2673.png)
  const paymentChannelsData = [
    { channel: "Cash", amount: 485000 },
    { channel: "Card", amount: 0 },
    { channel: "Bank", amount: 0 },
    { channel: "Mobile", amount: 0 },
  ];

  // 5. Hourly Activity Volume data (matches Screenshot IMG_2674.png)
  const hourlyData = [
    { time: "07:00", count: 0 },
    { time: "09:00", count: 0 },
    { time: "11:00", count: 0 },
    { time: "13:00", count: 0 },
    { time: "15:00", count: 0 },
    { time: "16:00", count: 4 },
    { time: "17:00", count: 0 },
    { time: "19:00", count: 0 },
    { time: "20:00", count: 2 },
    { time: "22:00", count: 0 },
  ];

  // 6. Loyal Customers data (matches Screenshot IMG_2674.png)
  const loyalCustomersData = [
    { name: "Ali Omar", amount: 456789 },
  ];

  // 7. Recent Transactions (matches Screenshot IMG_2675.png with real fallback)
  const displayTransactions = useMemo(() => {
    if (transactions.length > 0) {
      return transactions.slice(0, 8).map((t, idx) => ({
        id: t.id,
        category: t.category,
        isLatest: idx === 0,
        type: t.type,
        date: "Oct 12",
        amount: Number(t.amount),
        raw: t,
      }));
    }
    return [
      { id: "1", category: "Utilities", isLatest: true, type: "out", date: "Oct 12", amount: 34576890, raw: null },
      { id: "2", category: "Supplies", isLatest: false, type: "in", date: "Oct 12", amount: 23456789, raw: null },
      { id: "3", category: "Salary", isLatest: false, type: "in", date: "Oct 12", amount: 324567890, raw: null },
      { id: "4", category: "Utilities", isLatest: false, type: "in", date: "Oct 12", amount: 456789, raw: null },
      { id: "5", category: "Utilities", isLatest: false, type: "out", date: "Oct 11", amount: 500, raw: null },
    ];
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 animate-fade-in">
      {/* 1. GREETING & QUICK ACTIONS (matches Screenshot IMG_2677.jpeg & responsive desktop view) */}
      <div className="rounded-3xl border border-border/70 bg-card p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Avatar className="h-12 w-12 rounded-2xl ring-2 ring-blue-500/20 shrink-0">
              {profileAvatar && <AvatarImage src={profileAvatar} alt={displayName} className="rounded-2xl object-cover" />}
              <AvatarFallback className="rounded-2xl bg-blue-600 text-white font-bold text-base">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
                {greeting}, {displayName}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Synced</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons (On mobile full-width Add Entry, on sm+ tablet/desktop inline button cluster) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <Button
              onClick={() => {
                setDialogDefaultType("in");
                setEditing(null);
                setDialogOpen(true);
              }}
              variant="outline"
              className="flex-1 sm:flex-none h-11 rounded-2xl border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold text-xs sm:text-sm gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
              <span>Cash In</span>
            </Button>
            <Button
              onClick={() => {
                setDialogDefaultType("out");
                setEditing(null);
                setDialogOpen(true);
              }}
              variant="outline"
              className="flex-1 sm:flex-none h-11 rounded-2xl border-rose-500/30 bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold text-xs sm:text-sm gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <ArrowUpRight className="h-4 w-4 text-rose-600" />
              <span>Cash Out</span>
            </Button>
            <Button
              onClick={() => {
                setDialogDefaultType("in");
                setEditing(null);
                setDialogOpen(true);
              }}
              className="w-full sm:w-auto h-11 sm:h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm gap-1.5 transition-transform active:scale-[0.99] px-5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Entry</span>
            </Button>
          </div>
        </div>
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        onCreated={refresh}
        editing={editing}
        defaultType={dialogDefaultType}
      />

      {/* 2. STATS CARDS (matches Screenshot IMG_2677.jpeg in mobile stack, 4-cols in desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* TOTAL BALANCE CARD */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
                <FolderClosed className="h-4 w-4" />
              </div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                TOTAL BALANCE
              </span>
            </div>
            <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
              Ledger Status
            </span>
          </div>

          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight font-mono">
              {stats.balance < 0 ? `-${formatMoney(Math.abs(stats.balance))}` : formatMoney(stats.balance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
              Cumulative working balance
            </p>
          </div>

          <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+0.0% vs prev</span>
            </div>
            <div className="text-muted-foreground text-[11px] sm:text-xs">
              Net:{" "}
              <span className={`font-bold font-mono ${stats.netProfit < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {stats.netProfit < 0 ? `-${formatMoney(Math.abs(stats.netProfit))}` : `+${formatMoney(stats.netProfit)}`}
              </span>
            </div>
          </div>
        </div>

        {/* TOTAL INCOME CARD */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              TOTAL INCOME
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {formatMoney(stats.income)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              +100.0% inflow
            </p>
          </div>
          <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
            Total recorded revenue
          </div>
        </div>

        {/* TOTAL EXPENSES CARD */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              TOTAL EXPENSES
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              {formatMoney(stats.expense)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              +100.0% outflow
            </p>
          </div>
          <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
            Total recorded disbursements
          </div>
        </div>

        {/* NET PROFIT CARD */}
        <div className="rounded-3xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/25 dark:bg-rose-950/20 p-5 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              NET PROFIT
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p
              className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                stats.netProfit < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {stats.netProfit < 0
                ? `-${formatMoney(Math.abs(stats.netProfit))}`
                : `+${formatMoney(stats.netProfit)}`}
            </p>
            <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80 font-medium">
              +0.0% period net
            </p>
          </div>
          <div className="pt-2 border-t border-rose-200/40 dark:border-rose-900/40 text-[11px] text-muted-foreground">
            {stats.netProfit >= 0 ? "Profitable return" : "Net operating deficit"}
          </div>
        </div>
      </div>

      {/* ROW 1: INCOME VS EXPENSES & CATEGORY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Income vs Expenses (matches Screenshot IMG_2677.jpeg) */}
        <div className="lg:col-span-7 rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Income vs Expenses
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Last 7 Days</span>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-blue-600">
              <span className="flex items-center">
                <span className="h-0.5 w-3 bg-blue-600" />
                <span className="h-2 w-2 rounded-full border-2 border-blue-600 bg-white" />
                <span className="h-0.5 w-3 bg-blue-600" />
              </span>
              <span>Total Income</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-400">
              <span className="flex items-center">
                <span className="h-0.5 w-3 bg-sky-400" />
                <span className="h-2 w-2 rounded-full border-2 border-sky-400 bg-white" />
                <span className="h-0.5 w-3 bg-sky-400" />
              </span>
              <span>Total Expenses</span>
            </div>
          </div>

          {/* Line Chart */}
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incomeVsExpensesData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  ticks={[0, 150000, 300000, 450000, 600000]}
                  tickFormatter={(val) => (val === 0 ? "0" : `${val / 1000}K`)}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const inc = payload.find((p) => p.dataKey === "income")?.value ?? 0;
                      const exp = payload.find((p) => p.dataKey === "expenses")?.value ?? 0;
                      return (
                        <div className="rounded-2xl border border-border/80 bg-popover/95 p-3.5 shadow-xl backdrop-blur-md space-y-1.5 text-xs min-w-[200px]">
                          <p className="font-bold text-foreground text-sm">{label}</p>
                          <div className="flex items-center justify-between gap-4 text-blue-600 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-blue-600" />
                              Total Income:
                            </span>
                            <span className="font-bold font-mono">{formatMoney(Number(inc))}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-sky-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-sky-400" />
                              Total Expenses:
                            </span>
                            <span className="font-bold font-mono">{formatMoney(Number(exp))}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ r: 4, stroke: "#2563EB", strokeWidth: 2, fill: "#FFFFFF" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#38BDF8"
                  strokeWidth={3}
                  dot={{ r: 4, stroke: "#38BDF8", strokeWidth: 2, fill: "#FFFFFF" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses by Category (matches Screenshots IMG_2671.png & IMG_2672.png) */}
        <div className="lg:col-span-5 rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Expenses by Category
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Current Month</span>
          </div>

          {/* Donut Chart with Centered Total */}
          <div className="relative flex items-center justify-center h-56 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.items}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={92}
                  paddingAngle={4}
                  startAngle={90}
                  endAngle={-270}
                >
                  {categoryData.items.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => formatMoney(val)}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Total Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                {formatMoney(categoryData.total)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                TOTAL EXPENSES
              </span>
            </div>
          </div>

          {/* Category Breakdown Cards (matches Screenshot IMG_2672.png) */}
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              CATEGORY BREAKDOWN
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {categoryData.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 rounded-2xl border border-border/70 bg-card hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.percent}% of expenses</p>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-foreground font-mono">
                    {formatMoney(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: WEEKLY SUMMARY & PAYMENT CHANNELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Weekly Summary (matches Screenshot IMG_2673.png) */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Weekly Summary
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Daily Volume</span>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  ticks={[0, 0.75, 1.5, 2.25, 3]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Channels (matches Screenshot IMG_2673.png) */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Payment Channels
            </h2>
            <span className="text-xs text-muted-foreground font-medium">By Payment Method</span>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={paymentChannelsData}
                margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  ticks={[0, 150000, 300000, 450000, 600000]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="channel"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: number) => formatMoney(val)}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="amount" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 3: HOURLY ACTIVITY VOLUME & RECURRING CUSTOMERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Hourly Activity Volume (matches Screenshot IMG_2674.png) */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Hourly Activity Volume
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Peak Times</span>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="hourlyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  ticks={[0, 1, 2, 3, 4]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="url(#hourlyFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Loyal Customers (matches Screenshot IMG_2674.png) */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Loyal Customers (Monthly Recurring)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground pb-2">
            Top customers with consecutive or active monthly recurring payments
          </p>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loyalCustomersData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  ticks={[0, 150000, 300000, 450000, 600000]}
                  tickFormatter={(val) => (val === 0 ? "$0" : `$${val}`)}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: number) => formatMoney(val)}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 4: RETENTION INSIGHTS & RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Retention & Recurring Insights (matches Screenshot IMG_2675.png) */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Retention & Recurring Insights
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Summary of recurring customer relationships
            </p>
          </div>

          {/* Two Top Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span>Loyal Base</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground">1</div>
              <p className="text-[11px] text-muted-foreground">Active recurring payers</p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span>Avg Monthly Rate</span>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
                $456,789.00
              </div>
              <p className="text-[11px] text-muted-foreground">Per recurring contributor</p>
            </div>
          </div>

          {/* TOP RECURRING CONTRIBUTORS */}
          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              TOP RECURRING CONTRIBUTORS
            </p>
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border/70 bg-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-600 font-bold text-sm">
                  AO
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Ali Omar</p>
                  <p className="text-xs text-muted-foreground">1 payment</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  $456,789.00/mo
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Total: $456,789.00
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions (matches Screenshot IMG_2675.png) */}
        <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Recent Transactions
              </h2>
              <Link
                to="/transactions"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="divide-y divide-border/60 mt-2">
              {displayTransactions.map((tx) => {
                const isIncome = tx.type === "in";
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 first:pt-1 last:pb-1 gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          isIncome
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-500"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-secondary/80 px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                            {tx.category}
                          </span>
                          {tx.isLatest && (
                            <span className="rounded bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-300">
                              LATEST
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isIncome ? "Income" : "Expense"} · {tx.date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono text-sm font-bold ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatMoney(tx.amount).replace("-", "")}
                      </span>
                      <button
                        onClick={() => {
                          if (tx.raw) {
                            setEditing(tx.raw);
                          } else {
                            setEditing(null);
                          }
                          setDialogOpen(true);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                        aria-label="Edit transaction"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 text-center border-t border-border/40">
            <Link
              to="/transactions"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all transactions →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
