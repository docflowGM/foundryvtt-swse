import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ForcePowerEffectsEngine } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-effects-engine.js";

/**
 * Force V2 Checkpoint 03D -- maintained Force power instances.
 *
 * One record per ACTIVATION (never per Power copy and never per power name): a recovered/expended Power copy, a second
 * copy of the same Power, or a second activation of Resist Force / Valor are all independent instances with their own
 * id, effects and maintenance. Records live on the caster at flags.swse.maintainedForcePowers.instances and every write
 * goes through ActorEngine.updateActor.
 *
 * Contract table = printed text only (KOTOR Campaign Guide pp. for Energy Resistance, Force Whirlwind, Resist Force, Valor;
 * Force Unleashed Campaign Guide for Kinetic Combat; Core Rulebook for Force Grip and Move Object). Anything the text does
 * not establish is listed in `deferred` and stays DEFERRED_RULES_REVIEW (docs/audits/swse-rules-decisions-pending.md).
 */

export const CONCENTRATION_BASE_DC = 15; // "DC = 15 + damage taken" (printed identically for every power below that states it)

export const MAINTENANCE_CONTRACTS = Object.freeze({
  'energy resistance': Object.freeze({
    key: 'energy-resistance', automatedEffect: true, maintainAction: 'swift', freshCheckEachRound: false, concentrationOnDamage: true,
    deferred: Object.freeze(['FP-RD-010'])
  }),
  'force whirlwind': Object.freeze({
    key: 'force-whirlwind', maintainAction: 'move', freshCheckEachRound: true, concentrationOnDamage: true,
    // "If a target within a Force whirlwind is attacked or otherwise damaged or moved down the condition track by you or
    // one of your allies, the effects of the Force whirlwind end immediately."
    terminators: Object.freeze(['target-attacked-damaged-or-moved-down-track-by-caster-or-ally']),
    deferred: Object.freeze(['FP-RD-010'])
  }),
  'kinetic combat': Object.freeze({
    key: 'kinetic-combat', maintainAction: 'swift', freshCheckEachRound: false, concentrationOnDamage: true,
    // Maintaining is a swift action; directing the weapon each round is a SEPARATE standard action (6 squares + one attack).
    directAction: 'standard', terminators: Object.freeze(['weapon-beyond-12-squares-of-caster']),
    deferred: Object.freeze(['FP-RD-010'])
  }),
  'resist force': Object.freeze({
    key: 'resist-force', automatedEffect: true, maintainAction: 'swift', freshCheckEachRound: false, concentrationOnDamage: true,
    multipleInstances: true, // "each one must be activated by a separate use of resist Force"
    deferred: Object.freeze(['FP-RD-010'])
  }),
  'valor': Object.freeze({
    key: 'valor', automatedEffect: true, maintainAction: 'swift', freshCheckEachRound: false, concentrationOnDamage: true,
    multipleInstances: true, targetsAlly: true,
    deferred: Object.freeze(['FP-RD-010'])
  }),
  // Core Rulebook Force Grip / Move Object with the official errata (Core pp.97-98) as supplied by the project owner
  // (PR #1165 owner directive, 2026-11-18): maintaining is a STANDARD action and requires a fresh Use the Force check
  // each round. The errata PDF is not in the repository; the owner's statement is the authority recorded as FP-RD-011.
  // Whether damage forces a concentration check is not printed for these two: that stays deferred (null).
  'force grip': Object.freeze({
    key: 'force-grip', maintainAction: 'standard', freshCheckEachRound: true, concentrationOnDamage: null,
    deferred: Object.freeze(['FP-RD-011'])
  }),
  'move object': Object.freeze({
    key: 'move-object', maintainAction: 'standard', freshCheckEachRound: true, concentrationOnDamage: null,
    deferred: Object.freeze(['FP-RD-011'])
  })
});

const normalize = value => String(value ?? '').trim().toLowerCase();
export const maintenanceContractFor = powerOrName =>
  MAINTENANCE_CONTRACTS[normalize(typeof powerOrName === 'string' ? powerOrName : powerOrName?.name)] ?? null;

