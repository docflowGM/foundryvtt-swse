// ============================================
// Template Character Creator
// Class-first selection with playing card UI
// ============================================

import { SWSELogger } from '../utils/logger.js';
import CharacterTemplates from './chargen/chargen-templates.js';

/**
 * Creates a character from a template with class-first selection
 */
export class TemplateCharacterCreator extends Application {

  constructor(options = {}) {
    super(options);
    this.selectedClass = null;
    this.mentorDialogues = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'template-creator'],
      template: 'systems/swse/templates/apps/template-creator.hbs',
      width: 1000,
      height: 700,
      title: 'Character Template Creator',
      resizable: true
    });
  }

  async getData() {
    const data = await super.getData();

    // Load mentor dialogues
    if (!this.mentorDialogues) {
      await this.loadMentorDialogues();
    }

    data.selectedClass = this.selectedClass;

    // Get templates for selected class
    if (this.selectedClass) {
      const allTemplates = await CharacterTemplates.getTemplates();
      data.templates = allTemplates.filter(t => t.class === this.selectedClass);
    }

    // Get available classes
    data.classes = [
      { name: 'Jedi', icon: 'fa-jedi', description: 'Force-wielding guardians of peace and justice' },
      { name: 'Noble', icon: 'fa-crown', description: 'Leaders, diplomats, and aristocrats of influence' },
      { name: 'Scoundrel', icon: 'fa-mask', description: 'Rogues, smugglers, and fortune seekers' },
      { name: 'Scout', icon: 'fa-binoculars', description: 'Explorers, trackers, and wilderness experts' },
      { name: 'Soldier', icon: 'fa-shield-alt', description: 'Warriors, tacticians, and military specialists' }
    ];

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Class selection
    html.find('.class-choice-btn').click(this._onSelectClass.bind(this));

    // Template card selection
    html.find('.template-card').click(this._onSelectTemplate.bind(this));

    // Back button
    html.find('.back-to-classes').click(this._onBackToClasses.bind(this));

    // Custom build button
    html.find('.custom-build-btn').click(this._onCustomBuild.bind(this));
  }

  /**
   * Handle class selection
   */
  async _onSelectClass(event) {
    event.preventDefault();
    const className = event.currentTarget.dataset.class;

    SWSELogger.log(`SWSE | Selected class: ${className}`);
    this.selectedClass = className;

    // Re-render to show templates
    this.render();
  }

  /**
   * Handle going back to class selection
   */
  async _onBackToClasses(event) {
    event.preventDefault();
    this.selectedClass = null;
    this.render();
  }

  /**
   * Handle template selection
   */
  async _onSelectTemplate(event) {
    event.preventDefault();
    const templateId = event.currentTarget.dataset.templateId;

    SWSELogger.log(`SWSE | Selected template: ${templateId}`);

    // Get the template
    const template = await CharacterTemplates.getTemplate(templateId);
    if (!template) {
      ui.notifications.error('Template not found');
      return;
    }

    // Close this window BEFORE showing mentor dialogue to prevent both appearing at once
    this.close();

    // Show mentor dialogue before creating character
    await this.showMentorDialogue(template, async () => {
      // Create character from template
      await this.createFromTemplate(templateId);
    }, () => {
      // If cancelled, reopen the template creator
      this.render(true);
    });
  }

  /**
   * Show mentor dialogue
   */
  async showMentorDialogue(template, onConfirm, onCancel) {
    const mentorKey = template.mentor;
    const templateKey = template.id;

    const mentor = this.mentorDialogues?.mentors?.[mentorKey];
    const dialogue = mentor?.dialogues?.[templateKey];

    if (!mentor || !dialogue) {
      // No mentor dialogue, just proceed
      SWSELogger.warn(`SWSE | No mentor dialogue found for ${mentorKey}/${templateKey}`);
      onConfirm();
      return;
    }

    // Build dialogue content
    const content = `
      <div class="mentor-dialogue-container">
        <div class="mentor-header">
          <div class="mentor-avatar" style="background-image: url('${mentor.avatar}')"></div>
          <div class="mentor-info">
            <h2>${mentor.name}</h2>
            <p class="mentor-title">${mentor.title}</p>
          </div>
        </div>

        <div class="mentor-speech">
          <div class="speech-bubble greeting">
            <p>${dialogue.greeting}</p>
          </div>
          <div class="speech-bubble confirmation">
            <p>${dialogue.confirmation}</p>
          </div>
        </div>

        <div class="template-summary">
          <h3>${template.name} - ${template.archetype}</h3>
          <p class="template-quote"><em>"${template.quote}"</em></p>
          <p>${template.description}</p>
        </div>

        <div class="character-name-input" style="margin-top: 1rem; padding: 1rem; background: rgba(74, 144, 226, 0.1); border-radius: 4px;">
          <label for="template-char-name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            What shall we call you?
          </label>
          <input type="text" id="template-char-name" name="template-char-name" placeholder="Enter your character's name..." style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" value="${template.name}" />
        </div>
      </div>
    `;

    // Show dialog
    new Dialog({
      title: `${template.name} - ${mentor.name}`,
      content: content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Create Character',
          callback: (html) => {
            // Get character name from input field
            const nameInput = html.find('#template-char-name');
            const charName = nameInput.val()?.trim();

            if (!charName) {
              ui.notifications.warn('Please enter a character name');
              return false;
            }

            // Store the name and call the original confirm callback
            template.characterName = charName;
            onConfirm();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Go Back',
          callback: onCancel || (() => {})
        }
      },
      default: 'confirm',
      close: onCancel || (() => {})
    }, {
      width: 600,
      height: 500,
      classes: ['swse', 'mentor-dialogue']
    }).render(true);
  }

  /**
   * Handle custom build
   */
  async _onCustomBuild(event) {
    event.preventDefault();

    this.close();

    // Open regular character generator
    const CharacterGenerator = (await import('./chargen/chargen-main.js')).default;
    const chargen = new CharacterGenerator();
    chargen.render(true);
  }

  /**
   * Load mentor dialogues
   */
  async loadMentorDialogues() {
    try {
      const response = await fetch('systems/swse/data/mentor-template-dialogues.json');
      if (!response.ok) {
        throw new Error(`Failed to load mentor dialogues: ${response.statusText}`);
      }
      this.mentorDialogues = await response.json();
      SWSELogger.log('SWSE | Loaded mentor dialogues');
    } catch (error) {
      SWSELogger.error('SWSE | Failed to load mentor dialogues:', error);
      this.mentorDialogues = { mentors: {} };
    }
  }

  /**
   * Static method to show the creator
   */
  static async create() {
    const creator = new TemplateCharacterCreator();
    creator.render(true);
  }

  /**
   * Create a character from a template
   */
  async createFromTemplate(templateId) {
    const template = await CharacterTemplates.getTemplate(templateId);

    if (!template) {
      ui.notifications.error('Template not found');
      return;
    }

    try {
      // Use name from dialogue (stored in template.characterName)
      const name = template.characterName || template.name;

      SWSELogger.log(`SWSE | Creating character from template: ${template.name}`);

      // Create actor with base data
      const actorData = {
        name: name,
        type: 'character',
        system: {
          level: {
            heroic: parseInt(template.level) || 1
          },
          race: template.species,
          credits: parseInt(template.credits) || 1000,
          speed: parseInt(template.speed) || 6  // Ensure speed is an integer
        }
      };

      // Create the actor
      const actor = await Actor.create(actorData);

      if (!actor) {
        ui.notifications.error('Failed to create character');
        return;
      }

      // Apply ability scores
      const abilityUpdates = {};
      for (const [ability, value] of Object.entries(template.abilityScores)) {
        abilityUpdates[`system.abilities.${ability}.base`] = parseInt(value) || 10;
      }

      // Apply species bonuses
      await this._applySpeciesBonus(actor, template.species, abilityUpdates);

      // Update actor with abilities
      await actor.update(abilityUpdates);

      // Apply class
      await this._applyClass(actor, template);

      // Apply trained skills
      await this._applySkills(actor, template.trainedSkills);

      // Apply feat
      await CharacterTemplates.applyTemplateFeat(actor, template.feat);

      // Apply talent
      await CharacterTemplates.applyTemplateTalent(actor, template.talent);

      // Apply Force powers (if any)
      if (template.forcePowers && template.forcePowers.length > 0) {
        await CharacterTemplates.applyTemplateForcePowers(actor, template.forcePowers);
      }

      // Store template info
      await actor.setFlag('swse', 'appliedTemplate', {
        id: template.id,
        name: template.name,
        class: template.class,
        archetype: template.archetype,
        description: template.description,
        notes: template.notes,
        equipment: template.startingEquipment,
        quote: template.quote
      });

      // Open skill training interface
      await this._openSkillTraining(actor, template);

    } catch (error) {
      SWSELogger.error('SWSE | Failed to create character from template:', error);
      ui.notifications.error(`Failed to create character: ${error.message}`);
    }
  }

  /**
   * Open skill training interface after template creation
   */
  async _openSkillTraining(actor, template) {
    // Get class skills for this template's class
    const classSkills = await this._getClassSkills(template.class);

    // Calculate available skill points (Int mod + class bonus)
    const intMod = Math.floor((actor.system.abilities.int.total - 10) / 2);
    const classSkillPoints = this._getClassSkillPoints(template.class);
    const totalSkillPoints = Math.max(1, intMod + classSkillPoints);

    // Count already trained skills
    const trainedCount = template.trainedSkills?.length || 0;
    const remainingPoints = totalSkillPoints - trainedCount;

    if (remainingPoints <= 0) {
      // No additional skills to train, just show success
      await this._showSuccessDialog(actor, template);
      actor.sheet.render(true);
      return;
    }

    // Build skill selection dialog
    const content = await this._buildSkillSelectionContent(actor, classSkills, remainingPoints);

    new Dialog({
      title: `Train Skills - ${actor.name}`,
      content: content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Finish',
          callback: async (html) => {
            // Get selected skills
            const selectedSkills = [];
            html.find('input[type="checkbox"]:checked').each(function() {
              selectedSkills.push($(this).val());
            });

            // Apply selected skills
            if (selectedSkills.length > 0) {
              await this._applySkills(actor, selectedSkills);
            }

            // Show success dialog
            await this._showSuccessDialog(actor, template);

            // Open character sheet
            actor.sheet.render(true);
          }
        }
      },
      default: 'confirm',
      render: (html) => {
        // Add checkbox change handler to enforce point limit
        const checkboxes = html.find('input[type="checkbox"]');
        const pointsRemaining = html.find('#points-remaining');

        checkboxes.on('change', function() {
          const checked = html.find('input[type="checkbox"]:checked').length;
          pointsRemaining.text(remainingPoints - checked);

          // Disable unchecked boxes if at limit
          if (checked >= remainingPoints) {
            html.find('input[type="checkbox"]:not(:checked)').prop('disabled', true);
          } else {
            html.find('input[type="checkbox"]').prop('disabled', false);
          }
        });
      }
    }, {
      width: 600,
      height: 500,
      classes: ['swse', 'skill-training-dialog']
    }).render(true);
  }

  /**
   * Build skill selection content
   */
  async _buildSkillSelectionContent(actor, classSkills, remainingPoints) {
    const allSkills = {
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

    let html = `
      <div class="skill-training-container">
        <p><strong>Available Skill Points:</strong> <span id="points-remaining">${remainingPoints}</span></p>
        <p class="hint">Select up to ${remainingPoints} additional skills to train. Class skills are marked with ⭐.</p>
        <div class="skills-list" style="max-height: 300px; overflow-y: auto; padding: 0.5rem;">
    `;

    for (const [key, label] of Object.entries(allSkills)) {
      const isClassSkill = classSkills.includes(key);
      const isTrained = actor.system.skills[key]?.trained || false;

      if (isTrained) continue; // Skip already trained skills

      html += `
        <div class="skill-item" style="padding: 0.5rem; border-bottom: 1px solid #ddd;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" value="${key}" style="margin-right: 0.5rem;" />
            <span style="flex: 1;">${label} ${isClassSkill ? '⭐' : ''}</span>
          </label>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Show success dialog with equipment list
   */
  async _showSuccessDialog(actor, template) {
    const equipmentList = template.startingEquipment.join(', ');
    await Dialog.prompt({
        title: `${actor.name} Created!`,
        content: `
          <div style="padding: 1rem;">
            <h2 style="color: #4a90e2; margin-top: 0;">Character Successfully Created</h2>
            <p><strong>Template:</strong> ${template.name} (${template.class})</p>
            <p><strong>Archetype:</strong> ${template.archetype}</p>
            <p class="template-quote" style="margin: 1rem 0; padding: 0.75rem; background: rgba(74, 144, 226, 0.1); border-left: 3px solid #4a90e2; font-style: italic;">
              "${template.quote}"
            </p>
            <p style="margin-top: 1rem;"><em>${template.description}</em></p>

            <h3 style="color: #4a90e2; margin-top: 1.5rem;">Starting Equipment</h3>
            <p style="font-size: 0.9rem;">${equipmentList}</p>

            <div style="background: rgba(74, 144, 226, 0.1); padding: 0.75rem; border-radius: 4px; margin-top: 1rem; border-left: 3px solid #4a90e2;">
              <strong>Build Notes:</strong> ${template.notes}
            </div>

            <p style="margin-top: 1rem; color: #aaa; font-size: 0.9rem;">
              <em>Equipment items have not been automatically added. Please add them manually from the inventory tab.</em>
            </p>
          </div>
        `,
        label: 'Close',
        callback: () => {}
      }, {
        width: 600
      });

      SWSELogger.log(`SWSE | Character created successfully: ${name}`);

    } catch (error) {
      SWSELogger.error('SWSE | Failed to create character from template:', error);
      ui.notifications.error('Failed to create character. See console for details.');
    }
  }

  /**
   * Prompt for character name
   */
  static async _promptCharacterName(templateName) {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Character Name',
        content: `
          <div style="padding: 1rem;">
            <p>Enter a name for your <strong>${templateName}</strong> character:</p>
            <input type="text" id="character-name" name="character-name" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; font-size: 1rem;" placeholder="Enter character name..." />
          </div>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Create',
            callback: (html) => {
              const name = html.find('#character-name').val().trim();
              if (!name) {
                ui.notifications.warn('Please enter a character name');
                resolve(null);
              } else {
                resolve(name);
              }
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'create',
        render: (html) => {
          html.find('#character-name').focus();
          html.find('#character-name').on('keypress', (e) => {
            if (e.key === 'Enter') {
              html.find('button.create').click();
            }
          });
        }
      }).render(true);
    });
  }

  /**
   * Apply species bonuses
   */
  async _applySpeciesBonus(actor, speciesName, abilityUpdates) {
    try {
      const speciesPack = game.packs.get('swse.species');
      if (!speciesPack) return;

      const index = await speciesPack.getIndex();
      const speciesEntry = index.find(s => s.name === speciesName);

      if (!speciesEntry) {
        SWSELogger.warn(`SWSE | Species not found: ${speciesName}`);
        return;
      }

      const species = await speciesPack.getDocument(speciesEntry._id);
      const speciesData = species.system;

      // Apply ability modifiers
      if (speciesData.abilityModifiers) {
        for (const [ability, value] of Object.entries(speciesData.abilityModifiers)) {
          if (value !== 0) {
            abilityUpdates[`system.attributes.${ability}.racial`] = value;
          }
        }
      }

      // Apply size and speed
      if (speciesData.size) {
        abilityUpdates['system.size'] = speciesData.size;
      }
      if (speciesData.speed) {
        abilityUpdates['system.speed.base'] = speciesData.speed;
      }

    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply species bonus:', error);
    }
  }

  /**
   * Apply class to actor
   */
  async _applyClass(actor, template) {
    try {
      const classPack = game.packs.get('swse.classes');
      if (!classPack) return;

      const index = await classPack.getIndex();
      const classEntry = index.find(c => c.name === template.className);

      if (!classEntry) {
        SWSELogger.warn(`SWSE | Class not found: ${template.className}`);
        return;
      }

      const classItem = await classPack.getDocument(classEntry._id);
      const classData = classItem.toObject();
      classData.system.level = template.level || 1;

      await actor.createEmbeddedDocuments('Item', [classData]);
      SWSELogger.log(`SWSE | Added class: ${template.className}`);

    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply class:', error);
    }
  }

  /**
   * Get class skills for a given class
   */
  async _getClassSkills(className) {
    const classSkillMap = {
      'Jedi': ['acrobatics', 'endurance', 'initiative', 'jump', 'knowledge', 'mechanics', 'perception', 'pilot', 'useTheForce'],
      'Noble': ['deception', 'gatherInformation', 'initiative', 'knowledge', 'perception', 'persuasion', 'pilot', 'ride', 'treatInjury', 'useComputer'],
      'Scoundrel': ['acrobatics', 'deception', 'gatherInformation', 'initiative', 'knowledge', 'mechanics', 'perception', 'persuasion', 'pilot', 'stealth', 'useComputer'],
      'Scout': ['climb', 'endurance', 'initiative', 'jump', 'knowledge', 'mechanics', 'perception', 'pilot', 'ride', 'stealth', 'survival', 'swim'],
      'Soldier': ['climb', 'endurance', 'initiative', 'jump', 'knowledge', 'mechanics', 'perception', 'pilot', 'swim', 'treatInjury', 'useComputer']
    };

    return classSkillMap[className] || [];
  }

  /**
   * Get base skill training points for a given class (before Int modifier)
   * These are the initial training points at character creation only
   */
  _getClassSkillPoints(className) {
    const classSkillPointsMap = {
      'Jedi': 2,
      'Noble': 6,
      'Scoundrel': 4,
      'Scout': 5,
      'Soldier': 3
    };

    return classSkillPointsMap[className] || 4;
  }

  /**
   * Apply trained skills
   */
  async _applySkills(actor, trainedSkills) {
    if (!trainedSkills || trainedSkills.length === 0) return;

    try {
      const updates = {};
      trainedSkills.forEach(skillKey => {
        updates[`system.skills.${skillKey}.trained`] = true;
      });

      await actor.update(updates);
      SWSELogger.log(`SWSE | Trained ${trainedSkills.length} skills`);

    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply skills:', error);
    }
  }
}

export default TemplateCharacterCreator;
