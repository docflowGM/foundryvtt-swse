// scripts/engine/RuleElement.js
import { swseLogger } from '../utils/logger.js';
import { ActorEngine } from '../actors/engine/actor-engine.js';

/**
 * RuleElement - Data-driven rule application system
 *
 * Inspired by PF2e's rule elements, this system allows feats, talents, and
 * class features to define their effects in structured data rather than
 * hard-coded logic.
 *
 * Key Principles:
 * - Self-describing: Items carry their own effect data
 * - Generic application: Engine reads and applies uniformly
 * - Removable: Removing item automatically reverts effects
 * - Composable: Multiple rule elements can stack
 *
 * Rule Element Types:
 * - StatBonus: Add/multiply to an attribute or skill
 * - GrantAbility: Add an action or ability to the character
 * - Prerequisite: Define what's required to use this
 * - ConditionalBonus: Bonus that applies under certain conditions
 *
 * Usage:
 *   // In feat/talent data
 *   system.rules = [
 *     { type: "StatBonus", stat: "reflex", value: 2 },
 *     { type: "GrantAbility", abilityId: "deflect" }
 *   ]
 *
 *   // Application
 *   const element = RuleElement.create(ruleData);
 *   element.apply(actor);
 *   element.remove(actor);
 */

/**
 * Base RuleElement class
 */
export class RuleElement {
  constructor(data, source) {
    this.type = data.type;
    this.data = data;
    this.source = source; // The item this rule came from
    this.key = data.key || foundry.utils.randomID();
  }

  /**
   * Factory method to create the appropriate rule element type
   */
  static create(data, source) {
    const types = {
      'StatBonus': StatBonusRule,
      'GrantAbility': GrantAbilityRule,
      'Prerequisite': PrerequisiteRule,
      'ConditionalBonus': ConditionalBonusRule,
      'SkillTraining': SkillTrainingRule,
      'AttributeModifier': AttributeModifierRule
    };

    const RuleClass = types[data.type];
    if (!RuleClass) {
      swseLogger.warn(`[RULE] Unknown rule element type: ${data.type}`);
      return null;
    }

    return new RuleClass(data, source);
  }

  /**
   * Apply this rule to an actor (override in subclasses)
   */
  async apply(actor) {
    throw new Error('RuleElement.apply() must be overridden');
  }

  /**
   * Remove this rule from an actor (override in subclasses)
   */
  async remove(actor) {
    throw new Error('RuleElement.remove() must be overridden');
  }

  /**
   * Test if this rule applies in the current context
   */
  test(actor, context = {}) {
    // Base implementation always returns true
    // Subclasses can override for conditional rules
    return true;
  }

  /**
   * Resolve a value (supports formulas)
   */
  _resolveValue(value, actor) {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // Support simple formulas like "@level", "@str.mod"
      let resolved = value;

      // Replace @level
      resolved = resolved.replace(/@level/g, actor.system.level || 1);

      // Replace @ability.mod
      const abilityPattern = /@(\w+)\.mod/g;
      resolved = resolved.replace(abilityPattern, (match, ability) => {
        return actor.system.attributes?.[ability]?.mod || 0;
      });

      // Evaluate as math expression
      try {
        return new Function('return ' + resolved)();
      } catch (err) {
        swseLogger.error(`[RULE] Failed to evaluate formula: ${value}`, err);
        return 0;
      }
    }

    return 0;
  }
}

/**
 * StatBonus - Add a bonus to a stat
 *
 * Data:
 *   { type: "StatBonus", stat: "reflex", value: 2, bonusType: "dodge" }
 */
export class StatBonusRule extends RuleElement {
  async apply(actor) {
    const stat = this.data.stat;
    const value = this._resolveValue(this.data.value, actor);
    const bonusType = this.data.bonusType || 'untyped';

    swseLogger.log(`[RULE] Applying StatBonus: ${stat} +${value} (${bonusType})`);

    // Get or create bonuses array
    const bonuses = actor.system.bonuses || {};
    bonuses[stat] = bonuses[stat] || [];

    // Add this bonus
    bonuses[stat].push({
      key: this.key,
      source: this.source?.name || 'Unknown',
      type: bonusType,
      value
    });

    await ActorEngine.updateActor(actor, { 'system.bonuses': bonuses });
  }

