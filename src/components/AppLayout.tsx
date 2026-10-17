import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home,
  ArrowLeftRight,
  Users,
  LayoutGrid,
  FileText,
  BarChart3,
  BookOpen,
  Crown,
  Shield,
  Bot,
  Sun,
  Moon,
  MessageSquare,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CharmAiRobotIcon } from "@/components/CharmAiRobotIcon";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePlan } from "@/hooks/usePlan";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ActiveCashbookProvider } from "@/hooks/useActiveCashbook";
import { CashbookSwitcher } from "@/components/CashbookSwitcher";
import { TrialBanner } from "@/components/TrialBanner";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const { canAccessAdmin } = useIsAdmin();
  const { plan } = usePlan();

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileInitials, setProfileInitials] = useState("AH");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const metaName = (meta.full_name as string) || (meta.name as string) || (meta.display_name as string);
      const name = (data as { display_name?: string | null } | null)?.display_name || metaName || user.email?.split("@")[0] || "AH";
      const ini = name
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0].toUpperCase())
        .join("") || "AH";
      setProfileInitials(ini);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const moreItems = [
    {
      title: "Sales Invoices",
      description: "Create, track & print invoices",
      icon: FileText,
      iconBox: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
      to: "/invoices",
    },
    {
      title: "Reports & Analytics",
      description: "Financial trends & exports",
      icon: BarChart3,
      iconBox: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
      to: "/reports",
    },
    {
      title: "Manage Cashbooks",
      description: "Switch or create cashbooks",
      icon: BookOpen,
      iconBox: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
      to: "/cashbooks",
    },
    {
      title: "Team & Members",
      description: "Collaborate & manage roles",
      icon: Users,
      iconBox: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
      to: "/team",
    },
    {
      title: "Plans & Pricing",
      badge: "UPGRADE",
      description: "Upgrade features & quotas",
      icon: Crown,
      iconBox: "bg-amber-50 dark:bg-amber-950/60 text-amber-500",
      to: "/pricing",
    },
    {
      title: "Admin Panel",
      description: "System oversight & users",
      icon: Shield,
      iconBox: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400",
      to: "/admin",
    },
  ];

  return (
    <SidebarProvider defaultOpen>
      <ActiveCashbookProvider>
        <div className="flex min-h-screen w-full bg-background">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <AppSidebar />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
              {/* Mobile top bar (matches Screenshots) */}
              <div className="flex h-16 items-center justify-between px-3 sm:px-4 md:hidden">
                <CashbookSwitcher />
                <div className="flex items-center gap-2">
                  <Link
                    to="/assistant"
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:scale-105 active:scale-95 transition-transform"
                    aria-label="Charm AI Assistant"
                  >
                    <CharmAiRobotIcon size={38} />
                  </Link>
                  <NotificationBell />
                </div>
              </div>

              {/* Desktop top bar */}
              <div className="hidden md:flex h-16 items-center justify-between gap-2 px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <SidebarTrigger />
                  <h1 className="text-sm font-semibold capitalize text-muted-foreground md:text-base md:text-foreground truncate">
                    {location.pathname === "/" ? "Dashboard" : location.pathname.slice(1).replace("-", " ")}
                  </h1>
                  <CashbookSwitcher />
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/assistant"
                    className="flex items-center gap-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                  >
                    <CharmAiRobotIcon size={24} showBorder={false} />
                    <span>CHARM AI</span>
                  </Link>

                  {plan === "starter" && (
                    <NavLink
                      to="/pricing"
                      className={({ isActive }) => cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-semibold transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:opacity-90",
                      )}
                      aria-label="Upgrade plan"
                    >
                      <Crown className="h-4 w-4" />
                      <span>Upgrade</span>
                    </NavLink>
                  )}

                  <button
                    onClick={() => setFeedbackOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Feedback</span>
                  </button>

                  <NotificationBell />

                  <button
                    onClick={toggle}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="Toggle theme"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>

                  <ProfileMenu variant="compact" />
                </div>
              </div>
            </header>

            <TrialBanner />
            <main className="mx-auto w-full max-w-[1400px] flex-1 px-3.5 py-4 md:px-6 md:py-6 pb-32 md:pb-8 animate-fade-in">
              <Outlet />
            </main>
          </div>

          {/* Mobile bottom nav (matches Screenshot IMG_2669.jpeg) */}
          <nav
            className="fixed inset-x-3 bottom-3 z-40 md:hidden max-w-lg mx-auto pointer-events-none"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 4px)" }}
          >
            <div className="relative pointer-events-auto rounded-[32px] border border-slate-200/90 dark:border-border/80 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.14)] px-3 py-2 grid grid-cols-5 items-center">
              {/* 1. Overview */}
              <NavLink
                to="/"
                end
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
                  isActive ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 hover:text-foreground"
                )}
              >
                {({ isActive }) => (
                  <>
                    <Home className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[1.8]")} />
                    <span>Overview</span>
                  </>
                )}
              </NavLink>

              {/* 2. Transactions */}
              <NavLink
                to="/transactions"
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
                  isActive ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 hover:text-foreground"
                )}
              >
                {({ isActive }) => (
                  <>
                    <ArrowLeftRight className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[1.8]")} />
                    <span>Transactions</span>
                  </>
                )}
              </NavLink>

              {/* 3. More button (Elevated circular blue button with grid+ icon) */}
              <div className="flex flex-col items-center justify-center -mt-6">
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  aria-label="More features"
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-[0_10px_25px_rgba(37,99,235,0.4)] ring-4 ring-white dark:ring-card transition-transform active:scale-95"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="7" height="7" rx="2.5" fill="currentColor" />
                    <rect x="14" y="3" width="7" height="7" rx="2.5" fill="currentColor" />
                    <rect x="3" y="14" width="7" height="7" rx="2.5" fill="currentColor" />
                    <rect x="14" y="14" width="7" height="7" rx="2.5" fill="currentColor" />
                    <path d="M17.5 15.5V19.5M15.5 17.5H19.5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="mt-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  More
                </span>
              </div>

              {/* 4. Customers */}
              <NavLink
                to="/customers"
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
                  isActive ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 hover:text-foreground"
                )}
              >
                {({ isActive }) => (
                  <>
                    <Users className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[1.8]")} />
                    <span>Customers</span>
                  </>
                )}
              </NavLink>

              {/* 5. Profile (matches Screenshot IMG_2607.png) */}
              <div className="flex items-center justify-center">
                <ProfileMenu variant="mobile-tab" />
              </div>
            </div>
          </nav>

          {/* More Features Drawer Sheet (matches Screenshot 2) */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetContent
              side="bottom"
              className="rounded-t-[28px] border-t border-border/80 bg-card p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Drag handle */}
              <div className="mx-auto -mt-1 mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/25" />

              {/* Header */}
              <div className="flex items-start justify-between pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-6 w-6 text-blue-600" />
                    <h2 className="text-xl font-bold tracking-tight text-foreground">More Features</h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Access additional tools, reports, and settings</p>
                </div>
                <SheetClose className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </SheetClose>
              </div>

              {/* Feature items cards */}
              <div className="space-y-2.5 py-1">
                {moreItems.map((item) => (
                  <Link
                    key={item.title}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-3.5 transition-all hover:bg-secondary/60 hover:border-blue-400/30"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", item.iconBox)}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{item.title}</span>
                          {item.badge && (
                            <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-300">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </Link>
                ))}
              </div>

              {/* Divider */}
              <div className="my-3 border-t border-border/60" />

              {/* 2 Bottom Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1 pb-2">
                <Button
                  variant="outline"
                  onClick={toggle}
                  className="h-11 rounded-xl gap-2 font-medium border-border/80"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setMoreOpen(false); setFeedbackOpen(true); }}
                  className="h-11 rounded-xl gap-2 font-medium border-border/80"
                >
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  Send Feedback
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
        </div>
      </ActiveCashbookProvider>
    </SidebarProvider>
  );
}
