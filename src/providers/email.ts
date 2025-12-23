import nodemailer from 'nodemailer';
import config from '../config';

async function send(to: string, templateName: string, content: string): Promise<void> {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    console.log(`[EMAIL] Mock → ${to} (${templateName}) - SMTP credentials not configured`);
    console.log(`[EMAIL] To enable real email: set SMTP_HOST, SMTP_USER, SMTP_PASS`);
    return;
  }

  console.log(`[EMAIL] Attempting to send via ${config.smtp.host}:${config.smtp.port} (secure=${config.smtp.port === 465})`);

  // Create a fresh transporter per send to avoid dead socket issues in NAT'd cloud environments
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465, // TLS if port 465
    auth: { user: config.smtp.user, pass: config.smtp.pass },
    // Critical timeouts for cloud environments where connections silently drop
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
    logger: true, // Enable nodemailer debug logging
    debug: true
  });

  try {
    console.log(`[EMAIL] Verifying SMTP connection to ${config.smtp.host}:${config.smtp.port}...`);
    await transporter.verify();
    console.log(`[EMAIL] ✓ SMTP connection verified`);

    // Provide HTML body and a simple plaintext fallback by stripping tags
    const plaintext = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

    const mailOptions: nodemailer.SendMailOptions = {
      from: config.smtp.from,
      to,
      subject: `Notification: ${templateName}`,
      text: plaintext,
      html: content
    };

    console.log(`[EMAIL] Sending email to ${to}...`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✓ Sent to ${to}:`, result.messageId);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] ✗ Send failed: ${errMsg}`);
    throw err;
  } finally {
    // Always close connection immediately to prevent socket reuse issues
    try {
      await transporter.close();
      console.log(`[EMAIL] Connection closed`);
    } catch (e) {
      // ignore close errors
    }
  }
}

export { send };
