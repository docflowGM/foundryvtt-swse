// ============================================
// Language selection for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';

/**
 * Load languages data from JSON file
 * @returns {Promise<Object>} Languages data with categories
 */
async function _loadLanguagesData() {
  if (this._languagesJson) {
    return this._languagesJson;
  }

  try {
    const resp = await fetch("systems/foundryvtt-swse/data/languages.json");
    if (resp.ok) {
      this._languagesJson = await resp.json();
      SWSELogger.log("chargen: languages.json loaded successfully");
      return this._languagesJson;
    } else {
      SWSELogger.warn("chargen: failed to fetch languages.json");
      return null;
    }
  } catch (e) {
    SWSELogger.error("chargen: error loading languages.json:", e);
    return null;
  }
}

/**
 * Load species languages mapping from JSON file
 * @returns {Promise<Object>} Species languages mapping
 */
async function _loadSpeciesLanguagesData() {
  if (this._speciesLanguagesJson) {
    return this._speciesLanguagesJson;
  }

  try {
    const resp = await fetch("systems/foundryvtt-swse/data/species-languages.json");
    if (resp.ok) {
      this._speciesLanguagesJson = await resp.json();
      SWSELogger.log("chargen: species-languages.json loaded successfully");
      return this._speciesLanguagesJson;
    } else {
      SWSELogger.warn("chargen: failed to fetch species-languages.json");
      return null;
    }
  } catch (e) {
    SWSELogger.error("chargen: error loading species-languages.json:", e);
    return null;
  }
}

/**
 * Calculate total language budget including Linguist feat if applicable
 * @returns {number} Total number of additional languages allowed
 */
function _calculateLanguageBudget() {
  const intMod = this.characterData.abilities.int.mod || 0;
  let totalBudget = intMod;

  // Check if character has the Linguist feat
  let hasLinguist = this.characterData.feats &&
    this.characterData.feats.some(feat =>
      (typeof feat === 'string' ? feat : feat.name) === 'Linguist'
    );

  // Also check if the selected class is Noble (which automatically grants Linguist)
  if (!hasLinguist && this.characterData.classes && this.characterData.classes.length > 0) {
    const selectedClassName = this.characterData.classes[0]?.name;
    if (selectedClassName === 'Noble') {
      hasLinguist = true;
      SWSELogger.log(`CharGen | Noble class selected - automatically including Linguist bonus`);
    }
  }

  // Linguist feat grants 1 + INT mod additional languages
  if (hasLinguist) {
    const linguistBonus = 1 + intMod;
    totalBudget += linguistBonus;
    SWSELogger.log(`CharGen | Language budget calculated with Linguist feat: ${intMod} (INT) + ${linguistBonus} (Linguist) = ${totalBudget}`);
  } else {
    SWSELogger.log(`CharGen | Language budget calculated: ${intMod} (INT)`);
  }

  return Math.max(1, totalBudget); // Minimum 1 language
}

/**
 * Get starting languages for the character based on species
 * @returns {Object} Object containing granted languages and additional languages count
 */
export async function _getStartingLanguages() {
  const speciesLanguagesData = await _loadSpeciesLanguagesData.call(this);

  // Get species name
  let speciesName = this.characterData.species;

  // Calculate language budget (includes INT + Linguist feat if applicable)
  const languageBudget = _calculateLanguageBudget.call(this);

  // Handle droids specially
  if (this.characterData.isDroid) {
    return {
      granted: ["Binary"],
      additional: languageBudget,
      canSpeakAll: true,
      understands: []
    };
  }

  // Get species language info
  const speciesInfo = speciesLanguagesData?.[speciesName];

  if (!speciesInfo) {
    SWSELogger.warn(`No language data found for species: ${speciesName}`);
    // Default to Basic + calculated language budget
    return {
      granted: ["Basic"],
      additional: languageBudget,
      canSpeakAll: true,
      understands: []
    };
  }

  return {
    granted: speciesInfo.languages || ["Basic"],
    additional: languageBudget,
    canSpeakAll: speciesInfo.canSpeakAll !== false,
    understands: speciesInfo.understands || []
  };
}