  async remove(actor) {
    const stat = this.data.stat;
    const bonuses = actor.system.bonuses || {};

    if (!bonuses[stat]) {return;}

    // Remove bonus with this key
    bonuses[stat] = bonuses[stat].filter(b => b.key !== this.key);

    await ActorEngine.updateActor(actor, { 'system.bonuses': bonuses });
  }
}

/**
 * GrantAbility - Grant an action or ability
 *
 * Data:
 *   { type: "GrantAbility", abilityId: "deflect", actionType: "reaction" }
 */
export class GrantAbilityRule extends RuleElement {
  async apply(actor) {
    const abilityId = this.data.abilityId;
    const actionType = this.data.actionType || 'action';

    swseLogger.log(`[RULE] Granting ability: ${abilityId}`);

    // Get or create abilities array
    const abilities = actor.system.abilities || [];

    // Check if already granted
    if (abilities.some(a => a.id === abilityId)) {
      swseLogger.log(`[RULE] Ability ${abilityId} already granted`);
      return;
    }

    // Add ability
    abilities.push({
      id: abilityId,
      source: this.source?.name || 'Unknown',
      type: actionType,
      key: this.key
    });

    await ActorEngine.updateActor(actor, { 'system.abilities': abilities });
  }

  async remove(actor) {
    const abilities = actor.system.abilities || [];

    // Remove ability with this key
    const filtered = abilities.filter(a => a.key !== this.key);

    await ActorEngine.updateActor(actor, { 'system.abilities': filtered });
  }
}

/**
 * PrerequisiteRule - Define prerequisites
 *
 * Data:
 *   { type: "Prerequisite", prerequisites: { bab: 5, feats: ["Force Sensitive"] } }
 */
export class PrerequisiteRule extends RuleElement {
  async apply(actor) {
    // Prerequisites don't apply effects, they just validate
    // This is a passive rule element
  }

  async remove(actor) {
    // Nothing to remove
  }

  test(actor, context = {}) {
    const prereqs = this.data.prerequisites || {};

    // Test BAB
    if (prereqs.bab !== undefined) {
      const currentBAB = actor.system.derived?.bab || 0;
      if (currentBAB < prereqs.bab) {
        return false;
      }
    }

    // Test level
    if (prereqs.level !== undefined) {
      const currentLevel = actor.system.level || 0;
      if (currentLevel < prereqs.level) {
        return false;
      }
    }

    // Test feats
    if (prereqs.feats && Array.isArray(prereqs.feats)) {
      const actorFeats = actor.items.filter(i => i.type === 'feat').map(i => i.name);
      for (const requiredFeat of prereqs.feats) {
        if (!actorFeats.includes(requiredFeat)) {
          return false;
        }
      }
    }

    // Test skills
    if (prereqs.skills && Array.isArray(prereqs.skills)) {
      const trainedSkills = actor.system.progression?.trainedSkills || [];
      for (const requiredSkill of prereqs.skills) {
        if (!trainedSkills.includes(requiredSkill)) {
          return false;
        }
      }
    }

    return true;
  }
}

/**
 * ConditionalBonusRule - Bonus that applies under certain conditions
 *
 * Data:
 *   { type: "ConditionalBonus", stat: "attack", value: 2, condition: "vs droids" }
 */
export class ConditionalBonusRule extends RuleElement {
  async apply(actor) {
    const stat = this.data.stat;
    const value = this._resolveValue(this.data.value, actor);
    const condition = this.data.condition || '';

    swseLogger.log(`[RULE] Applying ConditionalBonus: ${stat} +${value} (${condition})`);

    // Get or create conditional bonuses
    const conditionalBonuses = actor.system.conditionalBonuses || [];

    conditionalBonuses.push({
      key: this.key,
      source: this.source?.name || 'Unknown',
      stat,
      value,
      condition
    });

    await ActorEngine.updateActor(actor, { 'system.conditionalBonuses': conditionalBonuses });
  }

  async remove(actor) {
    const conditionalBonuses = actor.system.conditionalBonuses || [];

    const filtered = conditionalBonuses.filter(b => b.key !== this.key);

    await ActorEngine.updateActor(actor, { 'system.conditionalBonuses': filtered });
  }
}

