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
    // Never let the SMTP connection hang a request indefinitely.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
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
  const plain = text ?? stripHtml(html);

  // 1) Resend (HTTP API on :443) — works from any host, including cloud
  //    platforms (Railway, Vercel…) that block or throttle outbound SMTP.
  if (features.resend) {
    const r = await sendViaResend({ to, subject, html, text: plain });
    if (r.delivered) return r;
    // otherwise fall through to SMTP
  }

  // 2) SMTP (nodemailer)
  const t = getTransport();
  if (t) {
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
      // eslint-disable-next-line no-console
      console.error(
        `[email] SMTP FAILED to ${to}:`,
        err instanceof Error ? err.message : err,
      );
      return { delivered: false as const, dev: false as const };
    }
  }

  // 3) Dev fallback — log to console (no provider configured)
  // eslint-disable-next-line no-console
  console.info(
    `\n──────────── [email:dev] ────────────\nTo: ${to}\nSubject: ${subject}\n\n${plain}\n─────────────────────────────────────\n`,
  );
  return { delivered: false as const, dev: true as const };
}

async function sendViaResend(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.error(`[email] Resend FAILED to ${msg.to}: ${res.status} ${body}`);
      return { delivered: false as const, dev: false as const };
    }
    // eslint-disable-next-line no-console
    console.info(`[email] sent via Resend to ${msg.to}`);
    return { delivered: true as const, dev: false as const };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[email] Resend error to ${msg.to}:`,
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
