// ============================================
// Language selection for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { LanguageRegistry } from '../../registries/language-registry.js';
import { prompt } from '../../utils/ui-utils.js';

async function _syncLanguageIds() {
  const names = Array.isArray(this.characterData.languages) ? this.characterData.languages : [];
  const ids = [];
  const uuids = [];

  for (const name of names) {
    const rec = await LanguageRegistry.getByName(name);
    if (rec?.internalId) {ids.push(rec.internalId);}
    if (rec?.uuid) {uuids.push(rec.uuid);}
  }

  this.characterData.languageIds = ids;
  this.characterData.languageUuids = uuids;
}

/**
 * Load languages data from JSON file
 * @returns {Promise<Object>} Languages data with categories
 */
async function _loadLanguagesData() {
  if (this._languagesJson) {
    return this._languagesJson;
  }

  try {
    const resp = await fetch('systems/foundryvtt-swse/data/languages.json');
    if (resp.ok) {
      this._languagesJson = await resp.json();
      SWSELogger.log('chargen: languages.json loaded successfully');
      return this._languagesJson;
    } else {
      SWSELogger.warn('chargen: failed to fetch languages.json');
      return null;
    }
  } catch (e) {
    SWSELogger.error('chargen: error loading languages.json:', e);
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
    const resp = await fetch('systems/foundryvtt-swse/data/species-languages.json');
    if (resp.ok) {
      this._speciesLanguagesJson = await resp.json();
      SWSELogger.log('chargen: species-languages.json loaded successfully');
      return this._speciesLanguagesJson;
    } else {
      SWSELogger.warn('chargen: failed to fetch species-languages.json');
      return null;
    }
  } catch (e) {
    SWSELogger.error('chargen: error loading species-languages.json:', e);
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

  // Allow 0 languages if INT is negative and no Linguist feat (allows auto-skip)
  // Otherwise minimum 1 language (granted languages are always included)
  return Math.max(0, totalBudget);
}

/**
 * Get starting languages for the character based on species
 * @returns {Object} Object containing granted languages and additional languages count
 */
export async function _getStartingLanguages() {
  const speciesLanguagesData = await _loadSpeciesLanguagesData.call(this);

  // Get species name
  const speciesName = this.characterData.species;

  // Calculate language budget (includes INT + Linguist feat if applicable)
  const languageBudget = _calculateLanguageBudget.call(this);

  // Handle droids specially
  if (this.characterData.isDroid) {
    return {
      granted: ['Binary', 'Basic'],
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
      granted: ['Basic'],
      additional: languageBudget,
      canSpeakAll: true,
      understands: []
    };
  }

  return {
    granted: speciesInfo.languages || ['Basic'],
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
  const systemId = game?.system?.id || 'foundryvtt-swse';
  const packKey = `${systemId}.languages`;

  // Prefer compendium pack (stable _id + uuid + descriptions).
  try {
    const pack = game?.packs?.get(packKey);
    if (pack) {
      const idx = await pack.getIndex({ fields: ['name', 'img', 'system'] });

      const widelyUsed = [];
      const localTrade = [];

      for (const e of idx) {
        const sys = e.system || {};
        const category = sys.category || 'local-trade';

        const record = {
          _id: e._id,
          uuid: `Compendium.${pack.collection}.${e._id}`,
          name: e.name,
          img: e.img,
          description: sys.description || '',
          isLocal: !!sys.isLocal,
          category
        };

        if (category === 'widely-used') {widelyUsed.push(record);} else {localTrade.push(record);}
      }

      widelyUsed.sort((a, b) => a.name.localeCompare(b.name));
      localTrade.sort((a, b) => a.name.localeCompare(b.name));

      SWSELogger.log(`chargen: Loaded ${idx.length} languages from compendium ${packKey}`);

      return {
        widelyUsed: {
          name: 'Widely Used Languages',
          description: 'Common languages spoken throughout the galaxy',
          languages: widelyUsed
        },
        localTrade: {
          name: 'Local/Trade Languages',
          description: 'Regional languages and trade tongues',
          languages: localTrade
        }
      };
    }
  } catch (e) {
    SWSELogger.warn('chargen: Failed to load languages from compendium, falling back to JSON', e);
  }

  // Fallback: JSON, mapped through registry when possible.
  const languagesData = await _loadLanguagesData.call(this);
  const categories = languagesData?.categories || {};

  const toRecords = async (names, fallbackCategory) => {
    const out = [];
    for (const name of names || []) {
      const rec = await LanguageRegistry.getByName(name);
      out.push({
        _id: rec?.internalId || '',
        uuid: rec?.uuid || '',
        name,
        img: rec?.img,
        description: rec?.description || '',
        isLocal: !!rec?.isLocal,
        category: rec?.category || fallbackCategory
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  };

  return {
    widelyUsed: {
      name: categories?.widelyUsed?.name || 'Widely Used Languages',
      description: categories?.widelyUsed?.description || '',
      languages: await toRecords(categories?.widelyUsed?.languages, 'widely-used')
    },
    localTrade: {
      name: categories?.localTrade?.name || 'Local/Trade Languages',
      description: categories?.localTrade?.description || '',
      languages: await toRecords(categories?.localTrade?.languages, 'local-trade')
    }
  };
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

  await _syncLanguageIds.call(this);
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
  await _syncLanguageIds.call(this);
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
    await _syncLanguageIds.call(this);
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
  const granted = [...(languageData?.granted || ['Basic'])];
  const backgroundBonus = [...(languageData?.backgroundBonus || [])];
  this.characterData.languages = [...granted, ...backgroundBonus];
  await _syncLanguageIds.call(this);

  SWSELogger.log('CharGen | Reset language selections');
  ui.notifications.info('Language selections have been reset to granted languages and background bonuses.');
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
  const customLanguage = await new Promise((resolve) => {
    const dialog = new CustomLanguageDialog(resolve);
    dialog.render(true);
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
  await _syncLanguageIds.call(this);
  SWSELogger.log(`CharGen | Added custom language: ${customLanguage}`);
  ui.notifications.info(`Added custom language: ${customLanguage}`);

  await this.render();
}


function _applyLanguageCardFilters(stepEl, query, category) {
  const q = String(query || '').trim().toLowerCase();
  const cat = String(category || '').trim();

  for (const card of stepEl.querySelectorAll('.language-card')) {
    const name = String(card.dataset.language || '').toLowerCase();
    const matchesQuery = !q || name.includes(q);
    const matchesCategory = !cat || card.dataset.category === cat;
    card.style.display = (matchesQuery && matchesCategory) ? '' : 'none';
  }

  for (const chip of stepEl.querySelectorAll('.language-chip')) {
    const target = chip.dataset.category || '';
    chip.classList.toggle('active', target === cat);
  }
}

/**
 * Bind card UX (flip + read) and inline filters for the Languages step.
 * Safe for AppV2: uses event delegation and idempotent binding per render.
 */
export function _bindLanguageCardUI(root) {
  const step = root.querySelector('.step-languages');
  if (!step) {return;}

  const search = step.querySelector('.language-search-input');
  const initialQuery = this.characterData.languageSearch || '';
  const initialCategory = this.characterData.languageCategoryFilter || '';

  if (search) {
    search.value = initialQuery;
    search.oninput = (ev) => {
      this.characterData.languageSearch = ev.currentTarget.value || '';
      _applyLanguageCardFilters(step, this.characterData.languageSearch, this.characterData.languageCategoryFilter);
    };
  }

  step.onclick = async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) {return;}

    const card = btn.closest('.language-card');

    if (btn.classList.contains('language-details-toggle')) {
      ev.preventDefault();
      if (card) {card.classList.toggle('is-flipped');}
      return;
    }

    if (btn.classList.contains('language-read')) {
      ev.preventDefault();
      const uuid = card?.dataset?.uuid;
      if (!uuid) {return;}
      const doc = await fromUuid(uuid);
      if (doc?.sheet) {doc.sheet.render(true);}
      return;
    }

    if (btn.classList.contains('language-chip')) {
      ev.preventDefault();
      const next = btn.dataset.category || '';
      this.characterData.languageCategoryFilter = next;
      _applyLanguageCardFilters(step, this.characterData.languageSearch, this.characterData.languageCategoryFilter);
    }
  };

  _applyLanguageCardFilters(step, initialQuery, initialCategory);
}

/**
 * Custom Language Input Dialog (AppV2-based)
 * Prompts user for a custom language name with explanatory text
 */
class CustomLanguageDialog extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'swse-custom-language-dialog',
    tag: 'div',
    window: { icon: 'fa-solid fa-language', title: 'Add Custom Language' },
    position: { width: 400, height: 'auto' }
  };

  static PARTS = {
    content: { template: 'systems/foundryvtt-swse/templates/apps/chargen-custom-language.hbs' }
  };

  constructor(resolve) {
    super();
    this.resolveDialog = resolve;
  }

  _prepareContext(options) {
    return {};
  }

  activateListeners(html) {
    super.activateListeners(html);
    const input = html.querySelector('#custom-language-input');

    html.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
      const value = input?.value?.trim();
      if (this.resolveDialog) this.resolveDialog(value || null);
      this.close();
    });

    html.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      if (this.resolveDialog) this.resolveDialog(null);
      this.close();
    });

    // Allow Enter to submit
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const value = input.value?.trim();
        if (this.resolveDialog) this.resolveDialog(value || null);
        this.close();
      }
    });
  }
}
