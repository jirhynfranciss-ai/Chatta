import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-5 text-[#ece6f0]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#b9a9c9]">{label}</p>
        <Icon className="h-5 w-5 text-[#C65D7B]" aria-hidden="true" />
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#9c8cad]">{hint}</p>}
    </div>
  );
}
