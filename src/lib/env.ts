import { z } from "zod";

// Loose, client-safe view over process.env. Non-public secrets resolve to ""
// in the browser bundle (Next inlines only NEXT_PUBLIC_* vars), so importing
// this module client-side never throws and never leaks secrets.
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "",
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY ?? "",
  CRON_SECRET: process.env.CRON_SECRET ?? "",
  REDIS_URL: process.env.REDIS_URL ?? "",

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",

  TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY ?? "",
  TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET ?? "",

  META_APP_ID: process.env.META_APP_ID ?? "",
  META_APP_SECRET: process.env.META_APP_SECRET ?? "",

  // Set to "true" once the platform app has passed review and Direct Post /
  // content publishing is approved, so connected accounts become ACTIVE.
  TIKTOK_APPROVED: process.env.TIKTOK_APPROVED ?? "",
  INSTAGRAM_APPROVED: process.env.INSTAGRAM_APPROVED ?? "",

  S3_ENDPOINT: process.env.S3_ENDPOINT ?? "",
  S3_REGION: process.env.S3_REGION ?? "auto",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? "",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? "",
  S3_BUCKET: process.env.S3_BUCKET ?? "postflow-media",
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL ?? "",

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",

  SMTP_HOST: process.env.SMTP_HOST ?? "",
  SMTP_PORT: process.env.SMTP_PORT ?? "587",
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "PostFlow <no-reply@postflow.app>",
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL ?? "support@postflow.app",

  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",

  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;

// Feature flags — whether an integration has been configured. Use these
// server-side to degrade gracefully with a clear message instead of crashing.
export const features = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  youtube: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  tiktok: Boolean(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET),
  instagram: Boolean(env.META_APP_ID && env.META_APP_SECRET),
  s3: Boolean(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY),
  stripe: Boolean(env.STRIPE_SECRET_KEY),
  smtp: Boolean(env.SMTP_HOST && env.SMTP_USER),
  redis: Boolean(env.REDIS_URL),
  upstash: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
} as const;

export type FeatureKey = keyof typeof features;

// Validate critical server env at startup (server only — never in the browser).
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(32, "TOKEN_ENCRYPTION_KEY must be at least 32 chars"),
});

if (typeof window === "undefined") {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    // Warn but don't crash — so builds/deploys don't fail on incomplete env.
    // Features degrade via `features` flags, and libraries that truly need a
    // value (e.g. crypto) throw a clear error only when actually used.
    // eslint-disable-next-line no-console
    console.warn(
      "⚠️  Missing/invalid server env:",
      JSON.stringify(result.error.flatten().fieldErrors),
    );
  }
}
