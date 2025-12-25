// ============================================
// Species selection and traits for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';

// Store the currently previewed species name for confirmation
let _previewedSpeciesName = null;

// Cache for Ol' Salty dialogues
let _olSaltyDialogues = null;

/**
 * Load Ol' Salty species dialogues from JSON
 */
async function loadOlSaltyDialogues() {
  if (_olSaltyDialogues) return _olSaltyDialogues;

  try {
    const response = await fetch('systems/foundryvtt-swse/data/ol-salty-species-dialogues.json');
    if (response.ok) {
      _olSaltyDialogues = await response.json();
      SWSELogger.log("CharGen | Loaded Ol' Salty dialogues");
    } else {
      _olSaltyDialogues = {};
    }
  } catch (err) {
    SWSELogger.warn("CharGen | Failed to load Ol' Salty dialogues:", err);
    _olSaltyDialogues = {};
  }

  return _olSaltyDialogues;
}

/**
 * Get Ol' Salty dialogue for a species
 */
function getOlSaltyDialogue(speciesName) {
  if (!_olSaltyDialogues) return null;

  // Try exact match first
  if (_olSaltyDialogues[speciesName]) {
    return _olSaltyDialogues[speciesName];
  }

  // Try case-insensitive match
  const lowerName = speciesName.toLowerCase();
  for (const [key, value] of Object.entries(_olSaltyDialogues)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  return null;
}

/**
 * Handle species card click - opens expanded preview
 */
export async function _onPreviewSpecies(event) {
  event.preventDefault();
  event.stopPropagation();

  // Load dialogues if not already loaded
  await loadOlSaltyDialogues();

  const button = event.currentTarget;
  const speciesName = button.dataset.species;
  const size = button.dataset.size || "Medium";
  const speed = button.dataset.speed || "6";
  const abilities = button.dataset.abilities || "";

  // Parse JSON data attributes
  let skillBonuses = [];
  let special = [];
  let racialTraits = [];

  try {
    skillBonuses = JSON.parse(button.dataset.skillBonuses || "[]") || [];
  } catch (e) {
    skillBonuses = [];
  }

  try {
    special = JSON.parse(button.dataset.special || "[]") || [];
  } catch (e) {
    special = [];
  }

  try {
    racialTraits = JSON.parse(button.dataset.racialTraits || "[]") || [];
  } catch (e) {
    racialTraits = [];
  }

  // Store for confirmation
  _previewedSpeciesName = speciesName;

  // Populate the expanded card
  const overlay = this.element.find('#species-overlay');
  overlay.find('#expanded-species-name').text(speciesName);
  overlay.find('#expanded-species-size').text(size);
  overlay.find('#expanded-species-speed').text(`${speed} squares`);

  // Update Ol' Salty dialogue
  const dialogue = getOlSaltyDialogue(speciesName);
  const dialogueElement = overlay.find('#ol-salty-dialogue');
  if (dialogue) {
    dialogueElement.text(`"${dialogue}"`);
    overlay.find('#ol-salty-banner').show();
  } else {
    dialogueElement.text('"Well, well... let\'s see what you\'ve got."');
    overlay.find('#ol-salty-banner').show();
  }

  // Parse and display ability modifiers
  const abilitiesContainer = overlay.find('#expanded-species-abilities');
  abilitiesContainer.empty();

  if (abilities) {
    // Parse abilities string like "+2 Dexterity, -2 Charisma"
    const abilityParts = abilities.split(/,\s*/);
    abilityParts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed.startsWith('+')) {
        abilitiesContainer.append(`<span class="ability-bonus">${trimmed}</span>`);
      } else if (trimmed.startsWith('-')) {
        abilitiesContainer.append(`<span class="ability-penalty">${trimmed}</span>`);
      } else if (trimmed) {
        abilitiesContainer.append(`<span class="ability-bonus">${trimmed}</span>`);
      }
    });
  } else {
    abilitiesContainer.append('<span class="ability-bonus">No modifiers (versatile)</span>');
  }

  // Show/hide abilities section
  const abilitiesSection = overlay.find('#expanded-abilities-section');
  abilitiesSection.show();

  // Display skill bonuses
  const skillsList = overlay.find('#expanded-species-skills');
  skillsList.empty();

  if (skillBonuses && skillBonuses.length > 0) {
    skillBonuses.forEach(skill => {
      skillsList.append(`<li>${skill}</li>`);
    });
    overlay.find('#expanded-skills-section').show();
  } else {
    overlay.find('#expanded-skills-section').hide();
  }

  // Display special abilities (combine special and racialTraits)
  const specialList = overlay.find('#expanded-species-special');
  specialList.empty();

  const allSpecial = [...(special || []), ...(racialTraits || [])];

  if (allSpecial.length > 0) {
    allSpecial.forEach(trait => {
      if (trait && typeof trait === 'string') {
        specialList.append(`<li>${trait}</li>`);
      }
    });
    overlay.find('#expanded-special-section').show();
  } else {
    overlay.find('#expanded-special-section').hide();
  }

  // Display a quick summary of key mechanical effects
  const summaryList = overlay.find('#expanded-species-summary');
  if (summaryList && summaryList.length > 0) {
    summaryList.empty();

    // Summarize key mechanical effects
    const summary = [];

    // Ability modifiers
    if (abilities && abilities !== "None") {
      summary.push(`Attributes: ${abilities}`);
    }

    // Speed
    if (speed) {
      summary.push(`Speed: ${speed} squares`);
    }

    // Size
    if (size && size !== "Medium") {
      summary.push(`Size: ${size}`);
    }

    if (summary.length > 0) {
      summary.forEach(item => {
        summaryList.append(`<li><strong>${item}</strong></li>`);
      });
    }
  }

  // Show the overlay with animation
  overlay.addClass('active');

  SWSELogger.log(`CharGen | Previewing species: ${speciesName}`);
}

/**
 * Handle confirm button click in expanded species card
 */
