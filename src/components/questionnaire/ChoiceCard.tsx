import { motion } from "framer-motion";
import { Check, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChoiceCardProps {
  label: string;
  selected: boolean;
  multi?: boolean;
  onToggle: () => void;
}

export function ChoiceCard({ label, selected, multi, onToggle }: ChoiceCardProps) {
  return (
    <motion.button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      className={cn(
        "group flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border px-5 py-3.5 text-left text-[15px] font-medium transition-all duration-200",
        selected
          ? "border-gold bg-primary text-primary-contrast shadow-[0_0_0_3px_rgba(212,175,55,0.25)]"
          : "border-border bg-surface text-ink hover:border-gold/70"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected ? "border-gold bg-gold/90 text-[#2D1A1F]" : "border-border text-transparent"
        )}
        aria-hidden="true"
      >
        {multi ? <Check className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" fill={selected ? "currentColor" : "none"} />}
      </span>
    </motion.button>
  );
}
