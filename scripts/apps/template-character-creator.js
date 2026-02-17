import SWSEFormApplicationV2 from './base/swse-form-application-v2.js';
import { ProgressionEngine } from '../progression/engine/progression-engine.js';
import { createActor } from '../core/document-api-v13.js';
// ============================================
// Template Character Creator
// Class-first selection with playing card UI
// ============================================

import { SWSELogger } from '../utils/logger.js';
import { resolveSkillKey, resolveSkillName } from '../utils/skill-resolver.js';
import CharacterTemplates from './chargen/chargen-templates.js';


const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/template-creator.hbs';
/**
 * Creates a character from a template with class-first selection
 */
export class TemplateCharacterCreator extends SWSEFormApplicationV2 {

  constructor(options = {}) {
    super(options);
    this.selectedClass = null;
    this.mentorDialogues = null;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {}, {
    classes: ['swse', 'template-creator', 'swse-app'],
    width: 1000,
    height: 700,
    title: 'Character Template Creator',
    resizable: true
  });

  static PARTS = {
    content: {
      template: TEMPLATE_PATH
    }
  };

  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }
async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Load mentor dialogues
    if (!this.mentorDialogues) {
      await this.loadMentorDialogues();
    }

    context.selectedClass = this.selectedClass;

    // Get templates for selected class
    if (this.selectedClass) {
      const allTemplates = await CharacterTemplates.getTemplates();
      context.templates = allTemplates.filter(t => t.class === this.selectedClass);
    }

    // Get available classes
    context.classes = [
      { name: 'Jedi', icon: 'fa-jedi', description: 'Force-wielding guardians of peace and justice' },
      { name: 'Noble', icon: 'fa-crown', description: 'Leaders, diplomats, and aristocrats of influence' },
      { name: 'Scoundrel', icon: 'fa-mask', description: 'Rogues, smugglers, and fortune seekers' },
      { name: 'Scout', icon: 'fa-binoculars', description: 'Explorers, trackers, and wilderness experts' },
      { name: 'Soldier', icon: 'fa-shield-alt', description: 'Warriors, tacticians, and military specialists' }
    ];

    // Add Nonheroic class only if user is GM or house rule allows it
    const isGM = game.user.isGM;
    const allowPlayersNonheroic = game.settings.get('foundryvtt-swse', 'allowPlayersNonheroic');
    if (isGM || allowPlayersNonheroic) {
      context.classes.push({
        name: 'Nonheroic',
        icon: 'fa-users',
        description: 'Common citizens, workers, guards, and NPCs'
      });
    }

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;

    // Class selection
    root.querySelectorAll('.class-choice-btn').forEach(el => {
      el.addEventListener('click', this._onSelectClass.bind(this));
    });

    // Template card selection
    root.querySelectorAll('.template-card').forEach(el => {
      el.addEventListener('click', this._onSelectTemplate.bind(this));
    });

    // Back button
    root.querySelectorAll('.back-to-classes').forEach(el => {
      el.addEventListener('click', this._onBackToClasses.bind(this));
    });

    // Custom build button
    root.querySelectorAll('.custom-build-btn').forEach(el => {
      el.addEventListener('click', this._onCustomBuild.bind(this));
    });
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

    // Show mentor dialogue and wait for user confirmation
    const confirmed = await this.showMentorDialogue(template,
      async () => {
        // This callback will be called if user clicks Create Character
        // (handled by Promise resolution)
      },
      () => {
        // This callback will be called if user clicks Go Back
        // (handled by Promise resolution)
      }
    );

    if (confirmed) {
      // User confirmed - create character from template
      await this.createFromTemplate(templateId);
    } else {
      // User cancelled - reopen the template creator
      this.render(true);
    }
  }

  /**
   * Show mentor dialogue with comprehensive template summary
   * Returns a Promise that resolves when user confirms or rejects
   */
  async showMentorDialogue(template, onConfirm, onCancel) {
    const mentorKey = template.mentor;
    const templateKey = template.id;

    const mentor = this.mentorDialogues?.mentors?.[mentorKey];
    const dialogue = mentor?.dialogues?.[templateKey];

    if (!mentor || !dialogue) {
      // No mentor dialogue, just show summary
      SWSELogger.warn(`SWSE | No mentor dialogue found for ${mentorKey}/${templateKey}`);
      return this._showTemplateSummaryDialog(template, onConfirm, onCancel);
    }

    // Build comprehensive summary content with mentor dialogue
    const summaryContent = await this._buildTemplateSummary(template);

    const content = `
      <div class="mentor-dialogue-container" style="display: flex; flex-direction: column; height: 100%; max-height: 600px;">
        <div class="mentor-header" style="flex-shrink: 0; padding-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="mentor-avatar" style="background-image: url('${mentor.avatar}'); width: 60px; height: 60px; border-radius: 50%; background-size: cover;"></div>
            <div class="mentor-info">
              <h2 style="margin: 0; font-size: 1.2rem;">${mentor.name}</h2>
              <p class="mentor-title" style="margin: 0; font-size: 0.9rem;">${mentor.title}</p>
            </div>
          </div>
        </div>

        <div class="mentor-speech" style="flex-shrink: 0; padding: 0.5rem 0;">
          <div class="speech-bubble greeting" style="padding: 0.5rem; background: rgba(74, 144, 226, 0.1); border-radius: 4px; margin-bottom: 0.5rem;">
            <p style="margin: 0; font-size: 0.95rem;">${dialogue.greeting}</p>
          </div>
          <div class="speech-bubble confirmation" style="padding: 0.5rem; background: rgba(74, 144, 226, 0.1); border-radius: 4px;">
            <p style="margin: 0; font-size: 0.95rem;">${dialogue.confirmation}</p>
          </div>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 0.5rem 0; margin: 0.5rem 0;">
          ${summaryContent}
        </div>

        <div class="character-name-input" style="flex-shrink: 0; margin-top: 0.5rem; padding: 1rem; background: rgba(74, 144, 226, 0.1); border-radius: 4px;">
          <label for="template-char-name" style="display: block; margin-bottom: 0.5rem; font-weight: bold; font-size: 0.95rem;">
            What shall we call you?
          </label>
          <input type="text" id="template-char-name" name="template-char-name" placeholder="Enter your character's name..." style="width: 100%; padding: 0.5rem; border: 1px solid #0af; border-radius: 4px; box-sizing: border-box;" value="${template.name}" />
        </div>
      </div>
    `;

    // Wrap dialog in a Promise for proper async/await handling
    return new Promise((resolve) => {
      const dialog = new SWSEDialogV2({
        title: `${template.name} - ${mentor.name}`,
        content: content,
        buttons: {
          confirm: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Create Character',
            callback: (html) => {
              // Get character name from input field using native DOM API
              const nameInput = html.querySelector('#template-char-name');
              const charName = nameInput?.value?.trim();

              if (!charName) {
                ui.notifications.warn('Please enter a character name');
                // Don't resolve, keep dialog open
                return false;
              }

              // Store the name and call the original confirm callback
              template.characterName = charName;
              if (onConfirm) {
                onConfirm();
              }
              resolve(true);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Go Back',
            callback: () => {
              if (onCancel) {
                onCancel();
              }
              resolve(false);
            }
          }
        },
        default: 'confirm',
        close: () => {
          // If dialog closed without button click, treat as cancel
          if (onCancel) {
            onCancel();
          }
          resolve(false);
        }
      }, {
        width: 700,
        height: 700,
        classes: ['swse', 'mentor-dialogue'],
        resizable: true
      });
      dialog.render(true);
    });
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
      const response = await fetch('systems/foundryvtt-swse/data/mentor-template-dialogues.json');
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
          level: Number.isFinite(parseInt(template.level, 10)) ? parseInt(template.level, 10) : 1,
          race: template.species,
          credits: Number.isFinite(parseInt(template.credits, 10)) ? parseInt(template.credits, 10) : 1000,
          speed: Number.isFinite(parseInt(template.speed, 10)) ? parseInt(template.speed, 10) : 6
        }
      };

      // Create the actor
      const actor = await createActor(actorData);

      if (!actor) {
        ui.notifications.error('Failed to create character');
        return;
      }

      // Apply ability scores
      const abilityUpdates = {};
      for (const [ability, value] of Object.entries(template.abilityScores)) {
        abilityUpdates[`system.attributes.${ability}.base`] = parseInt(value, 10) || 10;
      }

      // Apply species bonuses
      await this._applySpeciesBonus(actor, template.speciesRef || template.species, abilityUpdates);

      // Update actor with abilities
      await globalThis.SWSE.ActorEngine.updateActor(actor, abilityUpdates);

      // Apply class
      await this._applyClass(actor, template);

      // Apply trained skills
      await this._applySkills(actor, template.trainedSkills);

      // Apply feat
      await CharacterTemplates.applyTemplateFeat(actor, template.featRef || template.feat);

      // Apply talent
      await CharacterTemplates.applyTemplateTalent(actor, template.talentRef || template.talent);

      // Apply Force powers (if any)
      if (template.forcePowers && template.forcePowers.length > 0) {
        await CharacterTemplates.applyTemplateForcePowers(actor, template.forcePowerRefs || template.forcePowers);
      }

      // Apply starting equipment
      const equipmentResults = await this._applyEquipment(actor, template.equipmentRefs || template.startingEquipment);

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
    const intMod = Math.floor((actor.system.attributes.int.total - 10) / 2);
    const classSkillPoints = this._getClassSkillPoints(template.class);
    const totalSkillPoints = Math.max(1, intMod + classSkillPoints);

    // Count already trained skills
    const trainedCount = template.trainedSkills?.length || 0;
    const remainingPoints = totalSkillPoints - trainedCount;

    if (remainingPoints <= 0) {
      // No additional skills to train, just show success
      const equipmentResults = await actor.getFlag('swse', 'equipmentResults');
      await this._showSuccessDialog(actor, template, equipmentResults);
      actor.sheet.render(true);
      this.close();  // Close the template builder
      return;
    }

    // Build skill selection dialog
    const content = await this._buildSkillSelectionContent(actor, classSkills, remainingPoints);

    const dialog = new SWSEDialogV2({
      title: `Train Skills - ${actor.name}`,
      content: content,
      buttons: {
        confirm: {
          icon: '<i class="fa-solid fa-check"></i>',
          label: 'Finish',
          callback: async (html) => {
            // Get selected skills using native DOM API
            const selectedSkills = [];
            html.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
              selectedSkills.push(checkbox.value);
            });

            // Apply selected skills
            if (selectedSkills.length > 0) {
              await this._applySkills(actor, selectedSkills);
            }

            // Close the dialog
            dialog.close();

            // Show success dialog
            const equipmentResults = await actor.getFlag('swse', 'equipmentResults');
            await this._showSuccessDialog(actor, template, equipmentResults);

            // Open character sheet
            actor.sheet.render(true);

            // Close the template builder
            this.close();
          }
        }
      },
      default: 'confirm',
      render: (html) => {
        // Add checkbox change handler to enforce point limit using native DOM API
        const checkboxes = html.querySelectorAll('input[type="checkbox"]');
        const pointsRemaining = html.querySelector('#points-remaining');

        checkboxes.forEach(checkbox => {
          checkbox.addEventListener('change', () => {
            const checked = html.querySelectorAll('input[type="checkbox"]:checked').length;
            pointsRemaining.textContent = remainingPoints - checked;

            // Disable unchecked boxes if at limit
            if (checked >= remainingPoints) {
              html.querySelectorAll('input[type="checkbox"]:not(:checked)').forEach(cb => {
                cb.disabled = true;
              });
            } else {
              html.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.disabled = false;
              });
            }
          });
        });
      }
    }, {
      width: 600,
      height: 500,
      classes: ['swse', 'skill-training-dialog']
    });
    dialog.render(true);
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
      knowledge_bureaucracy: 'Knowledge (Bureaucracy)',
      knowledge_galactic_lore: 'Knowledge (Galactic Lore)',
      knowledge_life_sciences: 'Knowledge (Life Sciences)',
      knowledge_physical_sciences: 'Knowledge (Physical Sciences)',
      knowledge_social_sciences: 'Knowledge (Social Sciences)',
      knowledge_tactics: 'Knowledge (Tactics)',
      knowledge_technology: 'Knowledge (Technology)',
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
        <p class="hint">Select up to ${remainingPoints} additional skills to train. Class skills are marked with star.</p>
        <div class="skills-list" style="max-height: 300px; overflow-y: auto; padding: 0.5rem;">
    `;

    for (const [key, label] of Object.entries(allSkills)) {
      const isClassSkill = classSkills.includes(key);
      const isTrained = actor.system.skills[key]?.trained || false;

      if (isTrained) {continue;} // Skip already trained skills

      const starMark = isClassSkill ? 'star-icon' : '';
      html += `
        <div class="skill-item" style="padding: 0.5rem; border-bottom: 1px solid #ddd;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" value="${key}" style="margin-right: 0.5rem;" />
            <span style="flex: 1;">${label} ${isClassSkill ? 'starred' : ''}</span>
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
  async _showSuccessDialog(actor, template, equipmentResults) {
    // Build trained skills section
    let skillsHtml = '';
    if (template.trainedSkills && template.trainedSkills.length > 0) {
      const skillNames = (await Promise.all(
        template.trainedSkills.map(ref => resolveSkillName(ref))
      )).map((name, i) => name ?? template.trainedSkills[i]);

      skillsHtml = `
        <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(156, 39, 176, 0.1); border-left: 3px solid #9C27B0; border-radius: 4px;">
          <strong style="color: #9C27B0;">Book Trained Skills:</strong>
          <ul style="margin: 0.5rem 0 0 1.5rem; font-size: 0.9rem;">
            ${skillNames.map(skill => `<li>${skill}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Build equipment section
    let equipmentHtml = '';

    if (equipmentResults) {
      if (equipmentResults.added.length > 0) {
        equipmentHtml += `
          <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4CAF50; border-radius: 4px;">
            <strong style="color: #4CAF50;">Checkmark Equipment Added:</strong>
            <ul style="margin: 0.5rem 0 0 1.5rem; font-size: 0.9rem;">
              ${equipmentResults.added.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      if (equipmentResults.notFound.length > 0) {
        equipmentHtml += `
          <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(255, 152, 0, 0.1); border-left: 3px solid #FF9800; border-radius: 4px;">
            <strong style="color: #FF9800;">Warning Equipment Not Found:</strong>
            <ul style="margin: 0.5rem 0 0 1.5rem; font-size: 0.9rem;">
              ${equipmentResults.notFound.map(item => `<li>${item}</li>`).join('')}
            </ul>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; font-style: italic;">
              These items could not be found in the compendia. Please add them manually.
            </p>
          </div>
        `;
      }
    } else {
      equipmentHtml = `
        <div style="margin-top: 1rem;">
          <h3 style="color: #4a90e2;">Starting Equipment</h3>
          <p style="font-size: 0.9rem;">${template.startingEquipment.join(', ')}</p>
        </div>
      `;
    }

    await SWSEDialogV2.prompt({
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

            ${skillsHtml}
            ${equipmentHtml}

            <div style="background: rgba(74, 144, 226, 0.1); padding: 0.75rem; border-radius: 4px; margin-top: 1rem; border-left: 3px solid #4a90e2;">
              <strong>Build Notes:</strong> ${template.notes}
            </div>
          </div>
        `,
        label: 'Close',
        callback: () => {}
      }, {
        width: 600
      });
  }

  /**
   * Prompt for character name
   */
  static async _promptCharacterName(templateName) {
    return new Promise((resolve) => {
      const dialog = new SWSEDialogV2({
        title: 'Character Name',
        content: `
          <div style="padding: 1rem;">
            <p>Enter a name for your <strong>${templateName}</strong> character:</p>
            <input type="text" id="character-name" name="character-name" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; font-size: 1rem;" placeholder="Enter character name..." />
          </div>
        `,
        buttons: {
          create: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Create',
            callback: (html) => {
              const nameInput = html.querySelector('#character-name');
              const name = nameInput.value.trim();
              if (!name) {
                ui.notifications.warn('Please enter a character name');
                resolve(null);
              } else {
                dialog.close();
                resolve(name);
              }
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => {
              dialog.close();
              resolve(null);
            }
          }
        },
        default: 'create',
        render: (html) => {
          const nameInput = html.querySelector('#character-name');
          nameInput.focus();
          nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              html.querySelector('button.create')?.click();
            }
          });
        }
      });
      dialog.render(true);
    });
  }

  /**
   * Apply species bonuses
   */
  async _applySpeciesBonus(actor, speciesRefOrName, abilityUpdates) {
    try {
      const speciesName = typeof speciesRefOrName === 'string' ? speciesRefOrName : (speciesRefOrName.displayName || speciesRefOrName.name);
      const speciesPackName = typeof speciesRefOrName === 'object' && speciesRefOrName.pack ? speciesRefOrName.pack : 'foundryvtt-swse.species';
      const speciesId = typeof speciesRefOrName === 'object' && speciesRefOrName.id ? speciesRefOrName.id : null;
      const speciesPack = game.packs.get(speciesPackName);
      if (!speciesPack) {return;}

      if (speciesId) {
        const species = await speciesPack.getDocument(speciesId);
        if (species) {
          return this._applySpeciesDataToAbilities(species.system, abilityUpdates);
        }
      }

      const index = await speciesPack.getIndex();
      const speciesEntry = index.find(s => s.name === speciesName);

      if (!speciesEntry) {
        SWSELogger.warn(`SWSE | Species not found: ${speciesName}`);
        return;
      }

      const species = await speciesPack.getDocument(speciesEntry._id);
      if (!species) {
        SWSELogger.warn(`SWSE | Failed to load species document for: ${speciesName}`);
        return;
      }

      const speciesData = species.system;
      return this._applySpeciesDataToAbilities(speciesData, abilityUpdates);

    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply species bonus:', error);
    }
  }

  _applySpeciesDataToAbilities(speciesData, abilityUpdates) {
    // Updates abilityUpdates in-place; no side effects.
    if (speciesData?.abilityModifiers) {
      for (const [ability, value] of Object.entries(speciesData.abilityModifiers)) {
        if (value !== 0) {
          abilityUpdates[`system.attributes.${ability}.racial`] = value;
        }
      }
    }

    if (speciesData?.size) {
      abilityUpdates['system.size'] = speciesData.size;
    }

    if (speciesData?.speed) {
      abilityUpdates['system.speed'] = parseInt(speciesData.speed, 10) || 6;
    }
  }

  /**
   * Apply class to actor
   */
  async _applyClass(actor, template) {
    try {
      const classPack = game.packs.get('foundryvtt-swse.classes');
      if (!classPack) {return;}

      const classRef = template.classRef || null;
      const className = classRef ? (classRef.displayName || classRef.name) : template.className;
      const classPackName = classRef?.pack || 'foundryvtt-swse.classes';
      const classId = classRef?.id || null;

      if (classId) {
        const pack = game.packs.get(classPackName);
        if (pack) {
          const classItem = await pack.getDocument(classId);
          if (classItem) {
            const classData = classItem.toObject();
            classData.system.level = template.level || 1;
            await actor.createEmbeddedDocuments('Item', [classData]);
            SWSELogger.log(`SWSE | Added class: ${className}`);
            return;
          }
        }
      }

      const index = await classPack.getIndex();
      const classEntry = index.find(c => c.name === className);

      if (!classEntry) {
        SWSELogger.warn(`SWSE | Class not found: ${template.className}`);
        return;
      }

      const classItem = await classPack.getDocument(classEntry._id);
      const classData = classItem.toObject();
      classData.system.level = template.level || 1;

      await actor.createEmbeddedDocuments('Item', [classData]);
      SWSELogger.log(`SWSE | Added class: ${template.className}`);

      // Auto-check Force Sensitive if this is a Force-using class
      const forceUsingClasses = ['Jedi', 'Sith', 'Force Adept', 'Force Disciple'];
      if (forceUsingClasses.includes(template.className)) {
        globalThis.SWSE.ActorEngine.updateActor(actor, {
          'system.forceSensitive': true
        });


        SWSELogger.log(`SWSE | Auto-checked Force Sensitive for ${template.className}`);
      }

    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply class:', error);
    }
  }

  /**
   * Get class skills for a given class
   */
  async _getClassSkills(className) {
    // All Knowledge skills for reference
    const allKnowledgeSkills = [
      'knowledge_bureaucracy',
      'knowledge_galactic_lore',
      'knowledge_life_sciences',
      'knowledge_physical_sciences',
      'knowledge_social_sciences',
      'knowledge_tactics',
      'knowledge_technology'
    ];

    const classSkillMap = {
      'Jedi': ['acrobatics', 'endurance', 'initiative', 'jump', ...allKnowledgeSkills, 'mechanics', 'perception', 'pilot', 'useTheForce'],
      'Noble': ['deception', 'gatherInformation', 'initiative', ...allKnowledgeSkills, 'perception', 'persuasion', 'pilot', 'ride', 'treatInjury', 'useComputer'],
      'Scoundrel': ['acrobatics', 'deception', 'gatherInformation', 'initiative', ...allKnowledgeSkills, 'mechanics', 'perception', 'persuasion', 'pilot', 'stealth', 'useComputer'],
      'Scout': ['climb', 'endurance', 'initiative', 'jump', ...allKnowledgeSkills, 'mechanics', 'perception', 'pilot', 'ride', 'stealth', 'survival', 'swim'],
      'Soldier': ['climb', 'endurance', 'initiative', 'jump', 'knowledge_tactics', 'mechanics', 'perception', 'pilot', 'swim', 'treatInjury', 'useComputer']
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
    if (!trainedSkills || trainedSkills.length === 0) {return;}

    try {
      const updates = {};
      for (const ref of trainedSkills) {
        const skillKey = await resolveSkillKey(ref);
        if (!skillKey) {continue;}
        updates[`system.skills.${skillKey}.trained`] = true;
      }

      await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
      SWSELogger.log(`SWSE | Trained ${Object.keys(updates).length} skills`);

    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply skills:', error);
    }
  }

  /**
   * Apply starting equipment to the actor
   * Searches compendia for equipment items and adds them
   * @returns {Object} Results object with added and notFound arrays
   */
  async _applyEquipment(actor, equipmentList) {
    if (!equipmentList || equipmentList.length === 0) {
      return { added: [], notFound: [] };
    }

    const results = {
      added: [],
      notFound: []
    };

    // Define compendia to search
    const compendiaPacks = [
      'foundryvtt-swse.equipment',
      'foundryvtt-swse.weapons',
      'foundryvtt-swse.armor',
      'foundryvtt-swse.armor_light',
      'foundryvtt-swse.armor_medium',
      'foundryvtt-swse.armor_heavy'
    ];

    try {
      for (const equipmentEntry of equipmentList) {
        const isRef = typeof equipmentEntry === 'object' && equipmentEntry !== null;
        const equipmentName = isRef ? (equipmentEntry.displayName || equipmentEntry.name) : equipmentEntry;
        const equipmentPackName = isRef ? equipmentEntry.pack : null;
        const equipmentId = isRef ? equipmentEntry.id : null;
        const equipmentQty = isRef ? (equipmentEntry.quantity || 1) : 1;
        let found = false;
        const searchName = equipmentName.trim();

        if (equipmentId && equipmentPackName) {
          const pack = game.packs.get(equipmentPackName);
          if (pack) {
            const item = await pack.getDocument(equipmentId);
            if (item) {
              const itemData = item.toObject();
              if (itemData.system && typeof itemData.system.quantity === 'number') {
                itemData.system.quantity = equipmentQty;
                await actor.createEmbeddedDocuments('Item', [itemData]);
              } else {
                for (let i = 0; i < equipmentQty; i++) {
                  await actor.createEmbeddedDocuments('Item', [itemData]);
                }
              }
              results.added.push(itemData.name);
              found = true;
              SWSELogger.log(`SWSE | Added equipment: ${itemData.name} x${equipmentQty}`);
            }
          }
        }

        // Search through all compendia
        for (const packName of compendiaPacks) {
          const pack = game.packs.get(packName);
          if (!pack) {continue;}

          // Get pack index for faster searching
          const index = await pack.getIndex();

          // Try exact match first
          let entry = index.find(i => i.name === searchName);

          // If no exact match, try case-insensitive
          if (!entry) {
            entry = index.find(i => i.name.toLowerCase() === searchName.toLowerCase());
          }

          // If still no match, try partial match
          if (!entry) {
            entry = index.find(i => i.name.toLowerCase().includes(searchName.toLowerCase()));
          }

          if (entry) {
            // Found the item, add it to the actor
            const item = await pack.getDocument(entry._id);
            const itemData = item.toObject();

            await actor.createEmbeddedDocuments('Item', [itemData]);
            results.added.push(entry.name);
            found = true;
            SWSELogger.log(`SWSE | Added equipment: ${entry.name}`);
            break; // Stop searching once found
          }
        }

        if (!found) {
          results.notFound.push(searchName);
          SWSELogger.warn(`SWSE | Equipment not found: ${searchName}`);
        }
      }

      // Store results in actor flag for later retrieval
      await actor.setFlag('swse', 'equipmentResults', results);

      // Log summary
      SWSELogger.log(`SWSE | Equipment application complete: ${results.added.length} added, ${results.notFound.length} not found`);

    } catch (error) {
      SWSELogger.error('SWSE | Failed to apply equipment:', error);
    }

    return results;
  }

  /**
   * Build a comprehensive template summary matching chargen final summary style
   */
  async _buildTemplateSummary(template) {
    const abilities = template.abilityScores || {};
    const trainedSkills = template.trainedSkills || [];
    const equipment = template.startingEquipment || [];
    const notes = template.notes || '';

    let skillsHtml = '';
    if (trainedSkills && trainedSkills.length > 0) {
      // Resolve skill names from IDs
      const skillNames = await Promise.all(
        trainedSkills.map(ref => resolveSkillName(ref))
      );
      const displayNames = skillNames.map((name, i) => name ?? trainedSkills[i]);

      skillsHtml = `
        <div class="summary-section">
          <h4>Trained Skills</h4>
          <ul class="summary-list">
            ${displayNames.map(skill => `<li>${skill}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    let equipmentHtml = '';
    if (equipment && equipment.length > 0) {
      equipmentHtml = `
        <div class="summary-section">
          <h4>Starting Equipment</h4>
          <ul class="summary-list">
            ${equipment.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    let notesHtml = '';
    if (notes) {
      notesHtml = `
        <div class="summary-section">
          <h4>Character Notes</h4>
          <p>${notes}</p>
        </div>
      `;
    }

    return `
      <div class="template-summary-container">
        <div class="template-header">
          <h3>${template.name}</h3>
          <p class="template-archetype">${template.archetype || template.class}</p>
          <p class="template-quote"><em>"${template.quote || ''}"</em></p>
        </div>

        <div class="template-description">
          <p>${template.description || ''}</p>
        </div>

        ${skillsHtml}
        ${equipmentHtml}
        ${notesHtml}
      </div>
    `;
  }

  /**
   * Show template summary without mentor dialogue
   */
  async _showTemplateSummaryDialog(template, onConfirm, onCancel) {
    const summaryContent = await this._buildTemplateSummary(template);

    const content = `
      <div style="display: flex; flex-direction: column; height: 100%; max-height: 500px;">
        <div style="flex: 1; overflow-y: auto; padding: 0.5rem; margin-bottom: 0.5rem;">
          ${summaryContent}
        </div>
        <div class="character-name-input" style="flex-shrink: 0; padding: 1rem; background: rgba(74, 144, 226, 0.1); border-radius: 4px;">
          <label for="template-char-name" style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
            What shall we call you?
          </label>
          <input type="text" id="template-char-name" name="template-char-name" placeholder="Enter your character's name..." style="width: 100%; padding: 0.5rem; border: 1px solid #0af; border-radius: 4px; box-sizing: border-box;" value="${template.name}" />
        </div>
      </div>
    `;

    return new Promise((resolve) => {
      const dialog = new SWSEDialogV2({
        title: `Create ${template.name}`,
        content: content,
        buttons: {
          confirm: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Create Character',
            callback: (html) => {
              const nameInput = html.querySelector('#template-char-name');
              const charName = nameInput?.value?.trim();

              if (!charName) {
                ui.notifications.warn('Please enter a character name');
                return false;
              }

              template.characterName = charName;
              if (onConfirm) {
                onConfirm();
              }
              resolve(true);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Go Back',
            callback: () => {
              if (onCancel) {
                onCancel();
              }
              resolve(false);
            }
          }
        },
        default: 'confirm',
        close: () => {
          if (onCancel) {
            onCancel();
          }
          resolve(false);
        }
      }, {
        width: 700,
        height: 600,
        classes: ['swse', 'template-summary-dialog'],
        resizable: true
      });
      dialog.render(true);
    });
  }
}

export default TemplateCharacterCreator;