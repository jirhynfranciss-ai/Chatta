import { useState } from "react";
import { Link, NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Avatar } from "@/components/common/Avatar";
import { Spinner } from "@/components/common/Spinner";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const links = [
  { to: "/", label: "Home", icon: Heart },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

export function UserLayout() {
  const { user, profile, isLoading, initialized } = useAuthStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const resetChat = useChatStore((s) => s.reset);

  if (!initialized && isLoading) {
    return <Spinner label="Loading your space..." className="min-h-screen" />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      resetChat();
      useAuthStore.getState().signOutLocal();
      localStorage.removeItem("questionnaire-draft");
      toast.success("See you soon. 💗");
      navigate("/");
    } catch {
      toast.error("Something went wrong. Please try again. 🤍");
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur sm:px-6">
        <Link to="/" className="font-serif-romantic text-lg font-semibold">
          A Little Question <span aria-hidden="true">💗</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex min-h-[40px] items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-contrast" : "text-ink-soft hover:text-ink"
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
          <ThemeToggle className="ml-1" />
          <button onClick={() => setConfirmOpen(true)} aria-label="Logout" className="ml-1">
            <Avatar name={profile?.display_name ?? "You"} src={profile?.avatar_url} size={36} />
          </button>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <ConfirmDialog
        open={confirmOpen}
        title="Log out?"
        description="Are you sure you want to log out?"
        confirmLabel="Logout"
        danger
        isLoading={loggingOut}
        onConfirm={() => void handleLogout()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
