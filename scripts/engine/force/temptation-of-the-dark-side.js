import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { ownedAbilityInstance } from "/systems/foundryvtt-swse/scripts/utils/canonical-ability-identity.js";

/**
 * Temptation of the Dark Side -- Force Unleashed Campaign Guide, p. 85 (OPTIONAL rule: "included only if the GM wants").
 *
 * Two SEPARATE optional pathways, each paid with its own Force Point as a free action and each requiring Force Sensitivity:
 *   power  -- add ONE Force power with the [dark side] descriptor to the active suite; when it is USED (or at the end of the
 *             encounter) it goes away entirely and can not be recovered by any normal means. No Dark Side Score change is printed.
 *   talent -- temporarily gain a talent from the Dark Side, Dark Side Devotee or Sith tree; ALL prerequisites must be met;
 *             several Force Points may be spent for several talents; temporary talents count toward prerequisites of other
 *             talents; at the end of the encounter the talents are lost and the Dark Side Score rises by the Force Points spent.
 *
 * Every use is an explicit GM adjudication (the rule is GM-optional): the Force Point payment goes through the shared
 * ForcePointsService / ActorEngine transaction with context.gmAdjudication.reason from a verified GM. No standing setting
 * is added. What the printed text leaves open is recorded as FP-RD-013 (docs/audits/swse-rules-decisions-pending.md).
 */

export const TEMPTATION_TALENT_TREES = Object.freeze(['dark side', 'dark side devotee', 'sith']);
const FLAG = 'temptation';
const normalize = v => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Only a STARTED combat has an end-of-encounter signal here (FP-RD-013d). Outside one, acquisition is refused so a
// temporary power/talent can never become a free permanent item.
const activeEncounterId = () => (globalThis.game?.combat?.started ? globalThis.game.combat.id ?? null : null);

export const temptationMeta = item => item?.flags?.swse?.[FLAG] ?? null;
export const isTemptationInstance = item => Boolean(temptationMeta(item));

function hasForceSensitivity(actor) {
  return Boolean(ownedAbilityInstance(actor, { type: 'feat', slug: 'force-sensitivity' }));
}

function powerHasDarkSideDescriptor(power) {
  const system = power?.system ?? {};
  const fields = [system.descriptor, system.descriptors, system.tags, system.forceDescriptors, system.category]
    .flat().filter(Boolean).map(normalize);
  return fields.some(f => f === 'dark side' || f === 'darkside' || f.includes('dark side'));
}

function talentTree(talent) {
  const s = talent?.system ?? {};
  return normalize(s.tree ?? s.talent_tree ?? s.treeId ?? s.category ?? '');
}

async function payForcePoint(actor, gmAdjudication, sourceRef) {
  const receipt = await ActorEngine.spendForcePoints(actor, 1, {
    useKind: 'ability-option', abilitySourceRef: sourceRef, gmAdjudication
  });
  return receipt?.spent ? receipt : null;
}
const settle = async (actor, receipt, applied) => {
  if (!receipt) return;
  if (applied) await ActorEngine.finalizeForcePointSpend(actor, receipt);
  else await ActorEngine.rollbackForcePointSpend(actor, receipt);
};

