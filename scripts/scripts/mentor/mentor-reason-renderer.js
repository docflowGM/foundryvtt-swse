/**
 * Mentor Reason Renderer (SSOT)
 *
 * Loads reason text from JSON; contains NO reason strings.
 */
async function loadJson(url) {
  if (url.protocol === 'file:') {
    const fs = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const p = fileURLToPath(url);
    const raw = await fs.readFile(p, 'utf-8');
    return JSON.parse(raw);
  }

  const res = await fetch(url);
  if (!res.ok) {throw new Error(`Failed to load JSON: ${url}`);}
  return res.json();
}

const reasonsUrl = new URL('../../data/dialogue/reasons.json', import.meta.url);
export const REASON_TEXT_MAP = await loadJson(reasonsUrl);

export function isValidReasonKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(REASON_TEXT_MAP, key);
}

export function getReasonTexts(reasonKeys = []) {
  if (!Array.isArray(reasonKeys) || reasonKeys.length === 0) {return [];}
  return reasonKeys
    .filter(isValidReasonKey)
    .map((k) => REASON_TEXT_MAP[k])
    .filter((v) => typeof v === 'string' && v.length > 0);
}
