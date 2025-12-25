// ============================================
// Species selection and traits for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';

// Store the currently previewed species name for confirmation
let _previewedSpeciesName = null;

/**
 * Handle species card click - opens expanded preview
 */
export function _onPreviewSpecies(event) {
  event.preventDefault();
  event.stopPropagation();

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
 */
export function _applySpeciesData(speciesDoc) {
  const system = speciesDoc.system || {};

  // 1. Apply ability score modifiers
  const abilityBonuses = this._parseAbilityString(system.abilities || "None");
  for (const [ability, bonus] of Object.entries(abilityBonuses)) {
    if (this.characterData.abilities[ability]) {
      this.characterData.abilities[ability].racial = bonus;
    }
  }

  // 2. Apply speed
  if (system.speed) {
    const speed = Number(system.speed);
    this.characterData.speed = speed;
  }

  // 3. Store size and apply size modifiers
  this.characterData.size = system.size || "Medium";
  this._applySizeModifiers(this.characterData.size);

  // 4. Store special abilities
  this.characterData.specialAbilities = system.special || [];

  // 5. Check for Human racial bonuses and NPC status
  const isNPC = this.actorType === "npc";
  const isHuman = speciesDoc.name === "Human" || speciesDoc.name === "human";

  if (isNPC) {
    // NONHEROIC RULE: Nonheroic characters get 3 starting feats
    // Non-human nonheroic characters get 2 feats (remove 1 for no human bonus)
    this.characterData.featsRequired = isHuman ? 3 : 2;
    SWSELogger.log(`CharGen | NPC (${isHuman ? 'Human' : 'Non-human'}): ${this.characterData.featsRequired} starting feats`);
  } else {
    // PCs: Humans get 2 feats, all other species get 1
    this.characterData.featsRequired = isHuman ? 2 : 1;
    SWSELogger.log(`CharGen | PC (${isHuman ? 'Human' : 'Non-human'}): ${this.characterData.featsRequired} feats`);
  }

  // 6. Store languages
  this.characterData.languages = system.languages || [];

  // 7. Store and apply racial skill bonuses
  this.characterData.racialSkillBonuses = system.skillBonuses || [];
  this._applyRacialSkillBonuses(system.skillBonuses || []);

  // 8. Store source
  this.characterData.speciesSource = system.source || "";

  SWSELogger.log(`CharGen | Applied species data for ${speciesDoc.name}:`, {
    abilities: abilityBonuses,
    speed: this.characterData.speed,
    size: this.characterData.size,
    special: this.characterData.specialAbilities,
    languages: this.characterData.languages,
    skillBonuses: this.characterData.racialSkillBonuses
  });
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
    // Match patterns like "+2 Dex", "-2 Con", "+4 Str"
    const match = part.match(/([+-]?\d+)\s*([a-zA-Z]+)/);
    if (match) {
      const value = parseInt(match[1]);
      const abilityName = match[2].toLowerCase();
      const abilityKey = abilityMap[abilityName];

      if (abilityKey) {
        bonuses[abilityKey] = value;
      }
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
      // Parse ability string inline (same logic as _parseAbilityString)
      const abilityString = system.abilities || "None";
      const abilities = {
        str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0
      };

      if (abilityString && abilityString !== "None" && abilityString !== "none") {
        const abilityMap = {
          'str': 'str', 'strength': 'str',
          'dex': 'dex', 'dexterity': 'dex',
          'con': 'con', 'constitution': 'con',
          'int': 'int', 'intelligence': 'int',
          'wis': 'wis', 'wisdom': 'wis',
          'cha': 'cha', 'charisma': 'cha'
        };

        const parts = abilityString.split(',').map(p => p.trim());
        for (const part of parts) {
          const match = part.match(/([+-]?\d+)\s*([a-zA-Z]+)/);
          if (match) {
            const value = parseInt(match[1]);
            const abilityName = match[2].toLowerCase();
            const abilityKey = abilityMap[abilityName];
            if (abilityKey) {
              abilities[abilityKey] = value;
            }
          }
        }
      }

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

// Pre-load config on module load
_loadChargenConfig();