export const TemptationOfTheDarkSide = {
  /** Power pathway. `source` is the dark-side Force power document/item to copy into the suite. */
  async acquirePower(actor, source, { gmAdjudication } = {}) {
    if (!actor || !source) return { ok: false, reason: 'missing-input' };
    if (!hasForceSensitivity(actor)) return { ok: false, reason: 'force-sensitivity-required' };
    if (!powerHasDarkSideDescriptor(source)) return { ok: false, reason: 'not-a-dark-side-power' };
    if (!activeEncounterId()) return { ok: false, reason: 'no-active-encounter' };
    const receipt = await payForcePoint(actor, gmAdjudication, 'fucg:temptation-power');
    if (!receipt) return { ok: false, reason: 'force-point-refused' };
    try {
      const data = source.toObject ? source.toObject() : foundry.utils.deepClone(source);
      delete data._id;
      data.system = { ...(data.system ?? {}), discarded: false, inSuite: true };
      data.flags = { ...(data.flags ?? {}), swse: { ...(data.flags?.swse ?? {}), [FLAG]: { kind: 'power', combatId: activeEncounterId() } } };
      const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', [data], { source: 'fucg-temptation-power' });
      await settle(actor, receipt, true);
      return { ok: true, itemId: created?.[0]?.id ?? null };
    } catch (err) {
      await settle(actor, receipt, false);   // exact compensation: no Force Point is lost for a power that was not added
      SWSELogger.warn('SWSE | Temptation | power not added; Force Point returned', err);
      return { ok: false, reason: 'create-failed' };
    }
  },

  /** A temptation power goes away when it is used: no recovery path can see it afterwards. */
  async consumeAfterUse(actor, power) {
    if (temptationMeta(power)?.kind !== 'power') return false;
    await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', [power.id], { source: 'fucg-temptation-power-used' });
    return true;
  },

  /** Talent pathway. Temporary talents already held count toward the prerequisites of the next one. */
  async acquireTalent(actor, talent, { gmAdjudication } = {}) {
    if (!actor || !talent) return { ok: false, reason: 'missing-input' };
    if (!hasForceSensitivity(actor)) return { ok: false, reason: 'force-sensitivity-required' };
    if (!TEMPTATION_TALENT_TREES.includes(talentTree(talent))) return { ok: false, reason: 'tree-not-allowed' };
    if (!activeEncounterId()) return { ok: false, reason: 'no-active-encounter' };
    const temporary = (actor.items ?? []).filter(i => temptationMeta(i)?.kind === 'talent');
    const assessment = AbilityEngine.evaluateAcquisition(actor, talent, {
      selectedTalents: temporary.map(i => ({ id: i.id, name: i.name }))
    });
    if (!assessment?.legal) return { ok: false, reason: 'prerequisites-not-met', missing: assessment?.missingPrereqs ?? [] };
    const receipt = await payForcePoint(actor, gmAdjudication, 'fucg:temptation-talent');
    if (!receipt) return { ok: false, reason: 'force-point-refused' };
    try {
      const data = talent.toObject ? talent.toObject() : foundry.utils.deepClone(talent);
      delete data._id;
      data.flags = { ...(data.flags ?? {}), swse: { ...(data.flags?.swse ?? {}), [FLAG]: { kind: 'talent', combatId: activeEncounterId(), forcePointReceiptId: receipt.receiptId ?? null } } };
      const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', [data], { source: 'fucg-temptation-talent' });
      await settle(actor, receipt, true);
      return { ok: true, itemId: created?.[0]?.id ?? null };
    } catch (err) {
      await settle(actor, receipt, false);
      SWSELogger.warn('SWSE | Temptation | talent not added; Force Point returned', err);
      return { ok: false, reason: 'create-failed' };
    }
  },

  /**
   * End of encounter: temporary powers and talents are removed; the Dark Side Score rises by the Force Points spent on
   * temporary TALENTS (one Force Point per talent held). Idempotent: nothing left to remove => nothing changes.
   */
  async endEncounter(actor, { combatId = null } = {}) {
    // Only this encounter's temporary items end (an item tied to another, still-running combat is left alone).
    const temporary = (actor?.items ?? []).filter(i => isTemptationInstance(i)
      && (combatId === null || !temptationMeta(i).combatId || temptationMeta(i).combatId === combatId));
    if (!temporary.length) return { removed: 0, darkSideIncrease: 0 };
    // The owed increase is made durable BEFORE anything is removed: a `temptationSettled` record (idempotent per item id) is
    // written with the score, so a failed removal can be retried without losing or double-counting the increase, and a
    // failed score write leaves every temporary item in place (nothing removed, nothing lost, nothing refunded).
    const talentIds = temporary.filter(i => temptationMeta(i).kind === 'talent').map(i => i.id);
    const settled = new Set(actor.flags?.swse?.temptationSettled ?? []);
    const owed = talentIds.filter(id => !settled.has(id));
    if (owed.length > 0) {
      await ActorEngine.updateActor(actor, {
        'system.darkSide.value': DSPEngine.getNextValue(actor, owed.length),
        'flags.swse.temptationSettled': [...settled, ...owed]
      });
    }
    await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', temporary.map(i => i.id), { source: 'fucg-temptation-end-encounter' });
    if (owed.length > 0 || settled.size) await ActorEngine.updateActor(actor, { 'flags.swse.temptationSettled': [] });
    return { removed: temporary.length, darkSideIncrease: owed.length };
  }
};

export default TemptationOfTheDarkSide;
