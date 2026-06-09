/**
 * Combat Action Normalizer
 *
 * Converts sheet rows, compendium records, JSON fallback records, and actor flag
 * action payloads into the same small routing contract consumed by the workflow
 * registry. This is intentionally a shim: it does not decide combat rules.
 */
function slugify(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function clonePlain(value) {
  if (value === undefined || value === null) return value;
  try {
    if (foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  } catch (_err) {
    // Foundry may not exist in tests.
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return value;
  }
}

function inferResolutionMode(action = {}) {
  const explicit = action.resolutionMode ?? action.mode ?? action.system?.resolutionMode;
  if (explicit) {
    const value = String(explicit);
    return value === 'reload' ? 'ammoReload' : value;
  }

  const key = slugify(action.id ?? action.key ?? action.name ?? action.label);
  const tags = new Set(asArray(action.contextTags ?? action.tags).map(slugify));
  const text = `${key} ${[...tags].join(' ')}`;

  if (text.includes('full-attack') || text.includes('double-attack') || text.includes('triple-attack') || text.includes('two-weapon')) return 'fullAttack';
  if (text.includes('second-wind')) return 'secondWind';
  if (text.includes('reload')) return 'ammoReload';
  if (text.includes('grapple') || text.includes('grab') || text.includes('pin')) return 'grapple';
  if (text.includes('aid-another')) return 'aidAnother';
  if (text.includes('manual') || action.manualResolution === true) return 'manual';
  if (text.includes('reference')) return 'reference';
  if (text.includes('attack') || text.includes('autofire') || text.includes('burst-fire')) return 'attack';
  if (action.skillKey || action.skill) return 'skillAction';
  return 'legacy';
}

function normalizeActionCost(action = {}) {
  const explicit = action.actionCost ?? action.actionType ?? action.type ?? action.action?.type ?? action.system?.actionCost ?? action.system?.actionType;
  const value = String(explicit ?? '').trim().toLowerCase();
  if (!value) return null;
  if (value.includes('full')) return 'full-round';
  if (value.includes('standard')) return 'standard';
  if (value.includes('move')) return 'move';
  if (value.includes('swift')) return 'swift';
  if (value.includes('reaction')) return 'reaction';
  if (value.includes('free')) return 'free';
  return value;
}

function normalizeResources(action = {}) {
  const resources = clonePlain(action.resources ?? action.resourceCosts ?? action.ammoConsumption ?? action.ammo_consumption ?? action.system?.resources ?? {}) ?? {};
  const ruleData = action.ruleData ?? action.system?.ruleData ?? {};
  const ammoCost = Number(resources.ammoCost ?? action.ammoCost ?? ruleData.ammoCost ?? 0);
  if (Number.isFinite(ammoCost) && ammoCost > 0) resources.ammoCost = ammoCost;
  return resources;
}

export function normalizeCombatAction(actionId = null, actionData = {}) {
  const source = actionData?.system ? { ...actionData.system, _item: actionData } : actionData ?? {};
  const id = source.id ?? source.key ?? actionId ?? actionData?._id ?? slugify(source.name ?? source.label ?? 'combat-action');
  const key = source.key ?? id;
  const name = source.name ?? source.label ?? actionData?.name ?? key;
  const resolutionMode = inferResolutionMode({ ...source, id, key, name });
  const actionCost = normalizeActionCost(source);
  const contextTags = [...new Set([
    ...asArray(source.contextTags ?? source.tags ?? source.system?.contextTags),
    ...(resolutionMode === 'attack' ? ['attack'] : []),
    ...(resolutionMode === 'fullAttack' ? ['fullAttack'] : []),
    ...(slugify(name).includes('autofire') ? ['autofire', 'areaAttack'] : []),
    ...(slugify(name).includes('burst-fire') ? ['burstFire', 'singleTarget'] : [])
  ].map(String).map(v => v.trim()).filter(Boolean))];

  return {
    ...clonePlain(source),
    id,
    key,
    name,
    resolutionMode,
    actionCost,
    actionType: actionCost ?? source.actionType ?? source.type ?? null,
    automationBoundary: source.automationBoundary ?? (source.gmManaged ? 'assist' : 'automate'),
    gmManaged: source.gmManaged === true,
    manualResolution: source.manualResolution === true,
    executable: source.executable !== false,
    contextTags,
    requiredContext: asArray(source.requiredContext ?? source.requirements),
    resources: normalizeResources(source),
    ruleData: clonePlain(source.ruleData ?? source.system?.ruleData ?? {}) ?? {},
    spendAction: source.spendAction
  };
}

export const CombatActionNormalizer = { normalizeCombatAction };
export default CombatActionNormalizer;
