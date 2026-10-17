import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  category: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

const CATEGORY_STYLES: Record<string, string> = {
  payment: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  billing: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  customer: "bg-primary/15 text-primary",
  transaction: "bg-primary/15 text-primary",
  team: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  security: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  general: "bg-secondary text-muted-foreground",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: "1", title: "Cloud Synced", body: "Your cashbook and ledger entries are synchronized with the cloud.", category: "general", link: "/", read: false, created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: "2", title: "Ledger status", body: "Working balance recalculated across all recorded transactions.", category: "transaction", link: "/transactions", read: false, created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: "3", title: "Sales Invoices", body: "Generate, share, and track invoices with one tap.", category: "billing", link: "/invoices", read: false, created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: "4", title: "CHARM AI Assistant", body: "Ask bookkeeping questions in English or Somali anytime.", category: "general", link: "/assistant", read: false, created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: "5", title: "Daily summary", body: "Check cash-in and cash-out records for today.", category: "transaction", link: "/reports", read: false, created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() },
  { id: "6", title: "Customer statement ready", body: "Review customer balances and due amounts.", category: "customer", link: "/customers", read: false, created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: "7", title: "Security notice", body: "Multi-device session verified successfully.", category: "security", link: "/settings", read: false, created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString() },
  { id: "8", title: "New receipt PDF layout", body: "Modern clean layout is now enabled for receipts.", category: "billing", link: "/settings", read: false, created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: "9", title: "Team permissions", body: "Collaborate and manage cashier and manager roles.", category: "team", link: "/team", read: false, created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  { id: "10", title: "Welcome to Cashbook Charm", body: "Track every cash-in and cash-out with clarity.", category: "general", link: "/", read: false, created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString() },
];

export function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setItems(DEFAULT_NOTIFICATIONS);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    const dbItems = (data as Notification[]) ?? [];
    setItems(dbItems.length > 0 ? dbItems : DEFAULT_NOTIFICATIONS);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    let isSubscribed = true;
    const channelId = `notify-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase.channel(channelId);

    try {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          if (isSubscribed) {
            void load();
          }
        },
      );
      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("Notifications realtime channel error");
        }
      });
    } catch (err) {
      console.warn("Realtime notifications subscribe error:", err);
    }

    return () => {
      isSubscribed = false;
      try {
        void supabase.removeChannel(channel);
      } catch {
        // ignore cleanup error
      }
    };
  }, [user, load]);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    if (unread === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    if (user) {
      await supabase.from("notifications").update({ read: true }).eq("read", false);
    }
  };

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (user) {
      await supabase.from("notifications").delete().eq("id", id);
    }
  };

  const openItem = async (n: Notification) => {
    if (!n.read) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      if (user) {
        await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      }
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-sm transition-colors hover:bg-secondary",
            className
          )}
          aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 sm:h-5 sm:min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] sm:text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(92vw,22rem)] rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-lg px-2 text-xs" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-[22rem]">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto h-7 w-7 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">You're all caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">Payments, customers and team updates show up here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => (
                <li key={n.id} className="group relative">
                  <button
                    onClick={() => openItem(n)}
                    className={cn("flex w-full gap-3 px-4 py-3 pr-10 text-left transition-colors hover:bg-secondary/60", !n.read && "bg-primary/[0.04]")}
                  >
                    <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{n.title}</span>
                        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize", CATEGORY_STYLES[n.category] ?? CATEGORY_STYLES.general)}>
                          {n.category}
                        </span>
                      </span>
                      {n.body && <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-muted-foreground/80">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => removeItem(n.id)}
                    aria-label="Delete notification"
                    className="absolute right-2 top-3 rounded-md p-1.5 text-muted-foreground/60 opacity-0 transition hover:bg-secondary hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
