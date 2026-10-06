import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock3, ListChecks, Lock } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useAuthStore } from "@/stores/authStore";

const infoItems = [
  { icon: ListChecks, label: "15 questions" },
  { icon: Clock3, label: "A few minutes" },
  { icon: Lock, label: "Just between us" },
];

export function LandingPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-sm font-medium uppercase tracking-[0.2em] text-gold"
      >
        for you
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-4 font-serif-romantic text-4xl font-semibold leading-tight text-ink sm:text-5xl"
      >
        A Little Question For You <span aria-hidden="true">💗</span>
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="mt-6 space-y-3 text-ink-soft"
      >
        <p>I made something small...</p>
        <p>but maybe a little meaningful.</p>
        <p className="pt-2">There are a few questions I'd love to ask you.</p>
        <p className="font-medium text-ink">
          No pressure.
          <br />
          Just be honest. <span aria-hidden="true">🤍</span>
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-10">
        <Link to="/questionnaire">
          <Button size="lg">Let's Begin 💗</Button>
        </Link>
        {!user && (
          <p className="mt-4 text-sm text-ink-soft">
            Already answered?{" "}
            <Link to="/auth" className="font-medium text-primary underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        )}
        {user && (
          <p className="mt-4 text-sm text-ink-soft">
            <Link to="/chat" className="font-medium text-primary underline-offset-2 hover:underline">
              Go to our chat →
            </Link>
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.55 }}
        className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-soft"
      >
        {infoItems.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
