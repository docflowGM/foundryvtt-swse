/**
 * VehicleTurnController — Phase-based crew action sequencing.
 *
 * During a vehicle's turn, crew members act in a specific phase order.
 * This controller manages the phase progression and tracks which
 * crew members have acted.
 *
 * Phase Order:
 *   1. Commander Phase — Issue orders (Standard/Move Action)
 *   2. Pilot Phase     — Declare maneuver, move vehicle (Standard Action)
 *   3. Engineer Phase   — Allocate power, repair (Standard Action)
 *   4. Shield Phase     — Redistribute shields (Standard/Swift Action)
 *   5. Gunner Phase     — Fire weapons (Standard Action per gunner)
 *   6. Cleanup Phase    — Resolve end-of-turn effects
 *
 * Gated behind enableVehicleTurnController world setting.
 * Does NOT directly modify any engine state — coordinates flow only.
 */

export class VehicleTurnController {

  static PHASES = Object.freeze([
    'commander',
    'pilot',
    'engineer',
    'shields',
    'gunner',
    'cleanup'
  ]);

  static PHASE_DATA = Object.freeze({
    commander: {
      label: 'Commander Phase',
      description: 'Commander issues tactical orders.',
      crewPosition: 'commander',
      actionType: 'standard'
    },
    pilot: {
      label: 'Pilot Phase',
      description: 'Pilot declares maneuver and moves the vehicle.',
      crewPosition: 'pilot',
      actionType: 'standard'
    },
    engineer: {
      label: 'Engineer Phase',
      description: 'Engineer allocates power and performs repairs.',
      crewPosition: 'engineer',
      actionType: 'standard'
    },
    shields: {
      label: 'Shield Operator Phase',
      description: 'Shield operator redistributes or recharges shields.',
      crewPosition: 'shields',
      actionType: 'standard'
    },
    gunner: {
      label: 'Gunner Phase',
      description: 'Gunners fire weapons at targets.',
      crewPosition: 'gunner',
      actionType: 'standard'
    },
    cleanup: {
      label: 'Cleanup Phase',
      description: 'Resolve end-of-turn effects.',
      crewPosition: null,
      actionType: null
    }
  });

  /* -------------------------------------------------------------------------- */
  /*  SETTINGS                                                                  */
  /* -------------------------------------------------------------------------- */

