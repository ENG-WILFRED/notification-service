import twilio from 'twilio';
import config from '../config';

type TwilioClient = ReturnType<typeof twilio> | null;

let client: TwilioClient = null;

function getClient(): TwilioClient {
  if (!client && config.twilio.accountSid && config.twilio.authToken) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return client;
}

async function send(to: string, templateName: string, content: string): Promise<void> {
  const c = getClient();
  if (!c) {
    console.log(`[SMS] Mock → ${to} (${templateName})`);
    console.log(content);
    return;
  }

  const result = await c.messages.create({
    body: content,
    from: config.twilio.from,
    to
  });

  console.log(`[SMS] Sent to ${to}:`, result.sid);
}

export { send };
