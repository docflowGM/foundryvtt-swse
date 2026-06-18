// scripts/apps/force-alchemy/force-alchemy-mechanics-service.js
// Mechanical application for Force Artifact / Sith Alchemy rites.

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import {
  FORCE_ALCHEMY_FLAG_SCOPE,
  FORCE_ALCHEMY_FLAG_KEY,
  FORCE_ALCHEMY_TEMPLATES,
  FORCE_ALCHEMY_SPECIALIST_TRAITS,
  getForceAlchemyRite,
  normalizeForceAlchemyKey
} from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-data.js";
import { ForceAlchemyStateService, readForceAlchemyState } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-state-service.js";
import { activeEffectChangeType } from "/systems/foundryvtt-swse/scripts/utils/active-effect-change-utils.js";

const EFFECT_SCOPE = 'foundryvtt-swse';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function nowIso() {
  return new Date().toISOString();
}

function numberFrom(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function normalizeToken(value) {
  return normalizeForceAlchemyKey(value);
}

function traitDefinition(traitId) {
  const wanted = normalizeToken(traitId);
  for (const [kind, traits] of Object.entries(FORCE_ALCHEMY_SPECIALIST_TRAITS)) {
    const trait = asArray(traits).find(entry => normalizeToken(entry?.id) === wanted);
    if (trait) return { ...trait, kind };
  }
  return null;
}

function normalizeTraitIds(traits) {
  return asArray(traits).map(trait => normalizeToken(typeof trait === 'string' ? trait : trait?.id ?? trait?.key ?? trait?.name)).filter(Boolean);
}

function actorForcePoints(actor) {
  return numberFrom(actor?.system?.forcePoints?.value, actor?.system?.resources?.forcePoints?.value);
}

function actorCredits(actor) {
  return numberFrom(
    actor?.system?.credits?.available,
    actor?.system?.credits?.value,
    actor?.system?.credits,
    actor?.system?.currency?.credits,
    actor?.system?.wealth?.credits,
    actor?.system?.resources?.credits?.value
  );
}

function creditUpdatePath(actor) {
  const system = actor?.system ?? {};
  if (system.credits && typeof system.credits === 'object') {
    if (Object.hasOwn(system.credits, 'available')) return 'system.credits.available';
    if (Object.hasOwn(system.credits, 'value')) return 'system.credits.value';
  }
  if (system.currency && typeof system.currency === 'object' && Object.hasOwn(system.currency, 'credits')) return 'system.currency.credits';
  if (system.wealth && typeof system.wealth === 'object' && Object.hasOwn(system.wealth, 'credits')) return 'system.wealth.credits';
  if (system.resources?.credits && typeof system.resources.credits === 'object' && Object.hasOwn(system.resources.credits, 'value')) return 'system.resources.credits.value';
  return 'system.credits';
}

function isMechanicalRite(rite) {
  return rite?.timing === 'instant' || rite?.timing === 'encounter';
}

function isProjectRite(rite) {
  return rite?.timing === 'downtime' || rite?.stateKey === 'projects';
}

function stateKeyForDetail(detail) {
  return detail?.rite?.stateKey ?? null;
}

function forceAlchemyEffects(actor, predicate = () => true) {
  return Array.from(actor?.effects ?? []).filter(effect => {
    const data = effect?.flags?.[EFFECT_SCOPE]?.forceAlchemyEffect ?? effect?.flags?.swse?.forceAlchemyEffect;
    return data && predicate(data, effect);
  });
}

async function deleteForceAlchemyEffects(actor, predicate = () => true) {
  const ids = forceAlchemyEffects(actor, predicate).map(effect => effect.id).filter(Boolean);
  if (!ids.length) return [];
  await ActorEngine.deleteActiveEffects(actor, ids, { source: 'force-alchemy:delete-effects' });
  return ids;
}

async function deleteEntryEffects(actor, entryOrStateKey) {
  const entry = typeof entryOrStateKey === 'string' ? null : entryOrStateKey;
  const stateKey = typeof entryOrStateKey === 'string' ? entryOrStateKey : entry?.stateKey;
  const effectIds = asArray(entry?.effectIds);
  const existingIds = new Set(Array.from(actor?.effects ?? []).map(effect => effect.id).filter(Boolean));
  const ids = new Set(effectIds.filter(id => existingIds.has(id)));
  const matched = forceAlchemyEffects(actor, data => {
    if (stateKey && data.stateKey === stateKey) return true;
    if (entry?.id && data.entryId === entry.id) return true;
    return false;
  });
  for (const effect of matched) if (effect?.id) ids.add(effect.id);
  const list = [...ids].filter(Boolean);
  if (!list.length) return [];
  await ActorEngine.deleteActiveEffects(actor, list, { source: 'force-alchemy:clear-effects' });
  return list;
}

function defenseTarget(defenseId) {
  if (defenseId === 'fortitude') return 'fortitude';
  if (defenseId === 'will') return 'will';
  return 'reflex';
}

function defenseLabel(defenseId) {
  if (defenseId === 'fortitude') return 'Fortitude Defense';
  if (defenseId === 'will') return 'Will Defense';
  return 'Reflex Defense';
}

function effectState({ summary, sourceName, details = [], severity = 'info', tags = [], durationLabel = null, removable = true }) {
  return {
    family: 'forceAlchemy',
    effectType: 'forceAlchemy',
    severity,
    sourceType: 'forceAlchemy',
    sourceName,
    summary,
    details,
    icon: null,
    tags: ['force-alchemy', ...tags],
    durationLabel,
    removable,
    removableBy: 'owner'
  };
}

function effectIntent({ category, target = 'all', amount, bonusType = 'untyped', duration = 'until-deactivated', note = '' }) {
  return {
    application: 'always',
    scope: 'self',
    operation: 'increase',
    category,
    target,
    amount,
    bonusType,
    duration,
    transfer: true,
    filterType: 'all',
    filterValue: '',
    note
  };
}

function baseEffect({ detail, stateKey, entryId = null, suffix = '', summary, details = [], changes = [], intent = null, severity = 'info', durationLabel = null, tags = [] }) {
  const rite = detail?.rite ?? {};
  const target = detail?.selectedTarget ?? {};
  const name = suffix ? `${rite.name}: ${suffix}` : rite.name;
  const flags = {
    [EFFECT_SCOPE]: {
      forceAlchemyEffect: {
        stateKey,
        entryId,
        riteId: rite.id,
        riteName: rite.name,
        targetId: target.id ?? null,
        targetUuid: target.uuid ?? null,
        targetName: target.name ?? null,
        createdAt: nowIso()
      },
      effectState: effectState({
        summary,
        sourceName: rite.name,
        details,
        severity,
        tags,
        durationLabel
      })
    }
  };
  if (intent) flags[EFFECT_SCOPE].effectIntent = intent;
  return {
    name,
    label: name,
    icon: target.icon || 'icons/magic/unholy/orb-swirling-pink.webp',
    disabled: false,
    origin: target.uuid ?? null,
    changes,
    duration: {},
    flags
  };
}

function effectsForDetail(detail, { stateKey, entryId = null, resourceChanges = null } = {}) {
  const rite = detail?.rite;
  if (!rite) return [];
  const targetName = detail?.selectedTarget?.name ?? 'selected target';
  const defense = defenseTarget(detail?.selectedDefense?.id ?? detail?.selectedConfig?.defense);
  const effects = [];

  if (rite.id === 'force-talisman') {
    effects.push(baseEffect({
      detail,
      stateKey,
      entryId,
      suffix: defenseLabel(defense),
      summary: `${rite.name}: +1 Force bonus to ${defenseLabel(defense)}.`,
      details: [`Target: ${targetName}`, `Selected defense: ${defenseLabel(defense)}`],
      changes: [{ key: `system.defenses.${defense}.misc`, ...activeEffectChangeType('add'), value: '1', priority: 20 }],
      intent: effectIntent({ category: 'defense', target: defense, amount: 1, bonusType: 'untyped', note: 'Force bonus from Force Talisman.' }),
      tags: ['force-talisman', 'defense']
    }));
  }

  if (rite.id === 'greater-force-talisman') {
    const changes = ['reflex', 'fortitude', 'will'].map(key => ({ key: `system.defenses.${key}.misc`, ...activeEffectChangeType('add'), value: '1', priority: 20 }));
    effects.push(baseEffect({
      detail,
      stateKey,
      entryId,
      suffix: 'All Defenses',
      summary: `${rite.name}: +1 Force bonus to all defenses.`,
      details: [`Target: ${targetName}`, '+1 Reflex Defense', '+1 Fortitude Defense', '+1 Will Defense'],
      changes,
      tags: ['force-talisman', 'defense']
    }));
  }

  if (rite.id === 'focused-force-talisman' || rite.id === 'greater-focused-force-talisman') {
    const powerName = detail?.selectedPower?.name ?? 'selected Force Power';
    effects.push(baseEffect({
      detail,
      stateKey,
      entryId,
      suffix: powerName,
      summary: `${rite.name}: ${powerName} refresh state.`,
      details: [`Target: ${targetName}`, `Focused power: ${powerName}`, rite.id === 'greater-focused-force-talisman' ? 'Refresh Force Point does not count against the one-per-turn limit.' : 'Spend a Force Point after use to refresh expended uses of the selected power.'],
      severity: 'positive',
      tags: ['force-talisman', 'force-power']
    }));
  }

  if (rite.id === 'dark-side-talisman') {
    effects.push(baseEffect({
      detail,
      stateKey,
      entryId,
      suffix: defenseLabel(defense),
      summary: `${rite.name}: +2 Force bonus to ${defenseLabel(defense)} against Light Side Force Powers.`,
      details: [`Target: ${targetName}`, `Conditional ward: ${defenseLabel(defense)} vs Light Side Force Powers`, 'Conditional bonus is displayed here; apply only when the attack/power has the Light Side descriptor.'],
      severity: 'warning',
      tags: ['dark-side-talisman', 'conditional']
    }));
  }

  if (rite.id === 'greater-dark-side-talisman') {
    effects.push(baseEffect({
      detail,
      stateKey,
      entryId,
      suffix: 'Light Side Ward',
      summary: `${rite.name}: +2 Force bonus to all defenses against Light Side Force Powers.`,
      details: [`Target: ${targetName}`, 'Conditional ward: Reflex, Fortitude, and Will vs Light Side Force Powers', 'Conditional bonus is displayed here; apply only when the attack/power has the Light Side descriptor.'],
      severity: 'warning',
      tags: ['dark-side-talisman', 'conditional']
    }));
  }

  if (rite.id === 'sith-talisman') {
    effects.push(baseEffect({
      detail,
      stateKey,
      entryId,
      suffix: 'Force Damage',
      summary: `${rite.name}: +1d6 damage with Force Powers while carried.`,
      details: [`Target: ${targetName}`, '+1d6 damage with Force Powers', 'First wearing or carrying the talisman increases Dark Side Score by 1.'],
      severity: 'danger',
      tags: ['sith-talisman', 'force-damage']
    }));
  }

  if (rite.id === 'rapid-alchemy') {
    effects.push(baseEffect({
      detail,
      stateKey,
      entryId,
      suffix: 'Attack Bonus',
      summary: `${rite.name}: +2 Equipment bonus to attack rolls with ${targetName}.`,
      details: [`Weapon: ${targetName}`, '+2 Equipment bonus to attack rolls for the encounter', 'Use the Sacrifice button to trade this for the one-roll +5 damage surge.'],
      intent: effectIntent({ category: 'attack', target: 'all', amount: 2, bonusType: 'equipment', duration: 'encounter', note: `Rapid Alchemy target: ${targetName}` }),
      severity: 'positive',
      durationLabel: 'Encounter',
      tags: ['rapid-alchemy', 'attack']
    }));
  }

  if (rite.id === 'sith-weapon-surge') {
    const damageBonus = numberFrom(resourceChanges?.before?.darkSideScore, detail?.selectedConfig?.damageBonus);
    effects.push(baseEffect({
      detail,
      stateKey,
      entryId,
      suffix: 'Damage Surge Ready',
      summary: `${rite.name}: +${damageBonus} damage with ${targetName} on the next damage roll.`,
      details: [`Sith Weapon: ${targetName}`, `Damage bonus: +${damageBonus} from current Dark Side Score`, 'Apply to one damage roll before encounter end, then clear this effect manually.'],
      severity: 'danger',
      durationLabel: 'One damage roll',
      tags: ['sith-weapon', 'damage-surge']
    }));
  }

  return effects;
}

function damageSurgeEffect(entry) {
  return {
    name: 'Rapid Alchemy: Damage Surge Ready',
    label: 'Rapid Alchemy: Damage Surge Ready',
    icon: 'icons/magic/fire/flame-burning-fist-strike.webp',
    disabled: false,
    origin: entry?.targetUuid ?? null,
    changes: [],
    duration: {},
    flags: {
      [EFFECT_SCOPE]: {
        forceAlchemyEffect: {
          stateKey: 'rapidAlchemy',
          entryId: entry?.id ?? null,
          riteId: 'rapid-alchemy-surge',
          riteName: 'Rapid Alchemy Damage Surge',
          targetId: entry?.targetId ?? null,
          targetUuid: entry?.targetUuid ?? null,
          targetName: entry?.targetName ?? null,
          createdAt: nowIso(),
          manualDamageSurge: true
        },
        effectState: effectState({
          summary: `Rapid Alchemy: +5 Equipment damage surge ready for ${entry?.targetName ?? 'the selected weapon'}.`,
          sourceName: 'Rapid Alchemy',
          details: ['The +2 attack bonus has been consumed.', '+5 Equipment bonus applies to one damage roll with the selected weapon before encounter end.', 'Manual removal after the damage roll is resolved.'],
          severity: 'warning',
          tags: ['rapid-alchemy', 'damage-surge'],
          durationLabel: 'One damage roll'
        })
      }
    }
  };
}

async function createEffects(actor, effects) {
  if (!effects.length) return [];
  const created = await ActorEngine.createActiveEffects(actor, effects, { source: 'force-alchemy:create-effects' });
  return Array.from(created ?? []).map(effect => effect.id).filter(Boolean);
}

function validateCosts(actor, detail) {
  const rite = detail?.rite;
  if (!rite) throw new Error('No rite selected.');
  if (!detail?.ready) throw new Error('Choose a legal target and required configuration first.');
  const fpCost = Number(rite.fpCost ?? 0) || 0;
  const creditCost = Number(rite.creditCost ?? 0) || 0;
  if (fpCost > 0 && actorForcePoints(actor) < fpCost) {
    throw new Error(`${actor?.name ?? 'Actor'} does not have enough Force Points for ${rite.name}.`);
  }
  if (creditCost > 0 && actorCredits(actor) < creditCost) {
    throw new Error(`${actor?.name ?? 'Actor'} does not have enough credits/materials for ${rite.name}.`);
  }
}

async function applyResourceCosts(actor, detail) {
  const rite = detail?.rite ?? {};
  const fpCost = Number(rite.fpCost ?? 0) || 0;
  const dspCost = Number(rite.dspCost ?? 0) || 0;
  const creditCost = Number(rite.creditCost ?? 0) || 0;
  const before = {
    forcePoints: actorForcePoints(actor),
    darkSideScore: numberFrom(DSPEngine.getValue(actor), actor?.system?.darkSide?.value, actor?.system?.darkSideScore),
    credits: actorCredits(actor)
  };
  const updates = {};
  if (fpCost > 0) updates['system.forcePoints.value'] = Math.max(0, before.forcePoints - fpCost);
  if (dspCost > 0) {
    updates['system.darkSide.value'] = before.darkSideScore + dspCost;
    updates['system.darkSideScore'] = before.darkSideScore + dspCost;
  }
  if (creditCost > 0) {
    updates[creditUpdatePath(actor)] = Math.max(0, before.credits - creditCost);
  }
  if (Object.keys(updates).length) {
    await ActorEngine.updateActor(actor, updates, { source: 'force-alchemy:resource-costs' });
  }
  const after = {
    forcePoints: fpCost > 0 ? Math.max(0, before.forcePoints - fpCost) : before.forcePoints,
    darkSideScore: dspCost > 0 ? before.darkSideScore + dspCost : before.darkSideScore,
    credits: creditCost > 0 ? Math.max(0, before.credits - creditCost) : before.credits
  };
  return { before, after, spent: { forcePoints: fpCost, darkSideScore: dspCost, credits: creditCost } };
}

async function revertResourceCosts(actor, resourceChanges) {
  if (!actor || !resourceChanges?.before) return;
  const before = resourceChanges.before;
  const updates = {};
  if (Object.hasOwn(before, 'forcePoints')) updates['system.forcePoints.value'] = before.forcePoints;
  if (Object.hasOwn(before, 'darkSideScore')) {
    updates['system.darkSide.value'] = before.darkSideScore;
    updates['system.darkSideScore'] = before.darkSideScore;
  }
  if (Object.hasOwn(before, 'credits')) updates[creditUpdatePath(actor)] = before.credits;
  if (Object.keys(updates).length) {
    await ActorEngine.updateActor(actor, updates, { source: 'force-alchemy:resource-cost-rollback' });
  }
}

async function withResourceCostRollback(actor, detail, operation) {
  const resourceChanges = await applyResourceCosts(actor, detail);
  try {
    return await operation(resourceChanges);
  } catch (error) {
    await revertResourceCosts(actor, resourceChanges).catch((rollbackError) => {
      console.error('[ForceAlchemy] Resource rollback failed after ritual error', rollbackError);
    });
    throw error;
  }
}

function getOwnedItem(actor, itemId) {
  if (!itemId || itemId === '__materials__') return null;
  return actor?.items?.get?.(itemId) ?? Array.from(actor?.items ?? []).find(item => (item?.id ?? item?._id) === itemId) ?? null;
}


function actorIdFromMutationTargetId(targetId) {
  const value = String(targetId ?? '');
  return value.startsWith('actor:') ? value.slice(6) : value;
}

async function resolveActorByUuidOrId(uuid, id) {
  if (uuid) {
    try {
      const doc = await fromUuid(uuid);
      if (doc?.documentName === 'Actor' || doc?.items) return doc;
      if (doc?.documentName === 'Token' || doc?.actor) return doc.actor;
    } catch (error) {
      console.warn('[ForceAlchemy] Failed to resolve mutation target actor UUID', uuid, error);
    }
  }
  const actorId = actorIdFromMutationTargetId(id);
  return game?.actors?.get?.(actorId) ?? null;
}

function resolveActorByUuidOrIdSync(uuid, id) {
  if (uuid && globalThis.fromUuidSync) {
    try {
      const doc = fromUuidSync(uuid);
      if (doc?.documentName === 'Actor' || doc?.items) return doc;
      if (doc?.documentName === 'Token' || doc?.actor) return doc.actor;
    } catch (_error) {
      // Fall through to id lookup.
    }
  }
  const actorId = actorIdFromMutationTargetId(id);
  return game?.actors?.get?.(actorId) ?? null;
}

function mutationTemplateDefinition(templateId) {
  const wanted = normalizeToken(templateId);
  return FORCE_ALCHEMY_TEMPLATES.find(template => normalizeToken(template.id) === wanted) ?? null;
}

function mutationKindForTemplate(templateId) {
  const key = normalizeToken(templateId);
  if (key.includes('chrysalis')) return 'chrysalis-beast';
  return 'sith-abomination';
}

function getActorAlchemyFlags(actor) {
  return actor?.flags?.[EFFECT_SCOPE]?.alchemy ?? actor?.flags?.swse?.alchemy ?? {};
}

function validateMutationProject(project) {
  const config = project?.config ?? {};
  const template = mutationTemplateDefinition(config.templateId);
  if (!template) throw new Error('Choose a Sith Abomination or Chrysalis Beast template before completing Cause Mutation.');
  if (config.gmConfirmed !== true) throw new Error('Cause Mutation requires explicit GM approval before completion.');
  return template;
}

function buildMutationFlagData(creatorActor, targetActor, project, template, resourceChanges) {
  const existing = getActorAlchemyFlags(targetActor);
  const kind = mutationKindForTemplate(template.id);
  return {
    ...existing,
    kind,
    alchemyKind: kind,
    sourceRiteId: 'cause-mutation',
    mutationStatus: 'gm-adjudication-recorded',
    targetProjectId: project?.id ?? null,
    templateId: template.id,
    templateName: template.name,
    creatorActorId: creatorActor?.id ?? null,
    creatorActorUuid: creatorActor?.uuid ?? null,
    creatorName: creatorActor?.name ?? null,
    domesticatedToCreator: true,
    domesticatedToActorId: creatorActor?.id ?? null,
    domesticatedToActorUuid: creatorActor?.uuid ?? null,
    createdAt: existing.createdAt ?? nowIso(),
    completedAt: nowIso(),
    traits: asArray(existing.traits),
    properties: {
      ...(existing.properties && typeof existing.properties === 'object' ? existing.properties : {}),
      alchemicalCreature: true,
      sithAbomination: kind === 'sith-abomination',
      chrysalisBeast: kind === 'chrysalis-beast',
      eligibleForSithAlchemySpecialist: kind === 'sith-abomination',
      requiresManualTemplateApplication: true
    },
    notes: {
      ...(existing.notes && typeof existing.notes === 'object' ? existing.notes : {}),
      causeMutation: 'Template stat changes are GM-adjudicated. This flag records that the mutation ritual completed.'
    },
    resourceChanges
  };
}

function mutationReminderEffect(project, template, targetActor, creatorActor) {
  const kind = mutationKindForTemplate(template.id);
  return {
    name: `Cause Mutation: ${template.name}`,
    label: `Cause Mutation: ${template.name}`,
    icon: targetActor?.img || 'icons/magic/unholy/orb-swirling-pink.webp',
    disabled: false,
    origin: targetActor?.uuid ?? null,
    changes: [],
    duration: {},
    flags: {
      [EFFECT_SCOPE]: {
        forceAlchemyEffect: {
          stateKey: 'projects',
          entryId: project?.id ?? null,
          riteId: 'cause-mutation',
          riteName: 'Cause Mutation',
          targetId: targetActor?.id ?? null,
          targetUuid: targetActor?.uuid ?? null,
          targetName: targetActor?.name ?? null,
          createdAt: nowIso()
        },
        effectState: effectState({
          summary: `${template.name} mutation recorded; template statistics require GM adjudication.`,
          sourceName: 'Cause Mutation',
          details: [
            `Creator: ${creatorActor?.name ?? 'Unknown creator'}`,
            `Mutation kind: ${kind.replace(/-/g, ' ')}`,
            'The target is domesticated to the creator unless already domesticated.',
            'No stat block rewrite was applied automatically.'
          ],
          severity: 'warning',
          tags: ['force-alchemy', 'cause-mutation', kind],
          durationLabel: 'Permanent / GM adjudicated',
          removable: true
        })
      }
    }
  };
}

async function applyMutationFlagsToActor(creatorActor, targetActor, project, resourceChanges) {
  const template = validateMutationProject(project);
  const alchemyFlags = buildMutationFlagData(creatorActor, targetActor, project, template, resourceChanges);
  const updates = {
    [`flags.${EFFECT_SCOPE}.alchemy`]: alchemyFlags,
    'flags.swse.alchemy': alchemyFlags,
    [`flags.${EFFECT_SCOPE}.forceAlchemyMutation`]: {
      projectId: project?.id ?? null,
      templateId: template.id,
      templateName: template.name,
      creatorActorId: creatorActor?.id ?? null,
      creatorName: creatorActor?.name ?? null,
      completedAt: nowIso(),
      requiresManualTemplateApplication: true
    },
    'flags.swse.forceAlchemyMutation': {
      projectId: project?.id ?? null,
      templateId: template.id,
      templateName: template.name,
      creatorActorId: creatorActor?.id ?? null,
      creatorName: creatorActor?.name ?? null,
      completedAt: nowIso(),
      requiresManualTemplateApplication: true
    }
  };
  await ActorEngine.updateActor(targetActor, updates, { source: 'force-alchemy:cause-mutation-complete' });
  const effectIds = await createEffects(targetActor, [mutationReminderEffect(project, template, targetActor, creatorActor)]);
  return { alchemyFlags, template, effectIds };
}

function getItemAlchemyFlags(item) {
  return item?.flags?.[EFFECT_SCOPE]?.alchemy ?? item?.flags?.swse?.alchemy ?? {};
}

function itemAlchemyKind(item) {
  const flags = getItemAlchemyFlags(item);
  const flagged = normalizeToken(flags.kind || flags.alchemyKind || flags.targetKind);
  if (flagged.includes('darkarmor') || flagged.includes('sitharmor')) return 'dark-armor';
  if (flagged.includes('sithweapon')) return 'sith-weapon';
  if (flagged.includes('abomination')) return 'sith-abomination';
  if (flagged.includes('sithamulet')) return 'sith-amulet';
  if (flagged) return flagged;
  const text = [
    item?.name,
    item?.type,
    item?.system?.type,
    item?.system?.subtype,
    item?.system?.category,
    item?.system?.armorType,
    item?.system?.weaponType,
    item?.system?.description?.value,
    item?.system?.description
  ].filter(Boolean).join(' ').toLowerCase();
  if (/dark armor|sith armor/.test(text)) return 'dark-armor';
  if (/sith weapon|alchemical weapon/.test(text)) return 'sith-weapon';
  if (/abomination/.test(text)) return 'sith-abomination';
  if (/sith amulet/.test(text)) return 'sith-amulet';
  return null;
}

function existingSpecialistTraits(item) {
  return normalizeTraitIds(getItemAlchemyFlags(item)?.traits);
}

function validateSpecialistTraitTarget(actor, item, traitId, { ignorePendingProjectId = null } = {}) {
  if (!item) throw new Error('Sith Alchemy Specialist requires an alchemical item or creature target.');
  const trait = traitDefinition(traitId);
  if (!trait) throw new Error('Choose a Sith Alchemy Specialist trait before completing the working.');
  const targetKind = itemAlchemyKind(item);
  if (targetKind !== trait.kind) {
    throw new Error(`${trait.name} requires a ${trait.kind.replace(/-/g, ' ')} target; ${item.name} is ${targetKind || 'not a recognized alchemical target'}.`);
  }
  const existing = existingSpecialistTraits(item);
  if (existing.includes(normalizeToken(trait.id))) {
    throw new Error(`${item.name} already has the ${trait.name} Sith Alchemy Specialist trait.`);
  }
  const state = readForceAlchemyState(actor);
  const pending = asArray(state.projects).find(project => project?.riteId === 'sith-alchemy-specialist' && project?.status !== 'complete' && project?.id !== ignorePendingProjectId);
  if (pending) {
    throw new Error(`Sith Alchemy Specialist already has a modification in progress for ${pending.targetName}. Complete or cancel it before starting another.`);
  }
  return { trait, targetKind, existing };
}

function getItemDescriptionValue(item) {
  const description = item?.system?.description;
  if (description && typeof description === 'object') return String(description.value ?? '');
  if (typeof description === 'string') return description;
  return '';
}

function buildSithWeaponDescription(item, project) {
  const current = getItemDescriptionValue(item);
  if (/Sith Weapon \(Alchemy\)/i.test(current)) return current;
  const note = `<hr><p><strong>Sith Weapon (Alchemy):</strong> This weapon has been treated through Sith Alchemy. Lightsabers do not ignore its DR. A proficient wielder may treat it as a lightsaber for Block, Deflect, Redirect Shot, and related talents. As a swift action, the wielder may spend 1 Force Point to add their current Dark Side Score to the next damage roll with this weapon before the end of the encounter, then increase Dark Side Score by 1.</p>`;
  return `${current || ''}${note}`;
}

function itemDescriptionUpdatePath(item) {
  const description = item?.system?.description;
  if (description && typeof description === 'object') return 'system.description.value';
  if (typeof description === 'string') return 'system.description';
  return 'system.description.value';
}

function buildSithWeaponFlagData(actor, item, project, resourceChanges) {
  const existing = getItemAlchemyFlags(item);
  return {
    ...existing,
    kind: 'sith-weapon',
    alchemyKind: 'sith-weapon',
    sourceRiteId: 'sith-weapon',
    creatorActorId: actor?.id ?? null,
    creatorActorUuid: actor?.uuid ?? null,
    creatorName: actor?.name ?? null,
    targetProjectId: project?.id ?? null,
    createdAt: nowIso(),
    completedAt: nowIso(),
    traits: asArray(existing.traits),
    properties: {
      ...(existing.properties && typeof existing.properties === 'object' ? existing.properties : {}),
      lightsabersDoNotIgnoreDR: true,
      treatsAsLightsaberForTalents: true,
      swiftDamageSurge: true
    },
    resourceChanges
  };
}

async function markItemAsSithWeapon(actor, item, project, resourceChanges) {
  if (!item?.id) throw new Error('Sith Weapon project target item could not be resolved.');
  const alchemyFlags = buildSithWeaponFlagData(actor, item, project, resourceChanges);
  const update = {
    _id: item.id,
    [`flags.${EFFECT_SCOPE}.alchemy`]: alchemyFlags,
    'flags.swse.alchemy': alchemyFlags,
    [itemDescriptionUpdatePath(item)]: buildSithWeaponDescription(item, project)
  };
  await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [update], { source: 'force-alchemy:sith-weapon-complete' });
  return alchemyFlags;
}