export async function _onConfirmSpecies(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!_previewedSpeciesName) {
    SWSELogger.warn("CharGen | No species previewed to confirm");
    return;
  }

  // Close the overlay
  this._onCloseSpeciesOverlay(event);

  // Create a synthetic event with the species data for _onSelectSpecies
  const syntheticEvent = {
    preventDefault: () => {},
    currentTarget: {
      dataset: {
        species: _previewedSpeciesName
      }
    }
  };

  // Call the original species selection handler
  await this._onSelectSpecies(syntheticEvent);

  _previewedSpeciesName = null;
}

/**
 * Handle closing the species overlay (back button or close button)
 */
export function _onCloseSpeciesOverlay(event) {
  event.preventDefault();
  event.stopPropagation();

  const overlay = this.element.find('#species-overlay');
  overlay.removeClass('active');

  _previewedSpeciesName = null;

  SWSELogger.log("CharGen | Closed species preview overlay");
}

/**
 * Handle clicking on the overlay backdrop (outside the card)
 */
export function _onSpeciesOverlayBackdropClick(event) {
  // Only close if clicking directly on the overlay, not on the card
  if (event.target.id === 'species-overlay') {
    this._onCloseSpeciesOverlay(event);
  }
}

/**
 * Handle species selection
 */
export async function _onSelectSpecies(event) {
  event.preventDefault();
  const speciesKey = event.currentTarget.dataset.species;

  SWSELogger.log(`CharGen | Attempting to select species: ${speciesKey}`);

  // If changing species after initial selection, confirm with user
  if (this.characterData.species && this.characterData.species !== speciesKey) {
    const confirmed = await Dialog.confirm({
      title: "Change Species?",
      content: `
        <p>Changing your species will reset:</p>
        <ul>
          <li>Ability score bonuses</li>
          <li>Size modifiers</li>
          <li>Speed and special abilities</li>
          <li>Languages and racial skill bonuses</li>
        </ul>
        <p>Continue with this change?</p>
      `,
      defaultYes: false
    });
    if (!confirmed) return;

    // Clear previous species data
    this._clearSpeciesData();
  }

  // Find the species document
  if (!this._packs.species) {
    SWSELogger.log("CharGen | Species pack not loaded, loading now...");
    const loaded = await this._loadData();
    if (loaded === false) {
      // Critical packs missing, chargen will close
      return;
    }
  }

  SWSELogger.log(`CharGen | Species pack contains ${this._packs.species?.length || 0} species`);

  if (!this._packs.species || this._packs.species.length === 0) {
    SWSELogger.error("CharGen | Species pack is empty or failed to load!");
    ui.notifications.error("Species data failed to load. Please refresh the page.");
    return;
  }

  const speciesDoc = this._packs.species.find(s => s.name === speciesKey || s._id === speciesKey);

  if (!speciesDoc) {
    SWSELogger.error(`CharGen | Species not found: ${speciesKey}`);
    SWSELogger.log(`CharGen | Available species:`, this._packs.species.map(s => s.name));
    ui.notifications.error(`Species "${speciesKey}" not found in database!`);
    return;
  }

  SWSELogger.log(`CharGen | Found species: ${speciesDoc.name}`, speciesDoc);

  this.characterData.species = speciesKey;

  // Apply all species data
  this._applySpeciesData(speciesDoc);

  this._recalcAbilities();
  await this._onNextStep(event);
}

/**
 * Apply all species data to character
 * @param {Object} speciesDoc - Species document from compendium
 * @throws {Error} If species document is invalid
 */
export function _applySpeciesData(speciesDoc) {
  // Validate species document
  if (!speciesDoc || typeof speciesDoc !== 'object') {
    SWSELogger.error("CharGen | Invalid species document provided to _applySpeciesData");
    throw new Error("Invalid species document");
  }

  const system = speciesDoc.system || {};
  const speciesName = speciesDoc.name || "Unknown";

  try {
    // 1. Apply ability score modifiers
    const abilityBonuses = this._parseAbilityString(system.abilities || "None");

    // Validate that bonuses are reasonable (SWSE standard is ±2 to ±4)
    for (const [ability, bonus] of Object.entries(abilityBonuses)) {
      if (Math.abs(bonus) > 6) {
        SWSELogger.warn(`CharGen | Unusual ability bonus for ${speciesName}: ${ability} ${bonus}`);
      }
      if (this.characterData.abilities[ability]) {
        this.characterData.abilities[ability].racial = bonus;
      }
    }

    // 2. Apply speed (validate it's a positive number)
    if (system.speed) {
      const speed = Number(system.speed);
      if (!isNaN(speed) && speed > 0) {
        this.characterData.speed = speed;
      } else {
        SWSELogger.warn(`CharGen | Invalid speed value for ${speciesName}: ${system.speed}`);
      }
    }

    // 3. Store size and apply size modifiers
    this.characterData.size = system.size || "Medium";
    this._applySizeModifiers(this.characterData.size);

    // 4. Store special abilities (ensure it's an array)
    this.characterData.specialAbilities = Array.isArray(system.special) ? system.special :
                                          (system.special ? [system.special] : []);

    // 5. Check for Human racial bonuses and NPC status
    const isNPC = this.actorType === "npc";
    const isHuman = speciesName.toLowerCase() === "human";

    if (isNPC) {
      // NONHEROIC RULE: Nonheroic characters get 3 starting feats
      // Non-human nonheroic characters get 2 feats (remove 1 for no human bonus)
      this.characterData.featsRequired = isHuman ? 3 : 2;
    } else {
      // PCs: Humans get 2 feats, all other species get 1
      this.characterData.featsRequired = isHuman ? 2 : 1;
    }

    // 6. Store languages (ensure it's an array)
    this.characterData.languages = Array.isArray(system.languages) ? system.languages :
                                   (system.languages ? [system.languages] : []);

    // 7. Store and apply racial skill bonuses (ensure it's an array)
    const skillBonuses = Array.isArray(system.skillBonuses) ? system.skillBonuses : [];
    this.characterData.racialSkillBonuses = skillBonuses;
    this._applyRacialSkillBonuses(skillBonuses);

    // 8. Store source
    this.characterData.speciesSource = system.source || "";

    SWSELogger.log(`CharGen | Successfully applied species data for ${speciesName}:`, {
      abilities: abilityBonuses,
      speed: this.characterData.speed,
      size: this.characterData.size,
      specialAbilitiesCount: this.characterData.specialAbilities.length,
      languagesCount: this.characterData.languages.length,
      skillBonusesCount: this.characterData.racialSkillBonuses.length,
      featsRequired: this.characterData.featsRequired
    });
  } catch (err) {
    SWSELogger.error(`CharGen | Error applying species data for ${speciesName}:`, err);
    throw err;
  }
}

