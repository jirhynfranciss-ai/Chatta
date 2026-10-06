import { NavLink, useNavigate } from "react-router-dom";
import { BarChart3, LayoutDashboard, LogOut, MessageSquare, Settings, ListChecks, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

const links = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/responses", label: "Responses", icon: Users },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/questions", label: "Questions", icon: ListChecks },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const signOutLocal = useAuthStore((s) => s.signOutLocal);

  async function handleLogout() {
    await supabase.auth.signOut();
    signOutLocal();
    toast.success("Logged out of admin.");
    navigate("/admin/login");
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-[#17141a] text-[#ece6f0]">
      <div className="flex items-center justify-between px-5 py-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#b9a9c9]">Admin Portal</p>
          <p className="font-serif-romantic text-lg font-semibold">A Little Question</p>
        </div>
        <button className="lg:hidden" onClick={onNavigate} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Admin navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-[#8B3A3A] text-white" : "text-[#cfc2db] hover:bg-white/5"
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => void handleLogout()}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#cfc2db] transition-colors hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );
}