const INSTANT_ITEM_RITE_IDS = new Set([
  'force-talisman',
  'greater-force-talisman',
  'focused-force-talisman',
  'greater-focused-force-talisman',
  'dark-side-talisman',
  'greater-dark-side-talisman',
  'sith-talisman'
]);

function isInstantItemAlchemyRite(riteId) {
  return INSTANT_ITEM_RITE_IDS.has(String(riteId || ''));
}

function instantAlchemyKindForRite(riteId, existingKind = null) {
  if (riteId === 'dark-side-talisman' || riteId === 'greater-dark-side-talisman') return 'dark-side-talisman';
  if (riteId === 'sith-talisman') return 'sith-talisman';
  if (riteId === 'focused-force-talisman' || riteId === 'greater-focused-force-talisman') return normalizeToken(existingKind) || 'force-talisman';
  return 'force-talisman';
}

function buildInstantAlchemyDescription(item, detail) {
  const current = getItemDescriptionValue(item);
  const rite = detail?.rite ?? {};
  const marker = `Force Alchemy Workbench: ${rite.name}`;
  if (current.includes(marker)) return current;
  const targetBits = [];
  const defense = detail?.selectedDefense?.label ?? detail?.selectedConfig?.defenseLabel ?? null;
  const power = detail?.selectedPower?.name ?? detail?.selectedConfig?.powerName ?? null;
  if (defense) targetBits.push(`Selected defense: ${esc(defense)}.`);
  if (power) targetBits.push(`Focused Force Power: ${esc(power)}.`);
  if (rite.id === 'sith-talisman') targetBits.push('While carried, this talisman adds +1d6 damage with Force Powers.');
  if (rite.id === 'dark-side-talisman' || rite.id === 'greater-dark-side-talisman') targetBits.push('Its protection applies against Force Powers with the Light Side descriptor.');
  if (rite.id === 'greater-force-talisman' || rite.id === 'greater-dark-side-talisman') targetBits.push('This greater working applies to all defenses listed by the rite.');
  const note = `<hr><p><strong>${esc(marker)}:</strong> ${esc(rite.resultLabel ?? 'This item is carrying an alchemical working.')} ${targetBits.join(' ')}</p>`;
  return `${current || ''}${note}`;
}

