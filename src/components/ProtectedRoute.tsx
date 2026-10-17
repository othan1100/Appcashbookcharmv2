import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { takeSignupPlan } from "@/lib/signup-plan";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Resume a payment verification the user was sent back to while signed out.
  let pending: string | null = null;
  try { pending = localStorage.getItem("cbc_pending_billing_return"); } catch { /* ignore */ }
  if (pending) {
    try { localStorage.removeItem("cbc_pending_billing_return"); } catch { /* ignore */ }
    return <Navigate to={pending} replace />;
  }

  // Users who arrived from the marketing site with ?plan=pro|team land on
  // Pricing with their plan pre-selected. Starter goes straight to Dashboard.
  const signupPlan = takeSignupPlan();
  if (signupPlan === "pro" || signupPlan === "team") {
    return <Navigate to={`/pricing?highlight=${signupPlan}&selected=${signupPlan}`} replace />;
  }

  return <>{children}</>;
}
