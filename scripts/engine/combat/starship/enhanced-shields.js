/**
 * EnhancedShields — Directional shield management and recharge mechanics.
 *
 * Features:
 *   - Four shield zones: fore, aft, port, starboard
 *   - Shield operator can redistribute shield points between zones
 *   - Per-round recharge (configurable rate)
 *   - Shield overcharge (focus all to one zone)
 *   - Integration with SubsystemEngine (shields subsystem damage)
 *
 * Gated behind enableEnhancedShields world setting.
 * Does NOT modify subsystem states or power allocation directly.
 */

export class EnhancedShields {

  static ZONES = Object.freeze(['fore', 'aft', 'port', 'starboard']);

  /* -------------------------------------------------------------------------- */
  /*  SETTINGS                                                                  */
  /* -------------------------------------------------------------------------- */

  static get enabled() {
    try {
      return game.settings?.get('foundryvtt-swse', 'enableEnhancedShields') ?? false;
    } catch {
      return false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  STATE ACCESS                                                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Get directional shield state for a vehicle.
   *
   * @param {Actor} vehicle
   * @returns {{ fore: number, aft: number, port: number, starboard: number, total: number, max: number, rechargeRate: number }}
   */
  static getShieldState(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') {
      return { fore: 0, aft: 0, port: 0, starboard: 0, total: 0, max: 0, rechargeRate: 0 };
    }

    const shields = vehicle.system.enhancedShields ?? {};
    const maxTotal = vehicle.system.shields?.max ?? 0;
    const rechargeRate = vehicle.system.shields?.regenRate ?? Math.floor(maxTotal / 4);

    const state = {
      fore: shields.fore ?? Math.floor(maxTotal / 4),
      aft: shields.aft ?? Math.floor(maxTotal / 4),
      port: shields.port ?? Math.floor(maxTotal / 4),
      starboard: shields.starboard ?? Math.floor(maxTotal / 4),
      max: maxTotal,
      rechargeRate
    };

    state.total = state.fore + state.aft + state.port + state.starboard;
    return state;
  }

  /* -------------------------------------------------------------------------- */
  /*  SHIELD OPERATIONS                                                        */
  /* -------------------------------------------------------------------------- */

  /**
   * Initialize directional shields from total shield pool.
   * Distributes evenly across all four zones.
   *
   * @param {Actor} vehicle
   * @returns {Promise<void>}
   */
  static async initializeShields(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') return;

    const maxTotal = vehicle.system.shields?.max ?? 0;
    const perZone = Math.floor(maxTotal / 4);
    const remainder = maxTotal - (perZone * 4);

    await vehicle.update({
      'system.enhancedShields.fore': perZone + remainder, // Extra point goes fore
      'system.enhancedShields.aft': perZone,
      'system.enhancedShields.port': perZone,
      'system.enhancedShields.starboard': perZone
    });
  }

  /**
   * Redistribute shields between zones.
   * Shield operator Standard Action.
   * Total must not exceed max shields.
   *
   * @param {Actor} vehicle
   * @param {{ fore: number, aft: number, port: number, starboard: number }} distribution
   * @returns {Promise<boolean>}
   */
  static async redistribute(vehicle, distribution) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return false;

    const maxTotal = vehicle.system.shields?.max ?? 0;
    const total = (distribution.fore ?? 0) + (distribution.aft ?? 0) +
                  (distribution.port ?? 0) + (distribution.starboard ?? 0);

    if (total > maxTotal) {
      ui.notifications?.warn(`Cannot exceed maximum shield capacity (${maxTotal}).`);
      return false;
    }

    // Validate no negative values
    for (const zone of this.ZONES) {
      if ((distribution[zone] ?? 0) < 0) {
        ui.notifications?.warn('Shield values cannot be negative.');
        return false;
      }
    }

    await vehicle.update({
      'system.enhancedShields.fore': distribution.fore ?? 0,
      'system.enhancedShields.aft': distribution.aft ?? 0,
      'system.enhancedShields.port': distribution.port ?? 0,
      'system.enhancedShields.starboard': distribution.starboard ?? 0
    });

    await ChatMessage.create({
      content: `<div class="swse-shields-msg">
        <strong>Shields Redistributed — ${vehicle.name}</strong><br>
        Fore: ${distribution.fore} | Aft: ${distribution.aft} | Port: ${distribution.port} | Starboard: ${distribution.starboard}
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: vehicle })
    });

    return true;
  }

  /**
   * Focus all shields to a single zone (overcharge).
   * Shield operator Swift Action.
   *
   * @param {Actor} vehicle
   * @param {string} zone - 'fore', 'aft', 'port', or 'starboard'
   * @returns {Promise<boolean>}
   */
  static async focusShields(vehicle, zone) {
    if (!this.ZONES.includes(zone)) return false;

    const state = this.getShieldState(vehicle);
    const distribution = { fore: 0, aft: 0, port: 0, starboard: 0 };
    distribution[zone] = state.total;

    return this.redistribute(vehicle, distribution);
  }

  /**
   * Equalize shields across all zones.
   * Shield operator Swift Action.
   *
   * @param {Actor} vehicle
   * @returns {Promise<boolean>}
   */
  static async equalizeShields(vehicle) {
    const state = this.getShieldState(vehicle);
    const perZone = Math.floor(state.total / 4);
    const remainder = state.total - (perZone * 4);

    return this.redistribute(vehicle, {
      fore: perZone + remainder,
      aft: perZone,
      port: perZone,
      starboard: perZone
    });
  }

  /* -------------------------------------------------------------------------- */
  /*  DAMAGE APPLICATION                                                       */
  /* -------------------------------------------------------------------------- */

  /**
   * Apply damage to a specific shield zone.
   * Returns remaining damage that passes through to hull.
   *
   * @param {Actor} vehicle
   * @param {string} zone - Which shield zone is hit
   * @param {number} damage - Incoming damage
   * @returns {Promise<{ absorbed: number, overflow: number }>}
   */
  static async applyDamageToZone(vehicle, zone, damage) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') {
      return { absorbed: 0, overflow: damage };
    }

    if (!this.ZONES.includes(zone)) {
      return { absorbed: 0, overflow: damage };
    }

    const current = vehicle.system.enhancedShields?.[zone] ?? 0;
    const absorbed = Math.min(current, damage);
    const overflow = damage - absorbed;

    await vehicle.update({
      [`system.enhancedShields.${zone}`]: current - absorbed
    });

    if (absorbed > 0) {
      await ChatMessage.create({
        content: `<div class="swse-shields-msg">
          ${vehicle.name}'s ${zone} shields absorb ${absorbed} damage.
          ${overflow > 0 ? `<br><strong>${overflow} damage passes through to hull!</strong>` : ''}
        </div>`,
        speaker: ChatMessage.getSpeaker({ actor: vehicle })
      });
    }

    return { absorbed, overflow };
  }

  /**
   * Determine which shield zone faces the attacker based on relative position.
   *
   * @param {Token} vehicleToken
   * @param {Token} attackerToken
   * @returns {string} Zone name
   */
  static determineFacingZone(vehicleToken, attackerToken) {
    if (!vehicleToken || !attackerToken) return 'fore';

    const dx = attackerToken.x - vehicleToken.x;
    const dy = attackerToken.y - vehicleToken.y;
    const angle = Math.atan2(dy, dx);

    // Vehicle rotation in radians
    const rotation = (vehicleToken.rotation ?? 0) * (Math.PI / 180);
    let relative = angle - rotation;

    // Normalize to 0-2PI
    while (relative < 0) relative += 2 * Math.PI;
    while (relative >= 2 * Math.PI) relative -= 2 * Math.PI;

    // Divide into quadrants
    const quarter = Math.PI / 2;
    if (relative < quarter || relative >= 3.5 * quarter) return 'fore';
    if (relative < 1.5 * quarter) return 'starboard';
    if (relative < 2.5 * quarter) return 'aft';
    return 'port';
  }

  /* -------------------------------------------------------------------------- */
  /*  RECHARGE                                                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Recharge shields at the start of the vehicle's turn.
   * Distributes recharge evenly or to the most depleted zone.
   *
   * @param {Actor} vehicle
   * @returns {Promise<number>} Amount recharged
   */
  static async recharge(vehicle) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return 0;

    const state = this.getShieldState(vehicle);
    const rechargeAmount = state.rechargeRate;

    if (rechargeAmount <= 0 || state.total >= state.max) return 0;

    // Distribute recharge to the most depleted zones first
    const maxPerZone = Math.floor(state.max / 4);
    const updates = {};
    let remaining = Math.min(rechargeAmount, state.max - state.total);

    for (const zone of this.ZONES) {
      if (remaining <= 0) break;

      const current = state[zone];
      const canAdd = maxPerZone - current;
      if (canAdd <= 0) continue;

      const add = Math.min(remaining, canAdd);
      updates[`system.enhancedShields.${zone}`] = current + add;
      remaining -= add;
    }

    if (Object.keys(updates).length > 0) {
      await vehicle.update(updates);
    }

    const recharged = rechargeAmount - remaining;
    if (recharged > 0) {
      await ChatMessage.create({
        content: `<div class="swse-shields-msg">
          ${vehicle.name}'s shields recharge ${recharged} points.
        </div>`,
        speaker: ChatMessage.getSpeaker({ actor: vehicle })
      });
    }

    return recharged;
  }
}