function buildInstantAlchemyFlagData(actor, item, detail, resourceChanges) {
  const rite = detail?.rite ?? {};
  const existing = getItemAlchemyFlags(item);
  const existingKind = existing.kind || existing.alchemyKind || existing.targetKind;
  const kind = instantAlchemyKindForRite(rite.id, existingKind);
  const config = detail?.selectedConfig && typeof detail.selectedConfig === 'object' ? foundry.utils.deepClone(detail.selectedConfig) : {};
  if (detail?.selectedDefense) {
    config.defense = detail.selectedDefense.id;
    config.defenseLabel = detail.selectedDefense.label;
  }
  if (detail?.selectedPower) {
    config.powerId = detail.selectedPower.id;
    config.powerUuid = detail.selectedPower.uuid ?? null;
    config.powerName = detail.selectedPower.name;
  }
  return {
    ...existing,
    kind,
    alchemyKind: kind,
    sourceRiteId: rite.id,
    sourceRiteName: rite.name,
    creatorActorId: actor?.id ?? existing.creatorActorId ?? null,
    creatorActorUuid: actor?.uuid ?? existing.creatorActorUuid ?? null,
    creatorName: actor?.name ?? existing.creatorName ?? null,
    createdAt: existing.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    activeStateKey: rite.stateKey ?? existing.activeStateKey ?? null,
    selectedDefense: config.defense ?? existing.selectedDefense ?? null,
    selectedDefenseLabel: config.defenseLabel ?? existing.selectedDefenseLabel ?? null,
    selectedForcePowerId: config.powerId ?? existing.selectedForcePowerId ?? null,
    selectedForcePowerUuid: config.powerUuid ?? existing.selectedForcePowerUuid ?? null,
    selectedForcePowerName: config.powerName ?? existing.selectedForcePowerName ?? null,
    traits: asArray(existing.traits),
    config: {
      ...(existing.config && typeof existing.config === 'object' ? existing.config : {}),
      ...config
    },
    properties: {
      ...(existing.properties && typeof existing.properties === 'object' ? existing.properties : {}),
      forceAlchemyTalisman: kind.includes('talisman'),
      greaterWorking: rite.id?.startsWith?.('greater-') === true,
      focusedWorking: rite.id === 'focused-force-talisman' || rite.id === 'greater-focused-force-talisman',
      darkSideWorking: rite.id === 'dark-side-talisman' || rite.id === 'greater-dark-side-talisman' || rite.id === 'sith-talisman'
    },
    resourceChanges
  };
}

