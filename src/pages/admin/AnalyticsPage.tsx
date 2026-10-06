import { useEffect, useState } from "react";
import { startOfMonth, startOfWeek, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Spinner } from "@/components/common/Spinner";
import { supabase } from "@/lib/supabase";
import { BarChart3, CheckCircle2, MessageSquare, Users } from "lucide-react";

const COLORS = ["#C65D7B", "#D4AF37", "#8B3A3A", "#9c8cad", "#6f6279", "#3d2a46"];

interface AnalyticsData {
  total: number;
  daily: number;
  weekly: number;
  monthly: number;
  completionRate: number;
  registeredUsers: number;
  anonymousResponses: number;
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  unreadMessages: number;
  popularAnswers: { name: string; value: number }[];
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const [{ data: responses }, { count: registeredUsers }, { count: activeUsers }, { count: totalConversations }, { data: messages }] =
        await Promise.all([
          supabase.from("responses").select("id, status, submitted_at, user_id"),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_online", true),
          supabase.from("conversations").select("id", { count: "exact", head: true }),
          supabase.from("messages").select("id, read_at, sender_role"),
        ]);

      const allResponses = responses ?? [];
      const submitted = allResponses.filter((r) => r.status === "submitted");
      const now = new Date();
      const dayAgo = subDays(now, 1).toISOString();
      const weekStart = startOfWeek(now).toISOString();
      const monthStart = startOfMonth(now).toISOString();

      const { data: freeTimeQuestion } = await supabase.from("questions").select("id").eq("key", "free_time").maybeSingle();
      let popularAnswers: { name: string; value: number }[] = [];
      if (freeTimeQuestion) {
        const { data: freeTimeAnswers } = await supabase
          .from("answers")
          .select("value_text")
          .eq("question_id", (freeTimeQuestion as { id: string }).id);
        const counts = new Map<string, number>();
        (freeTimeAnswers ?? []).forEach((a: { value_text: string | null }) => {
          if (!a.value_text) return;
          counts.set(a.value_text, (counts.get(a.value_text) ?? 0) + 1);
        });
        popularAnswers = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
      }

      if (!active) return;
      setData({
        total: submitted.length,
        daily: submitted.filter((r) => r.submitted_at && r.submitted_at >= dayAgo).length,
        weekly: submitted.filter((r) => r.submitted_at && r.submitted_at >= weekStart).length,
        monthly: submitted.filter((r) => r.submitted_at && r.submitted_at >= monthStart).length,
        completionRate: allResponses.length ? Math.round((submitted.length / allResponses.length) * 100) : 0,
        registeredUsers: registeredUsers ?? 0,
        anonymousResponses: submitted.filter((r) => !r.user_id).length,
        activeUsers: activeUsers ?? 0,
        totalConversations: totalConversations ?? 0,
        totalMessages: messages?.length ?? 0,
        unreadMessages: (messages ?? []).filter((m) => m.sender_role === "user" && !m.read_at).length,
        popularAnswers,
      });
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (!data) return <Spinner label="Crunching the numbers..." className="min-h-[60vh]" />;

  return (
    <div className="space-y-6">
      <h1 className="font-serif-romantic text-2xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Submissions" value={data.total} icon={CheckCircle2} />
        <StatCard label="Completion Rate" value={`${data.completionRate}%`} icon={BarChart3} />
        <StatCard label="Registered Users" value={data.registeredUsers} icon={Users} />
        <StatCard label="Active Users" value={data.activeUsers} icon={Users} />
        <StatCard label="Daily Submissions" value={data.daily} icon={CheckCircle2} />
        <StatCard label="Weekly Submissions" value={data.weekly} icon={CheckCircle2} />
        <StatCard label="Monthly Submissions" value={data.monthly} icon={CheckCircle2} />
        <StatCard label="Anonymous Responses" value={data.anonymousResponses} icon={Users} />
        <StatCard label="Total Conversations" value={data.totalConversations} icon={MessageSquare} />
        <StatCard label="Total Messages" value={data.totalMessages} icon={MessageSquare} />
        <StatCard label="Unread Messages" value={data.unreadMessages} icon={MessageSquare} />
      </div>

      <div className="rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-5">
        <h2 className="mb-4 text-sm font-medium text-[#b9a9c9]">Popular free-time answers</h2>
        {data.popularAnswers.length === 0 ? (
          <EmptyState title="Not enough data yet." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.popularAnswers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2530" />
                <XAxis dataKey="name" stroke="#9c8cad" fontSize={11} />
                <YAxis stroke="#9c8cad" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1f1b24", border: "1px solid #2a2530", color: "#ece6f0" }} />
                <Bar dataKey="value" fill="#C65D7B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.popularAnswers} dataKey="value" nameKey="name" outerRadius={90} label>
                  {data.popularAnswers.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1f1b24", border: "1px solid #2a2530", color: "#ece6f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
