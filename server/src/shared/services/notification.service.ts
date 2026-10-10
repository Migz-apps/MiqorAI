import nodemailer from "nodemailer";
import { config } from "../../config.js";
import { logger } from "../lib/logger.js";
import { serviceUnavailable } from "../utils/errors.js";

const smtpEnabled = Boolean(config.smtp.host) && config.smtp.host !== "log";
const transporter = smtpEnabled
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

function requireSmtpTransport() {
  if (transporter) return transporter;

  if (config.nodeEnv === "production") {
    throw serviceUnavailable("Email delivery is not configured", {
      provider: "smtp",
    });
  }

  return null;
}

export async function assertEmailDeliveryReady(): Promise<void> {
  if (!transporter) {
    logger.warn("Email delivery is not configured; continuing without SMTP until env vars are set", {
      provider: "smtp",
    });
    return;
  }

  if (config.nodeEnv === "production") {
    await transporter.verify().catch((err: Error) => {
      logger.error("SMTP verification failed; continuing startup and deferring failure to email actions", {
        err: err.message,
        provider: "smtp",
      });
    });
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const activeTransport = requireSmtpTransport();

  // Single-mailbox mode: when EMAIL_REDIRECT_ALL_TO is set, every message is
  // DELIVERED to that one address while the intended recipient stays visible in
  // the subject and body. Lets one operator receive hospital/pharmacy/insurer
  // mail without extra mailboxes or a separate notification service.
  const redirect = config.smtp.redirectAllTo;
  let deliverTo = to;
  let finalSubject = subject;
  let finalHtml = html;
  if (redirect && redirect.toLowerCase() !== to.toLowerCase()) {
    deliverTo = redirect;
    finalSubject = `[for ${to}] ${subject}`;
    finalHtml = `<p style="color:#888;font-size:12px">Redirected delivery — intended recipient: <b>${to}</b></p>${html}`;
  }

  if (!activeTransport) {
    logger.info("Email (log mode)", { to: deliverTo, intended: to, subject: finalSubject });
    return;
  }

  try {
    await activeTransport.sendMail({ from: config.smtp.from, to: deliverTo, subject: finalSubject, html: finalHtml });
  } catch (err) {
    const message = (err as Error).message;
    if (config.nodeEnv === "production") {
      logger.error("Email send failed", { to, subject, err: message });
      throw serviceUnavailable("Email delivery failed", {
        provider: "smtp",
        recipient: to,
      });
    }

    logger.warn("Email send failed in non-production", { to, subject, err: message });
  }
}

export async function sendInvitationEmail(email: string, inviteUrl: string): Promise<void> {
  await sendEmail(
    email,
    "MiqorAI invitation",
    `<p>You have been invited to MiqorAI.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
  );
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  code?: string,
  expiresInMinutes?: number,
): Promise<void> {
  const codeBlock =
    code && expiresInMinutes
      ? `<p>Your reset code is <strong>${code}</strong>.</p><p>It expires in ${expiresInMinutes} minutes.</p>`
      : "";
  await sendEmail(
    email,
    "MiqorAI password reset",
    `${codeBlock}<p>Reset your password:</p><p><a href="${resetUrl}">Reset password</a></p>`,
  );
}

export async function sendPatientVerificationEmail(
  email: string,
  code: string,
  expiresInMinutes: number,
): Promise<void> {
  await sendEmail(
    email,
    "Verify your MiqorAI account",
    `<p>Your MiqorAI verification code is <strong>${code}</strong>.</p><p>It expires in ${expiresInMinutes} minutes.</p>`,
  );
}