async function markItemForInstantAlchemyRite(actor, detail, resourceChanges) {
  const riteId = detail?.rite?.id;
  if (!isInstantItemAlchemyRite(riteId)) return null;
  const item = getOwnedItem(actor, detail?.selectedTarget?.id);
  if (!item?.id) throw new Error(`${detail?.rite?.name ?? 'This rite'} requires an owned item target to mark as alchemical.`);
  const alchemyFlags = buildInstantAlchemyFlagData(actor, item, detail, resourceChanges);
  const update = {
    _id: item.id,
    [`flags.${EFFECT_SCOPE}.alchemy`]: alchemyFlags,
    'flags.swse.alchemy': alchemyFlags,
    [itemDescriptionUpdatePath(item)]: buildInstantAlchemyDescription(item, detail)
  };
  await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [update], { source: 'force-alchemy:instant-item-flags' });
  return { item, alchemyFlags };
}

const SITH_ARMOR_PROFILES = {
  light: {
    resultName: 'Light Dark Armor',
    armorType: 'light',
    reflexBonus: 4,
    fortitudeBonus: 3,
    maxDex: 3,
    armorCheckPenalty: -2,
    speedPenalty: 0,
    weight: 10,
    cost: 10000
  },
  standard: {
    resultName: 'Dark Armor',
    armorType: 'medium',
    reflexBonus: 7,
    fortitudeBonus: 4,
    maxDex: 2,
    armorCheckPenalty: -5,
    speedPenalty: 2,
    weight: 16,
    cost: 15000
  },
  heavy: {
    resultName: 'Heavy Dark Armor',
    armorType: 'heavy',
    reflexBonus: 8,
    fortitudeBonus: 5,
    maxDex: 1,
    armorCheckPenalty: -10,
    speedPenalty: 2,
    weight: 30,
    cost: 25000
  }
};

