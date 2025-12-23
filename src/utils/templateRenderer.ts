import fs from 'fs';
import path from 'path';

function findTemplateFile(templateName: string): string | null {
  const projectRoot = process.cwd();
  const candidateDirs = [
    path.join(__dirname, '..', 'templates'), // dist or src build layout
    path.join(projectRoot, 'src', 'templates'), // development layout
    path.join(projectRoot, 'templates') // optional
  ];

  // Normalize base name (strip any .html extension the caller might have passed)
  const base = templateName.replace(/\.html$/i, '');

  // Build candidate name variants: base, kebab, snake, stripped channel suffix
  const variants = new Set<string>();
  variants.add(base);
  variants.add(base.replace(/_/g, '-'));
  variants.add(base.replace(/-/g, '_'));

  // strip trailing _email, -email, _sms, -sms
  const stripped = base.replace(/(?:[_-](?:email|sms))$/i, '');
  variants.add(stripped);
  variants.add(stripped.replace(/_/g, '-'));

  const ext = '.html';

  for (const dir of candidateDirs) {
    // If caller passed an explicit filename with .html, check it first
    if (/\.html$/i.test(templateName)) {
      const explicit = path.join(dir, templateName);
      if (fs.existsSync(explicit)) return explicit;
    }

    for (const name of variants) {
      const p = path.join(dir, `${name}${ext}`);
      if (fs.existsSync(p)) return p;
    }
  }

  return null;
}

function render(templateName: string, data: Record<string, unknown> = {}): string {
  try {
    const file = findTemplateFile(templateName);
    if (!file) throw new Error('template file not found');

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
