import config from '../config';

async function send(to: string, templateName: string, content: string): Promise<void> {
  const smsCfg = config.sms;

  if (!smsCfg || !smsCfg.url || !smsCfg.apiKey) {
    console.log(`[SMS] Mock → ${to} (${templateName})`);
    console.log('[SMS] To enable real SMS: set SMS_URL and SMS_API_KEY environment variables');
    console.log(content);
    return;
  }

  // Normalize mobile number (basic): convert leading 0 to country code 254 if Kenyan
  let mobile = String(to).trim();
  if (mobile.startsWith('+')) mobile = mobile.slice(1);
  if (/^0\d{9}$/.test(mobile)) {
    mobile = '254' + mobile.slice(1);
  }

  // SMS should be plain text and have reasonable length
  const textMessage = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  const finalMessage = textMessage.length >= 3 ? textMessage : (textMessage + ' - message');

  // Provider expects form-encoded fields (apikey, partnerID, mobile, message, shortcode, pass_type)
  const form = new URLSearchParams();
  form.append('apikey', String(smsCfg.apiKey || ''));
  form.append('partnerID', String(smsCfg.partnerId || ''));
  form.append('shortcode', String(smsCfg.shortcode || ''));
  form.append('pass_type', String(smsCfg.passType || 'plain'));
  form.append('mobile', mobile);
  form.append('message', finalMessage);

  try {
    console.log(`[SMS] Sending via HTTP SMS provider to ${to} (normalized=${mobile}) (url=${smsCfg.url})...`);
    const res = await fetch(smsCfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch (_) {
      // not JSON
    }

    if (!res.ok) {
      console.error('[SMS] ✗ Provider responded with non-2xx status', res.status);
      if (json) {
        console.error('[SMS] Provider response:', JSON.stringify(json, null, 2));
      } else {
        console.error('[SMS] Provider response body:', text);
      }
      // Surface detailed validation errors when present
      if (json && json.errors) {
        console.error('[SMS] Provider validation errors:');
        for (const [k, v] of Object.entries(json.errors)) {
          console.error(`  - ${k}: ${JSON.stringify(v)}`);
        }
      }
      throw new Error(`SMS provider error: ${res.status}`);
    }

    console.log(`[SMS] ✓ Sent to ${to}, provider response:`, json ? JSON.stringify(json) : text);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[SMS] ✗ Send failed: ${errMsg}`);
    console.error('[SMS] SMS Config:', `url=${smsCfg.url}, partnerId=${smsCfg.partnerId}, shortcode=${smsCfg.shortcode}`);
    throw err;
  }
}

export { send };
