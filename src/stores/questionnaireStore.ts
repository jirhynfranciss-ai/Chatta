import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LocalAnswer, LocalAnswerValue, LocalSupportingAnswer } from "@/types";

interface QuestionnaireState {
  currentQuestionIndex: number;
  answers: Record<string, LocalAnswer>;
  supportingAnswers: Record<string, LocalSupportingAnswer>;
  startedAt: string | null;
  completedAt: string | null;
  responseId: string | null;
  setResponseId: (id: string) => void;
  setAnswer: (questionId: string, value: LocalAnswerValue, opts?: { skipped?: boolean }) => void;
  markEdited: (questionId: string) => void;
  setSupportingAnswer: (
    questionId: string,
    parentQuestionId: string,
    value: LocalAnswerValue,
    opts?: { skipped?: boolean }
  ) => void;
  goNext: (max: number) => void;
  goBack: () => void;
  goTo: (index: number) => void;
  complete: () => void;
  reset: () => void;
}

export const useQuestionnaireStore = create<QuestionnaireState>()(
  persist(
    (set) => ({
      currentQuestionIndex: 0,
      answers: {},
      supportingAnswers: {},
      startedAt: null,
      completedAt: null,
      responseId: null,

      setResponseId: (id) => set({ responseId: id }),

      setAnswer: (questionId, value, opts) =>
        set((state) => ({
          startedAt: state.startedAt ?? new Date().toISOString(),
          answers: {
            ...state.answers,
            [questionId]: {
              questionId,
              value,
              skipped: opts?.skipped ?? false,
              edited: state.answers[questionId]?.edited ?? false,
            },
          },
        })),

      markEdited: (questionId) =>
        set((state) => ({
          answers: state.answers[questionId]
            ? { ...state.answers, [questionId]: { ...state.answers[questionId]!, edited: true } }
            : state.answers,
        })),

      setSupportingAnswer: (questionId, parentQuestionId, value, opts) =>
        set((state) => ({
          supportingAnswers: {
            ...state.supportingAnswers,
            [questionId]: { questionId, parentQuestionId, value, skipped: opts?.skipped ?? false },
          },
        })),

      goNext: (max) => set((state) => ({ currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, max) })),
      goBack: () => set((state) => ({ currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0) })),
      goTo: (index) => set({ currentQuestionIndex: Math.max(0, index) }),
      complete: () => set({ completedAt: new Date().toISOString() }),
      reset: () =>
        set({
          currentQuestionIndex: 0,
          answers: {},
          supportingAnswers: {},
          startedAt: null,
          completedAt: null,
          responseId: null,
        }),
    }),
    { name: "questionnaire-draft" }
  )
);
