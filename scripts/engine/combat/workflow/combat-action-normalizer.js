/**
 * CombatActionNormalizer
 *
 * Thin Phase 1B alignment helper. It does not resolve rules; it preserves and
 * normalizes enough action metadata for the workflow registry to route to the
 * existing combat authorities without losing context.
 */

const ACTION_TYPE_ALIASES = {
  full: 'full-round',
  fullround: 'full-round',
  'full round': 'full-round',
  'full-round': 'full-round',
  standard: 'standard',
  move: 'move',
  swift: 'swift',
  free: 'free',
  reaction: 'reaction',
  immediate: 'reaction'
};


function slug(value, fallback = 'combat-action') {
  const text = String(value ?? fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return text || fallback;
}

function normalizeActionType(value, fallback = 'standard') {
  if (value && typeof value === 'object') {
    return normalizeActionType(value.type ?? value.actionType ?? value.key ?? value.value, fallback);
  }
  const key = String(value ?? fallback)
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, '-')
    .replace(/\s+/g, ' ');
  return ACTION_TYPE_ALIASES[key] ?? ACTION_TYPE_ALIASES[key.replace(/\s+/g, '')] ?? fallback;
}

function normalizeActionCost(actionType, source = {}) {
  const explicit = source.actionCost ?? source.cost ?? source.action?.cost ?? null;
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const result = {
      fullRound: Boolean(explicit.fullRound ?? explicit.fullround ?? explicit['full-round']),
      standard: Number(explicit.standard ?? 0) || 0,
      move: Number(explicit.move ?? 0) || 0,
      swift: Number(explicit.swift ?? 0) || 0,
      reaction: Number(explicit.reaction ?? 0) || 0,
      free: Boolean(explicit.free)
    };
    if (result.fullRound) {
      result.standard = Math.max(result.standard, 1);
      result.move = Math.max(result.move, 1);
      result.swift = Math.max(result.swift, 1);
    }
    return result;
  }

  const type = normalizeActionType(explicit ?? actionType);
  return {
    fullRound: type === 'full-round',
    standard: type === 'standard' || type === 'full-round' ? 1 : 0,
    move: type === 'move' || type === 'full-round' ? 1 : 0,
    swift: type === 'swift' || type === 'full-round' ? 1 : 0,
    reaction: type === 'reaction' ? 1 : 0,
    free: type === 'free'
  };
}

function arrayify(value) {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value.filter(v => v !== null && v !== undefined && v !== '');
  return [value];
}

function inferResolutionMode(action = {}) {
  const explicit = action.resolutionMode ?? action.workflow ?? action.mode ?? action.system?.resolutionMode ?? null;
  if (explicit) return String(explicit);

  if (action.manualResolution === true || action.executable === false) return 'manual';
  if (action.referenceOnly === true) return 'reference';

  const key = slug(action.key ?? action.id ?? action.name, 'combat-action');
  const text = [key, action.name, action.category, action.domain, action.notes, action.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bfull[- ]attack\b|\bdouble[- ]attack\b|\btriple[- ]attack\b|\btwo[- ]weapon\b|\bdouble[- ]weapon\b/.test(text)) return 'fullAttack';
  if (/\baid another\b/.test(text)) return 'aidAnother';
  if (/\bsecond wind\b/.test(text)) return 'secondWind';
  if (/\bgrappl|\bgrab\b|\bpin\b/.test(text)) return 'grapple';
  if (/\breload\b|\bammo\b/.test(text)) return 'ammoReload';
  if (/\bfight defensively\b|\btotal defense\b|\baim\b|\bbrace\b|\bprone\b|\brecover\b/.test(text)) return 'combatState';
  if (/\battack\b|\bautofire\b|\bburst fire\b|\bdisarm\b|\bcharge\b/.test(text) || action.isAttack === true || action.weaponId || action.itemId) return 'attack';
  if (arrayify(action.relatedSkills ?? action.relatedSkill ?? action.skillKey ?? action.skill).length) return 'skillAction';
  if (String(key).startsWith('item:') || action.sourceDocumentId || action.itemUuid) return 'actorItem';

  return 'legacy';
}

