import nodemailer from 'nodemailer';
import config from '../config';

async function send(to: string, templateName: string, content: string): Promise<void> {
  if (!config.smtp.host) {
    console.log(`[EMAIL] Mock → ${to} (${templateName})`);
    console.log(content);
    return;
  }

  // Create a fresh transporter per send to avoid dead socket issues in NAT'd cloud environments
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465, // TLS if port 465
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    // Critical timeouts for cloud environments where connections silently drop
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000
  });

  try {
    // Provide HTML body and a simple plaintext fallback by stripping tags
    const plaintext = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

    const mailOptions: nodemailer.SendMailOptions = {
      from: config.smtp.from,
      to,
      subject: `Notification: ${templateName}`,
      text: plaintext,
      html: content
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Sent to ${to}:`, result.messageId);
  } finally {
    // Always close connection immediately to prevent socket reuse issues
    await transporter.close();
  }
}

export { send };
