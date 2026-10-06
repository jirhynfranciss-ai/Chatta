export function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 text-sm text-ink-soft" aria-live="polite">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft" />
      </span>
      {label}
    </div>
  );
}