function classifySithArmorProfile(item, project = {}) {
  const text = [item?.name, item?.system?.armorType, item?.system?.category, item?.system?.subtype, project?.targetName, project?.targetKind, project?.config?.armorTier]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (text.includes('heavy')) return SITH_ARMOR_PROFILES.heavy;
  if (text.includes('light')) return SITH_ARMOR_PROFILES.light;
  return SITH_ARMOR_PROFILES.standard;
}

function buildSithArmorDescription(item, profile) {
  const current = getItemDescriptionValue(item);
  if (/Sith Armor \(Alchemy\)/i.test(current)) return current;
  const note = `<hr><p><strong>Sith Armor (Alchemy):</strong> This suit has been transformed into <strong>${esc(profile.resultName)}</strong> through Sith Alchemy. It counts as Dark Armor for Sith Alchemy Specialist traits and other alchemical workflows.</p>`;
  return `${current || ''}${note}`;
}

function buildSithArmorFlagData(actor, item, project, profile, resourceChanges) {
  const existing = getItemAlchemyFlags(item);
  return {
    ...existing,
    kind: 'dark-armor',
    alchemyKind: 'dark-armor',
    sourceRiteId: 'sith-armor',
    creatorActorId: actor?.id ?? null,
    creatorActorUuid: actor?.uuid ?? null,
    creatorName: actor?.name ?? null,
    targetProjectId: project?.id ?? null,
    createdAt: existing.createdAt ?? nowIso(),
    completedAt: nowIso(),
    originalName: existing.originalName ?? item?.name ?? null,
    resultName: profile.resultName,
    traits: asArray(existing.traits),
    properties: {
      ...(existing.properties && typeof existing.properties === 'object' ? existing.properties : {}),
      darkArmor: true,
      eligibleForSithAlchemySpecialist: true
    },
    resourceChanges
  };
}

