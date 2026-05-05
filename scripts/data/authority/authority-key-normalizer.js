// Extracted static authority data from scripts/data/prerequisite-authority.js.

export function normalizeAuthorityKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[''‛′']/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
