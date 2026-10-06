import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  initialized: boolean;
  init: () => () => void;
  refreshProfile: () => Promise<void>;
  signOutLocal: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isLoading: true,
  initialized: false,

  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null });
      if (data.session?.user) {
        void get().refreshProfile();
      } else {
        set({ isLoading: false, initialized: true });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null });
      if (event === "SIGNED_OUT") {
        set({ profile: null, isAdmin: false, isLoading: false });
      } else if (session?.user) {
        void get().refreshProfile();
      }
    });

    return () => listener.subscription.unsubscribe();
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) {
      set({ isLoading: false, initialized: true });
      return;
    }
    set({ isLoading: true });
    try {
      const [{ data: profile }, { data: admin }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("admin_users").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      set({ profile: (profile as Profile) ?? null, isAdmin: Boolean(admin) });
    } finally {
      set({ isLoading: false, initialized: true });
    }
  },

  signOutLocal: () => set({ session: null, user: null, profile: null, isAdmin: false }),
}));
