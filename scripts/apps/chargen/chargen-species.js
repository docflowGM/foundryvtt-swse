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

  // Re-render to apply filters
  this.render();
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
// Near-Human Builder
// ============================================

// Near-Human builder state
let _nearHumanState = {
  adaptation: null,
  sacrifice: null,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
};

// Adaptation definitions
const NEAR_HUMAN_ADAPTATIONS = {
  lowLightVision: {
    name: "Low-Light Vision",
    description: "See twice as far in dim light",
    trait: { type: "sense", sense: "lowLightVision", displayText: "Low-Light Vision: Can see twice as far in dim light" }
  },
  breatheUnderwater: {
    name: "Breathe Underwater",
    description: "Can breathe water as well as air",
    trait: { type: "environmental", effect: "breatheUnderwater", displayText: "Amphibious: Can breathe both air and water" }
  },
  naturalArmor: {
    name: "Natural Armor",
    description: "+1 natural armor bonus to Reflex Defense",
    trait: { type: "bonus", target: "reflex", value: 1, displayText: "+1 natural armor bonus to Reflex Defense" }
  },
  climbSpeed: {
    name: "Climb Speed",
    description: "Climb speed equal to base speed",
    trait: { type: "movement", mode: "climb", speed: 6, displayText: "Climb speed 6 squares" }
  },
  scent: {
    name: "Scent",
    description: "Can detect creatures by smell within 10 squares",
    trait: { type: "sense", sense: "scent", range: 10, displayText: "Scent: Can detect creatures by smell within 10 squares" }
  },
  skillBonus: {
    name: "Skill Affinity",
    description: "+2 species bonus to one skill",
    trait: { type: "bonus", target: "perception", value: 2, displayText: "+2 species bonus to Perception checks" }
  }
};

// Sacrifice definitions
const NEAR_HUMAN_SACRIFICES = {
  bonusFeat: {
    name: "Bonus Feat",
    description: "Lose the human bonus feat at 1st level"
  },
  bonusSkill: {
    name: "Bonus Trained Skill",
    description: "Lose the human bonus trained skill"
  }
};

/**
 * Reset Near-Human builder state
 */
function resetNearHumanState() {
  _nearHumanState = {
    adaptation: null,
    sacrifice: null,
    attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  };
}

/**
 * Validate Near-Human configuration
 */
function validateNearHuman() {
  const positives = Object.values(_nearHumanState.attributes).filter(v => v > 0).length;
  const negatives = Object.values(_nearHumanState.attributes).filter(v => v < 0).length;

  return {
    hasAdaptation: _nearHumanState.adaptation !== null,
    hasSacrifice: _nearHumanState.sacrifice !== null,
    hasBonus: positives === 1,
    hasPenalty: negatives === 1,
    isValid: _nearHumanState.adaptation !== null &&
             _nearHumanState.sacrifice !== null &&
             positives === 1 &&
             negatives === 1
  };
}

/**
 * Update Near-Human builder UI
 */
function updateNearHumanUI(overlay) {
  const validation = validateNearHuman();

  // Update selected adaptation display
  const adaptationDisplay = overlay.find('#selected-adaptation');
  if (_nearHumanState.adaptation) {
    const adapt = NEAR_HUMAN_ADAPTATIONS[_nearHumanState.adaptation];
    adaptationDisplay.html(`<strong>${adapt.name}:</strong> ${adapt.description}`);
  } else {
    adaptationDisplay.html('<span class="placeholder">No adaptation selected</span>');
  }

  // Update selected sacrifice display
  const sacrificeDisplay = overlay.find('#selected-sacrifice');
  if (_nearHumanState.sacrifice) {
    const sac = NEAR_HUMAN_SACRIFICES[_nearHumanState.sacrifice];
    sacrificeDisplay.html(`<strong>${sac.name}:</strong> ${sac.description}`);
  } else {
    sacrificeDisplay.html('<span class="placeholder">No sacrifice selected</span>');
  }

  // Update attribute values
  for (const [attr, value] of Object.entries(_nearHumanState.attributes)) {
    const valueEl = overlay.find(`#nh-${attr}-value`);
    valueEl.text(value > 0 ? `+${value}` : value);
    valueEl.removeClass('positive negative');
    if (value > 0) valueEl.addClass('positive');
    if (value < 0) valueEl.addClass('negative');
  }

  // Update validation message
  const validationEl = overlay.find('.validation-message');
  if (validation.isValid) {
    validationEl.text('Near-Human is ready!').removeClass('error').addClass('success');
    overlay.find('#near-human-confirm-btn').prop('disabled', false);
  } else {
    const missing = [];
    if (!validation.hasAdaptation) missing.push('adaptation');
    if (!validation.hasSacrifice) missing.push('sacrifice');
    if (!validation.hasBonus) missing.push('+2 bonus');
    if (!validation.hasPenalty) missing.push('-2 penalty');
    validationEl.text(`Missing: ${missing.join(', ')}`).removeClass('success').addClass('error');
    overlay.find('#near-human-confirm-btn').prop('disabled', true);
  }
}

