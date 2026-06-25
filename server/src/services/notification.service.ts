import nodemailer from "nodemailer";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({ from: config.smtp.from, to, subject, html });
  } catch (err) {
    logger.warn("Email send failed", { to, subject, err: (err as Error).message });
  }
}

export async function sendInvitationEmail(email: string, inviteUrl: string): Promise<void> {
  await sendEmail(
    email,
    "MiqorAI invitation",
    `<p>You have been invited to MiqorAI.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
  );
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  await sendEmail(
    email,
    "MiqorAI password reset",
    `<p>Reset your password:</p><p><a href="${resetUrl}">Reset password</a></p>`,
  );
}
