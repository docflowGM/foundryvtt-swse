const FORCE_POWER_RESOLUTION_VERSION = 1;

const PRIMARY_BEHAVIORS = new Set([
  'damage', 'healing', 'modifier', 'mitigation', 'control', 'movement',
  'condition', 'information', 'reaction', 'hybrid', 'utility', 'manual'
]);

const CHECK_MODES = new Set([
  'none', 'fixed-dc', 'defense', 'opposed', 'margin',
  'attack-substitution', 'reaction-opposed'
]);

const AUTOMATION_STATUSES = new Set(['manual', 'metadata', 'partial', 'ready']);

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function text(value) {
  if (Array.isArray(value)) return value.join(' ');
  if (value && typeof value === 'object') return Object.values(value).join(' ');
  return String(value ?? '');
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[;,]/).map(v => v.trim()).filter(Boolean);
  if (value instanceof Set) return [...value].map(v => String(v).trim()).filter(Boolean);
  return [];
}

function inferLegacyBehavior(system = {}) {
  const tags = normalizeTags(system.tags).map(tag => tag.toLowerCase());
  const haystack = [
    system.effect, system.description, system.special, system.damage,
    system.target, system.duration, tags
  ].map(text).join(' ').toLowerCase();

  if (tags.includes('healing') || /\bheal(?:ing|s|ed)?\b/.test(haystack)) return 'healing';
  if (tags.includes('damage') || /\b\d+d\d+\b[^.]{0,60}\bdamage\b/.test(haystack)) return 'damage';
  if (/\b(?:shield rating|damage reduction|resistance|negate energy)\b/.test(haystack)) return 'mitigation';
  if (/\b(?:bonus|penalty)\b[^.]{0,80}\b(?:attack|damage|defense|skill|check|speed|jump|stealth)\b/.test(haystack)) return 'modifier';
  if (/\b(?:push|pull|move|disarm|prone|immobil|restrain)\b/.test(haystack)) return 'control';
  if (/\b(?:reaction|rebuke|interrupt)\b/.test(haystack)) return 'reaction';
  if (/\b(?:track|farseeing|sense|detect|vision|information)\b/.test(haystack)) return 'information';
  return 'utility';
}

function legacyTierRows(system = {}) {
  if (!Array.isArray(system.dcChart)) return [];
  return system.dcChart.map(row => ({
    minimum: Number.isFinite(Number(row?.dc)) ? Number(row.dc) : null,
    maximum: null,
    label: String(row?.effect ?? row?.description ?? ''),
    outcomes: [{
      kind: 'special',
      notes: String(row?.description ?? row?.effect ?? '')
    }]
  }));
}

export function createEmptyForcePowerResolution() {
  return {
    version: FORCE_POWER_RESOLUTION_VERSION,
    behavior: { primary: 'manual', secondary: [] },
    check: {
      mode: 'none', skill: 'useTheForce', baseDC: null, defense: null,
      opposedBy: null, marginStep: null, take10Allowed: true
    },
    targeting: {
      mode: 'special', range: null, shape: null, size: null,
      origin: 'caster', lineOfSight: false, affectsSelf: false
    },
    outcomes: { tiers: [], onFailure: [], onMiss: [] },
    duration: { type: 'special', value: null, maintainable: false, maintenanceAction: null },
    resourceOptions: { forcePoint: [], destinyPoint: [] },
    automation: { status: 'manual', handler: null, reviewRequired: true },
    source: { book: null, page: null, verified: false, notes: [] }
  };
}

