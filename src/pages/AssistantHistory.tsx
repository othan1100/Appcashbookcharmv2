import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, MessageSquare, MessageSquarePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations } from "@/hooks/useCharmChat";
import { tt, type AiLang } from "@/lib/charm-ai";

export default function AssistantHistory() {
  const navigate = useNavigate();
  const { conversations, loading, remove } = useConversations();
  const [q, setQ] = useState("");
  const lang = ((localStorage.getItem("charm-ai.lang") as AiLang) || "en");

  useEffect(() => { document.title = "CHARM AI history — Cashbook Charm"; }, []);

  const list = conversations.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <History className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{tt("history", lang)}</h1>
          <p className="text-xs text-muted-foreground">{tt("subtitle", lang)}</p>
        </div>
        <Button onClick={() => navigate("/assistant")} className="gap-2 rounded-xl">
          <MessageSquarePlus className="h-4 w-4" /> {tt("newChat", lang)}
        </Button>
      </header>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations…" className="rounded-xl" />

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {tt("empty", lang)}
          </p>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40"
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <button onClick={() => navigate(`/assistant/${c.id}`)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.updated_at).toLocaleString()} · {c.lang.toUpperCase()}
                </p>
              </button>
              <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label={tt("delete", lang)}>
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
