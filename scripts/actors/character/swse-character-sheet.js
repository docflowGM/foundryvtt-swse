/**
 * SWSE Character Sheet
 *
 * @class SWSECharacterSheet
 * @extends {SWSEActorSheetBase}
 * @description
 * Character sheet implementation for Star Wars Saga Edition player characters.
 * Manages display and interaction for:
 * - Character stats and defenses
 * - Skills and ability scores
 * - Feats, talents, and Force powers
 * - Equipment and inventory
 * - Combat actions and abilities
 * - Level-up and character advancement
 * - Force Suite management
 * - Store/shopping interface
 *
 * Features multiple tabs for organized data presentation:
 * - Summary: Key stats, defenses, conditions
 * - Skills: All skills with modifiers
 * - Combat: Weapons, attacks, combat actions
 * - Features: Feats, talents, class features
 * - Force: Force powers, Force Suite, Force points
 * - Equipment: Inventory, armor, gear
 *
 * @example
 * // Render character sheet
 * const sheet = actor.sheet;
 * sheet.render(true);
 *
 * @example
 * // Open Level Up dialog from sheet
 * // User clicks "Level Up" button on sheet
 */

import { SWSELogger } from '../../utils/logger.js';
import { SWSELevelUp } from '../../apps/swse-levelup.js';
import { SWSEStore } from '../../apps/store/store-main.js';
import { SWSEActorSheetBase } from '../../sheets/base-sheet.js';
import { CombatActionsMapper } from '../../combat/utils/combat-actions-mapper.js';
import { FeatActionsMapper } from '../../utils/feat-actions-mapper.js';
import { SWSERoll } from '../../combat/rolls/enhanced-rolls.js';

export class SWSECharacterSheet extends SWSEActorSheetBase {

  static _forcePowerDescriptions = null;
  static _combatActionsData = null;

  /**
   * Load Force power descriptions from JSON data
   *
   * @static
   * @returns {Promise<Object>} Force power descriptions data
   */
  static async loadForcePowerDescriptions() {
    if (this._forcePowerDescriptions) return this._forcePowerDescriptions;

    try {
      const response = await fetch('systems/swse/data/force-power-descriptions.json');
      this._forcePowerDescriptions = await response.json();
      return this._forcePowerDescriptions;
    } catch (error) {
      SWSELogger.error('SWSE | Failed to load Force power descriptions:', error);
      return null;
    }
  }

  /**
   * Load combat actions data from JSON file
   *
   * @static
   * @returns {Promise<Array>} Combat actions data
   */
  static async loadCombatActionsData() {
    if (this._combatActionsData) return this._combatActionsData;

    try {
      const response = await fetch('systems/swse/data/combat-actions.json');
      this._combatActionsData = await response.json();
      return this._combatActionsData;
    } catch (error) {
      SWSELogger.error('SWSE | Failed to load combat actions data:', error);
      return [];
    }
  }

  /**
   * Default options for character sheet
   *
   * @static
   * @returns {Object} Default sheet options
   * @override
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'sheet', 'actor', 'character'],
      template: 'systems/swse/templates/actors/character/character-sheet.hbs',
      width: 800,
      height: 900,
      tabs: [{
        navSelector: '.sheet-tabs',
        contentSelector: '.sheet-body',
        initial: 'summary'
      }],
      scrollY: ['.sheet-body', '.tab']
    });
  }

  /**
   * Override _render to save and restore scroll position
   * @override
   */
  async _render(force, options) {
    // Save scroll positions before render
    this._saveScrollPositions();

    // Call parent render
    await super._render(force, options);

    // Restore scroll positions after render
    this._restoreScrollPositions();
  }

  /**
   * Save scroll positions of scrollable elements
   * @private
   */
  _saveScrollPositions() {
    if (!this.element) return;

    this._scrollPositions = {};
    const scrollableElements = this.element.find('.sheet-body, .tab');

    scrollableElements.each((i, el) => {
      const key = el.classList.toString();
      this._scrollPositions[key] = el.scrollTop;
    });
  }

  /**
   * Restore scroll positions after render
   * @private
   */
  _restoreScrollPositions() {
    if (!this.element || !this._scrollPositions) return;

    const scrollableElements = this.element.find('.sheet-body, .tab');

    scrollableElements.each((i, el) => {
      const key = el.classList.toString();
      if (this._scrollPositions[key] !== undefined) {
        el.scrollTop = this._scrollPositions[key];
      }
    });
  }

