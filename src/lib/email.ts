import "server-only";
import nodemailer from "nodemailer";

/** Whether SMTP settings are present. Without them, features that send email fall back or explain why not. */
export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

let transport: nodemailer.Transporter | undefined;

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  if (!emailConfigured()) throw new Error("Email isn't set up: SMTP_HOST and EMAIL_FROM are required.");
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    // true for port 465 (TLS from the start); otherwise STARTTLS is used when the server offers it.
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.EMAIL_FROM, ...message });
}
