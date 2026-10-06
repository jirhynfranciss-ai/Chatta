import { useEffect, useState } from "react";
import { format, startOfDay, subDays } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MessageSquare, Users, FileText, Activity } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Spinner } from "@/components/common/Spinner";
import { supabase } from "@/lib/supabase";

interface DashboardData {
  totalResponses: number;
  responsesToday: number;
  registeredUsers: number;
  activeConversations: number;
  submissionsByDay: { day: string; count: number }[];
  recentResponses: { id: string; submitted_at: string | null; user_id: string | null }[];
  recentMessages: { id: string; message_text: string; created_at: string }[];
  recentAccounts: { id: string; display_name: string; created_at: string }[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const since = subDays(new Date(), 30).toISOString();
      const todayStart = startOfDay(new Date()).toISOString();

      const [
        { count: totalResponses },
        { count: responsesToday },
        { count: registeredUsers },
        { count: activeConversations },
        { data: recentResponsesRaw },
        { data: recentWindow },
        { data: recentMessages },
        { data: recentAccounts },
      ] = await Promise.all([
        supabase.from("responses").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("responses").select("id", { count: "exact", head: true }).eq("status", "submitted").gte("submitted_at", todayStart),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("responses").select("id, submitted_at, user_id").eq("status", "submitted").order("submitted_at", { ascending: false }).limit(5),
        supabase.from("responses").select("submitted_at").eq("status", "submitted").gte("submitted_at", since),
        supabase.from("messages").select("id, message_text, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("profiles").select("id, display_name, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const buckets = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        buckets.set(format(subDays(new Date(), i), "MMM d"), 0);
      }
      (recentWindow ?? []).forEach((r: { submitted_at: string | null }) => {
        if (!r.submitted_at) return;
        const key = format(new Date(r.submitted_at), "MMM d");
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      });

      if (!active) return;
      setData({
        totalResponses: totalResponses ?? 0,
        responsesToday: responsesToday ?? 0,
        registeredUsers: registeredUsers ?? 0,
        activeConversations: activeConversations ?? 0,
        submissionsByDay: Array.from(buckets.entries()).map(([day, count]) => ({ day, count })),
        recentResponses: recentResponsesRaw ?? [],
        recentMessages: recentMessages ?? [],
        recentAccounts: recentAccounts ?? [],
      });
      setIsLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (isLoading || !data) return <Spinner label="Loading dashboard..." className="min-h-[60vh]" />;

  const hasSubmissions = data.submissionsByDay.some((d) => d.count > 0);

  return (
    <div className="space-y-6">
      <h1 className="font-serif-romantic text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Responses" value={data.totalResponses} icon={FileText} />
        <StatCard label="Responses Today" value={data.responsesToday} icon={Activity} />
        <StatCard label="Registered Users" value={data.registeredUsers} icon={Users} />
        <StatCard label="Active Conversations" value={data.activeConversations} icon={MessageSquare} />
      </div>

      <div className="rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#b9a9c9]">Submissions — last 30 days</h2>
        {hasSubmissions ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.submissionsByDay}>
              <defs>
                <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C65D7B" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#C65D7B" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2530" />
              <XAxis dataKey="day" stroke="#9c8cad" fontSize={12} interval={4} />
              <YAxis stroke="#9c8cad" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1f1b24", border: "1px solid #2a2530", color: "#ece6f0" }} />
              <Area type="monotone" dataKey="count" stroke="#C65D7B" fill="url(#fillCount)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="Not enough data yet." hint="Submissions will appear here once people start answering." />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-5">
          <h3 className="mb-3 text-sm font-medium text-[#b9a9c9]">Latest Responses</h3>
          {data.recentResponses.length === 0 ? (
            <p className="text-sm text-[#9c8cad]">No responses yet. 🤍</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentResponses.map((r) => (
                <li key={r.id} className="flex justify-between text-[#cfc2db]">
                  <span>{r.user_id ? "Registered" : "Anonymous"}</span>
                  <span>{r.submitted_at ? format(new Date(r.submitted_at), "MMM d, HH:mm") : "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-5">
          <h3 className="mb-3 text-sm font-medium text-[#b9a9c9]">Latest Messages</h3>
          {data.recentMessages.length === 0 ? (
            <p className="text-sm text-[#9c8cad]">No messages yet. 💭</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentMessages.map((m) => (
                <li key={m.id} className="truncate text-[#cfc2db]">
                  {m.message_text}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-5">
          <h3 className="mb-3 text-sm font-medium text-[#b9a9c9]">Recent Account Creations</h3>
          {data.recentAccounts.length === 0 ? (
            <p className="text-sm text-[#9c8cad]">No accounts yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentAccounts.map((a) => (
                <li key={a.id} className="flex justify-between text-[#cfc2db]">
                  <span>{a.display_name}</span>
                  <span>{format(new Date(a.created_at), "MMM d")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
