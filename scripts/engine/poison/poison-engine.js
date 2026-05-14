import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DamageEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-engine.js";
import { ConditionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionEngine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { PoisonRegistry, normalizePoisonKey } from './poison-registry.js';

const TURN_TICK_HOOKS = ['combatTurn', 'combatTurnChange'];

export class PoisonEngine {
  static initializeHooks() {
    if (globalThis.game?.swse?.poisonEngineHooksRegistered) return;
    if (globalThis.game?.swse) game.swse.poisonEngine = this;
    for (const hook of TURN_TICK_HOOKS) {
      Hooks.on(hook, async (...args) => {
        try {
          const actor = this._actorFromCombatHook(...args);
          if (actor) {
            await this.tickRecurringDamage(actor, { trigger: 'startOfTurn', hook });
            await this.tickPoisons(actor, { trigger: 'startOfTurn', hook });
          }
        } catch (err) {
          SWSELogger.warn?.('[PoisonEngine] turn tick failed', err);
        }
      });
    }
    Hooks.on('swse.forcePointSpent', async payload => {
      const actor = payload?.actor || payload?.target || payload;
      if (actor?.system) await this.tickPoisons(actor, { trigger: 'forcePointSpent' });
    });
    if (globalThis.game?.swse) game.swse.poisonEngineHooksRegistered = true;
  }

  static getDefinition(key) {
    return PoisonRegistry.get(key);
  }

  /**
   * Actor/item entry point for poison items in sheets, macros, and compendia.
   * Defaults to a small GM/player dialog when browser UI is available, and
   * falls back to applying to the first targeted token.
   */
  static async usePoisonItem(actor, item, options = {}) {
    if (!actor || !item) return { success: false, reason: 'Missing actor or poison item' };
    const poison = this._poisonFromItem(item);
    if (!poison) return { success: false, reason: 'Item is not a poison definition' };

    const explicitAction = options.action || options.mode;
    if (explicitAction === 'coatWeapon') return this.coatWeaponWithPoison({ actor, weapon: options.weapon, weaponId: options.weaponId, poison, poisonItem: item, delivery: options.delivery });
    if (explicitAction === 'applyToTarget') return this.applyPoisonToSelectedTarget({ sourceActor: actor, poison, poisonItem: item, delivery: options.delivery, exposed: options.exposed });
    if (explicitAction === 'exposeTarget') return this.applyPoisonToSelectedTarget({ sourceActor: actor, poison, poisonItem: item, delivery: options.delivery || 'atmosphere', exposed: true });

    if (typeof Dialog !== 'undefined') return this._openPoisonUseDialog(actor, item, poison, options);
    return this.applyPoisonToSelectedTarget({ sourceActor: actor, poison, poisonItem: item, delivery: options.delivery, exposed: options.exposed });
  }

  static async useMalkiteTechniques(actor, item = null, options = {}) {
    if (!actor) return { success: false, reason: 'Missing actor' };
    const poison = this._applyMalkiteTalentModifiers(actor, PoisonRegistry.get('malkite-techniques-poison'));
    if (!poison) return { success: false, reason: 'Malkite Techniques poison definition missing' };
    const apply = weaponId => this.coatWeaponWithPoison({
      actor,
      weaponId,
      poison,
      poisonItem: item,
      delivery: options.delivery || 'contact',
      malkite: true
    });
    if (options.weaponId) return apply(options.weaponId);
    if (typeof Dialog === 'undefined') return { success: false, reason: 'No weapon selected' };
    const weaponOptions = this._weaponOptions(actor, { slashingOrPiercingOnly: true });
    return new Promise(resolve => {
      new Dialog({
        title: 'Malkite Techniques',
        content: `<form><p>Apply a toxin to a non-energy slashing or piercing weapon.</p><div class="form-group"><label>Weapon</label><select name="weaponId">${weaponOptions}</select></div></form>`,
        buttons: {
          apply: { label: 'Apply Toxin', callback: html => resolve(apply(html.find('[name=weaponId]').val())) },
          cancel: { label: 'Cancel', callback: () => resolve({ success: false, reason: 'cancelled' }) }
        },
        default: 'apply',
        close: () => resolve({ success: false, reason: 'closed' })
      }).render(true);
    });
  }

  static async applyPoisonToSelectedTarget({ sourceActor, poison, poisonItem = null, delivery = null, exposed = false } = {}) {
    const targetActor = this._firstTargetActor();
    if (!targetActor) {
      ui?.notifications?.warn?.('Select a target for the poison.');
      return { success: false, reason: 'No selected target' };
    }
    const chosenDelivery = delivery || poison.delivery?.[0] || 'contact';
    return this.applyPoison({ sourceActor, targetActor, poisonDefinition: poison, delivery: chosenDelivery, sourceItem: poisonItem, immediate: true, exposed });
  }

  static async coatWeaponWithPoison({ actor, weapon = null, weaponId = null, poison = null, poisonItem = null, delivery = null, consumeDose = false, malkite = false } = {}) {
    if (!actor) return { success: false, reason: 'Missing actor' };
    const resolvedPoison = poison || this._poisonFromItem(poisonItem);
    if (!resolvedPoison) return { success: false, reason: 'Missing poison definition' };
    const resolvedWeapon = weapon || actor.items?.get?.(weaponId) || Array.from(actor.items || []).find(item => item.id === weaponId || item._id === weaponId);
    if (!resolvedWeapon || resolvedWeapon.type !== 'weapon') return { success: false, reason: 'Choose a weapon to coat' };

    const chosenDelivery = normalizePoisonKey(delivery || (resolvedPoison.delivery || []).find(d => normalizePoisonKey(d) === 'contact') || resolvedPoison.delivery?.[0] || 'contact');
    const deliveryCheck = await this._validateModifiedDelivery(actor, resolvedPoison, chosenDelivery);
    if (!deliveryCheck.success) return deliveryCheck;
    const coating = {
      poisonKey: resolvedPoison.key,
      poisonName: resolvedPoison.name,
      delivery: chosenDelivery,
      sourceActorId: actor.id || null,
      sourceActorUuid: actor.uuid || null,
      sourceItemId: poisonItem?.id || null,
      sourceItemUuid: poisonItem?.uuid || null,
      remainingTriggers: 1,
      appliedAt: Date.now(),
      consumeDose: !!consumeDose,
      malkite: !!malkite,
      requiresAttackExceedsFortitude: !!malkite
    };
    await resolvedWeapon.update({ 'flags.swse.appliedPoison': coating });
    await this._postUtilityChat(actor, `<h2>${escapeHtml(resolvedPoison.name)} Applied</h2><p><strong>${escapeHtml(resolvedWeapon.name)}</strong> is coated. The poison will trigger the next time the weapon damages a valid target.</p>`);
    return { success: true, weapon: resolvedWeapon, poison: resolvedPoison, coating };
  }

  static async applyPoison({ sourceActor = null, targetActor, poisonKey, poisonDefinition = null, delivery = null, sourceItem = null, immediate = true, exposed = false, prompt = false } = {}) {
    const poison = poisonDefinition ? foundry.utils.deepClone(poisonDefinition) : PoisonRegistry.get(poisonKey);
    if (!poison) return { success: false, reason: `Unknown poison: ${poisonKey}` };
    if (!targetActor) return { success: false, reason: 'No target actor' };

    const chosenDelivery = normalizePoisonKey(delivery || poison.delivery?.[0] || 'contact');
    const deliveryCheck = await this._validateModifiedDelivery(sourceActor, poison, chosenDelivery);
    if (!deliveryCheck.success) return deliveryCheck;
    const blocked = this._getBlockReason(targetActor, poison, chosenDelivery);
    if (blocked) {
      await this._postPoisonChat({ sourceActor, targetActor, poison, delivery: chosenDelivery, blocked });
      return { success: false, blocked: true, reason: blocked, poison };
    }

    const instance = this._buildPoisonInstance({ sourceActor, targetActor, poison, delivery: chosenDelivery, sourceItem, exposed });
    let attackResult = null;
    if (immediate) {
      attackResult = await this.resolvePoisonAttack({ sourceActor, targetActor, poison, instance, delivery: chosenDelivery, isInitial: true });
    }

    const shouldTrack = this._shouldTrackInstance(poison, attackResult, exposed);
    if (shouldTrack) {
      await this._upsertPoisonInstance(targetActor, { ...instance, lastResult: attackResult ? this._compactResult(attackResult) : null });
    }

    return { success: attackResult?.success ?? true, poison, instance, attackResult };
  }

  static async resolvePoisonAttack({ sourceActor = null, targetActor, poisonKey = null, poison = null, instance = null, delivery = null, isInitial = false } = {}) {
    const definition = poison || PoisonRegistry.get(poisonKey || instance?.poisonKey);
    if (!definition || !targetActor) return { success: false, reason: 'Missing poison definition or target actor' };
    const chosenDelivery = normalizePoisonKey(delivery || instance?.delivery || definition.delivery?.[0] || 'contact');
    const blocked = this._getBlockReason(targetActor, definition, chosenDelivery);
    if (blocked) return { success: false, blocked: true, reason: blocked, poison: definition };

    const attackBonus = this._getPoisonAttackBonus({ sourceActor, targetActor, poison: definition, instance, isInitial });
    const roll = await new Roll(`1d20 + ${attackBonus}`).evaluate({ async: true });
    const defenseKey = this._getDefenseKey(definition, instance, isInitial);
    const defense = this._getDefenseIgnoringPoisonExclusions(targetActor, defenseKey, definition);
    const hit = roll.total >= defense;
    const margin = roll.total - defense;

    const damage = await this._resolvePoisonDamage({ targetActor, poison: definition, hit, margin, sourceActor });
    const condition = await this._resolvePoisonCondition({ targetActor, poison: definition, hit, margin, instance, sourceActor });
    const sideEffects = await this._resolveSideEffects({ sourceActor, targetActor, poison: definition, hit, margin, instance });

    const result = { success: hit, hit, roll, total: roll.total, defense, defenseKey, margin, damage, condition, sideEffects, poison: definition };
    await this._postPoisonChat({ sourceActor, targetActor, poison: definition, delivery: chosenDelivery, result, isInitial });

    if (!hit && instance) await this._handlePoisonFailure(targetActor, definition, instance, result);
    else if (hit && instance) await this._upsertPoisonInstance(targetActor, this._advanceInstanceAfterSuccess(instance, result));
    return result;
  }

  static async tickPoisons(actor, { trigger = 'startOfTurn' } = {}) {
    const poisons = this._getActivePoisons(actor);
    if (!poisons.length) return [];
    const results = [];
    for (const instance of poisons) {
      const poison = PoisonRegistry.get(instance.poisonKey);
      if (!poison) continue;
      if (!this._recursOnTrigger(poison, trigger)) continue;
      if (poison.recurrence?.type === 'startOfTurnWhileExposed' && instance.exposed === false) continue;
      const sourceActor = this._resolveActor(instance.sourceActorUuid || instance.sourceActorId);
      const result = await this.resolvePoisonAttack({ sourceActor, targetActor: actor, poison, instance, isInitial: false });
      results.push({ instance, result });
    }
    return results;
  }

  static async treatPoison(actor, { poisonInstanceId = null, poisonKey = null, healer = null, rollTotal = null } = {}) {
    const poisons = this._getActivePoisons(actor);
    const targets = poisons.filter(p => (!poisonInstanceId || p.id === poisonInstanceId) && (!poisonKey || p.poisonKey === normalizePoisonKey(poisonKey)));
    if (!targets.length) return { success: false, reason: 'No matching active poison' };
    const healed = [];
    for (const instance of targets) {
      const poison = PoisonRegistry.get(instance.poisonKey);
      const dc = this._getTreatmentDC({ poison, instance, sourceActor: this._resolveActor(instance.sourceActorUuid || instance.sourceActorId), healer });
      if (rollTotal == null || Number(rollTotal) >= dc) {
        await this.clearPoison(actor, instance.id, { reason: 'treated' });
        healed.push({ instance, dc });
      }
    }
    return { success: healed.length > 0, treated: healed };
  }

  static async clearPoison(actor, poisonInstanceId, { reason = 'cleared' } = {}) {
    const current = this._getActivePoisons(actor);
    const next = current.filter(instance => instance.id !== poisonInstanceId);
    const currentSources = Array.isArray(actor.flags?.swse?.conditionTrack?.poisonSources)
      ? [...actor.flags.swse.conditionTrack.poisonSources]
      : [];
    const poisonSources = currentSources.filter(source => source.instanceId !== poisonInstanceId);
    await ActorEngine.updateActor(actor, {
      'flags.swse.activePoisons': next,
      'system.activePoisons': next,
      'flags.swse.conditionTrack.poisonSources': poisonSources
    });
    if (!next.some(p => p.persistentConditionSource) && !poisonSources.length) {
      await ConditionEngine.setPersistent(actor, false, 'PoisonEngine.clearPoison');
    }
    return { success: true, reason };
  }

  static async applyWeaponPoisonFromAttack({ attacker, target, weapon, damage = 0, attackTotal = null } = {}) {
    if (!attacker || !target || !weapon || Number(damage || 0) <= 0) return null;
    const explicitCoating = weapon.flags?.swse?.appliedPoison;
    const coating = explicitCoating?.poisonKey ? explicitCoating : this._getIntrinsicWeaponPoisonCoating(attacker, weapon);
    if (!coating?.poisonKey) return null;
    const poison = PoisonRegistry.get(coating.poisonKey);
    if (!poison) return null;
    const sourceActor = this._resolveActor(coating.sourceActorUuid || coating.sourceActorId) || attacker;
    if (coating.requiresAttackExceedsFortitude) {
      const fortitude = this._getDefenseIgnoringPoisonExclusions(target, 'fortitude', poison);
      if (Number(attackTotal ?? 0) < fortitude) {
        await this._postUtilityChat(attacker, `<h2>${escapeHtml(poison.name)}</h2><p>The coated attack did not exceed <strong>${escapeHtml(target.name)}</strong>'s Fortitude Defense, so the poison does not take hold.</p>`);
        return { success: false, reason: 'attack did not exceed Fortitude Defense', poison };
      }
    }
    const result = await this.applyPoison({
      sourceActor,
      targetActor: target,
      poisonDefinition: this._applyMalkiteTalentModifiers(sourceActor, poison),
      delivery: coating.delivery || poison.delivery?.[0] || 'contact',
      sourceItem: weapon,
      immediate: true
    });
    if (!coating.intrinsic) {
      const remaining = Math.max(0, Number(coating.remainingTriggers ?? 1) - 1);
      if (remaining <= 0) await weapon.update({ 'flags.swse.appliedPoison': null });
      else await weapon.update({ 'flags.swse.appliedPoison.remainingTriggers': remaining });
    }
    return result;
  }

  static _getIntrinsicWeaponPoisonCoating(attacker, weapon) {
    if (!weapon) return null;
    if (this._isVileWeapon(weapon)) {
      return {
        poisonKey: 'sith-poison',
        poisonName: 'Sith Poison',
        delivery: 'contact',
        sourceActorId: attacker?.id || null,
        sourceActorUuid: attacker?.uuid || null,
        sourceItemId: weapon.id || null,
        sourceItemUuid: weapon.uuid || null,
        remainingTriggers: null,
        intrinsic: true,
        sithAlchemyTrait: 'Vile Weapon'
      };
    }

    const isNaturalWeapon = weapon.flags?.swse?.isNaturalWeapon || weapon.system?.naturalWeapon || /natural weapon|claw|bite|tusk|horn|tail/i.test(String(weapon.name || ''));
    if (isNaturalWeapon && this._actorHasAbility(attacker, 'vile-natural-weapons')) {
      return {
        poisonKey: 'sith-poison',
        poisonName: 'Sith Poison',
        delivery: 'contact',
        sourceActorId: attacker?.id || null,
        sourceActorUuid: attacker?.uuid || null,
        sourceItemId: weapon.id || null,
        sourceItemUuid: weapon.uuid || null,
        remainingTriggers: null,
        intrinsic: true,
        sithAlchemyTrait: 'Vile Natural Weapons'
      };
    }
    return null;
  }

  static _isJaggedWeapon(weapon) {
    if (!weapon) return false;
    const flags = weapon.flags?.swse || {};
    const system = weapon.system || {};
    const traits = [
      flags.sithAlchemyTrait,
      flags.sithAlchemy?.trait,
      flags.sithAlchemy?.weaponTrait,
      system.sithAlchemyTrait,
      system.sithWeaponTrait,
      system.trait,
      system.description,
      weapon.name
    ].flat().filter(Boolean).join(' ');
    return flags.jaggedWeapon === true || flags.sithAlchemy?.jaggedWeapon === true || /jagged weapon/i.test(traits);
  }

  static _isVileWeapon(weapon) {
    if (!weapon) return false;
    const flags = weapon.flags?.swse || {};
    const system = weapon.system || {};
    const traits = [
      flags.sithAlchemyTrait,
      flags.sithAlchemy?.trait,
      flags.sithAlchemy?.weaponTrait,
      system.sithAlchemyTrait,
      system.sithWeaponTrait,
      system.trait,
      system.description,
      weapon.name
    ].flat().filter(Boolean).join(' ');
    return flags.vileWeapon === true || flags.sithAlchemy?.vileWeapon === true || /vile weapon|laced with sith poison/i.test(traits);
  }

  static async applyNaturalWeaponPoisonFromAttack({ attacker, target, weapon, damage = 0 } = {}) {
    if (!attacker || !target || !weapon || Number(damage || 0) <= 0) return null;
    const isNaturalWeapon = weapon.flags?.swse?.isNaturalWeapon || weapon.system?.naturalWeapon || /natural weapon|claw|bite|tusk|horn|tail/i.test(String(weapon.name || ''));
    if (!isNaturalWeapon) return null;
    const hasSavripPoison = this._actorHasSpeciesTrait(attacker, 'Mantellian Savrip', 'Poison') || this._actorHasAbility(attacker, 'mantellian-savrip-poison') || this._actorHasAbility(attacker, 'natural-weapon-poison');
    if (!hasSavripPoison) return null;
    return this.applyPoison({ sourceActor: attacker, targetActor: target, poisonKey: 'mantellian-savrip-natural-poison', delivery: 'contact', sourceItem: weapon, immediate: true });
  }

  static async queueJaggedWeaponDamageFromAttack({ attacker, target, weapon, damage = 0 } = {}) {
    if (!attacker || !target || !weapon || Number(damage || 0) <= 0) return null;
    if (!this._isJaggedWeapon(weapon)) return null;
    if (this._isNonLiving(target)) return { success: false, reason: 'Jagged Weapon only affects living creatures.' };
    const current = Array.isArray(target.flags?.swse?.pendingRecurringDamage) ? [...target.flags.swse.pendingRecurringDamage] : [];
    const instance = {
      id: `jagged-${weapon.id || weapon._id || 'weapon'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      key: 'jagged-weapon',
      name: 'Jagged Weapon',
      formula: '1d4',
      damageType: 'slashing',
      trigger: 'startOfTurn',
      remainingTriggers: 1,
      sourceActorId: attacker.id || null,
      sourceActorUuid: attacker.uuid || null,
      sourceItemId: weapon.id || null,
      sourceItemUuid: weapon.uuid || null,
      createdAt: Date.now()
    };
    current.push(instance);
    await ActorEngine.updateActor(target, { 'flags.swse.pendingRecurringDamage': current });
    await this._postUtilityChat(attacker, `<h2>Jagged Weapon</h2><p><strong>${escapeHtml(target.name)}</strong> will take 1d4 damage at the start of their next turn.</p>`);
    return { success: true, instance };
  }

  static async tickRecurringDamage(actor, { trigger = 'startOfTurn' } = {}) {
    const pending = Array.isArray(actor?.flags?.swse?.pendingRecurringDamage) ? [...actor.flags.swse.pendingRecurringDamage] : [];
    if (!pending.length) return [];
    const results = [];
    const remaining = [];
    for (const instance of pending) {
      if ((instance.trigger || 'startOfTurn') !== trigger) {
        remaining.push(instance);
        continue;
      }
      const roll = await new Roll(instance.formula || '1d4').evaluate({ async: true });
      await DamageEngine.applyDamage(actor, roll.total, { damageType: instance.damageType || 'untyped', targetTempHP: true });
      await this._postUtilityChat(actor, `<h2>${escapeHtml(instance.name || 'Recurring Damage')}</h2><p><strong>${escapeHtml(actor.name)}</strong> takes ${roll.total} damage.</p>`);
      const left = Number(instance.remainingTriggers ?? 1) - 1;
      if (left > 0) remaining.push({ ...instance, remainingTriggers: left, lastTriggeredAt: Date.now() });
      results.push({ instance, roll });
    }
    await ActorEngine.updateActor(actor, { 'flags.swse.pendingRecurringDamage': remaining });
    return results;
  }

  static async applyMalkitePoison({ sourceActor, targetActor, sourceItem = null } = {}) {
    const definition = this._applyMalkiteTalentModifiers(sourceActor, PoisonRegistry.get('malkite-techniques-poison'));
    return this.applyPoison({ sourceActor, targetActor, poisonDefinition: definition, delivery: 'contact', sourceItem, immediate: true });
  }

  static async treatPoisonWithSkill({ targetActor, healer = null, poisonInstanceId = null, poisonKey = null, skillKey = null } = {}) {
    const actor = healer || targetActor;
    if (!actor || !targetActor) return { success: false, reason: 'Missing actor' };
    const targets = this._getActivePoisons(targetActor).filter(p => (!poisonInstanceId || p.id === poisonInstanceId) && (!poisonKey || p.poisonKey === normalizePoisonKey(poisonKey)));
    if (!targets.length) return { success: false, reason: 'No matching active poison' };
    const instance = targets[0];
    const poison = PoisonRegistry.get(instance.poisonKey);
    const skill = skillKey || poison?.treatment?.skill || 'treatInjury';
    const mod = this._getSkillTotal(actor, skill);
    const roll = await new Roll(`1d20 + ${mod}`).evaluate({ async: true });
    const result = await this.treatPoison(targetActor, { poisonInstanceId: instance.id, healer: actor, rollTotal: roll.total });
    const dc = this._getTreatmentDC({ poison, instance, sourceActor: this._resolveActor(instance.sourceActorUuid || instance.sourceActorId), healer: actor });
    const kitNote = this._treatmentKitNote(actor, poison);
    await this._postUtilityChat(actor, `<h2>Treat Poison</h2><p><strong>${escapeHtml(actor.name)}</strong> attempts to treat <strong>${escapeHtml(instance.poisonName)}</strong> on <strong>${escapeHtml(targetActor.name)}</strong>.</p><p><strong>${escapeHtml(skill)}</strong>: ${roll.total} vs DC ${escapeHtml(dc)} — ${result.success ? '<strong>treated</strong>' : 'not treated'}.</p>${kitNote ? `<p>${kitNote}</p>` : ''}`);
    return { ...result, roll, skill };
  }

  static async endPoisonExposure(actor, poisonInstanceId = null) {
    const poisons = this._getActivePoisons(actor);
    const next = poisons.map(instance => {
      if (poisonInstanceId && instance.id !== poisonInstanceId) return instance;
      return { ...instance, exposed: false, exposureEndedAt: Date.now() };
    });
    await ActorEngine.updateActor(actor, { 'flags.swse.activePoisons': next, 'system.activePoisons': next });
    return { success: true, activePoisons: next };
  }

  static async _handlePoisonFailure(targetActor, poison, instance, result) {
    const failures = Number(instance?.consecutiveFailures || 0) + 1;
    const neutralizeAfter = Number(poison?.special?.neutralizeAfterConsecutiveFailures || 0);
    if (neutralizeAfter > 0 && failures < neutralizeAfter) {
      await this._upsertPoisonInstance(targetActor, { ...instance, consecutiveFailures: failures, lastResult: this._compactResult(result), updatedAt: Date.now() });
      return { success: false, retained: true, failures, neutralizeAfter };
    }
    return this.clearPoison(targetActor, instance.id, { reason: neutralizeAfter > 0 ? `${failures} consecutive failures` : 'Poison attack failed' });
  }

  static _applyMalkiteTalentModifiers(actor, poison) {
    if (!poison || !actor) return poison;
    const result = foundry.utils.deepClone(poison);
    if (this._hasOwnedTalent(actor, 'Vicious Poison')) result.attack = { ...(result.attack || {}), bonusAdjustment: Number(result.attack?.bonusAdjustment || 0) + 2 };
    if (this._hasOwnedTalent(actor, 'Undetectable Poison')) result.treatment = { ...(result.treatment || {}), dcAdjustment: Number(result.treatment?.dcAdjustment || 0) + 5 };
    if (this._hasOwnedTalent(actor, 'Numbing Poison')) result.sideEffects = [...(result.sideEffects || []), { type: 'denyDexToReflex', whilePoisoned: true }];
    return result;
  }

  static _getPoisonAttackBonus({ sourceActor, poison, instance, isInitial }) {
    const attack = poison.attack || {};
    if (attack.formula) return this._evaluateInlineFormula(attack.formula, sourceActor, poison, instance);
    const base = Number(attack.bonus ?? poison.attackBonus ?? 0) || 0;
    const adjust = Number(attack.bonusAdjustment ?? instance?.attackBonusAdjustment ?? 0) || 0;
    return base + adjust;
  }

  static _allowedDeliveriesForActor(actor, poison) {
    const base = new Set((poison?.delivery || []).map(normalizePoisonKey).filter(Boolean));
    if (this._hasOwnedTalent(actor, 'Modify Poison')) {
      for (const delivery of ['contact', 'ingested', 'inhaled']) base.add(delivery);
    }
    return [...base];
  }

  static async _validateModifiedDelivery(actor, poison, chosenDelivery) {
    if (!actor || !poison || !chosenDelivery) return { success: true };
    const base = (poison.delivery || []).map(normalizePoisonKey);
    const chosen = normalizePoisonKey(chosenDelivery);
    if (base.includes(chosen)) return { success: true };
    if (!this._hasOwnedTalent(actor, 'Modify Poison')) return { success: false, reason: `${poison.name} cannot normally be delivered as ${chosen}.` };
    if (!['contact', 'ingested', 'inhaled'].includes(chosen)) return { success: false, reason: 'Modify Poison supports Contact, Ingested, and Inhaled delivery methods.' };
    const dc = this._getTreatmentDC({ poison, sourceActor: actor });
    const mod = this._getSkillTotal(actor, 'knowledgeLifeSciences');
    const roll = await new Roll(`1d20 + ${mod}`).evaluate({ async: true });
    const success = roll.total >= dc;
    await this._postUtilityChat(actor, `<h2>Modify Poison</h2><p><strong>${escapeHtml(actor.name)}</strong> modifies <strong>${escapeHtml(poison.name)}</strong> for ${escapeHtml(chosen)} delivery.</p><p><strong>Knowledge (Life Sciences):</strong> ${roll.total} vs DC ${escapeHtml(dc)} — ${success ? '<strong>success</strong>' : 'fails'}.</p>`);
    return success ? { success: true, roll, dc } : { success: false, reason: 'Modify Poison check failed', roll, dc };
  }

  static _getTreatmentDC({ poison, instance, sourceActor }) {
    const treatment = poison?.treatment || {};
    if (treatment.dcFormula) return this._evaluateInlineFormula(treatment.dcFormula, sourceActor, poison, instance) + Number(treatment.dcAdjustment || 0);
    return Number(treatment.dc ?? instance?.treatDC ?? 15) + Number(treatment.dcAdjustment || 0);
  }

  static _evaluateInlineFormula(formula, actor) {
    const heroicLevel = Number(actor?.system?.heroicLevel ?? actor?.system?.level ?? actor?.system?.details?.level ?? 1) || 1;
    let expression = String(formula || '0')
      // Poison attack formulas are attack-bonus formulas in this engine.
      // Strip the d20 term when source text stores a full attack expression.
      .replace(/1d20\s*\+?/gi, '')
      .replace(/@characterLevel/g, heroicLevel)
      .replace(/@heroicLevel/g, heroicLevel)
      .replace(/@halfHeroicLevel/g, Math.floor(heroicLevel / 2))
      .replace(/[^0-9+\-*/ ().]/g, '');
    try {
      // eslint-disable-next-line no-new-func
      return Number(Function(`"use strict"; return (${expression || '0'});`)()) || 0;
    } catch (_err) {
      return expression.split('+').map(part => Number(part.trim()) || 0).reduce((sum, value) => sum + value, 0);
    }
  }

  static _getDefenseKey(poison, instance, isInitial) {
    if (!isInitial && poison.attack?.recurrenceDefense) return poison.attack.recurrenceDefense;
    return poison.attack?.defense || 'fortitude';
  }

  static _getDefenseIgnoringPoisonExclusions(actor, defenseKey, poison) {
    const derived = actor.system?.derived?.defenses?.[defenseKey];
    const system = actor.system?.defenses?.[defenseKey];
    let total = Number(derived?.total ?? system?.total ?? system?.value ?? 10) || 10;
    const ignores = poison.attack?.ignores || [];
    if (defenseKey === 'fortitude' && ignores.includes('equipmentFortitude')) {
      const armorBonus = Number(derived?.armorBonus ?? system?.equipment ?? system?.armor ?? system?.armorMastery ?? 0) || 0;
      total -= Math.max(0, armorBonus);
    }
    return Math.max(1, total);
  }

  static async _resolvePoisonDamage({ targetActor, poison, hit, margin, sourceActor }) {
    const damageData = poison.damage || {};
    if (!hit && !damageData.halfOnMiss) return { applied: false, amount: 0 };
    if (!damageData.formula) return { applied: false, amount: 0 };
    const roll = await new Roll(this._replaceDamageFormula(damageData.formula, sourceActor)).evaluate({ async: true });
    const amount = hit ? roll.total : Math.floor(roll.total / 2);
    if (amount > 0) await DamageEngine.applyDamage(targetActor, amount, { damageType: 'poison', targetTempHP: true });
    return { applied: amount > 0, amount, formula: damageData.formula, rollTotal: roll.total, halfOnMiss: !hit && damageData.halfOnMiss };
  }

  static _replaceDamageFormula(formula, actor) {
    const heroicLevel = Number(actor?.system?.heroicLevel ?? actor?.system?.level ?? 1) || 1;
    return String(formula || '')
      .replace(/@halfHeroicLevel/g, String(Math.floor(heroicLevel / 2)))
      .replace(/@heroicLevel/g, String(heroicLevel))
      .replace(/@characterLevel/g, String(heroicLevel));
  }

  static async _resolvePoisonCondition({ targetActor, poison, hit, margin, instance }) {
    const track = poison.damage?.conditionTrack || {};
    let steps = 0;
    if (hit) steps = Math.abs(Number(track.steps || 0));
    else steps = Math.abs(Number(track.onMissSteps || 0));
    if (poison.special?.persistentOnBeatDefenseBy && margin >= Number(poison.special.persistentOnBeatDefenseBy)) {
      steps = Math.max(steps, 1);
    }
    if (steps <= 0) return { applied: false, steps: 0 };
    const current = Number(targetActor.system?.conditionTrack?.current ?? 0) || 0;
    await ConditionEngine.applyConditionStep(targetActor, current + steps, { source: poison.name, poison: true });
    if (track.persistent || poison.special?.persistentOnBeatDefenseBy) {
      await ConditionEngine.setPersistent(targetActor, true, poison.name);
      await this._recordPoisonConditionSource(targetActor, poison, instance, steps);
    }
    return { applied: true, steps, persistent: !!track.persistent };
  }

  static async _resolveSideEffects({ sourceActor, targetActor, poison, hit, margin, instance }) {
    const effects = [];
    if (!hit) return effects;
    if (poison.damage?.skillPenalty) {
      await this._createEffect(targetActor, {
        name: `${poison.name} Skill Impairment`,
        icon: 'icons/svg/acid.svg',
        durationRounds: 1,
        changes: [{ key: 'flags.swse.skillPenalty.poison', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: poison.damage.skillPenalty, priority: 25 }],
        flags: { swse: { poisonKey: poison.key, skillPenalty: poison.damage.skillPenalty } }
      });
      effects.push('skillPenalty');
    }
    if ((poison.sideEffects || []).some(effect => effect.type === 'denyDexToReflex')) {
      await this._createEffect(targetActor, {
        name: 'Numbing Poison',
        icon: 'icons/svg/paralysis.svg',
        changes: [{ key: 'flags.swse.defenses.denyDexToReflex', mode: CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE ?? 5, value: true, priority: 25 }],
        flags: { swse: { poisonKey: poison.key, malkiteTalent: 'Numbing Poison' } }
      });
      effects.push('denyDexToReflex');
    }
    const darkSideIncrease = Number(poison.damage?.darkSideScore || poison.special?.recurrenceDarkSideScore || 0);
    const recurrenceOnly = poison.special?.recurrenceEffect === 'darkSideScoreIncrease';
    if (darkSideIncrease && (!recurrenceOnly || instance?.initialResolved === true)) {
      const current = Number(targetActor.system?.darkSideScore?.value ?? targetActor.system?.darkSide ?? 0) || 0;
      await ActorEngine.updateActor(targetActor, { 'system.darkSideScore.value': current + darkSideIncrease });
      effects.push('darkSideScore');
    }
    if (poison.special?.endTrackEffect) {
      await ActorEngine.updateActor(targetActor, { [`flags.swse.poisonSpecial.${poison.key}.endTrackEffect`]: poison.special.endTrackEffect });
      effects.push(poison.special.endTrackEffect);
    }
    return effects;
  }

  static async _createEffect(actor, data = {}) {
    const effectData = {
      name: data.name || 'Poison Effect',
      icon: data.icon || 'icons/svg/poison.svg',
      disabled: false,
      duration: data.durationRounds ? { rounds: data.durationRounds } : {},
      changes: data.changes || [],
      flags: data.flags || {}
    };
    if (typeof actor?.createEmbeddedDocuments === 'function') return actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
    return null;
  }

  static async _recordPoisonConditionSource(actor, poison, instance, steps) {
    const sources = Array.isArray(actor.flags?.swse?.conditionTrack?.poisonSources) ? [...actor.flags.swse.conditionTrack.poisonSources] : [];
    sources.push({ poisonKey: poison.key, poisonName: poison.name, instanceId: instance?.id, steps, timestamp: Date.now() });
    await ActorEngine.updateActor(actor, { 'flags.swse.conditionTrack.poisonSources': sources });
  }

  static _buildPoisonInstance({ sourceActor, targetActor, poison, delivery, sourceItem, exposed }) {
    return {
      id: `poison-${poison.key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      poisonKey: poison.key,
      poisonName: poison.name,
      sourceActorId: sourceActor?.id || null,
      sourceActorUuid: sourceActor?.uuid || null,
      sourceItemId: sourceItem?.id || null,
      sourceItemUuid: sourceItem?.uuid || null,
      delivery,
      exposed: !!exposed,
      recurrence: poison.recurrence?.type || 'none',
      treatment: poison.treatment || null,
      persistentConditionSource: !!poison.damage?.conditionTrack?.persistent,
      createdAt: Date.now(),
      consecutiveFailures: 0,
      successes: 0
    };
  }

  static _advanceInstanceAfterSuccess(instance, result) {
    return { ...instance, successes: Number(instance.successes || 0) + 1, consecutiveFailures: 0, initialResolved: true, lastResult: this._compactResult(result), updatedAt: Date.now() };
  }

  static _compactResult(result) {
    return { hit: result.hit, total: result.total, defense: result.defense, margin: result.margin, damage: result.damage?.amount || 0, conditionSteps: result.condition?.steps || 0, timestamp: Date.now() };
  }

  static async _upsertPoisonInstance(actor, instance) {
    const current = this._getActivePoisons(actor).filter(p => p.id !== instance.id);
    current.push(instance);
    await ActorEngine.updateActor(actor, { 'flags.swse.activePoisons': current, 'system.activePoisons': current });
  }

  static _getActivePoisons(actor) {
    const fromFlags = actor?.flags?.swse?.activePoisons;
    const fromSystem = actor?.system?.activePoisons;
    return Array.isArray(fromFlags) ? [...fromFlags] : (Array.isArray(fromSystem) ? [...fromSystem] : []);
  }

  static _shouldTrackInstance(poison, attackResult, exposed) {
    const recurrence = poison.recurrence?.type || 'none';
    if (recurrence === 'none') return false;
    if (recurrence === 'startOfTurnWhileExposed') return !!exposed || !!attackResult?.success;
    return !!attackResult?.success;
  }

  static _recursOnTrigger(poison, trigger) {
    const type = poison.recurrence?.type || 'none';
    if (trigger === 'startOfTurn') return ['startOfTurnUntilTreated', 'startOfTurnWhileExposed', 'startOfTurnUntilAttackFailsOrTreated'].includes(type);
    if (trigger === 'forcePointSpent') return type === 'onForcePointSpent';
    return false;
  }

  static _getBlockReason(targetActor, poison, delivery) {
    if (this._isNonLiving(targetActor)) return 'Poisons affect only living creatures; droids and vehicles are immune.';
    if (this._hasPoisonImmunity(targetActor)) return `${targetActor.name} is immune to poison.`;
    if ((delivery === 'inhaled' || delivery === 'atmosphere') && this._hasFunctionalBreathMask(targetActor)) return 'Functional breath mask blocks inhaled poison.';
    return null;
  }

  static _isNonLiving(actor) {
    return actor?.type === 'vehicle' || actor?.type === 'droid' || actor?.system?.isDroid === true || actor?.system?.speciesRules?.speciesActsAsDroid === true;
  }

  static _hasPoisonImmunity(actor) {
    if (actor?.system?.immunities?.poison === true) return true;
    const species = actor?.system?.immunities?.species?.immune || [];
    if (species.some(entry => normalizePoisonKey(entry?.key || entry?.name || entry) === 'poison')) return true;
    return Array.from(actor?.items || []).some(item => /poison immunity|immune to poison/i.test(`${item.name} ${item.system?.description || item.system?.benefit || ''}`));
  }

  static _hasFunctionalBreathMask(actor) {
    return Array.from(actor?.items || []).some(item => /breath mask|breathing apparatus|environmental suit|life-support chamber/i.test(item?.name || '') && item.system?.equipped !== false && item.system?.functional !== false);
  }

  static _actorHasSpeciesTrait(actor, speciesName, traitName) {
    const species = `${actor?.system?.species || actor?.system?.race || ''}`;
    const traits = [actor?.system?.special, actor?.system?.canonicalTraits, actor?.flags?.swse?.speciesTraits].flat().filter(Boolean);
    return normalizePoisonKey(species).includes(normalizePoisonKey(speciesName)) || traits.some(t => `${t?.name || t}`.toLowerCase().includes(traitName.toLowerCase()));
  }

  static _actorHasAbility(actor, key) {
    const wanted = normalizePoisonKey(key);
    return Array.from(actor?.items || []).some(item => normalizePoisonKey(item.flags?.swse?.speciesAbilityId || item.flags?.swse?.abilityKey || item.system?.speciesAbility?.id || item.name) === wanted);
  }

  static _hasOwnedTalent(actor, name) {
    const wanted = normalizePoisonKey(name);
    return Array.from(actor?.items || []).some(item => (item.type === 'talent' || item.type === 'feat' || item.type === 'combat-action') && normalizePoisonKey(item.name) === wanted);
  }

  static _treatmentKitNote(healer, poison) {
    if (!poison?.treatment?.requiresMedicalKit) return '';
    if (this._hasOwnedTalent(healer, 'Natural Healing')) {
      return '<strong>Natural Healing:</strong> this character can attempt Treat Poison without a Medical Kit when the GM agrees appropriate natural substitutes are available.';
    }
    return '<strong>Requires Medical Kit</strong> unless another rule, such as Natural Healing with GM-approved substitutes, applies.';
  }

  static _poisonFromItem(item) {
    if (!item) return null;
    const key = item.flags?.swse?.poisonKey || item.system?.key || normalizePoisonKey(item.name);
    const registered = PoisonRegistry.get(key);
    if (registered) return foundry.utils.deepClone(registered);
    if (item.type === 'poison') {
      return { key: normalizePoisonKey(item.name), name: item.name, ...(foundry.utils.deepClone(item.system || {})) };
    }
    return null;
  }

  static _firstTargetActor() {
    const target = Array.from(game?.user?.targets || [])[0];
    return target?.actor || null;
  }

  static _weaponOptions(actor, { slashingOrPiercingOnly = false } = {}) {
    return Array.from(actor?.items || [])
      .filter(item => item.type === 'weapon')
      .filter(item => {
        if (!slashingOrPiercingOnly) return true;
        const text = `${item.system?.damageType || ''} ${item.system?.combat?.damageType || ''} ${item.name || ''}`.toLowerCase();
        return /(slashing|piercing|blade|knife|sword|claw|bite|tusk|horn|tail)/.test(text) && !/energy|blaster|laser|ion/.test(text);
      })
      .map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
      .join('');
  }

  static async _openPoisonUseDialog(actor, item, poison, options = {}) {
    const canCoat = (poison.delivery || []).map(normalizePoisonKey).includes('contact');
    const weaponOptions = this._weaponOptions(actor);
    const content = `<form>
      <p><strong>${escapeHtml(poison.name)}</strong></p>
      <div class="form-group"><label>Delivery</label><select name="delivery">${this._allowedDeliveriesForActor(actor, poison).map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}${(poison.delivery || []).map(normalizePoisonKey).includes(normalizePoisonKey(d)) ? '' : ' (Modify Poison)'}</option>`).join('')}</select></div>
      ${canCoat ? `<div class="form-group"><label>Weapon to Coat</label><select name="weaponId">${weaponOptions}</select></div>` : ''}
    </form>`;
    return new Promise(resolve => {
      new Dialog({
        title: `Use Poison: ${poison.name}`,
        content,
        buttons: {
          apply: { label: 'Apply to Target', callback: html => resolve(this.applyPoisonToSelectedTarget({ sourceActor: actor, poison, poisonItem: item, delivery: html.find('[name=delivery]').val() })) },
          expose: { label: 'Expose Target', callback: html => resolve(this.applyPoisonToSelectedTarget({ sourceActor: actor, poison, poisonItem: item, delivery: html.find('[name=delivery]').val(), exposed: true })) },
          ...(canCoat ? { coat: { label: 'Coat Weapon', callback: html => resolve(this.coatWeaponWithPoison({ actor, weaponId: html.find('[name=weaponId]').val(), poison, poisonItem: item, delivery: html.find('[name=delivery]').val() })) } } : {}),
          cancel: { label: 'Cancel', callback: () => resolve({ success: false, reason: 'cancelled' }) }
        },
        default: canCoat ? 'coat' : 'apply',
        close: () => resolve({ success: false, reason: 'closed' })
      }).render(true);
    });
  }

  static _getSkillTotal(actor, skillKey) {
    const key = normalizePoisonKey(skillKey).replace(/-/g, '');
    const aliases = { treatinjury: 'treatInjury', usetheforce: 'useTheForce', knowledgelifesciences: 'knowledgeLifeSciences' };
    const canonical = aliases[key] || skillKey;
    const skill = actor?.system?.derived?.skills?.[canonical] || actor?.system?.skills?.[canonical] || actor?.system?.skills?.[key];
    return Number(skill?.total ?? skill?.mod ?? skill?.value ?? 0) || 0;
  }

  static async _postUtilityChat(actor, content) {
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
  }

  static _actorFromCombatHook(...args) {
    const combat = args[0];
    const combatant = args[1]?.combatant || args[1] || combat?.combatant;
    return combatant?.actor || combat?.combatant?.actor || null;
  }

  static _resolveActor(uuidOrId) {
    if (!uuidOrId) return null;
    if (typeof fromUuidSync === 'function' && String(uuidOrId).includes('.')) return fromUuidSync(uuidOrId);
    return game?.actors?.get?.(uuidOrId) || null;
  }

  static async _postPoisonChat({ sourceActor, targetActor, poison, delivery, result = null, blocked = null, isInitial = false }) {
    const speaker = sourceActor ? ChatMessage.getSpeaker({ actor: sourceActor }) : ChatMessage.getSpeaker({ actor: targetActor });
    const lines = [`<h2>${escapeHtml(poison.name)}</h2>`, `<p><strong>Target:</strong> ${escapeHtml(targetActor?.name || 'Unknown')} ${delivery ? `(${escapeHtml(delivery)})` : ''}</p>`];
    if (blocked) lines.push(`<p><strong>Blocked:</strong> ${escapeHtml(blocked)}</p>`);
    if (result) {
      lines.push(`<p><strong>Poison Attack:</strong> ${result.total} vs ${escapeHtml(result.defenseKey)} ${result.defense} — ${result.hit ? '<strong>success</strong>' : 'fails'}.</p>`);
      if (result.damage?.applied) lines.push(`<p><strong>Damage:</strong> ${result.damage.amount}${result.damage.halfOnMiss ? ' (half on miss)' : ''}</p>`);
      if (result.condition?.applied) lines.push(`<p><strong>Condition Track:</strong> -${result.condition.steps} step${result.condition.steps === 1 ? '' : 's'}${result.condition.persistent ? ' (persistent poison condition)' : ''}.</p>`);
      if (result.sideEffects?.length) lines.push(`<p><strong>Side Effects:</strong> ${result.sideEffects.map(escapeHtml).join(', ')}</p>`);
    }
    if (poison.treatment) {
      const kitText = poison.treatment.requiresMedicalKit ? ' with Medical Kit/Natural Healing substitute' : '';
      lines.push(`<p><strong>Treatment:</strong> ${escapeHtml(poison.treatment.skill || 'Treat Injury')} DC ${escapeHtml(poison.treatment.dc ?? poison.treatment.dcFormula ?? '?')}${kitText}.</p>`);
    }
    return ChatMessage.create({ speaker, content: lines.join('') });
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}
