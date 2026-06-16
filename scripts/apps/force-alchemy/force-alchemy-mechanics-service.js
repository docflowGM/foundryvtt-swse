// scripts/apps/force-alchemy/force-alchemy-mechanics-service.js
// Phase 3 mechanical application for instant Force Artifact / Sith Alchemy rites.

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import {
  FORCE_ALCHEMY_FLAG_SCOPE,
  FORCE_ALCHEMY_FLAG_KEY,
  getForceAlchemyRite
} from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-data.js";
import { ForceAlchemyStateService, readForceAlchemyState } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-state-service.js";

const EFFECT_SCOPE = 'foundryvtt-swse';
const ADD = globalThis.CONST?.ACTIVE_EFFECT_MODES?.ADD ?? 2;

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
      changes: [{ key: `system.defenses.${defense}.misc`, mode: ADD, value: '1', priority: 20 }],
      intent: effectIntent({ category: 'defense', target: defense, amount: 1, bonusType: 'untyped', note: 'Force bonus from Force Talisman.' }),
      tags: ['force-talisman', 'defense']
    }));
  }

  if (rite.id === 'greater-force-talisman') {
    const changes = ['reflex', 'fortitude', 'will'].map(key => ({ key: `system.defenses.${key}.misc`, mode: ADD, value: '1', priority: 20 }));
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
      details: [`Sith Weapon: ${targetName}`, `Damage bonus: +${damageBonus} from current Dark Side Score`, 'Apply to one damage roll before encounter end, then clear this effect manually.', 'Roll-path auto-consumption is intentionally deferred.'],
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
  // Credit/material spending is reserved for the downtime completion phase. There are no instant credit-cost rites in phase 3.
  if (Object.keys(updates).length) {
    await ActorEngine.updateActor(actor, updates, { source: 'force-alchemy:resource-costs' });
  }
  const after = {
    forcePoints: fpCost > 0 ? Math.max(0, before.forcePoints - fpCost) : before.forcePoints,
    darkSideScore: dspCost > 0 ? before.darkSideScore + dspCost : before.darkSideScore,
    credits: before.credits
  };
  return { before, after, spent: { forcePoints: fpCost, darkSideScore: dspCost, credits: creditCost } };
}

function getOwnedItem(actor, itemId) {
  if (!itemId || itemId === '__materials__') return null;
  return actor?.items?.get?.(itemId) ?? Array.from(actor?.items ?? []).find(item => (item?.id ?? item?._id) === itemId) ?? null;
}

function getItemAlchemyFlags(item) {
  return item?.flags?.[EFFECT_SCOPE]?.alchemy ?? item?.flags?.swse?.alchemy ?? {};
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

function detailFromProject(actor, project) {
  const rite = getForceAlchemyRite(project?.riteId);
  const item = getOwnedItem(actor, project?.targetId);
  const target = item ? {
    id: item.id,
    uuid: item.uuid ?? null,
    name: item.name ?? project?.targetName ?? 'Sith Weapon target',
    icon: item.img ?? null,
    kind: 'melee-weapon'
  } : {
    id: project?.targetId ?? null,
    uuid: project?.targetUuid ?? null,
    name: project?.targetName ?? 'Sith Weapon target',
    icon: null,
    kind: project?.targetKind ?? 'melee-weapon'
  };
  return {
    rite,
    ready: true,
    selectedTarget: target,
    selectedConfig: project?.config ?? {},
    previewLines: [
      `Target: ${target.name}`,
      `Result: ${rite?.resultLabel ?? project?.resultLabel ?? 'Completed alchemical project'}`,
      'Completion spends the listed completion costs.'
    ]
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
    const result = await ForceAlchemyStateService.recordSelection(actor, detail);
    await postRiteChat(actor, detail, { mode: 'project recorded', effectCount: 0 });
    return { ...result, mechanical: false, mode: 'project' };
  }
  if (!isMechanicalRite(rite)) throw new Error(`${rite.name} is not supported by the Phase 3 mechanical pass.`);

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

  try {
    const resourceChanges = await applyResourceCosts(actor, detail);
    const effects = effectsForDetail(detail, { stateKey, entryId: initial.entry?.id ?? null, resourceChanges });
    const effectIds = await createEffects(actor, effects);
    const status = rite.timing === 'encounter' ? 'encounter-active' : 'active';
    const nextConfig = rite.id === 'sith-weapon-surge'
      ? { ...(initial.entry?.config ?? {}), damageSurgeReady: true, damageBonus: numberFrom(resourceChanges?.before?.darkSideScore) }
      : initial.entry?.config;
    const state = await ForceAlchemyStateService.updateSlot(actor, stateKey, {
      status,
      appliedAt: nowIso(),
      effectIds,
      resourceChanges,
      config: nextConfig,
      pendingEffects: false,
      pendingCosts: false
    });
    await postRiteChat(actor, detail, { mode: status, resourceChanges, effectCount: effectIds.length });
    return { mode: 'applied', entry: state?.[stateKey] ?? initial.entry, state, effectIds, resourceChanges, mechanical: true };
  } catch (error) {
    await deleteEntryEffects(actor, stateKey).catch(() => null);
    await ForceAlchemyStateService.clearSlot(actor, stateKey).catch(() => null);
    throw error;
  }
}


export async function completeForceAlchemyMechanicalProject(actor, projectId) {
  if (!actor) throw new Error('No actor selected.');
  const state = readForceAlchemyState(actor);
  const project = asArray(state.projects).find(entry => entry.id === projectId);
  if (!project) throw new Error('No matching Force Alchemy project found.');
  if (!project.ready && project.status !== 'ready') throw new Error(`${project.name} is not ready to complete yet.`);
  if (project.riteId !== 'sith-weapon') {
    throw new Error(`${project.name} completion is not implemented in Phase 4. Sith Armor, Sith Amulet, Specialist, and Mutation completion remain deferred.`);
  }

  const item = getOwnedItem(actor, project.targetId);
  if (!item) throw new Error(`Could not find the project target item "${project.targetName}" on this actor.`);
  const detail = detailFromProject(actor, project);
  validateCosts(actor, detail);

  const resourceChanges = await applyResourceCosts(actor, detail);
  const alchemyFlags = await markItemAsSithWeapon(actor, item, project, resourceChanges);
  const completion = await ForceAlchemyStateService.completeProject(actor, projectId, {
    resourceChanges,
    itemUuid: item.uuid ?? null,
    itemId: item.id ?? null,
    alchemyKind: alchemyFlags.kind,
    completionMode: 'sith-weapon-item-flags'
  });
  await postRiteChat(actor, detail, { mode: 'sith weapon completed', resourceChanges, effectCount: 0 });
  return { ...completion, item, alchemyFlags, resourceChanges };
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
  const nextEffectIds = [...asArray(entry.effectIds).filter(id => !effectIds.includes(id)), ...effectIds];
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
