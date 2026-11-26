/**
 * Damage / Force Point rescue / condition-track / Second Wind orchestration (3N-AE.6, extracted verbatim from ActorEngine).
 *
 * Rules stay in the domain engines (DamageResolutionEngine, ConditionTrackRules, SecondWindRules, ForcePointsService); these functions only
 * orchestrate and receive the engine as `engine`, persisting ONLY through its existing gateway methods. ActorEngine keeps every method name
 * as a thin delegate and remains the only mutation gateway. No rules changes.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { SecondWindRules } from "/systems/foundryvtt-swse/scripts/engine/combat/SecondWindRules.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

// ForcePointsService is injected by ActorEngine (configureDamageOrchestration) so this module does not join the ActorEngine static import cycle.
let ForcePointsService = null;
export function configureDamageOrchestration(deps = {}) {
  if (deps.ForcePointsService) ForcePointsService = deps.ForcePointsService;
}

export async function applyDamageImpl(engine, actor, damagePacket) {
    try {
      if (!actor) {throw new Error('applyDamage() called with no actor');}
      if (!damagePacket) {throw new Error('applyDamage() called with no damagePacket');}
      if (typeof damagePacket.amount !== 'number' || damagePacket.amount < 0) {
        throw new Error(`Invalid damage amount: ${damagePacket.amount}`);
      }

      SWSELogger.debug(`ActorEngine.applyDamage → ${actor.name}`, {
        amount: damagePacket.amount,
        type: damagePacket.type,
        source: damagePacket.source
      });

      const { DamageResolutionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/combat/damage-resolution-engine.js");

      // Canonical Damage Packet (Phase 3 foundation): normalize every applyDamage
      // input to per-component { amount, type, tags, source } before mitigation, so
      // the resolver always receives damage type/tags instead of a bare number.
      // Shape only — behaviour-preserving: a single-component packet still falls
      // through resolveComponentMitigation() (needs >1) to the unchanged single-total
      // path, and the effective damageType is preserved (explicit type wins; bare
      // numbers stay 'normal'). Immunity/DR/resistance behaviour is unchanged here.
      const { buildCanonicalDamagePacket } = await import("/systems/foundryvtt-swse/scripts/engine/combat/canonical-damage-packet.js");
      const canonicalPacket = buildCanonicalDamagePacket(damagePacket);

      const resolution = await DamageResolutionEngine.resolveDamage({
        actor,
        damage: damagePacket.amount,
        damageType: damagePacket.type ?? canonicalPacket.primaryType,
        source: damagePacket.sourceActor ?? null,
        options: {
          ...(damagePacket.options ?? {}),
          damageComponents: (Array.isArray(damagePacket.options?.damageComponents) && damagePacket.options.damageComponents.length)
            ? damagePacket.options.damageComponents
            : canonicalPacket.components,
          canonicalPacket
        },
      });

      await engine._maybeResolveForcePointRescue(actor, resolution, damagePacket);

      const updates = {
        ...SchemaAdapters.setHPUpdate(resolution.hpAfter)
      };

      // Persist bonus/temp HP depletion from the same authoritative resolution packet.
      if (resolution.bonusHpAfter !== undefined) {
        updates['system.hp.bonus'] = Math.max(0, Number(resolution.bonusHpAfter) || 0);
      }
      if (resolution.mitigation?.tempHP?.after !== undefined) {
        updates['system.hp.temp'] = Math.max(0, Number(resolution.mitigation.tempHP.after) || 0);
      }

      // Persist Shield Rating depletion (RAW CRB p.161: an attack exceeding the
      // current SR permanently reduces SR by 5 until recharged). ShieldMitigationResolver
      // stays pure; ActorEngine is the writer. system.shields is the stored SSOT — only
      // persist when the mitigating SR came from that stored resource (marked
      // derived.shield.stored), never from a transient force-shield effect that writes
      // derived.shield.current directly.
      const shieldMitigation = resolution.mitigation?.shield;
      if (shieldMitigation && Number(shieldMitigation.degraded) > 0 && actor.system?.derived?.shield?.stored === true) {
        updates['system.shields.value'] = Math.max(0, Number(shieldMitigation.remaining) || 0);
      }

      if (resolution.conditionAfter !== undefined && resolution.conditionAfter !== (actor.system?.conditionTrack?.current ?? 0)) {
        updates['system.conditionTrack.current'] = resolution.conditionAfter;
      }
      if (resolution.conditionPersistent === true) {
        updates['system.conditionTrack.persistent'] = true;
      }

      if (actor.type === 'droid') {
        if (resolution.destroyed === true) {
          updates['system.droidState.status'] = 'destroyed';
          updates['system.droidState.destroyed'] = true;
          updates['system.droidState.disabled'] = false;
          updates['system.droidState.canBeRepaired'] = false;
          updates['system.droidState.destroyedAt'] = Date.now();
          updates['system.droidState.destroyedBy'] = damagePacket.source ?? damagePacket.type ?? 'damage';
        } else if (resolution.disabled === true) {
          updates['system.droidState.status'] = 'disabled';
          updates['system.droidState.disabled'] = true;
          updates['system.droidState.destroyed'] = false;
          updates['system.droidState.canBeRepaired'] = true;
        } else if ((resolution.hpAfter ?? 0) > 0 && actor.system?.droidState?.status === 'disabled') {
          updates['system.droidState.status'] = 'operational';
          updates['system.droidState.disabled'] = false;
          updates['system.droidState.canBeRepaired'] = true;
        }
      }

      // RENDER SEQUENCING FIX: Suppress intermediate renders. Damage application affects
      // both HP and condition track, which both impact derived values. After updateActor
      // completes recalcAll(), _refreshOpenActorApps() will render with stable data.
      const rescueReceipt = resolution.forcePointRescueReceipt ?? null;
      try {
        await engine.updateActor(actor, updates, {
          render: false
        });
      } catch (writeErr) {
        if (rescueReceipt) await engine._settleForcePointRescue(actor, rescueReceipt, resolution, writeErr);
        throw writeErr;
      }
      if (rescueReceipt) await engine._settleForcePointRescue(actor, rescueReceipt, resolution, null);
      // Notification only (local to the client that applied the damage): consumers such as Force power maintenance
      // react to damage actually taken; they never alter this resolution.
      try { globalThis.Hooks?.callAll?.('swse.damageApplied', { actor, damageToHP: resolution.damageToHP ?? 0, source: damagePacket.source ?? null }); } catch (_e) { /* listeners never break damage */ }

      SWSELogger.log(`Damage applied to ${actor.name}: ${damagePacket.amount} incoming → ${resolution.damageToHP} HP`, {
        source: damagePacket.source,
        thresholdExceeded: resolution.thresholdExceeded,
        conditionAfter: resolution.conditionAfter,
        measuredDamageForThreshold: resolution.thresholdMeasuredDamage
      });

      return {
        applied: resolution.damageToHP,
        newHP: resolution.hpAfter,
        conditionShifted: resolution.conditionAfter !== (actor.system?.conditionTrack?.current ?? 0),
        resolution
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applyDamage failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        damagePacket
      });
      throw err;
    }
  }

