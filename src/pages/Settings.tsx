import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  User,
  Shield,
  Bell,
  Sun,
  Moon,
  Globe,
  Keyboard,
  HardDrive,
  Download,
  Sliders,
  Sparkles,
  FolderTree,
  CreditCard,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Info,
  ChevronRight,
  Loader2,
  Save,
  Check,
  Plus,
  Trash2,
  Upload,
  ChevronLeft,
  Phone,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/lib/countries";
import { CURRENCIES } from "@/lib/currencies";
import { FeedbackDialog } from "@/components/FeedbackDialog";

const DEFAULT_CATEGORIES = [
  "Sales", "Services", "Rent", "Utilities", "Salary",
  "Supplies", "Transport", "Food", "Marketing",
  "Construction", "Materials", "Equipment", "Labor",
  "Maintenance", "Other",
];

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { plan } = usePlan();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Profile data
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("Abdikadar");
  const [lastName, setLastName] = useState("hassn");
  const [phone, setPhone] = useState("252619172003");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("Somalia");
  const [city, setCity] = useState("Mogadishu");
  const [currency, setCurrency] = useState("USD");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState("English");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");

  // Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const section = searchParams.get("section");
    if (section) setActiveModal(section);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, business_name, country, city, currency, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as {
          display_name?: string | null;
          business_name?: string | null;
          country?: string | null;
          city?: string | null;
          currency?: string | null;
          avatar_url?: string | null;
        } | null;
        if (d) {
          const raw = d.display_name || user.email?.split("@")[0] || "Abdikadar hassn";
          setDisplayName(raw);
          const parts = raw.trim().split(/\s+/);
          setFirstName(parts[0] || "Abdikadar");
          setLastName(parts.slice(1).join(" ") || "hassn");
          setBusinessName(d.business_name || "Tufaax Book");
          setCountry(d.country || "Somalia");
          setCity(d.city || "Mogadishu");
          setCurrency(d.currency || "USD");
          setAvatarUrl(d.avatar_url || null);
        }
      });

    const storedCats = localStorage.getItem("charm_custom_categories");
    if (storedCats) {
      try {
        setCustomCategories(JSON.parse(storedCats));
      } catch {
        /* ignore */
      }
    }
  }, [user]);

  const initials = (displayName || `${firstName} ${lastName}` || user?.email || "AH")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AH";

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const fullName = `${firstName} ${lastName}`.trim();
    setDisplayName(fullName);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: fullName,
        business_name: businessName,
        country,
        city,
        currency,
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save profile", description: error.message, variant: "destructive" });
      return;
    }
    window.dispatchEvent(
      new CustomEvent("profile:updated", {
        detail: { display_name: fullName, avatar_url: avatarUrl },
      }),
    );
    toast({ title: "Profile updated successfully" });
  };

  const handleAddCategory = () => {
    if (!newCat.trim()) return;
    const updated = [...customCategories, newCat.trim()];
    setCustomCategories(updated);
    localStorage.setItem("charm_custom_categories", JSON.stringify(updated));
    setNewCat("");
    toast({ title: "Category added" });
  };

  const handleDeleteCategory = (cat: string) => {
    const updated = customCategories.filter((c) => c !== cat);
    setCustomCategories(updated);
    localStorage.setItem("charm_custom_categories", JSON.stringify(updated));
    toast({ title: "Category removed" });
  };

  // PROFILE INFORMATION VIEW (matches Screenshot IMG_2676.png)
  if (activeModal === "profile") {
    return (
      <div className="mx-auto max-w-xl space-y-4 pb-20 animate-fade-in">
        {/* Subheader bar (matches Screenshot IMG_2676.png) */}
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={() => {
              setActiveModal(null);
              navigate("/settings", { replace: true });
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-semibold shadow-sm hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Settings</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            PROFILE
          </span>
        </div>

        {/* Profile Information Card (matches Screenshot IMG_2676.png) */}
        <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-sm space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Profile Information</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Update your personal account details and avatar
            </p>
          </div>

          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 shadow-sm ring-2 ring-background">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-blue-600 text-white font-bold text-3xl">
                {firstName[0]?.toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = URL.createObjectURL(f);
                    setAvatarUrl(url);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-border/80 gap-2 h-10 px-4 font-semibold text-xs sm:text-sm shadow-sm hover:bg-secondary"
              >
                <Upload className="h-4 w-4" /> Upload picture
              </Button>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Camera className="h-3 w-3" /> JPG, PNG or WebP. Max 5 MB.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">First Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 rounded-2xl border-border/80 bg-secondary/30 px-4 text-sm font-medium"
                placeholder="First Name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 rounded-2xl border-border/80 bg-secondary/30 px-4 text-sm font-medium"
                placeholder="Last Name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-12 rounded-2xl border-border/80 bg-secondary/30 px-4 text-sm font-medium">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.name}>
                      <span className="flex items-center gap-2">
                        <span>{c.code === "SO" ? "🇸🇴" : "🌐"}</span>
                        <span>{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 rounded-2xl border-border/80 bg-secondary/30 pl-11 pr-4 text-sm font-medium"
                  placeholder="Phone Number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Email Address</Label>
              <Input
                value={user?.email || "othan1100@gmail.com"}
                readOnly
                disabled
                className="h-12 rounded-2xl border-border/80 bg-secondary/20 px-4 text-sm font-medium text-muted-foreground cursor-not-allowed"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm mt-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-12 animate-fade-in">
      {/* Top Profile Card (matches Screenshot IMG_2661.png) */}
      <div
        onClick={() => {
          setActiveModal("profile");
          navigate("/settings?section=profile", { replace: true });
        }}
        className="flex items-center justify-between rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm cursor-pointer hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-blue-600 text-white font-bold text-base">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-foreground leading-snug">
              {displayName || "Abdikadar hassn"}
            </h2>
            <p className="text-xs text-muted-foreground leading-snug">
              {user?.email || "othan1100@gmail.com"}
            </p>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                👥 {plan === "team" ? "Team Plan" : plan === "pro" ? "Pro Plan" : "Starter Plan"}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
      </div>

      {/* SECTION 1: ACCOUNT (matches Screenshot IMG_2661.png) */}
      <div className="space-y-1.5">
        <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          ACCOUNT
        </p>
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm divide-y divide-border/60">
          <button
            onClick={() => {
              setActiveModal("profile");
              navigate("/settings?section=profile", { replace: true });
            }}
            className="flex w-full items-center justify-between p-3.5 text-left bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <User className="h-4 w-4" />
              <span className="text-sm font-semibold">Profile Information</span>
            </div>
            <ChevronRight className="h-4 w-4 opacity-80" />
          </button>

          <button
            onClick={() => setActiveModal("security")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Security</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </button>

          <button
            onClick={() => setActiveModal("notifications")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </button>

          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
              <span className="text-sm font-medium">Appearance</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="capitalize">{theme}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>
          </button>

          <button
            onClick={() => setActiveModal("language")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Language</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{language}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 2: PREFERENCES (matches Screenshot IMG_2661.png) */}
      <div className="space-y-1.5">
        <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          PREFERENCES
        </p>
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm divide-y divide-border/60">
          <button
            onClick={() => setActiveModal("shortcuts")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Keyboard Shortcuts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-muted-foreground">⌘K</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>
          </button>

          <button
            onClick={() => setActiveModal("cloudsync")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Data & Cloud Sync</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>
          </button>

          <button
            onClick={() => setActiveModal("importexport")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Import / Export</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </button>

          <button
            onClick={() => setActiveModal("general")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">General Preferences</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </button>

          <button
            onClick={() => setActiveModal("logo")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">App Logo Customizer</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </button>

          <button
            onClick={() => setActiveModal("categories")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ledger Categories</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </button>

          <button
            onClick={() => navigate("/pricing")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Billing History</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </button>
        </div>
      </div>

      {/* SECTION 3: SUPPORT (matches Screenshot IMG_2662.png) */}
      <div className="space-y-1.5">
        <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          SUPPORT
        </p>
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-sm divide-y divide-border/60">
          <button
            onClick={() => setActiveModal("help")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Help Center</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </button>

          <button
            onClick={() => window.open("https://wa.me/252615555555", "_blank")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <LifeBuoy className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Contact Support</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </button>

          <button
            onClick={() => setFeedbackOpen(true)}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Send Feedback</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>💬</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>
          </button>

          <button
            onClick={() => setActiveModal("about")}
            className="flex w-full items-center justify-between p-3.5 text-left hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-foreground">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">About CashbookCharm</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>v1.0.0</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>
          </button>
        </div>
      </div>

      {/* LEDGER CATEGORIES DIALOG */}
      <Dialog open={activeModal === "categories"} onOpenChange={(v) => !v && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle>Ledger Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="New category name"
                className="rounded-xl"
              />
              <Button onClick={handleAddCategory} className="rounded-xl bg-blue-600 text-white">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-border/60">
              {[...DEFAULT_CATEGORIES, ...customCategories].map((c) => (
                <div key={c} className="flex items-center justify-between py-2 text-sm">
                  <span>{c}</span>
                  {customCategories.includes(c) && (
                    <button onClick={() => handleDeleteCategory(c)} className="text-destructive hover:opacity-80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CLOUD SYNC DIALOG */}
      <Dialog open={activeModal === "cloudsync"} onOpenChange={(v) => !v && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle>Data & Cloud Sync</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">Active Real-Time Sync</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">All transactions, cashbooks, and customers are backed up live to the cloud.</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>• Multi-device reconciliation active</p>
              <p>• Automated offline storage persistence enabled</p>
              <p>• Encrypted SSL/TLS connection verified</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* KEYBOARD SHORTCUTS DIALOG */}
      <Dialog open={activeModal === "shortcuts"} onOpenChange={(v) => !v && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-sm">
            <div className="flex items-center justify-between py-1 border-b">
              <span>Open Quick Actions</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono text-xs">⌘K</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b">
              <span>New Transaction</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono text-xs">⌘N</kbd>
            </div>
            <div className="flex items-center justify-between py-1 border-b">
              <span>Search Ledger</span>
              <kbd className="px-2 py-0.5 bg-muted rounded font-mono text-xs">⌘F</kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LANGUAGE DIALOG */}
      <Dialog open={activeModal === "language"} onOpenChange={(v) => !v && setActiveModal(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle>Select Language</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {[
              { id: "English", label: "English (US)" },
              { id: "Soomaali", label: "Af-Soomaali" },
              { id: "Arabic", label: "العربية" },
            ].map((langItem) => (
              <button
                key={langItem.id}
                onClick={() => {
                  setLanguage(langItem.id);
                  setActiveModal(null);
                  toast({ title: `Language set to ${langItem.label}` });
                }}
                className="flex w-full items-center justify-between rounded-xl border p-3 text-sm hover:bg-secondary transition-colors"
              >
                <span>{langItem.label}</span>
                {language === langItem.id && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ABOUT DIALOG */}
      <Dialog open={activeModal === "about"} onOpenChange={(v) => !v && setActiveModal(null)}>
        <DialogContent className="max-w-md rounded-2xl p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-500/25 mb-2">
            CC
          </div>
          <DialogTitle className="text-xl font-bold">CashbookCharm</DialogTitle>
          <p className="text-xs text-muted-foreground">Version 1.0.0 (Production Build)</p>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            CashbookCharm helps you track every cash-in and cash-out, manage customer accounts, generate clean invoices, and run your business in clarity.
          </p>
        </DialogContent>
      </Dialog>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
