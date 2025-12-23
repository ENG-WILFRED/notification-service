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
  // Provide HTML body and a simple plaintext fallback by stripping tags
  const plaintext = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

  const mailOptions: nodemailer.SendMailOptions = {
    from: config.smtp.from,
    to,
    subject: `Notification: ${templateName}`,
    text: plaintext,
    html: content
  };

  const result = await t.sendMail(mailOptions);
  
  console.log(`[EMAIL] Sent to ${to}:`, result.messageId);
}

export { send };
