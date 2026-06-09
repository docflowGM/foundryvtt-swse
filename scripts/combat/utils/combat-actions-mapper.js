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

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import TalentActionLinker from "/systems/foundryvtt-swse/scripts/engine/talent/talent-action-linker.js";

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
   * Load and cache compendium data with JSON fallback
   */
  static async init() {
    if (this._initialized) {return;}

    try {
      // Load combat actions - try compendium first, fall back to JSON
      this._combatActions =
        await this._loadCompendiumItems('foundryvtt-swse.combat-actions');
      if (!this._combatActions.length) {
        this._combatActions = await this._loadJsonFallback('data/combat-actions.json', 'combatAction');
        SWSELogger.log('SWSE | Loaded combat actions from JSON fallback');
      }

      // Load extra skill uses - use correct pack ID (extraskilluses not extra-skill-uses)
      this._extraSkillUses =
        await this._loadCompendiumItems('foundryvtt-swse.extraskilluses');
      if (!this._extraSkillUses.length) {
        this._extraSkillUses = await this._loadJsonFallback('data/extraskilluses.json', 'extraskilluse');
        SWSELogger.log('SWSE | Loaded extra skill uses from JSON fallback');
      }

      this._shipCombatActions =
        await this._loadCompendiumItems('foundryvtt-swse.ship-combat-actions');

      const enhancementsArray =
        await this._loadCompendiumItems('foundryvtt-swse.talent-enhancements');

      this._talentEnhancements = this._indexEnhancements(enhancementsArray);

      this._initialized = true;
      SWSELogger.log(`SWSE | CombatActionsMapper initialized: ${this._combatActions.length} combat actions, ${this._extraSkillUses.length} extra uses`);

    } catch (err) {
      SWSELogger.error('SWSE | Failed to load combat action packs:', err);
      this._combatActions = [];
      this._extraSkillUses = [];
      this._shipCombatActions = [];
      this._talentEnhancements = {};
    }
  }

  /**
   * Load data from JSON file as fallback when compendium is empty
   */
  static async _loadJsonFallback(path, type) {
    try {
      const response = await fetch(`systems/foundryvtt-swse/${path}`);
      if (!response.ok) {
        SWSELogger.debug?.(`SWSE | Failed to load JSON fallback from ${path}`);
        return [];
      }
      const data = await response.json();
      // Normalize JSON data to match compendium structure
      return data.map((item, idx) => ({
        _id: `json-${type}-${idx}`,
        name: item.name || item.application,
        type: type,
        system: {
          ...item,
          application: item.application || item.name,
          dc: item.DC || item.dc,
          time: item.time,
          effect: item.effect,
          actionType: item.action?.type,
          cost: item.action?.cost,
          notes: item.notes,
          relatedSkills: item.relatedSkills?.map(s => s.skill || s) || []
        }
      }));
    } catch (err) {
      SWSELogger.error(`SWSE | Error loading JSON fallback from ${path}:`, err);
      return [];
    }
  }

  /**
   * Load all documents from a compendium pack
   */
  static async _loadCompendiumItems(packId) {
    const pack = game.packs.get(packId);
    if (!pack) {
      SWSELogger.debug?.(`SWSE | Missing compendium: ${packId}; using fallback if available`);
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
      if (!key) {continue;}

      if (!result[key]) {result[key] = [];}
      result[key].push({
        name: item.name,
        requiredTalent: item.system?.requiredTalent,
        effect: item.system?.effect
      });
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Lookup by Skill
  // ---------------------------------------------------------------------------

  static getActionsForSkill(skillKey) {
    if (!this._initialized) {return this._notReady();}

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
      SWSELogger.warn('CombatActionsMapper used before initialization completed.');
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

  /**
   * Get all combat actions as a flat array (normalized)
   * Used for looking up actions by name
   * @returns {Array} Array of normalized combat action objects
   */
  static getAllCombatActions() {
    if (!this._initialized) {
      SWSELogger.warn('CombatActionsMapper used before initialization completed.');
      return [];
    }
    return this._combatActions.map(a => this._normalizeAction(a));
  }

  // ---------------------------------------------------------------------------
  // Lookup by Ship Crew Position
  // ---------------------------------------------------------------------------

  static getActionsForCrewPosition(position) {
    if (!this._initialized) {return [];}

    const pos = position.toLowerCase();

    return this._shipCombatActions
      .filter(a => {
        const role = a.system?.crewPosition?.toLowerCase() ?? '';
        return role === pos || role === 'any';
      })
      .map(a => this._normalizeShipAction(a));
  }

  /**
   * Get all ship combat actions organized by crew position
   * @returns {Object} Map of crew positions to their available actions
   */
  static getAllShipActionsByPosition() {
    if (!this._initialized) {return {};}

    const positions = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];
    const result = {};

    for (const position of positions) {
      result[position] = this.getActionsForCrewPosition(position);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Talent Enhancements
  // ---------------------------------------------------------------------------

  static getEnhancementsForAction(actionKey, actor) {
    if (!this._initialized) {return [];}

    const enhancements = this._talentEnhancements[actionKey] ?? [];
    if (!enhancements.length) {return [];}

    const actorTalents = new Set(
      actor.items.filter(i => i.type === 'talent').map(i => i.name)
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
    const system = item.system ?? {};
    return {
      key: system.key ?? item._id,
      id: system.key ?? item._id,
      name: item.name,
      actionType: system.actionType,
      type: system.actionType,
      cost: system.cost,
      actionCost: system.actionCost ?? system.cost ?? null,
      notes: system.notes,
      description: system.description ?? system.effect ?? system.notes ?? '',
      relatedSkills: system.relatedSkills ?? [],
      dc: system.dc,
      outcome: system.outcome,
      when: system.when,

      // Phase 1B: preserve workflow/routing metadata for the combat
      // orchestrator instead of flattening it away at the sheet layer.
      resolutionMode: system.resolutionMode ?? null,
      executable: system.executable ?? true,
      manualResolution: system.manualResolution ?? false,
      gmManaged: system.gmManaged ?? false,
      automationBoundary: system.automationBoundary ?? null,
      spendAction: system.spendAction ?? true,
      contextTags: system.contextTags ?? system.tags ?? [],
      requiredContext: system.requiredContext ?? [],
      resources: system.resources ?? system.resourceCosts ?? [],
      ruleData: system.ruleData ?? {},
      sourceType: system.sourceType ?? item.type ?? 'combatAction',
      sourceName: system.source ?? system.sourceName ?? 'Combat Action',
      sourceActionId: system.sourceActionId ?? system.actionId ?? '',
      sourceDocumentId: item._id ?? null,
      sourcePath: system.sourcePath ?? null,
      uiHint: system.uiHint ?? null,
      raw: system
    };
  }

  static _normalizeExtraUse(item) {
    const system = item.system ?? {};
    return {
      key: system.key ?? item._id,
      id: system.key ?? item._id,
      name: item.name,
      dc: system.dc,
      time: system.time,
      effect: system.effect,
      actionType: system.actionType ?? system.time ?? null,
      type: system.actionType ?? system.time ?? null,
      resolutionMode: system.resolutionMode ?? 'skillAction',
      executable: system.executable ?? true,
      manualResolution: system.manualResolution ?? false,
      gmManaged: system.gmManaged ?? false,
      automationBoundary: system.automationBoundary ?? 'assist',
      spendAction: system.spendAction ?? true,
      contextTags: system.contextTags ?? system.tags ?? [],
      requiredContext: system.requiredContext ?? [],
      resources: system.resources ?? system.resourceCosts ?? [],
      ruleData: system.ruleData ?? {},
      sourceType: system.sourceType ?? item.type ?? 'extraskilluse',
      sourceName: system.source ?? system.sourceName ?? 'Extra Skill Use',
      sourceDocumentId: item._id ?? null,
      raw: system
    };
  }

  static _normalizeShipAction(item) {
    const system = item.system ?? {};
    return {
      key: system.key ?? item._id,
      id: system.key ?? item._id,
      name: item.name,
      actionType: system.actionType,
      type: system.actionType,
      cost: system.cost,
      actionCost: system.actionCost ?? system.cost ?? null,
      crewPosition: system.crewPosition,
      notes: system.notes,
      description: system.description ?? system.effect ?? system.notes ?? '',
      relatedSkills: system.relatedSkills ?? [],
      resolutionMode: system.resolutionMode ?? null,
      executable: system.executable ?? true,
      manualResolution: system.manualResolution ?? false,
      gmManaged: system.gmManaged ?? false,
      automationBoundary: system.automationBoundary ?? null,
      spendAction: system.spendAction ?? true,
      contextTags: system.contextTags ?? system.tags ?? [],
      requiredContext: system.requiredContext ?? [],
      resources: system.resources ?? system.resourceCosts ?? [],
      ruleData: system.ruleData ?? {},
      sourceType: system.sourceType ?? item.type ?? 'shipCombatAction',
      sourceName: system.source ?? system.sourceName ?? 'Ship Combat Action',
      sourceDocumentId: item._id ?? null,
      raw: system
    };
  }

  // ---------------------------------------------------------------------------
  // Skill Matching
  // ---------------------------------------------------------------------------

  static _matchesSkill(relatedSkills, skillKey, displayNameLower) {
    if (!relatedSkills) {return false;}

    return relatedSkills.some(skill => {
      const name = skill?.toLowerCase() ?? '';
      return name.includes(displayNameLower) || name.includes(skillKey.toLowerCase());
    });
  }

  static _getSkillDisplayName(skillKey) {
    const map = {
      acrobatics: 'Acrobatics',
      climb: 'Climb',
      deception: 'Deception',
      endurance: 'Endurance',
      gatherInformation: 'Gather Information',
      initiative: 'Initiative',
      jump: 'Jump',
      knowledge: 'Knowledge',
      mechanics: 'Mechanics',
      perception: 'Perception',
      persuasion: 'Persuasion',
      pilot: 'Pilot',
      ride: 'Ride',
      stealth: 'Stealth',
      survival: 'Survival',
      swim: 'Swim',
      treatInjury: 'Treat Injury',
      useComputer: 'Use Computer',
      useTheForce: 'Use the Force'
    };
    return map[skillKey] ?? skillKey;
  }

  // ---------------------------------------------------------------------------
  // Default "not yet ready" response
  // ---------------------------------------------------------------------------

  static _notReady() {
    SWSELogger.warn('CombatActionsMapper used before initialization completed.');
    return { combatActions: [], extraUses: [], hasActions: false };
  }
}

// Expose globally
window.CombatActionsMapper = CombatActionsMapper;
