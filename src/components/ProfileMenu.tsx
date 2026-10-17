import { useEffect, useState } from "react";
import {
  LogOut,
  Settings as SettingsIcon,
  CreditCard,
  User as UserIcon,
  ArrowUpDown,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "compact" | "full" | "mobile-tab";
  className?: string;
};

export function ProfileMenu({ variant = "full", className }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [simpleView, setSimpleView] = useState(() => {
    return localStorage.getItem("charm_simple_view") === "true";
  });

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
      setDisplayName(d?.display_name || user.email?.split("@")[0] || "Tufaax Book");
      setAvatarUrl(d?.avatar_url || null);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { avatar_url?: string | null; display_name?: string | null } | undefined;
      if (detail?.avatar_url !== undefined) setAvatarUrl(detail.avatar_url);
      if (detail?.display_name) setDisplayName(detail.display_name);
    };
    window.addEventListener("profile:updated", handler);
    return () => window.removeEventListener("profile:updated", handler);
  }, []);

  const handleToggleSimpleView = (checked: boolean) => {
    setSimpleView(checked);
    localStorage.setItem("charm_simple_view", String(checked));
    window.dispatchEvent(new CustomEvent("charm:view_mode_changed", { detail: { simple: checked } }));
  };

  const initials = (displayName || user?.email || "AH")
    .split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "AH";

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "mobile-tab" ? (
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors outline-none",
              className,
            )}
            aria-label="Profile"
          >
            <Avatar className="h-6 w-6 shrink-0 ring-1 ring-blue-500/30">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-blue-600 text-white text-[9px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span>Profile</span>
          </button>
        ) : (
          <button
            className={cn(
              "flex items-center gap-2 rounded-xl transition-colors",
              variant === "full" ? "w-full p-2 hover:bg-secondary" : "p-1 hover:bg-secondary",
              className,
            )}
            aria-label="Open profile menu"
          >
            <Avatar className="h-8 w-8 shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                {initials || <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            {variant === "full" && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold leading-tight">{displayName || "You"}</p>
                <p className="truncate text-[11px] text-muted-foreground leading-tight">{user?.email}</p>
              </div>
            )}
          </button>
        )}
      </DropdownMenuTrigger>

      {/* Dropdown Menu Content (matches Screenshot IMG_2607.png) */}
      <DropdownMenuContent
        align={variant === "mobile-tab" ? "end" : "end"}
        sideOffset={variant === "mobile-tab" ? 14 : 8}
        className="w-72 rounded-2xl p-2 shadow-xl border border-border/80 bg-card"
      >
        <div className="px-3 py-2.5">
          <p className="font-bold text-sm text-foreground leading-snug">{displayName || "Tufaax Book"}</p>
          <p className="text-xs text-muted-foreground leading-snug truncate">{user?.email || "othan1100@gmail.com"}</p>
        </div>

        {/* Switch to Simple View Card (matches Screenshot IMG_2607.png) */}
        <div className="mx-1 my-1.5 flex items-center justify-between rounded-xl bg-secondary/60 p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ArrowUpDown className="h-4 w-4 text-blue-600" />
            <span>Switch to Simple View</span>
          </div>
          <Switch
            checked={simpleView}
            onCheckedChange={handleToggleSimpleView}
            aria-label="Switch to Simple View"
          />
        </div>

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuItem
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium cursor-pointer"
        >
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/settings?section=help")}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span>Help Center</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/settings?section=billing")}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium cursor-pointer"
        >
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span>Billing History</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40 cursor-pointer"
        >
          <LogOut className="h-4 w-4 text-rose-600" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
