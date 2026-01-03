/**
 * Acrobatics Skill Uses System
 * Implements all Star Wars Saga Edition Acrobatics skill applications
 * from the core rulebook and supplemental reference books
 *
 * Core Acrobatics Uses:
 * 1. Balance - Move at half speed along narrow surfaces
 * 2. Cross Difficult Terrain - Move through difficult terrain (Trained)
 * 3. Escape Bonds - Slip free of restraints, grapples, nets
 * 4. Fall Prone - Drop to Prone as Free Action (Trained)
 * 5. Reduce Falling Damage - Treat fall as shorter (Trained)
 * 6. Stand up from Prone - Stand up as Swift Action (Trained)
 * 7. Tumble - Move through threatened areas without AoO (Trained)
 *
 * Extra Acrobatics Uses (Supplemental Books):
 * 8. Catch Item - Snatch disarmed item from air (Trained - Scum and Villainy)
 * 9. Escape Artist - Reduce time to escape bonds (Trained - Scum and Villainy)
 * 10. Low/High Gravity - Negate environment penalties (Trained - Force Unleashed)
 * 11. Nimble Charge - Charge through obstacles (Trained - Scum and Villainy)
 * 12. Zero-Gravity Environments - Maneuver in zero-g (Trained - Force Unleashed)
 */

import { SWSELogger } from '../utils/logger.js';

export class AcrobaticsUses {

  /**
   * BALANCE - Move at half speed along narrow surfaces
   * Can move at half speed across a narrow ledge or wire
   * DC varies based on surface width
   * Failure: Fall Prone and must make DC 15 check to catch ledge
   * Special: Trained acrobats are not flat-footed while balancing
   */
  static async balance(actor, surfaceWidth = 'medium', isSlippery = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    // Determine DC based on surface width
    const dcByWidth = {
      'wide': 10,        // 8-15 cm wide
      'medium': 15,      // 4-7 cm wide
      'narrow': 20,      // Less than 4 cm wide
      'very-narrow': 25  // Extra narrow custom
    };

    let dc = dcByWidth[surfaceWidth.toLowerCase()] || 15;

    // Increase DC if slippery or unstable
    if (isSlippery) {
      dc += 5;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Balance</strong> - Narrow Surface<br>` +
              `Surface Width: ${surfaceWidth}${isSlippery ? ' (Slippery)' : ''}<br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} balanced on narrow surface: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    const result = {
      success: success,
      checkResult: checkResult,
      dc: dc,
      surfaceWidth: surfaceWidth,
      isSlippery: isSlippery,
      movement: success ? 'Half Speed' : 'Falls Prone',
      isTrained: isTrained,
      effects: {
        flatFootedWhileBalancing: !isTrained,
        message: isTrained
          ? 'Trained acrobats are not flat-footed while balancing'
          : 'You are flat-footed while balancing (lose DEX to Reflex Defense)'
      }
    };

    if (!success) {
      result.fallEffect = {
        fallProne: true,
        catchCheck: 'Must make DC 15 Acrobatics check to catch ledge',
        fallProneDC: 15
      };
    }

    ui.notifications.info(
      success
        ? `${actor.name} successfully balances and moves at half speed!`
        : `${actor.name} loses balance and falls prone!`
    );

    return result;
  }

