import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { loginSchema, type LoginFormValues } from "@/lib/validation";
import { supabase, friendlyError } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { logAdminActivity } from "@/lib/adminApi";
import { Button } from "@/components/common/Button";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, isAdmin, initialized, isLoading, refreshProfile } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  if (initialized && !isLoading && user && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword(values);
      if (error) throw error;
      await refreshProfile();
      const { data: admin } = await supabase.from("admin_users").select("id").eq("user_id", data.user.id).maybeSingle();
      if (!admin) {
        await supabase.auth.signOut();
        setServerError("This account does not have admin access.");
        return;
      }
      await logAdminActivity(data.user.id, "LOGIN");
      navigate("/admin/dashboard");
    } catch (err) {
      setServerError(friendlyError(err, "Invalid email or password."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#17141a] px-6 text-[#ece6f0]">
      <div className="w-full max-w-sm rounded-2xl border border-[#2a2530] bg-[#1f1b24] p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#8B3A3A]">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="font-serif-romantic text-2xl font-semibold">Admin Portal</h1>
          <p className="mt-1 text-sm text-[#b9a9c9]">Authorized access only</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-xl border border-[#2a2530] bg-[#17141a] px-4 py-3 text-[#ece6f0] outline-none focus:border-[#C65D7B]"
              {...register("email")}
            />
            {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-xl border border-[#2a2530] bg-[#17141a] px-4 py-3 text-[#ece6f0] outline-none focus:border-[#C65D7B]"
              {...register("password")}
            />
            {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
          </div>
          {serverError && <p className="text-sm text-red-400">{serverError}</p>}
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
