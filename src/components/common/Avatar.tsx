import { initialsFromName } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = 40,
  online,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover border border-border"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-contrast font-semibold"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
          aria-hidden="true"
        >
          {initialsFromName(name)}
        </span>
      )}
      {typeof online === "boolean" && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg",
            online ? "bg-success" : "bg-ink-soft/40"
          )}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}
