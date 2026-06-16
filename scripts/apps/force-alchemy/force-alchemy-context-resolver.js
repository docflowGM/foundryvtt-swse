// scripts/apps/force-alchemy/force-alchemy-context-resolver.js
// Read-only actor hydration for the Force Artifact / Sith Alchemy Workbench.

import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import {
  FORCE_ALCHEMY_FLAG_SCOPE,
  FORCE_ALCHEMY_FLAG_KEY,
  FORCE_ALCHEMY_RITES,
  FORCE_ALCHEMY_DEFENSES,
  FORCE_ALCHEMY_TEMPLATES,
  FORCE_ALCHEMY_SPECIALIST_TRAITS,
  getForceAlchemyLaunchForTalentName,
  normalizeForceAlchemyKey
} from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-data.js";
import { readForceAlchemyState } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-state-service.js";

const FEATURE_ITEM_TYPES = new Set([
  'ability', 'attribute', 'background', 'class', 'class_feature', 'classfeature',
  'combat_action', 'combataction', 'effect', 'extra_skill_use', 'extraskilluse',
  'feat', 'force_power', 'forcepower', 'force_secret', 'forcesecret',
  'force_technique', 'forcetechnique', 'language', 'species', 'skill',
  'talent', 'talent_choice', 'talentchoice', 'talent_tree', 'talenttree'
]);

function normalizeToken(value) {
  return normalizeForceAlchemyKey(value);
}

function getItems(actor) {
  const collection = actor?.items;
  if (!collection) return [];
  if (Array.isArray(collection)) return collection.filter(Boolean);
  if (Array.isArray(collection.contents)) return collection.contents.filter(Boolean);
  if (typeof collection.values === 'function') return Array.from(collection.values()).filter(Boolean);
  if (typeof collection.filter === 'function') {
    try { return collection.filter(() => true).filter(Boolean); }
    catch (_error) { return []; }
  }
  return [];
}

