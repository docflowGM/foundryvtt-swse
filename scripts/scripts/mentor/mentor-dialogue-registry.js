/**
 * Mentor Dialogue Registry (SSOT)
 *
 * Loads mentor dialogue JSON files at runtime and resolves mentor aliases.
 * This module contains NO dialogue strings.
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

const mentorRegistryUrl = new URL('../../data/dialogue/mentor_registry.json', import.meta.url);
const mentorRegistryJson = await loadJson(mentorRegistryUrl);

const REGISTRY = mentorRegistryJson?.mentors ?? {};

/** @type {Map<string, any>} */
const MENTOR_DIALOGUE_CACHE = new Map();

function _normalizeId(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Resolve an input mentor id (or name-like string) to a canonical mentor_id.
 * Uses registry keys and registry aliases (data-driven; no hardcoding).
 *
 * @param {string} inputId
 * @returns {string}
 */
export function resolveMentorId(inputId) {
  const normalized = _normalizeId(inputId);
  if (!normalized) {return '';}

  if (REGISTRY[normalized]) {return normalized;}

  for (const [mentorId, entry] of Object.entries(REGISTRY)) {
    const aliases = entry?.aliases ?? [];
    if (aliases.map(_normalizeId).includes(normalized)) {return mentorId;}
  }

  return normalized;
}

export async function loadMentorDialogue(mentorId) {
  const resolved = resolveMentorId(mentorId);
  if (!resolved) {return null;}

  if (MENTOR_DIALOGUE_CACHE.has(resolved)) {return MENTOR_DIALOGUE_CACHE.get(resolved);}

  const url = new URL(`../../data/dialogue/mentors/${resolved}.json`, import.meta.url);

  try {
    const json = await loadJson(url);
    MENTOR_DIALOGUE_CACHE.set(resolved, json);
    return json;
  } catch {
    MENTOR_DIALOGUE_CACHE.set(resolved, null);
    return null;
  }
}

export async function getJudgmentLine(mentorId, atomId, intensityAtom) {
  const mentor = await loadMentorDialogue(mentorId);
  if (!mentor?.judgments) {return '';}

  const atom = mentor.judgments[atomId];
  if (!atom) {return '';}

  const variants = atom[intensityAtom];
  if (!Array.isArray(variants) || variants.length === 0) {return '';}

  const idx = variants.length === 1 ? 0 : Math.floor(Math.random() * variants.length);
  return variants[idx] || '';
}
