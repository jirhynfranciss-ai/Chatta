import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Check, CheckCheck, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

export function MessageBubble({
  message,
  isOwn,
  status,
}: {
  message: Message;
  isOwn: boolean;
  status?: "sending" | "sent" | "failed";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm sm:max-w-[65%]",
          isOwn
            ? "rounded-br-sm bg-primary text-primary-contrast"
            : "rounded-bl-sm bg-[#EDE3F5] text-[#2D1A3A] dark:bg-[#3a2d4d] dark:text-[#f0e6f8]"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[11px] opacity-70",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
          {isOwn && status === "sending" && <Clock3 className="h-3 w-3" aria-label="Sending" />}
          {isOwn && status === "failed" && <span className="text-error">Failed</span>}
          {isOwn && (!status || status === "sent") && message.read_at && <CheckCheck className="h-3 w-3" aria-label="Read" />}
          {isOwn && (!status || status === "sent") && !message.read_at && <Check className="h-3 w-3" aria-label="Sent" />}
        </div>
      </div>
    </motion.div>
  );
}
