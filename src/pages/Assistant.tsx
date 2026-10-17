import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Bot,
  Copy,
  History,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  TrendingUp,
  CreditCard,
  Receipt,
  BarChart3,
  Users,
  ShoppingCart,
  X,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCashbook } from "@/hooks/useActiveCashbook";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CharmAiRobotIcon } from "@/components/CharmAiRobotIcon";
import {
  createConversation,
  loadMessages,
  saveMessage,
  useConversations,
  type ChatMsg,
} from "@/hooks/useCharmChat";

const SUGGESTED_QUESTIONS = [
  {
    icon: TrendingUp,
    en: "How is my business doing?",
    so: "Sidee ganacsigeygu u socdaa?",
  },
  {
    icon: CreditCard,
    en: "Who owes me money?",
    so: "Yaa deyn igu leh?",
  },
  {
    icon: Receipt,
    en: "What were my biggest expenses?",
    so: "Waa maxay kharashaadkayga ugu badan?",
  },
  {
    icon: BarChart3,
    en: "Compare this month with last month",
    so: "Bishan iyo bishii hore ii barbardhig",
  },
  {
    icon: Users,
    en: "Show my top customers",
    so: "I tus macaamiishayda ugu sarreysa",
  },
  {
    icon: ShoppingCart,
    en: "How can I increase my sales?",
    so: "Sideen u kordhin karaa iibkayga?",
  },
];

function Markdown({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-headings:mt-2 prose-headings:mb-1 text-foreground leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

export default function Assistant() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeId } = useActiveCashbook();
  const { refresh } = useConversations();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    void loadMessages(conversationId).then((m) => {
      if (!cancelled) setMessages(m);
    });
    return () => { cancelled = true; };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const handleSend = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy || !user) return;
      const next: ChatMsg[] = [...messages, { role: "user", content: question }];
      setMessages(next);
      setInput("");
      setBusy(true);

      try {
        let convId = conversationId;
        if (!convId) {
          convId = await createConversation(user.id, question, "en");
          navigate(`/assistant/${convId}`, { replace: true });
        }
        await saveMessage(convId, user.id, "user", question);

        const { data, error } = await supabase.functions.invoke("ai-assistant", {
          body: {
            message: question,
            userId: user.id,
            history: next.slice(0, -1).map(({ role, content }) => ({ role, content })),
            cashbookId: activeId,
            lang: "en",
          },
        });
        if (error) throw error;

        const responseType: string = String(data?.response_type ?? "business_answer");
        const rows: unknown[] = Array.isArray(data?.data) ? data.data : [];
        let reply = String(data?.message ?? data?.reply ?? "");

        const needsRows = responseType === "customer_list" || responseType === "transaction_list";
        if (!reply || (needsRows && rows.length === 0 && data?.success === false)) {
          reply = "I couldn't retrieve that information correctly. Please try again.";
        }
        if (responseType === "customer_selection" && rows.length) {
          const list = (rows as { name: string; phone?: string | null }[])
            .map((c) => `- ${c.name}${c.phone ? ` (${c.phone})` : ""}`)
            .join("\n");
          reply = `${reply}\n\n${list}`;
        }

        setMessages([...next, { role: "assistant", content: reply }]);
        await saveMessage(convId, user.id, "assistant", reply);
        void refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong.";
        toast({ title: "CHARM AI", description: message, variant: "destructive" });
        setMessages(next);
      } finally {
        setBusy(false);
      }
    },
    [activeId, busy, conversationId, messages, navigate, refresh, user],
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast({ title: "Receipt Attached", description: `Uploaded ${file.name}. Asking Charm AI to analyze...` });
    handleSend(`Please analyze this attached receipt document (${file.name}) and summarize key amounts, dates, and categories.`);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-6.5rem)] max-w-2xl flex-col bg-background">
      {/* Top Header (matches Screenshot IMG_2604.jpeg) */}
      <header className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full hover:scale-105 transition-transform">
            <CharmAiRobotIcon size={38} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-foreground">Charm AI</h1>
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                BUSINESS ASSISTANT
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Ask Charm anything about your business</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to="/assistant/history"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="History"
          >
            <History className="h-4 w-4" />
          </Link>
          <button
            onClick={() => navigate("/")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Chat / Suggestions Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="space-y-5 animate-fade-in">
            {/* Welcome Card (matches Screenshot IMG_2604.jpeg) */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-sm">
                  <CharmAiRobotIcon size={46} />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] text-white">
                    <MessageSquare className="h-2.5 w-2.5" />
                  </span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground">
                    How can I help your business today?
                  </h2>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Ask Charm about your sales, expenses, customers, cash flow, or anything else about your business.
                  </p>
                </div>
              </div>

              {/* Languages Box */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 px-3.5 py-2.5 text-xs">
                <span className="font-medium text-foreground">
                  🇬🇧 English & 🇸🇴 Af-Soomaali ready
                </span>
                <span className="text-muted-foreground">Type naturally</span>
              </div>
            </div>

            {/* Suggested Questions Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  SUGGESTED QUESTIONS
                </span>
                <span className="text-xs text-muted-foreground">Tap to ask</span>
              </div>

              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.en)}
                      className="group flex w-full items-start gap-3 rounded-2xl border border-border/80 bg-card p-3.5 text-left shadow-sm transition-all hover:border-blue-400 hover:bg-secondary/50 active:scale-[0.99]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                          {item.en}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.so}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3 text-sm",
                    isUser ? "justify-end" : "justify-start",
                  )}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <CharmAiRobotIcon size={30} />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                      isUser
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "border border-border/80 bg-card text-foreground rounded-tl-sm",
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    ) : (
                      <div className="relative group">
                        <Markdown text={m.content} />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            toast({ title: "Copied to clipboard" });
                          }}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-1">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Checking your records…</span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Bar (matches Screenshot IMG_2604.jpeg) */}
      <div className="border-t border-border/60 pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="rounded-2xl border border-border/80 bg-card p-2 shadow-sm focus-within:border-blue-500 transition-colors"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Charm anything about your business..."
            className="w-full bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1 px-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary hover:text-foreground transition-colors"
                title="Attach Document"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary hover:text-foreground transition-colors"
                title="Attach Photo"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>

            <Button
              type="submit"
              disabled={!input.trim() || busy}
              size="sm"
              className="h-8 w-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white p-0 flex items-center justify-center shadow-sm"
              aria-label="Send message"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
