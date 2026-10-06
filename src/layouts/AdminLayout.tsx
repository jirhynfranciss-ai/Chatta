import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Spinner } from "@/components/common/Spinner";
import { useAuthStore } from "@/stores/authStore";

export function AdminLayout() {
  const { user, isAdmin, isLoading, initialized } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!initialized && isLoading) {
    return <Spinner label="Checking admin access..." className="min-h-screen bg-[#17141a]" />;
  }

  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-[#17141a] text-[#ece6f0]">
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="relative z-50 h-full"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <AdminSidebar onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[#2a2530] px-4 py-3 lg:hidden">
          <span className="font-serif-romantic text-lg font-semibold">Admin Portal</span>
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
