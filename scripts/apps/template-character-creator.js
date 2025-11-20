// ============================================
// Template Character Creator
// Standalone application for creating characters from templates
// ============================================

import { SWSELogger } from '../utils/logger.js';
import CharacterTemplates from './chargen/chargen-templates.js';

/**
 * Creates a character directly from a template
 */
export class TemplateCharacterCreator {

  /**
   * Show template selection and create character
   */
  static async create() {
    // Show template selection dialog
    CharacterTemplates.showTemplateDialog(async (templateId) => {
      if (!templateId) {
        // User chose custom build - open regular chargen
        ui.notifications.info('Opening custom character generator...');
        const CharacterGenerator = (await import('./chargen.js')).default;
        const chargen = new CharacterGenerator();
        chargen.render(true);
        return;
      }

      // Create character from template
      await this.createFromTemplate(templateId);
    });
  }

  /**
   * Create a character from a template
   * @param {string} templateId - The template ID
   */
  static async createFromTemplate(templateId) {
    const template = await CharacterTemplates.getTemplate(templateId);

    if (!template) {
      ui.notifications.error('Template not found');
      return;
    }

    try {
      // Ask for character name
      const name = await this._promptCharacterName(template.name);
      if (!name) return; // User cancelled

      SWSELogger.log(`SWSE | Creating character from template: ${template.name}`);

      // Create actor with base data
      const actorData = {
        name: name,
        type: 'character',
        system: {
          level: {
            heroic: template.level || 1
          },
          race: template.species,
          credits: template.credits || 1000
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
        abilityUpdates[`system.attributes.${ability}.base`] = value;
      }

      // Apply species bonuses (this would need species data)
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
        equipment: template.startingEquipment
      });

      // Open the character sheet
      actor.sheet.render(true);

      // Show success message with equipment list
      const equipmentList = template.startingEquipment.join(', ');
      await Dialog.prompt({
        title: `${name} Created!`,
        content: `
          <div style="padding: 1rem;">
            <h2 style="color: #4a90e2; margin-top: 0;">Character Successfully Created</h2>
            <p><strong>Template:</strong> ${template.name} (${template.class})</p>
            <p><strong>Archetype:</strong> ${template.archetype}</p>
            <p style="margin-top: 1rem;"><em>${template.description}</em></p>

            <h3 style="color: #4a90e2; margin-top: 1.5rem;">Starting Equipment</h3>
            <p>${equipmentList}</p>

            <div style="background: rgba(74, 144, 226, 0.1); padding: 0.75rem; border-radius: 4px; margin-top: 1rem; border-left: 3px solid #4a90e2;">
              <strong>Note:</strong> ${template.notes}
            </div>

            <p style="margin-top: 1rem; color: #aaa; font-size: 0.9rem;">
              <em>Equipment items have not been automatically added. Please add them manually from the inventory tab.</em>
            </p>
          </div>
        `,
        label: 'Close',
        callback: () => {}
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
            <input type="text" id="character-name" name="character-name" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;" placeholder="Enter character name..." />
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
  static async _applySpeciesBonus(actor, speciesName, abilityUpdates) {
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
  static async _applyClass(actor, template) {
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
   * Apply trained skills
   */
  static async _applySkills(actor, trainedSkills) {
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
