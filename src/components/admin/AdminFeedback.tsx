import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MailCheck, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type FeedbackRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  subject: string | null;
  category: string;
  rating: number | null;
  message: string;
  status: string;
  priority: string;
  read: boolean;
  admin_reply: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  in_progress: "bg-primary/15 text-primary",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};
const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-secondary text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  urgent: "bg-destructive/15 text-destructive",
};

export function AdminFeedback({ readOnly }: { readOnly?: boolean }) {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data as unknown as FeedbackRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-feedback")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const patch = async (id: string, values: Partial<FeedbackRow>) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...values } : r)));
    const { error } = await supabase.from("feedback").update(values as never).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
  };

  const remove = async (id: string) => {
    setRows((p) => p.filter((r) => r.id !== id));
    await supabase.from("feedback").delete().eq("id", id);
  };

  const sendReply = async (row: FeedbackRow) => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          type: "feedback_reply",
          to: row.user_email,
          subject: `Re: ${row.subject || row.category} — CashbookCharm`,
          data: { message: row.message, reply, category: row.category },
        },
      });
    } catch { /* email failures must not block the reply record */ }
    await patch(row.id, {
      admin_reply: reply,
      status: "resolved",
      read: true,
    });
    await supabase.from("feedback").update({ replied_at: new Date().toISOString() } as never).eq("id", row.id);
    setBusy(false);
    setReplyFor(null);
    setReply("");
    toast({ title: "Reply sent" });
  };

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "unread") return rows.filter((r) => !r.read);
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const unread = rows.filter((r) => !r.read).length;

  if (loading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <SectionCard className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold">Feedback Center</h3>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">{unread} unread</span>
        <div className="ml-auto">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {filtered.map((f) => (
            <li key={f.id} className={cn("space-y-2 py-4", !f.read && "bg-primary/[0.03]")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">{f.category}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_STYLES[f.status] ?? STATUS_STYLES.open)}>
                  {f.status.replace("_", " ")}
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", PRIORITY_STYLES[f.priority] ?? PRIORITY_STYLES.normal)}>
                  {f.priority}
                </span>
                {f.rating ? (
                  <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                    {Array.from({ length: f.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">· {f.user_email ?? f.user_id.slice(0, 8)}</span>
              </div>

              {f.subject && <p className="text-sm font-semibold">{f.subject}</p>}
              <p className="whitespace-pre-wrap text-sm">{f.message}</p>
              {f.admin_reply && (
                <p className="rounded-lg border border-border/60 bg-secondary/60 p-2 text-xs">
                  <span className="font-semibold">Your reply:</span> {f.admin_reply}
                </p>
              )}

              {replyFor === f.id ? (
                <div className="space-y-2">
                  <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Write a reply…" />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-xl" disabled={busy} onClick={() => sendReply(f)}>
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send reply"}
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setReplyFor(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={f.status} onValueChange={(v) => patch(f.id, { status: v })} disabled={readOnly}>
                    <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={f.priority} onValueChange={(v) => patch(f.id, { priority: v })} disabled={readOnly}>
                    <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl" disabled={readOnly}
                    onClick={() => patch(f.id, { read: !f.read })}>
                    <MailCheck className="h-3.5 w-3.5" />{f.read ? "Mark unread" : "Mark read"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-xl" disabled={readOnly}
                    onClick={() => { setReplyFor(f.id); setReply(f.admin_reply ?? ""); }}>
                    Reply
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" disabled={readOnly}
                    aria-label="Delete feedback" onClick={() => remove(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
