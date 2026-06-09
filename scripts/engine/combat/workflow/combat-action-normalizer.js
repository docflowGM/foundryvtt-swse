/**
 * Combat Action Normalizer
 *
 * Thin Phase 1 workflow helper. It does not resolve rules; it only turns the
 * many historical combat-action shapes into one routing contract for the
 * CombatWorkflowRegistry and downstream roll/chat context preservation.
 */

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function normalizeBool(value, fallback = false) {
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export function normalizeCombatActionEconomyType(value = 'standard') {
  const raw = String(value ?? 'standard').trim().toLowerCase();
  if (!raw) return 'standard';
  if (raw.includes('full') && raw.includes('round')) return 'full-round';
  if (raw.includes('reaction')) return 'reaction';
  if (raw.includes('swift')) return 'swift';
  if (raw.includes('move')) return 'move';
  if (raw.includes('free')) return 'free';
  if (raw.includes('passive') || raw.includes('reference')) return 'passive';
  if (raw.includes('standard')) return 'standard';
  return raw;
}

function inferResolutionMode(source = {}) {
  const explicit = source.resolutionMode ?? source.ruleData?.resolutionMode;
  if (explicit) return String(explicit);

  const id = normalizeKey(source.id ?? source.key ?? source.actionId ?? source.name ?? '');
  const name = String(source.name ?? source.label ?? '').toLowerCase();
  const tags = asArray(source.contextTags ?? source.tags).map(tag => normalizeKey(tag));
  const skillValues = asArray(source.relatedSkills ?? source.relatedSkill ?? source.skill ?? source.skillKey)
    .map(skill => typeof skill === 'object' ? (skill.skill ?? skill.key ?? skill.name ?? skill.label ?? '') : skill)
    .map(value => String(value ?? '').toLowerCase());

  if (source.manualResolution === true) return 'manual';
  if (source.executable === false && (source.gmManaged === true || source.automationBoundary === 'manual')) return 'manual';
  if (id === 'full-attack' || name === 'full attack' || tags.includes('full-attack')) return 'fullAttack';
  if (id.includes('second-wind')) return 'secondWind';
  if (id.includes('reload')) return 'reload';
  if (id.includes('grapple') || id.includes('grab')) return 'grapple';
  if (id.includes('aid-another')) return 'aidAnother';
  if (id.includes('fight-defensively') || id.includes('total-defense') || id.includes('full-defense') || id === 'aim' || id.includes('brace')) return 'combatState';
  if (source.isAttack === true || source.domain === 'attack' || tags.includes('attack') || skillValues.some(v => v.includes('attack'))) return 'attack';
  if (skillValues.length) return 'skillAction';
  if (source.resolutionMode === 'reference') return 'reference';
  return 'legacy';
}

function inferAutomationBoundary(source = {}, resolutionMode = '') {
  const explicit = source.automationBoundary ?? source.ruleData?.automationBoundary;
  if (explicit) return String(explicit);
  if (source.manualResolution === true || resolutionMode === 'manual' || resolutionMode === 'reference') return 'manual';
  if (source.gmManaged === true) return 'assist';
  if (source.executable === false && ['legacy', 'skillAction'].includes(resolutionMode)) return 'reference';
  return 'automate';
}

export function normalizeCombatAction(actionData = {}, { actionId = null } = {}) {
  const system = actionData?.system && typeof actionData.system === 'object' ? actionData.system : null;
  const source = system ? { ...system, id: actionData.id ?? actionData._id ?? system.key, documentName: actionData.name } : { ...(actionData ?? {}) };
  const key = source.key ?? source.id ?? actionId ?? source.actionId ?? normalizeKey(source.name ?? source.label ?? 'combat-action');
  const id = source.id ?? source.actionId ?? key;
  const name = source.name ?? source.label ?? source.documentName ?? actionData?.name ?? swseActionLabelFromKey(key);
  const actionType = normalizeCombatActionEconomyType(source.actionCost ?? source.actionType ?? source.type ?? source.action?.type ?? 'standard');
  const resolutionMode = inferResolutionMode({ ...source, id, key, name });
  const automationBoundary = inferAutomationBoundary(source, resolutionMode);
  const contextTags = [
    ...asArray(source.contextTags),
    ...asArray(source.tags),
    ...(resolutionMode === 'attack' ? ['attack'] : []),
    ...(resolutionMode === 'fullAttack' ? ['fullAttack'] : [])
  ].map(String).filter(Boolean);

  return {
    ...source,
    id,
    key,
    name,
    actionId: id,
    actionType,
    actionCost: source.actionCost ?? actionType,
    cost: source.cost ?? source.action?.cost ?? null,
    resolutionMode,
    automationBoundary,
    manualResolution: normalizeBool(source.manualResolution, resolutionMode === 'manual' || resolutionMode === 'reference'),
    gmManaged: normalizeBool(source.gmManaged, automationBoundary === 'assist'),
    executable: source.executable ?? !(resolutionMode === 'manual' || resolutionMode === 'reference'),
    contextTags: [...new Set(contextTags)],
    requiredContext: asArray(source.requiredContext ?? source.requirements),
    resources: source.resources ?? source.resourceCosts ?? source.ammoConsumption ?? source.ammo_consumption ?? null,
    ruleData: source.ruleData ?? {},
    relatedSkills: source.relatedSkills ?? source.relatedSkill ?? []
  };
}

function swseActionLabelFromKey(key = '') {
  const text = String(key || 'Combat Action').replace(/[-_]+/g, ' ').trim();
  return text.replace(/\b\w/g, char => char.toUpperCase());
}