  /**
   * Prepare character sheet data for rendering
   *
   * @returns {Promise<Object>} Sheet rendering context containing:
   * @returns {Actor} returns.actor - The actor being displayed
   * @returns {Object} returns.system - Actor's system data
   * @returns {Array<Item>} returns.forceSecrets - Force Secret feats
   * @returns {Array<Item>} returns.forceTechniques - Force Technique feats
   * @returns {Array<Item>} returns.knownPowers - All known Force powers not in suite
   * @returns {Array<Item>} returns.activeSuite - Force powers in active Force Suite
   * @returns {string} returns.forceRerollDice - Force Point reroll die formula
   * @returns {Array<Object>} returns.combatActions - Available combat actions
   * @returns {Object} returns.featActions - Feat-based special actions
   * @override
   */
  async getData() {
    const context = await super.getData();

    // Filter feats for Force Secrets and Force Techniques
    const feats = this.actor.items.filter(i => i.type === 'feat');

    context.forceSecrets = feats.filter(f =>
      f.name.toLowerCase().includes('force secret')
    );

    context.forceTechniques = feats.filter(f =>
      f.name.toLowerCase().includes('force technique')
    );

    // Organize force powers
    const allForcePowers = this.actor.items.filter(i => i.type === 'forcepower' || i.type === 'force-power');
    const forceSuite = this.actor.system.forceSuite || { powers: [], max: 0 };

    context.knownPowers = allForcePowers.filter(p => !forceSuite.powers?.includes(p.id));
    context.activeSuite = allForcePowers.filter(p => forceSuite.powers?.includes(p.id));

    // Force reroll dice calculation
    const forcePointDie = this.actor.system.forcePoints?.die || '1d6';
    context.forceRerollDice = forcePointDie;

    // Get combat actions from CombatActionsMapper
    // Get all combat actions as a flat list for the combat tab
    const actionsBySkill = CombatActionsMapper.getAllActionsBySkill();
    const allActions = [];

    for (const [skillKey, data] of Object.entries(actionsBySkill)) {
      if (data.combatActions && data.combatActions.length > 0) {
        allActions.push(...data.combatActions.map(action => ({
          ...action,
          skill: skillKey
        })));
      }
    }

    // Sort by action type and name
    allActions.sort((a, b) => {
      const typeOrder = { swift: 0, move: 1, standard: 2, 'full-round': 3 };
      const aType = typeOrder[a.actionType?.toLowerCase()] ?? 99;
      const bType = typeOrder[b.actionType?.toLowerCase()] ?? 99;
      if (aType !== bType) return aType - bType;
      return a.name.localeCompare(b.name);
    });

    // Add talent enhancements to combat actions
    const actionsWithEnhancements = CombatActionsMapper.addEnhancementsToActions(allActions, this.actor);

    // Get active enhancements from actor flags
    const activeEnhancements = this.actor.getFlag('swse', 'activeEnhancements') || {};

    // Mark which enhancements are active
    for (const action of actionsWithEnhancements) {
      if (action.enhancements && activeEnhancements[action.name]) {
        action.enhancements = action.enhancements.map(enhancement => ({
          ...enhancement,
          active: activeEnhancements[action.name].includes(enhancement.name)
        }));
      }
    }

    context.combatActions = actionsWithEnhancements;

    // Get feat-granted actions
    const featActions = FeatActionsMapper.getActionsByType(this.actor);
    const activeEffects = this.actor.effects.filter(e => e.flags?.swse?.type === 'feat-action');

    // Mark toggled actions
    for (const category of ['toggleable', 'variable', 'standard', 'passive']) {
      if (featActions[category]) {
        featActions[category] = featActions[category].map(action => {
          const effect = activeEffects.find(e => e.flags?.swse?.actionKey === action.key);
          return {
            ...action,
            toggled: !!effect,
            variableValue: effect?.flags?.swse?.variableValue || action.variableOptions?.min || 0
          };
        });
      }
    }

    context.featActions = featActions;

    // Check if character has completed character generation
    // A character is considered "complete" if they have at least one class
    const classItems = this.actor.items.filter(i => i.type === 'class');
    const hasClasses = classItems.length > 0;
    context.chargenComplete = hasClasses;

    // Prepare class display text (e.g., "Jedi 4 / Scoundrel 3 / Jedi Knight 1")
    if (hasClasses) {
      const classStrings = classItems.map(cls => `${cls.name} ${cls.system.level || 1}`);
      context.classDisplay = classStrings.join(' / ');
    } else {
      context.classDisplay = 'No classes';
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    // Add character-specific listeners
    html.find('.level-up').click(this._onLevelUp.bind(this));
    html.find('.character-generator').click(this._onOpenCharGen.bind(this));
    html.find('.open-store').click(this._onOpenStore.bind(this));
    html.find('.add-class-btn').click(this._onAddClass.bind(this));

    // Combat actions filter and search
    html.find('.combat-action-search').on('input', this._onFilterCombatActions.bind(this));
    html.find('.action-type-filter').on('change', this._onFilterCombatActions.bind(this));

    // Combat action click to post to chat
    html.find('.action-name.rollable').click(this._onPostCombatAction.bind(this));

    // Feat action listeners
    html.find('.feat-action-toggle').click(this._onToggleFeatAction.bind(this));
    html.find('.feat-action-slider-input').on('input', this._onUpdateVariableAction.bind(this));
    html.find('.feat-action-use').click(this._onUseFeatAction.bind(this));

    // Talent enhancement listeners
    html.find('.talent-enhancement-toggle').on('change', this._onToggleTalentEnhancement.bind(this));

    SWSELogger.log('SWSE | Character sheet listeners activated');
  }

  /**
   * Override item creation to show selection dialog for feats and talents
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;

    // For feats and talents, show selection dialog
    if (type === 'feat') {
      await this._showFeatSelectionDialog();
      return;
    } else if (type === 'talent') {
      await this._showTalentSelectionDialog();
      return;
    }

    // For other item types, use default behavior
    const itemData = {
      name: game.i18n.format("DOCUMENT.New", {type: game.i18n.localize(`ITEM.Type${type.capitalize()}`)}),
      type: type,
      system: {}
    };
    await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Show feat selection dialog
   */
  async _showFeatSelectionDialog() {
    new Dialog({
      title: "Add Feat",
      content: `
        <div class="form-group">
          <p>How would you like to add a feat?</p>
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
            <label style="display: flex; align-items: center; cursor: pointer; padding: 10px; border: 1px solid #999; border-radius: 4px;">
              <input type="radio" name="feat-choice" value="pick" checked style="margin-right: 10px;"/>
              <div>
                <strong>Pick from Feat List</strong>
                <div style="font-size: 0.9em; color: #666; margin-top: 3px;">Select a feat from the compendium</div>
              </div>
            </label>
            <label style="display: flex; align-items: center; cursor: pointer; padding: 10px; border: 1px solid #999; border-radius: 4px;">
              <input type="radio" name="feat-choice" value="custom" style="margin-right: 10px;"/>
              <div>
                <strong>Create Custom Feat</strong>
                <div style="font-size: 0.9em; color: #666; margin-top: 3px;">Create a custom feat with your own details</div>
              </div>
            </label>
          </div>
        </div>
      `,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: "Continue",
          callback: async (html) => {
            const choice = html.find('input[name="feat-choice"]:checked').val();
            if (choice === 'pick') {
              await this._showFeatPicker();
            } else {
              await this._createCustomFeat();
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "ok"
    }, {
      width: 450
    }).render(true);
  }

  /**
   * Show talent selection dialog
   */
  async _showTalentSelectionDialog() {
    new Dialog({
      title: "Add Talent",
      content: `
        <div class="form-group">
          <p>How would you like to add a talent?</p>
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
            <label style="display: flex; align-items: center; cursor: pointer; padding: 10px; border: 1px solid #999; border-radius: 4px;">
              <input type="radio" name="talent-choice" value="pick" checked style="margin-right: 10px;"/>
              <div>
                <strong>Pick from Talent List</strong>
                <div style="font-size: 0.9em; color: #666; margin-top: 3px;">Select a talent from your class talent trees</div>
              </div>
            </label>
            <label style="display: flex; align-items: center; cursor: pointer; padding: 10px; border: 1px solid #999; border-radius: 4px;">
              <input type="radio" name="talent-choice" value="custom" style="margin-right: 10px;"/>
              <div>
                <strong>Add Talent</strong>
                <div style="font-size: 0.9em; color: #666; margin-top: 3px;">Create a custom talent with your own details</div>
              </div>
            </label>
          </div>
        </div>
      `,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: "Continue",
          callback: async (html) => {
            const choice = html.find('input[name="talent-choice"]:checked').val();
            if (choice === 'pick') {
              await this._showTalentPicker();
            } else {
              await this._createCustomTalent();
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "ok"
    }, {
      width: 450
    }).render(true);
  }

  /**
   * Show feat picker dialog
   */
  async _showFeatPicker() {
    // Load feats from compendium
    const featPack = game.packs.get('swse.feats');
    if (!featPack) {
      ui.notifications.error('Feats compendium not found');
      return;
    }

    const feats = await featPack.getDocuments();

    // Load feat metadata for categorization
    let featMetadata = null;
    try {
      const resp = await fetch("systems/swse/data/feat-metadata.json");
      if (resp.ok) {
        featMetadata = await resp.json();
      }
    } catch (err) {
      SWSELogger.warn("Could not load feat metadata:", err);
    }

    // Organize feats by category if metadata is available
    const categorized = {};
    const uncategorized = [];

    if (featMetadata && featMetadata.categories && featMetadata.feats) {
      // Initialize categories
      for (const [catKey, catInfo] of Object.entries(featMetadata.categories)) {
        categorized[catKey] = {
          ...catInfo,
          feats: []
        };
      }

      // Categorize feats
      for (const feat of feats) {
        const metadata = featMetadata.feats[feat.name];
        if (metadata && metadata.category && categorized[metadata.category]) {
          categorized[metadata.category].feats.push(feat);
        } else {
          uncategorized.push(feat);
        }
      }

      // Add uncategorized
      if (uncategorized.length > 0) {
        categorized.uncategorized = {
          name: "Other Feats",
          icon: "📋",
          order: 999,
          feats: uncategorized
        };
      }
    } else {
      uncategorized.push(...feats);
    }

    // Build HTML content
    let content = '<div class="feat-picker-dialog"><div class="feat-search"><input type="text" id="feat-search-input" placeholder="Search feats..." style="width: 100%; padding: 5px; margin-bottom: 10px;"/></div>';

    if (Object.keys(categorized).length > 0) {
      const sortedCategories = Object.entries(categorized)
        .sort((a, b) => (a[1].order || 999) - (b[1].order || 999));

      for (const [catKey, category] of sortedCategories) {
        if (category.feats.length === 0) continue;

        content += `
          <div class="feat-category" data-category="${catKey}">
            <h4 style="margin-top: 15px; border-bottom: 1px solid #999;">
              <span>${category.icon || ''}</span> ${category.name} (${category.feats.length})
            </h4>
            <div class="feats-list-picker">
        `;

        for (const feat of category.feats) {
          content += `
            <div class="feat-option" data-feat-id="${feat.id}" style="padding: 8px; border: 1px solid #ccc; margin: 5px 0; cursor: pointer; border-radius: 4px;">
              <strong>${feat.name}</strong>
              ${feat.system.description ? `<div style="font-size: 0.9em; color: #666; margin-top: 3px;">${feat.system.description.substring(0, 150)}${feat.system.description.length > 150 ? '...' : ''}</div>` : ''}
            </div>
          `;
        }

        content += '</div></div>';
      }
    } else {
      content += '<div class="feats-list-picker">';
      for (const feat of uncategorized) {
        content += `
          <div class="feat-option" data-feat-id="${feat.id}" style="padding: 8px; border: 1px solid #ccc; margin: 5px 0; cursor: pointer; border-radius: 4px;">
            <strong>${feat.name}</strong>
            ${feat.system.description ? `<div style="font-size: 0.9em; color: #666; margin-top: 3px;">${feat.system.description.substring(0, 150)}${feat.system.description.length > 150 ? '...' : ''}</div>` : ''}
          </div>
        `;
      }
      content += '</div>';
    }

    content += '</div>';

    const dialog = new Dialog({
      title: "Select a Feat",
      content: content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      render: (html) => {
        // Add click handler for feat selection
        html.find('.feat-option').click(async (event) => {
          const featId = $(event.currentTarget).data('feat-id');
          const selectedFeat = feats.find(f => f.id === featId);
          if (selectedFeat) {
            await this.actor.createEmbeddedDocuments('Item', [selectedFeat.toObject()]);
            ui.notifications.info(`Added feat: ${selectedFeat.name}`);
            dialog.close();
          }
        });

        // Add search functionality
        html.find('#feat-search-input').on('input', (event) => {
          const searchTerm = $(event.currentTarget).val().toLowerCase();
          html.find('.feat-option').each(function() {
            const featText = $(this).text().toLowerCase();
            $(this).toggle(featText.includes(searchTerm));
          });

          // Hide empty categories
          html.find('.feat-category').each(function() {
            const hasVisible = $(this).find('.feat-option:visible').length > 0;
            $(this).toggle(hasVisible);
          });
        });
      }
    }, {
      width: 600,
      height: 700
    });

    dialog.render(true);
  }

  /**
   * Show talent picker dialog
   */
  async _showTalentPicker() {
    // Load talents from compendium
    const talentPack = game.packs.get('swse.talents');
    if (!talentPack) {
      ui.notifications.error('Talents compendium not found');
      return;
    }

    const allTalents = await talentPack.getDocuments();

    // Get character's class talent trees
    const classItems = this.actor.items.filter(i => i.type === 'class');
    const availableTrees = new Set();

    for (const classItem of classItems) {
      const trees = classItem.system?.talent_trees || classItem.system?.talentTrees || [];
      trees.forEach(tree => availableTrees.add(tree));
    }

    // Group talents by tree
    const talentsByTree = {};
    for (const talent of allTalents) {
      const tree = talent.system?.talent_tree || talent.system?.tree || 'Other';
      if (!talentsByTree[tree]) {
        talentsByTree[tree] = [];
      }
      talentsByTree[tree].push(talent);
    }

    // Build HTML content
    let content = '<div class="talent-picker-dialog"><div class="talent-search"><input type="text" id="talent-search-input" placeholder="Search talents..." style="width: 100%; padding: 5px; margin-bottom: 10px;"/></div>';

    for (const [tree, talents] of Object.entries(talentsByTree)) {
      const isAvailable = availableTrees.has(tree);
      const style = !isAvailable ? 'opacity: 0.5;' : '';

      content += `
        <div class="talent-tree-group" data-tree="${tree}" style="${style}">
          <h4 style="margin-top: 15px; border-bottom: 1px solid #999;">
            ${tree} (${talents.length})${!isAvailable ? ' <em style="font-size: 0.9em; color: #999;">- Not available to your classes</em>' : ''}
          </h4>
          <div class="talents-list-picker">
      `;

      for (const talent of talents) {
        content += `
          <div class="talent-option ${!isAvailable ? 'unavailable' : ''}" data-talent-id="${talent.id}" ${!isAvailable ? 'data-unavailable="true"' : ''} style="padding: 8px; border: 1px solid #ccc; margin: 5px 0; cursor: pointer; border-radius: 4px;">
            <strong>${talent.name}</strong>
            ${talent.system.description ? `<div style="font-size: 0.9em; color: #666; margin-top: 3px;">${talent.system.description.substring(0, 150)}${talent.system.description.length > 150 ? '...' : ''}</div>` : ''}
          </div>
        `;
      }

      content += '</div></div>';
    }

    content += '</div>';

    const dialog = new Dialog({
      title: "Select a Talent",
      content: content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      render: (html) => {
        // Add click handler for talent selection
        html.find('.talent-option').click(async (event) => {
          const talentOption = $(event.currentTarget);

          // Check if talent is unavailable
          if (talentOption.data('unavailable')) {
            ui.notifications.warn("This talent is not available to your current classes.");
            return;
          }

          const talentId = talentOption.data('talent-id');
          const selectedTalent = allTalents.find(t => t.id === talentId);
          if (selectedTalent) {
            await this.actor.createEmbeddedDocuments('Item', [selectedTalent.toObject()]);
            ui.notifications.info(`Added talent: ${selectedTalent.name}`);
            dialog.close();
          }
        });

        // Add search functionality
        html.find('#talent-search-input').on('input', (event) => {
          const searchTerm = $(event.currentTarget).val().toLowerCase();
          html.find('.talent-option').each(function() {
            const talentText = $(this).text().toLowerCase();
            $(this).toggle(talentText.includes(searchTerm));
          });

          // Hide empty trees
          html.find('.talent-tree-group').each(function() {
            const hasVisible = $(this).find('.talent-option:visible').length > 0;
            $(this).toggle(hasVisible);
          });
        });
      }
    }, {
      width: 600,
      height: 700
    });

    dialog.render(true);
  }

  /**
   * Create a custom feat
   */
  async _createCustomFeat() {
    const itemData = {
      name: "New Custom Feat",
      type: "feat",
      system: {
        description: "",
        prerequisites: ""
      }
    };
    const items = await this.actor.createEmbeddedDocuments('Item', [itemData]);
    if (items && items.length > 0) {
      items[0].sheet.render(true);
    }
  }

  /**
   * Create a custom talent
   */
  async _createCustomTalent() {
    const itemData = {
      name: "New Custom Talent",
      type: "talent",
      system: {
        description: "",
        tree: "Custom"
      }
    };
    const items = await this.actor.createEmbeddedDocuments('Item', [itemData]);
    if (items && items.length > 0) {
      items[0].sheet.render(true);
    }
  }

  /**
   * Handle level up
   */
  async _onLevelUp(event) {
    event.preventDefault();
    SWSELogger.log('SWSE | Level up clicked');

    // Use the enhanced version with visual talent trees and multi-classing
    await SWSELevelUp.openEnhanced(this.actor);
  }

  /**
   * Handle opening the character generator
   */
  async _onOpenCharGen(event) {
    event.preventDefault();
    SWSELogger.log('SWSE | Character generator clicked');

    // Import and open the character generator
    try {
      const CharacterGenerator = (await import('../../apps/chargen/chargen-main.js')).default;
      const chargen = new CharacterGenerator(this.actor);
      chargen.render(true);
    } catch (err) {
      SWSELogger.error("SWSE | Failed to open character generator:", err);
      ui.notifications.error("Failed to open the character generator. See console for details.");
    }
  }

  /**
   * Handle opening the store
   */
  async _onOpenStore(event) {
    event.preventDefault();
    SWSELogger.log('SWSE | Store button clicked');

    // Create and render the store application
    const store = new SWSEStore(this.actor);
    store.render(true);
  }

  /**
   * Handle adding a new class to the character
   */
  async _onAddClass(event) {
    event.preventDefault();
    SWSELogger.log('SWSE | Add class button clicked');

    // Show dialog asking whether to select from classes or create custom
    new Dialog({
      title: "Add Class",
      content: `
        <div style="padding: 1rem;">
          <p style="text-align: center; margin-bottom: 1rem;">How would you like to add a class?</p>
        </div>
      `,
      buttons: {
        select: {
          icon: '<i class="fas fa-list"></i>',
          label: "Select from Classes",
          callback: () => {
            this._onSelectClass();
          }
        },
        custom: {
          icon: '<i class="fas fa-edit"></i>',
          label: "Create Custom Class",
          callback: () => {
            this._onCreateCustomClass();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "select"
    }).render(true);
  }

  /**
   * Open class selection dialog using levelup class selection UI
   */
  async _onSelectClass() {
    try {
      // Import class selection functions
      const { getAvailableClasses } = await import('../../apps/levelup/levelup-class.js');

      // Get available classes
      const classes = await getAvailableClasses(this.actor, {});

      if (!classes || classes.length === 0) {
        ui.notifications.warn('No classes found in compendium!');
        return;
      }

      // Separate base and prestige classes
      const baseClasses = classes.filter(c => c.isBase);
      const prestigeClasses = classes.filter(c => c.isPrestige);

      // Build class selection dialog
      const buildClassGrid = (classList) => {
        return classList.map(cls => `
          <div class="class-choice-btn" data-class-id="${cls.id}" data-class-name="${cls.name}">
            <div class="class-icon">
              <i class="fas ${cls.icon || 'fa-user'}"></i>
            </div>
            <h3 class="class-name">${cls.name}</h3>
            <p class="class-description">${cls.description || ''}</p>
            <div class="class-stats">
              <span><strong>Hit Die:</strong> d${cls.system.hitDie || 6}</span>
              <span><strong>BAB:</strong> ${cls.system.babProgression || 'Medium'}</span>
            </div>
          </div>
        `).join('');
      };

      const content = `
        <div class="class-selection-dialog">
          <div class="class-type-tabs">
            <button class="class-tab active" data-tab="base">Base Classes</button>
            <button class="class-tab" data-tab="prestige">Prestige Classes</button>
          </div>
          <div class="class-tab-content active" data-tab="base">
            <div class="class-grid">
              ${buildClassGrid(baseClasses)}
            </div>
          </div>
          <div class="class-tab-content" data-tab="prestige" style="display: none;">
            <div class="class-grid">
              ${buildClassGrid(prestigeClasses)}
            </div>
          </div>
        </div>
        <style>
          .class-selection-dialog { max-height: 600px; overflow-y: auto; }
          .class-type-tabs { display: flex; margin-bottom: 1rem; border-bottom: 2px solid #444; }
          .class-tab { flex: 1; padding: 0.75rem; background: rgba(0,0,0,0.2); border: none; color: #ccc; cursor: pointer; transition: all 0.3s; }
          .class-tab.active { background: rgba(74, 144, 226, 0.3); color: #fff; border-bottom: 3px solid #4a90e2; }
          .class-tab:hover { background: rgba(74, 144, 226, 0.2); }
          .class-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
          .class-choice-btn {
            position: relative;
            background: linear-gradient(135deg, rgba(30, 30, 40, 0.9), rgba(20, 20, 30, 0.9));
            border: 3px solid #444;
            border-radius: 12px;
            padding: 1.5rem;
            cursor: pointer;
            transition: all 0.4s ease;
            overflow: hidden;
          }
          .class-choice-btn:hover {
            border-color: #4a90e2;
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(74, 144, 226, 0.3);
          }
          .class-icon { font-size: 3rem; text-align: center; margin-bottom: 0.5rem; color: #4a90e2; }
          .class-name { margin: 0.5rem 0; text-align: center; color: #f0f0f0; }
          .class-description { font-size: 0.9rem; color: #ccc; text-align: center; margin: 0.5rem 0; min-height: 2.5rem; }
          .class-stats { display: flex; justify-content: space-around; margin-top: 1rem; font-size: 0.85rem; color: #bbb; }
        </style>
      `;

      // Show dialog
      const dialog = new Dialog({
        title: 'Select a Class',
        content: content,
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel'
          }
        },
        render: (html) => {
          // Tab switching
          html.find('.class-tab').click((e) => {
            const tab = $(e.currentTarget).data('tab');
            html.find('.class-tab').removeClass('active');
            html.find('.class-tab-content').hide();
            $(e.currentTarget).addClass('active');
            html.find(`.class-tab-content[data-tab="${tab}"]`).show();
          });

          // Class selection
          html.find('.class-choice-btn').click(async (e) => {
            const classId = $(e.currentTarget).data('class-id');
            const className = $(e.currentTarget).data('class-name');

            // Close the dialog
            dialog.close();

            // Add the class to the actor
            await this._addClassToActor(classId, className, 1);
          });
        }
      }, {
        width: 800,
        height: 700,
        classes: ['swse', 'class-selection-dialog']
      });

      dialog.render(true);

    } catch (err) {
      SWSELogger.error('SWSE | Failed to open class selection:', err);
      ui.notifications.error('Failed to load class selection. See console for details.');
    }
  }

  /**
   * Open custom class creation dialog
   */
  async _onCreateCustomClass() {
    new Dialog({
      title: "Create Custom Class",
      content: `
        <form>
          <div class="form-group">
            <label>Class Name:</label>
            <input type="text" id="custom-class-name" name="className" placeholder="Enter class name..." style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"/>
          </div>
          <div class="form-group" style="margin-top: 1rem;">
            <label>Starting Level:</label>
            <input type="number" id="custom-class-level" name="classLevel" value="1" min="1" max="20" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"/>
          </div>
        </form>
      `,
      buttons: {
        create: {
          icon: '<i class="fas fa-check"></i>',
          label: "Create",
          callback: async (html) => {
            const className = html.find('#custom-class-name').val().trim();
            const classLevel = parseInt(html.find('#custom-class-level').val()) || 1;

            if (!className) {
              ui.notifications.warn('Please enter a class name!');
              return;
            }

            await this._createCustomClassItem(className, classLevel);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "create"
    }).render(true);
  }

  /**
   * Add a class from compendium to the actor
   */
  async _addClassToActor(classId, className, level = 1) {
    try {
      const classPack = game.packs.get('swse.classes');
      if (!classPack) {
        ui.notifications.error('Classes compendium not found!');
        return;
      }

      const classDoc = await classPack.getDocument(classId);
      if (!classDoc) {
        ui.notifications.error(`Class "${className}" not found!`);
        return;
      }

      const classData = classDoc.toObject();
      classData.system.level = level;

      await this.actor.createEmbeddedDocuments('Item', [classData]);
      ui.notifications.info(`Added ${className} level ${level} to ${this.actor.name}`);

      SWSELogger.log(`SWSE | Added class ${className} (level ${level}) to actor`);
    } catch (err) {
      SWSELogger.error('SWSE | Failed to add class:', err);
      ui.notifications.error('Failed to add class. See console for details.');
    }
  }

  /**
   * Create a custom class item
   */
  async _createCustomClassItem(className, level = 1) {
    try {
      const classData = {
        name: className,
        type: 'class',
        system: {
          level: level,
          hitDie: 6,
          babProgression: 'medium',
          defenses: {
            fortitude: 0,
            reflex: 0,
            will: 0
          }
        }
      };

      await this.actor.createEmbeddedDocuments('Item', [classData]);
      ui.notifications.info(`Created custom class ${className} level ${level} for ${this.actor.name}`);

      SWSELogger.log(`SWSE | Created custom class ${className} (level ${level}) for actor`);
    } catch (err) {
      SWSELogger.error('SWSE | Failed to create custom class:', err);
      ui.notifications.error('Failed to create custom class. See console for details.');
    }
  }

  /**
   * Open species selection dialog
   */
  async _onPickSpecies(event) {
    event.preventDefault();

    // Get species compendium
    const speciesPack = game.packs.get('swse.species');
    if (!speciesPack) {
      ui.notifications.error('Species compendium not found');
      return;
    }

    // Load all species from compendium
    const index = await speciesPack.getIndex();
    const speciesList = index.map(entry => ({
      id: entry._id,
      name: entry.name,
      img: entry.img || 'icons/svg/mystery-man.svg'
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Build dialog content with search
    const content = `
      <div class="species-picker">
        <div class="species-search-container">
          <input type="text"
                 id="species-search"
                 placeholder="Search species..."
                 autofocus
                 style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px;"/>
        </div>
        <div class="species-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; max-height: 450px; overflow-y: auto; padding: 0.5rem;">
          ${speciesList.map(species => `
            <button type="button" class="species-item choice-button" data-species-id="${species.id}" style="padding: 0.75rem; border: 2px solid #999; border-radius: 4px; background: #f5f5f5; cursor: pointer; text-align: center; transition: all 0.2s;">
              <h4 class="species-name" style="margin: 0; font-size: 0.95rem; font-weight: bold; color: #333;">${species.name}</h4>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Show dialog
    const dialog = new Dialog({
      title: this.actor.system.race ? 'Change Species' : 'Select Species',
      content: content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel'
        }
      },
      default: 'cancel',
      render: (html) => {
        const searchInput = html.find('#species-search');
        const speciesItems = html.find('.species-item');

        // Search filter
        searchInput.on('input', function() {
          const searchTerm = $(this).val().toLowerCase();
          speciesItems.each(function() {
            const speciesName = $(this).find('.species-name').text().toLowerCase();
            $(this).toggle(speciesName.includes(searchTerm));
          });
        });

        // Species selection
        speciesItems.on('click', async (event) => {
          const speciesId = $(event.currentTarget).data('species-id');
          const species = await speciesPack.getDocument(speciesId);

          if (species) {
            // Use the drop handler to apply species
            const { DropHandler } = await import('../../drag-drop/drop-handler.js');
            await DropHandler.handleSpeciesDrop(this.actor, species);

            // Close dialog after successful selection
            dialog.close();
            ui.notifications.info(`Species changed to ${species.name}`);
          }
        });

        // Hover effect
        speciesItems.hover(
          function() {
            $(this).css({
              'background-color': 'rgba(74, 144, 226, 0.15)',
              'border-color': '#4a90e2',
              'transform': 'translateY(-2px)',
              'box-shadow': '0 4px 8px rgba(0,0,0,0.15)'
            });
          },
          function() {
            $(this).css({
              'background-color': '#f5f5f5',
              'border-color': '#999',
              'transform': 'translateY(0)',
              'box-shadow': 'none'
            });
          }
        );

        // Focus search input
        searchInput.focus();
      }
    }, {
      width: 700,
      height: 600,
      classes: ['swse', 'species-picker-dialog']
    }).render(true);
  }

  /**
   * Filter combat actions by search term and action type
   */
  _onFilterCombatActions(event) {
    const html = this.element;
    const searchTerm = html.find('.combat-action-search').val().toLowerCase();
    const actionType = html.find('.action-type-filter').val();

    html.find('.combat-action-row').each((i, row) => {
      const $row = $(row);
      const actionName = $row.data('action-name').toLowerCase();
      const rowActionType = $row.data('action-type');

      const matchesSearch = !searchTerm || actionName.includes(searchTerm);
      const matchesType = !actionType || rowActionType === actionType;

      $row.toggle(matchesSearch && matchesType);
    });
  }

  /**
   * Handle rolling a combat action (posts to chat)
   */
  async _onRollCombatAction(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const actionName = element.dataset.actionName;
    const notes = element.dataset.notes;
    const dc = element.dataset.dc;

    const content = `
      <div class="swse-combat-action">
        <h3>${actionName}</h3>
        <p><strong>Description:</strong> ${notes}</p>
        ${dc ? `<p><strong>DC:</strong> ${dc}</p>` : ''}
      </div>
    `;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Handle toggling a feat action
   */
  async _onToggleFeatAction(event) {
    event.preventDefault();
    const actionKey = event.currentTarget.dataset.actionKey;

    const newState = await FeatActionsMapper.toggleAction(this.actor, actionKey);

    ui.notifications.info(`${newState ? 'Activated' : 'Deactivated'} feat action`);
  }

  /**
   * Handle updating a variable feat action
   */
  async _onUpdateVariableAction(event) {
    event.preventDefault();
    const actionKey = event.currentTarget.dataset.actionKey;
    const value = parseInt(event.currentTarget.value);

    // Update the display
    const $slider = $(event.currentTarget);
    $slider.closest('.feat-action-slider').find('.slider-value').text(value);

    // Update the effect
    await FeatActionsMapper.updateVariableAction(this.actor, actionKey, value);
  }

  /**
   * Handle using a feat action (posts to chat)
   */
  async _onUseFeatAction(event) {
    event.preventDefault();
    const actionKey = event.currentTarget.dataset.actionKey;
    const action = FeatActionsMapper.getAllFeatActions()[actionKey];

    if (!action) return;

    const content = `
      <div class="swse-feat-action">
        <h3><i class="fas fa-star"></i> ${action.name}</h3>
        <p><strong>Type:</strong> ${action.actionType}</p>
        <p><strong>Description:</strong> ${action.description}</p>
        ${action.trigger ? `<p><strong>Trigger:</strong> ${action.trigger}</p>` : ''}
        <p>${action.notes}</p>
      </div>
    `;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Post combat action to chat (with optional DC check roll)
   */
  async _onPostCombatAction(event) {
    event.preventDefault();
    const actionName = event.currentTarget.dataset.actionName;

    // Load combat actions data
    const combatActionsData = await SWSECharacterSheet.loadCombatActionsData();
    const actionData = combatActionsData.find(a => a.name === actionName);

    if (!actionData) {
      ui.notifications.warn(`Combat action ${actionName} not found`);
      return;
    }

    // Check if this action has rollable skills with flat DCs
    const rollableSkills = actionData.relatedSkills?.filter(rs =>
      rs.dc && rs.dc.type === 'flat' && rs.skill && rs.skill !== 'Attack' && rs.skill !== 'Attack Roll'
    ) || [];

    // If no rollable skills, just post description to chat
    if (rollableSkills.length === 0) {
      await this._postCombatActionDescription(actionName, actionData);
      return;
    }

    // If only one rollable skill, roll it directly
    if (rollableSkills.length === 1) {
      const skillData = rollableSkills[0];
      const skillKey = this._getSkillKey(skillData.skill);

      if (skillKey) {
        await SWSERoll.rollCombatActionCheck(this.actor, skillKey, {
          name: actionName,
          actionType: actionData.action.type,
          dc: skillData.dc,
          outcome: skillData.outcome,
          when: skillData.when
        });
      } else {
        await this._postCombatActionDescription(actionName, actionData);
      }
      return;
    }

    // Multiple rollable skills - show selection dialog
    await this._showSkillSelectionDialog(actionName, actionData, rollableSkills);
  }

  /**
   * Post combat action description to chat (without rolling)
   */
  async _postCombatActionDescription(actionName, actionData) {
    const actionType = actionData.action.type;
    const notes = actionData.notes;

    // Check for active talent enhancements
    const activeEnhancements = this.actor.getFlag('swse', 'activeEnhancements') || {};
    const actionEnhancements = activeEnhancements[actionName] || [];

    // Build enhancement text
    let enhancementText = '';
    if (actionEnhancements.length > 0) {
      enhancementText = `<div class="enhancement-active">
        <p><strong><i class="fas fa-star"></i> Active Talent Effects:</strong></p>
        <ul>
          ${actionEnhancements.map(e => `<li>${e}</li>`).join('')}
        </ul>
      </div>`;
    }

    // Create chat message
    const content = `
      <div class="swse-combat-action-chat">
        <h3><i class="fas fa-fist-raised"></i> ${this.actor.name} ${this._getActionVerb(actionName)}</h3>
        <div class="action-info">
          <span class="action-type-badge ${actionType}">${actionType}</span>
        </div>
        <p class="action-description">${notes}</p>
        ${enhancementText}
      </div>
    `;

    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Show dialog to select which skill to roll
   */
  async _showSkillSelectionDialog(actionName, actionData, rollableSkills) {
    const skillOptions = rollableSkills.map(rs => {
      const displayName = SWSERoll._getSkillDisplayName(this._getSkillKey(rs.skill));
      const dcText = rs.dc ? `DC ${rs.dc.value}` : '';
      return `
        <div class="skill-option">
          <input type="radio" name="skill-choice" value="${rs.skill}" id="skill-${rs.skill.replace(/\s+/g, '-')}">
          <label for="skill-${rs.skill.replace(/\s+/g, '-')}">
            <strong>${displayName}</strong> ${dcText}
            ${rs.when ? `<br><em>${rs.when}</em>` : ''}
          </label>
        </div>
      `;
    }).join('');

    const content = `
      <div class="combat-action-skill-selection">
        <p>Select which skill to use for <strong>${actionName}</strong>:</p>
        ${skillOptions}
      </div>
    `;

    new Dialog({
      title: `${actionName} - Select Skill`,
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll Check',
          callback: async (html) => {
            const selectedSkill = html.find('input[name="skill-choice"]:checked').val();
            if (!selectedSkill) {
              ui.notifications.warn('Please select a skill');
              return;
            }

            const skillData = rollableSkills.find(rs => rs.skill === selectedSkill);
            const skillKey = this._getSkillKey(selectedSkill);

            if (skillKey) {
              await SWSERoll.rollCombatActionCheck(this.actor, skillKey, {
                name: actionName,
                actionType: actionData.action.type,
                dc: skillData.dc,
                outcome: skillData.outcome,
                when: skillData.when
              });
            }
          }
        },
        description: {
          icon: '<i class="fas fa-comment"></i>',
          label: 'Just Post Description',
          callback: async () => {
            await this._postCombatActionDescription(actionName, actionData);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel'
        }
      },
      default: 'roll'
    }).render(true);
  }

  /**
   * Convert skill name to skill key
   */
  _getSkillKey(skillName) {
    const skillMap = {
      'Acrobatics': 'acrobatics',
      'Climb': 'climb',
      'Deception': 'deception',
      'Endurance': 'endurance',
      'Gather Information': 'gatherInformation',
      'Initiative': 'initiative',
      'Jump': 'jump',
      'Knowledge': 'knowledge',
      'Mechanics': 'mechanics',
      'Perception': 'perception',
      'Persuasion': 'persuasion',
      'Pilot': 'pilot',
      'Ride': 'ride',
      'Stealth': 'stealth',
      'Survival': 'survival',
      'Swim': 'swim',
      'Treat Injury': 'treatInjury',
      'Use Computer': 'useComputer',
      'Use the Force': 'useTheForce'
    };

    // Try direct match
    if (skillMap[skillName]) {
      return skillMap[skillName];
    }

    // Try lowercase key lookup
    const lowerName = skillName.toLowerCase();
    for (const [key, value] of Object.entries(skillMap)) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }

    // Special cases
    if (skillName.toLowerCase().includes('any relevant skill')) {
      return null; // Will need user to select
    }

    return null;
  }

  /**
   * Get the appropriate verb for an action (e.g., "is taking aim", "is charging")
   */
  _getActionVerb(actionName) {
    const verbMap = {
      'Aim': 'is taking aim',
      'Charge': 'is charging',
      'Attack (single)': 'attacks',
      'Full attack': 'makes a full attack',
      'Total Defense': 'takes total defense',
      'Fight defensively': 'fights defensively',
      'Second Wind': 'takes a second wind',
      'Aid another': 'aids an ally',
      'Feint': 'attempts to feint',
      'Grapple / Grab': 'attempts to grapple',
      'Disarm': 'attempts to disarm',
      'Run': 'runs',
      'Draw or Holster Weapon': 'draws/holsters a weapon',
      'Reload': 'reloads',
      'Coup de grace': 'delivers a coup de grâce',
      'Ready an action (prepare)': 'readies an action',
      'Burst Fire / Autofire (vehicle or weapon)': 'fires on full auto',
      'Area Attack (burst/splash/cone)': 'makes an area attack',
      'Tumble': 'tumbles',
      'Stand up from prone': 'stands up',
      'Fall prone': 'falls prone',
      'Snipe': 'snipes from hiding'
    };

    return verbMap[actionName] || `uses ${actionName}`;
  }

  /**
   * Handle toggling a talent enhancement checkbox
   */
  async _onToggleTalentEnhancement(event) {
    const checkbox = event.currentTarget;
    const actionName = checkbox.dataset.actionName;
    const enhancementName = checkbox.dataset.enhancementName;
    const talentName = checkbox.dataset.talentName;

    const isChecked = checkbox.checked;

    // Store enhancement state in actor flags
    const enhancements = this.actor.getFlag('swse', 'activeEnhancements') || {};

    if (!enhancements[actionName]) {
      enhancements[actionName] = [];
    }

    if (isChecked) {
      // Add enhancement to active list
      if (!enhancements[actionName].includes(enhancementName)) {
        enhancements[actionName].push(enhancementName);
      }
      ui.notifications.info(`Enabled ${enhancementName} for ${actionName}`);
    } else {
      // Remove enhancement from active list
      enhancements[actionName] = enhancements[actionName].filter(e => e !== enhancementName);
      if (enhancements[actionName].length === 0) {
        delete enhancements[actionName];
      }
      ui.notifications.info(`Disabled ${enhancementName} for ${actionName}`);
    }

    // Update actor flags
    await this.actor.setFlag('swse', 'activeEnhancements', enhancements);
  }

  /**
   * Handle using a Force power - automatically rolls Use the Force
   */
  async _onUsePower(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const power = this.actor.items.get(itemId);

    if (!power) {
      ui.notifications.error('Force power not found');
      return;
    }

    // Use the unified rolling system
    await SWSERoll.rollUseTheForce(this.actor, power);
  }

  /**
   * Handle spending Force Point to regain a specific power
   */
  async _onRegainForcePower(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const power = this.actor.items.get(itemId);

    if (!power || !power.system.spent) {
      ui.notifications.warn('This power has not been used yet');
      return;
    }

    // Check Force Points
    const fpAvailable = this.actor.system.forcePoints?.value || 0;
    if (fpAvailable <= 0) {
      ui.notifications.error('No Force Points available');
      return;
    }

    // Spend Force Point
    await this.actor.spendForcePoint(`regaining ${power.name}`);

    // Regain the power
    await power.update({'system.spent': false});

    ui.notifications.info(`Spent 1 Force Point to regain ${power.name}`);
  }

  /**
   * Handle resting to regain all Force Powers
   */
  async _onRestForce(event) {
    event.preventDefault();

    const spentPowers = this.actor.items.filter(i =>
      (i.type === 'forcepower' || i.type === 'force-power') && i.system.spent
    );

    if (spentPowers.length === 0) {
      ui.notifications.info('All Force Powers are already available');
      return;
    }

    // Confirm rest
    const confirmed = await Dialog.confirm({
      title: 'Rest and Regain Force Powers',
      content: `<p>Rest for 1 minute to regain all Force Powers?</p><p>${spentPowers.length} spent power(s) will be restored.</p>`
    });

    if (!confirmed) return;

    // Regain all powers
    for (const power of spentPowers) {
      await power.update({'system.spent': false});
    }

    ui.notifications.info(`Rested and regained ${spentPowers.length} Force Power(s)`);
  }

  /**
   * Handle adding a Force Power to the active suite
   */
  async _onAddToSuite(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const powerId = button.dataset.powerId || button.closest('[data-item-id]')?.dataset.itemId;

    if (!powerId) {
      ui.notifications.error('Power ID not found');
      return;
    }

    const power = this.actor.items.get(powerId);
    if (!power) {
      ui.notifications.error('Force power not found');
      return;
    }

    // Check suite capacity
    const suitePowers = this.actor.items.filter(i =>
      (i.type === 'forcepower' || i.type === 'force-power') && i.system.inSuite
    );
    const maxSuite = this.actor.system.forceSuite?.maxPowers || 6;

    if (suitePowers.length >= maxSuite) {
      ui.notifications.warn(`Force Suite is full! (${maxSuite} powers maximum)`);
      return;
    }

    // Add to suite
    await power.update({'system.inSuite': true});
    ui.notifications.info(`Added ${power.name} to Force Suite`);
  }

  /**
   * Handle removing a Force Power from the active suite
   */
  async _onRemoveFromSuite(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const powerId = button.dataset.powerId || button.closest('[data-item-id]')?.dataset.itemId;

    if (!powerId) {
      ui.notifications.error('Power ID not found');
      return;
    }

    const power = this.actor.items.get(powerId);
    if (!power) {
      ui.notifications.error('Force power not found');
      return;
    }

    // Remove from suite
    await power.update({'system.inSuite': false});
    ui.notifications.info(`Removed ${power.name} from Force Suite`);
  }

  /**
   * Handle toggling talent tree visibility
   */
  async _onToggleTree(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const treeElement = button.closest('.talent-tree');
    const treeContent = treeElement.querySelector('.tree-content');
    const icon = button.querySelector('i');

    if (treeContent.style.display === 'none') {
      treeContent.style.display = 'block';
      icon.classList.remove('fa-chevron-right');
      icon.classList.add('fa-chevron-down');
    } else {
      treeContent.style.display = 'none';
      icon.classList.remove('fa-chevron-down');
      icon.classList.add('fa-chevron-right');
    }
  }

  /**
   * Handle selecting a talent from the tree
   */
  async _onSelectTalent(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const talentId = button.dataset.talentId;

    if (!talentId) {
      ui.notifications.error('Talent ID not found');
      return;
    }

    const talent = this.actor.items.get(talentId);
    if (!talent) {
      ui.notifications.error('Talent not found');
      return;
    }

    // Check if talent is locked
    if (button.classList.contains('locked')) {
      ui.notifications.warn('This talent is locked. Prerequisites must be met first.');
      return;
    }

    // Check if already acquired
    const isAcquired = button.classList.contains('acquired');

    if (isAcquired) {
      // Allow removal if configured
      const confirmed = await Dialog.confirm({
        title: `Remove ${talent.name}?`,
        content: `<p>Do you want to remove this talent?</p><p><strong>Note:</strong> This may affect dependent talents.</p>`
      });

      if (confirmed) {
        await talent.delete();
        ui.notifications.info(`Removed ${talent.name}`);
      }
    } else {
      // Add talent - open the talent sheet for review
      await talent.sheet.render(true);
    }
  }

  /**
   * Handle viewing talent details
   */
  async _onViewTalent(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const talentId = button.dataset.talentId;

    if (!talentId) {
      ui.notifications.error('Talent ID not found');
      return;
    }

    const talent = this.actor.items.get(talentId);
    if (!talent) {
      ui.notifications.error('Talent not found');
      return;
    }

    // Open the talent sheet
    await talent.sheet.render(true);
  }

  /**
   * Handle picking or changing species
   */
  async _onPickSpecies(event) {
    event.preventDefault();

    // Import species selection functions from levelup
    const { getAvailableSpecies, selectSpecies } = await import('../../apps/levelup/levelup-class.js');

    // Get available species
    const availableSpecies = await getAvailableSpecies();
    if (!availableSpecies || availableSpecies.length === 0) {
      ui.notifications.error('No species found in compendium!');
      return;
    }

    // Build HTML for species selection dialog
    let dialogContent = `
      <div class="species-picker-dialog">
        <p class="hint-text">
          <i class="fas fa-info-circle"></i>
          ${this.actor.system.race ?
            'Changing species will replace your current racial bonuses.' :
            'Select a species to gain racial bonuses and abilities.'}
        </p>
        <div class="species-grid">
    `;

    for (const species of availableSpecies) {
      const abilities = species.system.abilities || '';
      const size = species.system.size || 'Medium';
      const speed = species.system.speed || '6';

      dialogContent += `
        <div class="species-card" data-species-id="${species.id}" data-species-name="${species.name}">
          <h4>${species.name}</h4>
          ${species.system.source ? `<div class="species-source">${species.system.source}</div>` : ''}
          <div class="species-details">
            <div><strong>Size:</strong> ${size}</div>
            <div><strong>Speed:</strong> ${speed} squares</div>
            ${abilities ? `<div><strong>Abilities:</strong> ${abilities}</div>` : ''}
            ${species.system.skillBonuses?.length ?
              `<div><strong>Skills:</strong> ${species.system.skillBonuses.join(', ')}</div>` : ''}
            ${species.system.bonusFeat ? '<div><i class="fas fa-star"></i> Bonus Feat</div>' : ''}
            ${species.system.bonusSkill ? '<div><i class="fas fa-star"></i> Bonus Trained Skill</div>' : ''}
          </div>
          <button type="button" class="select-species-btn" data-species-id="${species.id}" data-species-name="${species.name}">
            <i class="fas fa-check"></i> Select
          </button>
        </div>
      `;
    }

    dialogContent += `
        </div>
      </div>
      <style>
        .species-picker-dialog { max-height: 600px; overflow-y: auto; }
        .species-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
        .species-card { border: 1px solid #666; padding: 1rem; border-radius: 4px; background: rgba(0,0,0,0.2); }
        .species-card h4 { margin: 0 0 0.5rem 0; color: #f0f0f0; }
        .species-source { font-size: 0.85em; color: #999; margin-bottom: 0.5rem; }
        .species-details { font-size: 0.9em; margin: 0.5rem 0; }
        .species-details div { margin: 0.25rem 0; }
        .select-species-btn { width: 100%; margin-top: 0.5rem; }
      </style>
    `;

    // Show dialog
    const dialog = new Dialog({
      title: 'Select Species',
      content: dialogContent,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel'
        }
      },
      default: 'cancel',
      render: (html) => {
        html.find('.select-species-btn').click(async (e) => {
          const speciesId = e.currentTarget.dataset.speciesId;
          const speciesName = e.currentTarget.dataset.speciesName;

          // Get the species document
          const speciesDoc = await selectSpecies(speciesId, speciesName);
          if (!speciesDoc) {
            ui.notifications.error('Failed to load species data');
            return;
          }

          // Apply the species to the character
          await this._applySpecies(speciesDoc);

          // Close dialog after successful selection
          dialog.close();
          ui.notifications.info(`Species changed to ${speciesDoc.name}`);
        });
      }
    }, {
      width: 800,
      height: 700,
      classes: ['swse', 'species-picker']
    }).render(true);
  }

  /**
   * Apply species to character, removing old species bonuses if applicable
   */
  async _applySpecies(speciesDoc) {
    const oldRace = this.actor.system.race;
    const newRace = speciesDoc.name;

    SWSELogger.log(`SWSE | Applying species: ${newRace}${oldRace ? ` (replacing ${oldRace})` : ''}`);

    // If changing species, remove old modifiers
    if (oldRace && oldRace !== newRace) {
      await this._removeOldSpeciesModifiers();
    }

    // Apply new species
    const updateData = {
      'system.race': newRace,
      'system.speciesSource': speciesDoc.system.source || '',
      'system.size': speciesDoc.system.size || 'Medium',
      'system.speed': speciesDoc.system.speed || 6
    };

    // Apply ability modifiers
    if (speciesDoc.system.abilityModifiers) {
      for (const [ability, value] of Object.entries(speciesDoc.system.abilityModifiers)) {
        if (value !== 0) {
          updateData[`system.abilities.${ability}.racial`] = value;
        }
      }
    }

    // Apply species traits
    if (speciesDoc.system.traits) {
      updateData['system.specialTraits'] = speciesDoc.system.traits;
    }

    if (speciesDoc.system.visionTraits) {
      updateData['system.visionTraits'] = speciesDoc.system.visionTraits;
    }

    if (speciesDoc.system.naturalWeapons) {
      updateData['system.naturalWeapons'] = speciesDoc.system.naturalWeapons;
    }

    // Update actor
    await this.actor.update(updateData);

    ui.notifications.info(`Species changed to ${newRace}`);

    // Handle human bonus feat and skill
    if (newRace === 'Human' && speciesDoc.system.bonusFeat && speciesDoc.system.bonusSkill) {
      await this._handleHumanBonus();
    }

    // Re-render the sheet
    this.render();
  }

  /**
   * Remove old species modifiers before applying new species
   */
  async _removeOldSpeciesModifiers() {
    const updateData = {};

    // Reset racial ability modifiers
    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    for (const ability of abilities) {
      updateData[`system.abilities.${ability}.racial`] = 0;
    }

    // Clear species-specific data
    updateData['system.specialTraits'] = [];
    updateData['system.visionTraits'] = [];
    updateData['system.naturalWeapons'] = [];

    await this.actor.update(updateData);
    SWSELogger.log('SWSE | Removed old species modifiers');
  }

  /**
   * Handle human bonus feat and trained skill selection
   */
  async _handleHumanBonus() {
    ui.notifications.info('As a Human, you gain a bonus feat and a bonus trained skill!');

    // Import feat and skill selection
    const { loadFeats } = await import('../apps/levelup/levelup-feats.js');

    // Load all feats
    const allFeats = await loadFeats(this.actor, null, {});

    // Show feat selection dialog
    const featDialog = await Dialog.confirm({
      title: 'Human Bonus Feat',
      content: `
        <p>Select a bonus feat as a human:</p>
        <select id="human-bonus-feat" style="width: 100%;">
          ${allFeats.map(f => `<option value="${f.name}">${f.name}</option>`).join('')}
        </select>
      `,
      yes: async (html) => {
        const featName = html.find('#human-bonus-feat').val();
        const feat = allFeats.find(f => f.name === featName);
        if (feat) {
          await this.actor.createEmbeddedDocuments('Item', [feat]);
          ui.notifications.info(`Added bonus feat: ${featName}`);
        }
      }
    });

    // Show skill selection dialog
    const skills = Object.keys(this.actor.system.skills || {});
    const skillDialog = await Dialog.confirm({
      title: 'Human Bonus Trained Skill',
      content: `
        <p>Select a bonus trained skill as a human:</p>
        <select id="human-bonus-skill" style="width: 100%;">
          ${skills.map(s => `<option value="${s}">${s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`).join('')}
        </select>
      `,
      yes: async (html) => {
        const skillKey = html.find('#human-bonus-skill').val();
        await this.actor.update({[`system.skills.${skillKey}.trained`]: true});
        ui.notifications.info(`Trained in ${skillKey.replace(/_/g, ' ')}`);
      }
    });
  }
}
