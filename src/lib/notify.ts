import { supabase } from "@/integrations/supabase/client";

export type NotifyCategory = "payment" | "billing" | "customer" | "transaction" | "team" | "security" | "general";

/**
 * Records an in-app activity notification for the signed-in user.
 * Fire-and-forget: notification failures must never block the user's action.
 */
export async function notify(opts: {
  title: string;
  body?: string;
  category?: NotifyCategory;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.rpc("notify_user", {
      _title: opts.title,
      _body: opts.body ?? null,
      _category: opts.category ?? "general",
      _link: opts.link ?? null,
      _metadata: (opts.metadata ?? {}) as never,
    });
  } catch {
    /* ignore */
  }
}
