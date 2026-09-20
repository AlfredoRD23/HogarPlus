import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET", "hogarplus-dev-secret-change-me-32chars"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads"),
  databaseUrl: required(
    "DATABASE_URL",
    "mysql://hogarplus:hogarplus@localhost:3306/hogarplus",
  ),
  cronSecret: process.env.CRON_SECRET ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? process.env.EMAIL_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? process.env.EMAIL_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? process.env.EMAIL_USER ?? "HogarPlus <noreply@hogarplus.do>",
};
