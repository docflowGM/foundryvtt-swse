/**
 * SWSE Combat Actions Mapper (Modernized for Foundry v13+)
 *
 * Loads combat actions, extra skill uses, ship combat actions,
 * and talent enhancements from compendiums rather than static JSON.
 *
 * Supports:
 *  - Dynamic pack loading (P1 architecture)
 *  - Actor-aware enhancements
 *  - Unified data normalization
 *  - Middleware extension hooks
 */

import { SWSELogger } from "../../utils/logger.js";
import TalentActionLinker from "../../engine/talent-action-linker.js";

export class CombatActionsMapper {

  static _initialized = false;

  static _combatActions = [];
  static _extraSkillUses = [];
  static _shipCombatActions = [];
  static _talentEnhancements = {};

  static getSelectedActor() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }

  /**
   * Load and cache compendium data
   */
  static async init() {
    if (this._initialized) return;

    try {
      this._combatActions =
        await this._loadCompendiumItems("foundryvtt-swse.combat-actions");

      this._extraSkillUses =
        await this._loadCompendiumItems("foundryvtt-swse.extra-skill-uses");

      this._shipCombatActions =
        await this._loadCompendiumItems("foundryvtt-swse.ship-combat-actions");

      const enhancementsArray =
        await this._loadCompendiumItems("foundryvtt-swse.talent-enhancements");

      this._talentEnhancements = this._indexEnhancements(enhancementsArray);

      this._initialized = true;
      SWSELogger.log("SWSE | CombatActionsMapper initialized (compendium-based)");

    } catch (err) {
      SWSELogger.error("SWSE | Failed to load combat action packs:", err);
      this._combatActions = [];
      this._extraSkillUses = [];
      this._shipCombatActions = [];
      this._talentEnhancements = {};
    }
  }

  /**
   * Load all documents from a compendium pack
   */
  static async _loadCompendiumItems(packId) {
    const pack = game.packs.get(packId);
    if (!pack) {
      SWSELogger.warn(`SWSE | Missing compendium: ${packId}`);
      return [];
    }

    const docs = await pack.getDocuments();
    return docs.map(d => d.toObject());
  }

  /**
   * Transform talent enhancement items into a keyed map
   */
  static _indexEnhancements(items) {
    const result = {};
    for (const item of items) {
      const key = item.system?.actionKey;
      if (!key) continue;

      if (!result[key]) result[key] = [];
      result[key].push({
        name: item.name,
        requiredTalent: item.system?.requiredTalent,
        effect: item.system?.effect,
      });
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Lookup by Skill
  // ---------------------------------------------------------------------------

  static getActionsForSkill(skillKey) {
    if (!this._initialized) return this._notReady();

    const displayName = this._getSkillDisplayName(skillKey).toLowerCase();

    const combatActions = this._combatActions
      .filter(a => this._matchesSkill(a.system?.relatedSkills, skillKey, displayName))
      .map(a => this._normalizeAction(a));

    const extraUses = this._extraSkillUses
      .filter(u => this._matchesSkill([u.system?.skill], skillKey, displayName))
      .map(u => this._normalizeExtraUse(u));

    return {
      combatActions,
      extraUses,
      hasActions: combatActions.length > 0 || extraUses.length > 0
    };
  }

  /**
   * Get all combat actions and extra uses organized by skill
   * @returns {Object} Map of skill keys to their actions { [skillKey]: { combatActions, extraUses } }
   */
  static getAllActionsBySkill() {
    if (!this._initialized) {
      SWSELogger.warn("CombatActionsMapper used before initialization completed.");
      return {};
    }

    const allSkills = [
      'acrobatics', 'climb', 'deception', 'endurance', 'gatherInformation',
      'initiative', 'jump', 'knowledge', 'mechanics', 'perception',
      'persuasion', 'pilot', 'ride', 'stealth', 'survival', 'swim',
      'treatInjury', 'useComputer', 'useTheForce'
    ];

    const result = {};
    for (const skillKey of allSkills) {
      const actions = this.getActionsForSkill(skillKey);
      if (actions.hasActions) {
        result[skillKey] = actions;
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Lookup by Ship Crew Position
  // ---------------------------------------------------------------------------

  static getActionsForCrewPosition(position) {
    if (!this._initialized) return [];

    const pos = position.toLowerCase();

    return this._shipCombatActions
      .filter(a => {
        const role = a.system?.crewPosition?.toLowerCase() ?? "";
        return role === pos || role === "any";
      })
      .map(a => this._normalizeShipAction(a));
  }

  // ---------------------------------------------------------------------------
  // Talent Enhancements
  // ---------------------------------------------------------------------------

  static getEnhancementsForAction(actionKey, actor) {
    if (!this._initialized) return [];

    const enhancements = this._talentEnhancements[actionKey] ?? [];
    if (!enhancements.length) return [];

    const actorTalents = new Set(
      actor.items.filter(i => i.type === "talent").map(i => i.name)
    );

    return enhancements.filter(e => actorTalents.has(e.requiredTalent));
  }

  static applyEnhancements(actions, actor) {
    return actions.map(action => {
      const enh = this.getEnhancementsForAction(action.key, actor);
      return {
        ...action,
        enhancements: enh,
        hasEnhancements: enh.length > 0
      };
    });
  }

  /**
   * Add enhancements to actions from both compendium sources and TalentActionLinker
   * This is the primary method called by the character sheet
   * @param {Array} actions - Array of action objects
   * @param {Actor} actor - Character actor
   * @returns {Array} Actions with enhancement information
   */
  static addEnhancementsToActions(actions, actor) {
    return actions.map(action => {
      const enh = this.getEnhancementsForAction(action.key, actor);

      // If no compendium enhancements found, try TalentActionLinker for generic talent bonuses
      let talentBonus = null;
      if (!enh.length && TalentActionLinker.MAPPING) {
        // Map action key to TalentActionLinker action ID
        // This provides a fallback for talents not in the compendium enhancements
        const linkedTalents = TalentActionLinker.getTalentsForAction(actor, action.key);
        if (linkedTalents.length > 0) {
          const bonusInfo = TalentActionLinker.calculateBonusForAction(actor, action.key);
          talentBonus = {
            type: 'talent-bonus',
            talents: linkedTalents,
            value: bonusInfo.value,
            description: bonusInfo.description
          };
        }
      }

      return {
        ...action,
        enhancements: enh,
        hasEnhancements: enh.length > 0,
        talentBonus: talentBonus,
        hasTalentBonus: !!talentBonus
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Normalization Helpers
  // ---------------------------------------------------------------------------

  static _normalizeAction(item) {
    return {
      key: item.system?.key ?? item._id,
      name: item.name,
      actionType: item.system?.actionType,
      cost: item.system?.cost,
      notes: item.system?.notes,
      relatedSkills: item.system?.relatedSkills ?? [],
      dc: item.system?.dc,
      outcome: item.system?.outcome,
      when: item.system?.when
    };
  }

  static _normalizeExtraUse(item) {
    return {
      key: item.system?.key ?? item._id,
      name: item.name,
      dc: item.system?.dc,
      time: item.system?.time,
      effect: item.system?.effect
    };
  }

  static _normalizeShipAction(item) {
    return {
      key: item.system?.key ?? item._id,
      name: item.name,
      actionType: item.system?.actionType,
      cost: item.system?.cost,
      crewPosition: item.system?.crewPosition,
      notes: item.system?.notes,
      relatedSkills: item.system?.relatedSkills ?? []
    };
  }

  // ---------------------------------------------------------------------------
  // Skill Matching
  // ---------------------------------------------------------------------------

  static _matchesSkill(relatedSkills, skillKey, displayNameLower) {
    if (!relatedSkills) return false;

    return relatedSkills.some(skill => {
      const name = skill?.toLowerCase() ?? "";
      return name.includes(displayNameLower) || name.includes(skillKey.toLowerCase());
    });
  }

  static _getSkillDisplayName(skillKey) {
    const map = {
      acrobatics: "Acrobatics",
      climb: "Climb",
      deception: "Deception",
      endurance: "Endurance",
      gatherInformation: "Gather Information",
      initiative: "Initiative",
      jump: "Jump",
      knowledge: "Knowledge",
      mechanics: "Mechanics",
      perception: "Perception",
      persuasion: "Persuasion",
      pilot: "Pilot",
      ride: "Ride",
      stealth: "Stealth",
      survival: "Survival",
      swim: "Swim",
      treatInjury: "Treat Injury",
      useComputer: "Use Computer",
      useTheForce: "Use the Force"
    };
    return map[skillKey] ?? skillKey;
  }

  // ---------------------------------------------------------------------------
  // Default "not yet ready" response
  // ---------------------------------------------------------------------------

  static _notReady() {
    SWSELogger.warn("CombatActionsMapper used before initialization completed.");
    return { combatActions: [], extraUses: [], hasActions: false };
  }
}

// Expose globally
window.CombatActionsMapper = CombatActionsMapper;

// Initialize on system ready
Hooks.once("ready", () => CombatActionsMapper.init());