function numberFrom(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function itemId(item) {
  return item?.id ?? item?._id ?? item?.uuid ?? item?.name ?? null;
}

function itemSystem(item) {
  return item?.system ?? item?._source?.system ?? {};
}

function itemIsEquipped(item) {
  const system = itemSystem(item);
  return system?.equipped === true || system?.worn === true || system?.active === true || system?.activated === true;
}

function itemTypeToken(item) {
  return normalizeToken(item?.type || itemSystem(item)?.type || itemSystem(item)?.itemType);
}

function itemCategoryText(item) {
  const system = itemSystem(item);
  return [
    item?.name,
    item?.type,
    system?.type,
    system?.subtype,
    system?.category,
    system?.itemCategory,
    system?.equipmentCategory,
    system?.equipmentType,
    system?.weaponCategory,
    system?.weaponType,
    system?.weaponSubtype,
    system?.armorType,
    system?.proficiency,
    system?.proficiencyGroup,
    system?.group,
    system?.family,
    system?.description?.value,
    system?.description
  ].filter(value => value !== undefined && value !== null).join(' ').toLowerCase();
}

function hasPhysicalSignals(item) {
  const system = itemSystem(item);
  if (['weapon', 'meleeweapon', 'rangedweapon', 'blaster', 'lightsaber', 'armor', 'bodysuit', 'equipment', 'gear', 'tool', 'consumable'].includes(itemTypeToken(item))) return true;
  return system?.cost !== undefined || system?.weight !== undefined || system?.quantity !== undefined || system?.equippable !== undefined;
}

function isFeatureItem(item) {
  const type = itemTypeToken(item);
  return FEATURE_ITEM_TYPES.has(type);
}

function isPortable(item) {
  if (!item || isFeatureItem(item)) return false;
  if (hasPhysicalSignals(item)) return true;
  const text = itemCategoryText(item);
  return /weapon|armor|gear|equipment|tool|trinket|amulet|talisman|ring|pendant|object|item/.test(text);
}

function isMeleeWeapon(item) {
  if (!item || isFeatureItem(item)) return false;
  const type = itemTypeToken(item);
  const text = itemCategoryText(item);
  if (type === 'lightsaber' || text.includes('lightsaber')) return false;
  return type === 'weapon' || type === 'meleeweapon' || /melee|vibro|sword|blade|staff|spear|club|simple weapon|advanced melee|advanced weapon/.test(text);
}

function isBattleArmor(item) {
  if (!item || isFeatureItem(item)) return false;
  const type = itemTypeToken(item);
  const text = itemCategoryText(item);
  return ['armor', 'bodysuit'].includes(type) && /battle armor|light battle armor|heavy battle armor/.test(text);
}

function isAlchemicalObject(item) {
  if (!item || isFeatureItem(item)) return false;
  const flags = item?.flags?.swse?.alchemy ?? item?.flags?.['foundryvtt-swse']?.alchemy ?? {};
  const text = itemCategoryText(item);
  return !!flags.kind || /sith weapon|sith armor|dark armor|sith talisman|sith amulet|abomination/.test(text);
}

function classifyAlchemicalKind(item) {
  const flags = item?.flags?.swse?.alchemy ?? item?.flags?.['foundryvtt-swse']?.alchemy ?? {};
  const kind = normalizeToken(flags.kind || flags.targetKind || flags.alchemyKind);
  if (kind.includes('darkarmor') || kind.includes('sitharmor')) return 'dark-armor';
  if (kind.includes('sithweapon')) return 'sith-weapon';
  if (kind.includes('abomination')) return 'sith-abomination';
  const text = itemCategoryText(item);
  if (/dark armor|sith armor/.test(text)) return 'dark-armor';
  if (/sith weapon|alchemical weapon/.test(text)) return 'sith-weapon';
  if (/abomination/.test(text)) return 'sith-abomination';
  return 'sith-weapon';
}

function targetView(item, targetTypes = []) {
  const system = itemSystem(item);
  const flags = item?.flags?.swse?.alchemy ?? item?.flags?.['foundryvtt-swse']?.alchemy ?? {};
  return {
    id: itemId(item),
    uuid: item?.uuid ?? null,
    name: item?.name ?? 'Unnamed Item',
    icon: item?.img ?? null,
    glyph: targetTypes.includes('battle-armor') ? '&#9959;' : targetTypes.includes('melee-weapon') ? '&#9876;' : '&loz;',
    note: buildTargetNote(item),
    kind: classifyTargetKind(item),
    equipped: itemIsEquipped(item),
    alchemyKind: classifyAlchemicalKind(item),
    existingTraits: Array.isArray(flags.traits) ? flags.traits : [],
    targetTypes,
    systemType: system?.type ?? item?.type ?? ''
  };
}

function buildTargetNote(item) {
  const system = itemSystem(item);
  const pieces = [];
  if (system?.equipped || system?.worn) pieces.push('equipped');
  if (system?.quantity !== undefined) pieces.push(`qty ${system.quantity}`);
  if (system?.cost !== undefined) pieces.push(`${system.cost} cr`);
  const category = system?.weaponCategory || system?.armorType || system?.category || system?.subtype || item?.type;
  if (category) pieces.unshift(String(category));
  return pieces.join(' | ') || String(item?.type || 'item');
}

function classifyTargetKind(item) {
  if (isBattleArmor(item)) return 'battle-armor';
  if (isMeleeWeapon(item)) return 'melee-weapon';
  if (isAlchemicalObject(item)) return 'alchemical-object';
  return 'portable';
}

function collectTalents(items) {
  return items
    .filter(item => normalizeToken(item?.type) === 'talent' || /talent/.test(String(item?.type || '').toLowerCase()))
    .map(item => ({
      id: itemId(item),
      name: item?.name ?? 'Unnamed Talent',
      key: normalizeToken(item?.name),
      alchemyLaunch: getForceAlchemyLaunchForTalentName(item?.name)
    }));
}

function collectForcePowers(items) {
  return items
    .filter(item => {
      const type = normalizeToken(item?.type || itemSystem(item)?.type);
      const text = itemCategoryText(item);
      return type === 'forcepower' || type === 'force_power' || /force power/.test(text);
    })
    .map(item => ({
      id: itemId(item),
      uuid: item?.uuid ?? null,
      name: item?.name ?? 'Unnamed Force Power',
      note: itemSystem(item)?.descriptor || itemSystem(item)?.category || item?.type || 'Force Power'
    }));
}

function talentMatches(talentKey, requiredName) {
  const required = normalizeToken(requiredName);
  if (!required) return true;
  if (talentKey === required) return true;
  if (talentKey.startsWith(required)) return true;
  if (required.startsWith(talentKey) && talentKey.length > 4) return true;
  return false;
}

function hasTalent(talents, requiredName) {
  return talents.some(talent => talentMatches(talent.key, requiredName));
}

function getCredits(actor) {
  const system = actor?.system ?? {};
  return numberFrom(
    system.credits?.available,
    system.credits?.value,
    system.credits,
    system.currency?.credits,
    system.wealth?.credits,
    system.resources?.credits?.value
  );
}

function getActorSummary(actor) {
  const system = actor?.system ?? {};
  const forceValue = numberFrom(system.forcePoints?.value, system.resources?.forcePoints?.value);
  const forceMax = numberFrom(system.forcePoints?.max, system.resources?.forcePoints?.max, forceValue);
  const darkValue = numberFrom(DSPEngine.getValue(actor), system.darkSide?.value, system.darkSideScore?.value, system.darkSideScore);
  const darkMax = numberFrom(DSPEngine.getMax(actor), system.darkSide?.max, 10);
  return {
    id: actor?.id ?? null,
    uuid: actor?.uuid ?? null,
    name: actor?.name ?? 'No Actor Selected',
    type: actor?.type ?? '',
    forcePoints: forceValue,
    forcePointsMax: forceMax,
    darkSideScore: darkValue,
    darkSideMax: darkMax,
    credits: getCredits(actor)
  };
}

function collectTargets(actor, items, actorSummary) {
  const map = new Map();
  for (const item of items) {
    const targetTypes = [];
    if (isPortable(item)) targetTypes.push('portable');
    if (isMeleeWeapon(item)) targetTypes.push('melee-weapon');
    if (isBattleArmor(item)) targetTypes.push('battle-armor');
    if (isAlchemicalObject(item)) targetTypes.push('alchemical-object');
    if (!targetTypes.length) continue;
    map.set(itemId(item), targetView(item, targetTypes));
  }

  map.set('__materials__', {
    id: '__materials__',
    uuid: null,
    name: 'Gem and raw material cache',
    icon: null,
    glyph: '&loz;',
    note: `${actorSummary.credits.toLocaleString()} available credits`,
    kind: 'materials',
    alchemyKind: 'materials',
    existingTraits: [],
    targetTypes: ['materials'],
    virtual: true
  });

  return [...map.values()];
}

function targetsForType(targets, targetType) {
  return targets.filter(target => target.targetTypes?.includes?.(targetType));
}

function buildDynamicPrereq(context, key) {
  if (key === 'activeForceTalisman') {
    const hasForceTalismanTarget = targetsForType(context.targets, 'portable').some(target => target.alchemyKind === 'force-talisman' || /force talisman/i.test(target.name));
    return {
      key,
      label: 'Active or prepared Force Talisman',
      met: !!context.state.activeForceTalisman || hasForceTalismanTarget,
      note: 'A prepared Force Talisman target is enough for read-only planning; later phases will enforce activation state.'
    };
  }
  return { key, label: key, met: false, note: 'Unknown dynamic prerequisite.' };
}

function buildRiteEligibility(rite, context) {
  const talentPrereqs = (rite.requiredTalents || []).map(name => ({
    type: 'talent',
    label: name,
    met: hasTalent(context.talents, name)
  }));
  const dynamicPrereqs = (rite.dynamicPrereqs || []).map(key => buildDynamicPrereq(context, key));
  const creditPrereq = rite.creditCost > 0 ? [{
    type: 'credits',
    label: `${rite.creditCost.toLocaleString()} credits available`,
    met: context.actor.credits >= rite.creditCost
  }] : [];
  const targetPrereq = [{
    type: 'target',
    label: `${rite.targetLabel || rite.targetType} target available`,
    met: targetsForType(context.targets, rite.targetType).length > 0
  }];
  const prereqs = [...talentPrereqs, ...dynamicPrereqs, ...creditPrereq, ...targetPrereq];
  return {
    prereqs,
    eligible: prereqs.every(prereq => prereq.met)
  };
}

function buildRites(context, activeCategory, selectedRiteId) {
  return FORCE_ALCHEMY_RITES.map(rite => {
    const eligibility = buildRiteEligibility(rite, context);
    return {
      ...rite,
      selected: rite.id === selectedRiteId,
      activeCategory: rite.category === activeCategory,
      eligible: eligibility.eligible,
      prereqs: eligibility.prereqs,
      timingLabel: rite.timing === 'downtime' ? 'Downtime' : rite.timing === 'encounter' ? 'Encounter' : 'Instant',
      costLabel: rite.creditCost > 0 ? `${rite.creditCost.toLocaleString()} cr` : 'No credit cost',
      fpLabel: rite.fpCost > 0 ? `${rite.fpCost} FP` : '0 FP',
      dspLabel: rite.dspCost > 0 ? `+${rite.dspCost} DSP` : 'No DSP',
      blockedReason: eligibility.eligible ? null : eligibility.prereqs.find(prereq => !prereq.met)?.label ?? 'Requirement missing'
    };
  });
}

function buildDetail({ rites, selectedRiteId, selectedTargetId, selectedConfig, context }) {
  const selectedRite = rites.find(rite => rite.id === selectedRiteId) ?? rites[0] ?? null;
  if (!selectedRite) return null;

  const targets = targetsForType(context.targets, selectedRite.targetType).map(target => ({
    ...target,
    selected: target.id === selectedTargetId
  }));
  const selectedTarget = targets.find(target => target.selected) ?? null;
  const selectedDefense = FORCE_ALCHEMY_DEFENSES.find(defense => defense.id === selectedConfig?.defense) ?? null;
  const selectedPower = context.forcePowers.find(power => power.id === selectedConfig?.powerId) ?? null;
  const selectedTemplate = FORCE_ALCHEMY_TEMPLATES.find(template => template.id === selectedConfig?.templateId) ?? null;

  const traitGroups = Object.entries(FORCE_ALCHEMY_SPECIALIST_TRAITS).map(([kind, traits]) => ({
    kind,
    label: kind.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
    traits: traits.map(trait => ({
      ...trait,
      selected: selectedConfig?.traitId === trait.id,
      disabled: selectedTarget?.alchemyKind && selectedTarget.alchemyKind !== kind
    }))
  }));
  const selectedTrait = traitGroups.flatMap(group => group.traits).find(trait => trait.selected) ?? null;

  const ledgerRows = [
    { key: 'Action', value: selectedRite.action, tone: 'time' },
    { key: 'Force Point Cost', value: selectedRite.fpLabel, tone: selectedRite.fpCost ? 'fp' : 'free' },
    { key: 'Dark Side Impact', value: selectedRite.dspLabel, tone: selectedRite.dspCost ? 'dsp' : 'free' },
    { key: 'Credit / Material Cost', value: selectedRite.creditCost > 0 ? `${selectedRite.creditCost.toLocaleString()} cr` : 'none', tone: selectedRite.creditCost ? 'credits' : 'free' }
  ];

  return {
    rite: selectedRite,
    targets,
    selectedTarget,
    selectedDefense,
    selectedPower,
    selectedTemplate,
    selectedTrait,
    defenses: FORCE_ALCHEMY_DEFENSES.map(defense => ({ ...defense, selected: defense.id === selectedConfig?.defense })),
    forcePowers: context.forcePowers.map(power => ({ ...power, selected: power.id === selectedConfig?.powerId })),
    templates: FORCE_ALCHEMY_TEMPLATES.map(template => ({ ...template, selected: template.id === selectedConfig?.templateId })),
    traitGroups,
    selectedConfig: foundry.utils.deepClone(selectedConfig || {}),
    ledgerRows,
    showDefenseConfig: selectedRite.configType === 'defense',
    showForcePowerConfig: selectedRite.configType === 'force-power',
    showTemplateConfig: selectedRite.configType === 'template',
    showTraitConfig: selectedRite.configType === 'trait',
    showArmorTierConfig: selectedRite.configType === 'armor-tier',
    ready: selectedRite.eligible && hasRequiredSelections(selectedRite, { selectedTarget, selectedDefense, selectedPower, selectedTemplate, selectedTrait }),
    previewLines: buildPreviewLines(selectedRite, { selectedTarget, selectedDefense, selectedPower, selectedTemplate, selectedTrait })
  };
}

function hasRequiredSelections(rite, selections) {
  if (!selections.selectedTarget) return false;
  if (rite.configType === 'defense' && !selections.selectedDefense) return false;
  if (rite.configType === 'force-power' && !selections.selectedPower) return false;
  if (rite.configType === 'template' && !selections.selectedTemplate) return false;
  if (rite.configType === 'trait' && !selections.selectedTrait) return false;
  return true;
}

function buildPreviewLines(rite, selections) {
  const lines = [];
  if (selections.selectedTarget) lines.push(`Target: ${selections.selectedTarget.name}`);
  if (selections.selectedDefense) lines.push(`Defense: ${selections.selectedDefense.label}`);
  if (selections.selectedPower) lines.push(`Focused power: ${selections.selectedPower.name}`);
  if (selections.selectedTemplate) lines.push(`Template: ${selections.selectedTemplate.name}`);
  if (selections.selectedTrait) lines.push(`Trait: ${selections.selectedTrait.name}`);
  lines.push(`Result: ${rite.resultLabel}`);
  lines.push(`State key: flags.${FORCE_ALCHEMY_FLAG_SCOPE}.${FORCE_ALCHEMY_FLAG_KEY}.${rite.stateKey}`);
  return lines;
}

function buildSlots(context) {
  const state = context.state;
  return [
    {
      key: 'force',
      stateKey: 'activeForceTalisman',
      glyph: '&loz;',
      label: state.activeForceTalisman?.name || 'No Force Talisman',
      meta: state.activeForceTalisman ? [state.activeForceTalisman.targetName, state.activeForceTalisman.configLabel, state.activeForceTalisman.pendingCosts ? 'costs pending' : 'active'].filter(Boolean).join(' · ') : 'inactive',
      active: !!state.activeForceTalisman,
      tone: 'holo'
    },
    {
      key: 'focused',
      stateKey: 'focusedForceTalisman',
      glyph: '&#10038;',
      label: state.focusedForceTalisman?.name || 'No Focused Talisman',
      meta: state.focusedForceTalisman ? [state.focusedForceTalisman.configLabel || 'focused power recorded', state.focusedForceTalisman.pendingCosts ? 'costs pending' : 'active'].filter(Boolean).join(' · ') : 'inactive',
      active: !!state.focusedForceTalisman,
      tone: 'violet'
    },
    {
      key: 'darkside',
      stateKey: 'activeDarkSideTalisman',
      glyph: '&#9790;',
      label: state.activeDarkSideTalisman?.name || 'No Dark Side Talisman',
      meta: state.activeDarkSideTalisman ? [state.activeDarkSideTalisman.targetName, state.activeDarkSideTalisman.configLabel || 'anti-light ward', state.activeDarkSideTalisman.pendingCosts ? 'costs pending' : 'active'].filter(Boolean).join(' · ') : 'inactive',
      active: !!state.activeDarkSideTalisman,
      tone: 'violet'
    },
    {
      key: 'sith',
      stateKey: 'activeSithTalisman',
      glyph: '&#9650;',
      label: state.activeSithTalisman?.name || 'No Sith Talisman',
      meta: state.activeSithTalisman ? [state.activeSithTalisman.targetName, '+1d6 Force Power damage', state.activeSithTalisman.pendingCosts ? 'costs pending' : 'active'].filter(Boolean).join(' · ') : 'inactive',
      active: !!state.activeSithTalisman,
      tone: 'crimson'
    },
    {
      key: 'rapid',
      stateKey: 'rapidAlchemy',
      glyph: '&#9889;',
      label: state.rapidAlchemy?.name || 'Rapid Alchemy idle',
      meta: state.rapidAlchemy ? [state.rapidAlchemy.targetName, state.rapidAlchemy.config?.damageSurgeReady ? '+5 damage surge ready' : '+2 attack encounter bonus'].filter(Boolean).join(' · ') : 'no encounter buff',
      active: !!state.rapidAlchemy,
      canConsumeSurge: !!state.rapidAlchemy && state.rapidAlchemy.config?.surgeConsumed !== true,
      tone: 'gold'
    }
  ];
}


export function getForceAlchemyTargetKinds(item) {
  const targetTypes = [];
  if (isPortable(item)) targetTypes.push('portable');
  if (isMeleeWeapon(item)) targetTypes.push('melee-weapon');
  if (isBattleArmor(item)) targetTypes.push('battle-armor');
  if (isAlchemicalObject(item)) targetTypes.push('alchemical-object');
  return targetTypes;
}

export function getForceAlchemySuggestedRiteForItem(actor, item) {
  if (!actor || !item) return null;
  const items = getItems(actor);
  const talents = collectTalents(items);
  const can = (talentName) => hasTalent(talents, talentName);
  const targetTypes = getForceAlchemyTargetKinds(item);
  if (!targetTypes.length) return null;

  if (targetTypes.includes('alchemical-object') && can('Sith Alchemy Specialist')) {
    return { riteId: 'sith-alchemy-specialist', category: 'specialist', targetTypes };
  }
  if (targetTypes.includes('battle-armor') && can('Sith Alchemy')) {
    return { riteId: 'sith-armor', category: 'sith', targetTypes };
  }
  if (targetTypes.includes('melee-weapon')) {
    if (can('Sith Alchemy')) return { riteId: 'sith-weapon', category: 'sith', targetTypes };
    if (can('Rapid Alchemy')) return { riteId: 'rapid-alchemy', category: 'combat', targetTypes };
  }
  if (targetTypes.includes('portable')) {
    const firstTalentLaunch = talents.map(talent => talent.alchemyLaunch).find(Boolean);
    if (firstTalentLaunch) return { riteId: firstTalentLaunch.riteId, category: firstTalentLaunch.category, targetTypes };
  }
  return { riteId: 'force-talisman', category: 'force', targetTypes };
}

export class ForceAlchemyContextResolver {
  static resolve(actor, options = {}) {
    const items = getItems(actor);
    const actorSummary = getActorSummary(actor);
    const context = {
      actor: actorSummary,
      items,
      talents: collectTalents(items),
      forcePowers: collectForcePowers(items),
      targets: [],
      state: readForceAlchemyState(actor)
    };
    context.targets = collectTargets(actor, items, actorSummary);

    const activeCategory = options.activeCategory || 'force';
    const selectedRiteId = options.selectedRiteId || FORCE_ALCHEMY_RITES.find(rite => rite.category === activeCategory)?.id || FORCE_ALCHEMY_RITES[0]?.id;
    const selectedConfig = options.selectedConfig || {};
    const rites = buildRites(context, activeCategory, selectedRiteId);

    return {
      ...context,
      activeCategory,
      selectedRiteId,
      selectedTargetId: options.selectedTargetId ?? null,
      selectedConfig,
      categories: options.categories ?? [],
      rites,
      visibleRites: rites.filter(rite => rite.category === activeCategory),
      detail: buildDetail({ rites, selectedRiteId, selectedTargetId: options.selectedTargetId, selectedConfig, context }),
      slots: buildSlots(context),
      cooldowns: context.state.cooldowns,
      projects: context.state.projects,
      debug: {
        talentNames: context.talents.map(talent => talent.name),
        targetCount: context.targets.length,
        forcePowerCount: context.forcePowers.length
      }
    };
  }
}

export function resolveForceAlchemyActor(actorRef) {
  if (actorRef?.documentName === 'Actor' || actorRef?.items) return actorRef;
  if (typeof actorRef === 'string') {
    if (actorRef.includes('.')) {
      try { return globalThis.fromUuidSync?.(actorRef) ?? null; }
      catch (_error) { return null; }
    }
    return game.actors?.get?.(actorRef) ?? null;
  }
  const tokenActor = canvas?.tokens?.controlled?.[0]?.actor ?? null;
  return tokenActor ?? game.user?.character ?? null;
}
