import { supabase } from "@/lib/supabase";

export async function fetchMyFullData(userId: string) {
  const [{ data: profile }, { data: preferences }, { data: responses }, { data: conversation }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("responses").select("*").eq("user_id", userId),
    supabase.from("conversations").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const responseIds = (responses ?? []).map((r: { id: string }) => r.id);
  const { data: answers } = responseIds.length
    ? await supabase.from("answers").select("*, supporting_answers(*)").in("response_id", responseIds)
    : { data: [] };

  const { data: messages } = conversation
    ? await supabase.from("messages").select("*").eq("conversation_id", (conversation as { id: string }).id)
    : { data: [] };

  return {
    exported_at: new Date().toISOString(),
    profile,
    preferences,
    responses,
    answers,
    messages,
  };
}
