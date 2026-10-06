import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SiteSettings } from "@/types";

const DEFAULT_SETTINGS: SiteSettings = {
  id: "default",
  website_title: "A Little Question For You 💗",
  welcome_message: "I made something small...\nbut maybe a little meaningful.",
  final_message: "Thank you for answering. 💗",
  questionnaire_enabled: true,
  allow_multiple_submissions: false,
  account_creation_enabled: true,
  chat_enabled: true,
  session_timeout_minutes: 1440,
  notifications_enabled: true,
  updated_at: new Date().toISOString(),
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data } = await supabase.from("site_settings").select("*").maybeSingle();
        if (active && data) setSettings(data as unknown as SiteSettings);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return { settings, isLoading };
}
