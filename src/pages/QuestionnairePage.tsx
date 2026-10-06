import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ProgressHeader } from "@/components/questionnaire/ProgressHeader";
import { QuestionRenderer } from "@/components/questionnaire/QuestionRenderer";
import { SupportingQuestionCard } from "@/components/questionnaire/SupportingQuestionCard";
import { useQuestions } from "@/hooks/useQuestions";
import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import { facebookInputSchema, normalizeFacebookUrl } from "@/lib/validation";
import type { LocalAnswerValue, Question } from "@/types";

function validateRequired(question: Question, value: LocalAnswerValue): string | null {
  if (!question.required) return null;
  if (question.key === "facebook_url") {
    if (typeof value !== "string" || !value.trim()) return "Please share your Facebook so I can find you 🤍";
    const result = facebookInputSchema.safeParse(value);
    if (!result.success) return result.error.issues[0]?.message ?? "That doesn't look right.";
    return null;
  }
  if (question.type === "MULTIPLE_CHOICE") {
    if (!Array.isArray(value) || value.length === 0) return "Please choose at least one answer.";
    return null;
  }
  if (question.type === "SINGLE_CHOICE") {
    if (!value) return "Please choose an answer.";
    return null;
  }
  // TEXT / LONG_TEXT
  if (typeof value !== "string" || !value.trim()) return "Please tell me a little more. 🤍";
  return null;
}

function matchesCondition(question: Question, answers: Record<string, { value: LocalAnswerValue }>): boolean {
  const rule = question.conditional_rule;
  if (!rule) return true;
  const parentAnswer = answers[rule.dependsOnQuestionKey]?.value;
  if (!parentAnswer) return false;
  if (Array.isArray(parentAnswer)) {
    return parentAnswer.some((v) => rule.showWhenValueIn.includes(v));
  }
  return rule.showWhenValueIn.includes(parentAnswer);
}

export function QuestionnairePage() {
  const navigate = useNavigate();
  const { primaryQuestions, supportingQuestions, isLoading, error } = useQuestions();
  const { currentQuestionIndex, answers, supportingAnswers, setAnswer, setSupportingAnswer, goNext, goBack, complete } =
    useQuestionnaireStore();

  const [supportingStep, setSupportingStep] = useState(0);
  const [showingSupporting, setShowingSupporting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const currentQuestion = primaryQuestions[currentQuestionIndex];

  const applicableSupporting = useMemo(() => {
    if (!currentQuestion) return [];
    return supportingQuestions
      .filter((q) => q.conditional_rule?.dependsOnQuestionKey === currentQuestion.key)
      .filter((q) => matchesCondition(q, answers))
      .sort((a, b) => a.display_order - b.display_order);
  }, [currentQuestion, supportingQuestions, answers]);

  if (isLoading) return <Spinner label="Loading questions..." className="min-h-[60vh]" />;

  if (error || primaryQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <EmptyState
          icon="💔"
          title={error ? "We couldn't load the questions." : "No active questions."}
          hint={error ?? "Please check back soon."}
        />
        <div className="mt-6 text-center">
          <Button variant="secondary" onClick={() => navigate("/")}>
            Back home
          </Button>
        </div>
      </div>
    );
  }

  const total = primaryQuestions.length;
  const activeQuestion: Question | undefined = showingSupporting ? applicableSupporting[supportingStep] : currentQuestion;

  function getValue(q: Question): LocalAnswerValue {
    if (q.is_supporting) return supportingAnswers[q.key]?.value ?? (q.type === "MULTIPLE_CHOICE" ? [] : "");
    return answers[q.key]?.value ?? (q.type === "MULTIPLE_CHOICE" ? [] : "");
  }

  function setValue(q: Question, value: LocalAnswerValue) {
    setFieldError(null);
    if (q.is_supporting) {
      setSupportingAnswer(q.key, currentQuestion!.key, value);
    } else {
      setAnswer(q.key, value);
    }
  }

  function advanceAfterPrimary() {
    if (applicableSupporting.length > 0) {
      setShowingSupporting(true);
      setSupportingStep(0);
    } else {
      proceedToNextPrimary();
    }
  }

  function proceedToNextPrimary() {
    setShowingSupporting(false);
    setSupportingStep(0);
    setFieldError(null);
    if (currentQuestionIndex >= total - 1) {
      complete();
      navigate("/review");
    } else {
      goNext(total - 1);
    }
  }

  function handleContinue() {
    if (!activeQuestion) return;
    const value = getValue(activeQuestion);
    const normalizedValue =
      activeQuestion.key === "facebook_url" && typeof value === "string" ? normalizeFacebookUrl(value) : value;
    const error = validateRequired(activeQuestion, normalizedValue);
    if (error) {
      setFieldError(error);
      return;
    }
    if (activeQuestion.key === "facebook_url" && typeof normalizedValue === "string" && normalizedValue !== value) {
      setValue(activeQuestion, normalizedValue);
    }

    if (showingSupporting) {
      if (supportingStep >= applicableSupporting.length - 1) {
        proceedToNextPrimary();
      } else {
        setSupportingStep((s) => s + 1);
        setFieldError(null);
      }
    } else {
      advanceAfterPrimary();
    }
  }

  function handleSkipSupporting() {
    if (!activeQuestion) return;
    setSupportingAnswer(activeQuestion.key, currentQuestion!.key, null, { skipped: true });
    if (supportingStep >= applicableSupporting.length - 1) {
      proceedToNextPrimary();
    } else {
      setSupportingStep((s) => s + 1);
    }
    setFieldError(null);
  }

  function handleBack() {
    setFieldError(null);
    if (showingSupporting) {
      if (supportingStep === 0) {
        setShowingSupporting(false);
      } else {
        setSupportingStep((s) => s - 1);
      }
      return;
    }
    if (currentQuestionIndex === 0) {
      navigate("/");
      return;
    }
    goBack();
  }

  const isLastPrimary = currentQuestionIndex >= total - 1 && !showingSupporting;
  const isVeryLastStep =
    currentQuestionIndex >= total - 1 && (showingSupporting ? supportingStep >= applicableSupporting.length - 1 : applicableSupporting.length === 0);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-xl flex-col justify-center px-5 py-10 sm:px-6">
      <ProgressHeader index={currentQuestionIndex} total={total} />

      <div className="mt-8">
        <AnimatePresence mode="wait">
          {currentQuestion && !showingSupporting && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-3xl border border-border bg-surface/60 p-6 sm:p-8"
            >
              {currentQuestion.introduction && <p className="mb-2 text-sm font-medium text-gold">{currentQuestion.introduction}</p>}
              <h2 className="font-serif-romantic text-2xl text-ink sm:text-3xl">{currentQuestion.question}</h2>
              <div className="mt-6">
                <QuestionRenderer
                  question={currentQuestion}
                  value={getValue(currentQuestion)}
                  onChange={(v) => setValue(currentQuestion, v)}
                  error={fieldError ?? undefined}
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showingSupporting && activeQuestion && (
            <SupportingQuestionCard
              key={activeQuestion.id}
              question={activeQuestion}
              value={getValue(activeQuestion)}
              onChange={(v) => setValue(activeQuestion, v)}
              onSkip={handleSkipSupporting}
              onContinue={handleContinue}
              error={fieldError ?? undefined}
            />
          )}
        </AnimatePresence>

        {!showingSupporting && (
          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} type="button">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={handleContinue} type="button">
              {isLastPrimary && isVeryLastStep ? "Review My Answers →" : (
                <>
                  Continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
