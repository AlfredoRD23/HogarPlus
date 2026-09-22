import { config } from "../config/env";
import {
  renderClientEmail,
  renderStaffAlert,
  type ClientEmailVars,
  type EmailPayload,
  type EmailTemplateId,
} from "./email-templates";

export type { EmailTemplateId, ClientEmailVars, EmailPayload };
export {
  EMAIL_TEMPLATE_CATALOG,
  previewEmailTemplate,
  renderClientEmail,
  renderStaffAlert,
} from "./email-templates";

function smtpConfigured() {
  return Boolean(config.smtpHost && config.smtpUser && config.smtpPass);
}

export async function sendMail(to: string[], payload: EmailPayload): Promise<boolean> {
  const recipients = [...new Set(to.map((item) => item.trim().toLowerCase()).filter(Boolean))];
  if (recipients.length === 0) return false;

  if (!smtpConfigured()) {
    console.log(`[correo omitido · falta SMTP] ${payload.subject} → ${recipients.join(", ")}`);
    return false;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
    await transporter.sendMail({
      from: config.emailFrom,
      to: recipients.join(", "),
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    return true;
  } catch (error) {
    console.error("No se pudo enviar el correo", error);
    return false;
  }
}

export async function sendStaffEmail(to: string[], title: string, message: string): Promise<boolean> {
  return sendMail(to, renderStaffAlert(title, message));
}

export async function sendClientTemplate(
  to: string | null | undefined,
  templateId: EmailTemplateId,
  vars: ClientEmailVars,
): Promise<boolean> {
  if (!to?.trim()) return false;
  return sendMail([to], renderClientEmail(templateId, vars));
}

export function portalUrl() {
  return `${config.clientOrigin.replace(/\/$/, "")}/portal`;
}