/**
 * SkillTrainingRule - Grant skill training
 *
 * Data:
 *   { type: "SkillTraining", skill: "stealth", bonus: 5 }
 */
export class SkillTrainingRule extends RuleElement {
  async apply(actor) {
    const skill = this.data.skill;
    const bonus = this.data.bonus || 5; // Default SWSE trained bonus

    swseLogger.log(`[RULE] Granting skill training: ${skill} +${bonus}`);

    // Get or create trained skills
    const trainedSkills = actor.system.progression?.trainedSkills || [];

    if (!trainedSkills.includes(skill)) {
      trainedSkills.push(skill);

      await ActorEngine.updateActor(actor, {
        'system.progression.trainedSkills': trainedSkills
      });
    }
  }

  async remove(actor) {
    const skill = this.data.skill;
    const trainedSkills = actor.system.progression?.trainedSkills || [];

    const filtered = trainedSkills.filter(s => s !== skill);

    await ActorEngine.updateActor(actor, {
      'system.progression.trainedSkills': filtered
    });
  }
}

/**
 * AttributeModifierRule - Modify base attributes
 *
 * Data:
 *   { type: "AttributeModifier", attribute: "str", value: 2, source: "species" }
 */
export class AttributeModifierRule extends RuleElement {
  async apply(actor) {
    const attribute = this.data.attribute;
    const value = this._resolveValue(this.data.value, actor);
    const source = this.data.source || 'misc';

    swseLogger.log(`[RULE] Applying AttributeModifier: ${attribute} +${value} (${source})`);

    // Determine which field to update based on source
    const field = source === 'species' ? 'racial' : 'misc';

    const currentValue = actor.system.attributes?.[attribute]?.[field] || 0;
    const newValue = currentValue + value;

    await ActorEngine.updateActor(actor, {
      [`system.attributes.${attribute}.${field}`]: newValue
    });
  }

  async remove(actor) {
    const attribute = this.data.attribute;
    const value = this._resolveValue(this.data.value, actor);
    const source = this.data.source || 'misc';

    const field = source === 'species' ? 'racial' : 'misc';

    const currentValue = actor.system.attributes?.[attribute]?.[field] || 0;
    const newValue = currentValue - value;

    await ActorEngine.updateActor(actor, {
      [`system.attributes.${attribute}.${field}`]: newValue
    });
  }
}

/**
 * RuleEngine - Manages rule elements for an actor
 */
export class RuleEngine {
  constructor(actor) {
    this.actor = actor;
  }

  /**
   * Apply all rule elements from actor's items
   */
  async applyAllRules() {
    swseLogger.log(`[RULE-ENGINE] Applying all rules for ${this.actor.name}`);

    const items = this.actor.items.filter(i => i.system.rules && Array.isArray(i.system.rules));

    for (const item of items) {
      for (const ruleData of item.system.rules) {
        const rule = RuleElement.create(ruleData, item);
        if (rule && rule.test(this.actor)) {
          await rule.apply(this.actor);
        }
      }
    }

    swseLogger.log(`[RULE-ENGINE] All rules applied`);
  }

  /**
   * Remove all rule elements from an item
   */
  async removeItemRules(item) {
    swseLogger.log(`[RULE-ENGINE] Removing rules from ${item.name}`);

    if (!item.system.rules || !Array.isArray(item.system.rules)) {
      return;
    }

    for (const ruleData of item.system.rules) {
      const rule = RuleElement.create(ruleData, item);
      if (rule) {
        await rule.remove(this.actor);
      }
    }

    swseLogger.log(`[RULE-ENGINE] Rules removed`);
  }

  /**
   * Recalculate all rules (remove all, then reapply)
   */
  async recalculateRules() {
    swseLogger.log(`[RULE-ENGINE] Recalculating all rules for ${this.actor.name}`);

    // Clear all bonuses
    await ActorEngine.updateActor(this.actor, {
      'system.bonuses': {},
      'system.conditionalBonuses': [],
      'system.abilities': []
    });

    // Reapply all rules
    await this.applyAllRules();

    swseLogger.log(`[RULE-ENGINE] Rules recalculated`);
  }
}

export default RuleElement;
