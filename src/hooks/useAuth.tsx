import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

// Keeps the profile row in sync with the identity provider (Google) so the
// avatar and display name always reflect the latest Google profile.
async function syncProviderProfile(u: User) {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const avatar = (meta.avatar_url as string) || (meta.picture as string) || null;
  const name = (meta.full_name as string) || (meta.name as string) || (meta.display_name as string) || null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, display_name, email")
    .eq("user_id", u.id)
    .maybeSingle();

  const patch: { avatar_url?: string; display_name?: string; email?: string } = {};
  if (avatar && profile?.avatar_url !== avatar) patch.avatar_url = avatar;
  if (name && !profile?.display_name) patch.display_name = name;
  if (u.email && profile?.email !== u.email) patch.email = u.email;
  if (Object.keys(patch).length === 0) return;

  await supabase.from("profiles").update(patch).eq("user_id", u.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      if (event === "SIGNED_IN" && newSession?.user) {
        // Defer: never call Supabase directly inside the callback.
        setTimeout(() => { syncProviderProfile(newSession.user).catch(() => {}); }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
      if (existing?.user) {
        setTimeout(() => { syncProviderProfile(existing.user).catch(() => {}); }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
