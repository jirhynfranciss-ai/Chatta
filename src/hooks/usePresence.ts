import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Tracks the current user's presence and reports whether any peer with `watchRole` is online. */
export function usePresence(userId: string | undefined, selfRole: "user" | "admin", watchRole: "user" | "admin") {
  const [peerOnline, setPeerOnline] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("presence:global", { config: { presence: { key: userId } } });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ role: string }>();
        const online = Object.values(state).some((entries) => entries.some((e) => e.role === watchRole));
        setPeerOnline(online);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ role: selfRole, online_at: new Date().toISOString() });
        }
      });

    void supabase.from("profiles").update({ is_online: true, last_seen_at: new Date().toISOString() }).eq("id", userId);

    return () => {
      void supabase.from("profiles").update({ is_online: false, last_seen_at: new Date().toISOString() }).eq("id", userId);
      void supabase.removeChannel(channel);
    };
  }, [userId, selfRole, watchRole]);

  return peerOnline;
}
