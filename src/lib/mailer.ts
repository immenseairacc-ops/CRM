import nodemailer from 'nodemailer';

export function getEmailTransporter(customConfig?: {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
}) {
  const host = customConfig?.host || process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(customConfig?.port || process.env.SMTP_PORT) || 465;
  const secure = customConfig?.secure !== undefined ? customConfig.secure : process.env.SMTP_SECURE !== 'false';
  const user = customConfig?.user || process.env.SMTP_USER || '';
  const pass = customConfig?.pass || process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}
