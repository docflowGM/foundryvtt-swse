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
  // Core Rulebook text for these two is partly OCR-damaged / not in the repo errata: only what is legible is encoded.
  'force grip': Object.freeze({
    key: 'force-grip', maintainAction: null, freshCheckEachRound: true, concentrationOnDamage: null,
    deferred: Object.freeze(['FP-RD-011'])
  }),
  'move object': Object.freeze({
    key: 'move-object', maintainAction: 'standard', freshCheckEachRound: null, concentrationOnDamage: null,
    deferred: Object.freeze(['FP-RD-011'])
  })
});

const normalize = value => String(value ?? '').trim().toLowerCase();
export const maintenanceContractFor = powerOrName =>
  MAINTENANCE_CONTRACTS[normalize(typeof powerOrName === 'string' ? powerOrName : powerOrName?.name)] ?? null;

const STORE = 'flags.swse.maintainedForcePowers';
const readStore = actor =>
  actor?.flags?.swse?.maintainedForcePowers?.instances ?? actor?.getFlag?.('swse', 'maintainedForcePowers')?.instances ?? {};
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
      activationTotal: Number(total) || 0, forcePointSpent: context.forcePointSpent === true,
      status: 'active', endedReason: null, rounds: 1,
      startedAt: globalThis.game?.combat?.round ?? null
    };
    await writeInstances(actor, { ...readStore(actor), [instanceId]: record });
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

    const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
    const spend = await ActionEconomyConsumption.spend(actor, contract.maintainAction,
      { actionName: `Maintain ${record.powerName}`, instanceId }, { gmOverride });
    if (spend?.permitted === false) return { maintained: false, reason: 'action-unavailable' };
    try {
      await writeInstances(actor, { ...readStore(actor), [instanceId]: { ...record, rounds: record.rounds + 1, lastMaintainTotal: Number(total) || null } });
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