/**
 * Get all available languages organized by category
 * Loads from foundryvtt-swse.languages compendium with fallback to JSON
 * @returns {Promise<Object>} Languages organized by category
 */
export async function _getAvailableLanguages() {
  try {
    // Try to load from compendium first
    const pack = game?.packs?.get('foundryvtt-swse.languages');
    if (pack) {
      const docs = await pack.getDocuments();

      if (docs.length > 0) {
        // Organize languages by category
        const widelyUsed = [];
        const localTrade = [];

        for (const doc of docs) {
          const category = doc.system.category || 'local-trade';
          if (category === 'widely-used') {
            widelyUsed.push(doc.name);
          } else {
            localTrade.push(doc.name);
          }
        }

        SWSELogger.log(`chargen: Loaded ${docs.length} languages from compendium`);

        return {
          widelyUsed: {
            name: "Widely Used Languages",
            description: "Common languages spoken throughout the galaxy",
            languages: widelyUsed.sort()
          },
          localTrade: {
            name: "Local/Trade Languages",
            description: "Regional languages and trade tongues",
            languages: localTrade.sort()
          }
        };
      }
    }
  } catch (e) {
    SWSELogger.warn("chargen: Failed to load languages from compendium, falling back to JSON", e);
  }

  // Fallback to JSON
  const languagesData = await _loadLanguagesData.call(this);

  if (!languagesData) {
    // Final fallback to a basic list
    return {
      widelyUsed: {
        name: "Widely Used Languages",
        languages: ["Basic", "Binary", "Bocce", "Huttese"]
      }
    };
  }

  return languagesData.categories;
}

/**
 * Initialize languages for character based on species, INT modifier, and feats
 */
export async function _initializeLanguages() {
  const startingInfo = await _getStartingLanguages.call(this);

  // Initialize languages array if not exists
  if (!this.characterData.languages) {
    this.characterData.languages = [];
  }

  // Add granted languages (species + any special bonuses)
  for (const lang of startingInfo.granted) {
    if (!this.characterData.languages.includes(lang)) {
      this.characterData.languages.push(lang);
    }
  }

  // Store language selection metadata BEFORE adding background language
  if (!this.characterData.languageData) {
    this.characterData.languageData = {
      granted: startingInfo.granted,
      understands: startingInfo.understands,
      additional: startingInfo.additional,
      canSpeakAll: startingInfo.canSpeakAll,
      backgroundBonus: [] // Track background bonus languages separately
    };
  }

  // Add bonus language from background if it exists
  // This is tracked separately and does NOT count against the language selection budget
  if (this.characterData.background?.bonusLanguage) {
    const bonusLang = this.characterData.background.bonusLanguage;
    if (!this.characterData.languages.includes(bonusLang)) {
      this.characterData.languages.push(bonusLang);
      // Track this as a background bonus language
      if (!this.characterData.languageData.backgroundBonus.includes(bonusLang)) {
        this.characterData.languageData.backgroundBonus.push(bonusLang);
      }
      SWSELogger.log(`CharGen | Added bonus language from background: ${bonusLang}`);
    }
  }
}

/**
 * Handle language selection
 */
export async function _onSelectLanguage(event) {
  event.preventDefault();
  const language = event.currentTarget.dataset.language;

  if (!this.characterData.languages) {
    this.characterData.languages = [];
  }

  // Check if already selected
  if (this.characterData.languages.includes(language)) {
    ui.notifications.warn(`${language} is already selected.`);
    return;
  }

  // Get language data to check limits
  const languageData = this.characterData.languageData;
  const grantedCount = languageData?.granted?.length || 0;
  const backgroundBonusCount = languageData?.backgroundBonus?.length || 0;
  const additionalAllowed = languageData?.additional || 0;
  // Background bonus languages don't count against the language selection budget
  const currentAdditional = this.characterData.languages.length - grantedCount - backgroundBonusCount;

  // Check if can select more languages
  if (currentAdditional >= additionalAllowed) {
    ui.notifications.warn(`You can only select ${additionalAllowed} additional language${additionalAllowed !== 1 ? 's' : ''} (based on INT modifier and any feats).`);
    return;
  }

  // Add the language
  this.characterData.languages.push(language);
  SWSELogger.log(`CharGen | Selected language: ${language}`);

  await this.render();
}

