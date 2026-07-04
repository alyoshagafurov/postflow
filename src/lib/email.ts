import nodemailer, { type Transporter } from "nodemailer";
import { env, features } from "@/lib/env";

let transporter: Transporter | null = null;

function getTransport(): Transporter | null {
  if (transporter) return transporter;
  if (!features.smtp) return null;
  const port = Number(env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    requireTLS: port !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send an email. When SMTP isn't configured (e.g. local dev) the message is
 * logged to the server console instead of failing — so flows like password
 * reset remain fully testable without a mail provider.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const t = getTransport();
  const plain = text ?? stripHtml(html);

  if (!t) {
    // eslint-disable-next-line no-console
    console.info(
      `\n──────────── [email:dev] ────────────\nTo: ${to}\nSubject: ${subject}\n\n${plain}\n─────────────────────────────────────\n`,
    );
    return { delivered: false as const, dev: true as const };
  }

  try {
    const info = await t.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text: plain,
    });
    // eslint-disable-next-line no-console
    console.info(
      `[email] sent to ${to} — ${info.response ?? info.messageId ?? "ok"}`,
    );
    return { delivered: true as const, dev: false as const };
  } catch (err) {
    // Never let a mail failure break the calling flow (register/reset/etc.).
    // eslint-disable-next-line no-console
    console.error(
      `[email] FAILED to ${to}:`,
      err instanceof Error ? err.message : err,
    );
    return { delivered: false as const, dev: false as const };
  }
}

/** Minimal, brand-consistent HTML wrapper for transactional emails. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0A0A0A;color:#EDEDED;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #222;border-radius:16px;padding:32px">
    <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:8px">PostFlow</div>
    <h1 style="font-size:18px;color:#fff;margin:16px 0">${title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#A0A0A0">${bodyHtml}</div>
    <div style="margin-top:32px;font-size:12px;color:#555">© PostFlow</div>
  </div></body></html>`;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
