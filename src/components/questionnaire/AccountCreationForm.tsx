import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormValues, getPasswordStrength } from "@/lib/validation";
import { Button } from "@/components/common/Button";

export function AccountCreationForm({
  onSubmit,
  isSubmitting,
  submitError,
}: {
  onSubmit: (values: RegisterFormValues) => void;
  isSubmitting: boolean;
  submitError?: string | null;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const password = watch("password") ?? "";
  const strength = getPasswordStrength(password);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-ink">
          Display Name
        </label>
        <input
          id="displayName"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-gold"
          {...register("displayName")}
        />
        {errors.displayName && <p className="mt-1 text-sm text-error">{errors.displayName.message}</p>}
      </div>
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
        {password && (
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-error via-gold to-success transition-all"
              style={{ width: `${(strength.score / 5) * 100}%` }}
            />
          </div>
        )}
        {errors.password ? (
          <p className="mt-1 text-sm text-error">{errors.password.message}</p>
        ) : (
          password && <p className="mt-1 text-xs text-ink-soft">{strength.label}</p>
        )}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-ink">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none focus:border-gold"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && <p className="mt-1 text-sm text-error">{errors.confirmPassword.message}</p>}
      </div>
      {submitError && <p className="text-sm text-error">{submitError}</p>}
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Create My Account 💗
      </Button>
    </form>
  );
}
