import { canonicalizeSkillKey } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";
import { FeatRegistry as CanonicalFeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";

const SIZE_ORDER = ['Fine', 'Diminutive', 'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Colossal'];

function normalizeLookupKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toTitleCase(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getCanonicalFeatEntries() {
  const entries = CanonicalFeatRegistry.getAll?.() || [];
  return Array.isArray(entries) ? entries : [];
}

function getCanonicalSpeciesEntries() {
  const entries = SpeciesRegistry.getAll?.() || [];
  return Array.isArray(entries) ? entries : [];
}

export function resolveCanonicalFeatName(rawName) {
  const input = String(rawName ?? '').trim();
  if (!input) return '';

  const direct = CanonicalFeatRegistry.getByName?.(input);
  if (direct?.name) return direct.name;

  const normalized = normalizeLookupKey(input);
  if (!normalized) return input;

  const match = getCanonicalFeatEntries().find((entry) => normalizeLookupKey(entry?.name) === normalized);
  return match?.name || input.replace(/\s+/g, ' ').trim();
}

export function resolveCanonicalSpeciesName(rawName) {
  const input = String(rawName ?? '').trim();
  if (!input) return '';

  const direct = SpeciesRegistry.getByName?.(input);
  if (direct?.name) return direct.name;

  const normalized = normalizeLookupKey(input);
  if (!normalized) return input;

  const match = getCanonicalSpeciesEntries().find((entry) => normalizeLookupKey(entry?.name) === normalized);
  return match?.name || toTitleCase(input);
}

export function resolveCanonicalSkillKey(rawName) {
  const input = String(rawName ?? '').trim();
  if (!input) return null;

  const canonical = canonicalizeSkillKey(input);
  if (canonical) return canonical;

  const compact = input.replace(/\s+/g, ' ').trim();
  if (/^knowledge\s*\(/i.test(compact)) {
    return canonicalizeSkillKey(compact);
  }

  return canonicalizeSkillKey(toTitleCase(compact));
}

export function normalizePendingSkillKeys(selectedSkills) {
  if (!selectedSkills) return [];

  if (Array.isArray(selectedSkills)) {
    return selectedSkills
      .map((entry) => {
        if (typeof entry === 'string') return resolveCanonicalSkillKey(entry);
        if (entry && typeof entry === 'object') return resolveCanonicalSkillKey(entry.key || entry.name || entry.label || '');
        return null;
      })
      .filter(Boolean);
  }

  if (typeof selectedSkills === 'object') {
    return Object.entries(selectedSkills)
      .filter(([, value]) => {
        if (value === true) return true;
        if (value && typeof value === 'object') return value.trained === true;
        return false;
      })
      .map(([key]) => resolveCanonicalSkillKey(key))
      .filter(Boolean);
  }

  return [];
}

export function getActorSpeciesNames(actor, pending = {}) {
  const names = new Set();

  const pushName = (value) => {
    if (!value) return;
    if (typeof value === 'string') {
      const canonical = resolveCanonicalSpeciesName(value);
      if (canonical) names.add(canonical);
      return;
    }
    if (typeof value === 'object') {
      const candidate = value.name || value.label || value.id || value.value || '';
      const canonical = resolveCanonicalSpeciesName(candidate);
      if (canonical) names.add(canonical);
    }
  };

  pushName(actor?.system?.species);
  pushName(actor?.system?.species?.name);
  pushName(actor?.system?.race);
  pushName(actor?.system?.details?.species);
  pushName(pending?.selectedSpecies);
  pushName(pending?.species);

  return Array.from(names);
}

export function actorIsDroidLike(actor, pending = {}) {
  if (actor?.system?.isDroid === true) return true;
  if (actor?.system?.type === 'droid' || actor?.type === 'droid') return true;

  const pendingSpecies = getActorSpeciesNames(actor, pending);
  return pendingSpecies.some((name) => normalizeLookupKey(name) === 'droid');
}

export function actorMeetsMinimumSize(actor, minimumSize, pending = {}) {
  const desiredIndex = SIZE_ORDER.findIndex((entry) => entry.toLowerCase() === String(minimumSize ?? '').toLowerCase());
  if (desiredIndex < 0) return true;

  const candidates = [
    actor?.system?.traits?.size,
    actor?.system?.size,
    actor?.system?.details?.size,
    pending?.size,
    pending?.selectedSize,
  ].filter(Boolean);

  const current = candidates.find(Boolean);
  const currentIndex = SIZE_ORDER.findIndex((entry) => entry.toLowerCase() === String(current ?? '').toLowerCase());
  if (currentIndex < 0) return false;
  return currentIndex >= desiredIndex;
}

export function parseRegistryBackedLegacyPrerequisite(part) {
  const text = String(part ?? '').trim();
  if (!text) return null;

  if (/^non[-\s]?droid$/i.test(text)) {
    return { type: 'non_droid' };
  }

  const sizeMatch = text.match(/^(fine|diminutive|tiny|small|medium|large|huge|gargantuan|colossal)\s+or\s+larger(?:\s+sized?)?$/i);
  if (sizeMatch) {
    return {
      type: 'size_at_least',
      minimum: toTitleCase(sizeMatch[1]),
      label: text,
    };
  }

  const speciesName = resolveCanonicalSpeciesName(text);
  if (speciesName && getCanonicalSpeciesEntries().some((entry) => normalizeLookupKey(entry?.name) === normalizeLookupKey(speciesName))) {
    return { type: 'species', species: [speciesName], name: speciesName };
  }

  const featName = resolveCanonicalFeatName(text);
  if (featName && getCanonicalFeatEntries().some((entry) => normalizeLookupKey(entry?.name) === normalizeLookupKey(featName))) {
    return { type: 'feat', featName: featName, name: featName };
  }

  return null;
}

export function namesMatchLoosely(left, right) {
  return normalizeLookupKey(left) !== '' && normalizeLookupKey(left) === normalizeLookupKey(right);
}
