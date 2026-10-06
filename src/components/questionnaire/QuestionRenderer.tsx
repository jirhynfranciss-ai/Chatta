import { X } from "lucide-react";
import { ChoiceCard } from "./ChoiceCard";
import type { LocalAnswerValue, Question } from "@/types";
import { cn } from "@/lib/utils";

interface QuestionRendererProps {
  question: Question;
  value: LocalAnswerValue;
  onChange: (value: LocalAnswerValue) => void;
  error?: string;
  autoFocus?: boolean;
}

export function QuestionRenderer({ question, value, onChange, error, autoFocus }: QuestionRendererProps) {
  const inputBase =
    "w-full rounded-2xl border bg-surface px-5 py-4 text-ink placeholder:text-ink-soft/70 outline-none transition-colors focus:border-gold";

  if (question.type === "TEXT") {
    return (
      <div>
        <input
          type="text"
          autoFocus={autoFocus}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder ?? "Type your answer..."}
          aria-label={question.question}
          aria-invalid={Boolean(error)}
          className={cn(inputBase, error ? "border-error" : "border-border")}
        />
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>
    );
  }

  if (question.type === "LONG_TEXT") {
    return (
      <div>
        <textarea
          autoFocus={autoFocus}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder ?? "Share as much as you'd like..."}
          aria-label={question.question}
          aria-invalid={Boolean(error)}
          rows={5}
          className={cn(inputBase, "resize-none", error ? "border-error" : "border-border")}
        />
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>
    );
  }

  if (question.type === "SINGLE_CHOICE" && question.key === "game_hours") {
    const options = question.options ?? [];
    const numericValue = Number(value ?? options[0]?.value ?? 0);
    const max = Math.max(...options.map((o) => Number(o.value)));
    return (
      <div>
        <input
          type="range"
          min={0}
          max={max || 50}
          step={5}
          value={numericValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label={question.question}
          className="w-full accent-primary"
        />
        <p className="mt-3 text-center font-serif-romantic text-2xl text-primary">
          {numericValue}
          {numericValue >= max ? "+" : ""} hrs/week
        </p>
      </div>
    );
  }

  if (question.type === "SINGLE_CHOICE") {
    return (
      <div>
        <div className="grid gap-3" role="radiogroup" aria-label={question.question}>
          {(question.options ?? []).map((opt) => (
            <ChoiceCard key={opt.value} label={opt.label} selected={value === opt.value} onToggle={() => onChange(opt.value)} />
          ))}
        </div>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>
    );
  }

  // MULTIPLE_CHOICE
  const selected = Array.isArray(value) ? value : [];
  const options = question.options ?? [];
  const exclusiveValue = options.find((o) => o.value === "all")?.value;

  function toggle(optValue: string) {
    let next: string[];
    if (exclusiveValue && optValue === exclusiveValue) {
      next = selected.includes(optValue) ? [] : [exclusiveValue];
    } else {
      const withoutExclusive = selected.filter((v) => v !== exclusiveValue);
      next = withoutExclusive.includes(optValue)
        ? withoutExclusive.filter((v) => v !== optValue)
        : [...withoutExclusive, optValue];
    }
    onChange(next);
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink-soft">{selected.length} selected</span>
          {selected.map((v) => {
            const opt = options.find((o) => o.value === v);
            if (!opt) return null;
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {opt.label}
                <button
                  type="button"
                  aria-label={`Remove ${opt.label}`}
                  onClick={() => toggle(v)}
                  className="rounded-full hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={question.question}>
        {options.map((opt) => (
          <ChoiceCard key={opt.value} label={opt.label} multi selected={selected.includes(opt.value)} onToggle={() => toggle(opt.value)} />
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}


