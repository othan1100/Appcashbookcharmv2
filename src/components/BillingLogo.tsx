import logo from "@/assets/cashbookcharm-billing-logo.jpeg.asset.json";
import { cn } from "@/lib/utils";

export function BillingLogo({ className }: { className?: string }) {
  return <img src={`https://cashbook-charm.lovable.app${logo.url}`} alt="CashbookCharm" width={56} height={56} className={cn("shrink-0 rounded-lg object-contain", className)} />;
}