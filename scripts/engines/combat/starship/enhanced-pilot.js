/**
 * EnhancedPilot — Maneuver actions, evasive flying, and pursuit mechanics.
 *
 * The Pilot crew member manages:
 *   - Evasive maneuvers (defense boost at attack cost)
 *   - Attack run (attack boost at defense cost)
 *   - Pursuit / escape (opposed Pilot checks)
 *   - Trick maneuver (opposed Pilot check for tactical advantage)
 *   - All-Out Movement (double speed, no attacks)
 *
 * Maneuver states are per-round and reset at turn start.
 *
 * Gated behind enableEnhancedPilot world setting.
 * Does NOT directly modify subsystem states or power allocation.
 * Provides modifiers that combat resolution consumes.
 */

export class EnhancedPilot {

  static MANEUVERS = Object.freeze({
    NONE: 'none',
    EVASIVE: 'evasive',
    ATTACK_RUN: 'attackRun',
    ALL_OUT: 'allOut',
    TRICK: 'trick'
  });

  static MANEUVER_DATA = Object.freeze({
    none: {
      label: 'Standard Flying',
      attackMod: 0,
      defenseMod: 0,
      speedMultiplier: 1,
      description: 'Normal piloting — no special modifiers.'
    },
    evasive: {
      label: 'Evasive Action',
      attackMod: -2,
      defenseMod: 2,
      speedMultiplier: 1,
      description: 'Evasive maneuvers: +2 Reflex Defense, -2 to all attacks from this vehicle.'
    },
    attackRun: {
      label: 'Attack Run',
      attackMod: 2,
      defenseMod: -2,
      speedMultiplier: 1,
      description: 'Aggressive approach: +2 to all attacks, -2 Reflex Defense.'
    },
    allOut: {
      label: 'All-Out Movement',
      attackMod: -999,
      defenseMod: -2,
      speedMultiplier: 2,
      description: 'Maximum speed: double movement, no attacks allowed, -2 Reflex Defense.'
    },
    trick: {
      label: 'Trick Maneuver',
      attackMod: 0,
      defenseMod: 0,
      speedMultiplier: 1,
      description: 'Opposed Pilot check for tactical advantage.'
    }
  });

  /* -------------------------------------------------------------------------- */
  /*  SETTINGS                                                                  */
  /* -------------------------------------------------------------------------- */