export function adaptLegacyForcePowerResolution(power) {
  const system = power?.system ?? power ?? {};
  if (system.resolution?.version === FORCE_POWER_RESOLUTION_VERSION) return clone(system.resolution);

  const resolution = createEmptyForcePowerResolution();
  resolution.behavior.primary = inferLegacyBehavior(system);
  resolution.check.mode = Array.isArray(system.dcChart) && system.dcChart.length ? 'fixed-dc' : 'none';
  resolution.check.baseDC = Number.isFinite(Number(system.useTheForce)) ? Number(system.useTheForce) : null;
  resolution.targeting.range = system.range ?? null;
  resolution.targeting.mode = /self|personal|you/i.test(String(system.target ?? system.range ?? '')) ? 'self' : 'special';
  resolution.targeting.affectsSelf = resolution.targeting.mode === 'self';
  resolution.duration.value = system.duration ?? null;
  resolution.duration.maintainable = system.maintainable === true;
  resolution.duration.type = system.maintainable ? 'concentration' : (/instant/i.test(String(system.duration ?? '')) ? 'instant' : 'special');
  resolution.outcomes.tiers = legacyTierRows(system);
  resolution.automation.status = 'metadata';
  resolution.automation.reviewRequired = true;
  resolution.source.book = system.sourcebook ?? system.source ?? null;
  resolution.source.page = Number.isFinite(Number(system.page)) ? Number(system.page) : null;
  resolution.source.notes.push('Compatibility projection from legacy Force power fields; not source-verified.');
  return resolution;
}

export function getForcePowerResolution(power, { allowLegacy = true } = {}) {
  const system = power?.system ?? power ?? {};
  if (system.resolution?.version === FORCE_POWER_RESOLUTION_VERSION) return clone(system.resolution);
  return allowLegacy ? adaptLegacyForcePowerResolution(power) : null;
}

export function validateForcePowerResolution(resolution) {
  const errors = [];
  const warnings = [];
  if (!resolution || typeof resolution !== 'object') return { valid: false, errors: ['resolution must be an object'], warnings };
  if (resolution.version !== FORCE_POWER_RESOLUTION_VERSION) errors.push(`version must be ${FORCE_POWER_RESOLUTION_VERSION}`);
  if (!PRIMARY_BEHAVIORS.has(resolution.behavior?.primary)) errors.push('behavior.primary is invalid');
  if (!CHECK_MODES.has(resolution.check?.mode)) errors.push('check.mode is invalid');
  if (!AUTOMATION_STATUSES.has(resolution.automation?.status)) errors.push('automation.status is invalid');
  if (!Array.isArray(resolution.outcomes?.tiers)) errors.push('outcomes.tiers must be an array');
  if (!Array.isArray(resolution.outcomes?.onFailure)) errors.push('outcomes.onFailure must be an array');
  if (!Array.isArray(resolution.outcomes?.onMiss)) errors.push('outcomes.onMiss must be an array');

  const outcomes = [
    ...(resolution.outcomes?.tiers ?? []).flatMap(tier => tier?.outcomes ?? []),
    ...(resolution.outcomes?.onFailure ?? []),
    ...(resolution.outcomes?.onMiss ?? []),
    ...(resolution.resourceOptions?.forcePoint ?? []),
    ...(resolution.resourceOptions?.destinyPoint ?? [])
  ];

  for (const [index, outcome] of outcomes.entries()) {
    if (!outcome?.kind) errors.push(`outcome ${index} is missing kind`);
    if (outcome?.kind === 'damage') {
      if (!outcome.formula) errors.push(`damage outcome ${index} is missing formula`);
      if (!outcome.damageType) warnings.push(`damage outcome ${index} is missing a source-verified damage type`);
    }
    if (outcome?.kind === 'modifier') {
      if (!outcome.category) errors.push(`modifier outcome ${index} is missing category`);
      if (!outcome.target) errors.push(`modifier outcome ${index} is missing target`);
      if (outcome.amount == null) errors.push(`modifier outcome ${index} is missing amount`);
    }
  }

  if (resolution.automation?.status === 'ready' && resolution.automation?.reviewRequired) {
    errors.push('automation cannot be ready while reviewRequired is true');
  }
  if (resolution.source?.verified !== true && resolution.automation?.status === 'ready') {
    errors.push('automation cannot be ready until source.verified is true');
  }
  return { valid: errors.length === 0, errors, warnings };
}

export const ForcePowerResolutionSchema = Object.freeze({
  VERSION: FORCE_POWER_RESOLUTION_VERSION,
  createEmpty: createEmptyForcePowerResolution,
  adaptLegacy: adaptLegacyForcePowerResolution,
  get: getForcePowerResolution,
  validate: validateForcePowerResolution
});