/**
 * Handle language removal
 */
export async function _onRemoveLanguage(event) {
  event.preventDefault();
  const language = event.currentTarget.dataset.language;

  // Check if this is a granted language
  const languageData = this.characterData.languageData;
  if (languageData?.granted?.includes(language)) {
    ui.notifications.warn(`${language} is a granted language and cannot be removed.`);
    return;
  }

  // Check if this is a background bonus language
  if (languageData?.backgroundBonus?.includes(language)) {
    ui.notifications.warn(`${language} is a bonus language from your background and cannot be removed.`);
    return;
  }

  // Remove the language
  const index = this.characterData.languages.indexOf(language);
  if (index > -1) {
    this.characterData.languages.splice(index, 1);
    SWSELogger.log(`CharGen | Removed language: ${language}`);
  }

  await this.render();
}

/**
 * Handle reset languages button
 */
export async function _onResetLanguages(event) {
  event.preventDefault();

  // Reset to granted languages + background bonus languages
  const languageData = this.characterData.languageData;
  const granted = [...(languageData?.granted || ["Basic"])];
  const backgroundBonus = [...(languageData?.backgroundBonus || [])];
  this.characterData.languages = [...granted, ...backgroundBonus];

  SWSELogger.log("CharGen | Reset language selections");
  ui.notifications.info("Language selections have been reset to granted languages and background bonuses.");
  await this.render();
}

/**
 * Handle add custom language button
 */
export async function _onAddCustomLanguage(event) {
  event.preventDefault();

  // Get language data to check limits
  const languageData = this.characterData.languageData;
  const grantedCount = languageData?.granted?.length || 0;
  const backgroundBonusCount = languageData?.backgroundBonus?.length || 0;
  const additionalAllowed = languageData?.additional || 0;
  // Background bonus languages don't count against the language selection budget
  const currentAdditional = this.characterData.languages.length - grantedCount - backgroundBonusCount;

  // Check if can select more languages
  if (currentAdditional >= additionalAllowed) {
    ui.notifications.warn(`You can only select ${additionalAllowed} additional language${additionalAllowed !== 1 ? 's' : ''} (based on INT modifier and any feats).`);
    return;
  }

  // Show dialog to enter custom language name
  const customLanguage = await Dialog.prompt({
    title: "Add Custom Language",
    content: `
      <div style="margin-bottom: 1rem;">
        <p>Enter the name of your custom language:</p>
        <p style="font-size: 0.9rem; color: #888; margin-top: 0.5rem;">
          This is useful for homebrew campaigns or unique character backgrounds.
        </p>
      </div>
      <div class="form-group">
        <label for="custom-language-input">Language Name:</label>
        <input
          id="custom-language-input"
          name="customLanguage"
          type="text"
          placeholder="e.g., Ancient Sith, Clan Dialect..."
          autofocus
          style="width: 100%; padding: 0.5rem; margin-top: 0.5rem;"
        />
      </div>
    `,
    callback: (html) => {
      const input = html.find('input[name="customLanguage"]');
      return input.val()?.trim();
    },
    rejectClose: false,
    options: { width: 400 }
  });

  // Check if user entered a language name
  if (!customLanguage) {
    return; // User cancelled or entered nothing
  }

  // Check if language already exists
  if (this.characterData.languages.includes(customLanguage)) {
    ui.notifications.warn(`${customLanguage} is already in your language list.`);
    return;
  }

  // Add the custom language
  this.characterData.languages.push(customLanguage);
  SWSELogger.log(`CharGen | Added custom language: ${customLanguage}`);
  ui.notifications.info(`Added custom language: ${customLanguage}`);

  await this.render();
}
