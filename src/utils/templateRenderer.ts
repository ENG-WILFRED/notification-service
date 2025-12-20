import fs from 'fs';
import path from 'path';

function render(templateName: string, data: Record<string, unknown> = {}): string {
  try {
    const file = path.join(__dirname, '..', 'templates', `${templateName}.txt`);
    let tpl = fs.readFileSync(file, 'utf8');
    
    Object.keys(data).forEach((k) => {
      const re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
      tpl = tpl.replace(re, String(data[k]));
    });
    
    return tpl;
  } catch (err) {
    console.warn(`[TEMPLATE] Failed to load ${templateName}:`, (err as Error).message);
    return JSON.stringify(data);
  }
}

export { render };
