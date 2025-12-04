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
    const resp = await fetch("systems/swse/data/languages.json");
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
    const resp = await fetch("systems/swse/data/species-languages.json");
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
 * Get starting languages for the character based on species
 * @returns {Object} Object containing granted languages and additional languages count
 */
export async function _getStartingLanguages() {
  const speciesLanguagesData = await _loadSpeciesLanguagesData.call(this);

  // Get species name
  let speciesName = this.characterData.species;

  // Handle droids specially
  if (this.characterData.isDroid) {
    return {
      granted: ["Binary"],
      additional: this.characterData.abilities.int.mod || 0,
      canSpeakAll: true,
      understands: []
    };
  }

  // Get species language info
  const speciesInfo = speciesLanguagesData?.[speciesName];

  if (!speciesInfo) {
    SWSELogger.warn(`No language data found for species: ${speciesName}`);
    // Default to Basic + INT mod additional languages
    return {
      granted: ["Basic"],
      additional: this.characterData.abilities.int.mod || 0,
      canSpeakAll: true,
      understands: []
    };
  }

  return {
    granted: speciesInfo.languages || ["Basic"],
    additional: this.characterData.abilities.int.mod || 0,
    canSpeakAll: speciesInfo.canSpeakAll !== false,
    understands: speciesInfo.understands || []
  };
}

/**
 * Get all available languages organized by category
 * @returns {Promise<Object>} Languages organized by category
 */
export async function _getAvailableLanguages() {
  const languagesData = await _loadLanguagesData.call(this);

  if (!languagesData) {
    // Fallback to a basic list
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
 * Initialize languages for character based on species and INT modifier
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

  // Store language selection metadata
  if (!this.characterData.languageData) {
    this.characterData.languageData = {
      granted: startingInfo.granted,
      understands: startingInfo.understands,
      additional: startingInfo.additional,
      canSpeakAll: startingInfo.canSpeakAll
    };
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
  const additionalAllowed = languageData?.additional || 0;
  const currentAdditional = this.characterData.languages.length - grantedCount;

  // Check if can select more languages
  if (currentAdditional >= additionalAllowed) {
    ui.notifications.warn(`You can only select ${additionalAllowed} additional language${additionalAllowed !== 1 ? 's' : ''} (based on INT modifier).`);
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

  // Reset to only granted languages
  const languageData = this.characterData.languageData;
  this.characterData.languages = [...(languageData?.granted || ["Basic"])];

  SWSELogger.log("CharGen | Reset language selections");
  ui.notifications.info("Language selections have been reset to granted languages.");
  await this.render();
}