export async function setConditionStepImpl(engine, actor, step, source = 'manual') {
    try {
      if (!actor) {throw new Error('setConditionStep() requires actor');}
      if (typeof step !== 'number' || !Number.isFinite(step)) {
        throw new Error(`Invalid condition step: ${step}`);
      }

      const conditionCap = ConditionTrackRules.getConditionStepCap();
      const clampedStep = Math.min(conditionCap, Math.max(0, step));
      const current = actor.system.conditionTrack?.current || 0;

      if (clampedStep === current) {
        SWSELogger.debug(`${actor.name} condition already at step ${clampedStep}`);
        return { applied: 0, newStep: clampedStep };
      }

      // RENDER SEQUENCING FIX: Suppress intermediate renders during condition update.
      // Pass render: false to actor.update() to prevent Foundry from auto-rendering.
      // After recalcAll() completes, _refreshOpenActorApps() will render once with
      // stable derived data (system.derived.damage.conditionPenalty). This ensures the
      // condition track step and penalty display are always in sync.
      await engine.updateActor(actor, {
        'system.conditionTrack.current': clampedStep
      }, {
        render: false
      });

      SWSELogger.log(`Condition step updated for ${actor.name}`, {
        from: current,
        to: clampedStep,
        source
      });

      return { applied: 1, newStep: clampedStep };

    } catch (err) {
      SWSELogger.error(`ActorEngine.setConditionStep failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        step,
        source
      });
      throw err;
    }
  }

export async function setConditionPersistentImpl(engine, actor, persistent, source = 'manual') {
    try {
      if (!actor) {throw new Error('setConditionPersistent() requires actor');}

      const current = actor.system.conditionTrack?.persistent ?? false;

      if (persistent === current) {
        SWSELogger.debug(`${actor.name} persistent condition already ${persistent ? 'set' : 'clear'}`);
        return { applied: 0, persistent };
      }

      // RENDER SEQUENCING FIX: Suppress intermediate renders during condition update.
      await engine.updateActor(actor, {
        'system.conditionTrack.persistent': persistent,
        ...(persistent ? {} : { 'system.conditionTrack.persistentSteps': 0 })
      }, {
        render: false
      });

      SWSELogger.log(`Condition persistent flag updated for ${actor.name}`, {
        persistent,
        source
      });

      return { applied: 1, persistent };

    } catch (err) {
      SWSELogger.error(`ActorEngine.setConditionPersistent failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        persistent,
        source
      });
      throw err;
    }
  }

