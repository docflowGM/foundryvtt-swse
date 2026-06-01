/**
 * Droid progression guard helpers.
 *
 * Droids use the shared actor progression/sheet shell, but their biology rules
 * remain different: they do not have species, do not have Constitution, and may
 * never become Force Sensitive even when a class would normally grant it.
 */

export function isDroidProgressionActor(actor = null, pending = {}) {
  return actor?.type === 'droid'
    || actor?.system?.isDroid === true
    || actor?.system?.swse?.progressionSubtype === 'droid'
    || pending?.isDroid === true
    || pending?.subtype === 'droid'
    || pending?.progressionSubtype === 'droid'
    || pending?.droidContext?.isDroid === true
    || pending?.droid?.isDroid === true;
}

export function normalizeProgressionName(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2018\u2019\u201B\u2032']/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isForceSensitivityName(value = '') {
  const key = normalizeProgressionName(value);
  return key === 'force sensitivity' || key === 'force sensitive';
}

export function getCandidateName(candidate = null) {
  if (!candidate) return '';
  if (typeof candidate === 'string') return candidate;
  return candidate.name
    || candidate.label
    || candidate.title
    || candidate.featName
    || candidate.talentName
    || candidate.id
    || candidate._id
    || '';
}

export function isForceSensitivityCandidate(candidate = null) {
  return isForceSensitivityName(getCandidateName(candidate));
}

function collectPrerequisiteTexts(value, out = []) {
  if (value == null) return out;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    if (text) out.push(text);
    return out;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectPrerequisiteTexts(entry, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const key of [
      'ability', 'attribute', 'key', 'type', 'name', 'label', 'text', 'value',
      'minimum', 'min', 'prerequisite', 'prerequisites', 'prerequisiteText',
      'prerequisiteLine', 'requirements', 'conditions'
    ]) {
      if (value[key] !== undefined) collectPrerequisiteTexts(value[key], out);
    }
  }
  return out;
}

export function getCandidatePrerequisiteText(candidate = null) {
  if (!candidate || typeof candidate === 'string') return '';
  const system = candidate.system || {};
  const raw = [
    candidate.prerequisiteText,
    candidate.prerequisiteLine,
    candidate.prerequisites,
    candidate.requirements,
    candidate.prerequisitesStructured,
    system.prerequisite,
    system.prerequisites,
    system.prerequisiteText,
    system.prerequisiteLine,
    system.requirements,
    system.prerequisitesStructured,
  ];
  return collectPrerequisiteTexts(raw).join(' ');
}

export function candidateRequiresConstitution(candidate = null) {
  const text = getCandidatePrerequisiteText(candidate);
  if (!text) return false;
  const normalized = ` ${normalizeProgressionName(text)} `;
  // Prerequisite fields only: any CON/Constitution mention here is a hard stop
  // because droids have no Constitution score to satisfy it.
  return /\b(con|constitution)\b/.test(normalized);
}

export function getDroidAcquisitionBlockReason(actor = null, candidate = null, pending = {}) {
  if (!isDroidProgressionActor(actor, pending)) return '';
  if (isForceSensitivityCandidate(candidate)) return 'Droids cannot acquire Force Sensitivity.';
  if (candidateRequiresConstitution(candidate)) return 'Droids do not have Constitution and cannot meet Constitution prerequisites.';
  return '';
}

export function filterDroidForbiddenItemSpecs(items = [], actor = null, pending = {}) {
  if (!Array.isArray(items) || !isDroidProgressionActor(actor, pending)) return Array.isArray(items) ? items : [];
  return items.filter(item => !getDroidAcquisitionBlockReason(actor, item, pending));
}
