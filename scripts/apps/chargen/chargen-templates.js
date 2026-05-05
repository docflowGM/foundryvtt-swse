import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { ProgressionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/progression-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
// ============================================
// Character Generation Templates Module
// Loads and applies pre-configured character templates
// ============================================

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { BackgroundRegistry } from "/systems/foundryvtt-swse/scripts/registries/background-registry.js";
import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";
import { TalentTreeDB } from "/systems/foundryvtt-swse/scripts/data/talent-tree-db.js";
import { compendiumLoader } from "/systems/foundryvtt-swse/scripts/utils/compendium-loader.js";

export class CharacterTemplates {
  static _templates = null;

  /**
   * Load character templates from JSON file
   * Validates ID-based templates (v2 format) against compendiums
   */
  static async loadTemplates() {
    if (this._templates) {return this._templates;}

    const response = await fetch('systems/foundryvtt-swse/data/character-templates.json');
    if (!response.ok) {
      throw new Error(`Failed to load character templates: HTTP ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    // If using ID-based format (v2), validate IDs
    if (data.version === 2) {
      SWSELogger.log(`SWSE | Templates using ID-based format (v${data.version})`);
      const validationResults = await this._validateTemplateIds(data.templates);

      if (validationResults.failedCount > 0) {
        const msg = `${validationResults.failedCount} templates have invalid IDs`;
        SWSELogger.warn(`[SSOT] ${msg}`);
        console.warn(`[SSOT] ${msg}:`, validationResults.failed);

        if (validationResults.successCount === 0) {
          throw new Error(`Template validation failed: no valid templates`);
        }
      }

      this._templates = validationResults.valid;
      SWSELogger.log(
        `SWSE | Loaded ${this._templates.length}/${data.templates.length} ` +
        `character templates (ID-based format)`
      );
    } else {
      // Old format (v1 or no version) - name-based, no validation
      this._templates = data.templates;
      SWSELogger.log(`SWSE | Loaded ${this._templates.length} character templates (name-based format)`);
    }

    return this._templates;
  }

  /**
   * Validate that all IDs in templates exist in compendiums
   * @param {Array<Object>} templates - Templates to validate
   * @returns {Promise<Object>} Validation results
   * @private
   */
  static async _validateTemplateIds(templates) {
    const results = {
      valid: [],
      failed: [],
      failedCount: 0,
      successCount: 0
    };

    for (const template of templates) {
      const templateErrors = await this._validateSingleTemplate(template);

      if (templateErrors.length === 0) {
        results.valid.push(template);
        results.successCount++;
      } else {
        results.failed.push({
          templateId: template.id,
          issues: templateErrors
        });
        results.failedCount++;

        SWSELogger.warn(`[SSOT] Template "${template.id}" has validation issues:`);
        templateErrors.forEach(issue => SWSELogger.warn(`  ${issue}`));
      }
    }

    return results;
  }

  /**
   * Validate a single template's compendium IDs
   * @param {Object} template - Template to validate
   * @returns {Promise<Array<string>>} Array of error messages
   * @private
   */
  static async _validateSingleTemplate(template) {
    const errors = [];

    // Validate species ID
    if (template.speciesId) {
      const doc = await SpeciesRegistry.getDocumentById?.(template.speciesId).catch(() => null);
      if (!doc) {
        errors.push(`Species ID not found: ${template.speciesId}`);
      }
    }

    // Validate background ID
    if (template.backgroundId) {
      const rec = await BackgroundRegistry.getBySlug(template.backgroundId);
      if (!rec) {errors.push(`Background ID not found: ${template.backgroundId}`);}
    }

    // Validate class ID
    if (template.classId) {
      const doc = await ClassesRegistry.getDocumentBySourceId(template.classId).catch(() => null);
      if (!doc) {
        errors.push(`Class ID not found: ${template.classId}`);
      }
    }

    // Validate feat IDs
    if (template.featIds && Array.isArray(template.featIds)) {
      for (const featId of template.featIds) {
        const doc = await FeatRegistry.getDocumentById?.(featId).catch(() => null);
        if (!doc) {
          errors.push(`Feat ID not found: ${featId}`);
        }
      }
    }

    // Validate talent IDs
    if (template.talentIds && Array.isArray(template.talentIds)) {
      for (const talentId of template.talentIds) {
        const doc = await TalentRegistry.getDocumentById?.(talentId).catch(() => null);
        if (!doc) {
          errors.push(`Talent ID not found: ${talentId}`);
        }
      }
    }

    // Validate talent tree IDs
    if (template.talentTreeIds && Array.isArray(template.talentTreeIds)) {
      await TalentTreeDB.build?.();
      for (const treeId of template.talentTreeIds) {
        const tree = TalentTreeDB.byId?.(treeId) || TalentTreeDB.bySourceId?.(treeId) || null;
        if (!tree) {
          errors.push(`Talent tree ID not found: ${treeId}`);
        }
      }
    }

    // Validate force power IDs
    if (template.forcePowerIds && Array.isArray(template.forcePowerIds)) {
      for (const powerId of template.forcePowerIds) {
        const doc = await ForceRegistry.getDocumentByRef?.(powerId, 'power').catch(() => null);
        if (!doc) {
          errors.push(`Force power ID not found: ${powerId}`);
        }
      }
    }

    // Validate item IDs
    if (template.itemIds && Array.isArray(template.itemIds)) {
      const packNames = ['foundryvtt-swse.equipment', 'foundryvtt-swse.weapons', 'foundryvtt-swse.armor'];
      for (const itemId of template.itemIds) {
        let found = false;
        for (const packName of packNames) {
          const item = await compendiumLoader.find(packName, (entry) => (entry?.id || entry?._id) === itemId, { loadFull: true }).catch(() => null);
          if (item) { found = true; break; }
        }
        if (!found) errors.push(`Item ID not found in equipment/weapons/armor: ${itemId}`);
      }
    }

    return errors;
  }

  /**
   * Get all templates
   */
  static async getTemplates() {
    return await this.loadTemplates();
  }

  /**
   * Get templates by class
   */
  static async getTemplatesByClass(className) {
    const templates = await this.loadTemplates();
    return templates.filter(t => t.class === className);
  }

  /**
   * Get a specific template by ID
   */
  static async getTemplate(templateId) {
    const templates = await this.loadTemplates();
    return templates.find(t => t.id === templateId);
  }

  /**
   * Apply a template to characterData object
   * @param {Object} characterData - The character data object to modify
   * @param {string} templateId - The template ID to apply
   * @returns {Object} Modified characterData
   */
  static async applyTemplate(characterData, templateId) {
    const template = await this.getTemplate(templateId);

    if (!template) {
      SWSELogger.error(`SWSE | Template not found: ${templateId}`);
      ui.notifications.error(`Template not found: ${templateId}`);
      return characterData;
    }

    SWSELogger.log(`SWSE | Applying template: ${template.name} (${template.class})`);

    // Apply ability scores
    if (template.abilityScores) {
      for (const [ability, value] of Object.entries(template.abilityScores)) {
        characterData.abilities[ability].base = value;
      }
    }

    // Set species
    if (template.species) {
      characterData.species = template.species;
      // Species racial bonuses will be applied in the species selection step
    }

    // Set class
    if (template.className) {
      // Clear existing classes and add the template class
      characterData.classes = [{
        name: template.className,
        level: template.level || 1
      }];
    }

    // Set trained skills
    if (template.trainedSkills && Array.isArray(template.trainedSkills)) {
      template.trainedSkills.forEach(skillKey => {
        if (!characterData.skills[skillKey]) {
          characterData.skills[skillKey] = {
            trained: false,
            focused: false,
            miscMod: 0
          };
        }
        characterData.skills[skillKey].trained = true;
      });
    }

    // Store template feat and talent for later application
    characterData._templateFeat = template.feat;
    characterData._templateTalent = template.talent;
    characterData._templateTalentTree = template.talentTree;
    characterData._templateForcePowers = template.forcePowers || [];
    characterData._templateEquipment = template.startingEquipment || [];

    // Set credits
    if (template.credits) {
      characterData.credits = template.credits;
    }

    // Store template metadata
    characterData._appliedTemplate = {
      id: template.id,
      name: template.name,
      class: template.class,
      archetype: template.archetype,
      description: template.description,
      notes: template.notes
    };

    SWSELogger.log('SWSE | Template applied successfully');

    return characterData;
  }

  /**
   * Render template selection UI
   * @param {Function} onSelect - Callback when template is selected
   * @returns {string} HTML for template selection
   */
  static async renderTemplateSelection(onSelect) {
    const templates = await this.loadTemplates();

    // Group templates by class
    const templatesByClass = {};
    templates.forEach(template => {
      if (!templatesByClass[template.class]) {
        templatesByClass[template.class] = [];
      }
      templatesByClass[template.class].push(template);
    });

    let html = `
      <div class="template-selection">
        <h2>Choose a Character Template</h2>
        <p class="hint-text">Select a pre-configured character build or start from scratch</p>

        <div class="template-tabs">
    `;

    // Add tabs for each class
    const classes = Object.keys(templatesByClass);
    classes.forEach((className, index) => {
      const active = index === 0 ? 'active' : '';
      html += `
        <button class="template-tab ${active}" data-tab="${className.toLowerCase()}">
          ${className}
        </button>
      `;
    });

    html += `
        </div>

        <div class="template-content">
    `;

    // Add template cards for each class
    classes.forEach((className, classIndex) => {
      const display = classIndex === 0 ? 'block' : 'none';
      html += `
        <div class="template-tab-content" data-tab="${className.toLowerCase()}" style="display: ${display};">
          <div class="template-grid">
      `;

      templatesByClass[className].forEach(template => {
        html += `
          <div class="template-card" data-template-id="${template.id}">
            <div class="template-header">
              <h3>${template.name}</h3>
              <span class="template-archetype">${template.archetype}</span>
            </div>
            <div class="template-description">
              ${template.description}
            </div>
            <div class="template-stats">
              <div class="stat-row">
                <strong>Species:</strong> ${template.species}
              </div>
              <div class="stat-row">
                <strong>Abilities:</strong>
                STR ${template.abilityScores.str},
                DEX ${template.abilityScores.dex},
                CON ${template.abilityScores.con},
                INT ${template.abilityScores.int},
                WIS ${template.abilityScores.wis},
                CHA ${template.abilityScores.cha}
              </div>
              <div class="stat-row">
                <strong>Feat:</strong> ${template.feat}
              </div>
              <div class="stat-row">
                <strong>Talent:</strong> ${template.talent} (${template.talentTree})
              </div>
              <div class="stat-row">
                <strong>Skills:</strong> ${template.trainedSkills.length} trained
              </div>
              ${template.forcePowers && template.forcePowers.length > 0 ? `
              <div class="stat-row">
                <strong>Force Powers:</strong> ${template.forcePowers.length}
              </div>
              ` : ''}
            </div>
            <div class="template-notes">
              <small>${template.notes}</small>
            </div>
            <button class="template-select-btn" data-template-id="${template.id}">
              <i class="fa-solid fa-check"></i> Select Template
            </button>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="template-actions">
          <button class="custom-build-btn">
            <i class="fa-solid fa-user-edit"></i> Custom Build (No Template)
          </button>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Show template selection dialog
   * @param {Function} onSelect - Callback when template is selected (receives templateId or null for custom)
   */
  static async showTemplateDialog(onSelect, hostApp = null) {
    const content = await this.renderTemplateSelection();
    if (hostApp && typeof hostApp._openInWindowModal === 'function') {
      hostApp._openInWindowModal({
        title: 'Character Template Selection',
        html: content,
        onMount: (bodyEl) => {
          CharacterTemplates._bindTemplateSelectionInline(bodyEl, onSelect, () => hostApp._closeInWindowModal());
        }
      });
      return;
    }
    const dialog = new TemplateSelectionDialog(content, onSelect);
    dialog.render(true);
  }

  /**
   * Apply template feat to actor
   * @param {Actor} actor - The actor to modify
   * @param {string} featName - The feat name to add
   */
  static async applyTemplateFeat(actor, featRef) {
    if (!featRef) {return;}

    const featName = typeof featRef === 'string' ? featRef : (featRef.displayName || featRef.name);
    const featId = typeof featRef === 'object' && featRef.id ? featRef.id : null;

    try {
      let feat = featId ? await FeatRegistry.getDocumentById?.(featId) : null;
      if (!feat && featName) {
        feat = await FeatRegistry.getDocumentByName?.(featName);
      }

      if (!feat) {
        SWSELogger.warn(`SWSE | Feat not found: ${featName}`);
        ui.notifications.warn(`Feat not found: ${featName}. Please add manually.`);
        return;
      }

      const featData = feat.toObject();
      delete featData.effects;
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', [featData]);
      SWSELogger.log(`SWSE | Added template feat: ${featName}`);

      if (featName.startsWith('Skill Focus')) {
        const match = featName.match(/Skill Focus \(([^)]+)\)/);
        if (match) {
          const skillDisplayName = match[1].trim();
          const skillKey = this._getSkillKeyFromDisplayName(skillDisplayName);
          if (skillKey) {
            await globalThis.SWSE.ActorEngine.updateActor(actor, {
              [`system.skills.${skillKey}.focused`]: true
            });
            SWSELogger.log(`SWSE | Auto-checked skill focus for: ${skillDisplayName}`);
          }
        }
      }

      if (featName === 'Force Sensitivity') {
        await globalThis.SWSE.ActorEngine.updateActor(actor, {
          'system.forceSensitive': true
        });
        SWSELogger.log('SWSE | Auto-checked Force Sensitive');
      }
    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply template feat:', error);
    }
  }

  /**
   * Convert display skill name to system skill key
   * @param {string} displayName - Display name like "Use the Force", "Perception", etc.
   * @returns {string|null} - Skill key like "use_the_force", "perception", etc.
   */
  static _getSkillKeyFromDisplayName(displayName) {
    const skillMap = {
      'Acrobatics': 'acrobatics',
      'Climb': 'climb',
      'Deception': 'deception',
      'Endurance': 'endurance',
      'Gather Information': 'gatherInformation',
      'Initiative': 'initiative',
      'Jump': 'jump',
      'Knowledge (Bureaucracy)': 'knowledgeBureaucracy',
      'Knowledge (Galactic Lore)': 'knowledgeGalacticLore',
      'Knowledge (Life Sciences)': 'knowledgeLifeSciences',
      'Knowledge (Physical Sciences)': 'knowledgePhysicalSciences',
      'Knowledge (Social Sciences)': 'knowledgeSocialSciences',
      'Knowledge (Tactics)': 'knowledgeTactics',
      'Knowledge (Technology)': 'knowledgeTechnology',
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

    return skillMap[displayName] || null;
  }

  /**
   * Apply template talent to actor
   * @param {Actor} actor - The actor to modify
   * @param {Object|string} talentRef - The talent reference object or name
   */
  static async applyTemplateTalent(actor, talentRef) {
    if (!talentRef) {
      SWSELogger.log('SWSE | No talent specified in template, skipping');
      return;
    }

    const talentName = typeof talentRef === 'string' ? talentRef : (talentRef.displayName || talentRef.name);
    const talentId = typeof talentRef === 'object' && talentRef.id ? talentRef.id : null;

    try {
      SWSELogger.log(`SWSE | Attempting to apply template talent: ${talentName}`);
      let talent = talentId ? await TalentRegistry.getDocumentById?.(talentId) : null;
      if (!talent && talentName) {
        talent = await TalentRegistry.getDocumentByName?.(talentName);
      }

      if (!talent) {
        SWSELogger.warn(`SWSE | Talent not found in registry: ${talentName}`);
        ui.notifications.warn(`Talent "${talentName}" not found in registry. Please add manually.`);
        return;
      }

      const talentData = talent.toObject();
      delete talentData.effects;
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', [talentData]);
      SWSELogger.log(`SWSE | Successfully added template talent: ${talentName}`);
      ui.notifications.info(`Added talent: ${talentName}`);
    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply template talent:', error);
      ui.notifications.error(`Failed to add talent "${talentName}": ${error.message}`);
    }
  }

  /**
   * Apply template Force powers to actor
   * @param {Actor} actor - The actor to modify
   * @param {Array<string>} powerNames - Array of Force power names
   */
  static async applyTemplateForcePowers(actor, powerNames) {
    if (!powerNames || powerNames.length === 0) {return;}

    try {
      const powersToAdd = [];

      for (const powerName of powerNames) {
        const powerDoc = await ForceRegistry.getDocumentByRef?.(powerName, 'power');
        if (powerDoc) {
          const powerData = powerDoc.toObject();
          delete powerData.effects;
          powersToAdd.push(powerData);
        } else {
          SWSELogger.warn(`SWSE | Force power not found: ${powerName}`);
        }
      }

      if (powersToAdd.length > 0) {
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', powersToAdd);
        SWSELogger.log(`SWSE | Added ${powersToAdd.length} template Force powers`);
      }
    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply template Force powers:', error);
    }
  }

  /**
   * Finalize template application (called after character creation)
   * @param {Actor} actor - The created actor
   * @param {Object} templateData - Template metadata from characterData._appliedTemplate
   */
  static async finalizeTemplate(actor, templateData) {
    if (!templateData) {return;}

    SWSELogger.log(`SWSE | Finalizing template application: ${templateData.name}`);

    // Apply feat
    if (templateData._templateFeat) {
      await this.applyTemplateFeat(actor, templateData._templateFeat);
    }

    // Apply talent
    if (templateData._templateTalent) {
      await this.applyTemplateTalent(actor, templateData._templateTalent);
    }

    // Apply Force powers
    if (templateData._templateForcePowers && templateData._templateForcePowers.length > 0) {
      await this.applyTemplateForcePowers(actor, templateData._templateForcePowers);
    }

    // Store complete template info in actor flags for later reference
    // Route through ActorEngine for mutation authority
    await ActorEngine.updateActor(actor, {
      'flags.foundryvtt-swse.appliedTemplate': {
        id: templateData.id || templateData._templateId,
        name: templateData.name || templateData._templateName,
        class: templateData.class || templateData.className,
        archetype: templateData.archetype || templateData._templateArchetype,
        description: templateData.description || templateData._templateDescription || '',
        notes: templateData.notes || templateData._templateNotes || '',
        equipment: templateData.equipment || templateData._templateEquipment || [],
        quote: templateData.quote || templateData._templateQuote || ''
      }
    }, { source: 'chargen-template-application', skipValidation: true });

    ui.notifications.info(`Character created from template: ${templateData.name}`);
  }
}

/**
 * Template Selection Dialog (AppV2-based)
 * Displays template options with tabbed interface and selection buttons
 */
class TemplateSelectionDialog extends BaseSWSEAppV2 {
  static DEFAULT_OPTIONS = {
    classes: ['swse', 'swse-inwindow-modal'],
    id: 'swse-template-selection-dialog',
    tag: 'div',
    window: { frame: false,  icon: 'fa-solid fa-clipboard-list', title: 'Character Template Selection' , resizable: false, draggable: false },
    position: { width: 900, height: 700 }
  };

  static PARTS = {
    content: { template: 'systems/foundryvtt-swse/templates/apps/chargen-template-selection.hbs' }
  };

  constructor(content, onSelect) {
    super();
    this.templateContent = content;
    this.onSelect = onSelect;
  }

  _prepareContext(options) {
    return { templateContent: this.templateContent };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = this.element;    const root = html;
    if (!root) return;

    // Tab switching
    root.querySelectorAll('.template-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        const tab = tabBtn.dataset.tab;
        root.querySelectorAll('.template-tab').forEach(el => el.classList.remove('active'));
        tabBtn.classList.add('active');
        root.querySelectorAll('.template-tab-content').forEach(el => el.style.display = 'none');
        root.querySelectorAll(`.template-tab-content[data-tab="${tab}"]`).forEach(el => {
          el.style.display = '';
        });
      });
    });

    // Template selection
    root.querySelectorAll('.template-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const templateId = btn.dataset.templateId;
        if (this.onSelect) this.onSelect(templateId);
        this.close();
      });
    });

    // Custom build
    root.querySelectorAll('.custom-build-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.onSelect) this.onSelect(null);
        this.close();
      });
    });

    // Hover effects
    root.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('mouseenter', () => card.classList.add('hover'));
      card.addEventListener('mouseleave', () => card.classList.remove('hover'));
    });
  }
}

export default CharacterTemplates;
