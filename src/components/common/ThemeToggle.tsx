import { Moon, Sun, Monitor } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const options = [
  { value: "light" as const, icon: Sun, label: "Light theme" },
  { value: "system" as const, icon: Monitor, label: "System theme" },
  { value: "dark" as const, icon: Moon, label: "Dark theme" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const userId = useAuthStore((s) => s.user?.id);

  return (
    <div
      className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1", className)}
      role="radiogroup"
      aria-label="Theme preference"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => void setTheme(value, userId)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
            theme === value ? "bg-primary text-primary-contrast" : "text-ink-soft hover:text-ink"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