/**
 * Parse and apply racial skill bonuses to character skills
 * @param {Array<string>} bonuses - Array of skill bonus strings like ["+2 Perception", "+2 Stealth"]
 */
export function _applyRacialSkillBonuses(bonuses) {
  if (!bonuses || bonuses.length === 0) return;

  // Skill name mapping from display names to skill keys
  const skillNameMap = {
    'acrobatics': 'acrobatics',
    'climb': 'climb',
    'deception': 'deception',
    'endurance': 'endurance',
    'gather information': 'gatherInformation',
    'initiative': 'initiative',
    'jump': 'jump',
    'knowledge': 'knowledge', // Generic knowledge
    'knowledge (galactic lore)': 'knowledge',
    'knowledge (life sciences)': 'knowledge',
    'mechanics': 'mechanics',
    'perception': 'perception',
    'persuasion': 'persuasion',
    'pilot': 'pilot',
    'stealth': 'stealth',
    'survival': 'survival',
    'swim': 'swim',
    'treat injury': 'treatInjury',
    'use computer': 'useComputer',
    'use the force': 'useTheForce'
  };

  for (const bonusString of bonuses) {
    // Parse bonus string like "+2 Perception" or "+2 Knowledge (Galactic Lore)"
    const match = bonusString.match(/([+-]?\d+)\s+(.+)/i);
    if (!match) continue;

    const bonusValue = parseInt(match[1]);
    const skillName = match[2].trim().toLowerCase();

    // Find matching skill key
    const skillKey = skillNameMap[skillName];
    if (!skillKey) {
      SWSELogger.warn(`CharGen | Unknown skill name in racial bonus: ${skillName}`);
      continue;
    }

    // Initialize skill if not exists
    if (!this.characterData.skills[skillKey]) {
      this.characterData.skills[skillKey] = {
        trained: false,
        focus: false,
        misc: 0
      };
    }

    // Apply racial bonus to misc field
    this.characterData.skills[skillKey].misc = (this.characterData.skills[skillKey].misc || 0) + bonusValue;

    SWSELogger.log(`CharGen | Applied racial skill bonus: ${skillName} ${bonusValue >= 0 ? '+' : ''}${bonusValue}`);
  }
}

/**
 * Apply size modifiers to character defenses and skills
 * @param {string} size - Character size (Small, Medium, Large, etc.)
 */
export function _applySizeModifiers(size) {
  // Size modifiers per SWSE rules
  const sizeModifiers = {
    "Fine": { reflex: 8, stealth: 16 },
    "Diminutive": { reflex: 4, stealth: 12 },
    "Tiny": { reflex: 2, stealth: 8 },
    "Small": { reflex: 1, stealth: 5 },
    "Medium": { reflex: 0, stealth: 0 },
    "Large": { reflex: -1, stealth: -5 },
    "Huge": { reflex: -2, stealth: -10 },
    "Gargantuan": { reflex: -5, stealth: -12 },
    "Colossal": { reflex: -10, stealth: -16 }
  };

  const modifiers = sizeModifiers[size] || sizeModifiers["Medium"];

  // Apply Reflex Defense modifier
  if (this.characterData.defenses && this.characterData.defenses.reflex) {
    this.characterData.defenses.reflex.misc = (this.characterData.defenses.reflex.misc || 0) + modifiers.reflex;
  }

  // Apply Stealth skill modifier
  if (!this.characterData.skills.stealth) {
    this.characterData.skills.stealth = {
      trained: false,
      focus: false,
      misc: 0
    };
  }
  this.characterData.skills.stealth.misc = (this.characterData.skills.stealth.misc || 0) + modifiers.stealth;

  SWSELogger.log(`CharGen | Applied size modifiers for ${size}: Reflex ${modifiers.reflex >= 0 ? '+' : ''}${modifiers.reflex}, Stealth ${modifiers.stealth >= 0 ? '+' : ''}${modifiers.stealth}`);
}

/**
 * Parse ability string like "+2 Dex, -2 Con" or "+4 Str, +2 Con, -2 Int, -2 Cha"
 * @param {string} abilityString - Ability modifier string
 * @returns {Object} Map of ability keys to numeric bonuses
 */
