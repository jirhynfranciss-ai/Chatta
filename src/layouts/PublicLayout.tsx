import { Link, Outlet } from "react-router-dom";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" className="font-serif-romantic text-lg font-semibold text-ink">
          A Little Question <span aria-hidden="true">💗</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
