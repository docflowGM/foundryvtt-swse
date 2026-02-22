/**
 * Dark Side Talent Mechanics
 * Implements complex game mechanics for Dark Side talents:
 * - Swift Power: Use Force Powers as Swift Action
 * - Dark Side Savant: Return [Dark Side] power to suite
 * - Wrath of the Dark Side: Half damage repeat on Natural 20
 */

import { SWSELogger } from '../utils/logger.js';
import { ActorEngine } from '../actors/engine/actor-engine.js';
import { TalentEffectEngine } from './talent-effect-engine.js';
import { createChatMessage } from '../core/document-api-v13.js';

export class DarkSideTalentMechanics {

  /**
   * Check if actor has Swift Power talent
   */
  static hasSwiftPower(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Swift Power'
    );
  }

  /**
   * Check if actor has Dark Side Savant talent
   */
  static hasDarkSideSavant(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Dark Side Savant'
    );
  }

  /**
   * Check if actor has Wrath of the Dark Side talent
   */
  static hasWrathOfDarkSide(actor) {
    return actor?.items?.some(item =>
      item.type === 'talent' && item.name === 'Wrath of the Dark Side'
    );
  }

  /**
   * SWIFT POWER - Allow using Force Power as Swift Action
   * Once per day, use a Force Power that normally takes Standard or Move action as Swift Action
   */
  static async triggerSwiftPower(actor, forcePower) {
    if (!this.hasSwiftPower(actor)) {
      return false;
    }

    // PHASE 1: BUILD EFFECT PLAN (Pure Computation)
    const plan = await TalentEffectEngine.buildSwiftPowerPlan({
      sourceActor: actor,
      forcePower
    });

    if (!plan.success) {
      ui.notifications.warn(plan.reason);
      return false;
    }

    // PHASE 2: APPLY MUTATIONS THROUGH ACTORENGINE
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.warn(`Swift Power failed: ${result.reason}`);
      return false;
    }

    // PHASE 3: SIDE-EFFECTS (Log + Notification)
    SWSELogger.log(`SWSE Talents | ${actor.name} used Swift Power on ${forcePower.name}`);
    ui.notifications.info(`${forcePower.name} is being used as a Swift Action!`);

    return true;
  }

  /**
   * DARK SIDE SAVANT - Return one Dark Side Force Power to suite without spending FP
   * Once per encounter as a Swift Action
   */
  static async triggerDarkSideSavant(actor) {
    if (!this.hasDarkSideSavant(actor)) {
      return { success: false, message: 'Actor does not have Dark Side Savant talent' };
    }

    // Check encounter status
    const combatEncounterActive = game.combats?.active;
    if (!combatEncounterActive) {
      return {
        success: false,
        message: 'Dark Side Savant can only be used during an encounter (combat active)'
      };
    }

    // Check if already used this encounter
    const combatId = combatEncounterActive.id;
    const savantUsageFlag = `darkSideSavant_${combatId}`;
    const alreadyUsed = actor.getFlag('foundryvtt-swse', savantUsageFlag);

    if (alreadyUsed) {
      return {
        success: false,
        message: 'Dark Side Savant has already been used this encounter. It resets at the start of the next encounter.'
      };
    }

    // Get all Dark Side Force Powers that are spent
    const darkSidePowers = actor.items.filter(item =>
      item.type === 'forcepower' &&
      item.system?.spent === true &&
      (item.system?.discipline === 'dark-side' || item.name.toLowerCase().includes('dark'))
    );

    if (darkSidePowers.length === 0) {
      return {
        success: false,
        message: 'No spent Dark Side Force Powers available to return'
      };
    }

    // If multiple powers, show selection dialog
    if (darkSidePowers.length > 1) {
      return {
        success: true,
        requiresSelection: true,
        powers: darkSidePowers,
        combatId: combatId,
        savantUsageFlag: savantUsageFlag
      };
    }

    // Single power - use the plan-based approach
    const power = darkSidePowers[0];

    // PHASE 1: BUILD EFFECT PLAN (Pure Computation)
    const plan = await TalentEffectEngine.buildDarkSideSavantPlan({
      sourceActor: actor,
      power: power,
      combatId: combatId,
      savantUsageFlag: savantUsageFlag
    });

    if (!plan.success) {
      ui.notifications.warn(plan.reason);
      return { success: false, message: plan.reason };
    }

    // PHASE 2: APPLY MUTATIONS THROUGH ACTORENGINE
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.warn(`Dark Side Savant failed: ${result.reason}`);
      return { success: false, message: `Dark Side Savant failed: ${result.reason}` };
    }

    // PHASE 3: SIDE-EFFECTS (Log + Notification)
    SWSELogger.log(`SWSE Talents | ${actor.name} used Dark Side Savant to return ${power.name}`);
    ui.notifications.info(`${power.name} has been returned to your Force Power Suite without spending a Force Point!`);

    return { success: true, power: power.name };
  }

  /**
   * Complete Dark Side Savant selection after user chooses a power
   */
  static async completeDarkSideSavantSelection(actor, powerIdToReturn, combatId, savantUsageFlag) {
    const power = actor.items.get(powerIdToReturn);
    if (!power) {
      ui.notifications.error('Power not found');
      return false;
    }

    // PHASE 1: BUILD EFFECT PLAN (Pure Computation)
    const plan = await TalentEffectEngine.buildDarkSideSavantPlan({
      sourceActor: actor,
      power: power,
      combatId: combatId,
      savantUsageFlag: savantUsageFlag
    });

    if (!plan.success) {
      ui.notifications.error(plan.reason);
      return false;
    }

    // PHASE 2: APPLY MUTATIONS THROUGH ACTORENGINE
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.error(`Dark Side Savant failed: ${result.reason}`);
      return false;
    }

    // PHASE 3: SIDE-EFFECTS (Log + Notification)
    SWSELogger.log(`SWSE Talents | ${actor.name} used Dark Side Savant to return ${power.name}`);
    ui.notifications.info(`${power.name} has been returned to your Force Power Suite!`);

    return true;
  }

  /**
   * WRATH OF THE DARK SIDE - On Natural 20 with damage Force Power
   * Don't regain powers, instead target takes half damage again at start of next turn
   * Only applies to: Corruption, Force Blast, Force Grip, Force Lightning, Force Slam,
   * Force Thrust (with FP), Repulse (with FP)
   */
  static WRATH_APPLICABLE_POWERS = [
    'Corruption',
    'Force Blast',
    'Force Grip',
    'Force Lightning',
    'Force Slam',
    'Force Thrust',
    'Repulse'
  ];

  static canUseWrath(forcePowerName) {
    return this.WRATH_APPLICABLE_POWERS.includes(forcePowerName);
  }

  static async triggerWrathOfDarkSide(actor, roll, forcePower, targetToken, damageDealt) {
    if (!this.hasWrathOfDarkSide(actor)) {
      return { success: false, message: 'Actor does not have Wrath of the Dark Side' };
    }

    if (!this.canUseWrath(forcePower.name)) {
      return {
        success: false,
        message: `Wrath of the Dark Side only applies to: ${this.WRATH_APPLICABLE_POWERS.join(', ')}`
      };
    }

    // Check for Natural 20 on the roll
    if (roll.terms?.[0]?.results?.[0]?.result !== 20) {
      return {
        success: false,
        message: 'Wrath of the Dark Side only triggers on a Natural 20'
      };
    }

    const targetActor = targetToken.actor;

    // PHASE 1: BUILD EFFECT PLAN (Pure Computation)
    const plan = await TalentEffectEngine.buildWrathOfDarkSidePlan({
      sourceActor: actor,
      targetActor: targetActor,
      damageDealt: damageDealt
    });

    if (!plan.success) {
      ui.notifications.warn(plan.reason);
      return { success: false, message: plan.reason };
    }

    // PHASE 2: APPLY MUTATIONS THROUGH ACTORENGINE
    const result = await ActorEngine.applyTalentEffect(plan);
    if (!result.success) {
      ui.notifications.warn(`Wrath of the Dark Side failed: ${result.reason}`);
      return { success: false, message: `Wrath of the Dark Side failed: ${result.reason}` };
    }

    // PHASE 3: SIDE-EFFECTS (Log + Notification)
    SWSELogger.log(`SWSE Talents | ${actor.name} triggered Wrath of the Dark Side on ${targetActor.name}. Will deal ${plan.halfDamage} damage at start of next turn.`);
    ui.notifications.info(`${targetActor.name} will take ${plan.halfDamage} additional damage at the start of their next turn from Wrath of the Dark Side!`);

    return {
      success: true,
      halfDamage: plan.halfDamage,
      targetId: targetActor.id
    };
  }

  /**
   * Apply Wrath of the Dark Side damage at start of target's turn
   * Call this from the combatant turn start hook
   */
  static async applyWrathDamageAtTurnStart(token) {
    const actor = token.actor;
    const wrathFlags = actor.getFlag('foundryvtt-swse', 'wrathDamage') || [];

    if (wrathFlags.length === 0) {
      return;
    }

    // Filter to damages from this turn or earlier
    const applicableDamages = wrathFlags.filter(flag => {
      return flag.triggerRound < game.combat?.round ||
             (flag.triggerRound === game.combat?.round && game.combat?.turn > 0);
    });

    for (const dmg of applicableDamages) {
      // Apply damage
      const newHp = Math.max(0, actor.system.hp?.value - dmg.damage);
      await ActorEngine.updateActor(actor, { 'system.hp.value': newHp });

      // Create chat message
      const messageContent = `
        <div class="swse-wrath-damage">
          <h3><img src="icons/svg/skull.svg" style="width: 20px; height: 20px;"> Wrath of the Dark Side</h3>
          <p><strong>${actor.name}</strong> takes <strong>${dmg.damage}</strong> damage from ${dmg.sourceName}'s Wrath!</p>
        </div>
      `;

      await createChatMessage({
        speaker: { actor: actor },
        content: messageContent,
        flavor: 'Wrath of the Dark Side - Delayed Damage',
        flags: { swse: { wrathDamage: true } }
      });

      SWSELogger.log(`SWSE Talents | Applied ${dmg.damage} Wrath damage to ${actor.name} from ${dmg.sourceName}`);
    }

    // Remove applied damages from flag
    const remainingDamages = wrathFlags.filter(flag =>
      !(flag.triggerRound < game.combat?.round ||
        (flag.triggerRound === game.combat?.round && game.combat?.turn > 0))
    );

    if (remainingDamages.length === 0) {
      await actor.unsetFlag('foundryvtt-swse', 'wrathDamage');
    } else {
      await actor.setFlag('foundryvtt-swse', 'wrathDamage', remainingDamages);
    }
  }

  /**
   * Clear Wrath damage flags when combat ends
   */
  static async clearWrathFlagsOnCombatEnd() {
    for (const combatant of game.combat?.combatants || []) {
      const actor = combatant.actor;
      if (actor?.getFlag('foundryvtt-swse', 'wrathDamage')) {
        await actor.unsetFlag('foundryvtt-swse', 'wrathDamage');
      }
    }
  }
}