export async function incrementPersistentConditionStepsImpl(engine, actor, amount = 1, source = 'threshold') {
    try {
      if (!actor) throw new Error('incrementPersistentConditionSteps() requires actor');
      const delta = Math.max(0, Number(amount) || 0);
      if (delta === 0) return { applied: 0, total: Number(actor.system?.conditionTrack?.persistentSteps ?? 0) };

      const current = Math.max(0, Number(actor.system?.conditionTrack?.persistentSteps ?? 0));
      const total = current + delta;
      // RENDER SEQUENCING FIX: Suppress intermediate renders during condition update.
      await engine.updateActor(actor, { 'system.conditionTrack.persistentSteps': total }, {
        render: false
      });
      return { applied: delta, total, source };
    } catch (err) {
      SWSELogger.error(`ActorEngine.incrementPersistentConditionSteps failed for ${actor?.name ?? 'unknown actor'}`, { error: err, amount, source });
      throw err;
    }
  }

export async function settleForcePointRescue(engine, actor, receipt, resolution, writeError) {
    try {
      const applied = !writeError || Number(actor.system?.hp?.value) === Number(resolution.hpAfter) &&
        Number(actor.system?.conditionTrack?.current ?? 0) === Number(resolution.conditionAfter);
      if (applied) {
        const finality = await engine.finalizeForcePointSpend(actor, receipt);
        if (!finality?.finalized) SWSELogger.error('Force Point rescue applied but receipt finalization failed', finality);
        return;
      }
      const outcome = await engine.rollbackForcePointSpend(actor, receipt);
      if (!outcome?.rolledBack) SWSELogger.error('Force Point rescue failed and compensation was refused; manual reconciliation required', outcome);
      await actor.unsetFlag?.('foundryvtt-swse', 'alreadyRescuedThisResolution');
    } catch (settleErr) {
      SWSELogger.error('Force Point rescue settlement indeterminate; manual reconciliation required', { error: settleErr });
    }
  }

export async function maybeResolveForcePointRescue(engine, actor, resolution, damagePacket = {}) {
    try {
      if (!actor || !resolution?.forceRescueEligible || (!resolution.dead && !resolution.destroyed)) return false;

      const { ForcePointsService } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js');
      const rescueContext = {
        damage: resolution.thresholdMeasuredDamage ?? damagePacket.amount ?? 0,
        hp: resolution.hpAfter,
        threshold: resolution.thresholdTotal
      };
      if (!ForcePointsService.canRescue(actor, rescueContext)) return false;

      const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
      const label = resolution.destroyed ? 'destruction' : 'death';
      const title = resolution.destroyed ? 'Spend Force Point to Avoid Destruction?' : 'Spend Force Point to Avoid Death?';
      const yes = await SWSEDialogV2.confirm({
        title,
        content: `<p><strong>${actor.name}</strong> would suffer ${label} from this hit.</p><p>Spend 1 Force Point to remain at <strong>0 HP</strong>, move to the bottom of the Condition Track, and become ${resolution.destroyed ? 'disabled' : 'unconscious'} instead?</p>`,
        defaultYes: true
      });
      if (!yes) return false;

      // Post-dialog re-check: FP may have been spent elsewhere while the dialog was open.
      if (!ForcePointsService.canRescue(actor, rescueContext)) {
        ui.notifications?.warn?.(`${actor.name}: Force Point rescue is no longer available — a Force Point may have been spent while the dialog was open.`);
        return false;
      }

      // This method is the damage owner: it has just verified the lethal hit
      // (forceRescueEligible + canRescue) and the player's confirmation, so it
      // persists the event receipt that ForcePointsService.authorizeSpend
      // requires for 'avoid-death'. Core p.93: the rescue is a reaction.
      const sourceEventId = globalThis.foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.();
      if (!sourceEventId) throw new Error('Death-rescue event identity unavailable');
      await engine.updateActor(actor, {
        'flags.swse.forceDeathRescueEvent': { id: sourceEventId, actorId: actor.id, state: 'eligible', createdAt: Date.now() }
      });
      let spend;
      try {
        spend = await engine.spendForcePoints(actor, 1, { useKind: 'avoid-death', sourceEventId });
      } catch (spendErr) {
        ui.notifications?.warn?.(`${actor.name}: Force Point rescue not permitted — ${spendErr.message}`);
        return false;
      } finally {
        // Single-use: the receipt can never authorize a second spend.
        await engine.updateActor(actor, { 'flags.swse.forceDeathRescueEvent': { id: sourceEventId, actorId: actor.id, state: 'consumed' } });
      }
      if (!spend?.spent) {
        ui.notifications?.warn?.(`${actor.name}: Force Point rescue failed — no Force Points remaining.`);
        return false;
      }
      // Finality is NOT granted here: the rescue is only real once applyDamage
      // persists the rescued HP/condition state. applyDamage finalizes (or
      // compensates) the receipt at that boundary.
      resolution.forcePointRescueReceipt = spend;
      await actor.setFlag?.('foundryvtt-swse', 'alreadyRescuedThisResolution', true);

      resolution.forceRescueUsed = true;
      resolution.forceRescueEligible = false;
      resolution.dead = false;
      resolution.destroyed = false;
      resolution.unconscious = actor.type === 'character' || actor.type === 'npc' || actor.type === 'beast';
      resolution.disabled = actor.type === 'droid' || actor.type === 'object' || actor.type === 'device' || actor.type === 'vehicle';
      resolution.hpAfter = 0;
      resolution.conditionAfter = 5;
      resolution.conditionDelta = Math.max(0, 5 - Number(resolution.conditionBefore ?? 0));
      resolution.resolutionNote = 'force-point-rescue';
      return true;
    } catch (err) {
      SWSELogger.error(`ActorEngine._maybeResolveForcePointRescue failed for ${actor?.name ?? 'unknown actor'}`, { error: err });
      return false;
    }
  }