const STORE = 'flags.swse.maintainedForcePowers';
const maintenanceContractByKey = (key) => Object.values(MAINTENANCE_CONTRACTS).find(c => c.key === key) ?? null;

async function postCard(actor, content) {
  const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
  return SWSEChat.postHTML({ actor, content });
}

// A maintenance or concentration check is a Use the Force check, but NOT an activation check (no natural-20 suite regain).
async function rollUseTheForce(actor, label) {
  const { RollCore } = await import('/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js');
  const { ForceExecutor } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-executor.js');
  const result = await RollCore.execute({
    actor, domain: 'force-power.maintenance', baseBonus: ForceExecutor._getUseTheForceTotal(actor),
    rollOptions: { baseDice: '1d20' }, rollData: actor.getRollData?.() ?? {}, context: { category: 'force', label }
  });
  return Number(result?.finalTotal ?? result?.roll?.total ?? 0) || 0;
}
const readStore = actor =>
  actor?.flags?.swse?.maintainedForcePowers?.instances ?? actor?.getFlag?.('swse', 'maintainedForcePowers')?.instances ?? {};
// The caster's combat turn identity: maintenance is per round; an unmaintained instance lapses when the caster's turn ends.
export function turnKey(combat = globalThis.game?.combat, round = null) {
  if (!combat?.started) return null;
  return `${combat.id}:${round ?? combat.round}`;
}
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const newId = () => `mfp-${globalThis.foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 10)}`;

async function writeInstances(actor, instances) {
  await ActorEngine.updateActor(actor, { [STORE]: { instances } });
}

// Recipient may be a world actor or an unlinked token actor: prefer the stored UUID, fall back to the world actor id.
function resolveActor(record) {
  const byUuid = record.recipientUuid && globalThis.fromUuidSync ? globalThis.fromUuidSync(record.recipientUuid) : null;
  const doc = byUuid?.actor ?? byUuid;
  return doc ?? globalThis.game?.actors?.get?.(record.recipientId) ?? null;
}

/**
 * An enhanced option (Resist Force's second defense, Valor's all-Will-effects) is honored only when the caller names a
 * COMMITTED/FINALIZED receipt in THIS actor's own Force Point ledger that no maintained instance has already used.
 * A client-supplied boolean proves nothing; without a verified receipt the option is simply not applied.
 */
export const ENHANCEMENT_CONTRACT_REFS = Object.freeze({
  'resist-force': 'forcePower:resistForceTwoDefenses',
  'valor': 'forcePower:valorAllWill'
});

export function verifyEnhancementReceipt(actor, receiptId, powerKey = null) {
  if (typeof receiptId !== 'string' || !receiptId) return false;
  const wantedRef = ENHANCEMENT_CONTRACT_REFS[powerKey] ?? null;
  if (!wantedRef) return false;
  const receipts = actor?.flags?.swse?.forcePointLedger?.receipts ?? actor?.getFlag?.('swse', 'forcePointLedger')?.receipts ?? [];
  const receipt = receipts.find(r => r.receiptId === receiptId);
  if (!receipt || receipt.actorId !== actor.id || !['committed', 'finalized'].includes(receipt.state)) return false;
  // Source match: the receipt must have been paid for exactly this power's printed option.
  if (receipt.useKind !== 'ability-option' || receipt.abilitySourceRef !== wantedRef) return false;
  return !Object.values(readStore(actor)).some(r => r.forcePointReceiptId === receiptId);
}

/**
 * Conditional defense bonuses a TARGET holds against an incoming Force power (Resist Force: vs Force powers; Valor: Will vs
 * mind-affecting/fear, or all Will-targeting effects with its Force Point option). The modifier engine cannot apply these
 * automatically (no defense call site knows the attack source), so the Force power card lists them for the table.
 */
