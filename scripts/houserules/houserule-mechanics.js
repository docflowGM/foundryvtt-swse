import { SWSELogger } from '../utils/logger.js';
import { HouserulesData, getFeintSkill, getSkillFocusBonus, canTakeForceSensitive, getForceTrainingAttribute, hasBlockDeflectCombined, hasDefaultWeaponFinesse, getRolePriorityOrder } from './houserules-data.js';
/**
 * House Rules Mechanics
 * Applies house rule modifications to game mechanics
 */

export class HouseruleMechanics {
  
  /**
   * Initialize house rule mechanics
   */
  static initialize() {
    SWSELogger.log("SWSE | Initializing house rule mechanics");
    
    // Set up hooks for house rule mechanics
    this.setupCriticalHitVariants();
    this.setupConditionTrackLimits();
    this.setupDiagonalMovement();
    this.setupDeathSystem();
    this.setupFeintSkill();
    this.setupSpaceCombatInitiative();
    
    SWSELogger.log("SWSE | House rule mechanics initialized");
  }

  /**
   * Apply critical hit variant rules
   */
  static setupCriticalHitVariants() {
    Hooks.on('preRollDamage', (actor, item, options) => {
      if (!options.critical) return;
      
      const variant = game.settings.get('swse', 'criticalHitVariant');
      
      switch (variant) {
        case 'maxplus':
          options.criticalMode = 'maxplus';
          break;
        case 'exploding':
          options.criticalMode = 'exploding';
          break;
        case 'trackonly':
          options.criticalMode = 'trackonly';
          break;
        default:
          options.criticalMode = 'standard';
      }
    });
  }

  /**
   * Apply condition track damage cap
   */
  static setupConditionTrackLimits() {
    Hooks.on('preUpdateActor', (actor, changes, options, userId) => {
      const cap = game.settings.get('swse', 'conditionTrackCap');
      
      if (cap === 0) return; // No cap
      
      if (changes.system?.conditionTrack?.current !== undefined) {
        const current = actor.system.conditionTrack?.current || 0;
        const newValue = changes.system.conditionTrack.current;
        const delta = newValue - current;
        
        // Cap the movement
        if (delta > cap) {
          changes.system.conditionTrack.current = current + cap;
        }
      }
    });
  }

  /**
   * Apply diagonal movement rules
   */
  static setupDiagonalMovement() {
    // This would hook into token movement if needed
    const movementType = game.settings.get('swse', 'diagonalMovement');
    
    // Store for reference by movement calculations
    CONFIG.SWSE.diagonalMovement = movementType;
  }

  /**
   * Apply death system rules
   */
  static setupDeathSystem() {
    Hooks.on('preUpdateActor', (actor, changes, options, userId) => {
      if (changes.system?.hp?.value === undefined) return;
      
      const deathSystem = game.settings.get('swse', 'deathSystem');
      const newHP = changes.system.hp.value;
      
      if (newHP > 0) return; // Not at risk of death
      
      switch (deathSystem) {
        case 'standard':
          // Death at -10 HP
          if (newHP <= -10) {
            ui.notifications.error(`${actor.name} has died!`);
            changes.system.dead = true;
          }
          break;
          
        case 'negativeCon':
          // Death at negative CON score
          const conScore = actor.system.abilities.con.total;
          if (newHP <= -conScore) {
            ui.notifications.error(`${actor.name} has died!`);
            changes.system.dead = true;
          }
          break;
          
        case 'threeStrikes':
          // Death saves handled separately
          break;
      }
    });
  }

  /**
   * Calculate ability score modifiers based on method
   */
  static calculateAbilityMod(score) {
    return Math.floor((score - 10) / 2);
  }

