import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    document.title = "Set new password — Cashbook Charm";
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
    if (password !== confirm) return toast({ title: "Passwords don't match", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast({ title: "Couldn't update password", description: error.message, variant: "destructive" });
    toast({ title: "Password updated", description: "You're signed in." });
    navigate("/");
  };

  const inputClass = "border-input bg-background text-foreground placeholder:text-muted-foreground/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 bg-background text-foreground dark:bg-[#06122B] dark:text-white">
      <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.18]" style={{
        backgroundImage: "linear-gradient(to right, rgba(96,165,250,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(96,165,250,0.22) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
      }} />
      <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-[#1D4ED8]/40 blur-[120px] hidden dark:block" />
      <div className="absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-[#3B82F6]/30 blur-[120px] hidden dark:block" />

      <button
        onClick={toggle}
        className="absolute top-4 right-4 z-20 rounded-full border border-border bg-muted p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1B3D]/80 dark:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.5)] sm:p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/40">
              <BookOpen className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">Set a new password</h1>
            <p className="mt-1 text-sm text-muted-foreground dark:text-white/60">Choose a strong password you'll remember.</p>
          </div>

          {!ready ? (
            <div className="mt-8 flex flex-col items-center gap-3 text-muted-foreground dark:text-white/60">
              <Loader2 className="h-5 w-5 animate-spin text-primary dark:text-[#60A5FA]" />
              <p className="text-sm">Verifying your reset link…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground/80 dark:text-white/80">New password</Label>
                <div className="relative">
                  <Input type={show ? "text" : "password"} required minLength={6}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary dark:text-white/50 dark:hover:text-white dark:hover:bg-white/10">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground/80 dark:text-white/80">Confirm password</Label>
                <Input type={show ? "text" : "password"} required minLength={6}
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass} />
              </div>
              <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl text-base bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] hover:from-[#1E40AF] hover:to-[#2563EB] text-white shadow-lg shadow-[#3B82F6]/30 border-0">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