export function _parseAbilityString(abilityString) {
  const bonuses = {
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0
  };

  if (!abilityString || abilityString === "None" || abilityString === "none") {
    return bonuses;
  }

  // Map of ability name variations to keys
  const abilityMap = {
    'str': 'str', 'strength': 'str',
    'dex': 'dex', 'dexterity': 'dex',
    'con': 'con', 'constitution': 'con',
    'int': 'int', 'intelligence': 'int',
    'wis': 'wis', 'wisdom': 'wis',
    'cha': 'cha', 'charisma': 'cha'
  };

  // Split by comma and parse each part
  const parts = abilityString.split(',').map(p => p.trim());

  for (const part of parts) {
    if (!part) continue;

    // Try multiple patterns to handle various ability string formats
    // Pattern 1: "+2 Dex", "-2 Con", "+4 Str", etc. (value before ability)
    let match = part.match(/([+-]?\d+)\s*([a-zA-Z\s]+)/);
    if (match) {
      const value = parseInt(match[1]);
      const abilityName = match[2].toLowerCase().trim();
      const abilityKey = abilityMap[abilityName];

      if (abilityKey) {
        // Add to existing bonus if ability appears multiple times
        bonuses[abilityKey] += value;
        continue;
      }
    }

    // Pattern 2: "Dex +2", "Con -2", etc. (ability before value)
    match = part.match(/([a-zA-Z\s]+)([+-]?\d+)/);
    if (match) {
      const value = parseInt(match[2]);
      const abilityName = match[1].toLowerCase().trim();
      const abilityKey = abilityMap[abilityName];

      if (abilityKey) {
        bonuses[abilityKey] += value;
        continue;
      }
    }

    // Log warning if we couldn't parse this part (helps with debugging)
    if (part.length > 0) {
      SWSELogger.warn(`CharGen | Could not parse ability modifier: "${part}"`);
    }
  }

  return bonuses;
}

/**
 * Get racial bonuses for a species
 * @param {string} speciesName - Name of the species
 * @returns {Object} Map of ability keys to numeric bonuses
 */
export async function _getRacialBonuses(speciesName) {
  if (!this._packs.species) {
    const loaded = await this._loadData();
    if (loaded === false) {
      // Critical packs missing, return empty bonuses
      return {};
    }
  }

  if (!this._packs.species || this._packs.species.length === 0) {
    SWSELogger.error("CharGen | Species pack is empty in _getRacialBonuses");
    return {};
  }

  const found = this._packs.species.find(s => s.name === speciesName || s._id === speciesName);

  if (!found || !found.system) {
    return {};
  }

  // Parse the abilities string to get bonuses
  return this._parseAbilityString(found.system.abilities || "None");
}

/**
 * Clear previous species data when changing species
 */
export function _clearSpeciesData() {
  // Reset racial ability bonuses
  for (const ability of Object.keys(this.characterData.abilities)) {
    if (this.characterData.abilities[ability]) {
      this.characterData.abilities[ability].racial = 0;
    }
  }

  // Reset other species-specific data
  this.characterData.size = "Medium";
  this.characterData.speed = 6;
  this.characterData.specialAbilities = [];
  this.characterData.languages = [];

  // Clear size modifiers
  this._applySizeModifiers("Medium");
}

// Cache for chargen config
let _chargenConfig = null;

/**
 * Load chargen configuration from JSON file
 * @returns {Promise<Object>} Configuration object
 */
async function _loadChargenConfig() {
  if (_chargenConfig) return _chargenConfig;

  try {
    const response = await fetch('systems/foundryvtt-swse/data/chargen-config.json');
    if (response.ok) {
      _chargenConfig = await response.json();
      SWSELogger.log('CharGen | Loaded chargen configuration');
      return _chargenConfig;
    } else {
      SWSELogger.warn('CharGen | Failed to load chargen-config.json, using defaults');
    }
  } catch (error) {
    SWSELogger.error('CharGen | Error loading chargen-config.json:', error);
  }

  // Fallback to default config
  _chargenConfig = {
    speciesSourcePriority: [
      "Core", "Core Rulebook",
      "Knights of the Old Republic", "KotOR", "KOTOR",
      "Clone Wars", "Rebellion Era", "Legacy Era",
      "The Force Unleashed", "Galaxy at War",
      "Unknown Regions", "Scum and Villainy",
      "Threats of the Galaxy", "Jedi Academy"
    ]
  };

  return _chargenConfig;
}

/**
 * Sort species by source material, prioritizing Human first, then Core Rulebook
 * @param {Array} species - Array of species documents
 * @returns {Array} Sorted species array
 */
export function _sortSpeciesBySource(species) {
  if (!species || species.length === 0) return species;

  // Load config synchronously from cache (should be pre-loaded)
  const config = _chargenConfig || {
    speciesSourcePriority: ["Core", "Core Rulebook"]
  };

  // Build source priority map from config
  const sourcePriority = {};
  config.speciesSourcePriority.forEach((source, index) => {
    sourcePriority[source] = index;
  });

  // Sort species
  return species.sort((a, b) => {
    const nameA = a.name || "";
    const nameB = b.name || "";

    // PRIORITY 1: Human always comes first
    const isHumanA = nameA.toLowerCase() === "human";
    const isHumanB = nameB.toLowerCase() === "human";

    if (isHumanA && !isHumanB) return -1;
    if (!isHumanA && isHumanB) return 1;

    const sourceA = a.system?.source || "Unknown";
    const sourceB = b.system?.source || "Unknown";

    // Get priority (default to 999 for unknown sources)
    const priorityA = sourcePriority[sourceA] ?? 999;
    const priorityB = sourcePriority[sourceB] ?? 999;

    // PRIORITY 2: Sort by source priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // PRIORITY 3: If same priority (or both unknown), sort by source name alphabetically
    if (sourceA !== sourceB) {
      return sourceA.localeCompare(sourceB);
    }

    // PRIORITY 4: Within same source, sort by species name alphabetically
    return nameA.localeCompare(nameB);
  });
}

/**
 * Filter species by attribute bonuses, penalties, and size
 * @param {Array} species - Array of species documents
 * @param {Object} filters - Filter criteria {attributeBonus, attributePenalty, size}
 * @returns {Array} Filtered species array
 */
