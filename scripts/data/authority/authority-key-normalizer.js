// Auto-generated from feats.txt and talents.txt.
// Canonical prerequisite/content authority for feat and talent hydration.

export function normalizeAuthorityKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[‘’‛′']/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
