/**
 * EnhancedEngineer — Power allocation and repair action system.
 *
 * The Engineer crew member manages:
 *   - Power allocation between systems (weapons, shields, engines)
 *   - Field repair of subsystems
 *   - Reroute power (boost one system at the cost of another)
 *   - Emergency Patch integration (via ThresholdEngine)
 *
 * Power Budget:
 *   Each vehicle has a power pool (based on size/level).
 *   Default allocation: balanced (equal to all systems).
 *   Engineer can reallocate as a Standard Action.
 *
 * Gated behind enableEnhancedEngineer world setting.
 * Does NOT directly modify attack rolls or defense — provides modifiers
 * that other engines consume.
 */

export class EnhancedEngineer {

  static SYSTEMS = Object.freeze(['weapons', 'shields', 'engines']);

  static POWER_LEVELS = Object.freeze({
    OFFLINE: 0,
    REDUCED: 1,
    NORMAL: 2,
    BOOSTED: 3,
    OVERCHARGED: 4
  });

  /** Modifiers for each power level */
  static POWER_MODIFIERS = Object.freeze({
    weapons: {
      0: { attackBonus: -999, damageMultiplier: 0, label: 'Offline' },
      1: { attackBonus: -2, damageMultiplier: 0.5, label: 'Reduced' },
      2: { attackBonus: 0, damageMultiplier: 1, label: 'Normal' },
      3: { attackBonus: 2, damageMultiplier: 1, label: 'Boosted' },
      4: { attackBonus: 4, damageMultiplier: 1.5, label: 'Overcharged' }
    },
    shields: {
      0: { regenMultiplier: 0, capacityMultiplier: 0, label: 'Offline' },
      1: { regenMultiplier: 0.5, capacityMultiplier: 0.5, label: 'Reduced' },
      2: { regenMultiplier: 1, capacityMultiplier: 1, label: 'Normal' },
      3: { regenMultiplier: 1.5, capacityMultiplier: 1.25, label: 'Boosted' },
      4: { regenMultiplier: 2, capacityMultiplier: 1.5, label: 'Overcharged' }
    },
    engines: {
      0: { speedMultiplier: 0, maneuverBonus: -999, label: 'Offline' },
      1: { speedMultiplier: 0.5, maneuverBonus: -2, label: 'Reduced' },
      2: { speedMultiplier: 1, maneuverBonus: 0, label: 'Normal' },
      3: { speedMultiplier: 1.5, maneuverBonus: 2, label: 'Boosted' },
      4: { speedMultiplier: 2, maneuverBonus: 4, label: 'Overcharged' }
    }
  });

  /* -------------------------------------------------------------------------- */
  /*  SETTINGS                                                                  */
  /* -------------------------------------------------------------------------- */

