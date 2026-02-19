/**
 * Stable Key Generator
 * Converts document names to deterministic, addressable keys
 * These keys are immune to encoding issues, spacing, and encoding drift
 */

export function toStableKey(name) {
  if (!name) return null;

  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ensureStableKey(document) {
  if (!document || !document.name) return null;
  return toStableKey(document.name);
}
