import { BillingLogo } from "@/components/BillingLogo";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/SectionCard";

export default function BillingSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const plan = params.get("plan");

  useEffect(() => { document.title = "Payment successful — CashbookCharm"; }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SectionCard className="w-full max-w-md p-8 text-center">
        <BillingLogo className="mx-auto mb-5 h-14 w-14" />

        <CheckCircle2 className="mx-auto h-12 w-12 text-[hsl(var(--cash-in))]" />
        <h1 className="mt-4 text-xl font-semibold">Payment successful</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {plan ? `Your ${plan.toUpperCase()} plan is now active.` : "Your subscription is now active."}
        </p>
        <div className="mt-6 space-y-2">
          <Button className="w-full rounded-xl" onClick={() => navigate("/")}>Go to Dashboard</Button>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/settings?tab=billing")}>
            View billing
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
