import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a special character");

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "Please enter your name"),
    email: z.string().trim().email("Please enter a valid email"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(1, "Please enter your password"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const facebookInputSchema = z
  .string()
  .trim()
  .min(1, "Please share your Facebook so I can find you 🤍")
  .refine((val) => /^[a-zA-Z0-9.\-_/:]+$/.test(val), "That doesn't look like a valid Facebook link or username");

export function normalizeFacebookUrl(input: string): string {
  const trimmed = input.trim();
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (/^(m\.|web\.)?facebook\.com\//i.test(withoutProtocol)) {
    const username = withoutProtocol.replace(/^(m\.|web\.)?facebook\.com\//i, "").replace(/\/$/, "");
    return `https://facebook.com/${username}`;
  }
  const cleanUsername = trimmed.replace(/^@/, "");
  return `https://facebook.com/${cleanUsername}`;
}

export function getPasswordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score, label: labels[score] ?? "Very weak" };
}

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2, "Please enter your name"),
  nickname: z.string().trim().max(60, "Keep it under 60 characters").optional().or(z.literal("")),
  facebookUrl: z.string().trim().optional().or(z.literal("")),
});

export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;
