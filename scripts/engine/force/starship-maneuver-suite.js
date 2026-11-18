/**
 * StarshipManeuverSuite - actor-level starship maneuver instance operations (Checkpoint 03C): paid one-instance
 * recovery and the Pilot activation check. Suite state is the owned item's `system.discarded` (SuiteInstanceRecovery).
 * Kept separate from StarshipManeuversEngine (vehicle crew/sheet concerns) so character sheets can use it.
 */
export class StarshipManeuverSuite {
  /**
   * Paid recovery (Starships of the Galaxy p.24): spend a Force Point as a reaction to regain EXACTLY ONE owned, spent
   * maneuver instance. The instance is validated before any debit; the receipt is source-exact (rollback restores the
   * exact sources); finality is persisted only after the instance is readied. No Force Readiness prerequisite.
   */
  static async regainOwnedManeuver(pilot, itemId) {
    const selected = pilot?.items?.get?.(itemId);
    if (!pilot?.id || !selected || !selected?.type === 'maneuver' || selected.system?.discarded !== true) {
      ui?.notifications?.warn?.('An owned spent starship maneuver is required.');
      return false;
    }

    const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
    let receipt;
    try {
      receipt = await ActorEngine.spendForcePoints(pilot, 1, {
        useKind: 'recover-one-maneuver', targetItemInstanceId: selected.id
      });
    } catch (error) {
      ui?.notifications?.warn?.(`Force Point reaction denied: ${error.message}`);
      return false;
    }
    try {
      await ActorEngine.updateOwnedItems(pilot, [{ _id: selected.id, 'system.discarded': false }]);
    } catch (error) {
      const live = pilot.items?.get?.(selected.id);
      if (live?.system?.discarded === true) {
        try {
          const rollback = await ActorEngine.rollbackForcePointSpend(pilot, receipt);
          if (!rollback?.rolledBack) console.error('Maneuver refund refused', rollback);
        } catch (refundError) { console.error('Maneuver refund indeterminate', refundError); }
      } else {
        console.error('Maneuver update may have applied; no automatic Force Point refund', error);
      }
      ui?.notifications?.error?.('Maneuver recovery failed or is indeterminate.');
      return false;
    }
    try {
      const finalized = await ActorEngine.finalizeForcePointSpend(pilot, receipt);
      if (!finalized?.finalized) console.error('Maneuver recovered, but receipt finality was not persisted', finalized);
    } catch (error) {
      console.error('Maneuver recovered but Force Point finalization failed', error);
    }
    ui?.notifications?.info?.('Starship maneuver readied using a Force Point reaction.');
    return true;
  }

  /**
   * Activate one owned, ready maneuver instance with its Pilot activation check (domain 'starship-maneuver.activation').
   * Using a maneuver spends it whether or not the check succeeds (Starships of the Galaxy suite rule). A natural 20 on
   * this check - and only this check - records the end-of-turn regain of every spent maneuver (RollCore).
   */
  static async activateManeuver(pilot, itemId, { customModifier = 0, useForce = false } = {}) {
    const selected = pilot?.items?.get?.(itemId);
    if (!pilot?.id || !selected || !selected?.type === 'maneuver') return { success: false, error: 'An owned starship maneuver is required.' };
    if (selected.system?.discarded === true) return { success: false, error: `${selected.name} is already spent.` };
    const { RollCore } = await import("/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js");
    const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
    const pilotTotal = [pilot.system?.derived?.skillsByKey?.pilot?.total, pilot.system?.derived?.skills?.pilot?.total, pilot.system?.skills?.pilot?.total]
      .map(Number).find(Number.isFinite) ?? 0;
    const result = await RollCore.execute({
      actor: pilot,
      domain: 'starship-maneuver.activation',
      baseBonus: pilotTotal + (Number(customModifier) || 0),
      rollOptions: { baseDice: '1d20', useForce: useForce === true, forcePointCount: useForce === true ? 1 : 0 },
      rollData: pilot.getRollData?.() ?? {},
      context: { itemName: selected.name, sourceItemId: selected.id, type: 'starship-maneuver' }
    });
    if (!result?.success || !result.roll) return { success: false, error: result?.error ?? 'The Pilot activation check failed to roll.' };
    await ActorEngine.updateOwnedItems(pilot, [{ _id: selected.id, 'system.discarded': true, 'system.lastUsed': Date.now() }]);
    return { success: true, total: Number(result.finalTotal ?? result.roll.total), roll: result.roll, maneuver: selected.name };
  }
}
