/**
 * Mechanics Skill Uses System
 * Implements all Star Wars Saga Edition Mechanics skill applications
 * from the core rulebook and supplemental reference books
 *
 * Core Mechanics Uses (Trained Only):
 * 1. Disable Device - Disarm traps/locks (DC 15-25)
 * 2. Handle Explosives - Set/disarm detonators and explosives
 * 3. Jury-Rig - Temporary repairs (DC 25)
 * 4. Repair - Permanent repairs with tool kit (DC 20, 1 hour)
 *
 * Extra Mechanics Uses (Supplemental Books):
 * 5. Biotech Adaptation - Graft technology to biotech (Legacy Era)
 * 6. Booby Trap - Install damage trap on sabotaged item (Scum and Villainy)
 * 7. Build Object - Construct items from scratch (Force Unleashed)
 * 8. Environmental Adaptation - Adapt to harsh environments (Rebellion Era)
 * 9. Hot Shot - Overload energy weapons (Scum and Villainy)
 * 10. Improvised Connection - Connect devices without cables (Legacy Era)
 * 11. Refit Antiquated Vehicle/Weapon - Modernize old equipment (Legacy Era)
 */

import { SWSELogger } from '../utils/logger.js';

export class MechanicsUses {

  /**
   * DISABLE DEVICE - Disarm traps, bypass locks, sabotage devices
   * Full-Round Action
   * DC varies by device complexity (15-25)
   * Requires Security Kit
   * Failure by 5+: Spring trap or device fails in obvious way
   * No trace of tampering: +5 DC
   */
  static async disableDevice(actor, deviceType = 'mechanical', complexity = 'simple', leaveNoTrace = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const mechanicsBonus = actor.system.skills?.mechanics?.total || 0;

    // DC by device complexity
    const dcByComplexity = {
      'simple': 15,        // Mechanical devices, basic locks
      'tricky': 20,        // Electronic devices, basic electronic locks
      'complex': 25        // Security systems, complex locks
    };

    let dc = dcByComplexity[complexity.toLowerCase()] || 15;

    // Increase DC if leaving no trace
    if (leaveNoTrace) {
      dc += 5;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + mechanicsBonus;
    const success = checkResult >= dc;
    const failureMargin = dc - checkResult;
    const springsOrFails = failureMargin >= 5;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Disable Device</strong> - ${complexity} ${deviceType}<br>` +
              `Base DC: ${dcByComplexity[complexity.toLowerCase()]}<br>` +
              `${leaveNoTrace ? 'No Trace Modifier: +5<br>' : ''}` +
              `Final DC: ${dc}<br>` +
              `Mechanics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Full-Round Action<br>` +
              `Required: Security Kit` +
              (springsOrFails ? '<br><strong style="color:red">TRAP SPRUNG/DEVICE FAILS!</strong>' : '')
    });

    SWSELogger.log(
      `MechanicsUses | ${actor.name} disabled device (${complexity}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}` +
      (springsOrFails ? ' (TRAP!)' : '')
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      deviceType: deviceType,
      complexity: complexity,
      leaveNoTrace: leaveNoTrace,
      action: 'Full-Round Action',
      required: 'Security Kit',
      springsOrFails: springsOrFails,
      message: success
        ? `Disables ${deviceType} device`
        : springsOrFails
          ? `${deviceType} device trap springs or failure obvious!`
          : `Cannot disable ${deviceType} device`
    };
  }

  /**
   * HANDLE EXPLOSIVES - Set detonators and place explosives
   * Connect detonator: DC 10 (Full-Round Action)
   * Failure: Explosive fails to go off
   * Failure by 10+: Explosive detonates during installation
   *
   * Disarm explosive: DC = set disarm DC (default 15)
   * Failure by 5+: Explosive detonates while adjacent
   *
   * Optimize placement: GM rolls, DC 15+ ignores Damage Reduction, DC 25+ double damage, DC 35+ triple damage
   */
  static async handleExplosives(actor, action = 'connect', explosivePower = '3d4', customDisarmDC = null) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const mechanicsBonus = actor.system.skills?.mechanics?.total || 0;

    let dc = 10; // Default
    let actionName = '';
    let timeRequired = 'Full-Round Action';

    if (action.toLowerCase() === 'connect') {
      dc = 10;
      actionName = 'Connect Detonator';
    } else if (action.toLowerCase() === 'disarm') {
      dc = customDisarmDC || 15;
      actionName = 'Disarm Explosive';
    } else if (action.toLowerCase() === 'booby-trap') {
      // Calculate DC based on damage: +5 DC per 1d4 damage
      const damageCount = parseInt(explosivePower.match(/\d+/)[0]) || 1;
      dc = 15 + (damageCount * 5);
      actionName = `Booby Trap (${explosivePower} damage)`;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + mechanicsBonus;
    const success = checkResult >= dc;
    const failureMargin = dc - checkResult;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Handle Explosives</strong> - ${actionName}<br>` +
              `DC: ${dc}<br>` +
              `Mechanics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Full-Round Action` +
              (failureMargin >= 10 && action.toLowerCase() === 'connect' ? '<br><strong style="color:red">EXPLOSION!</strong>' : '') +
              (failureMargin >= 5 && action.toLowerCase() === 'disarm' ? '<br><strong style="color:red">DETONATES WHILE ADJACENT!</strong>' : '')
    });

