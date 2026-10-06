import { motion } from "framer-motion";
import { estimateRemainingMinutes } from "@/lib/utils";

const encouragements = ["Keep going! 💪", "You're doing great! 🌟", "Almost there! 🏁"];

export function ProgressHeader({ index, total }: { index: number; total: number }) {
  const percent = Math.round(((index + 1) / total) * 100);
  const remaining = total - (index + 1);
  const message =
    percent >= 85 ? encouragements[2] : percent >= 40 ? encouragements[1] : encouragements[0];

  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="font-serif-romantic text-lg text-ink-soft">Getting to know you... 💗</p>
      <div className="mt-2 flex items-center justify-between text-sm text-ink-soft">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>{remaining > 0 ? `~${estimateRemainingMinutes(remaining)} min left` : "Last one!"}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-gold"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="mt-2 text-xs font-medium text-gold">{message}</p>
    </div>
  );
}
