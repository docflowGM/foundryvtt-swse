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


const DROID_ONLY_CLASS_KEYS = new Set([
  'independent droid',
  'droid commander',
]);

const DROID_ONLY_TALENT_TREE_KEYS = new Set([
  'override',
  'autonomy',
  'independent droid',
  '1stdegree droid',
  '1st degree droid',
  'first degree droid',
  '2nddegree droid',
  '2nd degree droid',
  'second degree droid',
  '3rddegree droid',
  '3rd degree droid',
  'third degree droid',
  '4thdegree droid',
  '4th degree droid',
  'fourth degree droid',
  '5thdegree droid',
  '5th degree droid',
  'fifth degree droid',
  'specialized droid',
  'droid commander',
  // Current pack source ids for droid-only trees. Keep these as a defensive
  // bridge because many talent records store only treeId source ids.
  '01cb1ca2a10640b3',
  '73814706c00849c6',
  '9688ed3500084dca',
  '9fe73a3703fa45fca628fd43cae6bf7f',
  'a212850887fe41da',
  'ad499981ddb8450e',
  'af077700c1b8433f',
  'c4e48efaad1f49af',
  'cec49bc60d1646b1',
]);

function normalizeDroidGateKey(value = '') {
  return normalizeProgressionName(value)
    .replace(/\b1st\b/g, '1st')
    .replace(/\b2nd\b/g, '2nd')
    .replace(/\b3rd\b/g, '3rd')
    .replace(/\b4th\b/g, '4th')
    .replace(/\b5th\b/g, '5th');
}

function collectCandidateValues(value, out = []) {
  if (value == null) return out;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    if (text) out.push(text);
    return out;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectCandidateValues(entry, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const key of ['id', '_id', 'key', 'slug', 'name', 'label', 'tree', 'treeId', 'talent_tree', 'talentTree', 'category', 'value']) {
      if (value[key] !== undefined) collectCandidateValues(value[key], out);
    }
  }
  return out;
}

function candidateTreeKeys(candidate = null) {
  if (!candidate || typeof candidate === 'string') return [];
  const system = candidate.system || {};
  const values = [];
  collectCandidateValues([
    candidate.treeId,
    candidate.tree,
    candidate.talent_tree,
    candidate.talentTree,
    candidate.category,
    system.treeId,
    system.tree,
    system.talent_tree,
    system.talentTree,
    system.category,
    system.talentTreeId,
    system.talentTreeName,
    system.talent_tree_id,
  ], values);
  const tags = [candidate.tags, system.tags].flat().filter(Boolean);
  for (const tag of tags) {
    const raw = String(tag || '').trim();
    if (!raw) continue;
    values.push(raw);
    if (/^tree[_-]/i.test(raw)) values.push(raw.replace(/^tree[_-]/i, ''));
    if (/^category[_-]/i.test(raw)) values.push(raw.replace(/^category[_-]/i, '').replace(/[_-]+/g, ' '));
  }
  return values.map(normalizeDroidGateKey).filter(Boolean);
}

export function isDroidOnlyTalentTreeRef(value = '') {
  const key = normalizeDroidGateKey(value);
  return DROID_ONLY_TALENT_TREE_KEYS.has(key);
}

export function actorIsCyborgLike(actor = null, pending = {}) {
  if (pending?.isCyborg === true || pending?.cyborg === true || pending?.cyborgHybrid === true || pending?.hasImplant === true) return true;
  if (pending?.implant === true || pending?.implants === true || pending?.cybernetics === true) return true;
  if (actor?.system?.isCyborg === true || actor?.system?.cyborg === true || actor?.system?.cyborgHybrid === true) return true;
  if (actor?.system?.hasImplant === true || actor?.system?.implant === true || actor?.system?.implants === true || actor?.system?.cybernetics === true) return true;
  if (actor?.flags?.swse?.isCyborg === true || actor?.flags?.foundryvttSwse?.isCyborg === true) return true;
  if (actor?.getFlag?.('foundryvtt-swse', 'isCyborg') === true || actor?.getFlag?.('swse', 'isCyborg') === true) return true;

  const items = actor?.items?.contents || actor?.items || [];
  const itemList = Array.isArray(items) ? items : Array.from(items || []);
  return itemList.some(item => {
    const text = [
      item?.name,
      item?.type,
      item?.system?.category,
      item?.system?.subcategory,
      ...(Array.isArray(item?.system?.tags) ? item.system.tags : []),
      ...(Array.isArray(item?.tags) ? item.tags : []),
    ].filter(Boolean).join(' ');
    return /\b(cybernetic|cyborg|implant|prosthesis|bio-implant|bioimplant)\b/i.test(text);
  });
}

export function candidateRequiresDroidChassis(candidate = null) {
  if (!candidate) return false;
  const candidateNameKey = normalizeDroidGateKey(getCandidateName(candidate));
  const candidateType = typeof candidate === 'string' ? '' : String(candidate?.type || candidate?.documentName || '').toLowerCase();
  if ((candidateType === 'class' || candidateType === 'swseclass') && DROID_ONLY_CLASS_KEYS.has(candidateNameKey)) return true;
  if (DROID_ONLY_CLASS_KEYS.has(candidateNameKey) && /droid/.test(candidateNameKey)) return true;

  if (typeof candidate !== 'string') {
    const system = candidate.system || {};
    if (candidate.droidOnly === true || candidate.isDroidOnly === true || system.droidOnly === true || system.isDroidOnly === true) return true;
    if (candidate.type === 'talent' && candidateTreeKeys(candidate).some(isDroidOnlyTalentTreeRef)) return true;
  }

  const text = getCandidatePrerequisiteText(candidate);
  if (!text) return false;
  if (/cannot\s+be\s+a?\s*droid|non[-\s]?droid/i.test(text)) return false;
  return /(?:^|[,(;\s])droid(?:$|[),;\s])/i.test(text);
}

export function candidateAllowsCyborgAlternative(candidate = null) {
  const text = getCandidatePrerequisiteText(candidate);
  return /\bcyborg\s+hybrid\b|\bpossess\s+an\s+implant\b|\bhave\s+an\s+implant\b/i.test(text || '');
}

export function candidateRequiresCyborgOrImplant(candidate = null) {
  const text = getCandidatePrerequisiteText(candidate);
  if (!text) return false;
  return /\bcyborg\s+hybrid\b|\bpossess\s+an\s+implant\b|\bhave\s+an\s+implant\b/i.test(text);
}

export function getOrganicDroidAcquisitionBlockReason(actor = null, candidate = null, pending = {}) {
  if (!candidate) return '';
  const actorIsDroid = isDroidProgressionActor(actor, pending);
  const actorIsCyborg = actorIsCyborgLike(actor, pending);
  const requiresDroid = candidateRequiresDroidChassis(candidate);
  const allowsCyborg = candidateAllowsCyborgAlternative(candidate);
  const requiresCyborg = candidateRequiresCyborgOrImplant(candidate) && !requiresDroid;

  if (requiresDroid && !actorIsDroid && !(allowsCyborg && actorIsCyborg)) {
    return allowsCyborg
      ? 'Requires being a Droid or Cyborg Hybrid.'
      : 'Requires being a Droid.';
  }
  if (requiresCyborg && !actorIsCyborg) {
    return 'Requires being a Cyborg Hybrid or having an implant.';
  }
  return '';
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