async function markItemAsSithArmor(actor, item, project, resourceChanges) {
  if (!item?.id) throw new Error('Sith Armor project target item could not be resolved.');
  const profile = classifySithArmorProfile(item, project);
  const alchemyFlags = buildSithArmorFlagData(actor, item, project, profile, resourceChanges);
  const equipped = item?.system?.equipped ?? item?.system?.equippable?.equipped ?? false;
  const traits = Array.isArray(item?.system?.traits) ? item.system.traits : [];
  const update = {
    _id: item.id,
    name: profile.resultName,
    [`flags.${EFFECT_SCOPE}.alchemy`]: alchemyFlags,
    'flags.swse.alchemy': alchemyFlags,
    'flags.swse.sithArmor': true,
    'system.armorType': profile.armorType,
    'system.defenseBonus': profile.reflexBonus,
    'system.reflexBonus': profile.reflexBonus,
    'system.fortBonus': profile.fortitudeBonus,
    'system.fortitudeBonus': profile.fortitudeBonus,
    'system.maxDexBonus': profile.maxDex,
    'system.maxDex': profile.maxDex,
    'system.armorCheckPenalty': profile.armorCheckPenalty,
    'system.speedPenalty': profile.speedPenalty,
    'system.weight': profile.weight,
    'system.cost': profile.cost,
    'system.costNumeric': profile.cost,
    'system.category': 'armor',
    'system.equipped': equipped,
    'system.equippable.equipped': equipped,
    'system.equippable.slot': item?.system?.equippable?.slot ?? 'body',
    'system.defense.reflexBonus': profile.reflexBonus,
    'system.defense.fortBonus': profile.fortitudeBonus,
    'system.defense.willBonus': item?.system?.defense?.willBonus ?? 0,
    'system.limits.maxDex': profile.maxDex,
    'system.limits.checkPenalty': profile.armorCheckPenalty,
    'system.limits.speedAdjustment': profile.speedPenalty,
    'system.damageReduction.value': item?.system?.damageReduction?.value ?? 0,
    'system.damageReduction.type': item?.system?.damageReduction?.type ?? null,
    'system.traits': traits,
    'system.economics.weight': profile.weight,
    'system.economics.cost': profile.cost,
    [itemDescriptionUpdatePath(item)]: buildSithArmorDescription(item, profile)
  };
  await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [update], { source: 'force-alchemy:sith-armor-complete' });
  return { alchemyFlags, profile };
}

function buildSithAmuletItemData(actor, project, resourceChanges) {
  const alchemyFlags = {
    kind: 'sith-amulet',
    alchemyKind: 'sith-amulet',
    sourceRiteId: 'sith-amulet',
    creatorActorId: actor?.id ?? null,
    creatorActorUuid: actor?.uuid ?? null,
    creatorName: actor?.name ?? null,
    targetProjectId: project?.id ?? null,
    createdAt: nowIso(),
    completedAt: nowIso(),
    materialCost: Number(project?.creditCost ?? 25000) || 25000,
    traits: [],
    properties: { sithAmulet: true, eligibleForSithAlchemySpecialist: true },
    resourceChanges
  };
  return {
    name: 'Sith Amulet',
    type: 'equipment',
    img: 'icons/equipment/neck/amulet-round-red.webp',
    system: {
      description: '<p><strong>Sith Amulet (Alchemy):</strong> A powerful amulet forged through Sith Alchemy from rare gems and raw materials. It functions as a Sith Amulet and carries the imprint of its creator.</p>',
      source: 'Sith Alchemy Workbench',
      equipped: false,
      quantity: 1,
      weight: 0,
      cost: 25000,
      rarity: 'legendary',
      upgradeSlots: 0,
      installedUpgrades: []
    },
    flags: {
      [EFFECT_SCOPE]: { alchemy: alchemyFlags },
      swse: { alchemy: alchemyFlags }
    }
  };
}

async function createSithAmuletItem(actor, project, resourceChanges) {
  const itemData = buildSithAmuletItemData(actor, project, resourceChanges);
  const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', [itemData], { source: 'force-alchemy:sith-amulet-complete' });
  const item = Array.from(created ?? [])[0] ?? null;
  if (!item) throw new Error('Sith Amulet item creation failed.');
  return { item, alchemyFlags: itemData.flags[EFFECT_SCOPE].alchemy };
}

function specialistTraitDescription(item, trait) {
  const current = getItemDescriptionValue(item);
  const marker = `Sith Alchemy Specialist: ${trait.name}`;
  if (current.includes(marker)) return current;
  const note = `<hr><p><strong>${esc(marker)}:</strong> ${esc(trait.description ?? 'This target has been altered by Sith Alchemy Specialist.')}</p>`;
  return `${current || ''}${note}`;
}

function buildSpecialistAlchemyFlags(actor, item, project, trait, targetKind, resourceChanges) {
  const existing = getItemAlchemyFlags(item);
  const traits = existingSpecialistTraits(item);
  const traitId = normalizeToken(trait.id);
  const nextTraits = traits.includes(traitId) ? traits : [...traits, traitId];
  const existingDetails = existing.traitDetails && typeof existing.traitDetails === 'object' ? existing.traitDetails : {};
  return {
    ...existing,
    kind: targetKind,
    alchemyKind: targetKind,
    specialistModified: true,
    specialistModifiedAt: nowIso(),
    specialistSourceRiteId: 'sith-alchemy-specialist',
    specialistProjectId: project?.id ?? null,
    creatorActorId: existing.creatorActorId ?? actor?.id ?? null,
    creatorActorUuid: existing.creatorActorUuid ?? actor?.uuid ?? null,
    creatorName: existing.creatorName ?? actor?.name ?? null,
    traits: nextTraits,
    traitDetails: {
      ...existingDetails,
      [traitId]: {
        id: trait.id,
        name: trait.name,
        kind: trait.kind,
        description: trait.description ?? '',
        appliedAt: nowIso(),
        projectId: project?.id ?? null,
        source: 'sith-alchemy-specialist'
      }
    },
    properties: {
      ...(existing.properties && typeof existing.properties === 'object' ? existing.properties : {}),
      eligibleForSithAlchemySpecialist: true,
      [`specialist.${traitId}`]: true
    },
    resourceChanges
  };
}

async function applySpecialistTraitToItem(actor, item, project, resourceChanges) {
  const traitId = project?.config?.traitId;
  const { trait, targetKind } = validateSpecialistTraitTarget(actor, item, traitId, { ignorePendingProjectId: project?.id });
  const alchemyFlags = buildSpecialistAlchemyFlags(actor, item, project, trait, targetKind, resourceChanges);
  const update = {
    _id: item.id,
    [`flags.${EFFECT_SCOPE}.alchemy`]: alchemyFlags,
    'flags.swse.alchemy': alchemyFlags,
    [itemDescriptionUpdatePath(item)]: specialistTraitDescription(item, trait)
  };
  await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [update], { source: 'force-alchemy:sith-alchemy-specialist-complete' });
  return { alchemyFlags, trait, targetKind };
}

function detailFromProject(actor, project) {
  const rite = getForceAlchemyRite(project?.riteId);
  const item = getOwnedItem(actor, project?.targetId);
  const mutationActor = project?.riteId === 'cause-mutation' ? resolveActorByUuidOrIdSync(project?.targetUuid, project?.targetId) : null;
  const target = mutationActor ? {
    id: `actor:${mutationActor.id}`,
    actorId: mutationActor.id,
    uuid: mutationActor.uuid ?? null,
    name: mutationActor.name ?? project?.targetName ?? 'Mutation target',
    icon: mutationActor.img ?? null,
    kind: 'creature',
    alchemyKind: getActorAlchemyFlags(mutationActor)?.kind ?? null,
    challengeLevel: project?.config?.challengeLevel ?? project?.requiredUnits ?? 1,
    existingTraits: []
  } : item ? {
    id: item.id,
    uuid: item.uuid ?? null,
    name: item.name ?? project?.targetName ?? 'Alchemical project target',
    icon: item.img ?? null,
    kind: project?.targetKind ?? itemAlchemyKind(item) ?? 'alchemical-object',
    alchemyKind: itemAlchemyKind(item),
    existingTraits: existingSpecialistTraits(item)
  } : {
    id: project?.targetId ?? null,
    uuid: project?.targetUuid ?? null,
    name: project?.targetName ?? 'Alchemical project target',
    icon: null,
    kind: project?.targetKind ?? 'alchemical-object',
    alchemyKind: project?.config?.targetAlchemyKind ?? null,
    existingTraits: []
  };
  const trait = project?.riteId === 'sith-alchemy-specialist' ? traitDefinition(project?.config?.traitId) : null;
  const template = project?.riteId === 'cause-mutation' ? mutationTemplateDefinition(project?.config?.templateId) : null;
  return {
    rite,
    ready: true,
    selectedTarget: target,
    selectedConfig: project?.config ?? {},
    selectedTrait: trait,
    selectedTemplate: template,
    previewLines: [
      `Target: ${target.name}`,
      trait ? `Trait: ${trait.name}` : null,
      template ? `Template: ${template.name}` : null,
      project?.riteId === 'cause-mutation' ? 'GM approval was confirmed before project recording.' : null,
      project?.riteId === 'cause-mutation' ? 'Template statistics are not auto-rewritten; completion records target actor flags and a visible reminder effect.' : null,
      `Result: ${rite?.resultLabel ?? project?.resultLabel ?? 'Completed alchemical project'}`,
      'Completion spends the listed completion costs.'
    ].filter(Boolean)
  };
}