// ============================================================================
// HOOKS - Auto-trigger Dark Side Savant selection dialog
// ============================================================================

/**
 * Hook: When user initiates Dark Side Savant, show power selection dialog
 */
Hooks.on('darkSideSavantTriggered', async (actor) => {
  const result = await DarkSideTalentMechanics.triggerDarkSideSavant(actor);

  if (!result.success) {
    ui.notifications.warn(result.message);
    return;
  }

  if (result.requiresSelection && result.powers.length > 1) {
    // Show dialog to select which power to return
    const powerOptions = result.powers
      .map(p => `<option value="${p.id}">${p.name}</option>`)
      .join('');

    const dialog = new SWSEDialogV2({
      title: 'Dark Side Savant - Select Power to Return',
      content: `
        <div class="form-group">
          <label>Choose a Dark Side Force Power to return to your suite (no Force Point cost):</label>
          <select id="power-select" style="width: 100%;">
            ${powerOptions}
          </select>
        </div>
      `,
      buttons: {
        select: {
          label: 'Return to Suite',
          callback: async (html) => {
            const root = html?.[0] ?? html;
            const powerIdToReturn = root?.querySelector?.('#power-select')?.value ?? null;
            await DarkSideTalentMechanics.completeDarkSideSavantSelection(
              actor,
              powerIdToReturn,
              result.combatId,
              result.savantUsageFlag
            );
          }
        },
        cancel: {
          label: 'Cancel'
        }
      }
    });

    dialog.render(true);
  }
});

/**
 * Hook: When combatant takes their turn, apply Wrath of the Dark Side damage
 */
Hooks.on('combatTurnChange', async (combat, combatantData) => {
  const token = canvas.tokens.get(combatantData.tokenId);
  if (token) {
    await DarkSideTalentMechanics.applyWrathDamageAtTurnStart(token);
  }
});

/**
 * Hook: When combat ends, clear Wrath damage flags
 */
Hooks.on('deleteCombat', async (combat) => {
  await DarkSideTalentMechanics.clearWrathFlagsOnCombatEnd();
});

export default DarkSideTalentMechanics;