export function conditionalDefenseBonuses(target, { descriptors = [] } = {}) {
  const tags = (descriptors ?? []).map(d => String(d).toLowerCase());
  const mindOrFear = tags.some(t => t.includes('mind-affecting') || t.includes('mind affecting') || t.includes('fear'));
  const out = [];
  for (const effect of target?.effects ?? []) {
    if (effect.disabled) continue;
    const intent = effect.flags?.['foundryvtt-swse']?.effectIntent ?? effect.getFlag?.('foundryvtt-swse', 'effectIntent');
    if (!intent || intent.filterType !== 'custom' || intent.category !== 'defense') continue;
    const gate = intent.filterValue;
    const applies = gate === 'against-force-powers'
      || gate === 'against-will-targeting'
      || (gate === 'against-mind-affecting-and-fear' && mindOrFear);
    if (applies) out.push({ defense: intent.target, amount: Number(intent.amount) || 0, gate, label: effect.label ?? effect.name ?? '' });
  }
  return out;
}

export const ForcePowerMaintenance = {
  contractFor: maintenanceContractFor,

  list(actor, { activeOnly = true } = {}) {
    return Object.values(readStore(actor)).filter(r => !activeOnly || r.status === 'active');
  },

  get(actor, instanceId) { return readStore(actor)[instanceId] ?? null; },

  /**
   * Start a maintained instance for a successful activation. Applies the effect(s) tagged with the new instance id.
   * `context`: { target, resistForceDefenses, forcePointSpent }. A Force Point is paid by the caller (ForcePointsService).
   * Returns null when the power has no maintenance contract (it then keeps the plain applyPowerEffect path).
   */
  async begin(actor, power, total, context = {}) {
    const contract = maintenanceContractFor(power);
    if (!actor || !power || !contract) return null;

    const target = context.target ?? context.targetActor ?? null;
    if (contract.targetsAlly && !target) {
      SWSELogger.warn(`SWSE | Force Power Maintenance | ${power.name} requires an ally target; nothing applied.`);
      return null;
    }
    const recipient = contract.targetsAlly ? target : actor;
    const instanceId = newId();
    // Enhanced options need proof of payment; the caller's boolean alone is ignored.
    const receiptId = context.forcePointReceiptId ?? null;
    const paid = verifyEnhancementReceipt(actor, receiptId, contract.key);
    context = { ...context, forcePointSpent: paid };
    const effectIds = await ForcePowerEffectsEngine.applyPowerEffect(actor, power, total, {
      ...context, recipient, instanceId, target: contract.targetsAlly ? target : null
    });
    // A power whose whole printed effect is the automated modifier (Energy Resistance, Resist Force, Valor) is not an
    // instance when nothing was applied (failed check tier, missing defense choice, FP option not paid).
    if (contract.automatedEffect === true && effectIds.length === 0) return null;
    // A power with no automated numeric effect (Force Whirlwind, Kinetic Combat, Force Grip, Move Object) is still a
    // maintainable instance: the record is the authority for whether it is still running.
    const record = {
      id: instanceId, powerKey: contract.key, powerName: power.name, powerItemId: power.id ?? null,
      casterId: actor.id ?? null, recipientId: recipient?.id ?? null, recipientUuid: recipient?.uuid ?? null, effectIds,
      activationTotal: Number(total) || 0, forcePointSpent: paid, forcePointReceiptId: paid ? receiptId : null,
      status: 'active', endedReason: null, rounds: 1,
      startedAt: globalThis.game?.combat?.round ?? null, startedTurnKey: turnKey(), maintainedTurnKey: null
    };
    await writeInstances(actor, { ...readStore(actor), [instanceId]: record });
    await this.postInstanceCard(actor, record).catch(err => SWSELogger.warn('SWSE | Force Power Maintenance | card failed', err));
    return record;
  },

  /**
   * Maintain ONE instance for a round: debit the printed maintenance action, require a fresh Use the Force total where the
   * contract says so, then keep the instance. Fails closed (instance unchanged) if the action cannot be paid.
   */
  async maintain(actor, instanceId, { total = null, gmOverride = false } = {}) {
    const record = this.get(actor, instanceId);
    if (!record || record.status !== 'active') return { maintained: false, reason: 'not-active' };
    const contract = Object.values(MAINTENANCE_CONTRACTS).find(c => c.key === record.powerKey);
    if (!contract?.maintainAction) return { maintained: false, reason: 'deferred', deferred: contract?.deferred ?? [] };
    if (contract.freshCheckEachRound === true && !(Number(total) > 0)) return { maintained: false, reason: 'fresh-check-required' };
    if (contract.freshCheckEachRound === null) return { maintained: false, reason: 'deferred', deferred: contract.deferred };
    const key = turnKey();
    if (key && (record.maintainedTurnKey === key || record.startedTurnKey === key)) return { maintained: false, reason: 'already-current-this-round' };

    const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
    const spend = await ActionEconomyConsumption.spend(actor, contract.maintainAction,
      { actionName: `Maintain ${record.powerName}`, instanceId }, { gmOverride });
    if (spend?.permitted === false) return { maintained: false, reason: 'action-unavailable' };
    try {
      await writeInstances(actor, { ...readStore(actor), [instanceId]: { ...record, rounds: record.rounds + 1, lastMaintainTotal: Number(total) || null, maintainedTurnKey: key } });
    } catch (err) {
      await spend?.rollback?.();
      throw err;
    }
    return { maintained: true, instanceId };
  },

  /**
   * Damage taken while maintaining ONE named instance: Use the Force check, DC = 15 + damage taken, or that instance ends.
   * Never fans out to other instances (whether multiple instances each need a check is FP-RD-010).
   */
  async resolveConcentration(actor, instanceId, { damage, total }) {
    const record = this.get(actor, instanceId);
    if (!record || record.status !== 'active') return { held: false, reason: 'not-active' };
    const contract = Object.values(MAINTENANCE_CONTRACTS).find(c => c.key === record.powerKey);
    if (contract?.concentrationOnDamage !== true) return { held: null, reason: 'deferred', deferred: contract?.deferred ?? [] };
    const dc = CONCENTRATION_BASE_DC + Math.max(0, Number(damage) || 0);
    if (Number(total) >= dc) return { held: true, dc };
    await this.end(actor, instanceId, 'concentration-failed');
    return { held: false, dc };
  },

  /**
   * End of the CASTER's combat turn: every instance that was neither started nor maintained during that round lapses
   * (its printed duration was "until the beginning of your next turn" and it was not extended). Timing: FP-RD-014.
   */
  async lapseUnmaintained(actor, { combat = globalThis.game?.combat, round = null } = {}) {
    const key = turnKey(combat, round);
    if (!actor || !key) return [];
    const ended = [];
    for (const record of this.list(actor)) {
      if (record.startedTurnKey === key || record.maintainedTurnKey === key) continue;
      if (!record.startedTurnKey) continue; // started out of combat: no turn clock to lapse against
      await this.end(actor, record.id, 'not-maintained');
      ended.push(record.id);
    }
    return ended;
  },

  /** Damage to a caster who is maintaining: one prompt per named instance (each resolved on its own; FP-RD-010). */
  async onDamageTaken(actor, damageToHP) {
    const dmg = Math.max(0, Number(damageToHP) || 0);
    if (!actor || dmg <= 0) return [];
    const affected = this.list(actor).filter(r => maintenanceContractByKey(r.powerKey)?.concentrationOnDamage === true);
    if (!affected.length) return [];
    const dc = CONCENTRATION_BASE_DC + dmg;
    const rows = affected.map(r => `<li><strong>${escapeHtml(r.powerName)}</strong> <button type="button" data-swse-maintained-action="concentration" data-actor-uuid="${escapeHtml(actor.uuid)}" data-instance-id="${escapeHtml(r.id)}" data-damage="${dmg}">Use the Force DC ${dc}</button></li>`).join('');
    await postCard(actor, `<div class="swse-maintained-power swse-maintained-power--concentration"><h3>${escapeHtml(actor.name)} took ${dmg} damage while maintaining</h3><p>Each maintained power needs a Use the Force check (DC 15 + damage taken) or it ends.</p><ul>${rows}</ul></div>`);
    return affected.map(r => r.id);
  },

  /** Chat controls for ONE named instance: Maintain (with the printed action / fresh check) and End. */
  async postInstanceCard(actor, record) {
    const contract = maintenanceContractByKey(record.powerKey);
    const action = contract?.maintainAction ? `${contract.maintainAction} action${contract.freshCheckEachRound ? ', new Use the Force check' : ''}` : 'maintenance rules deferred';
    const btn = (verb, label) => `<button type="button" data-swse-maintained-action="${verb}" data-actor-uuid="${escapeHtml(actor.uuid)}" data-instance-id="${escapeHtml(record.id)}">${label}</button>`;
    await postCard(actor, `<div class="swse-maintained-power"><h3>${escapeHtml(record.powerName)} is active</h3><p>Maintain each round (${escapeHtml(action)}); an instance not maintained by the end of your turn ends.</p><div class="swse-maintained-power__controls">${contract?.maintainAction ? btn('maintain', 'Maintain') : ''}${btn('end', 'End')}</div></div>`);
  },

  /** Chat-button entry point (ChatInteractionBridge). Rolls the fresh check itself when the contract needs one. */
  async handleControl(actor, instanceId, verb, { damage = 0 } = {}) {
    const record = this.get(actor, instanceId);
    if (!record) return { ok: false, reason: 'unknown-instance' };
    if (verb === 'end') return this.end(actor, instanceId, 'ended-by-caster');
    const contract = maintenanceContractByKey(record.powerKey);
    if (verb === 'maintain') {
      const total = contract?.freshCheckEachRound === true ? await rollUseTheForce(actor, `Maintain ${record.powerName}`) : null;
      const out = await this.maintain(actor, instanceId, { total });
      await postCard(actor, `<p class="swse-maintained-power__result">${escapeHtml(record.powerName)}: ${out.maintained ? `maintained${total ? ` (Use the Force ${total}; apply this round's result from the power's chart)` : ''}` : `not maintained (${escapeHtml(out.reason)})`}</p>`);
      return out;
    }
    if (verb === 'concentration') {
      const total = await rollUseTheForce(actor, `Concentration: ${record.powerName}`);
      const out = await this.resolveConcentration(actor, instanceId, { damage, total });
      await postCard(actor, `<p class="swse-maintained-power__result">${escapeHtml(record.powerName)}: Use the Force ${total} vs DC ${out.dc ?? '?'} - ${out.held ? 'still maintained' : out.held === null ? 'rules deferred' : 'ends'}</p>`);
      return out;
    }
    return { ok: false, reason: 'unknown-control' };
  },

  /** A printed special termination (Force Whirlwind target attacked/damaged/moved; Kinetic Combat weapon out of range). */
  async terminate(actor, instanceId, trigger) {
    const record = this.get(actor, instanceId);
    const contract = record && Object.values(MAINTENANCE_CONTRACTS).find(c => c.key === record.powerKey);
    if (!record || record.status !== 'active' || !contract?.terminators?.includes(trigger)) return { ended: false };
    await this.end(actor, instanceId, trigger);
    return { ended: true };
  },

  /** End one instance: remove only its effects, then mark the record. Other instances/copies are untouched. */
  async end(actor, instanceId, reason = 'ended') {
    const record = this.get(actor, instanceId);
    if (!record || record.status !== 'active') return { ended: false };
    const recipient = record.recipientId && record.recipientId !== actor.id ? resolveActor(record) : actor;
    if (!recipient) return { ended: false, reason: 'recipient-unavailable' }; // fail closed: record stays active, effect not orphaned
    await ForcePowerEffectsEngine.removeInstanceEffects(recipient, instanceId);
    await writeInstances(actor, { ...readStore(actor), [instanceId]: { ...record, status: 'ended', endedReason: reason } });
    return { ended: true };
  }
};

export default ForcePowerMaintenance;
