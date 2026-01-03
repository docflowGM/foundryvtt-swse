/**
 * Climb Skill Uses System
 * Implements all Star Wars Saga Edition Climb skill applications
 * from the core rulebook and supplemental reference books
 *
 * Core Climb Uses:
 * 1. Climb Surface - Scale walls, cliffs, slopes with varying DCs
 * 2. Accelerated Climbing - Climb faster with -5 penalty
 * 3. Catching Yourself When Falling - Attempt to catch fall with high DC
 * 4. Making Handholds and Footholds - Create handholds with pitons
 *
 * Extra Climb Uses (Supplemental Books):
 * 5. Climbing in Low/High Gravity - Modified DCs and movement (KOTOR)
 * 6. Extreme Conditions - Additional DC modifiers for harsh environments (Force Unleashed)
 */

import { SWSELogger } from '../utils/logger.js';

export class ClimbUses {

  /**
   * CLIMB SURFACE - Scale a wall, cliff, slope, or other incline
   * Movement: Half Speed as Full-Round Action, One-Quarter Speed as Move Action
   * Accelerated: Full Speed as Full-Round Action with -5 penalty
   * Failed check: No progress
   * Failed by 5+: Fall from current height (take falling damage)
   * While climbing: +2 bonus to attacks against you, lose DEX to Reflex Defense
   */
  static async climbSurface(actor, surfaceType = 'rough-wall', distance = 30, isAccelerated = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const climbBonus = actor.system.skills?.climb?.total || 0;
    const armorPenalty = actor.system.skills?.climb?.armor || 0;

    // Determine DC by surface type
    const dcBySurface = {
      'slope': 0,                          // Slope too steep to walk up; knotted rope with wall
      'knotted-rope-with-wall': 0,         // Knotted rope with wall to brace
      'rope-or-knotted-rope': 5,           // Rope with wall OR knotted rope (not both)
      'rough-wall': 10,                    // Very rough wall with ledges
      'natural-rock': 15,                  // Natural rock or tree with handholds/footholds
      'unknotted-rope': 15,                // Unknotted rope
      'narrow-handholds': 20,              // Uneven surface with narrow handholds/footholds
      'rough-surface': 25,                 // Natural rock wall or brick wall
      'overhanging': 25,                   // Overhanging or ceiling with handholds but no footholds
      'air-duct': -10,                     // Inside air duct (brace against two walls, reduces DC by 10)
      'corner': -5                         // Corner where can brace (reduces DC by 5)
    };

    let dc = dcBySurface[surfaceType.toLowerCase()] || 15;
    let penalty = 0;

    if (isAccelerated) {
      penalty = -5;
    }

    // Apply modifiers
    const totalBonus = climbBonus + armorPenalty + penalty;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + totalBonus;
    const success = checkResult >= dc;
    const failureMargin = dc - checkResult;
    const falls = failureMargin >= 5;

    // Calculate movement based on success and acceleration
    let movement = '';
    if (isAccelerated) {
      movement = success ? 'Full Speed (Full-Round)' : 'Half Speed (Move)';
    } else {
      movement = success ? 'Half Speed (Full-Round)' : 'One-Quarter Speed (Move)';
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Climb Surface</strong> - ${surfaceType}<br>` +
              `Distance: ${distance} feet<br>` +
              `DC: ${dc}<br>` +
              `${penalty !== 0 ? `Penalty: ${penalty}<br>` : ''}` +
              `Climb Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Movement: ${movement}` +
              (falls ? `<br><strong style="color:red">FALL! Failed by 5+</strong>` : '')
    });

    SWSELogger.log(
      `ClimbUses | ${actor.name} climbed ${surfaceType}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}` +
      (falls ? ' (FALLS!)' : '')
    );

    const result = {
      success: success,
      checkResult: checkResult,
      dc: dc,
      surfaceType: surfaceType,
      distance: distance,
      movement: movement,
      isAccelerated: isAccelerated,
      armorPenalty: armorPenalty,
      affectedByAttack: !success,
      effects: {
        attackBonus: '+2 to attacks against climber',
        loseDefense: 'Lose DEX bonus to Reflex Defense',
        takeDamageCheck: 'Must make Climb check when taking damage or fall'
      }
    };

    if (falls) {
      result.falls = true;
      result.fallMessage = `Falls from ${distance} feet (failed by ${failureMargin} points)`;
      result.takeFallingDamage = true;
    }

    const statusMsg = success
      ? `${actor.name} climbs the ${surfaceType} successfully!`
      : falls
        ? `${actor.name} loses grip and FALLS from ${distance} feet!`
        : `${actor.name} makes no progress climbing the ${surfaceType}.`;

    ui.notifications.info(statusMsg);

    return result;
  }

  /**
   * ACCELERATED CLIMBING - Climb faster but with penalty
   * Normal: Half Speed Full-Round, One-Quarter Speed Move
   * Accelerated: Full Speed Full-Round, Half Speed Move (with -5 penalty)
   */
  static async acceleratedClimbing(actor, surfaceType = 'rough-wall', distance = 30) {
    // Use climbSurface with accelerated flag
    return this.climbSurface(actor, surfaceType, distance, true);
  }

  /**
   * CATCHING YOURSELF WHEN FALLING
   * Attempt to catch yourself while falling from a climb
   * DC = Surface DC + 20 (or + 10 for slopes)
   * Success: Arrest fall at current position
   * Failure: Continue falling
   */
  static async catchYourselfFalling(actor, surfaceType = 'rough-wall', isSlope = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const climbBonus = actor.system.skills?.climb?.total || 0;

    // Base DC for surface
    const dcBySurface = {
      'slope': 0,
      'knotted-rope-with-wall': 0,
      'rope-or-knotted-rope': 5,
      'rough-wall': 10,
      'natural-rock': 15,
      'unknotted-rope': 15,
      'narrow-handholds': 20,
      'rough-surface': 25,
      'overhanging': 25
    };

    let baseDC = dcBySurface[surfaceType.toLowerCase()] || 15;
    let dc = baseDC + (isSlope ? 10 : 20);

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + climbBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Catch Yourself When Falling</strong><br>` +
              `Surface: ${surfaceType}${isSlope ? ' (Slope)' : ''}<br>` +
              `Base DC: ${baseDC}, + ${isSlope ? '10' : '20'} for falling<br>` +
              `Total DC: ${dc}<br>` +
              `Climb Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `ClimbUses | ${actor.name} attempted to catch self falling: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} catches themselves and stops the fall!`
        : `${actor.name} cannot catch themselves and continues falling!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      surfaceType: surfaceType,
      baseDC: baseDC,
      modifier: isSlope ? 10 : 20,
      arrested: success,
      message: success ? 'Catches themselves at current position' : 'Falls through (continues falling)'
    };
  }

  /**
   * MAKING HANDHOLDS AND FOOTHOLDS
   * Use pitons to create handholds/footholds in a wall
   * Takes 1 minute per piton, one piton needed per meter
   * Resulting wall has DC 15
   * Returns number of pitons placed and time required
   */
  static async makeHandholds(actor, wallHeight = 30, availablePitons = 10) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    // Calculate pitons needed (1 per meter, roughly 1 per 3 feet)
    const proteinNeeded = Math.ceil(wallHeight / 3);
    const pitonCount = Math.min(proteinNeeded, availablePitons);
    const timeRequired = pitonCount; // Minutes

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Making Handholds and Footholds</strong><br>` +
              `Wall Height: ${wallHeight} feet<br>` +
              `Pitons Available: ${availablePitons}<br>` +
              `Pitons Placed: ${pitonCount}<br>` +
              `Time Required: ${timeRequired} minute(s)<br>` +
              `Resulting DC: 15`
    });

    SWSELogger.log(
      `ClimbUses | ${actor.name} placed ${pitonCount} pitons ` +
      `(${wallHeight}ft wall, ${timeRequired} minutes)`
    );

    ui.notifications.info(
      `${actor.name} places ${pitonCount} pitons in ${timeRequired} minute(s). ` +
      `Wall now has DC 15 for climbing.`
    );

    return {
      success: true,
      wallHeight: wallHeight,
      pitonCount: pitonCount,
      pitonAvailable: availablePitons,
      timeRequired: `${timeRequired} minute(s)`,
      resultingDC: 15,
      message: `Placed ${pitonCount} pitons - wall now climbable at DC 15`
    };
  }

  /**
   * CLIMBING IN LOW OR HIGH GRAVITY (Force Unleashed Campaign Guide)
   * Low Gravity: DCs halved, movement doubled
   * High Gravity: DCs doubled, climb speed halved (minimum 1 square)
   */
  static async climbInSpecialGravity(actor, surfaceType = 'rough-wall', gravityType = 'low', distance = 30) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const climbBonus = actor.system.skills?.climb?.total || 0;

    // Base DC for surface
    const dcBySurface = {
      'slope': 0,
      'knotted-rope-with-wall': 0,
      'rope-or-knotted-rope': 5,
      'rough-wall': 10,
      'natural-rock': 15,
      'unknotted-rope': 15,
      'narrow-handholds': 20,
      'rough-surface': 25,
      'overhanging': 25
    };

    let baseDC = dcBySurface[surfaceType.toLowerCase()] || 15;
    let dc = baseDC;
    let movementModifier = 1;

    const gravityLabel = gravityType.toLowerCase() === 'low' ? 'Low Gravity' : 'High Gravity';

    if (gravityType.toLowerCase() === 'low') {
      dc = Math.ceil(baseDC / 2);
      movementModifier = 2;
    } else if (gravityType.toLowerCase() === 'high') {
      dc = baseDC * 2;
      movementModifier = 0.5;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + climbBonus;
    const success = checkResult >= dc;

    const adjustedDistance = Math.max(5, Math.ceil(distance * movementModifier));

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Climb in ${gravityLabel}</strong><br>` +
              `Surface: ${surfaceType}<br>` +
              `Base DC: ${baseDC}<br>` +
              `Modified DC: ${dc}<br>` +
              `Climb Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Movement: ${adjustedDistance} feet ` +
              (gravityType.toLowerCase() === 'low' ? '(doubled)' : '(halved)')
    });

    SWSELogger.log(
      `ClimbUses | ${actor.name} climbed in ${gravityLabel}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} climbs in ${gravityLabel} successfully! Movement: ${adjustedDistance}ft`
        : `${actor.name} struggles in ${gravityLabel} gravity.`
    );

    return {
      success: success,
      checkResult: checkResult,
      baseDC: baseDC,
      modifiedDC: dc,
      surfaceType: surfaceType,
      gravityType: gravityType,
      movementModifier: movementModifier,
      distance: distance,
      adjustedDistance: adjustedDistance,
      source: 'Force Unleashed Campaign Guide',
      dcAdjustment: gravityType.toLowerCase() === 'low' ? 'Halved' : 'Doubled',
      movementAdjustment: gravityType.toLowerCase() === 'low' ? 'Doubled' : 'Halved'
    };
  }

  /**
   * EXTREME CONDITIONS (Force Unleashed Campaign Guide)
   * Climbing in extreme conditions increases DC by 5 per circumstance
   * Circumstances: High altitude, weather, temperature, unusual surfaces
   * Specialized climbing gear can negate these penalties
   */
  static async climbExtremeConditions(actor, surfaceType = 'rough-wall', conditions = [], hasSpecialGear = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const climbBonus = actor.system.skills?.climb?.total || 0;

    // Base DC for surface
    const dcBySurface = {
      'slope': 0,
      'knotted-rope-with-wall': 0,
      'rope-or-knotted-rope': 5,
      'rough-wall': 10,
      'natural-rock': 15,
      'unknotted-rope': 15,
      'narrow-handholds': 20,
      'rough-surface': 25,
      'overhanging': 25
    };

    let baseDC = dcBySurface[surfaceType.toLowerCase()] || 15;

    // Each condition adds +5 to DC
    const conditionPenalty = conditions.length * 5;
    let dc = baseDC + conditionPenalty;

    // Specialized gear negates penalties
    if (hasSpecialGear) {
      dc = baseDC;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + climbBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Climb in Extreme Conditions</strong><br>` +
              `Reference: Force Unleashed Campaign Guide<br>` +
              `Surface: ${surfaceType}<br>` +
              `Base DC: ${baseDC}<br>` +
              `Conditions: ${conditions.length > 0 ? conditions.join(', ') : 'None'}<br>` +
              `Condition Penalty: +${conditionPenalty}<br>` +
              `${hasSpecialGear ? 'Gear: Negates penalties<br>' : ''}` +
              `Final DC: ${dc}<br>` +
              `Climb Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `ClimbUses | ${actor.name} climbed in extreme conditions: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} successfully climbs despite extreme conditions!`
        : `${actor.name} struggles with the extreme conditions.`
    );

    return {
      success: success,
      checkResult: checkResult,
      baseDC: baseDC,
      conditions: conditions,
      conditionCount: conditions.length,
      conditionPenalty: conditionPenalty,
      finalDC: dc,
      surfaceType: surfaceType,
      hasSpecialGear: hasSpecialGear,
      gearNegatesPenalty: hasSpecialGear,
      source: 'Force Unleashed Campaign Guide',
      estimatedGearCost: 'Field Kit equivalent',
      message: success ? 'Successfully navigates extreme climbing conditions' : 'Struggles with extreme conditions'
    };
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Get Climb bonus for actor
   */
  static getClimbBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.climb?.total || 0;
  }

  /**
   * Get armor penalty
   */
  static getArmorPenalty(actor) {
    if (!actor) return 0;
    return actor.system.skills?.climb?.armor || 0;
  }

  /**
   * Calculate damage from fall
   * 1d6 per 10 feet fallen
   */
  static calculateFallingDamage(distance) {
    const dice = Math.ceil(distance / 10);
    return `${dice}d6`;
  }

  /**
   * Get DC for surface type
   */
  static getSurfaceDC(surfaceType) {
    const dcBySurface = {
      'slope': 0,
      'knotted-rope-with-wall': 0,
      'rope-or-knotted-rope': 5,
      'rough-wall': 10,
      'natural-rock': 15,
      'unknotted-rope': 15,
      'narrow-handholds': 20,
      'rough-surface': 25,
      'overhanging': 25
    };
    return dcBySurface[surfaceType.toLowerCase()] ?? 15;
  }
}

export default ClimbUses;
