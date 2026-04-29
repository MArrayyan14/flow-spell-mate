import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfile, seedConceptsIfEmpty, type Profile } from "@/lib/lingua";

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,
  init: async () => {
    if (get().initialized) return;
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        setTimeout(async () => {
          try {
            const profile = await ensureProfile(session.user.id, session.user.email);
            await seedConceptsIfEmpty();
            set({ profile, loading: false });
          } catch { set({ loading: false }); }
        }, 0);
      } else {
        set({ profile: null, loading: false });
      }
    });
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    let profile: Profile | null = null;
    if (session?.user) {
      profile = await ensureProfile(session.user.id, session.user.email);
      await seedConceptsIfEmpty();
    }
    set({ session, user: session?.user ?? null, profile, loading: false, initialized: true });
  },
  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const profile = await ensureProfile(user.id, user.email);
    set({ profile });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },
}));
