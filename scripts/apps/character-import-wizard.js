/**
 * Character Import Wizard
 * Allows players to import characters from .json or .txt files
 * AppV2-based implementation
 */

import { createActor, createEffectOnActor, createItemInActor } from '../core/document-api-v13.js';
import { confirm as uiConfirm } from '../utils/ui-utils.js';
import { ActorEngine } from '../governance/actor-engine/actor-engine.js';

export class CharacterImportWizard extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ['swse', 'swse-inwindow-modal'],
    id: 'character-import-wizard',
    tag: 'div',
    window: { icon: 'fa-solid fa-lightbulb', title: 'Mentor Suggestion', frame: false, resizable: false, draggable: false },
    position: { width: 600, height: 'auto' },
    form: { handler: CharacterImportWizard.onSave, closeOnSave: false }
  };

  static PARTS = {
    content: { template: 'systems/foundryvtt-swse/templates/apps/character-import-wizard.hbs' }
  };

  constructor(options = {}) {
    super(options);
  }

  _prepareContext() {
    return {};
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.activateListeners();
  }

  activateListeners() {
    const root = this.element;

    // Method toggle
    root?.querySelector('#import-method')?.addEventListener('change', (e) => {
      const method = e.target.value;
      const fileSection = root.querySelector('.file-upload-section');
      const pasteSection = root.querySelector('.paste-section');

      if (method === 'file') {
        if (fileSection) fileSection.style.display = '';
        if (pasteSection) pasteSection.style.display = 'none';
      } else {
        if (fileSection) fileSection.style.display = 'none';
        if (pasteSection) pasteSection.style.display = '';
      }
    });

    // File preview
    const fileInput = root?.querySelector('#character-file');
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          this._showPreview(data);
        } catch (err) {
          ui.notifications.error('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    });

    // Paste preview
    root?.querySelector('#character-json')?.addEventListener('blur', (e) => {
      try {
        const data = JSON.parse(e.target.value);
        this._showPreview(data);
      } catch (err) {
        // Ignore parse errors on blur
      }
    });

    // Import button
    root?.querySelector('[data-action="import"]')?.addEventListener('click', async () => {
      await this._processImport();
    });

    // Cancel button
    root?.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      this.close();
    });
  }

  /**
   * Show preview of character data
   */
  _showPreview(data) {
    const preview = this.element?.querySelector('#import-preview');
    if (!preview) return;

    const previewContent = preview.querySelector('.preview-content');
    if (!previewContent) return;

    let content = `
      <p><strong>Name:</strong> ${data.name || 'Unknown'}</p>
      <p><strong>Type:</strong> ${data.type || 'Unknown'}</p>
    `;

    if (data.system?.level) {
      content += `<p><strong>Level:</strong> ${data.system.level}</p>`;
    }
    if (data.system?.race) {
      content += `<p><strong>Species:</strong> ${data.system.race}</p>`;
    }
    if (data.items) {
      content += `<p><strong>Items:</strong> ${data.items.length}</p>`;
    }

    previewContent.innerHTML = content;
    preview.style.display = '';
  }

  /**
   * Process the import
   */
  async _processImport() {
    try {
      const root = this.element;
      const method = root?.querySelector('#import-method')?.value ?? null;
      const createNewCheckbox = root?.querySelector('#create-new-actor');
      const createNew = createNewCheckbox?.checked ?? true;

      let characterData;

      // Get data based on method
      if (method === 'file') {
        const fileInput = root?.querySelector('#character-file');
        const file = fileInput?.files?.[0];
        if (!file) {
          ui.notifications.warn('Please select a file to import.');
          return;
        }

        characterData = await this._readFile(file);
      } else {
        const jsonText = root?.querySelector('#character-json')?.value ?? null;
        if (!jsonText) {
          ui.notifications.warn('Please paste character JSON data.');
          return;
        }

        try {
          characterData = JSON.parse(jsonText);
        } catch (err) {
          ui.notifications.error('Invalid JSON data. Please check your input.');
          return;
        }
      }

      // Validate the data
      if (!this._validateCharacterData(characterData)) {
        return;
      }

      // Import the character
      await this._importCharacter(characterData, createNew);

    } catch (error) {
      console.error('Error importing character:', error);
      ui.notifications.error('Failed to import character. See console for details.');
    }
  }

  /**
   * Read file and return parsed JSON
   */
  async _readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          resolve(data);
        } catch (err) {
          reject(new Error('Invalid JSON file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Validate character data structure
   */
  _validateCharacterData(data) {
    if (!data || typeof data !== 'object') {
      ui.notifications.error('Invalid character data format.');
      return false;
    }

    if (!data.name) {
      ui.notifications.error('Character data is missing a name.');
      return false;
    }

    if (!data.type) {
      ui.notifications.error('Character data is missing a type.');
      return false;
    }

    // Check if type is valid for this system
    const validTypes = ['character', 'npc', 'vehicle', 'droid'];
    if (!validTypes.includes(data.type)) {
      ui.notifications.warn(`Character type "${data.type}" may not be compatible with this system.`);
    }

    return true;
  }

  /**
   * Clean item/effect data for import by removing IDs that would cause conflicts
   */
  _cleanEmbeddedData(documents) {
    if (!Array.isArray(documents)) {return [];}

    return documents.map(doc => {
      const cleaned = foundry.utils.deepClone(doc);
      // Remove _id so Foundry generates new ones
      delete cleaned._id;
      // Remove any ownership data
      delete cleaned.ownership;
      // Remove sort order
      delete cleaned.sort;
      return cleaned;
    });
  }

  /**
   * Import character into the game
   */
  async _importCharacter(data, createNew = true) {
    try {
      // Clean up the data for import - remove _id fields from items/effects
      const cleanedItems = this._cleanEmbeddedData(data.items);
      const cleanedEffects = this._cleanEmbeddedData(data.effects);

      const actorData = {
        name: data.name,
        type: data.type,
        img: data.img,
        system: data.system || {},
        items: cleanedItems,
        effects: cleanedEffects,
        flags: data.flags || {}
      };

      if (createNew) {
        // Create a new actor using v13-safe wrapper
        const actor = await createActor(actorData);

        if (actor) {
          ui.notifications.info(`Successfully imported ${actor.name}`);
          actor.sheet.render(true);
        }
      } else {
        // Update selected actor
        const controlled = canvas.tokens?.controlled?.[0]?.actor;
        const targetActor = controlled || game.user?.character;

        if (!targetActor) {
          ui.notifications.warn('No actor selected. Creating new actor instead.');
          return this._importCharacter(data, true);
        }

        // Confirm overwrite using AppV2 dialog
        const confirmed = await await uiConfirm(
          'Overwrite Actor',
          `<p>This will replace <strong>${targetActor.name}</strong> with the imported character data. Continue?</p>`
        );

        if (!confirmed) return;

        // Update the actor
        await targetActor.update({
          name: actorData.name,
          img: actorData.img,
          system: actorData.system,
          flags: actorData.flags
        });

        // Clear existing items and effects
        // PHASE 8: Use ActorEngine for atomic bulk deletion
        if (targetActor.items.length > 0) {
          await ActorEngine.deleteEmbeddedDocuments(targetActor, 'Item', targetActor.items.map(i => i.id));
        }
        if (targetActor.effects.length > 0) {
          await ActorEngine.deleteEmbeddedDocuments(targetActor, 'ActiveEffect', targetActor.effects.map(e => e.id));
        }

        // Add new items and effects (using already cleaned data)
        if (cleanedItems.length > 0) {
          const createdItems = await createItemInActor(targetActor, cleanedItems);
          if (!createdItems || createdItems.length === 0) {
            console.warn('No items were created');
          }
        }
        if (cleanedEffects.length > 0) {
          const createdEffects = await createEffectOnActor(targetActor, cleanedEffects);
          if (!createdEffects || createdEffects.length === 0) {
            console.warn('No effects were created');
          }
        }

        ui.notifications.info(`Successfully updated ${targetActor.name}`);
        targetActor.sheet.render(true);
      }

    } catch (error) {
      console.error('Error creating/updating actor:', error);
      ui.notifications.error('Failed to import character. See console for details.');
    }
  }

  /**
   * Static method to open the import wizard
   */
  static open() {
    new CharacterImportWizard().render(true);
  }
}

window.CharacterImportWizard = CharacterImportWizard;