export async function applySecondWindImpl(engine, actor, options = {}) {
    try {
      if (!actor) {throw new Error('applySecondWind() requires actor');}

      const secondWindFeatRules = MetaResourceFeatResolver.getSecondWindRules(actor);
      const hasToughAsNails = actor.items?.some(i => i.type === 'talent' && i.name === 'Tough as Nails') === true;

      // Eligibility check (pure calculation delegated to SecondWindRules)
      const eligibility = SecondWindRules.canUseSecondWind(actor, options, secondWindFeatRules);
      if (!eligibility.allowed) {
        SWSELogger.warn(`Second Wind attempt blocked for ${actor.name}: ${eligibility.reason}`);
        return { success: false, reason: eligibility.reason };
      }

      const currentHP = SchemaAdapters.getHP(actor);
      const maxHP = SchemaAdapters.getMaxHP(actor);
      const activeCombatId = game.combat?.started ? game.combat.id : null;

      const isDroidActor = actor.type === 'droid' || actor.system?.isDroid === true;
      const conScore = isDroidActor ? 0 : Number(actor.system?.derived?.attributes?.con?.total ?? actor.system?.attributes?.con?.base ?? 10);
      const conMod = isDroidActor ? 0 : engine._getCanonicalAbilityMod(actor, 'con');
      const fortClassBonus = Number(actor.system?.defenses?.fortitude?.classBonus ?? 0);

      // Uses calculation delegated to SecondWindRules
      const computedMaxUses = SecondWindRules.calculateMaxUses(conMod, fortClassBonus, secondWindFeatRules, hasToughAsNails);
      const storedUses = Number(actor.system.secondWind?.uses ?? 0);
      const uses = Math.max(0, Math.min(storedUses, computedMaxUses));
      if (uses < 1) {
        return { success: false, reason: 'No Second Wind uses remaining' };
      }

      // Healing amount delegated to SecondWindRules, then adjusted by explicit feat rules.
      let heal = SecondWindRules.calculateHealingAmount(maxHP, conScore) + Number(secondWindFeatRules.extraHealing || 0);
      const impetuousMoveSelected = options.impetuousMove === true || options.halfHealingForMovement === true;
      if (secondWindFeatRules.halfHealingForMovement && impetuousMoveSelected) {
        heal = Math.max(0, Math.floor(heal / 2));
      }

      const newHP = Math.min(currentHP + heal, maxHP);
      const actualHealing = newHP - currentHP;

      // ========================================
      // PHASE B FIX 6: Improved Second Wind houserule
      // ========================================
      const improvements = {
        ...SchemaAdapters.setHPUpdate(newHP),
        'system.secondWind.max': computedMaxUses,
        'system.secondWind.uses': Math.max(0, uses - 1)
      };

      const improvedSecondWind = HouseRuleService.isEnabled('secondWindImproved');
      // Condition recovery steps delegated to SecondWindRules
      const recoverySteps = SecondWindRules.calculateConditionRecovery(secondWindFeatRules, improvedSecondWind);
      if (recoverySteps > 0) {
        // Also move up condition track (+1 improvement = -1 on numeric scale)
        const currentCT = actor.system.conditionTrack?.current ?? 0;
        improvements['system.conditionTrack.current'] = Math.max(0, currentCT - recoverySteps);

        SWSELogger.debug(`Second Wind condition recovery: moving condition track from ${currentCT} to ${Math.max(0, currentCT - recoverySteps)}`);
      }

      // Add action grants to improvements BEFORE actor update
      if (secondWindFeatRules.grantMoveActionOnUse) {
        improvements['system.actions.moveAction'] = (actor.system.actions?.moveAction ?? 0) + 1;
      }

      if (secondWindFeatRules.grantMovementOnUse && (!secondWindFeatRules.halfHealingForMovement || impetuousMoveSelected)) {
        improvements['system.actions.movement'] = (actor.system.actions?.movement ?? 0) + 1;
      }

      // Batch update: HP restoration + use consumption + optional condition improvement + action grants
      await engine.updateActor(actor, improvements);
      if (activeCombatId) {
        await actor.setFlag?.('foundryvtt-swse', 'secondWindEncounterUsed', activeCombatId);
      }
      if (secondWindFeatRules.regainForcePowerOnUse) {
        await actor.setFlag?.('foundryvtt-swse', 'forcefulRecoveryPending', {
          source: 'Forceful Recovery',
          note: 'Regain one expended Force power after catching a Second Wind.',
          timestamp: Date.now()
        });
      }
      if (secondWindFeatRules.delayedHealing) {
        await actor.setFlag?.('foundryvtt-swse', 'delayedSecondWindHealing', {
          ...secondWindFeatRules.delayedHealing,
          timestamp: Date.now()
        });
      }

      const resultLog = {
        healed: actualHealing,
        newHP,
        maxHP,
        usesRemaining: Math.max(0, uses - 1)
      };

      if (improvedSecondWind) {
        resultLog.conditionImproved = true;
        resultLog.newCondition = Math.max(0, (actor.system.conditionTrack?.current ?? 0) - 1);
      }

      SWSELogger.log(`Second wind used by ${actor.name}`, resultLog);

      return {
        success: true,
        healed: actualHealing,
        newHP,
        usesRemaining: Math.max(0, uses - 1),
        conditionImproved: improvedSecondWind ? true : false,
        newCondition: improvedSecondWind ? Math.max(0, (actor.system.conditionTrack?.current ?? 0) - 1) : undefined,
        grantedMoveAction: secondWindFeatRules.grantMoveActionOnUse ? true : undefined,
        grantedMovement: (secondWindFeatRules.grantMovementOnUse && (!secondWindFeatRules.halfHealingForMovement || impetuousMoveSelected)) ? true : undefined,
        delayedHealing: secondWindFeatRules.delayedHealing ?? undefined
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.applySecondWind failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err
      });
      throw err;
    }
  }