  /**
   * CROSS DIFFICULT TERRAIN (Trained Only)
   * Move through Difficult Terrain at normal Speed with a DC 15 check
   * Untrained characters can only move through difficult terrain at half speed
   */
  static async crossDifficultTerrain(actor, terrainType = 'standard') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to cross difficult terrain at normal speed',
        untrained: true,
        movement: 'Untrained: Can only move through difficult terrain at half speed'
      };
    }

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Cross Difficult Terrain</strong> - Trained Only<br>` +
              `Terrain Type: ${terrainType}<br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} crossed difficult terrain: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} nimbly moves through difficult terrain at normal speed!`
        : `${actor.name} must move through difficult terrain at half speed.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      terrainType: terrainType,
      trained: true,
      movement: success ? 'Normal Speed' : 'Half Speed',
      movementBonus: success ? 'Can move through difficult terrain at normal speed' : 'Must move at half speed'
    };
  }

  /**
   * ESCAPE BONDS - Slip free of restraints or escape from grapple
   * DCs vary by restraint type:
   * - Ropes: Opponent's DEX check + 10
   * - Net: DC 15
   * - Binder Cuffs: DC 25
   * - Grapple: Opponent's Grapple check (Standard Action)
   * - Tight Space: DC 20 (Full Round Action per square)
   * Time varies by restraint type
   */
  static async escapeBonds(actor, restraintType = 'ropes', oppositionBonus = 0, timeRequired = 'full-round') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;

    // Determine DC by restraint type
    const dcByRestraint = {
      'ropes': 10 + oppositionBonus,           // Opponent's DEX check + 10
      'binder-cuffs': 25,                      // Binder cuffs DC
      'net': 15,                               // Net DC
      'grapple': oppositionBonus,              // Opponent's Grapple check
      'tight-space': 20                        // Tight space DC
    };

    const dc = dcByRestraint[restraintType.toLowerCase()] || 15;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    // Determine action required
    const actionByRestraint = {
      'ropes': '1 minute',
      'binder-cuffs': '1 minute',
      'net': 'Full-Round Action',
      'grapple': 'Standard Action',
      'tight-space': 'Full-Round Action per square'
    };

    const actionRequired = actionByRestraint[restraintType.toLowerCase()] || timeRequired;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Escape Bonds</strong> - ${restraintType}<br>` +
              `DC: ${dc}<br>` +
              `Time Required: ${actionRequired}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted to escape ${restraintType}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} escapes from ${restraintType}!`
        : `${actor.name} remains bound!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      restraintType: restraintType,
      actionRequired: actionRequired,
      timeRequired: actionRequired,
      escaped: success
    };
  }

  /**
   * FALL PRONE (Trained Only)
   * Drop to Prone position as Free Action instead of Swift Action
   * DC 15 check required
   * Only available to Trained Acrobatics users
   */
  static async fallProne(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to use Fall Prone',
        trained: false,
        standard: 'Untrained must use Swift Action to become Prone'
      };
    }

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Fall Prone</strong> - Trained Only<br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: ${success ? 'Free Action' : 'Swift Action'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted to fall prone: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success (Free Action)' : 'Failure (Swift Action)'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} drops prone as a Free Action!`
        : `${actor.name} drops prone as a Swift Action.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      action: success ? 'Free Action' : 'Swift Action',
      condition: 'Prone',
      message: success
        ? 'Drops to Prone position as Free Action (instead of Swift Action)'
        : 'Drops to Prone position as Swift Action'
    };
  }

  /**
   * REDUCE FALLING DAMAGE (Trained Only)
   * Treat fall as 3 meters (2 squares) shorter per successful DC 15 check
   * Additional 3 meters reduction per 10 points by which you beat the DC
   * If no damage from fall and check succeeds, land on feet
   * Can also reduce damage from falling objects by half with DC 15 check
   */
  static async reduceFallingDamage(actor, fallDistance = 10, isGreatDistance = false, targetLanding = null) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to reduce falling damage',
        trained: false,
        fallDistance: fallDistance
      };
    }

    let dc = 15;
    let roll = await new Roll('1d20').evaluate({ async: true });
    let checkResult = roll.total + acrobaticsBonus;
    let success = checkResult >= dc;

    let reducedDistance = 0;
    let landingSuccess = null;

    if (success) {
      // Base reduction of 3 meters (2 squares)
      reducedDistance = 3;

      // Additional reduction for beating DC by 10+
      const beatMargin = checkResult - dc;
      if (beatMargin >= 10) {
        reducedDistance += Math.floor(beatMargin / 10) * 3;
      }
    }

    // For great distances, can attempt to land on target
    if (success && isGreatDistance && targetLanding) {
      const landingDC = 20;
      roll = await new Roll('1d20').evaluate({ async: true });
      const landingRoll = roll.total + acrobaticsBonus;
      landingSuccess = landingRoll >= landingDC;

      // Can adjust by 1 square per 60 meters (40 squares) fallen
      const adjustmentSquares = Math.floor(fallDistance / 60);

      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: `<strong>Guide Landing in Great Fall</strong> - Precision Landing<br>` +
                `DC: ${landingDC}<br>` +
                `Distance Fallen: ${fallDistance} meters<br>` +
                `Allowed Adjustment: ${adjustmentSquares} squares<br>` +
                `Landing Check: ${landingRoll}${landingSuccess ? ' ✓' : ' ✗'}`
      });
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Reduce Falling Damage</strong> - Trained Only<br>` +
              `Fall Distance: ${fallDistance} meters<br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Reduced Distance: ${reducedDistance} meters` +
              (landingSuccess ? '<br>Landing: SUCCESS ✓' : (landingSuccess === false ? '<br>Landing: FAILED ✗' : ''))
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted to reduce fall damage: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'} ` +
      `(reduced by ${reducedDistance}m)`
    );

    const finalDistance = fallDistance - reducedDistance;

    ui.notifications.info(
      success
        ? `${actor.name} reduces fall damage! Fall treated as ${finalDistance}m instead of ${fallDistance}m.` +
          (reducedDistance === 0 && success ? ' Lands on feet!' : '')
        : `${actor.name} takes full fall damage from ${fallDistance}m fall.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      originalDistance: fallDistance,
      reducedDistance: reducedDistance,
      finalDistance: finalDistance,
      trained: true,
      landingRoll: landingSuccess !== null ? landingSuccess : undefined,
      landingSuccess: landingSuccess,
      landsOnFeet: success && reducedDistance === fallDistance,
      message: success
        ? `Fall treated as ${finalDistance}m shorter (reduced by ${reducedDistance}m)`
        : 'No reduction to fall damage'
    };
  }

  /**
   * REDUCE OBJECT DAMAGE - Reduce falling object damage by half
   * Opposed check: Acrobatics vs object's attack roll
   * Only for falling objects, not terrain damage
   */
  static async reduceObjectDamage(actor, objectAttackBonus = 0) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to reduce falling object damage',
        trained: false
      };
    }

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Reduce Falling Object Damage</strong><br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Result: ${success ? 'Reduce damage by half' : 'Take full damage'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted to dodge falling object: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} evades the falling object! Damage reduced by half!`
        : `${actor.name} takes the full impact of the falling object!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      damageFactor: success ? 0.5 : 1.0,
      message: success ? 'Damage reduced by 50%' : 'Takes full damage'
    };
  }

  /**
   * STAND UP FROM PRONE (Trained Only)
   * Stand up from Prone position as Swift Action instead of Move Action
   * DC 15 check required
   * Only available to Trained Acrobatics users
   */
  static async standUpFromProne(actor) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to stand up quickly from Prone',
        trained: false,
        standard: 'Untrained must use Move Action to stand up'
      };
    }

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Stand Up from Prone</strong> - Trained Only<br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Action: ${success ? 'Swift Action' : 'Move Action'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted to stand up from Prone: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success (Swift)' : 'Failure (Move)'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} stands up from Prone as a Swift Action!`
        : `${actor.name} stands up from Prone as a Move Action.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      action: success ? 'Swift Action' : 'Move Action',
      currentCondition: 'Prone',
      newCondition: 'Standing',
      message: success
        ? 'Stands up from Prone as Swift Action (instead of Move Action)'
        : 'Stands up from Prone as Move Action'
    };
  }

  /**
   * TUMBLE (Trained Only)
   * Move through threatened areas or fighting space of enemies without provoking AoO
   * Each threatened/occupied square counts as 2 squares of movement
   * Requires successful DC 15 Acrobatics check
   */
  static async tumble(actor, squaresMoved = 1) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to Tumble',
        trained: false
      };
    }

    const dc = 15;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    // Calculate movement cost
    const movementCost = squaresMoved * 2; // Each square counts as 2

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Tumble</strong> - Acrobatic Movement - Trained Only<br>` +
              `Squares to Move: ${squaresMoved}<br>` +
              `Movement Cost: ${movementCost} squares<br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted to tumble ${squaresMoved} squares: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} tumbles through threatened areas without provoking AoO!`
        : `${actor.name} fails to tumble and may provoke attacks of opportunity!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      squaresMoved: squaresMoved,
      movementCost: movementCost,
      action: 'Part of Move Action',
      avoidAoO: success,
      message: success
        ? `Moves ${squaresMoved} squares (${movementCost} movement cost) without provoking AoO`
        : `Fails to tumble - may provoke attacks of opportunity`
    };
  }

  // ========================================================================
  // EXTRA ACROBATICS USES FROM SUPPLEMENTAL BOOKS
  // ========================================================================

  /**
   * CATCH ITEM (Scum and Villainy - Trained Only)
   * After successfully disarming opponent, make DC 20 Acrobatics check as Free Action
   * If successful, snatch the object from the air
   * Must have at least one hand free to grab the item
   */
  static async catchItem(actor, itemName = 'item') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to Catch Item',
        trained: false
      };
    }

    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Catch Item</strong> - Free Action (After Disarm)<br>` +
              `Reference: Scum and Villainy<br>` +
              `Item: ${itemName}<br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted to catch ${itemName}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} snatches ${itemName} from the air!`
        : `${itemName} falls to the ground!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      itemName: itemName,
      action: 'Free Action',
      source: 'Scum and Villainy',
      requirements: 'Must have successfully Disarmed opponent and have one hand free',
      caught: success,
      message: success ? `Catches ${itemName}` : `Misses ${itemName}`
    };
  }

  /**
   * ESCAPE ARTIST (Scum and Villainy - Trained Only)
   * Reduce time to escape bonds by increasing DC by 10
   * Grapple: Move Action (instead of Standard Action)
   * Net/tight space: Standard Action (instead of Full-Round Action)
   * Ropes/cuffs/manacles: 5 rounds (instead of 1 minute)
   */
  static async escapeArtist(actor, restraintType = 'ropes', oppositionBonus = 0) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to use Escape Artist',
        trained: false
      };
    }

    // DC is 10 higher than normal escape
    const dcByRestraint = {
      'ropes': 20 + oppositionBonus,           // +10 penalty
      'binder-cuffs': 35,                      // +10 penalty
      'net': 25,                               // +10 penalty
      'grapple': 10 + oppositionBonus,         // +10 penalty
      'tight-space': 30                        // +10 penalty
    };

    const dc = dcByRestraint[restraintType.toLowerCase()] || 25;

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    // Reduced time requirements
    const reducedTimeByRestraint = {
      'ropes': '5 rounds',              // Instead of 1 minute
      'binder-cuffs': '5 rounds',       // Instead of 1 minute
      'net': 'Standard Action',         // Instead of Full-Round Action
      'grapple': 'Move Action',         // Instead of Standard Action
      'tight-space': 'Standard Action'  // Instead of Full-Round Action
    };

    const reducedTime = reducedTimeByRestraint[restraintType.toLowerCase()] || '5 rounds';

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Escape Artist</strong> - Faster Escape<br>` +
              `Reference: Scum and Villainy - Trained Only<br>` +
              `Restraint: ${restraintType}<br>` +
              `DC (with +10 penalty): ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Time if Successful: ${reducedTime}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted Escape Artist (${restraintType}): ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} quickly escapes from ${restraintType} in ${reducedTime}!`
        : `${actor.name} cannot escape in the reduced time.`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      restraintType: restraintType,
      reducedTime: reducedTime,
      source: 'Scum and Villainy',
      penalty: -10,
      message: success ? `Escapes ${restraintType} in ${reducedTime}` : 'Cannot escape in reduced time'
    };
  }

  /**
   * LOW OR HIGH GRAVITY ENVIRONMENTS (Force Unleashed Campaign Guide - Trained Only)
   * Negate attack roll and skill check penalties in low/high gravity
   * DC 20 Acrobatics check required
   */
  static async adaptGravity(actor, gravityType = 'low') {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to adapt to unusual gravity',
        trained: false,
        effect: 'Without adaptation, suffer -2 to attack rolls and skill checks'
      };
    }

    const dc = 20;
    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    const gravityLabel = gravityType.toLowerCase() === 'low' ? 'Low Gravity' : 'High Gravity';
    const standardPenalty = '-2 to attack rolls and skill checks';
    const negatedPenalty = success ? 'No penalties' : standardPenalty;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Adapt to ${gravityLabel}</strong><br>` +
              `Reference: Force Unleashed Campaign Guide - Trained Only<br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}<br>` +
              `Effect: ${negatedPenalty}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} adapted to ${gravityLabel}: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} adapts to the ${gravityLabel} environment! No penalties!`
        : `${actor.name} struggles with the unusual gravity (-2 to attacks and skills).`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      gravityType: gravityType,
      source: 'Force Unleashed Campaign Guide',
      standard: '-2 to attack rolls and skill checks',
      modifier: success ? 0 : -2,
      message: success
        ? `Adapts to ${gravityLabel} - no penalties`
        : `Suffers -2 penalty in ${gravityLabel}`
    };
  }

  /**
   * NIMBLE CHARGE (Scum and Villainy - Trained Only)
   * Charge through Low Objects and Difficult Terrain
   * DC 25 Acrobatics check required
   * Can be combined with Cross Difficult Terrain (DC becomes 35)
   * If check fails, cannot attack at end of movement
   */
  static async nimbleCharge(actor, chargePath = 'obstacles', combineWithTerrain = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to use Nimble Charge',
        trained: false
      };
    }

    let dc = 25;

    // If combining with Cross Difficult Terrain, DC increases to 35
    if (combineWithTerrain) {
      dc = 35;
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = checkResult >= dc;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Nimble Charge</strong> - Charge Through Obstacles<br>` +
              `Reference: Scum and Villainy - Trained Only<br>` +
              `Charge Path: ${chargePath}${combineWithTerrain ? ' + Difficult Terrain' : ''}<br>` +
              `DC: ${dc}<br>` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted Nimble Charge: ` +
      `${checkResult} vs DC ${dc} = ${success ? 'Success' : 'Failure'}`
    );

    ui.notifications.info(
      success
        ? `${actor.name} charges through obstacles and completes the attack!`
        : `${actor.name} fails to navigate the obstacles! Cannot attack at end of movement!`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      chargePath: chargePath,
      combineWithTerrain: combineWithTerrain,
      source: 'Scum and Villainy',
      action: 'Charge',
      canAttack: success,
      penalty: success ? 'None' : 'Cannot attack at end of charge',
      message: success
        ? `Charges through ${chargePath}${combineWithTerrain ? ' and difficult terrain' : ''} successfully`
        : `Cannot navigate obstacles - charge attack negated`
    };
  }

  /**
   * ZERO-GRAVITY ENVIRONMENTS (Force Unleashed Campaign Guide - Trained Only)
   * Help maneuver in zero-gravity environments
   * When crossing spaces or traversing congested areas: Acrobatics check (no penalty) to arrive on target
   * As Swift Action: DC 20 Acrobatics check to reduce attack roll and skill check penalty to -2 (instead of -5)
   */
  static async zeroGravityManeuver(actor, action = 'navigate', isSwiftAction = false) {
    if (!actor) {
      return { success: false, message: 'Invalid actor' };
    }

    const acrobaticsBonus = actor.system.skills?.acrobatics?.total || 0;
    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (!isTrained) {
      return {
        success: false,
        message: 'Must be Trained in Acrobatics to maneuver in zero-gravity',
        trained: false,
        effect: 'Suffer -5 to attack rolls and skill checks in zero-gravity without training'
      };
    }

    let dc = 0;
    let actionType = '';

    if (action.toLowerCase() === 'navigate') {
      // No penalty check - just roll to arrive on target
      dc = 0;
      actionType = 'Navigate Zero-Gravity (No DC)';
    } else if (isSwiftAction) {
      // Swift Action: DC 20 to reduce penalties to -2
      dc = 20;
      actionType = 'Reduce Penalty as Swift Action (DC 20)';
    }

    const roll = await new Roll('1d20').evaluate({ async: true });
    const checkResult = roll.total + acrobaticsBonus;
    const success = dc === 0 ? true : checkResult >= dc; // Navigation auto-succeeds

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `<strong>Zero-Gravity Maneuver</strong><br>` +
              `Reference: Force Unleashed Campaign Guide - Trained Only<br>` +
              `Action: ${actionType}<br>` +
              `${dc > 0 ? `DC: ${dc}<br>` : ''}` +
              `Acrobatics Check: ${checkResult}${success ? ' ✓' : ' ✗'}`
    });

    SWSELogger.log(
      `AcrobaticsUses | ${actor.name} attempted zero-gravity maneuver: ` +
      `${checkResult}${dc > 0 ? ` vs DC ${dc}` : ''} = ${success ? 'Success' : 'Failure'}`
    );

    let penalty = -5; // Default zero-gravity penalty
    if (success && isSwiftAction) {
      penalty = -2;
    } else if (success && action.toLowerCase() === 'navigate') {
      penalty = 0; // No penalty for navigation
    }

    ui.notifications.info(
      success
        ? `${actor.name} successfully maneuvers in zero-gravity! Penalty: ${penalty === 0 ? 'None' : penalty}`
        : `${actor.name} struggles with zero-gravity movement. Penalty: -5`
    );

    return {
      success: success,
      checkResult: checkResult,
      dc: dc,
      trained: true,
      action: action,
      isSwiftAction: isSwiftAction,
      source: 'Force Unleashed Campaign Guide',
      defaultPenalty: -5,
      modifier: penalty,
      message: success
        ? `Successfully maneuvers - ${penalty === 0 ? 'no penalty' : `penalty reduced to ${penalty}`}`
        : `Struggles with zero-gravity - suffers -5 penalty`
    };
  }

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  /**
   * Validate that actor is trained in Acrobatics if required
   */
  static validateTrained(actor, requireTrained = true) {
    if (!actor) {
      return { valid: false, message: 'Invalid actor' };
    }

    const isTrained = actor.system.skills?.acrobatics?.trained || false;

    if (requireTrained && !isTrained) {
      return {
        valid: false,
        message: 'Must be Trained in Acrobatics to use this skill'
      };
    }

    return { valid: true };
  }

  /**
   * Get Acrobatics bonus for actor
   */
  static getAcrobaticsBonus(actor) {
    if (!actor) return 0;
    return actor.system.skills?.acrobatics?.total || 0;
  }

  /**
   * Check if actor is trained in Acrobatics
   */
  static isTrained(actor) {
    if (!actor) return false;
    return actor.system.skills?.acrobatics?.trained || false;
  }

  /**
   * Get armor penalty (if applicable)
   */
  static getArmorPenalty(actor) {
    if (!actor) return 0;
    return actor.system.skills?.acrobatics?.armor || 0;
  }
}

export default AcrobaticsUses;
