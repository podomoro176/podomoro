import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'smtp.example.com') {
    console.log(`[mailer] SMTP not configured — would send to ${to}: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, html });
}