  static get enabled() {
    try {
      return game.settings?.get('foundryvtt-swse', 'enableEnhancedPilot') ?? false;
    } catch {
      return false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  MANEUVER STATE                                                            */
  /* -------------------------------------------------------------------------- */

  /**
   * Get the current maneuver for a vehicle.
   *
   * @param {Actor} vehicle
   * @returns {string}
   */
  static getCurrentManeuver(vehicle) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return this.MANEUVERS.NONE;
    return vehicle.system.pilotManeuver ?? this.MANEUVERS.NONE;
  }

  /**
   * Get current maneuver modifiers.
   *
   * @param {Actor} vehicle
   * @returns {Object}
   */
  static getManeuverModifiers(vehicle) {
    const maneuver = this.getCurrentManeuver(vehicle);
    return this.MANEUVER_DATA[maneuver] ?? this.MANEUVER_DATA.none;
  }

  /* -------------------------------------------------------------------------- */
  /*  SET MANEUVER                                                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Set the pilot's maneuver for this round.
   * Pilot Swift Action (declare at start of turn).
   *
   * @param {Actor} vehicle
   * @param {string} maneuver - Maneuver key
   * @returns {Promise<boolean>}
   */
  static async setManeuver(vehicle, maneuver) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return false;

    if (!this.MANEUVER_DATA[maneuver]) {
      ui.notifications?.warn(`Unknown maneuver: ${maneuver}`);
      return false;
    }

    await vehicle.update({
      'system.pilotManeuver': maneuver
    });

    const data = this.MANEUVER_DATA[maneuver];

    await ChatMessage.create({
      content: `<div class="swse-pilot-msg">
        <strong>${data.label} — ${vehicle.name}</strong><br>
        ${data.description}
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: vehicle })
    });

    return true;
  }

  /**
   * Reset maneuver at turn start.
   *
   * @param {Actor} vehicle
   * @returns {Promise<void>}
   */
  static async resetManeuver(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') return;
    await vehicle.update({ 'system.pilotManeuver': this.MANEUVERS.NONE });
  }

  /* -------------------------------------------------------------------------- */
  /*  TRICK MANEUVER                                                            */
  /* -------------------------------------------------------------------------- */

  /**
   * Attempt a trick maneuver against another vehicle.
   * Opposed Pilot check.
   *
   * Success: Target grants combat advantage (flat-footed) until end of your next turn.
   * Failure: You grant combat advantage to the target.
   *
   * @param {Actor} vehicle - Attacker vehicle
   * @param {Actor} targetVehicle - Target vehicle
   * @param {number} pilotCheck - Pilot's check result
   * @param {number} targetPilotCheck - Target pilot's check result
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async attemptTrickManeuver(vehicle, targetVehicle, pilotCheck, targetPilotCheck) {
    if (!this.enabled) return { success: false, message: 'Enhanced Pilot not enabled.' };

    await this.setManeuver(vehicle, this.MANEUVERS.TRICK);

    if (pilotCheck > targetPilotCheck) {
      const msg = `Trick Maneuver succeeds! ${vehicle.name} (${pilotCheck}) outmaneuvers ${targetVehicle.name} (${targetPilotCheck}). Target is flat-footed until end of next turn.`;

      await ChatMessage.create({
        content: `<div class="swse-pilot-msg"><strong>Trick Maneuver — Success!</strong><br>${msg}</div>`,
        speaker: ChatMessage.getSpeaker({ actor: vehicle })
      });

      return { success: true, message: msg };
    }

    const msg = `Trick Maneuver fails! ${vehicle.name} (${pilotCheck}) is outmaneuvered by ${targetVehicle.name} (${targetPilotCheck}). You are flat-footed until end of your next turn.`;

    await ChatMessage.create({
      content: `<div class="swse-pilot-msg"><strong>Trick Maneuver — Failed!</strong><br>${msg}</div>`,
      speaker: ChatMessage.getSpeaker({ actor: vehicle })
    });

    return { success: false, message: msg };
  }

  /* -------------------------------------------------------------------------- */
  /*  PURSUIT / ESCAPE                                                          */
  /* -------------------------------------------------------------------------- */

  /**
   * Attempt pursuit or escape.
   * Opposed Pilot check + vehicle speed comparison.
   *
   * @param {Actor} pursuer
   * @param {Actor} prey
   * @param {number} pursuerCheck
   * @param {number} preyCheck
   * @returns {Promise<{caught: boolean, message: string}>}
   */
  static async resolvePursuit(pursuer, prey, pursuerCheck, preyCheck) {
    if (!this.enabled) return { caught: false, message: 'Enhanced Pilot not enabled.' };

    // Speed advantage grants +2 per speed category difference
    const pursuerSpeed = this._parseSpeed(pursuer);
    const preySpeed = this._parseSpeed(prey);
    const speedDiff = pursuerSpeed - preySpeed;
    const speedBonus = Math.floor(speedDiff / 2) * 2;

    const effectivePursuerCheck = pursuerCheck + speedBonus;

    const caught = effectivePursuerCheck > preyCheck;
    const verb = caught ? 'catches' : 'fails to catch';

    const msg = `${pursuer.name} ${verb} ${prey.name}! Pursuer: ${effectivePursuerCheck} (${pursuerCheck}${speedBonus >= 0 ? '+' : ''}${speedBonus} speed) vs Prey: ${preyCheck}.`;

    await ChatMessage.create({
      content: `<div class="swse-pilot-msg"><strong>Pursuit Resolution</strong><br>${msg}</div>`,
      speaker: ChatMessage.getSpeaker({ actor: pursuer })
    });

    return { caught, message: msg };
  }

  /** @private Parse speed to numeric value */
  static _parseSpeed(actor) {
    const speed = actor?.system?.speed;
    if (typeof speed === 'number') return speed;
    if (typeof speed === 'string') {
      const match = speed.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }
}