  static get enabled() {
    try {
      return game.settings?.get('foundryvtt-swse', 'enableVehicleTurnController') ?? false;
    } catch {
      return false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  TURN STATE                                                                */
  /* -------------------------------------------------------------------------- */

  /**
   * Get current turn state for a vehicle.
   *
   * @param {Actor} vehicle
   * @returns {{ currentPhase: string, phaseIndex: number, completedPhases: string[], crewActed: Object }}
   */
  static getTurnState(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') {
      return {
        currentPhase: 'commander',
        phaseIndex: 0,
        completedPhases: [],
        crewActed: {}
      };
    }

    const state = vehicle.system.turnState ?? {};

    return {
      currentPhase: state.currentPhase ?? 'commander',
      phaseIndex: state.phaseIndex ?? 0,
      completedPhases: state.completedPhases ?? [],
      crewActed: state.crewActed ?? {}
    };
  }

  /* -------------------------------------------------------------------------- */
  /*  PHASE MANAGEMENT                                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Start a new vehicle turn. Resets all phase tracking.
   * Called at the start of the vehicle's combat turn.
   *
   * @param {Actor} vehicle
   * @returns {Promise<void>}
   */
  static async startTurn(vehicle) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return;

    await vehicle.update({
      'system.turnState': {
        currentPhase: 'commander',
        phaseIndex: 0,
        completedPhases: [],
        crewActed: {}
      }
    });

    // Reset per-turn states from other engines
    const { EnhancedPilot } = await import('./enhanced-pilot.js');
    const { EnhancedCommander } = await import('./enhanced-commander.js');

    await EnhancedPilot.resetManeuver(vehicle);
    await EnhancedCommander.resetOrder(vehicle);

    // Recharge shields
    const { EnhancedShields } = await import('./enhanced-shields.js');
    await EnhancedShields.recharge(vehicle);

    await ChatMessage.create({
      content: `<div class="swse-turn-msg">
        <strong>${vehicle.name}'s Turn Begins</strong><br>
        Phase: <strong>Commander</strong>
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: vehicle })
    });
  }

  /**
   * Advance to the next phase.
   *
   * @param {Actor} vehicle
   * @returns {Promise<string|null>} The new phase, or null if turn is over
   */
  static async advancePhase(vehicle) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return null;

    const state = this.getTurnState(vehicle);
    const currentIdx = state.phaseIndex;
    const nextIdx = currentIdx + 1;

    if (nextIdx >= this.PHASES.length) {
      // Turn complete
      await this.endTurn(vehicle);
      return null;
    }

    const newPhase = this.PHASES[nextIdx];
    const completed = [...state.completedPhases, state.currentPhase];

    await vehicle.update({
      'system.turnState.currentPhase': newPhase,
      'system.turnState.phaseIndex': nextIdx,
      'system.turnState.completedPhases': completed
    });

    const phaseInfo = this.PHASE_DATA[newPhase];

    await ChatMessage.create({
      content: `<div class="swse-turn-msg">
        <strong>${vehicle.name}</strong><br>
        Phase: <strong>${phaseInfo.label}</strong><br>
        <em>${phaseInfo.description}</em>
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: vehicle })
    });

    return newPhase;
  }

  /**
   * Skip current phase and advance.
   *
   * @param {Actor} vehicle
   * @returns {Promise<string|null>}
   */
  static async skipPhase(vehicle) {
    return this.advancePhase(vehicle);
  }

  /**
   * Mark a crew member as having acted in the current phase.
   *
   * @param {Actor} vehicle
   * @param {string} position - Crew position name
   * @returns {Promise<void>}
   */
  static async markCrewActed(vehicle, position) {
    if (!vehicle || vehicle.type !== 'vehicle') return;

    const crewActed = { ...(vehicle.system.turnState?.crewActed ?? {}) };
    crewActed[position] = true;

    await vehicle.update({
      'system.turnState.crewActed': crewActed
    });
  }

  /**
   * Check if a crew position has already acted this turn.
   *
   * @param {Actor} vehicle
   * @param {string} position
   * @returns {boolean}
   */
  static hasCrewActed(vehicle, position) {
    return vehicle?.system?.turnState?.crewActed?.[position] === true;
  }

  /**
   * End the vehicle's turn. Runs cleanup.
   *
   * @param {Actor} vehicle
   * @returns {Promise<void>}
   */
  static async endTurn(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') return;

    // Clear turn state
    await vehicle.update({
      'system.turnState': {
        currentPhase: 'cleanup',
        phaseIndex: this.PHASES.length - 1,
        completedPhases: this.PHASES,
        crewActed: {}
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /*  CREW RESOLUTION                                                          */
  /* -------------------------------------------------------------------------- */

  /**
   * Get the actor assigned to a crew position.
   *
   * @param {Actor} vehicle
   * @param {string} position
   * @returns {Actor|null}
   */
  static getCrewMember(vehicle, position) {
    if (!vehicle || vehicle.type !== 'vehicle') return null;

    const crewData = vehicle.system.crewPositions?.[position];
    if (!crewData) return null;

    const name = typeof crewData === 'string' ? crewData : crewData?.name;
    if (!name) return null;

    return game.actors?.getName(name) ?? null;
  }

  /**
   * Get all occupied crew positions with their actors.
   *
   * @param {Actor} vehicle
   * @returns {Array<{position: string, actor: Actor}>}
   */
  static getActiveCrew(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') return [];

    const positions = ['commander', 'pilot', 'engineer', 'shields', 'gunner', 'copilot'];
    const crew = [];

    for (const pos of positions) {
      const actor = this.getCrewMember(vehicle, pos);
      if (actor) {
        crew.push({ position: pos, actor });
      }
    }

    return crew;
  }

  /**
   * Check if a vehicle has a crew member in a specific position.
   *
   * @param {Actor} vehicle
   * @param {string} position
   * @returns {boolean}
   */
  static hasCrewPosition(vehicle, position) {
    return this.getCrewMember(vehicle, position) !== null;
  }

  /* -------------------------------------------------------------------------- */
  /*  AVAILABLE ACTIONS                                                        */
  /* -------------------------------------------------------------------------- */

  /**
   * Get available actions for the current phase.
   *
   * @param {Actor} vehicle
   * @returns {Array<{action: string, label: string, description: string}>}
   */
  static getAvailableActions(vehicle) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return [];

    const state = this.getTurnState(vehicle);
    const phase = state.currentPhase;

    const actions = {
      commander: [
        { action: 'coordinateFire', label: 'Coordinate Fire', description: '+1/+2 attack bonus to gunners' },
        { action: 'inspire', label: 'Inspire Crew', description: '+1 morale to crew skill checks' },
        { action: 'battleAnalysis', label: 'Battle Analysis', description: 'Reveal enemy DT and CT' },
        { action: 'skip', label: 'Skip', description: 'No commander orders' }
      ],
      pilot: [
        { action: 'evasive', label: 'Evasive Action', description: '+2 Reflex, -2 attacks' },
        { action: 'attackRun', label: 'Attack Run', description: '+2 attacks, -2 Reflex' },
        { action: 'allOut', label: 'All-Out Movement', description: '2x speed, no attacks' },
        { action: 'trick', label: 'Trick Maneuver', description: 'Opposed Pilot check' },
        { action: 'standard', label: 'Standard Flying', description: 'Normal movement' }
      ],
      engineer: [
        { action: 'allocatePower', label: 'Allocate Power', description: 'Redistribute power budget' },
        { action: 'reroutePower', label: 'Reroute Power', description: 'Shift power between systems' },
        { action: 'repair', label: 'Field Repair', description: 'Repair damaged subsystem' },
        { action: 'emergencyPatch', label: 'Emergency Patch', description: 'Spend FP + DC 20 Mechanics' },
        { action: 'skip', label: 'Skip', description: 'No engineer actions' }
      ],
      shields: [
        { action: 'redistribute', label: 'Redistribute Shields', description: 'Move shield points between zones' },
        { action: 'focus', label: 'Focus Shields', description: 'All shields to one zone' },
        { action: 'equalize', label: 'Equalize Shields', description: 'Even distribution' },
        { action: 'skip', label: 'Skip', description: 'No shield actions' }
      ],
      gunner: [
        { action: 'fire', label: 'Fire Weapon', description: 'Attack with a vehicle weapon' },
        { action: 'battery', label: 'Fire Battery', description: 'Fire weapon group' },
        { action: 'skip', label: 'Skip', description: 'Hold fire' }
      ],
      cleanup: []
    };

    return actions[phase] ?? [];
  }
}
