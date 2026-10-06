import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when real Supabase credentials have been provided via environment variables. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Fall back to a syntactically valid placeholder so the client can be constructed
// without crashing the app when credentials have not been configured yet.
// All real data operations will fail gracefully and surface a friendly message.
const url = supabaseUrl && supabaseUrl.length > 0 ? supabaseUrl : "https://gsbqheqzcflyluuyaupm.supabase.co";
const key = supabaseAnonKey && supabaseAnonKey.length > 0 ? supabaseAnonKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzYnFoZXF6Y2ZseWx1dXlhdXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzMyMjAsImV4cCI6MjEwNjg0OTIyMH0.f9c59B7HSdYA_CK3OrXHQOtM41YdrHoof7oKFnMdqL4";

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/** A friendly message to show instead of raw Supabase/Postgres errors. */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again. 🤍"): string {
  if (!isSupabaseConfigured) {
    return "This app isn't connected to Supabase yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
  }
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message?: string }).message ?? "");
    if (msg.toLowerCase().includes("invalid login credentials")) return "Invalid email or password.";
    if (msg.toLowerCase().includes("already registered")) return "An account with this email already exists.";
    if (msg.toLowerCase().includes("jwt") || msg.toLowerCase().includes("session")) {
      return "Your session has expired. Please log in again.";
    }
    if (msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network")) {
      return "Connection lost. Retrying...";
    }
  }
  return fallback;
}
