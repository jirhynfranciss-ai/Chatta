import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/common/Button";
import { loginSchema, type LoginFormValues } from "@/lib/validation";
import { supabase, friendlyError } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  if (user) {
    const state = location.state as { from?: string } | null;
    return <Navigate to={state?.from ?? "/chat"} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) throw error;
      toast.success("Welcome back. 💗");
      navigate("/chat");
    } catch (err) {
      setServerError(friendlyError(err, "Invalid email or password."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-center font-serif-romantic text-3xl font-semibold text-ink">Welcome back 💗</h1>
      <p className="mt-2 text-center text-ink-soft">Sign in to continue our little conversation.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-gold"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-sm text-error">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-gold"
            {...register("password")}
          />
          {errors.password && <p className="mt-1 text-sm text-error">{errors.password.message}</p>}
        </div>
        {serverError && <p className="text-sm text-error">{serverError}</p>}
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Sign In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Haven't answered yet?{" "}
        <Link to="/questionnaire" className="font-medium text-primary hover:underline">
          Start the questions 💗
        </Link>
      </p>
    </div>
  );
}
