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
   * Validates ID-based templates (v2 format) against compendiums
   */
  static async loadTemplates() {
    if (this._templates) return this._templates;

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
      const speciesPack = game.packs.get('foundryvtt-swse.species');
      if (!speciesPack) {
        errors.push('Species compendium not found');
      } else {
        const doc = await speciesPack.getDocument(template.speciesId).catch(() => null);
        if (!doc) {
          errors.push(`Species ID not found: ${template.speciesId}`);
        }
      }
    }

    // Validate background ID
    if (template.backgroundId) {
      const bgPack = game.packs.get('foundryvtt-swse.backgrounds');
      if (!bgPack) {
        errors.push('Backgrounds compendium not found');
      } else {
        const doc = await bgPack.getDocument(template.backgroundId).catch(() => null);
        if (!doc) {
          errors.push(`Background ID not found: ${template.backgroundId}`);
        }
      }
    }

    // Validate class ID
    if (template.classId) {
      const classPack = game.packs.get('foundryvtt-swse.classes');
      if (!classPack) {
        errors.push('Classes compendium not found');
      } else {
        const doc = await classPack.getDocument(template.classId).catch(() => null);
        if (!doc) {
          errors.push(`Class ID not found: ${template.classId}`);
        }
      }
    }

    // Validate feat IDs
    if (template.featIds && Array.isArray(template.featIds)) {
      const featPack = game.packs.get(featPackName);
      if (!featPack) {
        errors.push('Feats compendium not found');
      } else {
        for (const featId of template.featIds) {
          const doc = await featPack.getDocument(featId).catch(() => null);
          if (!doc) {
            errors.push(`Feat ID not found: ${featId}`);
          }
        }
      }
    }

    // Validate talent IDs
    if (template.talentIds && Array.isArray(template.talentIds)) {
      const talentPack = game.packs.get(talentPackName || 'foundryvtt-swse.talents');
      if (!talentPack) {
        errors.push('Talents compendium not found');
      } else {
        for (const talentId of template.talentIds) {
          const doc = await talentPack.getDocument(talentId).catch(() => null);
          if (!doc) {
            errors.push(`Talent ID not found: ${talentId}`);
          }
        }
      }
    }

    // Validate talent tree IDs
    if (template.talentTreeIds && Array.isArray(template.talentTreeIds)) {
      const treePack = game.packs.get('foundryvtt-swse.talent_trees');
      if (!treePack) {
        errors.push('Talent trees compendium not found');
      } else {
        for (const treeId of template.talentTreeIds) {
          const doc = await treePack.getDocument(treeId).catch(() => null);
          if (!doc) {
            errors.push(`Talent tree ID not found: ${treeId}`);
          }
        }
      }
    }

    // Validate force power IDs
    if (template.forcePowerIds && Array.isArray(template.forcePowerIds)) {
      const powerPack = game.packs.get('foundryvtt-swse.forcepowers');
      if (!powerPack) {
        errors.push('Force powers compendium not found');
      } else {
        for (const powerId of template.forcePowerIds) {
          const doc = await powerPack.getDocument(powerId).catch(() => null);
          if (!doc) {
            errors.push(`Force power ID not found: ${powerId}`);
          }
        }
      }
    }

    // Validate item IDs
    if (template.itemIds && Array.isArray(template.itemIds)) {
      const equipPack = game.packs.get('foundryvtt-swse.equipment');
      const weaponPack = game.packs.get('foundryvtt-swse.weapons');
      const armorPack = game.packs.get('foundryvtt-swse.armor');

      for (const itemId of template.itemIds) {
        let found = false;

        if (equipPack) {
          const doc = await equipPack.getDocument(itemId).catch(() => null);
          if (doc) { found = true; }
        }

        if (!found && weaponPack) {
          const doc = await weaponPack.getDocument(itemId).catch(() => null);
          if (doc) { found = true; }
        }

        if (!found && armorPack) {
          const doc = await armorPack.getDocument(itemId).catch(() => null);
          if (doc) { found = true; }
        }

        if (!found) {
          errors.push(`Item ID not found in equipment/weapons/armor: ${itemId}`);
        }
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
  static async applyTemplateFeat(actor, featRef) {
    if (!featRef) return;

    const featName = typeof featRef === 'string' ? featRef : (featRef.displayName || featRef.name);
    const featPackName = typeof featRef === 'object' && featRef.pack ? featRef.pack : 'foundryvtt-swse.feats';
    const featId = typeof featRef === 'object' && featRef.id ? featRef.id : null;

    try {
      // Find feat in compendium
      const featPack = game.packs.get(featPackName);
      if (!featPack) {
        SWSELogger.warn('SWSE | Feats compendium not found');
        return;
      }

      if (featId) {
        const feat = await featPack.getDocument(featId);
        if (feat) {
          await actor.createEmbeddedDocuments('Item', [feat.toObject()]);
          SWSELogger.log(`SWSE | Added template feat: ${featName}`);

          // NOTE: Special feat handling is already done in the fallback path below (lines 579+)
          // Skip duplication of logic here
          return;
        }
      }

      const index = await featPack.getIndex();
      if (!index) {
        SWSELogger.error('SWSE | Failed to get feats compendium index');
        ui.notifications.error('Failed to load feats data. Please refresh and try again.');
        return;
      }

      let featEntry = index.find(f => f.name === featName);

      // Fallback: handle variants like "Skill Focus (Use the Force)"
      if (!featEntry && featName.includes('(')) {
        const baseName = featName.split('(')[0].trim();
        featEntry = index.find(f => f.name === baseName);
      }

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
  static async applyTemplateTalent(actor, talentRef) {
    const talentName = typeof talentRef === 'string' ? talentRef : (talentRef?.name ?? null);
    const talentId = (typeof talentRef === 'object' && talentRef) ? (talentRef.id ?? talentRef._id ?? null) : null;
    const talentPackName = (typeof talentRef === 'object' && talentRef) ? (talentRef.pack ?? null) : null;

    if (!talentName && !talentId) {
      SWSELogger.log('SWSE | No talent specified in template, skipping');
      return;
    }

    try {
      SWSELogger.log(`SWSE | Attempting to apply template talent: ${talentName}`);

      // Find talent in compendium
      const talentPack = game.packs.get(talentPackName || 'foundryvtt-swse.talents');
      if (!talentPack) {
        SWSELogger.warn('SWSE | Talents compendium not found');
        ui.notifications.warn('Talents compendium not found! Cannot add template talent.');
        return;
      }

      if (talentId) {
        const talent = await talentPack.getDocument(talentId);
        if (talent) {
          await actor.createEmbeddedDocuments('Item', [talent.toObject()]);
          SWSELogger.log(`SWSE | Added template talent: ${talentName}`);
          return;
        }
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

    // Store complete template info in actor flags for later reference
    await actor.setFlag('swse', 'appliedTemplate', {
      id: templateData.id || templateData._templateId,
      name: templateData.name || templateData._templateName,
      class: templateData.class || templateData.className,
      archetype: templateData.archetype || templateData._templateArchetype,
      description: templateData.description || templateData._templateDescription || '',
      notes: templateData.notes || templateData._templateNotes || '',
      equipment: templateData.equipment || templateData._templateEquipment || [],
      quote: templateData.quote || templateData._templateQuote || ''
    });

    ui.notifications.info(`Character created from template: ${templateData.name}`);
  }
}

export default CharacterTemplates;