  static get enabled() {
    try {
      return game.settings?.get('foundryvtt-swse', 'enableEnhancedEngineer') ?? false;
    } catch {
      return false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  POWER STATE                                                               */
  /* -------------------------------------------------------------------------- */

  /**
   * Get the default power budget for a vehicle.
   * Budget = 6 (balanced: 2 per system).
   * Larger ships get more.
   *
   * @param {Actor} vehicle
   * @returns {number}
   */
  static getPowerBudget(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') return 6;

    const size = (vehicle.system.size ?? 'colossal').toLowerCase();
    const budgets = {
      'large': 6,
      'huge': 7,
      'gargantuan': 8,
      'colossal': 9,
      'colossal (frigate)': 10,
      'colossal (cruiser)': 12,
      'colossal (station)': 14
    };

    return budgets[size] ?? 6;
  }

  /**
   * Get current power allocation.
   *
   * @param {Actor} vehicle
   * @returns {{ weapons: number, shields: number, engines: number, budget: number, spent: number }}
   */
  static getPowerAllocation(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') {
      return { weapons: 2, shields: 2, engines: 2, budget: 6, spent: 6 };
    }

    const power = vehicle.system.powerAllocation ?? {};
    const budget = this.getPowerBudget(vehicle);

    const allocation = {
      weapons: power.weapons ?? 2,
      shields: power.shields ?? 2,
      engines: power.engines ?? 2,
      budget
    };

    allocation.spent = allocation.weapons + allocation.shields + allocation.engines;
    return allocation;
  }

  /**
   * Get the modifiers for current power allocation.
   *
   * @param {Actor} vehicle
   * @returns {Object}
   */
  static getPowerModifiers(vehicle) {
    if (!this.enabled) {
      return {
        weapons: this.POWER_MODIFIERS.weapons[2],
        shields: this.POWER_MODIFIERS.shields[2],
        engines: this.POWER_MODIFIERS.engines[2]
      };
    }

    const allocation = this.getPowerAllocation(vehicle);

    return {
      weapons: this.POWER_MODIFIERS.weapons[allocation.weapons] ?? this.POWER_MODIFIERS.weapons[2],
      shields: this.POWER_MODIFIERS.shields[allocation.shields] ?? this.POWER_MODIFIERS.shields[2],
      engines: this.POWER_MODIFIERS.engines[allocation.engines] ?? this.POWER_MODIFIERS.engines[2]
    };
  }

  /* -------------------------------------------------------------------------- */
  /*  POWER ALLOCATION                                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Set power allocation. Engineer Standard Action.
   * Total allocated must not exceed budget.
   *
   * @param {Actor} vehicle
   * @param {{ weapons: number, shields: number, engines: number }} allocation
   * @returns {Promise<boolean>}
   */
  static async allocatePower(vehicle, allocation) {
    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return false;

    const budget = this.getPowerBudget(vehicle);
    const total = (allocation.weapons ?? 2) + (allocation.shields ?? 2) + (allocation.engines ?? 2);

    if (total > budget) {
      ui.notifications?.warn(`Power allocation (${total}) exceeds budget (${budget}).`);
      return false;
    }

    // Validate ranges
    for (const sys of this.SYSTEMS) {
      const val = allocation[sys] ?? 2;
      if (val < 0 || val > 4) {
        ui.notifications?.warn(`Invalid power level for ${sys}: ${val}. Must be 0-4.`);
        return false;
      }
    }

    await vehicle.update({
      'system.powerAllocation.weapons': allocation.weapons ?? 2,
      'system.powerAllocation.shields': allocation.shields ?? 2,
      'system.powerAllocation.engines': allocation.engines ?? 2
    });

    const wMod = this.POWER_MODIFIERS.weapons[allocation.weapons] ?? {};
    const sMod = this.POWER_MODIFIERS.shields[allocation.shields] ?? {};
    const eMod = this.POWER_MODIFIERS.engines[allocation.engines] ?? {};

    await ChatMessage.create({
      content: `<div class="swse-engineer-msg">
        <strong>Power Reallocated — ${vehicle.name}</strong><br>
        Weapons: ${wMod.label} (${allocation.weapons}) |
        Shields: ${sMod.label} (${allocation.shields}) |
        Engines: ${eMod.label} (${allocation.engines})<br>
        <em>Budget: ${total}/${budget}</em>
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: vehicle })
    });

    return true;
  }

  /**
   * Reroute power: boost one system by reducing another.
   * Engineer Swift Action.
   *
   * @param {Actor} vehicle
   * @param {string} boostSystem - System to increase
   * @param {string} reduceSystem - System to decrease
   * @returns {Promise<boolean>}
   */
  static async reroutePower(vehicle, boostSystem, reduceSystem) {
    if (!this.enabled) return false;
    if (boostSystem === reduceSystem) return false;

    const current = this.getPowerAllocation(vehicle);

    const newAllocation = {
      weapons: current.weapons,
      shields: current.shields,
      engines: current.engines
    };

    // Reduce one, boost the other
    if (newAllocation[reduceSystem] <= 0) {
      ui.notifications?.warn(`${reduceSystem} is already at minimum power.`);
      return false;
    }
    if (newAllocation[boostSystem] >= 4) {
      ui.notifications?.warn(`${boostSystem} is already at maximum power.`);
      return false;
    }

    newAllocation[reduceSystem] -= 1;
    newAllocation[boostSystem] += 1;

    return this.allocatePower(vehicle, newAllocation);
  }

  /* -------------------------------------------------------------------------- */
  /*  FIELD REPAIR                                                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Attempt field repair of a subsystem.
   * Engineer Standard Action, Mechanics check.
   *
   * @param {Actor} vehicle
   * @param {Actor} engineer
   * @param {string} subsystem
   * @param {number} mechanicsCheck
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async attemptRepair(vehicle, engineer, subsystem, mechanicsCheck) {
    if (!vehicle || vehicle.type !== 'vehicle') {
      return { success: false, message: 'Not a vehicle.' };
    }

    // DC based on current damage tier
    const { SubsystemEngine } = await import('./subsystem-engine.js');
    const currentTier = SubsystemEngine.getSubsystemTier(vehicle, subsystem);

    const dcMap = {
      'damaged': 15,
      'disabled': 20,
      'destroyed': 999 // Cannot field repair destroyed
    };

    const dc = dcMap[currentTier] ?? 999;

    if (dc >= 999) {
      return { success: false, message: `${subsystem} is destroyed and cannot be field repaired.` };
    }

    if (mechanicsCheck >= dc) {
      await SubsystemEngine.repairSubsystem(vehicle, subsystem);

      const msg = `${engineer.name} successfully repairs ${subsystem} (rolled ${mechanicsCheck} vs DC ${dc}).`;
      await ChatMessage.create({
        content: `<div class="swse-engineer-msg"><strong>Repair Successful!</strong><br>${msg}</div>`,
        speaker: ChatMessage.getSpeaker({ actor: engineer })
      });

      return { success: true, message: msg };
    }

    const msg = `${engineer.name} fails to repair ${subsystem} (rolled ${mechanicsCheck} vs DC ${dc}).`;
    await ChatMessage.create({
      content: `<div class="swse-engineer-msg"><strong>Repair Failed</strong><br>${msg}</div>`,
      speaker: ChatMessage.getSpeaker({ actor: engineer })
    });

    return { success: false, message: msg };
  }
}
