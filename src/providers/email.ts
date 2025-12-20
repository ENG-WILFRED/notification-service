import nodemailer from 'nodemailer';
import config from '../config';

type Transporter = nodemailer.Transporter | null;

let transporter: Transporter = null;

function getTransporter(): Transporter {
  if (!transporter && config.smtp.host) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined
    });
  }
  return transporter;
}

async function send(to: string, templateName: string, content: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL] Mock → ${to} (${templateName})`);
    console.log(content);
    return;
  }

  const result = await t.sendMail({
    from: config.smtp.from,
    to,
    subject: `Notification: ${templateName}`,
    text: content
  });
  
  console.log(`[EMAIL] Sent to ${to}:`, result.messageId);
}

export { send };