function inferAutomationBoundary(action = {}) {
  const explicit = action.automationBoundary ?? action.boundary ?? action.system?.automationBoundary;
  if (explicit) return String(explicit);
  if (action.gmManaged === true || action.manualResolution === true) return 'gm';
  if (['manual', 'reference'].includes(String(action.resolutionMode ?? '').toLowerCase())) return 'gm';
  return 'automate';
}

export class CombatActionNormalizer {
  static normalize(actionInput = {}, options = {}) {
    const raw = actionInput?.system ? { ...actionInput.system, _id: actionInput._id, name: actionInput.name, type: actionInput.type } : { ...(actionInput ?? {}) };
    const key = raw.key ?? raw.id ?? raw.actionId ?? raw._id ?? options.actionId ?? slug(raw.name, 'combat-action');
    const id = String(key || options.actionId || slug(raw.name, 'combat-action'));
    const actionType = normalizeActionType(raw.actionType ?? raw.type ?? raw.action?.type ?? raw.costType ?? raw.cost ?? 'standard');
    const resolutionMode = inferResolutionMode({ ...raw, key: id });
    const executable = raw.executable !== false && raw.referenceOnly !== true;
    const manualResolution = raw.manualResolution === true || resolutionMode === 'manual' || resolutionMode === 'reference' || executable === false;

    const contextTags = [
      ...arrayify(raw.contextTags ?? raw.tags ?? raw.tag),
      ...arrayify(raw.requiredContext).map(v => `requires:${String(v)}`)
    ].map(v => String(v));

    const resources = arrayify(raw.resources ?? raw.resourceCost ?? raw.resourceCosts).map(resource => {
      if (typeof resource === 'object') return { ...resource };
      return { type: String(resource) };
    });

    return {
      id,
      key: id,
      name: raw.name ?? raw.label ?? options.name ?? id,
      sourceType: raw.sourceType ?? raw.itemType ?? raw.type ?? raw.system?.sourceType ?? '',
      sourceName: raw.sourceName ?? raw.source ?? raw.system?.source ?? 'Combat Action',
      sourceActionId: raw.sourceActionId ?? raw.actionId ?? '',
      sourceDocumentId: raw.sourceDocumentId ?? raw.documentId ?? raw.itemId ?? null,
      sourcePath: raw.sourcePath ?? null,
      actionType,
      actionCost: normalizeActionCost(actionType, raw),
      cost: raw.cost ?? raw.actionCost ?? raw.action?.cost ?? actionType,
      resolutionMode,
      executable,
      manualResolution,
      gmManaged: raw.gmManaged === true || inferAutomationBoundary({ ...raw, resolutionMode }) === 'gm',
      automationBoundary: inferAutomationBoundary({ ...raw, resolutionMode }),
      spendAction: raw.spendAction !== false,
      isAttack: raw.isAttack === true || resolutionMode === 'attack',
      contextTags,
      requiredContext: arrayify(raw.requiredContext),
      resources,
      ruleData: raw.ruleData && typeof raw.ruleData === 'object' ? { ...raw.ruleData } : {},
      relatedSkills: arrayify(raw.relatedSkills ?? raw.relatedSkill),
      skillKey: raw.skillKey ?? raw.skill ?? null,
      dc: raw.dc ?? raw.DC ?? null,
      outcome: raw.outcome ?? null,
      when: raw.when ?? null,
      notes: raw.notes ?? raw.description ?? raw.effect ?? '',
      description: raw.description ?? raw.notes ?? raw.effect ?? '',
      uiHint: raw.uiHint ?? null,
      raw,
      rawData: raw
    };
  }
}

export { normalizeActionType, normalizeActionCost, slug as slugCombatAction };
