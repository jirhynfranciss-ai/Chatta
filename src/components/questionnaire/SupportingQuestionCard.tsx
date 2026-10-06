import { motion } from "framer-motion";
import { Button } from "@/components/common/Button";
import { QuestionRenderer } from "./QuestionRenderer";
import type { LocalAnswerValue, Question } from "@/types";

interface SupportingQuestionCardProps {
  question: Question;
  value: LocalAnswerValue;
  onChange: (value: LocalAnswerValue) => void;
  onSkip: () => void;
  onContinue: () => void;
  error?: string;
}

export function SupportingQuestionCard({ question, value, onChange, onSkip, onContinue, error }: SupportingQuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="mt-6 rounded-3xl border border-gold/40 bg-surface/70 p-6 shadow-sm"
    >
      <p className="text-sm font-semibold text-gold">Tell me more... 💭</p>
      <h3 className="mt-1 font-serif-romantic text-xl text-ink">{question.question}</h3>
      {question.introduction && <p className="mt-1 text-sm text-ink-soft">{question.introduction}</p>}
      <div className="mt-4">
        <QuestionRenderer question={question} value={value} onChange={onChange} error={error} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        {!question.required && (
          <Button variant="ghost" size="sm" onClick={onSkip} type="button">
            Skip 🤍
          </Button>
        )}
        <Button size="sm" onClick={onContinue} type="button">
          Got it! 💗
        </Button>
      </div>
    </motion.div>
  );
}
