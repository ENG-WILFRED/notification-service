import twilio from 'twilio';
import config from '../config';

async function send(to: string, templateName: string, content: string): Promise<void> {
  if (!config.twilio.accountSid || !config.twilio.authToken) {
    console.log(`[SMS] Mock → ${to} (${templateName})`);
    console.log(content);
    return;
  }

  // Create a fresh Twilio client per send to avoid stale connection issues in cloud environments
  const client = twilio(config.twilio.accountSid, config.twilio.authToken);

  const result = await client.messages.create({
    body: content,
    from: config.twilio.from,
    to
  });

  console.log(`[SMS] Sent to ${to}:`, result.sid);
}

export { send };
