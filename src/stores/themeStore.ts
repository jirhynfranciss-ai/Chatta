import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference, userId?: string | null) => Promise<void>;
  init: () => void;
}

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemePreference) {
  const resolved = theme === "system" ? resolveSystemTheme() : theme;
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  return resolved;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem("theme-preference") as ThemePreference | null) ?? "system",
  resolvedTheme: "light",

  init: () => {
    const stored = (localStorage.getItem("theme-preference") as ThemePreference | null) ?? "system";
    const resolved = applyTheme(stored);
    set({ theme: stored, resolvedTheme: resolved });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", () => {
      if (get().theme === "system") {
        const r = applyTheme("system");
        set({ resolvedTheme: r });
      }
    });
  },

  setTheme: async (theme, userId) => {
    localStorage.setItem("theme-preference", theme);
    const resolved = applyTheme(theme);
    set({ theme, resolvedTheme: resolved });

    if (userId) {
      try {
        await supabase.from("user_preferences").upsert({ user_id: userId, theme, updated_at: new Date().toISOString() });
      } catch {
        // Silently keep local preference if sync fails; not fatal.
      }
    }
  },
}));
