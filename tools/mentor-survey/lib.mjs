// Shared helpers for the mentor-survey content builders (design-document markdown -> runtime JSON packs).
import fs from 'node:fs';

export const slug = (s) => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

/** Text inside the outermost curly or straight double quotes of a line. */
export function quoted(line) {
  const m = /[“"]([\s\S]*)[”"]/.exec(line);
  return m ? m[1].trim() : null;
}

export function readLines(file) {
  return fs.readFileSync(file, 'utf8').split('\n');
}

/** Index of the first line matching `re` at or after `from`; -1 if none. */
export function find(lines, re, from = 0) {
  for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i;
  return -1;
}

export function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function fail(msg) {
  console.error(`[mentor-survey build] ${msg}`);
  process.exit(1);
}