export function _filterSpecies(species, filters) {
  if (!species || species.length === 0) return species;
  if (!filters) return species;

  const { attributeBonus, attributePenalty, size } = filters;

  // If no filters are active, return all species
  if (!attributeBonus && !attributePenalty && !size) {
    return species;
  }

  return species.filter(speciesDoc => {
    const system = speciesDoc.system || {};

    // Filter by size
    if (size && system.size !== size) {
      return false;
    }

    // Parse abilities to check bonuses and penalties
    if (attributeBonus || attributePenalty) {
      // Use shared parsing function to avoid duplication
      const abilityString = system.abilities || "None";
      const abilities = _parseAbilityString.call(this, abilityString);

      // Filter by attribute bonus
      if (attributeBonus) {
        const bonus = abilities[attributeBonus];
        if (!bonus || bonus <= 0) {
          return false;
        }
      }

      // Filter by attribute penalty
      if (attributePenalty) {
        const penalty = abilities[attributePenalty];
        if (!penalty || penalty >= 0) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Handle species filter change
 */
export async function _onSpeciesFilterChange(event) {
  event.preventDefault();
  const filterType = event.currentTarget.dataset.filter;
  const value = event.currentTarget.value || null;

  // Update the filter in characterData
  if (this.characterData.speciesFilters) {
    this.characterData.speciesFilters[filterType] = value;
  }

  // Update filter UI indicators
  this._updateFilterIndicators();

  // Re-render to apply filters
  this.render();
}

/**
 * Update visual indicators for active filters
 */
function _updateFilterIndicators() {
  const filters = this.characterData.speciesFilters || {};
  const hasActiveFilters = Object.values(filters).some(v => v !== null && v !== '');

  const filterHeader = document.querySelector('.filter-header');
  if (filterHeader) {
    if (hasActiveFilters) {
      filterHeader.classList.add('has-active-filters');
    } else {
      filterHeader.classList.remove('has-active-filters');
    }
  }

  // Update count badge if available
  const activeCount = Object.values(filters).filter(v => v !== null && v !== '').length;
  const badge = document.querySelector('.filter-badge');
  if (badge) {
    if (activeCount > 0) {
      badge.textContent = activeCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

/**
 * Clear all species filters
 */
export async function _onClearSpeciesFilters(event) {
  event.preventDefault();

  // Reset all filters
  this.characterData.speciesFilters = {
    attributeBonus: null,
    attributePenalty: null,
    size: null
  };

  // Re-render to show all species
  this.render();
}

// ============================================
// Near-Human Builder - Official SWSE Rules
// ============================================

// Near-Human builder state - Official system
let _nearHumanState = {
  traitId: null,          // Selected trait ID from 24 official traits
  sacrifice: null,        // "feat" or "skill" - which human bonus to trade
  variants: [],           // Array of variant IDs (0-3 allowed)
  customAbilityChoices: null,  // For Ability Adjustment trait: {str, dex, con, int, wis, cha} with values from -1 to +1
  abilityAdjustments: {   // Track ability adjustments for Ability Adjustment trait
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0
  }
};

// Cache for loaded traits data
let _nearHumanTraitsData = null;
let _nearHumanHouseRulesData = null;

/**
 * Load official Near-Human traits from JSON and optional house rules
 */
async function loadNearHumanTraitsData() {
  if (_nearHumanTraitsData) return _nearHumanTraitsData;

  try {
    // Load official traits
    const response = await fetch('systems/foundryvtt-swse/data/near-human-traits.json');
    if (!response.ok) {
      SWSELogger.error("CharGen | Failed to load near-human-traits.json");
      return { traits: [], variants: [] };
    }

    _nearHumanTraitsData = await response.json();
    SWSELogger.log("CharGen | Loaded official Near-Human traits data");

    // Load house rules if available
    await loadNearHumanHouseRules();

    // Merge house rules if enabled
    if (_nearHumanHouseRulesData && _nearHumanHouseRulesData.enabled) {
      if (_nearHumanHouseRulesData.traits && Array.isArray(_nearHumanHouseRulesData.traits)) {
        _nearHumanTraitsData.traits = [
          ..._nearHumanTraitsData.traits,
          ..._nearHumanHouseRulesData.traits
        ];
        SWSELogger.log(`CharGen | Added ${_nearHumanHouseRulesData.traits.length} house rule traits`);
      }

      if (_nearHumanHouseRulesData.variants && Array.isArray(_nearHumanHouseRulesData.variants)) {
        _nearHumanTraitsData.variants = [
          ..._nearHumanTraitsData.variants,
          ..._nearHumanHouseRulesData.variants
        ];
        SWSELogger.log(`CharGen | Added ${_nearHumanHouseRulesData.variants.length} house rule variants`);
      }
    }

    return _nearHumanTraitsData;
  } catch (err) {
    SWSELogger.error("CharGen | Error loading near-human-traits.json:", err);
    return { traits: [], variants: [] };
  }
}

/**
 * Load house rules configuration for Near-Human traits
 */
async function loadNearHumanHouseRules() {
  if (_nearHumanHouseRulesData) return _nearHumanHouseRulesData;

  try {
    const response = await fetch('systems/foundryvtt-swse/data/near-human-houserules.json');
    if (response.ok) {
      _nearHumanHouseRulesData = await response.json();
      if (_nearHumanHouseRulesData.enabled) {
        SWSELogger.log("CharGen | House rules enabled for Near-Human traits");
      } else {
        SWSELogger.log("CharGen | House rules available but disabled for Near-Human traits");
      }
      return _nearHumanHouseRulesData;
    } else {
      _nearHumanHouseRulesData = { enabled: false, traits: [], variants: [] };
      return _nearHumanHouseRulesData;
    }
  } catch (err) {
    SWSELogger.warn("CharGen | House rules file not found or error loading", err);
    _nearHumanHouseRulesData = { enabled: false, traits: [], variants: [] };
    return _nearHumanHouseRulesData;
  }
}

/**
 * Get a trait by ID
 */
function getNearHumanTrait(traitId) {
  if (!_nearHumanTraitsData) return null;
  return _nearHumanTraitsData.traits.find(t => t.id === traitId);
}

/**
 * Get a variant by ID
 */
function getNearHumanVariant(variantId) {
  if (!_nearHumanTraitsData) return null;
  return _nearHumanTraitsData.variants.find(v => v.id === variantId);
}

/**
 * Reset Near-Human builder state
 */
function resetNearHumanState() {
  _nearHumanState = {
    traitId: null,
    sacrifice: null,
    variants: [],
    customAbilityChoices: null,
    abilityAdjustments: {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0
    }
  };
}

/**
 * Validate Near-Human configuration per official rules
 */
function validateNearHuman() {
  const hasTrait = _nearHumanState.traitId !== null;
  const hasSacrifice = _nearHumanState.sacrifice !== null;
  const validVariantCount = _nearHumanState.variants.length <= 3;

  // Check ability adjustments if Ability Adjustment trait is selected
  let abilityAdjustmentsValid = true;
  if (_nearHumanState.traitId === 'abilityAdjustment') {
    const total = Object.values(_nearHumanState.abilityAdjustments).reduce((sum, val) => sum + val, 0);
    abilityAdjustmentsValid = total === 0;
  }

  return {
    hasTrait: hasTrait,
    hasSacrifice: hasSacrifice,
    validVariantCount: validVariantCount,
    abilityAdjustmentsValid: abilityAdjustmentsValid,
    isValid: hasTrait &&
             hasSacrifice &&
             validVariantCount &&
             abilityAdjustmentsValid
  };
}

/**
 * Update Near-Human builder UI
 */
function updateNearHumanUI(overlay) {
  const validation = validateNearHuman();

  // Update selected trait display
  const traitDisplay = overlay.find('#selected-trait');
  if (_nearHumanState.traitId) {
    const trait = getNearHumanTrait(_nearHumanState.traitId);
    if (trait) {
      traitDisplay.html(`<strong>${trait.name}</strong> (${trait.type})<br/><em>${trait.description}</em>`);
    }
  } else {
    traitDisplay.html('<span class="placeholder">Select a trait above</span>');
  }

  // Update selected sacrifice display
  const sacrificeDisplay = overlay.find('#selected-sacrifice');
  const sacrificeLabels = {
    feat: "Lose your bonus Feat at 1st level",
    skill: "Lose your bonus Trained Skill"
  };
  if (_nearHumanState.sacrifice) {
    sacrificeDisplay.html(`<strong>${_nearHumanState.sacrifice === 'feat' ? 'Bonus Feat' : 'Bonus Trained Skill'}:</strong> ${sacrificeLabels[_nearHumanState.sacrifice]}`);
  } else {
    sacrificeDisplay.html('<span class="placeholder">Choose which human bonus to trade</span>');
  }

  // Update variant display
  const variantDisplay = overlay.find('#selected-variants');
  if (_nearHumanState.variants.length > 0) {
    const variantNames = _nearHumanState.variants.map(vid => {
      const v = getNearHumanVariant(vid);
      return v ? v.name : vid;
    }).join(', ');
    variantDisplay.html(`<strong>Selected (${_nearHumanState.variants.length}/3):</strong> ${variantNames}`);
  } else {
    variantDisplay.html('<span class="placeholder">No variants selected (optional)</span>');
  }

  // Update validation message
  const validationEl = overlay.find('.validation-message');
  if (validation.isValid) {
    validationEl.text('Near-Human is ready!').removeClass('error').addClass('success');
    overlay.find('#near-human-confirm-btn').prop('disabled', false);
  } else {
    const missing = [];
    if (!validation.hasTrait) missing.push('trait');
    if (!validation.hasSacrifice) missing.push('sacrifice');
    if (_nearHumanState.traitId === 'abilityAdjustment' && !validation.abilityAdjustmentsValid) {
      missing.push('ability adjustments must sum to 0');
    }
    validationEl.text(`Missing: ${missing.join(', ')}`).removeClass('success').addClass('error');
    overlay.find('#near-human-confirm-btn').prop('disabled', true);
  }
}

/**
 * Open Near-Human builder overlay and render UI
 */
export async function _onOpenNearHumanBuilder(event) {
  event.preventDefault();
  event.stopPropagation();

  // Load official traits if not already loaded
  await loadNearHumanTraitsData();

  resetNearHumanState();

  const overlay = this.element.find('#near-human-overlay');

  // Populate traits list
  _renderNearHumanTraits(overlay);

  // Populate variants list
  _renderNearHumanVariants(overlay);

  // Clear previous selections
  overlay.find('.trait-btn, .sacrifice-radio, .variant-checkbox').prop('checked', false).removeClass('selected');

  // Reset display
  updateNearHumanUI(overlay);

  // Show overlay
  overlay.addClass('active');

  SWSELogger.log("CharGen | Opened Near-Human builder with official SWSE traits");
}

/**
 * Render traits UI from loaded data
 */
function _renderNearHumanTraits(overlay) {
  if (!_nearHumanTraitsData || !_nearHumanTraitsData.traits) return;

  const traitsList = overlay.find('#traits-list');
  traitsList.empty();

  // Group traits by type for better organization
  const traitsByType = {};
  for (const trait of _nearHumanTraitsData.traits) {
    if (!traitsByType[trait.type]) {
      traitsByType[trait.type] = [];
    }
    traitsByType[trait.type].push(trait);
  }

  // Render traits organized by type
  const typeLabels = {
    'customAbilities': 'Ability Customization',
    'sense': 'Sensory',
    'movement': 'Movement',
    'physiology': 'Physical',
    'combat': 'Combat',
    'skill': 'Skills',
    'defense': 'Defense',
    'force': 'Force',
    'augmentation': 'Augmentation',
    'environmental': 'Environmental',
    'charisma': 'Charisma'
  };

  for (const [type, traits] of Object.entries(traitsByType)) {
    const typeLabel = typeLabels[type] || type;
    const typeGroup = $('<div class="trait-type-group"></div>');
    typeGroup.append(`<h4 class="trait-type-header">${typeLabel}</h4>`);

    for (const trait of traits) {
      const isHouseRule = trait.category === 'houserule';
      const badge = isHouseRule ? '<span class="houserule-badge" title="House Rule - Optional">⚙️ HR</span>' : '';

      const btn = $(`
        <button type="button" class="trait-btn ${isHouseRule ? 'houserule-trait' : ''}" data-trait-id="${trait.id}">
          ${badge}
          <strong>${trait.name}</strong>
          <span class="trait-description">${trait.description}</span>
        </button>
      `);
      typeGroup.append(btn);
    }

    traitsList.append(typeGroup);
  }
}

/**
 * Render variants UI from loaded data
 */
function _renderNearHumanVariants(overlay) {
  if (!_nearHumanTraitsData || !_nearHumanTraitsData.variants) return;

  const variantsList = overlay.find('#variants-list');
  variantsList.empty();

  for (const variant of _nearHumanTraitsData.variants) {
    const isHouseRule = variant.category === 'houserule';
    const badge = isHouseRule ? '<span class="houserule-badge" title="House Rule - Optional">⚙️ HR</span>' : '';

    const label = $(`
      <label class="variant-checkbox-label ${isHouseRule ? 'houserule-variant' : ''}">
        <input type="checkbox" class="variant-checkbox" value="${variant.id}">
        ${badge}
        <strong>${variant.name}</strong>
        <span class="variant-description">${variant.description}</span>
      </label>
    `);
    variantsList.append(label);
  }
}

/**
 * Render ability adjustment controls for Ability Adjustment trait
 */
function _renderAbilityAdjustments(overlay) {
  const section = overlay.find('#ability-adjustment-section');
  const container = overlay.find('#ability-adjustments');
  container.empty();

  const abilityLabels = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma'
  };

  for (const [ability, label] of Object.entries(abilityLabels)) {
    const adjustment = _nearHumanState.abilityAdjustments[ability] || 0;
    const displayValue = adjustment >= 0 ? `+${adjustment}` : `${adjustment}`;

    const row = $(`
      <div class="ability-adjustment-row">
        <label class="ability-label">${label}</label>
        <div class="adjustment-controls">
          <button type="button" class="ability-minus-btn" data-ability="${ability}" title="Decrease by 1">
            <i class="fas fa-minus"></i>
          </button>
          <span class="adjustment-value">${displayValue}</span>
          <button type="button" class="ability-plus-btn" data-ability="${ability}" title="Increase by 1">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </div>
    `);
    container.append(row);
  }

  // Show section if Ability Adjustment trait is selected
  const isAbilityAdjustmentSelected = _nearHumanState.traitId === 'abilityAdjustment';
  if (isAbilityAdjustmentSelected) {
    section.show();
  } else {
    section.hide();
  }
}

/**
 * Update ability adjustment total display
 */
function _updateAbilityAdjustmentTotal(overlay) {
  const adjustments = _nearHumanState.abilityAdjustments;
  const total = Object.values(adjustments).reduce((sum, val) => sum + val, 0);
  overlay.find('#adjustment-total-value').text(total);
}

/**
 * Handle ability adjustment button clicks
 */
export function _onAdjustNearHumanAbility(event) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  const ability = button.dataset.ability;
  const isPlus = button.classList.contains('ability-plus-btn');

  if (!ability) return;

  // Adjust the value (allow -1 to +1 range only)
  const current = _nearHumanState.abilityAdjustments[ability] || 0;
  const newValue = isPlus ? current + 1 : current - 1;

  // Clamp to -1 to +1 range
  if (newValue >= -1 && newValue <= 1) {
    _nearHumanState.abilityAdjustments[ability] = newValue;
  } else {
    ui.notifications.warn("Ability adjustments must be between -1 and +1");
    return;
  }

  const overlay = this.element.find('#near-human-overlay');

  // Re-render adjustment controls to show new values
  _renderAbilityAdjustments(overlay);
  _updateAbilityAdjustmentTotal(overlay);

  // Reattach event listeners to new buttons
  overlay.find('.ability-plus-btn, .ability-minus-btn').off('click').click(this._onAdjustNearHumanAbility.bind(this));
}

/**
 * Handle trait selection (only one trait allowed)
 */
export function _onSelectNearHumanTrait(event) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  const traitId = button.dataset.traitId;

  if (!traitId) return;

  // Single selection - only one trait allowed
  const overlay = this.element.find('#near-human-overlay');
  overlay.find('.trait-btn').removeClass('selected');

  if (_nearHumanState.traitId === traitId) {
    _nearHumanState.traitId = null;
    $(button).removeClass('selected');
  } else {
    _nearHumanState.traitId = traitId;
    $(button).addClass('selected');
  }

  // Show/hide ability adjustment section based on trait selection
  _renderAbilityAdjustments(overlay);
  _updateAbilityAdjustmentTotal(overlay);

  // Reattach event listeners to ability adjustment buttons
  overlay.find('.ability-plus-btn, .ability-minus-btn').off('click').click(this._onAdjustNearHumanAbility.bind(this));

  updateNearHumanUI(overlay);
}

/**
 * Handle sacrifice selection (which human bonus to trade)
 */
export function _onSelectNearHumanSacrifice(event) {
  const radio = event.currentTarget;
  _nearHumanState.sacrifice = radio.value;

  const overlay = this.element.closest('#near-human-overlay') || $(document).find('#near-human-overlay');
  updateNearHumanUI(overlay);
}

/**
 * Handle variant selection (0-3 optional cosmetic variants)
 */
export function _onToggleNearHumanVariant(event) {
  event.preventDefault();
  event.stopPropagation();

  const checkbox = event.currentTarget;
  const variantId = checkbox.value;

  const overlay = this.element.find('#near-human-overlay');

  if (checkbox.checked) {
    // Add variant if not already selected and limit not exceeded
    if (_nearHumanState.variants.length < 3 && !_nearHumanState.variants.includes(variantId)) {
      _nearHumanState.variants.push(variantId);
    } else if (_nearHumanState.variants.length >= 3) {
      // Revert checkbox if limit exceeded
      checkbox.checked = false;
      ui.notifications.warn("Near-Human variants limited to 3 maximum");
      return;
    }
  } else {
    // Remove variant
    _nearHumanState.variants = _nearHumanState.variants.filter(v => v !== variantId);
  }

  updateNearHumanUI(overlay);
}

/**
 * Randomize Near-Human selection
 */
export function _onRandomizeNearHuman(event) {
  event.preventDefault();
  event.stopPropagation();

  const overlay = this.element.find('#near-human-overlay');

  if (!_nearHumanTraitsData || !_nearHumanTraitsData.traits || _nearHumanTraitsData.traits.length === 0) {
    ui.notifications.warn("Trait data not loaded yet");
    return;
  }

  // Randomly select one trait
  const randomTrait = _nearHumanTraitsData.traits[Math.floor(Math.random() * _nearHumanTraitsData.traits.length)];
  _nearHumanState.traitId = randomTrait.id;

  // Randomly choose sacrifice (feat or skill)
  _nearHumanState.sacrifice = Math.random() > 0.5 ? 'feat' : 'skill';

  // Randomly select 0-3 variants
  const availableVariants = _nearHumanTraitsData.variants || [];
  const variantCount = Math.floor(Math.random() * 4); // 0-3
  _nearHumanState.variants = [];

  if (availableVariants.length > 0 && variantCount > 0) {
    // Create a shuffled copy of available variants
    const shuffled = [...availableVariants].sort(() => 0.5 - Math.random());
    _nearHumanState.variants = shuffled.slice(0, variantCount).map(v => v.id);
  }

  // Update trait button selections
  overlay.find('.trait-btn').removeClass('selected');
  overlay.find(`.trait-btn[data-trait-id="${_nearHumanState.traitId}"]`).addClass('selected');

  // Update sacrifice radio buttons
  overlay.find('.sacrifice-radio').prop('checked', false);
  overlay.find(`.sacrifice-radio[value="${_nearHumanState.sacrifice}"]`).prop('checked', true);

  // Update variant checkboxes
  overlay.find('.variant-checkbox').prop('checked', false);
  for (const variantId of _nearHumanState.variants) {
    overlay.find(`.variant-checkbox[value="${variantId}"]`).prop('checked', true);
  }

  // Update UI display
  updateNearHumanUI(overlay);

  SWSELogger.log("CharGen | Randomized Near-Human selection", _nearHumanState);
}

/**
 * Handle Near-Human confirmation (official SWSE rules)
 */
export async function _onConfirmNearHuman(event) {
  event.preventDefault();
  event.stopPropagation();

  const validation = validateNearHuman();
  if (!validation.isValid) {
    ui.notifications.warn("Please select a trait and sacrifice before confirming.");
    return;
  }

  // Get the selected trait
  const selectedTrait = getNearHumanTrait(_nearHumanState.traitId);
  if (!selectedTrait) {
    ui.notifications.error("Selected trait not found in Near-Human traits data.");
    return;
  }

  // Get selected variants
  const selectedVariants = _nearHumanState.variants.map(vid => getNearHumanVariant(vid)).filter(v => v !== null);

  // Store the official Near-Human data per SWSE rules
  this.characterData.species = "Near-Human";
  this.characterData.nearHumanData = {
    // Official SWSE Near-Human structure
    trait: {
      id: _nearHumanState.traitId,
      name: selectedTrait.name,
      description: selectedTrait.description,
      type: selectedTrait.type
    },
    sacrifice: _nearHumanState.sacrifice,  // "feat" or "skill"
    variants: selectedVariants.map(v => ({
      id: v.id,
      name: v.name,
      description: v.description,
      type: v.type
    })),
    // Store ability adjustments if using Ability Adjustment trait
    customAbilityChoices: _nearHumanState.traitId === 'abilityAdjustment' ? _nearHumanState.abilityAdjustments : null
  };

  // Near-Humans use standard Human traits unless modified by their selected trait
  // For now, apply default human parameters and let character sheet apply trait effects
  this.characterData.size = "Medium";
  this.characterData.speed = 6;
  this.characterData.specialAbilities = [];  // Handled by character sheet

  // Apply ability adjustments if using Ability Adjustment trait
  if (_nearHumanState.traitId === 'abilityAdjustment') {
    for (const [ability, adjustment] of Object.entries(_nearHumanState.abilityAdjustments)) {
      if (this.characterData.abilities[ability] && adjustment !== 0) {
        // Add to existing racial bonus
        const currentBonus = this.characterData.abilities[ability].racial || 0;
        this.characterData.abilities[ability].racial = currentBonus + adjustment;
      }
    }
  }

  // Adjust feat requirement based on sacrifice
  // Humans get 2 feats (1 bonus + 1 base at level 1)
  // If sacrificing feat, only get 1; if sacrificing skill, keep 2
  if (_nearHumanState.sacrifice === 'feat') {
    this.characterData.featsRequired = 1;  // Just the base 1, lose human bonus
  } else {
    this.characterData.featsRequired = 2;  // Keep the bonus feat, lose bonus skill
  }

  // Close overlay and move to next step
  this._onCloseNearHumanOverlay(event);
  this._recalcAbilities();
  await this._onNextStep(event);

  SWSELogger.log("CharGen | Confirmed official SWSE Near-Human species", this.characterData.nearHumanData);
}

/**
 * Close Near-Human overlay
 */
export function _onCloseNearHumanOverlay(event) {
  event.preventDefault();
  event.stopPropagation();

  const overlay = this.element.find('#near-human-overlay');
  overlay.removeClass('active');

  SWSELogger.log("CharGen | Closed Near-Human builder");
}

/**
 * Handle clicking on the Near-Human overlay backdrop
 */
export function _onNearHumanOverlayBackdropClick(event) {
  if (event.target.id === 'near-human-overlay') {
    this._onCloseNearHumanOverlay(event);
  }
}

// Pre-load config on module load
_loadChargenConfig();
