/**
 * scripts/sheets/v2/npc/NPCPanelContextBuilder.js
 *
 * NPC panel context builder
 * Transforms NPC actor data into normalized panel view models
 * Contains NPC-specific game logic
 */

import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";

export class NPCPanelContextBuilder {
  constructor(actor) {
    this.actor = actor;
    this.system = actor.system || {};
    this.derived = actor.system?.derived || {};
  }

  /**
   * PORTRAIT PANEL
   * Reuse character panel - identical structure
   */
  buildPortraitPanel() {
    const panel = {
      imagePath: this.actor.img || 'icons/svg/mystery-man.svg',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('portraitPanel', panel);
    return panel;
  }

  /**
   * BIOGRAPHY PANEL (NPC-Specific)
   * Shows NPC identity and role information
   */
  buildNpcBiographyPanel() {
    const panel = {
      name: this.actor.name,
      playerName: this.system?.playerName || '',
      age: this.system?.age || '',
      gender: this.system?.gender || '',
      species: this.system?.species || '',
      npcRole: this.system?.npcRole || 'NPC',
      npcLevel: this.system?.npcLevel || 1,
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('npcBiographyPanel', panel);
    return panel;
  }

  /**
   * HEALTH PANEL
   * Reuse character panel - identical structure
   */
  buildHealthPanel() {
    const currentHealth = this.derived?.health?.current ?? 0;
    const maxHealth = this.derived?.health?.max ?? 0;
    const damageConditionTrack = this.derived?.damage?.conditionStep ?? 0;

    const panel = {
      currentHealth,
      maxHealth,
      healthPercent: maxHealth > 0 ? Math.round((currentHealth / maxHealth) * 100) : 0,
      damageConditionStep: damageConditionTrack,
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('healthPanel', panel);
    return panel;
  }

  /**
   * DEFENSE PANEL
   * Reuse character panel - identical structure
   */
  buildDefensePanel() {
    const panel = {
      defense: this.derived?.defense?.base ?? 10,
      flatFooted: this.derived?.defense?.flatFooted ?? 10,
      shields: this.derived?.defense?.shields ?? [],
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('defensePanel', panel);
    return panel;
  }

  /**
   * ABILITIES PANEL
   * Shows ability scores (strength, dexterity, etc.)
   */
  buildAbilitiesPanel() {
    const panel = {
      strength: {
        name: 'Strength',
        score: this.system?.abilities?.strength?.score ?? 10,
        modifier: this.system?.abilities?.strength?.modifier ?? 0
      },
      dexterity: {
        name: 'Dexterity',
        score: this.system?.abilities?.dexterity?.score ?? 10,
        modifier: this.system?.abilities?.dexterity?.modifier ?? 0
      },
      constitution: {
        name: 'Constitution',
        score: this.system?.abilities?.constitution?.score ?? 10,
        modifier: this.system?.abilities?.constitution?.modifier ?? 0
      },
      intelligence: {
        name: 'Intelligence',
        score: this.system?.abilities?.intelligence?.score ?? 10,
        modifier: this.system?.abilities?.intelligence?.modifier ?? 0
      },
      wisdom: {
        name: 'Wisdom',
        score: this.system?.abilities?.wisdom?.score ?? 10,
        modifier: this.system?.abilities?.wisdom?.modifier ?? 0
      },
      charisma: {
        name: 'Charisma',
        score: this.system?.abilities?.charisma?.score ?? 10,
        modifier: this.system?.abilities?.charisma?.modifier ?? 0
      },
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('abilitiesPanel', panel);
    return panel;
  }

  /**
   * SKILLS PANEL
   * Shows all NPC skills with bonuses
   */
  buildSkillsPanel() {
    const skills = this.system?.skills || {};
    const entries = Object.entries(skills)
      .map(([skillName, skillData]) => ({
        name: skillName,
        bonus: skillData?.bonus ?? 0,
        ability: skillData?.ability ?? 'dexterity',
        canEdit: this.actor.isOwner
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No skills defined',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('skillsPanel', panel);
    return panel;
  }

  /**
   * INVENTORY PANEL
   * Reuse character panel - identical structure
   */
  buildInventoryPanel() {
    const items = this.actor.items.filter(item => item.type === 'item');

    const entries = items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.system?.quantity ?? 1,
      weight: item.system?.weight ?? 0,
      cost: item.system?.cost ?? 0,
      canEdit: this.actor.isOwner
    }));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      totalWeight: entries.reduce((sum, e) => sum + (e.weight * e.quantity), 0),
      emptyMessage: 'No items in inventory',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('inventoryPanel', panel);
    return panel;
  }

  /**
   * TALENT PANEL
   * Shows NPC talents (simplified from character talents)
   */
  buildTalentPanel() {
    const talentItems = this.actor.items.filter(item => item.type === 'talent');

    const entries = talentItems.map(item => ({
      id: item.id,
      name: item.name,
      source: item.system?.source || 'Unknown',
      description: item.system?.description || '',
      canEdit: this.actor.isOwner
    }));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No talents',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('talentPanel', panel);
    return panel;
  }

  /**
   * FEAT PANEL
   * Shows NPC feats
   */
  buildFeatPanel() {
    // SSOT ENFORCEMENT: Get feats from registry, preserve actor item data for UI
    const featItems = this.actor.items.filter(item => item.type === 'feat');
    const featsFromRegistry = ActorAbilityBridge.getFeats(this.actor);

    const entries = featsFromRegistry.map(registryFeat => {
      const actorItem = featItems.find(a => a.name === registryFeat.name);
      return {
        id: actorItem?.id || registryFeat.id,
        name: registryFeat.name,
        source: actorItem?.system?.source || registryFeat.system?.source || 'Unknown',
        description: actorItem?.system?.description || registryFeat.system?.description || '',
        canEdit: this.actor.isOwner
      };
    });

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No feats',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('featPanel', panel);
    return panel;
  }

  /**
   * LANGUAGES PANEL
   * Shows NPC languages
   */
  buildLanguagesPanel() {
    const languageItems = this.actor.items.filter(item => item.type === 'language');

    const entries = languageItems.map(item => ({
      id: item.id,
      name: item.name,
      canEdit: this.actor.isOwner
    }));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No languages',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('languagesPanel', panel);
    return panel;
  }

  /**
   * COMBAT NOTES PANEL
   * NPC-specific combat tactics and notes
   */
  buildNpcCombatNotesPanel() {
    const panel = {
      tactics: this.system?.tactics || '',
      strengths: this.system?.strengths || '',
      weaknesses: this.system?.weaknesses || '',
      specialAbilities: this.system?.specialAbilities || '',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('npcCombatNotesPanel', panel);
    return panel;
  }

  /**
   * COMBAT PANEL
   * Shows combat-related stats and abilities
   */
  buildCombatPanel() {
    const panel = {
      initiative: this.derived?.initiative ?? 0,
      armorClass: this.derived?.defense?.base ?? 10,
      baseAttack: this.derived?.baseAttackBonus ?? 0,
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('combatPanel', panel);
    return panel;
  }

  /**
   * VALIDATION
   * Validates panel context against contract
   * @private
   */
  _validatePanelContext(panelName, panelData) {
    // Validation logic - would be implemented with validators
    // For now, just log if in strict mode
    if (CONFIG?.SWSE?.sheets?.v2?.strictMode) {
      console.log(`[Strict Mode] Validating panel: ${panelName}`);
    }
  }
}
