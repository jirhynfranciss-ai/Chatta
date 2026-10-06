import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Pencil, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { QuestionRenderer } from "@/components/questionnaire/QuestionRenderer";
import { AccountCreationForm } from "@/components/questionnaire/AccountCreationForm";
import { useQuestions } from "@/hooks/useQuestions";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import { useAuthStore } from "@/stores/authStore";
import { ensureDraftResponse, submitQuestionnaire, linkResponseToUser, hasExistingSubmission } from "@/lib/questionnaireApi";
import { supabase, friendlyError } from "@/lib/supabase";
import type { RegisterFormValues } from "@/lib/validation";
import type { LocalAnswerValue, Question } from "@/types";

function formatAnswer(question: Question, value: LocalAnswerValue, skipped: boolean): string {
  if (skipped || value === null || value === undefined || value === "") return "Skipped 🤍";
  if (Array.isArray(value)) {
    const labels = value.map((v) => question.options?.find((o) => o.value === v)?.label ?? v);
    return labels.join(", ");
  }
  if (question.type === "SINGLE_CHOICE") {
    return question.options?.find((o) => o.value === value)?.label ?? value;
  }
  return value;
}

export function ReviewPage() {
  const navigate = useNavigate();
  const { primaryQuestions, questions, isLoading } = useQuestions();
  const { settings } = useSiteSettings();
  const { answers, supportingAnswers, setAnswer, markEdited, responseId, setResponseId, reset } = useQuestionnaireStore();
  const user = useAuthStore((s) => s.user);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [phase, setPhase] = useState<"review" | "submitting" | "submitted">("review");
  const [blocked, setBlocked] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const questionsByKey = useMemo(() => new Map(questions.map((q) => [q.key, q])), [questions]);

  useEffect(() => {
    if (!user || settings.allow_multiple_submissions) return;
    void hasExistingSubmission(user.id).then((already) => setBlocked(already));
  }, [user, settings.allow_multiple_submissions]);

  if (isLoading) return <Spinner label="Loading your answers..." className="min-h-[60vh]" />;

  if (Object.keys(answers).length === 0 && phase === "review") {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="font-serif-romantic text-2xl text-ink">You haven't answered anything yet. 🤍</p>
        <Button className="mt-6" onClick={() => navigate("/questionnaire")}>
          Start the questions
        </Button>
      </div>
    );
  }

  async function handleSubmit() {
    if (phase === "submitting") return;
    setPhase("submitting");
    try {
      const id = await ensureDraftResponse(responseId, user?.id ?? null);
      setResponseId(id);
      await submitQuestionnaire(id, answers, supportingAnswers, questionsByKey, user?.id ?? null);
      setPhase("submitted");
      toast.success("Submitted! 💗");
    } catch (err) {
      toast.error(friendlyError(err));
      setPhase("review");
    }
  }

  async function handleCreateAccount(values: RegisterFormValues) {
    setCreatingAccount(true);
    setAccountError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { display_name: values.displayName } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Account could not be created.");

      if (responseId) {
        try {
          await linkResponseToUser(responseId, data.user.id);
        } catch {
          // Response stays submitted even if linking fails; user can retry from profile later.
        }
      }

      if (data.session) {
        reset();
        toast.success("Welcome! 💗");
        navigate("/chat");
      } else {
        setAwaitingConfirmation(true);
      }
    } catch (err) {
      setAccountError(friendlyError(err));
    } finally {
      setCreatingAccount(false);
    }
  }

  if (blocked && phase === "review") {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="font-serif-romantic text-2xl text-ink">You've already shared your answers. 💗</p>
        <p className="mt-2 text-ink-soft">Only one set of answers is needed — thank you for being honest with me.</p>
        <Button className="mt-6" onClick={() => navigate("/chat")}>
          Go to our chat
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center font-serif-romantic text-3xl font-semibold text-ink"
      >
        So... this is you. 💗
      </motion.h1>

      {phase !== "submitted" && (
        <div className="mt-8 space-y-4">
          {primaryQuestions.map((question, i) => {
            const answer = answers[question.key];
            const supporting = Object.values(supportingAnswers).filter((s) => s.parentQuestionId === question.key);
            const isEditing = editingKey === question.key;

            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                className="rounded-2xl border border-border bg-surface/60 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink">{question.question}</p>
                  {!isEditing && (
                    <button
                      onClick={() => setEditingKey(question.key)}
                      className="flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
                      aria-label={`Edit answer for ${question.question}`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-3">
                    <QuestionRenderer
                      question={question}
                      value={answer?.value ?? (question.type === "MULTIPLE_CHOICE" ? [] : "")}
                      onChange={(v) => setAnswer(question.key, v)}
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          markEdited(question.key);
                          setEditingKey(null);
                        }}
                      >
                        <Check className="h-4 w-4" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-ink-soft">
                      {formatAnswer(question, answer?.value ?? null, answer?.skipped ?? !answer)}
                      {answer?.edited && <span className="ml-2 text-xs text-gold">Edited ✎</span>}
                    </p>
                    {supporting.length > 0 && (
                      <div className="mt-2 space-y-1 border-l-2 border-gold/40 pl-3">
                        {supporting.map((s) => {
                          const sQuestion = questionsByKey.get(s.questionId);
                          if (!sQuestion) return null;
                          return (
                            <p key={s.questionId} className="text-sm text-ink-soft">
                              <span className="font-medium text-ink">{sQuestion.question}</span>{" "}
                              {formatAnswer(sQuestion, s.value, s.skipped)}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}

          <div className="sticky bottom-4 pt-4">
            <Button className="w-full" size="lg" onClick={() => void handleSubmit()} isLoading={phase === "submitting"}>
              {phase === "submitting" ? "Sending your answers... 💗" : "Send My Answers 💗"}
            </Button>
          </div>
        </div>
      )}

      {phase === "submitted" && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mt-10 rounded-3xl border border-gold/40 bg-surface/70 p-8 text-center">
          <p className="text-3xl">💗</p>
          <h2 className="mt-2 font-serif-romantic text-2xl text-ink">Submitted! 💗</h2>
          <p className="mt-2 text-ink-soft">{settings.final_message}</p>

          {user ? (
            <Button className="mt-6" onClick={() => navigate("/chat")}>
              Go to our chat →
            </Button>
          ) : awaitingConfirmation ? (
            <div className="mt-6 space-y-3">
              <p className="text-ink-soft">Please check your email to confirm your account, then sign in. 🤍</p>
              <Button onClick={() => navigate("/auth")}>Go to sign in</Button>
            </div>
          ) : settings.account_creation_enabled ? (
            <div className="mx-auto mt-8 max-w-sm text-left">
              <p className="mb-4 text-center text-ink-soft">Want to keep talking? Create an account to chat with me. 💌</p>
              <AccountCreationForm onSubmit={(v) => void handleCreateAccount(v)} isSubmitting={creatingAccount} submitError={accountError} />
              <button onClick={() => navigate("/")} className="mt-4 w-full text-center text-sm text-ink-soft hover:underline">
                Maybe later
              </button>
            </div>
          ) : null}
        </motion.div>
      )}
    </div>
  );
}
