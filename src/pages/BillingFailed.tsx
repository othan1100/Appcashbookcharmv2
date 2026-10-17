import { BillingLogo } from "@/components/BillingLogo";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/SectionCard";

export default function BillingFailed() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reason = params.get("reason");

  useEffect(() => { document.title = "Payment failed — CashbookCharm"; }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SectionCard className="w-full max-w-md p-8 text-center">
        <BillingLogo className="mx-auto mb-5 h-14 w-14" />

        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">Payment failed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {reason || "We couldn't complete your payment. No charge was made."}
        </p>
        <div className="mt-6 space-y-2">
          <Button className="w-full rounded-xl" onClick={() => navigate("/pricing")}>Try again</Button>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </SectionCard>
    </div>
  );
}
