/**
 * Persistence of guided projectiles (Core, Missiles and Torpedoes; scripts/domain/vehicles/vehicle-guided-projectile.js).
 *
 * A projectile record lives on the LAUNCHING vehicle (flags.swse.guidedProjectiles.<id>), written only here through ActorEngine. It is
 * created by an aimed, guided LAUNCH that missed; its single follow-up attack and any interception update the same record; it is
 * never a second launch, so nothing in this file touches ammunition.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { PROJECTILE_FLAG, PROJECTILE_STATE, createProjectile, planFollowUp, resolveFollowUp, interceptProjectile } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-guided-projectile.js";

const path = id => `flags.swse.${PROJECTILE_FLAG}.${id}`;

export class VehicleProjectileService {
  static read(vehicle, projectileId) { return vehicle?.flags?.swse?.[PROJECTILE_FLAG]?.[projectileId] ?? null; }

  /** Every projectile of this vehicle still waiting for its follow-up attack. */
  static awaiting(vehicle) {
    return Object.values(vehicle?.flags?.swse?.[PROJECTILE_FLAG] ?? {}).filter(p => p?.state === PROJECTILE_STATE.AWAITING);
  }

  /** The aimed, guided launch missed: the projectile now exists. */
  static async create(vehicle, { launcherItemId, targetId, attackBonus, attackId, combat = globalThis.game?.combat ?? null } = {}) {
    const projectileId = globalThis.foundry?.utils?.randomID?.() ?? `proj-${Date.now()}`;
    const record = createProjectile({ projectileId, launcherItemId, vehicleId: vehicle.id, targetId, attackBonus, attackId, combat: combat ? { id: combat.id, round: combat.round } : null });
    await ActorEngine.updateActor(vehicle, { [path(projectileId)]: record });
    return record;
  }

  /** Check a follow-up attack against the record (pure read, no cost). */
  static plan(vehicle, projectileId, { launcherItemId, targetId, combat = globalThis.game?.combat ?? null } = {}) {
    return planFollowUp(this.read(vehicle, projectileId), { launcherItemId, targetId, combat: combat ? { id: combat.id, round: combat.round } : null });
  }

  /** The follow-up attack was rolled: record its outcome (a hit ends the attack; a second miss self-destructs). Exactly once. */
  static async resolve(vehicle, projectileId, { hit }) {
    const rec = this.read(vehicle, projectileId);
    if (!rec || rec.state !== PROJECTILE_STATE.AWAITING) return { ok: false, reason: 'PROJECTILE_NOT_AWAITING_ITS_FOLLOW_UP' };
    const next = resolveFollowUp(rec, { hit });
    await ActorEngine.updateActor(vehicle, { [path(projectileId)]: next });
    return { ok: true, record: next };
  }

  /** An attack on the projectile before its return attack. */
  static async intercept(vehicle, projectileId, { attackTotal, damage }) {
    const rec = this.read(vehicle, projectileId);
    const r = interceptProjectile(rec, { attackTotal, damage });
    if (!r.ok || !r.hit) return r;
    await ActorEngine.updateActor(vehicle, { [path(projectileId)]: r.record });
    return r;
  }
}
