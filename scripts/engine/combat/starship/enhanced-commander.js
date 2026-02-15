/**
 * EnhancedCommander — Tactical boosts, coordination, and battlefield control.
 *
 * The Commander crew member provides:
 *   - Coordinate Fire: +1 or +2 attack bonus to all gunners
 *   - Inspire Crew: temporary morale bonus to all crew skill checks
 *   - Tactical Advantage: grant extra action to one crew member
 *   - Battle Analysis: reveal target's DT and CT state
 *
 * All effects are per-round and reset at turn start.
 *
 * Gated behind enableEnhancedCommander world setting.
 * Does NOT modify subsystem states, power allocation, or maneuvers.
 * Provides modifiers consumed by combat resolution and crew actions.
 */

export class EnhancedCommander {

  static ORDERS = Object.freeze({
    NONE: 'none',
    COORDINATE_FIRE: 'coordinateFire',
    INSPIRE: 'inspire',
    TACTICAL_ADVANTAGE: 'tacticalAdvantage',
    BATTLE_ANALYSIS: 'battleAnalysis'
  });

  static ORDER_DATA = Object.freeze({
    none: {
      label: 'No Orders',
      description: 'Commander is not issuing special orders.'
    },
    coordinateFire: {
      label: 'Coordinate Fire',
      attackBonus: 1,
      description: 'All gunners gain +1 to attack rolls this round. Trained Knowledge (Tactics): +2 instead.',
      actionType: 'standard'
    },
    inspire: {
      label: 'Inspire Crew',
      skillBonus: 1,
      description: 'All crew members gain +1 morale bonus to skill checks this round.',
      actionType: 'standard'
    },
    tacticalAdvantage: {
      label: 'Tactical Advantage',
      description: 'Grant one crew member an additional Swift Action this round.',
      actionType: 'standard'
    },
    battleAnalysis: {
      label: 'Battle Analysis',
      description: 'Reveal target\'s Damage Threshold and Condition Track state. Knowledge (Tactics) DC 15.',
      actionType: 'move'
    }
  });

  /* -------------------------------------------------------------------------- */
  /*  SETTINGS                                                                  */
  /* -------------------------------------------------------------------------- */

  static get enabled() {
    try {
      return game.settings?.get('foundryvtt-swse', 'enableEnhancedCommander') ?? false;
    } catch {
      return false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  ORDER STATE                                                               */
  /* -------------------------------------------------------------------------- */

  /**
   * Get the current commander order.
   *
   * @param {Actor} vehicle
   * @returns {string}
   */
  static getCurrentOrder(vehicle) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return this.ORDERS.NONE;
    return vehicle.system.commanderOrder ?? this.ORDERS.NONE;
  }

  /**
   * Get active order modifiers.
   *
   * @param {Actor} vehicle
   * @returns {Object}
   */
  static getOrderModifiers(vehicle) {
    const order = this.getCurrentOrder(vehicle);
    return this.ORDER_DATA[order] ?? this.ORDER_DATA.none;
  }

  /**
   * Get attack bonus from commander orders.
   *
   * @param {Actor} vehicle
   * @param {Actor} [commander] - Commander actor for skill check
   * @returns {number}
   */
  static getAttackBonus(vehicle, commander = null) {
    if (!this.enabled) return 0;

    const order = this.getCurrentOrder(vehicle);
    if (order !== this.ORDERS.COORDINATE_FIRE) return 0;

    // Check if commander is trained in Knowledge (Tactics)
    if (commander) {
      const tactics = commander.system?.skills?.knowledgeTactics;
      if (tactics?.trained) return 2;
    }

    return 1;
  }

  /**
   * Get skill bonus from inspire order.
   *
   * @param {Actor} vehicle
   * @returns {number}
   */
  static getSkillBonus(vehicle) {
    if (!this.enabled) return 0;

    const order = this.getCurrentOrder(vehicle);
    if (order !== this.ORDERS.INSPIRE) return 0;

    return 1;
  }

  /* -------------------------------------------------------------------------- */
  /*  ISSUE ORDERS                                                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Issue a commander order. Standard or Move Action depending on order.
   *
   * @param {Actor} vehicle
   * @param {string} order
   * @param {Actor} [commander] - The commander crew member
   * @returns {Promise<boolean>}
   */
  static async issueOrder(vehicle, order, commander = null) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return false;

    if (!this.ORDER_DATA[order]) {
      ui.notifications?.warn(`Unknown order: ${order}`);
      return false;
    }

    await vehicle.update({
      'system.commanderOrder': order
    });

    const data = this.ORDER_DATA[order];
    const commanderName = commander?.name ?? 'Commander';

    await ChatMessage.create({
      content: `<div class="swse-commander-msg">
        <strong>${data.label} — ${vehicle.name}</strong><br>
        <em>${commanderName} issues orders.</em><br>
        ${data.description}
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: commander ?? vehicle })
    });

    return true;
  }

  /**
   * Reset commander order at turn start.
   *
   * @param {Actor} vehicle
   * @returns {Promise<void>}
   */
  static async resetOrder(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') return;
    await vehicle.update({ 'system.commanderOrder': this.ORDERS.NONE });
  }

  /* -------------------------------------------------------------------------- */
  /*  BATTLE ANALYSIS                                                           */
  /* -------------------------------------------------------------------------- */

  /**
   * Perform battle analysis on a target.
   * Knowledge (Tactics) DC 15.
   *
   * @param {Actor} vehicle - Commander's vehicle
   * @param {Actor} target - Target to analyze
   * @param {Actor} commander - Commander crew member
   * @param {number} tacticsCheck - Knowledge (Tactics) check result
   * @returns {Promise<{success: boolean, info: Object|null}>}
   */
  static async battleAnalysis(vehicle, target, commander, tacticsCheck) {
    if (!this.enabled) return { success: false, info: null };

    await this.issueOrder(vehicle, this.ORDERS.BATTLE_ANALYSIS, commander);

    const dc = 15;
    if (tacticsCheck < dc) {
      await ChatMessage.create({
        content: `<div class="swse-commander-msg">
          <strong>Battle Analysis Failed</strong><br>
          ${commander.name} fails to analyze ${target.name} (rolled ${tacticsCheck} vs DC ${dc}).
        </div>`,
        speaker: ChatMessage.getSpeaker({ actor: commander })
      });
      return { success: false, info: null };
    }

    // Gather target info
    const isVehicle = target.type === 'vehicle';
    const dt = target.system.damageThreshold ?? 0;
    const ctStep = target.system.conditionTrack?.current ?? 0;
    const ctLabels = ['Normal', '-1', '-2', '-5', '-10', 'Helpless'];

    let hpInfo;
    if (isVehicle) {
      const hull = target.system.hull;
      hpInfo = `Hull: ${hull?.value ?? '?'}/${hull?.max ?? '?'}`;
    } else {
      const hp = target.system.hp;
      hpInfo = `HP: ${hp?.value ?? '?'}/${hp?.max ?? '?'}`;
    }

    const info = { dt, ctStep, ctLabel: ctLabels[ctStep] ?? 'Unknown', hpInfo };

    // Reveal to all players
    await ChatMessage.create({
      content: `<div class="swse-commander-msg">
        <strong>Battle Analysis — ${target.name}</strong><br>
        <em>${commander.name} analyzes the enemy.</em><br>
        Damage Threshold: <strong>${dt}</strong><br>
        Condition: <strong>${info.ctLabel}</strong><br>
        ${hpInfo}
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: commander })
    });

    return { success: true, info };
  }
}
