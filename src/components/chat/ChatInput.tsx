import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/common/Button";

export function ChatInput({
  onSend,
  onTyping,
  disabled,
}: {
  onSend: (text: string) => Promise<void> | void;
  onTyping?: () => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-border bg-bg p-3 sm:p-4">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.();
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type something..."
        rows={1}
        disabled={disabled}
        aria-label="Message"
        className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-2.5 text-ink outline-none transition-colors focus:border-gold"
      />
      <Button
        type="button"
        size="md"
        aria-label="Send message"
        onClick={() => void handleSend()}
        isLoading={sending}
        disabled={!text.trim() || disabled}
        className="!px-4"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
