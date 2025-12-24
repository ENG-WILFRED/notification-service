import nodemailer from 'nodemailer';
import config from '../config';

let transporter: any = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465, 
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });
  }
  return transporter;
}

async function send(to: string, templateName: string, content: string): Promise<void> {

  // Provide plaintext fallback by stripping HTML tags
  const plaintext = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

  const mailOptions = {
    to,
    from: config.smtp.from,
    subject: `Notification: ${templateName}`,
    text: plaintext,
    html: content
  };

  try {
    console.log(`[EMAIL] Sending via SMTP (${config.smtp.host}:${config.smtp.port}) to ${to}...`);
    const transporter = getTransporter();
    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✓ Sent to ${to}, MessageID:`, result.messageId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] ✗ Send failed: ${errMsg}`);
    console.error('[EMAIL] SMTP Config:', `host=${config.smtp.host}, port=${config.smtp.port}, user=${config.smtp.user}, from=${config.smtp.from}`);

    throw err;
  }
}

export { send };
