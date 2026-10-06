import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-10 text-ink-soft", className)} role="status">
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      {label && <p className="text-sm">{label}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
}
