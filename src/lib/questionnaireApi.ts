import { supabase } from "@/lib/supabase";
import type { LocalAnswer, LocalSupportingAnswer, Question } from "@/types";

export async function ensureDraftResponse(responseId: string | null, userId: string | null): Promise<string> {
  if (responseId) return responseId;
  const { data, error } = await supabase
    .from("responses")
    .insert({ user_id: userId, status: "in_progress" })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function submitQuestionnaire(
  responseId: string,
  answers: Record<string, LocalAnswer>,
  supportingAnswers: Record<string, LocalSupportingAnswer>,
  questionsByKey: Map<string, Question>,
  userId: string | null
) {
  // Upsert answers tied to real question ids
  for (const key of Object.keys(answers)) {
    const question = questionsByKey.get(key);
    if (!question) continue;
    const local = answers[key]!;
    const valueText = typeof local.value === "string" ? local.value : null;
    const valueOptions = Array.isArray(local.value) ? local.value : null;

    const { data: existing } = await supabase
      .from("answers")
      .select("id")
      .eq("response_id", responseId)
      .eq("question_id", question.id)
      .maybeSingle();

    let answerId: string;
    if (existing) {
      answerId = (existing as { id: string }).id;
      const { error } = await supabase
        .from("answers")
        .update({ value_text: valueText, value_options: valueOptions, was_edited: local.edited, skipped: local.skipped })
        .eq("id", answerId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await supabase
        .from("answers")
        .insert({
          response_id: responseId,
          question_id: question.id,
          value_text: valueText,
          value_options: valueOptions,
          was_edited: local.edited,
          skipped: local.skipped,
        })
        .select("id")
        .single();
      if (error) throw error;
      answerId = (inserted as { id: string }).id;
    }

    // Persist any supporting answers linked to this primary answer
    const relatedSupporting = Object.values(supportingAnswers).filter((s) => s.parentQuestionId === key);
    for (const supporting of relatedSupporting) {
      const supportingQuestion = questionsByKey.get(supporting.questionId);
      if (!supportingQuestion) continue;
      const sValueText = typeof supporting.value === "string" ? supporting.value : null;
      const sValueOptions = Array.isArray(supporting.value) ? supporting.value : null;

      const { data: existingSupport } = await supabase
        .from("supporting_answers")
        .select("id")
        .eq("answer_id", answerId)
        .eq("question_id", supportingQuestion.id)
        .maybeSingle();

      if (existingSupport) {
        await supabase
          .from("supporting_answers")
          .update({ value_text: sValueText, value_options: sValueOptions, skipped: supporting.skipped })
          .eq("id", (existingSupport as { id: string }).id);
      } else {
        await supabase.from("supporting_answers").insert({
          answer_id: answerId,
          question_id: supportingQuestion.id,
          value_text: sValueText,
          value_options: sValueOptions,
          skipped: supporting.skipped,
        });
      }
    }
  }

  const { error: submitError } = await supabase
    .from("responses")
    .update({ status: "submitted", submitted_at: new Date().toISOString(), user_id: userId })
    .eq("id", responseId);
  if (submitError) throw submitError;
}

export async function linkResponseToUser(responseId: string, userId: string) {
  const { error } = await supabase.from("responses").update({ user_id: userId }).eq("id", responseId);
  if (error) throw error;
}

export async function hasExistingSubmission(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "submitted");
  return (count ?? 0) > 0;
}
