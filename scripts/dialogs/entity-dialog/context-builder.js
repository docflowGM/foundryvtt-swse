/**
 * Entity dialog context builder for the SWSE item sheet shell.
 *
 * This module is intentionally presentation-only. It maps existing item types and
 * existing system fields to dialog labels, accents, and body choices without
 * creating a second item schema.
 */

import { resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";
import { resolveWeaponData } from "/systems/foundryvtt-swse/scripts/items/weapon-data-resolver.js";
import { resolveEquipmentData } from "/systems/foundryvtt-swse/scripts/items/equipment-data-resolver.js";
import { resolveFeatData } from "/systems/foundryvtt-swse/scripts/items/feat-data-resolver.js";
import { resolveTalentData } from "/systems/foundryvtt-swse/scripts/items/talent-data-resolver.js";
import { resolveForcePowerData } from "/systems/foundryvtt-swse/scripts/items/force-power-data-resolver.js";
import { resolveSkillData } from "/systems/foundryvtt-swse/scripts/items/skill-data-resolver.js";
import { PrereqEngine } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/prereq-engine.js";
import { summarizeValidation, validateItemData } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/validation.js";
import { EffectIntentEngine } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/effect-intent-engine.js";

const TYPE_DEFINITIONS = Object.freeze({
  weapon: {
    kind: 'weapon',
    title: 'Weapon Record',
    noun: 'Weapon',
    icon: '⚔',
    accent: 'weapon',
    body: 'weapon'
  },
  armor: {
    kind: 'armor',
    title: 'Armor Record',
    noun: 'Armor',
    icon: '⬡',
    accent: 'armor',
    body: 'armor'
  },
  equipment: {
    kind: 'item',
    title: 'Item Record',
    noun: 'Item',
    icon: '◈',
    accent: 'item',
    body: 'item'
  },
  feat: {
    kind: 'feat',
    title: 'Feat Record',
    noun: 'Feat',
    icon: '◆',
    accent: 'feat',
    body: 'feat'
  },
  talent: {
    kind: 'talent',
    title: 'Talent Record',
    noun: 'Talent',
    icon: '◇',
    accent: 'talent',
    body: 'talent'
  },
  'force-power': {
    kind: 'forcePower',
    title: 'Force Power Record',
    noun: 'Force Power',
    icon: '✦',
    accent: 'force',
    body: 'forcePower'
  },
  skill: {
    kind: 'customSkill',
    title: 'Custom Skill Record',
    noun: 'Custom Skill',
    icon: '▣',
    accent: 'skill',
    body: 'customSkill'
  },
  maneuver: {
    kind: 'maneuver',
    title: 'Starship Maneuver Record',
    noun: 'Maneuver',
    icon: '✧',
    accent: 'maneuver',
    body: 'unsupported'
  }
});

const DEFAULT_DEFINITION = Object.freeze({
  kind: 'unsupported',
  title: 'Entity Record',
  noun: 'Entity',
  icon: '◇',
  accent: 'item',
  body: 'unsupported'
});

function asLabel(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSubtype(item, system) {
  const type = item?.type;
  if (type === 'weapon') {
    return [system?.meleeOrRanged, system?.weaponCategory].filter(Boolean).map(asLabel).join(' / ');
  }
  if (type === 'armor') {
    return asLabel(system?.armorType || 'armor');
  }
  if (type === 'equipment') {
    return asLabel(system?.category || 'gear');
  }
  if (type === 'feat') {
    return asLabel(system?.featType || system?.category || 'general');
  }
  if (type === 'talent') {
    return asLabel(system?.tree || system?.talentTree || 'talent tree');
  }
  if (type === 'force-power') {
    const descriptor = Array.isArray(system?.descriptor) ? system.descriptor.join(', ') : system?.descriptor;
    return asLabel(descriptor || system?.discipline || 'force');
  }
  if (type === 'skill') {
    return asLabel(system?.ability || system?.selectedAbility || 'custom');
  }
  return asLabel(type || 'entity');
}


function normalizeExistingPrereqSource(system = {}) {
  return system.prereqClauses
    ?? system.prerequisitesStructured?.conditions
    ?? system.structuredPrerequisites?.conditions
    ?? system.prerequisitesStructured
    ?? system.structuredPrerequisites
    ?? [];
}

function buildPrereqEditor({ system = {}, itemType = '', subject = null } = {}) {
  const rawField = itemType === 'talent' ? 'system.prerequisites' : 'system.prerequisite';
  const rawText = itemType === 'talent'
    ? (system.prerequisites || system.prerequisite || system.prerequisitesText || '')
    : (system.prerequisite || system.prerequisites || system.prerequisitesText || '');
  const clauses = PrereqEngine.normalizePrereqClauses(normalizeExistingPrereqSource(system));
  const evaluation = PrereqEngine.evaluatePrerequisites(clauses, subject);
  return {
    rawField,
    rawText,
    clauses,
    hasClauses: clauses.length > 0,
    evaluation,
    clauseCount: clauses.length,
    subjectAvailable: !!subject,
    status: !clauses.length ? 'none' : evaluation.unmetCount > 0 ? 'unmet' : evaluation.hasGmGate ? 'gm' : 'met',
    statusLabel: !clauses.length ? 'Text Only' : evaluation.unmetCount > 0 ? 'Unmet' : evaluation.hasGmGate ? 'GM Gate' : 'Met'
  };
}


function normalizeEffectSource(effects = []) {
  if (!Array.isArray(effects)) return [];
  return effects
    .map((effect) => {
      if (!effect) return null;
      if (typeof effect.toObject === 'function') return effect.toObject();
      return foundry?.utils?.deepClone?.(effect) ?? { ...effect };
    })
    .filter(Boolean);
}

function buildEffectEditor({ effects = [], editable = true, item = null, actor = null } = {}) {
  const normalizedEffects = normalizeEffectSource(effects).map(effect => EffectIntentEngine.normalizeEffectDocument(effect, { item, actor }));
  const enabledCount = normalizedEffects.filter(effect => effect.enabled).length;
  const basicCount = normalizedEffects.filter(effect => effect.hasIntent).length;
  const advancedCount = normalizedEffects.length - basicCount;
  return {
    effects: normalizedEffects,
    hasEffects: normalizedEffects.length > 0,
    count: normalizedEffects.length,
    enabledCount,
    disabledCount: normalizedEffects.length - enabledCount,
    basicCount,
    advancedCount,
    options: EffectIntentEngine.options(),
    editable: !!editable,
    summary: normalizedEffects.length
      ? `${enabledCount} enabled · ${normalizedEffects.length - enabledCount} disabled · ${basicCount} basic · ${advancedCount} advanced`
      : 'No effects yet. Add a Basic effect for common SWSE bonuses or use Advanced for raw Foundry changes.'
  };
}

function buildDcEditor({ itemType = '', forcePower = null, skill = null } = {}) {
  if (itemType === 'force-power') {
    return {
      kind: 'force-power',
      title: 'Use the Force DC Chart',
      path: 'system.dcChart',
      addLabel: 'Add DC Tier',
      withDescription: true,
      rows: forcePower?.dcChart ?? [],
      hasRows: (forcePower?.dcChart ?? []).length > 0,
      empty: 'No structured DC chart is present. Add rows here without destroying the existing rules text.'
    };
  }
  if (itemType === 'skill') {
    return {
      kind: 'skill',
      title: 'Skill DC Table',
      path: 'system.dcTable',
      addLabel: 'Add DC Row',
      withDescription: false,
      rows: skill?.dcTable ?? [],
      hasRows: (skill?.dcTable ?? []).length > 0,
      empty: 'No structured DC table yet. Add rows here while keeping the existing skill text intact.'
    };
  }
  return null;
}

export function buildEntityDialogContext({ item, system, editable = true, baseEditable = true, actorCredits = null, actor = null, mode = "edit", dirty = false, effects = [] } = {}) {
  const itemType = item?.type || 'equipment';
  const baseDefinition = TYPE_DEFINITIONS[itemType] ?? DEFAULT_DEFINITION;
  const armor = itemType === 'armor' ? resolveArmorData({ ...(item ?? {}), system }) : null;
  const weapon = itemType === 'weapon' ? resolveWeaponData({ ...(item ?? {}), system }) : null;
  const equipment = itemType === 'equipment' ? resolveEquipmentData({ ...(item ?? {}), system }) : null;
  const feat = itemType === 'feat' ? resolveFeatData({ ...(item ?? {}), system }) : null;
  const talent = itemType === 'talent' ? resolveTalentData({ ...(item ?? {}), system }) : null;
  const forcePower = itemType === 'force-power' ? resolveForcePowerData({ ...(item ?? {}), system }) : null;
  const skill = itemType === 'skill' ? resolveSkillData({ ...(item ?? {}), system }) : null;
  const prereqSubject = actor ? PrereqEngine.subjectFromActor(actor) : null;
  const prereqEditor = ['feat', 'talent'].includes(itemType) ? buildPrereqEditor({ system, itemType, subject: prereqSubject }) : null;
  const dcEditor = buildDcEditor({ itemType, forcePower, skill });
  const validation = summarizeValidation(validateItemData({ type: itemType, name: item?.name, system }));
  const effectEditor = buildEffectEditor({ effects, editable, item: { ...(item ?? {}), system }, actor });
  const isShield = !!armor?.isEnergyShield;
  const definition = isShield
    ? {
        ...baseDefinition,
        kind: 'shield',
        title: 'Energy Shield Record',
        noun: 'Energy Shield',
        icon: '⬢',
        accent: 'shield',
        body: 'shield'
      }
    : baseDefinition;

  const body = definition.body;
  const normalizedMode = ["view", "edit", "create"].includes(String(mode || "").toLowerCase()) ? String(mode).toLowerCase() : "edit";
  const canEdit = !!baseEditable;
  const formEditable = !!editable && canEdit && normalizedMode !== "view";
  const modeLabel = normalizedMode === "create" ? "Create Draft" : normalizedMode === "view" ? "View Only" : "Edit Mode";
  const modeStatus = normalizedMode === "create" ? "CREATE DRAFT" : normalizedMode === "view" ? "VIEW ONLY" : "EDIT EXISTING";
  return {
    ...definition,
    itemType,
    isShield,
    body,
    armor,
    weapon,
    equipment,
    feat,
    talent,
    forcePower,
    skill,
    prereqEditor,
    dcEditor,
    validation,
    effectEditor,
    subtitle: getSubtype(item, system),
    accentClass: [
      `swse-entity-dialog--${definition.accent}`,
      forcePower?.accentClass
    ].filter(Boolean).join(' '),
    forceAccent: forcePower?.accent ?? null,
    kindClass: `swse-entity-dialog--kind-${definition.kind}`,
    bodyClass: `swse-entity-dialog--body-${body}`,
    isWeapon: body === 'weapon',
    isArmor: body === 'armor',
    isItem: body === 'item',
    isFeat: body === 'feat',
    isTalent: body === 'talent',
    isForcePower: body === 'forcePower',
    isCustomSkill: body === 'customSkill',
    isUnsupported: body === 'unsupported',
    hasActorContext: actorCredits !== null && actorCredits !== undefined,
    editable: formEditable,
    baseEditable: canEdit,
    mode: normalizedMode,
    modeLabel,
    modeStatus,
    isViewMode: normalizedMode === "view",
    isEditMode: normalizedMode === "edit",
    isCreateMode: normalizedMode === "create",
    canEnterEdit: canEdit && normalizedMode === "view",
    canSave: canEdit && normalizedMode !== "view",
    isDirty: !!dirty
  };
}
