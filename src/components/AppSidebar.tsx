import { BookOpen, LayoutGrid, ArrowLeftRight, Users, BarChart3, Settings, Shield, Crown, UsersRound, Sparkles, Package } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { usePlan } from "@/hooks/usePlan";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";
import { ProfileMenu } from "@/components/ProfileMenu";

const mainItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/assistant", label: "CHARM AI", icon: Sparkles },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/products", label: "Products", icon: Package },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

const pricingItem = { to: "/pricing", label: "Pricing", icon: Crown };
const settingsOnly = [{ to: "/settings", label: "Settings", icon: Settings }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { canAccessAdmin } = useIsAdmin();
  const { plan } = usePlan();

  const isActive = (path: string) => location.pathname === path;

  const renderItem = (item: { to: string; label: string; icon: typeof LayoutGrid }) => {
    const Icon = item.icon;
    const active = isActive(item.to);
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild tooltip={item.label}>
          <NavLink
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-lg transition-colors",
              active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-primary/[0.06]">
      <SidebarHeader className="border-b border-border/60 p-3">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="leading-none">
              <div className="text-base font-bold tracking-tight">Cashbook</div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Charm</div>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>System</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {(plan === "pro" || plan === "team") && renderItem({ to: "/team", label: "Team", icon: UsersRound })}
              {plan === "starter" && renderItem(pricingItem)}
              {settingsOnly.map(renderItem)}
              {canAccessAdmin && renderItem({ to: "/admin", label: "Admin", icon: Shield })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-2">
        <ProfileMenu variant={collapsed ? "compact" : "full"} />
      </SidebarFooter>
    </Sidebar>
  );
}