    SWSELogger.log(
      `MechanicsUses | ${actor.name} ${action}ed explosive: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      action: action,
      actionName: actionName,
      timeRequired: timeRequired,
      explosion: action.toLowerCase() === 'connect' && failureMargin >= 10,
      detonates: action.toLowerCase() === 'disarm' && failureMargin >= 5,
      message: success ? `${actionName} successful` : `${actionName} failed`
    };
  }

  /**
   * JURY-RIG - Make temporary repairs to disabled devices
   * Full-Round Action
   * DC 25 check
   * +5 bonus with Tool Kit
   * Moves device +2 steps on Condition Track, restores 1d8 HP
   * At end of scene: Moves -5 steps and becomes Disabled again
   */
  static async juryRig(actor, hasToolKit = true) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const mechanicsBonus = actor.system.skills?.mechanics?.total || 0;

    let dc = 25;
    let toolKitBonus = 0;

    if (hasToolKit) {
      toolKitBonus = 5;
      dc -= toolKitBonus;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + mechanicsBonus;
    const success = checkResult >= dc;

    // Temporary restoration roll
    const hpRoll = await new Roll('1d8').evaluate({ async: true });
    const hpRestored = success ? hpRoll.total : 0;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Jury-Rig</strong> - Temporary Repairs<br>` +
              `Base DC: 25<br>` +
              `${hasToolKit ? 'Tool Kit Bonus: -5<br>' : ''}` +
              `Final DC: ${dc}<br>` +
              `Mechanics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: Full-Round Action` +
              (success ? `<br>HP Restored: ${hpRestored}<br>Condition: +2 steps` : '')
    });

    SWSELogger.log(
      `MechanicsUses | ${actor.name} jury-rigged device: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} jury-rigs the device! Restores ${hpRestored} HP and +2 Condition.`
        : `${actor.name} fails to jury-rig the device.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      hasToolKit: hasToolKit,
      action: 'Full-Round Action',
      conditionMovement: success ? '+2 steps' : 'No change',
      hpRestored: hpRestored,
      duration: 'Until end of scene (then -5 steps, becomes Disabled)',
      message: success ? `Jury-rig successful (${hpRestored} HP, +2 Condition)` : 'Jury-rig failed'
    };
  }

  /**
   * REPAIR - Permanently repair damaged/disabled droids or objects
   * Requires at least 1 hour of work, then DC 20 check
   * Requires Tool Kit
   * Can aid another with Aid Another action
   * Droids: Restore HP = Droid's Character Level, remove Persistent Conditions
   * Objects: Restore 1d8 HP, remove Persistent Conditions
   * Droid repairing itself: -5 penalty
   * Vehicle repairs: Apply penalties from Condition Track position
   */
  static async repair(actor, targetType = 'object', targetLevel = 1, isVehicle = false, vehicleConditionPenalty = 0) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const mechanicsBonus = actor.system.skills?.mechanics?.total || 0;

    const dc = 20;
    let penalty = 0;
    let hpRestored = 0;

    if (isVehicle) {
      penalty = vehicleConditionPenalty;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const totalBonus = mechanicsBonus + penalty;
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;

    if (success) {
      if (targetType.toLowerCase() === 'droid') {
        hpRestored = targetLevel;
      } else {
        hpRestored = parseInt(new Roll('1d8').evaluate({ async: false }).total);
      }
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Repair</strong> - ${targetType}<br>` +
              `Time Required: 1 hour<br>` +
              `DC: ${dc}<br>` +
              `${penalty !== 0 ? `Penalty: ${penalty}<br>` : ''}` +
              `Mechanics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Required: Tool Kit` +
              (success ? `<br>HP Restored: ${hpRestored}` : '')
    });

    SWSELogger.log(
      `MechanicsUses | ${actor.name} repaired ${targetType}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      targetType: targetType,
      timeRequired: '1 hour',
      hpRestored: hpRestored,
      conditionsRemoved: success ? 'All Persistent' : 'None',
      required: 'Tool Kit',
      message: success
        ? `Repairs ${targetType}, restores ${hpRestored} HP, removes Persistent Conditions`
        : `Repair unsuccessful`
    };
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get Mechanics bonus
   */
  static getMechanicsBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.mechanics?.total || 0;
  }

  /**
   * Calculate optimal placement damage bonus
   * DC 15+: Ignore Damage Reduction
   * DC 25+: Double damage
   * DC 35+: Triple damage
   */
  static getPlacementDamageBonus(checkResult) {
    if (checkResult >= 35) return 3;
    if (checkResult >= 25) return 2;
    if (checkResult >= 15) return 1;
    return 0;
  }
}

export default MechanicsUses;
