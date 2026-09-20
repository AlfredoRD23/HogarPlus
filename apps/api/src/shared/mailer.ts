import { config } from "../config/env";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildStaffEmail(title: string, message: string) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  return {
    subject: `HogarPlus · ${title}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;color:#0f172a">
      <div style="background:#0f172a;color:#f5e6c8;padding:16px 20px;border-radius:12px 12px 0 0">
        <strong>HogarPlus</strong>
      </div>
      <div style="background:#fff;padding:20px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <h1 style="font-size:20px;margin:0 0 12px">${safeTitle}</h1>
        <p style="margin:0;line-height:1.5">${safeMessage}</p>
      </div>
    </div>`,
    text: `${title}\n\n${message}`,
  };
}

export async function sendStaffEmail(to: string[], title: string, message: string): Promise<boolean> {
  const recipients = [...new Set(to.map((item) => item.trim().toLowerCase()).filter(Boolean))];
  if (recipients.length === 0) return false;
  const payload = buildStaffEmail(title, message);

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    console.log(`[correo omitido] ${payload.subject} → ${recipients.join(", ")}`);
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
