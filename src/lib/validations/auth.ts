import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Введите имя").max(80, "Слишком длинное имя"),
  email: z.string().email("Неверный email").max(200),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .max(100, "Слишком длинный пароль"),
});

export const loginSchema = z.object({
  email: z.string().email("Неверный email").max(200),
  password: z.string().min(1, "Введите пароль"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Неверный email").max(200),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Неверный токен"),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .max(100, "Слишком длинный пароль"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
