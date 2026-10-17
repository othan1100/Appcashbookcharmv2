# Project rules

- Billing screens share BillingLogo, and email/PDF branding uses the same uploaded asset; why: prevents mismatched purchase branding.
- Paid-plan pricing features remain database-owned and admin-editable; email purchase benefits use the shared email registry; why: retains existing pricing administration and receipt rendering.

- Stock, sale, invoice-payment and return changes go only through the database actions (adjust_inventory, create_inventory_sale, record_invoice_payment, process_goods_return); why: keeps stock history and balances consistent and atomic.
- New business tables use the owner/team helpers (can_access_owner_data / can_write_owner_data) for access; why: matches existing cashbook team permissions.
- Charm AI (ai-assistant function) lets the model pick data tools, but tools run with the caller's login and all money math is done in code; why: no invented numbers and no cross-user data.