/**
 * Open Near-Human builder overlay
 */
export function _onOpenNearHumanBuilder(event) {
  event.preventDefault();
  event.stopPropagation();

  resetNearHumanState();

  const overlay = this.element.find('#near-human-overlay');

  // Clear previous selections
  overlay.find('.adaptation-btn, .sacrifice-btn').removeClass('selected');

  // Reset attribute display
  updateNearHumanUI(overlay);

  // Show overlay
  overlay.addClass('active');

  SWSELogger.log("CharGen | Opened Near-Human builder");
}

/**
 * Handle adaptation selection
 */
export function _onSelectNearHumanAdaptation(event) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  const adaptation = button.dataset.adaptation;

  // Toggle selection
  const overlay = this.element.find('#near-human-overlay');
  overlay.find('.adaptation-btn').removeClass('selected');

  if (_nearHumanState.adaptation === adaptation) {
    _nearHumanState.adaptation = null;
  } else {
    _nearHumanState.adaptation = adaptation;
    $(button).addClass('selected');
  }

  updateNearHumanUI(overlay);
}

/**
 * Handle sacrifice selection
 */
export function _onSelectNearHumanSacrifice(event) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  const sacrifice = button.dataset.sacrifice;

  // Toggle selection
  const overlay = this.element.find('#near-human-overlay');
  overlay.find('.sacrifice-btn').removeClass('selected');

  if (_nearHumanState.sacrifice === sacrifice) {
    _nearHumanState.sacrifice = null;
  } else {
    _nearHumanState.sacrifice = sacrifice;
    $(button).addClass('selected');
  }

  updateNearHumanUI(overlay);
}

/**
 * Handle attribute adjustment
 */
export function _onAdjustNearHumanAttribute(event) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  const isPlus = button.classList.contains('attr-plus');
  const row = button.closest('.attribute-row');
  const attr = row.dataset.attr;

  const currentValue = _nearHumanState.attributes[attr];
  const positives = Object.values(_nearHumanState.attributes).filter(v => v > 0).length;
  const negatives = Object.values(_nearHumanState.attributes).filter(v => v < 0).length;

  if (isPlus) {
    // Adding bonus
    if (currentValue === 0 && positives < 1) {
      _nearHumanState.attributes[attr] = 2;
    } else if (currentValue === -2) {
      _nearHumanState.attributes[attr] = 0;
    } else if (currentValue === 2) {
      _nearHumanState.attributes[attr] = 0;
    }
  } else {
    // Adding penalty
    if (currentValue === 0 && negatives < 1) {
      _nearHumanState.attributes[attr] = -2;
    } else if (currentValue === 2) {
      _nearHumanState.attributes[attr] = 0;
    } else if (currentValue === -2) {
      _nearHumanState.attributes[attr] = 0;
    }
  }

  const overlay = this.element.find('#near-human-overlay');
  updateNearHumanUI(overlay);
}

/**
 * Handle Near-Human confirmation
 */
export async function _onConfirmNearHuman(event) {
  event.preventDefault();
  event.stopPropagation();

  const validation = validateNearHuman();
  if (!validation.isValid) {
    ui.notifications.warn("Please complete all Near-Human configuration before confirming.");
    return;
  }

  // Build the Near-Human species data
  const adaptation = NEAR_HUMAN_ADAPTATIONS[_nearHumanState.adaptation];

  // Build ability string
  const abilityParts = [];
  for (const [attr, value] of Object.entries(_nearHumanState.attributes)) {
    if (value !== 0) {
      const attrNames = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
      abilityParts.push(`${value > 0 ? '+' : ''}${value} ${attrNames[attr]}`);
    }
  }

  // Store the custom Near-Human data
  this.characterData.species = "Near-Human";
  this.characterData.nearHumanData = {
    adaptation: _nearHumanState.adaptation,
    adaptationTrait: adaptation.trait,
    sacrifice: _nearHumanState.sacrifice,
    attributes: { ..._nearHumanState.attributes },
    abilityString: abilityParts.join(', ')
  };

  // Apply attribute modifiers
  for (const [attr, value] of Object.entries(_nearHumanState.attributes)) {
    if (value !== 0) {
      this.characterData.abilities[attr].racial = value;
    }
  }

  // Set size and speed (same as Human)
  this.characterData.size = "Medium";
  this.characterData.speed = 6;

  // Close overlay and move to next step
  this._onCloseNearHumanOverlay(event);
  this._recalcAbilities();
  await this._onNextStep(event);

  SWSELogger.log("CharGen | Confirmed Near-Human species", this.characterData.nearHumanData);
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