  /**
   * Apply HP generation rules
   */
  static async generateHP(actor, classItem, level) {
    const method = game.settings.get('swse', 'hpGeneration');
    const maxLevels = game.settings.get('swse', 'maxHPLevels');
    const hitDie = classItem.system.hitDie || 6;
    const conMod = actor.system.abilities.con.mod || 0;
    
    let hp = 0;
    
    // First X levels get max HP
    if (level <= maxLevels) {
      hp = hitDie + conMod;
    } else {
      switch (method) {
        case 'maximum':
          hp = hitDie + conMod;
          break;
          
        case 'average':
          hp = Math.floor(hitDie / 2) + 1 + conMod;
          break;
          
        case 'average_minimum':
          const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d${hitDie}`).evaluate({async: true});
          const average = Math.floor(hitDie / 2) + 1;
          hp = Math.max(roll.total, average) + conMod;
          break;
          
        case 'roll':
        default:
          const rollResult = await globalThis.SWSE.RollEngine.safeRoll(`1d${hitDie}`).evaluate({async: true});
          hp = rollResult.total + conMod;
          break;
      }
    }
    
    // Minimum 1 HP per level
    return Math.max(1, hp);
  }

  /**
   * Apply weapon range multiplier
   */
  static getModifiedRange(baseRange) {
    const multiplier = game.settings.get('swse', 'weaponRangeMultiplier');
    return Math.round(baseRange * multiplier);
  }

  /**
   * Check if Second Wind improves condition track
   */
  static isSecondWindImproved() {
    return game.settings.get('swse', 'secondWindImproved');
  }

  /**
   * Get Second Wind recovery timing
   */
  static getSecondWindRecovery() {
    return game.settings.get('swse', 'secondWindRecovery');
  }

  /**
   * Apply critical hit damage based on variant
   */
  static async applyCriticalDamage(baseRoll, mode = 'standard') {
    switch (mode) {
      case 'maxplus':
        // Maximum damage + one additional roll
        const maxDamage = baseRoll.terms.map(t => {
          if (t instanceof Die) {
            return t.faces * t.number;
          }
          return t;
        }).reduce((a, b) => a + b, 0);
        
        const additionalRoll = await baseRoll.reroll();
        return maxDamage + additionalRoll.total;
        
      case 'exploding':
        // Exploding dice on critical
        const explodingFormula = baseRoll.formula.replace(/d(\d+)/g, 'd$1x');
        const explodingRoll = await globalThis.SWSE.RollEngine.safeRoll(explodingFormula).evaluate({async: true});
        return explodingRoll.total;
        
      case 'trackonly':
        // Normal damage, but guaranteed condition track movement
        return baseRoll.total;
        
      case 'standard':
      default:
        // Double damage
        return baseRoll.total * 2;
    }
  }

  /**
   * Apply feint skill rules
   */
  static setupFeintSkill() {
    Hooks.on('preRollSkill', (actor, skillName, options) => {
      if (skillName === 'feint') {
        const feintSkill = game.settings.get('swse', 'feintSkill');
        if (feintSkill === 'persuasion') {
          options.useSkill = 'persuasion';
        }
      }
    });
  }

  /**
   * Calculate Skill Focus bonus based on variant
   */
  static getSkillFocusBonus(actor, skillName) {
    const variant = game.settings.get('swse', 'skillFocusVariant');
    const level = actor.system.level || 1;
    
    switch (variant) {
      case 'scaled':
        return Math.min(5, Math.floor(level / 2));
      
      case 'delayed':
        const activationLevel = game.settings.get('swse', 'skillFocusActivationLevel');
        return level >= activationLevel ? 5 : 0;
      
      case 'normal':
      default:
        return 5;
    }
  }

  /**
   * Get Force Training attribute
   */
  static getForceTrainingAttribute() {
    return game.settings.get('swse', 'forceTrainingAttribute');
  }

  /**
   * Check if Block and Deflect are combined
   */
  static isBlockDeflectCombined() {
    return game.settings.get('swse', 'blockDeflectTalents') === 'combined';
  }

  /**
   * Check if Force Sensitive is restricted to Jedi
   */
  static isForceSensitiveRestricted() {
    return game.settings.get('swse', 'forceSensitiveJediOnly');
  }

  /**
   * Check if Weapon Finesse is default
   */
  static hasDefaultWeaponFinesse(actor) {
    return game.settings.get('swse', 'weaponFinesseDefault');
  }

  /**
   * Apply space combat initiative system
   */
  static setupSpaceCombatInitiative() {
    const system = game.settings.get('swse', 'spaceInitiativeSystem');
    
    if (system === 'shipBased') {
      Hooks.on('preCreateCombatant', (combatant, data, options, userId) => {
        // Check if this is a vehicle/ship combat
        const actor = game.actors.get(data.actorId);
        if (actor?.type === 'vehicle') {
          // Set up ship-based initiative tracking
          data.flags = data.flags || {};
          data.flags.swse = data.flags.swse || {};
          data.flags.swse.shipBasedInitiative = true;
        }
      });
      
      Hooks.on('combatTurn', (combat, updateData, options) => {
        // Handle role priority order
        const rolePriority = game.settings.get('swse', 'initiativeRolePriority');
        // Implementation would depend on how crew roles are stored
      });
    }
  }

  /**
   * Get space combat role priority
   */
  static getInitiativeRolePriority() {
    return game.settings.get('swse', 'initiativeRolePriority');
  }


  /**
   * Import houserules data
   */
  static get data() {
    return HouserulesData;
  }

  /**
   * Apply feint skill houserule
   */
  static getFeintSkill() {
    return getFeintSkill();
  }

  /**
   * Calculate Skill Focus bonus with houserule variant
   */
  static calculateSkillFocusBonus(level) {
    return getSkillFocusBonus(level);
  }

  /**
   * Check if actor can take Force Sensitive feat
   */
  static canTakeForceSensitive(actor) {
    return canTakeForceSensitive(actor);
  }

  /**
   * Get the Force Training attribute
   */
  static getForceAttribute() {
    return getForceTrainingAttribute();
  }

  /**
   * Check if Block and Deflect are combined
   */
  static areBlockDeflectCombined() {
    return hasBlockDeflectCombined();
  }

  /**
   * Check if character has Weapon Finesse by default
   */
  static hasWeaponFinesseByDefault() {
    return hasDefaultWeaponFinesse();
  }

  /**
   * Get space combat initiative role order
   */
  static getSpaceCombatRoleOrder() {
    return getRolePriorityOrder();
  }

}
