import { ProgressionEngine } from "../../progression/engine/progression-engine.js";
// ============================================
// Character Generation Templates Module
// Loads and applies pre-configured character templates
// ============================================

import { SWSELogger } from '../../utils/logger.js';

export class CharacterTemplates {
  static _templates = null;

  /**
   * Load character templates from JSON file
   */
  static async loadTemplates() {
    if (this._templates) return this._templates;

    try {
      const response = await fetch('systems/foundryvtt-swse/data/character-templates.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      this._templates = data.templates;
      SWSELogger.log(`SWSE | Loaded ${this._templates.length} character templates`);
      return this._templates;
    } catch (error) {
      SWSELogger.error('SWSE | Failed to load character templates:', error);

      // Provide minimal default templates as fallback
      const defaultTemplates = [
        {
          id: "default-soldier",
          name: "Basic Soldier",
          class: "Soldier",
          level: 1,
          description: "Default soldier template (template file failed to load)",
          species: "Human",
          abilities: { str: 14, dex: 13, con: 12, int: 10, wis: 10, cha: 8 },
          feats: ["Weapon Proficiency (Pistols)", "Weapon Proficiency (Rifles)"],
          talents: [],
          skills: ["Initiative", "Perception"]
        },
        {
          id: "default-scout",
          name: "Basic Scout",
          class: "Scout",
          level: 1,
          description: "Default scout template (template file failed to load)",
          species: "Human",
          abilities: { str: 10, dex: 14, con: 12, int: 13, wis: 12, cha: 8 },
          feats: ["Weapon Proficiency (Pistols)", "Weapon Proficiency (Rifles)"],
          talents: [],
          skills: ["Initiative", "Perception", "Stealth"]
        },
        {
          id: "default-scoundrel",
          name: "Basic Scoundrel",
          class: "Scoundrel",
          level: 1,
          description: "Default scoundrel template (template file failed to load)",
          species: "Human",
          abilities: { str: 10, dex: 14, con: 10, int: 12, wis: 10, cha: 13 },
          feats: ["Weapon Proficiency (Pistols)", "Weapon Proficiency (Simple Weapons)"],
          talents: [],
          skills: ["Deception", "Perception", "Stealth"]
        }
      ];

      this._templates = defaultTemplates;

      ui.notifications.warn(
        'Character templates could not be loaded. Using default templates only.',
        { permanent: false }
      );

      return defaultTemplates;
    }
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
              <i class="fas fa-check"></i> Select Template
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
            <i class="fas fa-user-edit"></i> Custom Build (No Template)
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
  static async showTemplateDialog(onSelect) {
    const content = await this.renderTemplateSelection();

    const dialog = new Dialog({
      title: 'Character Template Selection',
      content: content,
      buttons: {},
      render: (html) => {
        // Tab switching
        html.find('.template-tab').click(function() {
          const tab = $(this).data('tab');
          html.find('.template-tab').removeClass('active');
          $(this).addClass('active');
          html.find('.template-tab-content').hide();
          html.find(`.template-tab-content[data-tab="${tab}"]`).show();
        });

        // Template selection
        html.find('.template-select-btn').click(function() {
          const templateId = $(this).data('template-id');
          dialog.close();
          onSelect(templateId);
        });

        // Custom build
        html.find('.custom-build-btn').click(function() {
          dialog.close();
          onSelect(null); // null means custom build
        });

        // Card hover effect
        html.find('.template-card').hover(
          function() { $(this).addClass('hover'); },
          function() { $(this).removeClass('hover'); }
        );
      }
    }, {
      width: 900,
      height: 700,
      classes: ['swse', 'template-selection-dialog']
    });

    dialog.render(true);
  }

  /**
   * Apply template feat to actor
   * @param {Actor} actor - The actor to modify
   * @param {string} featName - The feat name to add
   */
  static async applyTemplateFeat(actor, featName) {
    if (!featName) return;

    try {
      // Find feat in compendium
      const featPack = game.packs.get('foundryvtt-swse.feats');
      if (!featPack) {
        SWSELogger.warn('SWSE | Feats compendium not found');
        return;
      }

      const index = await featPack.getIndex();
      if (!index) {
        SWSELogger.error('SWSE | Failed to get feats compendium index');
        ui.notifications.error('Failed to load feats data. Please refresh and try again.');
        return;
      }

      const featEntry = index.find(f => f.name === featName);

      if (!featEntry) {
        SWSELogger.warn(`SWSE | Feat not found: ${featName}`);
        ui.notifications.warn(`Feat not found: ${featName}. Please add manually.`);
        return;
      }

      const feat = await featPack.getDocument(featEntry._id);
      await actor.createEmbeddedDocuments('Item', [feat.toObject()]);
      SWSELogger.log(`SWSE | Added template feat: ${featName}`);

      // Handle Skill Focus feat - auto-check the skill's focused checkbox
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

      // Handle Force Sensitivity feat - auto-check Force Sensitive
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
   * @param {string} talentName - The talent name to add
   */
  static async applyTemplateTalent(actor, talentName) {
    if (!talentName) {
      SWSELogger.log('SWSE | No talent specified in template, skipping');
      return;
    }

    try {
      SWSELogger.log(`SWSE | Attempting to apply template talent: ${talentName}`);

      // Find talent in compendium
      const talentPack = game.packs.get('foundryvtt-swse.talents');
      if (!talentPack) {
        SWSELogger.warn('SWSE | Talents compendium not found');
        ui.notifications.warn('Talents compendium not found! Cannot add template talent.');
        return;
      }

      const index = await talentPack.getIndex();
      if (!index) {
        SWSELogger.error('SWSE | Failed to get talents compendium index');
        ui.notifications.error('Failed to load talents data. Please refresh and try again.');
        return;
      }

      // Try exact match first
      let talentEntry = index.find(t => t.name === talentName);

      // Try case-insensitive match if exact match fails
      if (!talentEntry) {
        talentEntry = index.find(t => t.name.toLowerCase() === talentName.toLowerCase());
      }

      if (!talentEntry) {
        SWSELogger.warn(`SWSE | Talent not found in compendium: ${talentName}`);
        SWSELogger.log(`SWSE | Available talents: ${index.map(t => t.name).slice(0, 10).join(', ')}...`);
        ui.notifications.warn(`Talent "${talentName}" not found in compendium. Please add manually.`);
        return;
      }

      const talent = await talentPack.getDocument(talentEntry._id);
      if (!talent) {
        SWSELogger.error(`SWSE | Failed to load talent document: ${talentName}`);
        ui.notifications.error(`Failed to load talent "${talentName}". Please add manually.`);
        return;
      }

      await actor.createEmbeddedDocuments('Item', [talent.toObject()]);
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
    if (!powerNames || powerNames.length === 0) return;

    try {
      const powerPack = game.packs.get('foundryvtt-swse.forcepowers');
      if (!powerPack) {
        SWSELogger.warn('SWSE | Force powers compendium not found');
        return;
      }

      const index = await powerPack.getIndex();
      if (!index) {
        SWSELogger.error('SWSE | Failed to get force powers compendium index');
        ui.notifications.error('Failed to load force powers data. Please refresh and try again.');
        return;
      }

      const powersToAdd = [];

      for (const powerName of powerNames) {
        const powerEntry = index.find(p => p.name === powerName);
        if (powerEntry) {
          const power = await powerPack.getDocument(powerEntry._id);
          powersToAdd.push(power.toObject());
        } else {
          SWSELogger.warn(`SWSE | Force power not found: ${powerName}`);
        }
      }

      if (powersToAdd.length > 0) {
        await actor.createEmbeddedDocuments('Item', powersToAdd);
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
    if (!templateData) return;

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

    // Store template info in actor flags
    await actor.setFlag('swse', 'appliedTemplate', {
      id: templateData.id,
      name: templateData.name,
      class: templateData.class,
      archetype: templateData.archetype
    });

    ui.notifications.info(`Character created from template: ${templateData.name}`);
  }
}

export default CharacterTemplates;
