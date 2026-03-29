/**
 * scripts/sheets/v2/droid/DroidPanelContextBuilder.js
 *
 * Droid panel context builder
 * Transforms droid actor data into normalized panel view models
 * Contains droid-specific game logic (protocols, customizations, modification points)
 */

export class DroidPanelContextBuilder {
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
   * DROID SUMMARY PANEL (DROID-SPECIFIC)
   * Shows droid type, restriction level, modification points
   */
  buildDroidSummaryPanel() {
    const panel = {
      droidType: this.system?.droidType || 'Protocol Droid',
      droidModel: this.system?.droidModel || '',
      restrictionLevel: this.system?.restrictionLevel || 0,
      maxModificationPoints: this._calculateMaxModPoints(),
      usedModificationPoints: this._calculateUsedModPoints(),
      availableModificationPoints: this._calculateAvailableModPoints(),
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('droidSummaryPanel', panel);
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
   * DEFENSES PANEL
   * Droid defenses - similar to character but may have droid-specific modifiers
   */
  buildDefensesPanel() {
    const panel = {
      defense: this.derived?.defense?.base ?? 10,
      flatFooted: this.derived?.defense?.flatFooted ?? 10,
      shields: this.derived?.defense?.shields ?? [],
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('defensesPanel', panel);
    return panel;
  }

  /**
   * SKILLS PANEL
   * Droid skills - may be affected by protocols
   * Apply protocol bonuses to skill values
   */
  buildSkillsPanel() {
    const skills = this.system?.skills || {};
    let entries = Object.entries(skills)
      .map(([skillName, skillData]) => ({
        name: skillName,
        bonus: skillData?.bonus ?? 0,
        ability: skillData?.ability ?? 'dexterity',
        canEdit: this.actor.isOwner
      }));

    // Apply protocol bonuses to affected skills
    const protocols = this.actor.items.filter(item => item.type === 'protocol');
    for (const protocol of protocols) {
      const affectedSkill = protocol.system?.affectedSkill;
      const bonus = protocol.system?.bonus || 0;

      if (affectedSkill && bonus > 0) {
        const skillEntry = entries.find(s => s.name === affectedSkill);
        if (skillEntry) {
          skillEntry.bonus += bonus;
          skillEntry.protocolBonus = (skillEntry.protocolBonus || 0) + bonus;
        }
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

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
   * PROTOCOLS PANEL (DROID-SPECIFIC)
   * Shows droid protocols (talents equivalent)
   * Protocols modify skills and abilities
   */
  buildProtocolsPanel() {
    const protocolItems = this.actor.items.filter(item => item.type === 'protocol');

    const entries = protocolItems.map(item => ({
      id: item.id,
      name: item.name,
      affectedSkill: item.system?.affectedSkill || 'none',
      bonus: item.system?.bonus || 0,
      description: item.system?.description || '',
      canEdit: this.actor.isOwner
    }));

    entries.sort((a, b) => a.name.localeCompare(b.name));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No protocols installed',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('protocolsPanel', panel);
    return panel;
  }

  /**
   * CUSTOMIZATIONS PANEL (DROID-SPECIFIC)
   * Shows droid customizations (feats equivalent)
   * Customizations enhance droid capabilities
   */
  buildCustomizationsPanel() {
    const customizationItems = this.actor.items.filter(item => item.type === 'customization');

    const entries = customizationItems.map(item => ({
      id: item.id,
      name: item.name,
      costPoints: item.system?.costPoints || 1,
      prerequisite: item.system?.prerequisite,
      description: item.system?.description || '',
      canEdit: this.actor.isOwner
    }));

    entries.sort((a, b) => a.name.localeCompare(b.name));

    const totalCost = entries.reduce((sum, e) => sum + e.costPoints, 0);
    const availablePoints = this._calculateAvailableModPoints();

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      totalCost,
      availablePoints,
      emptyMessage: 'No customizations installed',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('customizationsPanel', panel);
    return panel;
  }

  /**
   * PROGRAMMING PANEL (DROID-SPECIFIC)
   * Shows droid programming/languages
   * Droids learn languages through programming
   */
  buildProgrammingPanel() {
    const programmingItems = this.actor.items.filter(item => item.type === 'programming' || item.type === 'language');

    const entries = programmingItems.map(item => ({
      id: item.id,
      name: item.name,
      proficiency: item.system?.proficiency || 'speaks',
      canEdit: this.actor.isOwner
    }));

    entries.sort((a, b) => a.name.localeCompare(b.name));

    const panel = {
      entries,
      hasEntries: entries.length > 0,
      totalCount: entries.length,
      emptyMessage: 'No programming languages installed',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('programmingPanel', panel);
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
   * COMBAT PANEL
   * Droid combat stats - initiative, AC, special droid abilities
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
   * DROID NOTES PANEL (DROID-SPECIFIC)
   * Shows droid-specific notes and information
   */
  buildDroidNotesPanel() {
    const panel = {
      notes: this.system?.notes || '',
      specialAbilities: this.system?.specialAbilities || '',
      restrictions: this.system?.restrictions || '',
      canEdit: this.actor.isOwner
    };

    this._validatePanelContext('droidNotesPanel', panel);
    return panel;
  }

  // ===== DROID GAME LOGIC HELPERS =====

  /**
   * DROID GAME LOGIC: Calculate max modification points
   * Formula: (Int modifier * 3) + (Droid Level / 2)
   * @private
   */
  _calculateMaxModPoints() {
    const intMod = this.system?.abilities?.intelligence?.modifier || 0;
    const level = this.system?.level || 1;
    return Math.floor((intMod * 3) + (level / 2));
  }

  /**
   * DROID GAME LOGIC: Calculate used modification points
   * Sum of all customization costs
   * @private
   */
  _calculateUsedModPoints() {
    const customizations = this.actor.items.filter(i => i.type === 'customization');
    return customizations.reduce((sum, item) => sum + (item.system?.costPoints || 1), 0);
  }

  /**
   * DROID GAME LOGIC: Calculate available modification points
   * Max minus used
   * @private
   */
  _calculateAvailableModPoints() {
    return this._calculateMaxModPoints() - this._calculateUsedModPoints();
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