async function postRiteChat(actor, detail, { mode = 'applied', resourceChanges = null, effectCount = 0 } = {}) {
  const rite = detail?.rite ?? {};
  const target = detail?.selectedTarget?.name ?? 'Unselected target';
  const spent = resourceChanges?.spent ?? {};
  const lines = [];
  lines.push(`<div class="fa-chat-row"><span>Target</span><strong>${esc(target)}</strong></div>`);
  lines.push(`<div class="fa-chat-row"><span>Mode</span><strong>${esc(mode)}</strong></div>`);
  lines.push(`<div class="fa-chat-row"><span>Force Points</span><strong>${Number(spent.forcePoints ?? 0) ? `-${esc(spent.forcePoints)}` : 'none'}</strong></div>`);
  lines.push(`<div class="fa-chat-row"><span>Dark Side Score</span><strong class="danger">${Number(spent.darkSideScore ?? 0) ? `+${esc(spent.darkSideScore)}` : 'none'}</strong></div>`);
  lines.push(`<div class="fa-chat-row"><span>Credits / Materials</span><strong>${Number(spent.credits ?? 0) ? `-${Number(spent.credits).toLocaleString()} cr` : 'none'}</strong></div>`);
  lines.push(`<div class="fa-chat-row"><span>Visible Effects</span><strong>${esc(effectCount)}</strong></div>`);
  const preview = asArray(detail?.previewLines).map(line => `<li>${esc(line)}</li>`).join('');
  const content = `
    <section class="swse-chat-card swse-force-alchemy-chat-card">
      <header><strong>${esc(rite.name ?? 'Force Alchemy')}</strong><span>Ritual ${esc(mode)}</span></header>
      <div class="fa-chat-body">${lines.join('')}</div>
      ${preview ? `<details><summary>Rite preview</summary><ul>${preview}</ul></details>` : ''}
    </section>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { [EFFECT_SCOPE]: { forceAlchemyChat: { riteId: rite.id, mode, target } } }
  });
}

export async function applyForceAlchemySelection(actor, detail) {
  const rite = detail?.rite;
  if (!actor) throw new Error('No actor selected.');
  if (!rite) throw new Error('No rite selected.');
  if (isProjectRite(rite)) {
    if (rite.id === 'sith-alchemy-specialist') {
      const item = getOwnedItem(actor, detail?.selectedTarget?.id);
      validateSpecialistTraitTarget(actor, item, detail?.selectedTrait?.id ?? detail?.selectedConfig?.traitId);
    }
    const result = await ForceAlchemyStateService.recordSelection(actor, detail);
    await postRiteChat(actor, detail, { mode: 'project recorded', effectCount: 0 }).catch((error) => console.warn('[ForceAlchemy] Chat card failed', error));
    return { ...result, mechanical: false, mode: 'project' };
  }
  if (!isMechanicalRite(rite)) throw new Error(`${rite.name} is not supported by the Force Alchemy mechanical workflow.`);

  validateCosts(actor, detail);
  const stateKey = stateKeyForDetail(detail);
  if (!stateKey) throw new Error('Selected rite has no state key.');
  await deleteEntryEffects(actor, stateKey);

  const initial = await ForceAlchemyStateService.recordSelection(actor, detail, {
    status: rite.timing === 'encounter' ? 'encounter-applying' : 'applying',
    pendingEffects: true,
    pendingCosts: true,
    configPatch: rite.id === 'rapid-alchemy' ? { surgeReady: true, surgeConsumed: false } : {}
  });

  let resourceChanges = null;
  try {
    resourceChanges = await applyResourceCosts(actor, detail);
    const effects = effectsForDetail(detail, { stateKey, entryId: initial.entry?.id ?? null, resourceChanges });
    const effectIds = await createEffects(actor, effects);
    const instantItemResult = await markItemForInstantAlchemyRite(actor, detail, resourceChanges);
    const status = rite.timing === 'encounter' ? 'encounter-active' : 'active';
    const nextConfig = rite.id === 'sith-weapon-surge'
      ? { ...(initial.entry?.config ?? {}), damageSurgeReady: true, damageBonus: numberFrom(resourceChanges?.before?.darkSideScore) }
      : {
          ...(initial.entry?.config ?? {}),
          itemAlchemyKind: instantItemResult?.alchemyFlags?.kind ?? initial.entry?.config?.itemAlchemyKind ?? null
        };
    const state = await ForceAlchemyStateService.updateSlot(actor, stateKey, {
      status,
      appliedAt: nowIso(),
      effectIds,
      resourceChanges,
      config: nextConfig,
      pendingEffects: false,
      pendingCosts: false
    });
    await postRiteChat(actor, detail, { mode: status, resourceChanges, effectCount: effectIds.length }).catch((error) => console.warn('[ForceAlchemy] Chat card failed', error));
    return { mode: 'applied', entry: state?.[stateKey] ?? initial.entry, state, effectIds, resourceChanges, item: instantItemResult?.item ?? null, alchemyFlags: instantItemResult?.alchemyFlags ?? null, mechanical: true };
  } catch (error) {
    await deleteEntryEffects(actor, stateKey).catch(() => null);
    await ForceAlchemyStateService.clearSlot(actor, stateKey).catch(() => null);
    if (resourceChanges) await revertResourceCosts(actor, resourceChanges).catch((rollbackError) => console.error('[ForceAlchemy] Could not roll back instant rite costs', rollbackError));
    throw error;
  }
}


export async function completeForceAlchemyMechanicalProject(actor, projectId) {
  if (!actor) throw new Error('No actor selected.');
  const state = readForceAlchemyState(actor);
  const project = asArray(state.projects).find(entry => entry.id === projectId);
  if (!project) throw new Error('No matching Force Alchemy project found.');
  if (!project.ready && project.status !== 'ready') throw new Error(`${project.name} is not ready to complete yet.`);

  const detail = detailFromProject(actor, project);
  validateCosts(actor, detail);

  if (project.riteId === 'sith-weapon') {
    const item = getOwnedItem(actor, project.targetId);
    if (!item) throw new Error(`Could not find the project target item "${project.targetName}" on this actor.`);
    return withResourceCostRollback(actor, detail, async (resourceChanges) => {
      const alchemyFlags = await markItemAsSithWeapon(actor, item, project, resourceChanges);
      const completion = await ForceAlchemyStateService.completeProject(actor, projectId, {
        resourceChanges,
        itemUuid: item.uuid ?? null,
        itemId: item.id ?? null,
        alchemyKind: alchemyFlags.kind,
        completionMode: 'sith-weapon-item-flags'
      });
      await postRiteChat(actor, detail, { mode: 'sith weapon completed', resourceChanges, effectCount: 0 }).catch((error) => console.warn('[ForceAlchemy] Chat card failed', error));
      return { ...completion, item, alchemyFlags, resourceChanges };
    });
  }

  if (project.riteId === 'sith-amulet') {
    return withResourceCostRollback(actor, detail, async (resourceChanges) => {
      const { item, alchemyFlags } = await createSithAmuletItem(actor, project, resourceChanges);
      const completion = await ForceAlchemyStateService.completeProject(actor, projectId, {
        resourceChanges,
        itemUuid: item.uuid ?? null,
        itemId: item.id ?? null,
        alchemyKind: alchemyFlags.kind,
        completionMode: 'sith-amulet-item-create'
      });
      await postRiteChat(actor, { ...detail, selectedTarget: { ...(detail.selectedTarget ?? {}), name: item.name, id: item.id, uuid: item.uuid } }, { mode: 'sith amulet completed', resourceChanges, effectCount: 0 }).catch((error) => console.warn('[ForceAlchemy] Chat card failed', error));
      return { ...completion, item, alchemyFlags, resourceChanges };
    });
  }

  if (project.riteId === 'sith-armor') {
    const item = getOwnedItem(actor, project.targetId);
    if (!item) throw new Error(`Could not find the project target armor "${project.targetName}" on this actor.`);
    return withResourceCostRollback(actor, detail, async (resourceChanges) => {
      const { alchemyFlags, profile } = await markItemAsSithArmor(actor, item, project, resourceChanges);
      const completion = await ForceAlchemyStateService.completeProject(actor, projectId, {
        resourceChanges,
        itemUuid: item.uuid ?? null,
        itemId: item.id ?? null,
        alchemyKind: alchemyFlags.kind,
        resultName: profile.resultName,
        completionMode: 'sith-armor-item-transform'
      });
      await postRiteChat(actor, { ...detail, selectedTarget: { ...(detail.selectedTarget ?? {}), name: profile.resultName } }, { mode: 'sith armor completed', resourceChanges, effectCount: 0 }).catch((error) => console.warn('[ForceAlchemy] Chat card failed', error));
      return { ...completion, item, alchemyFlags, profile, resourceChanges };
    });
  }

  if (project.riteId === 'sith-alchemy-specialist') {
    const item = getOwnedItem(actor, project.targetId);
    if (!item) throw new Error(`Could not find the Specialist target "${project.targetName}" on this actor.`);
    return withResourceCostRollback(actor, detail, async (resourceChanges) => {
      const { alchemyFlags, trait, targetKind } = await applySpecialistTraitToItem(actor, item, project, resourceChanges);
      const completion = await ForceAlchemyStateService.completeProject(actor, projectId, {
        resourceChanges,
        itemUuid: item.uuid ?? null,
        itemId: item.id ?? null,
        alchemyKind: targetKind,
        traitId: trait.id,
        traitName: trait.name,
        completionMode: 'sith-alchemy-specialist-trait'
      });
      await postRiteChat(actor, {
        ...detail,
        selectedTarget: { ...(detail.selectedTarget ?? {}), name: item.name, id: item.id, uuid: item.uuid },
        selectedTrait: trait,
        previewLines: [`Target: ${item.name}`, `Trait applied: ${trait.name}`, `Flag: flags.${EFFECT_SCOPE}.alchemy.traits[]`]
      }, { mode: 'specialist trait completed', resourceChanges, effectCount: 0 }).catch((error) => console.warn('[ForceAlchemy] Chat card failed', error));
      return { ...completion, item, alchemyFlags, trait, targetKind, resourceChanges };
    });
  }

  if (project.riteId === 'cause-mutation') {
    const targetActor = await resolveActorByUuidOrId(project.targetUuid, project.targetId);
    if (!targetActor) throw new Error(`Could not find the mutation target actor "${project.targetName}".`);
    const template = validateMutationProject(project);
    return withResourceCostRollback(actor, detail, async (resourceChanges) => {
      const { alchemyFlags, effectIds } = await applyMutationFlagsToActor(actor, targetActor, project, resourceChanges);
      const completion = await ForceAlchemyStateService.completeProject(actor, projectId, {
        resourceChanges,
        targetActorUuid: targetActor.uuid ?? null,
        targetActorId: targetActor.id ?? null,
        alchemyKind: alchemyFlags.kind,
        templateId: template.id,
        templateName: template.name,
        effectIds,
        completionMode: 'mutation-gm-gated-actor-flags'
      });
      await postRiteChat(actor, {
        ...detail,
        selectedTarget: { ...(detail.selectedTarget ?? {}), name: targetActor.name, id: `actor:${targetActor.id}`, uuid: targetActor.uuid },
        selectedTemplate: template,
        previewLines: [
          `Target actor: ${targetActor.name}`,
          `Template recorded: ${template.name}`,
          `Flag: flags.${EFFECT_SCOPE}.alchemy.kind = ${alchemyFlags.kind}`,
          'No automatic template stat rewrite was performed.',
          'A visible GM-adjudication reminder effect was placed on the target actor.'
        ]
      }, { mode: 'cause mutation completed', resourceChanges, effectCount: effectIds.length }).catch((error) => console.warn('[ForceAlchemy] Chat card failed', error));
      return { ...completion, targetActor, alchemyFlags, template, effectIds, resourceChanges };
    });
  }

  throw new Error(`${project.name} completion is not implemented yet.`);
}


export async function clearForceAlchemyMechanicalSlot(actor, stateKey) {
  await deleteEntryEffects(actor, stateKey);
  return ForceAlchemyStateService.clearSlot(actor, stateKey);
}

export async function destroyForceAlchemyMechanicalSlot(actor, stateKey) {
  await deleteEntryEffects(actor, stateKey);
  return ForceAlchemyStateService.destroySlot(actor, stateKey);
}

export async function consumeRapidAlchemySurge(actor) {
  const state = readForceAlchemyState(actor);
  const entry = state.rapidAlchemy;
  if (!entry) throw new Error('Rapid Alchemy is not active.');
  if (entry?.config?.surgeConsumed === true) throw new Error('Rapid Alchemy damage surge has already been prepared.');

  await deleteForceAlchemyEffects(actor, data => data.stateKey === 'rapidAlchemy' && data.riteId === 'rapid-alchemy');
  const effectIds = await createEffects(actor, [damageSurgeEffect(entry)]);
  const nextEffectIds = effectIds;
  const stateAfter = await ForceAlchemyStateService.updateSlot(actor, 'rapidAlchemy', {
    status: 'encounter-surge-ready',
    effectIds: nextEffectIds,
    config: { ...(entry.config ?? {}), surgeReady: false, surgeConsumed: true, damageSurgeReady: true },
    pendingEffects: false,
    pendingCosts: false
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<section class="swse-chat-card swse-force-alchemy-chat-card"><header><strong>Rapid Alchemy</strong><span>Damage Surge</span></header><p>The +2 attack bonus on <strong>${esc(entry.targetName)}</strong> has been consumed. Apply a <strong>+5 Equipment bonus</strong> to one damage roll with that weapon before the encounter ends, then remove the surge effect.</p></section>`,
    flags: { [EFFECT_SCOPE]: { forceAlchemyChat: { riteId: 'rapid-alchemy-surge', mode: 'surge-ready', target: entry.targetName } } }
  });
  return stateAfter;
}

export const ForceAlchemyMechanicsService = {
  applySelection: applyForceAlchemySelection,
  clearSlot: clearForceAlchemyMechanicalSlot,
  destroySlot: destroyForceAlchemyMechanicalSlot,
  consumeRapidAlchemySurge,
  completeProject: completeForceAlchemyMechanicalProject
};

export default ForceAlchemyMechanicsService;
