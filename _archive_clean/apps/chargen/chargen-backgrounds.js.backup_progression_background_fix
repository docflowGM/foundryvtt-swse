// ============================================
// Character Generation Backgrounds Module
// Handles Event, Occupation, and Planet of Origin backgrounds
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { getClassProperty } from './chargen-property-accessor.js';

/**
 * Background selection module for character generation
 * Implements the Background system from Rebellion Era Campaign Guide
 */
export const BackgroundsModule = {
  _backgrounds: null,

  /**
   * Load backgrounds from JSON file
   * @returns {Promise<Object>} Backgrounds data
   */
  async _loadBackgrounds() {
    if (this._backgrounds) return this._backgrounds;

    try {
      // Try to load from compendium first
      const pack = game?.packs?.get('foundryvtt-swse.backgrounds');
      if (pack) {
        const docs = await pack.getDocuments();

        if (docs.length > 0) {
          // Organize backgrounds by category
          const events = [];
          const occupations = [];
          const planets_core = [];
          const planets_homebrew = [];

          for (const doc of docs) {
            const bg = {
              id: doc.id,
              name: doc.name,
              category: doc.system.category,
              narrativeDescription: doc.system.narrativeDescription || '',
              specialAbility: doc.system.specialAbility || '',
              relevantSkills: doc.system.relevantSkills || [],
              skillChoiceCount: doc.system.skillChoiceCount || 1,
              mechanicalEffect: doc.system.mechanicalEffect || {},
              region: doc.system.region || '',
              terrain: doc.system.terrain || ''
            };

            if (bg.category === 'event') {
              events.push(bg);
            } else if (bg.category === 'occupation') {
              occupations.push(bg);
            } else if (bg.category === 'planet') {
              planets_core.push(bg);
            } else if (bg.category === 'planet-homebrew') {
              planets_homebrew.push(bg);
            }
          }

          this._backgrounds = { events, occupations, planets_core, planets_homebrew };
          SWSELogger.log(`chargen: Loaded ${docs.length} backgrounds from compendium`);
          return this._backgrounds;
        }
      }
    } catch (e) {
      SWSELogger.warn("chargen: Failed to load from compendium, falling back to JSON", e);
    }

    // Fallback to JSON
    try {
      const resp = await fetch("systems/foundryvtt-swse/data/backgrounds.json");
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      this._backgrounds = await resp.json();
      SWSELogger.log("chargen: backgrounds.json loaded successfully");
      return this._backgrounds;
    } catch (e) {
      SWSELogger.error("chargen: error loading backgrounds.json:", e);
      this._backgrounds = { events: [], occupations: [], planets_core: [], planets_homebrew: [] };
      ui.notifications.warn("Failed to load backgrounds data. Using defaults.");
      return this._backgrounds;
    }
  },

  /**
   * Get backgrounds for a specific category
   * @param {string} category - 'events', 'occupations', or 'planets'
   * @param {boolean} includeHomebrew - Include homebrew planets
   * @returns {Array} Array of backgrounds
   */
  async _getBackgroundsByCategory(category, includeHomebrew = false) {
    const backgrounds = await this._loadBackgrounds();

    if (category === 'events') {
      return backgrounds.events || [];
    } else if (category === 'occupations') {
      return backgrounds.occupations || [];
    } else if (category === 'planets') {
      const corePlanets = backgrounds.planets_core || [];
      if (includeHomebrew) {
        const homebrewPlanets = backgrounds.planets_homebrew || [];
        return [...corePlanets, ...homebrewPlanets];
      }
      return corePlanets;
    }

    return [];
  },

  /**
   * Get Ol' Salty's narrative comment for background selection
   * @param {string} category - 'events', 'occupations', or 'planets'
   * @returns {string} Narrator comment
   */
  _getBackgroundNarratorComment(category) {
    const comments = {
      events: [
        "Arr, every spacer has that ONE moment that changed everything, matey! What was YOURS?",
        "Tell me, buccaneer... what defining event put ye on the path to adventure?",
        "Life has a way of throwin' ye curveballs, savvy? What moment shaped ye into who ye are today?",
        "HAR! Every legend has an origin story! What was the moment that made YE legendary?"
      ],
      occupations: [
        "What did ye do before ye became an adventurer? Everyone's gotta start somewhere, matey!",
        "Arr! What trade did ye ply before the call of adventure? A soldier? A smuggler? A scoundrel like meself?",
        "Before the thrill of adventure, what was yer profession? Speak up, buccaneer!",
        "Tell ol' Salty - what line of work did ye pursue before chasin' destiny across the stars?"
      ],
      planets: [
        "Not from yer species' homeworld, eh? Tell me, what rock did ye grow up on?",
        "Arr! Where did ye come of age, matey? What planet shaped yer early years?",
        "Every world leaves its mark on those who call it home. Which one marked YE?",
        "HAR! Ye weren't raised where most of yer kind were! What world raised ye instead?"
      ]
    };

    const categoryComments = comments[category] || comments.events;
    return categoryComments[Math.floor(Math.random() * categoryComments.length)];
  },

  /**
   * Handle background category tab click
   * @param {Event} event - Click event
   */
  async _onBackgroundCategoryTabClick(event) {
    event.preventDefault();
    const category = event.currentTarget.dataset.category;

    // Update active tab
    const $html = $(event.currentTarget).closest('.chargen-app');
    $html.find('.background-category-tab').removeClass('active');
    $(event.currentTarget).addClass('active');

    // Store selected category
    this.characterData.backgroundCategory = category;

    // Update narrator comment
    const narratorComment = this._getBackgroundNarratorComment(category);
    this.characterData.backgroundNarratorComment = narratorComment;

    await this.render();
  },

  /**
   * Handle background selection
   * @param {Event} event - Click event
   */
  async _onSelectBackground(event) {
    event.preventDefault();
    const backgroundId = event.currentTarget.dataset.backgroundId;
    const backgrounds = await this._loadBackgrounds();

    // Find the background across all categories
    let background = null;
    for (const category of Object.values(backgrounds)) {
      if (Array.isArray(category)) {
        background = category.find(b => b.id === backgroundId);
        if (background) break;
      }
    }

    if (!background) {
      SWSELogger.error(`Background not found: ${backgroundId}`);
      ui.notifications.error(`Background not found: ${backgroundId}`);
      return;
    }

    SWSELogger.log(`chargen: Selected background: ${background.name} (${background.category})`);

    // Store background
    this.characterData.background = background;

    // Show skill selection dialog
    if (background.skillChoiceCount > 0) {
      await this._showBackgroundSkillSelection(background);
    } else {
      // No skills to select, move forward
      ui.notifications.info(`Background selected: ${background.name}`);
      await this.render();
    }
  },

  /**
   * Show skill selection dialog for background
   * @param {Object} background - The selected background
   */
  async _showBackgroundSkillSelection(background) {
    const skillCount = background.skillChoiceCount;
    const relevantSkills = background.relevantSkills;

    // Convert skill display names to keys
    const skillMap = this._getSkillKeyMap();

    // Build skill options HTML
    let skillOptionsHTML = '<div class="background-skill-selection">';
    skillOptionsHTML += `<p>Choose <strong>${skillCount}</strong> skill${skillCount > 1 ? 's' : ''} to add to your class skills:</p>`;
    skillOptionsHTML += '<div class="skill-checkboxes">';

    for (const skillDisplayName of relevantSkills) {
      const skillKey = skillMap[skillDisplayName] || this._guessSkillKey(skillDisplayName);
      skillOptionsHTML += `
        <label class="skill-checkbox-label">
          <input type="checkbox" name="background-skill" value="${skillKey}" data-display="${skillDisplayName}">
          <span>${skillDisplayName}</span>
        </label>
      `;
    }

    skillOptionsHTML += '</div></div>';

    // Show dialog
    return new Promise((resolve) => {
      new Dialog({
        title: `${background.name} - Select Skills`,
        content: `
          <div class="background-skill-dialog">
            <p class="background-description">${background.narrativeDescription}</p>
            ${skillOptionsHTML}
            <p class="hint-text"><strong>Important:</strong> These skills will be added to your class skill list. You can train them later in the Skills step.</p>
          </div>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: async (html) => {
              const selected = html.find('input[name="background-skill"]:checked');

              if (selected.length !== skillCount) {
                ui.notifications.warn(`Please select exactly ${skillCount} skill${skillCount > 1 ? 's' : ''}.`);
                return false;
              }

              // Store selected skills (will be added to class skills, NOT trained yet)
              const selectedSkills = [];
              selected.each(function() {
                const skillKey = $(this).val();
                const skillDisplay = $(this).data('display');
                selectedSkills.push({ key: skillKey, display: skillDisplay });
              });

              this.characterData.backgroundSkills = selectedSkills;

              // Add bonus language for planet origins
              if (background.category === 'planet' && background.bonusLanguage) {
                if (!this.characterData.languages.includes(background.bonusLanguage)) {
                  this.characterData.languages.push(background.bonusLanguage);
                }
              }

              // Store occupation bonuses for later application (untrained skill bonuses)
              if (background.category === 'occupation') {
                this._applyOccupationBonuses(background);
              }

              ui.notifications.info(`Background selected: ${background.name}`);
              await this.render();
              resolve(selectedSkills);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => {
              // Clear background selection
              this.characterData.background = null;
              resolve(null);
            }
          }
        },
        default: "confirm",
        render: (html) => {
          // Limit checkbox selection
          html.find('input[name="background-skill"]').change(function() {
            const checked = html.find('input[name="background-skill"]:checked');
            if (checked.length >= skillCount) {
              html.find('input[name="background-skill"]:not(:checked)').prop('disabled', true);
            } else {
              html.find('input[name="background-skill"]').prop('disabled', false);
            }
          });
        }
      }, {
        width: 500,
        classes: ['swse', 'background-skill-dialog']
      }).render(true);
    });
  },

  /**
   * Apply occupation bonuses to skills
   * @param {Object} background - The occupation background
   */
  _applyOccupationBonuses(background) {
    if (background.category !== 'occupation') return;

    const mechanicalEffect = background.mechanicalEffect;
    if (mechanicalEffect.type !== 'untrained_bonus') return;

    // Store occupation bonus data for later application
    this.characterData.occupationBonus = {
      skills: mechanicalEffect.skills,
      value: mechanicalEffect.value
    };

    SWSELogger.log(`chargen: Applied occupation bonuses for ${background.name}`);
  },

  /**
   * Get skill key mapping from display names
   * @returns {Object} Map of display names to keys
   */
  _getSkillKeyMap() {
    return {
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
      'Knowledge (Any)': 'knowledge', // Special case
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
  },

  /**
   * Guess skill key from display name
   * @param {string} displayName - Skill display name
   * @returns {string} Skill key
   */
  _guessSkillKey(displayName) {
    // Convert "Knowledge (X)" to "knowledgeX"
    const knowledgeMatch = displayName.match(/Knowledge \(([^)]+)\)/);
    if (knowledgeMatch) {
      const subSkill = knowledgeMatch[1].replace(/\s+/g, '');
      return `knowledge${subSkill}`;
    }

    // Default: camelCase conversion
    return displayName
      .split(' ')
      .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  },

  /**
   * Get background class skills
   * @returns {Array<string>} Array of skill keys from background
   */
  _getBackgroundClassSkills() {
    if (!this.characterData.backgroundSkills) return [];
    return this.characterData.backgroundSkills.map(s => s.key);
  },

  /**
   * Check if a skill is from background
   * @param {string} skillKey - The skill key to check
   * @returns {boolean} True if skill is from background
   */
  _isSkillFromBackground(skillKey) {
    if (!this.characterData.backgroundSkills) return false;
    return this.characterData.backgroundSkills.some(s => s.key === skillKey);
  },

  /**
   * Check for skill overlaps between background and class
   * Show dialog to let player change their background skill choice if overlap exists
   * @param {Object} selectedClass - The selected class
   */
  async _checkBackgroundSkillOverlap(selectedClass) {
    if (!this.characterData.background || !this.characterData.backgroundSkills) return;

    const classSkills = getClassProperty(selectedClass, 'classSkills', []);
    const backgroundSkills = this.characterData.backgroundSkills;

    // Find overlapping skills
    const overlaps = [];
    for (const bgSkill of backgroundSkills) {
      const isClassSkill = classSkills.some(cs =>
        cs.toLowerCase().includes(bgSkill.display.toLowerCase()) ||
        bgSkill.display.toLowerCase().includes(cs.toLowerCase())
      );
      if (isClassSkill) {
        overlaps.push(bgSkill);
      }
    }

    if (overlaps.length === 0) return;

    // Show dialog to let player change their selection
    const overlappingNames = overlaps.map(s => s.display).join(', ');

    const changeSelection = await Dialog.confirm({
      title: "Background Skill Overlap",
      content: `
        <div class="background-overlap-dialog">
          <p><i class="fas fa-exclamation-triangle"></i> <strong>Skill Overlap Detected</strong></p>
          <p>Your background selection includes the following skill(s) that are already class skills for ${selectedClass.name}:</p>
          <ul>
            ${overlaps.map(s => `<li><strong>${s.display}</strong></li>`).join('')}
          </ul>
          <p>Would you like to change your background skill selection to avoid wasting this choice?</p>
        </div>
      `,
      defaultYes: true
    });

    if (changeSelection) {
      // Re-show background skill selection
      await this._showBackgroundSkillSelection(this.characterData.background);
    }
  },

  /**
   * Check if backgrounds are enabled in houserules
   * @returns {boolean} True if backgrounds are enabled
   */
  _areBackgroundsEnabled() {
    return game.settings.get('foundryvtt-swse', "enableBackgrounds") !== false;
  },

  /**
   * Get number of allowed background selections from houserules
   * @returns {number} Number of backgrounds player can select (1, 2, or 3)
   */
  _getAllowedBackgroundCount() {
    return game.settings.get('foundryvtt-swse', "backgroundSelectionCount") || 1;
  },

  /**
   * Handle "Change Background" button click
   * @param {Event} event - Click event
   */
  async _onChangeBackground(event) {
    event.preventDefault();

    // Clear current background
    this.characterData.background = null;
    this.characterData.backgroundSkills = [];

    await this.render();
  },

  /**
   * Handle homebrew planets toggle
   * @param {Event} event - Change event
   */
  async _onToggleHomebrewPlanets(event) {
    this.characterData.allowHomebrewPlanets = event.currentTarget.checked;
    await this.render();
  },

  /**
   * Handle random background button click
   * @param {Event} event - Click event
   */
  async _onRandomBackground(event) {
    event.preventDefault();

    const allowedCount = this._getAllowedBackgroundCount();
    const backgrounds = await this._loadBackgrounds();

    // Randomly select a category
    const categories = ['events', 'occupations', 'planets'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    // Get backgrounds for that category
    const categoryBackgrounds = randomCategory === 'events' ? backgrounds.events :
                                 randomCategory === 'occupations' ? backgrounds.occupations :
                                 [...backgrounds.planets_core, ...(this.characterData.allowHomebrewPlanets ? backgrounds.planets_homebrew : [])];

    if (!categoryBackgrounds || categoryBackgrounds.length === 0) {
      ui.notifications.warn(`No backgrounds available in category: ${randomCategory}`);
      return;
    }

    // Randomly select a background
    const randomIndex = Math.floor(Math.random() * categoryBackgrounds.length);
    const randomBackground = categoryBackgrounds[randomIndex];

    SWSELogger.log(`chargen: Randomly selected background: ${randomBackground.name} from category ${randomCategory}`);

    // Set the background
    this.characterData.background = randomBackground;
    this.characterData.backgroundCategory = randomCategory;

    // Show skill selection dialog
    if (randomBackground.skillChoiceCount > 0) {
      await this._showBackgroundSkillSelection(randomBackground);
    } else {
      ui.notifications.info(`Random background selected: ${randomBackground.name}`);
      await this.render();
    }
  },

  /**
   * Render background cards for the selected category
   * @param {HTMLElement} container - The container element
   */
  async _renderBackgroundCards(container) {
    if (!container) return;

    const category = this.characterData.backgroundCategory || 'events';
    const includeHomebrew = category === 'planets' && this.characterData.allowHomebrewPlanets;

    const backgrounds = await this._getBackgroundsByCategory(category, includeHomebrew);

    if (!backgrounds || backgrounds.length === 0) {
      container.innerHTML = '<p class="no-backgrounds">No backgrounds available for this category.</p>';
      return;
    }

    // Build HTML for background cards
    let html = '';
    for (const background of backgrounds) {
      const isHomebrew = background.homebrew ? 'homebrew-background' : '';
      html += `
        <div class="background-card ${isHomebrew}" data-background-id="${background.id}">
          <div class="background-card-header">
            <span class="background-icon">${background.icon}</span>
            <h4>${background.name}</h4>
            ${background.homebrew ? '<span class="homebrew-badge">Homebrew</span>' : ''}
          </div>
          <div class="background-card-body">
            <p class="background-narrative">${background.narrativeDescription}</p>
            <div class="background-benefits-preview">
              <strong>Benefits:</strong>
              <ul>
                ${background.specialAbility ? `<li>${background.specialAbility}</li>` : ''}
                ${background.skillChoiceCount ? `<li>Choose ${background.skillChoiceCount} skill${background.skillChoiceCount > 1 ? 's' : ''} to add to class skills</li>` : ''}
                ${background.bonusLanguage ? `<li>Language: ${background.bonusLanguage}</li>` : ''}
              </ul>
            </div>
          </div>
          <button type="button" class="select-background btn-primary" data-background-id="${background.id}">
            <i class="fas fa-check"></i> Select
          </button>
        </div>
      `;
    }

    container.innerHTML = html;

    // Re-bind click handlers for the new buttons
    container.querySelectorAll('.select-background').forEach(btn => {
      btn.addEventListener('click', this._onSelectBackground.bind(this));
    });
  },

  /**
   * Apply background to actor during character creation
   * @param {Actor} actor - The actor to apply background to
   */
  async _applyBackgroundToActor(actor) {
    const background = this.characterData.background;
    if (!background) return;

    try {
      // Store background data in flags
      await actor.setFlag('swse', 'background', {
        id: background.id,
        name: background.name,
        category: background.category,
        mechanicalEffect: background.mechanicalEffect,
        skills: this.characterData.backgroundSkills || [],
        bonusLanguage: background.bonusLanguage || null
      });

      // For Event backgrounds, add the special ability as a feat-like item
      if (background.category === 'event') {
        await this._createEventAbilityItem(actor, background);
      }

      // For Occupation backgrounds, apply untrained skill bonuses
      if (background.category === 'occupation' && this.characterData.occupationBonus) {
        await actor.setFlag('swse', 'occupationBonus', this.characterData.occupationBonus);

        // Apply the +2 bonus to the relevant skills as a misc modifier
        const skillMap = this._getSkillKeyMap();
        const occupationSkills = this.characterData.occupationBonus.skills;
        const bonusValue = this.characterData.occupationBonus.value;

        // Note: The bonus applies to untrained checks, which is handled by the flag
        // The system should check the occupationBonus flag when calculating skill bonuses
        SWSELogger.log(`chargen: Occupation bonuses flagged for skills:`, occupationSkills);
      }

      // Handle Exiled background's Skill Focus feat
      if (background.id === 'exiled') {
        await this._addExiledSkillFocus(actor);
      }

      SWSELogger.log(`chargen: Applied background ${background.name} to actor ${actor.name}`);
    } catch (error) {
      SWSELogger.error('chargen: Failed to apply background to actor:', error);
      ui.notifications.warn(`Failed to apply background. You may need to add it manually.`);
    }
  },

  /**
   * Create a custom item for Event special abilities
   * @param {Actor} actor - The actor
   * @param {Object} background - The event background
   */
  async _createEventAbilityItem(actor, background) {
    const itemData = {
      name: `${background.name} (Background)`,
      type: 'feat',
      img: 'icons/svg/lightning.svg',
      system: {
        description: background.mechanicalEffect.description,
        permanent: true,
        background: true
      }
    };

    await actor.createEmbeddedDocuments('Item', [itemData]);
    SWSELogger.log(`chargen: Created event ability item for ${background.name}`);
  },

  /**
   * Add Skill Focus (Knowledge [Galactic Lore]) for Exiled background
   * @param {Actor} actor - The actor
   */
  async _addExiledSkillFocus(actor) {
    try {
      // Try to find Skill Focus in the feats compendium
      const featsPack = game.packs.get('foundryvtt-swse.feats');
      if (!featsPack) {
        SWSELogger.warn('chargen: Feats compendium not found, cannot add Skill Focus for Exiled');
        return;
      }

      const index = await featsPack.getIndex();
      const skillFocusEntry = index.find(f => f.name === 'Skill Focus (Knowledge [Galactic Lore])');

      if (skillFocusEntry) {
        const skillFocus = await featsPack.getDocument(skillFocusEntry._id);
        await actor.createEmbeddedDocuments('Item', [skillFocus.toObject()]);
        SWSELogger.log('chargen: Added Skill Focus (Knowledge [Galactic Lore]) for Exiled background');
      } else {
        // Create a custom feat if not found
        const customFeat = {
          name: 'Skill Focus (Knowledge [Galactic Lore])',
          type: 'feat',
          img: 'icons/svg/book.svg',
          system: {
            description: 'You gain a +5 competence bonus on all skill checks with Knowledge (Galactic Lore). Granted by Exiled background.',
            permanent: true,
            background: true
          }
        };
        await actor.createEmbeddedDocuments('Item', [customFeat]);
        SWSELogger.log('chargen: Created custom Skill Focus feat for Exiled background');
      }
    } catch (error) {
      SWSELogger.error('chargen: Failed to add Skill Focus for Exiled:', error);
    }
  }
};

export default BackgroundsModule;
