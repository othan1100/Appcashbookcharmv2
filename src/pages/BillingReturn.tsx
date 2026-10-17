import { BillingLogo } from "@/components/BillingLogo";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";

export default function BillingReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  const orderId = params.get("order_id");
  const sid = params.get("sid") ?? params.get("id");

  useEffect(() => { document.title = "Verifying payment — CashbookCharm"; }, []);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!orderId && !sid) {
      navigate("/billing/failed?reason=" + encodeURIComponent("Missing payment reference."), { replace: true });
      return;
    }

    (async () => {
      // The user may come back from Sifalo in a fresh browser session.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        try {
          localStorage.setItem("cbc_pending_billing_return", window.location.pathname + window.location.search);
        } catch { /* ignore */ }
        setNeedsAuth(true);
        return;
      }

      const { data, error } = await supabase.functions.invoke("sifalo-verify", {
        body: { order_id: orderId ?? undefined, sid: sid ?? undefined },
      });
      const status = (data?.status as string) ?? (error ? "failed" : "pending");
      const plan = data?.plan ? `?plan=${encodeURIComponent(data.plan)}` : "";
      if (status === "success") navigate(`/billing/success${plan}`, { replace: true });
      else if (status === "failed") {
        const reason = encodeURIComponent(data?.error ?? error?.message ?? "Payment failed.");
        navigate(`/billing/failed?reason=${reason}`, { replace: true });
      } else {
        navigate(`/billing/pending?ref=${encodeURIComponent(orderId ?? sid ?? "")}`, { replace: true });
      }
    })();
  }, [orderId, sid, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SectionCard className="w-full max-w-md p-8 text-center">
        <BillingLogo className="mx-auto mb-5 h-14 w-14" />
        {needsAuth ? (
          <>
            <LogIn className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 text-lg font-semibold">Sign in to confirm your payment</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We received your payment reference. Sign in with the account you used to upgrade and we'll finish activating your plan.
            </p>
            {(orderId || sid) && (
              <p className="mt-2 break-all text-xs text-muted-foreground">Reference: {orderId ?? sid}</p>
            )}
            <Button className="mt-6 w-full rounded-xl" onClick={() => navigate("/auth")}>Sign in</Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-4 text-lg font-semibold">Verifying your payment…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Please don't close this page.</p>
            {(orderId || sid) && (
              <p className="mt-3 break-all text-xs text-muted-foreground">Reference: {orderId ?? sid}</p>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
