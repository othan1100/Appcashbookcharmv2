// Keeps the plan chosen on the marketing site (www.cashbookcharm.online)
// alive across the whole registration + OAuth redirect round-trip.

const KEY = "cbc_signup_plan";

export type SignupPlan = "starter" | "pro" | "team";

export function isSignupPlan(value: string | null | undefined): value is SignupPlan {
  return value === "starter" || value === "pro" || value === "team";
}

export function storeSignupPlan(plan: string | null | undefined) {
  if (!isSignupPlan(plan)) return;
  try { localStorage.setItem(KEY, plan); } catch { /* ignore */ }
}

export function peekSignupPlan(): SignupPlan | null {
  try {
    const v = localStorage.getItem(KEY);
    return isSignupPlan(v) ? v : null;
  } catch { return null; }
}

export function takeSignupPlan(): SignupPlan | null {
  const v = peekSignupPlan();
  clearSignupPlan();
  return v;
}

export function clearSignupPlan() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