export async function resetSecondWindImpl(engine, actor) {
    try {
      if (!actor) {throw new Error('resetSecondWind() called with no actor');}

      const isDroidActor = actor.type === 'droid' || actor.system?.isDroid === true;
      const conMod = isDroidActor ? 0 : engine._getCanonicalAbilityMod(actor, 'con');
      const fortClassBonus = Number(actor.system?.defenses?.fortitude?.classBonus ?? 0);
      const secondWindFeatRules = MetaResourceFeatResolver.getSecondWindRules(actor);
      const hasToughAsNails = actor.items?.some(i => i.type === 'talent' && i.name === 'Tough as Nails') === true;
      // Max uses calculation delegated to SecondWindRules
      const maxUses = SecondWindRules.calculateMaxUses(conMod, fortClassBonus, secondWindFeatRules, hasToughAsNails);

      await engine.updateActor(actor, {
        'system.secondWind.max': maxUses,
        'system.secondWind.uses': maxUses
      });
      await actor.unsetFlag?.('foundryvtt-swse', 'secondWindEncounterUsed');

      SWSELogger.log(`Second wind reset for ${actor.name}`, {
        restoredUses: maxUses,
        max: maxUses
      });

      return {
        reset: true,
        restoredUses: maxUses,
        max: maxUses
      };

    } catch (err) {
      SWSELogger.error(`ActorEngine.resetSecondWind failed for ${actor?.name ?? 'unknown actor'}`, { error: err });
      throw err;
    }
  }
