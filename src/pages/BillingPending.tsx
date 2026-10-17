import { BillingLogo } from "@/components/BillingLogo";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/SectionCard";
import { supabase } from "@/integrations/supabase/client";

export default function BillingPending() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ref = params.get("ref") ?? "";
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { document.title = "Payment pending — CashbookCharm"; }, []);

  const check = async () => {
    if (!ref) return;
    setChecking(true);
    setMessage("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setChecking(false);
      setMessage("Please sign in with the account you used to upgrade so we can confirm this payment.");
      return;
    }
    const { data } = await supabase.functions.invoke("sifalo-verify", { body: { order_id: ref } });
    setChecking(false);
    if (data?.status === "success") navigate(`/billing/success?plan=${data.plan ?? ""}`, { replace: true });
    else if (data?.status === "failed") navigate(`/billing/failed?reason=${encodeURIComponent(data.error ?? "Payment failed.")}`, { replace: true });
    else setMessage(data?.error ?? "Still waiting for confirmation from Sifalo Pay.");
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SectionCard className="w-full max-w-md p-8 text-center">
        <BillingLogo className="mx-auto mb-5 h-14 w-14" />

        <Clock className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-xl font-semibold">Payment pending</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {message || "Your payment is being confirmed. Approve the request on your phone if prompted."}
        </p>
        {ref && <p className="mt-2 text-xs text-muted-foreground">Reference: {ref}</p>}
        <div className="mt-6 space-y-2">
          <Button className="w-full rounded-xl" onClick={check} disabled={checking}>
            {checking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</> : "I've paid — check now"}
          </Button>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </SectionCard>
    </div>
  );
}
