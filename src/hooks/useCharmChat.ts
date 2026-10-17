import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AiLang } from "@/lib/charm-ai";

export type ChatMsg = { id?: string; role: "user" | "assistant"; content: string };
export type Conversation = { id: string; title: string; lang: string; updated_at: string };

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setConversations([]); setLoading(false); return; }
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, lang, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    setConversations(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("ai_conversations").delete().eq("id", id);
    setConversations((c) => c.filter((x) => x.id !== id));
  }, []);

  const rename = useCallback(async (id: string, title: string) => {
    await supabase.from("ai_conversations").update({ title }).eq("id", id);
    setConversations((c) => c.map((x) => (x.id === id ? { ...x, title } : x)));
  }, []);

  return { conversations, loading, refresh, remove, rename };
}

export async function createConversation(userId: string, title: string, lang: AiLang) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId, title: title.slice(0, 80), lang })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function loadMessages(conversationId: string): Promise<ChatMsg[]> {
  const { data } = await supabase
    .from("ai_messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }));
}

export async function saveMessage(
  conversationId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
) {
  const { error } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, user_id: userId, role, content });
  if (error) console.error("charm-ai save message failed", error.message);
  await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}
