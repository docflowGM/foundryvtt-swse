
/**
 * ForceRegimenExecutor
 *
 * Lightweight actor-owned Force Regimen use/recovery service.
 * A used regimen becomes spent/discarded like a Force power and emits a
 * lightweight system active effect that can be ended manually or cleared by
 * long rest/GM rest. The actual tier result is left to the player/GM until the
 * regimen activation roll UI is built.
 *
 * Phase 22: Force Regimens now execute like Force Powers: configure a UTF
 * check, roll, resolve the best DC tier, create the active regimen effect,
 * and mark the regimen card spent/discarded until long rest or manual End.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { RollCore } from '/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js';
import { SWSEChat } from '/systems/foundryvtt-swse/scripts/chat/swse-chat.js';
import { SchemaAdapters } from '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js';

function ownedRegimens(actor) {
  return Array.from(actor?.items ?? []).filter((item) => String(item?.type || '') === 'force-regimen');
}


function text(value = '') {
  if (value && typeof value === 'object') value = value.value ?? value.description ?? value.text ?? value.label ?? '';
  const raw = String(value ?? '');
  if (!raw) return '';
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = raw;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getUseTheForceTotal(actor) {
  const candidates = [
    actor?.system?.derived?.skillsByKey?.useTheForce?.total,
    actor?.system?.derived?.skills?.useTheForce?.total,
    actor?.system?.skills?.useTheForce?.total,
    actor?.system?.skills?.useTheForce?.value,
    actor?.system?.skills?.useTheForce?.mod
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function parseDcFloor(dc) {
  const raw = String(dc ?? '').trim();
  if (!raw) return Number.NaN;
  const first = raw.match(/\d+/)?.[0];
  return first == null ? Number.NaN : Number(first);
}

function normalizeDcTiers(regimen) {
  const rows = Array.isArray(regimen?.system?.dcTiers) ? regimen.system.dcTiers : [];
  return rows
    .map((row) => ({
      dc: String(row?.dc ?? row?.DC ?? row?.target ?? row?.threshold ?? '').trim(),
      floor: parseDcFloor(row?.dc ?? row?.DC ?? row?.target ?? row?.threshold),
      effect: text(row?.effect || row?.description || row?.text || row?.label || ''),
      structuredBenefits: Array.isArray(row?.structuredBenefits) ? row.structuredBenefits : []
    }))
    .filter(row => Number.isFinite(row.floor) && row.effect)
    .sort((a, b) => a.floor - b.floor);
}

function resolveTier(regimen, total) {
  const numericTotal = Number(total);
  if (!Number.isFinite(numericTotal)) return null;
  let best = null;
  for (const row of normalizeDcTiers(regimen)) {
    if (numericTotal >= row.floor) best = row;
  }
  return best;
}

function getBaseDc(regimen) {
  const system = regimen?.system ?? {};
  const rows = normalizeDcTiers(regimen);
  return Number(system.dc ?? system.useTheForce ?? rows[0]?.floor ?? 10) || 10;
}

function effectIdFor(item) {
  return `force-regimen-${item?.id || item?._id || String(item?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export class ForceRegimenExecutor {
  static getOwnedRegimens(actor) {
    return ownedRegimens(actor);
  }

  static async useRegimen(actor, itemId, options = {}) {
    if (!actor || !itemId) return { success: false, error: 'Missing actor or regimen.' };
    const regimen = actor.items.get(itemId);
    if (!regimen || regimen.type !== 'force-regimen') return { success: false, error: 'Force Regimen not found.' };

    const existingEffects = Array.isArray(actor.system?.activeEffects) ? actor.system.activeEffects : [];
    const activeRegimenEffects = existingEffects.filter((effect) => effect?.source === 'forceRegimen' && effect?.enabled !== false);
    if (activeRegimenEffects.length && options.replace !== true) {
      return { success: false, error: 'Only one Force Regimen can be active. End the current regimen first.' };
    }

    const system = regimen.system || {};
    const resolvedTier = options.resolvedTier || null;
    const resolvedEffect = options.resolvedEffect || resolvedTier?.effect || system.summary || system.effect || system.descriptionText || 'Active Force Regimen benefit. Apply the chosen DC tier at the table.';
    const rollTotal = Number(options.rollTotal ?? options.total);
    const effect = {
      id: effectIdFor(regimen),
      name: regimen.name,
      source: 'forceRegimen',
      sourceName: 'Force Regimen',
      sourceItemId: regimen.id,
      target: 'Force Regimen',
      type: 'forceRegimen',
      value: 0,
      enabled: true,
      severity: 'positive',
      durationText: system.duration || '24 hours / until long rest',
      description: resolvedEffect,
      resolvedTier: resolvedTier ? { dc: resolvedTier.dc, floor: resolvedTier.floor, effect: resolvedTier.effect, structuredBenefits: resolvedTier.structuredBenefits || [] } : null,
      rollTotal: Number.isFinite(rollTotal) ? rollTotal : null,
      details: [
        system.time ? `Time: ${system.time}` : null,
        system.targets ? `Targets: ${system.targets}` : null,
        system.requirements ? `Requirements: ${system.requirements}` : null,
        resolvedTier?.dc ? `Resolved Tier: DC ${resolvedTier.dc}` : null,
        Number.isFinite(rollTotal) ? `Use the Force Check: ${rollTotal}` : null,
        'Expires on long rest or when ended manually.'
      ].filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    const effects = [
      ...existingEffects.filter((entry) => !(entry?.source === 'forceRegimen' && entry?.sourceItemId === regimen.id)),
      effect,
    ];

    await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
      _id: regimen.id,
      'system.spent': true,
      'system.discarded': true,
      'system.active': true,
      'system.activeEffectId': effect.id,
      'system.activeTier': effect.resolvedTier,
      'system.activeRollTotal': effect.rollTotal,
      'system.lastUsed': Date.now(),
    }], { source: 'force-regimen-use', render: false });
    await ActorEngine.updateActor(actor, { 'system.activeEffects': effects }, { source: 'force-regimen-use' });
    return { success: true, regimenName: regimen.name, effect };
  }


  static async executeRegimen(actor, itemId, options = {}) {
    try {
      if (!actor || !itemId) return { success: false, error: 'Missing actor or regimen.' };
      const regimen = actor.items.get(itemId);
      if (!regimen || regimen.type !== 'force-regimen') return { success: false, error: 'Force Regimen not found.' };
      if (regimen.system?.discarded || regimen.system?.spent) return { success: false, error: `${regimen.name} is already active/spent.` };

      const existingEffects = Array.isArray(actor.system?.activeEffects) ? actor.system.activeEffects : [];
      const activeRegimenEffects = existingEffects.filter((effect) => effect?.source === 'forceRegimen' && effect?.enabled !== false);
      if (activeRegimenEffects.length && options.replace !== true) {
        return { success: false, error: 'Only one Force Regimen can be active. End the current regimen first.' };
      }

      const baseDC = Number(options.baseDC ?? getBaseDc(regimen)) || getBaseDc(regimen);
      const baseBonus = Number.isFinite(Number(options.baseBonus))
        ? Number(options.baseBonus)
        : Number.isFinite(Number(options.bonus))
          ? Number(options.bonus)
          : getUseTheForceTotal(actor);
      const customModifier = Number(options.customModifier ?? options.situationalModifier ?? 0) || 0;
      const rollBonus = baseBonus + customModifier;
      const useForce = options.useForce === true;

      if (useForce) {
        const fpValue = SchemaAdapters.getForcePoints(actor);
        if (fpValue <= 0) throw new Error('No Force Points available');
      }

      const dcChart = normalizeDcTiers(regimen);
      const rollResult = await RollCore.execute({
        actor,
        domain: 'force-regimen.activation',
        baseBonus: rollBonus,
        rollOptions: {
          baseDice: '1d20',
          useForce,
          forcePointCount: useForce ? 1 : 0
        },
        rollData: actor.getRollData?.() ?? {},
        context: {
          regimenId: itemId,
          regimenName: regimen.name,
          sourceItemId: itemId,
          itemName: regimen.name,
          category: regimen.system?.category || 'force-training',
          type: 'force-regimen',
          baseDC,
          baseBonus,
          customModifier,
          dcChart
        }
      });
      if (!rollResult.success || !rollResult.roll) throw new Error(rollResult.error || 'Force Regimen roll failed');

      const roll = rollResult.roll;
      const total = Number(rollResult.finalTotal ?? roll.total ?? 0) || 0;
      const d20 = roll.dice?.find?.(die => Number(die.faces) === 20);
      const d20Result = d20?.results?.find?.(r => r.active !== false) ?? d20?.results?.[0] ?? null;
      const isCritical = Number(d20Result?.result) === 20;
      const isFumble = Number(d20Result?.result) === 1;
      const success = total >= baseDC;
      const resolvedTier = resolveTier(regimen, total);
      const resolvedEffect = resolvedTier?.effect || (success ? text(regimen.system?.effect || regimen.system?.summary || '') : 'Regimen check failed. No effect resolved.');

      const forcePointBonus = Number(rollResult.forcePointBonus ?? rollResult.breakdown?.forcePointBonus ?? 0) || 0;
      if (useForce && forcePointBonus > 0) {
        const currentFP = SchemaAdapters.getForcePoints(actor);
        await ActorEngine.updateActor(actor, SchemaAdapters.setForcePointsUpdate(Math.max(0, currentFP - 1)), {
          source: 'force-regimen-force-point-spend'
        });
      }

      if (!resolvedTier) {
        await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
          _id: itemId,
          'system.spent': true,
          'system.discarded': true,
          'system.active': false,
          'system.activeEffectId': null,
          'system.activeTier': null,
          'system.activeRollTotal': total,
          'system.failedRegimen': true,
          'system.lastUsed': Date.now(),
        }], { source: 'force-regimen-failed-use', render: false });
        await this._generateForceRegimenRollMessage(actor, regimen, roll, total, baseDC, false, isCritical, {
          baseBonus,
          customModifier,
          forcePointBonus,
          dcChart,
          resolvedTier: null,
          resolvedEffect
        });
        return {
          success: false,
          executed: true,
          error: 'Regimen check failed. The regimen is spent with no active effect.',
          roll: total,
          dc: baseDC,
          isCritical,
          isFumble,
          regimenName: regimen.name,
          discarded: true,
          resolvedTier: null,
          resolvedEffect
        };
      }

      const useResult = await this.useRegimen(actor, itemId, {
        replace: options.replace === true,
        resolvedTier,
        resolvedEffect,
        rollTotal: total
      });
      if (!useResult?.success) return useResult;

      await this._generateForceRegimenRollMessage(actor, regimen, roll, total, baseDC, success, isCritical, {
        baseBonus,
        customModifier,
        forcePointBonus,
        dcChart,
        resolvedTier,
        resolvedEffect
      });

      return {
        success,
        roll: total,
        dc: baseDC,
        isCritical,
        isFumble,
        regimenName: regimen.name,
        discarded: true,
        resolvedTier,
        resolvedEffect,
        effect: useResult.effect
      };
    } catch (err) {
      console.error('Force Regimen execution failed:', err);
      ui?.notifications?.error?.(`Force Regimen failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  static async _generateForceRegimenRollMessage(actor, regimen, roll, total, baseDC, success, isCritical, extra = {}) {
    try {
      const resolvedTier = extra.resolvedTier ?? resolveTier(regimen, total);
      const dcChart = extra.dcChart?.length ? extra.dcChart : normalizeDcTiers(regimen);
      const margin = Number(total) - Number(baseDC);
      await SWSEChat.postRoll({
        actor,
        roll,
        flavor: `${actor.name} performs ${regimen.name}`,
        context: {
          category: 'force',
          type: 'force-regimen',
          itemName: regimen.name,
          sourceItemId: regimen.id,
          regimenId: regimen.id,
          label: regimen.name,
          typeChipLabel: 'Force Regimen · UTF',
          totalLabel: 'UTF Check',
          dc: baseDC,
          success,
          outcomeLabel: resolvedTier ? 'Regimen Active' : 'Failed',
          forceDescriptor: regimen.system?.category === 'lightsaber-training' ? 'form' : 'light',
          forceDescriptors: ['Force Regimen', regimen.system?.category === 'lightsaber-training' ? 'Lightsaber' : 'Force'],
          dcChart,
          forceResolvedTier: resolvedTier?.dc ? `DC ${resolvedTier.dc}` : '',
          forceResolvedEffect: extra.resolvedEffect || resolvedTier?.effect || 'No effect resolved.',
          baseBonus: extra.baseBonus,
          customModifier: extra.customModifier,
          forcePointBonus: extra.forcePointBonus,
          margin
        },
        flags: {
          swse: {
            forceRegimen: true,
            regimenId: regimen.id,
            regimenName: regimen.name,
            dc: baseDC,
            success,
            resolvedEffect: extra.resolvedEffect || resolvedTier?.effect || null,
            resolvedTierDc: resolvedTier?.dc ?? null,
            isCritical
          }
        }
      });
    } catch (err) {
      console.error('Force Regimen roll message generation failed:', err);
    }
  }

  static async endRegimen(actor, effectIdOrItemId = null, options = {}) {
    if (!actor) return { success: false, error: 'Missing actor.' };
    const effects = Array.isArray(actor.system?.activeEffects) ? actor.system.activeEffects : [];
    const target = effectIdOrItemId ? String(effectIdOrItemId) : null;
    const removed = effects.filter((effect) => effect?.source === 'forceRegimen' && (!target || String(effect.id) === target || String(effect.sourceItemId) === target));
    const keep = effects.filter((effect) => !(effect?.source === 'forceRegimen' && (!target || String(effect.id) === target || String(effect.sourceItemId) === target)));
    const itemIds = new Set(removed.map((effect) => effect.sourceItemId).filter(Boolean));
    if (target) itemIds.add(target);

    const updates = ownedRegimens(actor)
      .filter((item) => !target || itemIds.has(item.id) || String(item.system?.activeEffectId || '') === target)
      .map((item) => ({
        _id: item.id,
        'system.spent': false,
        'system.discarded': false,
        'system.active': false,
        'system.activeEffectId': null,
      }));

    if (updates.length) await ActorEngine.updateEmbeddedDocuments(actor, 'Item', updates, { source: options.source || 'force-regimen-end', render: false });
    await ActorEngine.updateActor(actor, { 'system.activeEffects': keep }, { source: options.source || 'force-regimen-end' });
    return { success: true, ended: removed.length || updates.length };
  }

  static async clearForLongRest(actor, options = {}) {
    return this.endRegimen(actor, null, { source: options.source || 'force-regimen-long-rest' });
  }
}

export default ForceRegimenExecutor;
