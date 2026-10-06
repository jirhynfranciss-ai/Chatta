import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { supabase, friendlyError } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { logAdminActivity } from "@/lib/adminApi";
import type { SiteSettings } from "@/types";

export function SettingsPage() {
  const adminId = useAuthStore((s) => s.user?.id);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("*")
      .maybeSingle()
      .then(({ data }) => setSettings(data as SiteSettings | null));
  }, []);

  if (!settings) return <Spinner label="Loading settings..." className="min-h-[60vh]" />;

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({
          website_title: settings.website_title,
          welcome_message: settings.welcome_message,
          final_message: settings.final_message,
          questionnaire_enabled: settings.questionnaire_enabled,
          allow_multiple_submissions: settings.allow_multiple_submissions,
          account_creation_enabled: settings.account_creation_enabled,
          chat_enabled: settings.chat_enabled,
          session_timeout_minutes: settings.session_timeout_minutes,
          notifications_enabled: settings.notifications_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true);
      if (error) throw error;
      if (adminId) await logAdminActivity(adminId, "UPDATE_SETTINGS", "site_settings");
      toast.success("Settings saved. 💗");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof SiteSettings) {
    setSettings((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-serif-romantic text-2xl font-semibold">Settings</h1>

      <div className="space-y-4 rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-5">
        <div>
          <label className="mb-1 block text-sm text-[#b9a9c9]">Website Title</label>
          <input
            value={settings.website_title}
            onChange={(e) => setSettings({ ...settings, website_title: e.target.value })}
            className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[#b9a9c9]">Welcome Message</label>
          <textarea
            value={settings.welcome_message}
            onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[#b9a9c9]">Final Message</label>
          <textarea
            value={settings.final_message}
            onChange={(e) => setSettings({ ...settings, final_message: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[#b9a9c9]">Session Timeout (minutes)</label>
          <input
            type="number"
            value={settings.session_timeout_minutes}
            onChange={(e) => setSettings({ ...settings, session_timeout_minutes: Number(e.target.value) })}
            className="w-full rounded-lg border border-[#2a2530] bg-[#17141a] px-3 py-2 text-[#ece6f0]"
          />
        </div>

        <div className="space-y-3 pt-2">
          {(
            [
              ["questionnaire_enabled", "Questionnaire Enabled"],
              ["allow_multiple_submissions", "Allow Multiple Submissions"],
              ["account_creation_enabled", "Account Creation Enabled"],
              ["chat_enabled", "Chat Enabled"],
              ["notifications_enabled", "Notification Settings"],
            ] as [keyof SiteSettings, string][]
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-lg border border-[#2a2530] px-4 py-3">
              <span className="text-sm text-[#ece6f0]">{label}</span>
              <input type="checkbox" checked={Boolean(settings[key])} onChange={() => toggle(key)} />
            </label>
          ))}
        </div>

        <Button onClick={() => void handleSave()} isLoading={saving}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
