import nodemailer from "nodemailer";

export type MailAlertPayload = {
  subject: string;
  text: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export function createTransporter() {
  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendAlertEmail(payload: MailAlertPayload) {
  const to = requireEnv("ALERT_EMAIL_TO");
  const from = process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER;

  const transporter = createTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: payload.subject,
    text: payload.text,
  });
}
