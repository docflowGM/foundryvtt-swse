/**
 * SWSE V2 Sheet Panel Type Definitions
 * JSDoc typedefs for all panel contexts and row contracts
 *
 * This file provides IDE support and type hints for panel contracts.
 * While the codebase uses JavaScript, these definitions enable TypeScript-like
 * type checking and IDE autocompletion for panel data structures.
 *
 * IMPORTANT: These are for documentation and IDE support only.
 * The actual validation is performed by PanelValidators.js
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DISPLAY PANELS (Read-only display contexts)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Health & Conditions Panel Context
 * Displays HP, bonus HP, shield rating, damage reduction, and condition track
 * @typedef {Object} HealthPanelContext
 * @property {number} hp.value - Current hit points
 * @property {number} hp.max - Maximum hit points
 * @property {number} hp.percent - HP percentage (0-100)
 * @property {string} hp.stateClass - CSS class for HP state (healthy, wounded, etc.)
 * @property {boolean} hp.canEdit - Whether HP can be modified
 * @property {number} bonusHp.value - Bonus HP from modifiers
 * @property {boolean} bonusHp.hasBonus - Whether character has bonus HP
 * @property {number} conditionTrack.current - Current condition level
 * @property {number} conditionTrack.max - Maximum condition level
 * @property {ConditionSlot[]} conditionSlots - Array of condition track slots
 * @property {number} shield.max - Maximum shield rating
 * @property {number} shield.current - Current shield rating
 * @property {number} shield.rating - Display value for shield
 * @property {number} damageReduction - Damage reduction value
 * @property {boolean} showConditionTrack - Whether to display condition track
 * @property {boolean} showShield - Whether to display shield
 * @property {boolean} showDamageReduction - Whether to display DR
 * @property {string} stateLabel - Display label for HP state
 * @property {string} stateClass - CSS class for overall state
 */

/**
 * Defense Panel Context
 * Displays Reflex, Fortitude, and Will defense values with math breakdown
 * @typedef {Object} DefensePanelContext
 * @property {DefenseRow[]} defenses - Array of 3 defense rows (ref, fort, will)
 * @property {boolean} hasDefenses - Always true (defenses always exist)
 * @property {boolean} canEdit - Whether defenses can be edited
 */

/**
 * Biography Panel Context
 * Displays character identity, biography, and personal details
 * @typedef {Object} BiographyPanelContext
 * @property {Object} identity - Character identity data
 * @property {string} identity.name - Character name
 * @property {string} identity.class - Class name
 * @property {string} identity.level - Character level
 * @property {string} identity.species - Species name
 * @property {string} identity.size - Size category
 * @property {number} identity.destinyPoints.value - Current destiny points
 * @property {number} identity.destinyPoints.max - Maximum destiny points
 * @property {string} identity.age - Character age
 * @property {string} identity.gender - Character gender
 * @property {string} identity.height - Character height
 * @property {string} identity.weight - Character weight
 * @property {string} identity.homeworld - Homeworld/planet
 * @property {string} identity.profession - Professional background
 * @property {string} identity.background - Background event
 * @property {boolean} identity.canEdit - Whether identity fields can be edited
 * @property {string} biography - Full biography text
 */

/**
 * Portrait Panel Context
 * Displays character portrait image
 * @typedef {Object} PortraitPanelContext
 * @property {string} portraitUrl - URL to portrait image
 * @property {string} portraitAlt - Alt text for portrait
 * @property {boolean} hasPortrait - Whether portrait exists
 * @property {boolean} canEdit - Whether portrait can be changed
 */

/**
 * Dark Side Points Panel Context
 * Displays dark side points track with numbered boxes
 * @typedef {Object} DarkSidePanelContext
 * @property {number} value - Current dark side points
 * @property {number} max - Maximum dark side points
 * @property {DarkSideSegment[]} segments - Array of track boxes
 * @property {boolean} canEdit - Whether DSP can be modified
 */

/**
 * Second Wind Panel Context
 * Displays second wind/action point usage
 * @typedef {Object} SecondWindPanelContext
 * @property {number} used - Number of second winds used this encounter
 * @property {number} perEncounter - Second winds available per encounter
 * @property {boolean} canEdit - Whether second winds can be edited
 */

/**
 * Armor Summary Panel Context
 * Displays equipped armor with bonuses and penalties
 * @typedef {Object} ArmorSummaryPanelContext
 * @property {Object|null} equippedArmor - Equipped armor object or null if none equipped
 * @property {string} equippedArmor.id - Armor item ID
 * @property {string} equippedArmor.name - Armor name
 * @property {string} equippedArmor.armorType - Type of armor (light, medium, heavy, etc.)
 * @property {number} equippedArmor.reflexBonus - Reflex defense bonus
 * @property {number} equippedArmor.fortBonus - Fortitude defense bonus
 * @property {number} equippedArmor.maxDexBonus - Maximum DEX bonus cap
 * @property {number} equippedArmor.armorCheckPenalty - Penalty to skill checks
 * @property {number} equippedArmor.speedPenalty - Movement speed penalty
 * @property {number} equippedArmor.weight - Armor weight in pounds
 * @property {boolean} equippedArmor.isPowered - Whether armor is powered
 * @property {number} equippedArmor.upgradeSlots - Number of upgrade slots
 * @property {boolean} canEdit - Whether armor summary can be edited
 */

/**
 * Combat Notes Panel Context
 * Displays special combat actions and tactical notes
 * @typedef {Object} CombatNotesPanelContext
 * @property {string} combatNotes - Text of combat notes and reminders
 * @property {boolean} canEdit - Whether notes can be edited
 */

/**
 * Relationships Panel Context
 * Displays relationships and connections to other actors
 * @typedef {Object} RelationshipsPanelContext
 * @property {Object[]} relationships - Array of relationship objects
 * @property {string} relationships[].uuid - UUID of related actor
 * @property {string} relationships[].img - Portrait image URL of related actor
 * @property {string} relationships[].name - Name of related actor
 * @property {string} relationships[].type - Type of relationship (ally, follower, rival, etc.)
 * @property {string} relationships[].notes - Notes about this relationship
 * @property {boolean} hasAvailableFollowerSlots - Whether character can add more followers
 * @property {string} relationshipNotes - General notes about relationships and alliances
 * @property {boolean} canEdit - Whether relationships can be edited
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEDGER PANELS (Tabular data panels with multiple rows)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Inventory Panel Context
 * Displays equipment, weapons, and inventory items
 * @typedef {Object} InventoryPanelContext
 * @property {InventoryRow[]} entries - Array of inventory items
 * @property {Object} grouped - Grouped inventory by category
 * @property {InventoryRow[]} grouped.weapons - Weapons
 * @property {InventoryRow[]} grouped.armor - Armor
 * @property {InventoryRow[]} grouped.equipment - General equipment
 * @property {boolean} hasEntries - Whether character has items
 * @property {Object} stats - Inventory statistics
 * @property {number} stats.totalItems - Total item count
 * @property {number} stats.totalWeight - Total weight in lbs
 * @property {string} stats.encumbrance - Encumbrance state
 * @property {string} stats.equippedArmor - Name of equipped armor
 * @property {boolean} canEdit - Whether inventory can be modified
 */

/**
 * Talent Panel Context
 * Displays talents the character knows
 * @typedef {Object} TalentPanelContext
 * @property {TalentRow[]} entries - Flat array of all talents
 * @property {Object} grouped - Talents grouped by tier/category
 * @property {Object} stats - Talent statistics
 * @property {number} stats.totalTalents - Total talent count
 * @property {number} stats.currentTier - Current talent tier
 * @property {boolean} hasEntries - Whether character knows talents
 * @property {boolean} canEdit - Whether talents can be modified
 */

/**
 * Feat Panel Context
 * Displays feats the character has
 * @typedef {Object} FeatPanelContext
 * @property {FeatRow[]} entries - Array of feats
 * @property {Object} grouped - Feats grouped by category/type
 * @property {Object} stats - Feat statistics
 * @property {number} stats.totalFeats - Total feat count
 * @property {boolean} hasEntries - Whether character has feats
 * @property {boolean} canEdit - Whether feats can be modified
 */

/**
 * Maneuver Panel Context
 * Displays combat maneuvers the character knows
 * @typedef {Object} ManeuverPanelContext
 * @property {ManeuverRow[]} entries - Array of maneuvers
 * @property {Object} grouped - Maneuvers grouped by type/tier
 * @property {Object} stats - Maneuver statistics
 * @property {number} stats.totalManeuvers - Total maneuver count
 * @property {boolean} hasEntries - Whether character knows maneuvers
 * @property {boolean} canEdit - Whether maneuvers can be modified
 */

/**
 * Force Powers Panel Context
 * Displays Force powers the character knows (hand, discard, etc.)
 * @typedef {Object} ForcePowersPanelContext
 * @property {ForcePowerRow[]} hand - Powers in hand
 * @property {ForcePowerRow[]} discard - Powers in discard pile
 * @property {ForcePowerRow[]} secrets - Secret/hidden powers
 * @property {ForcePowerRow[]} techniques - Force techniques
 * @property {boolean} hasHand - Whether character has powers in hand
 * @property {boolean} hasDiscard - Whether discard has powers
 * @property {boolean} hasSecrets - Whether character has secrets
 * @property {boolean} hasTechniques - Whether character has techniques
 * @property {Object} stats - Power statistics
 * @property {number} stats.totalPowers - Total power count
 * @property {number} stats.fpUsed - Force points used
 * @property {number} stats.fpMax - Maximum force points
 * @property {boolean} canEdit - Whether powers can be modified
 */

/**
 * Starship Maneuvers Panel Context
 * Displays starship combat maneuvers
 * @typedef {Object} StarshipManeuversPanelContext
 * @property {ManeuverRow[]} entries - Array of starship maneuvers
 * @property {Object} grouped - Maneuvers grouped by category
 * @property {boolean} hasEntries - Whether character knows starship maneuvers
 * @property {boolean} canEdit - Whether maneuvers can be modified
 */

/**
 * Languages Panel Context
 * Displays languages the character speaks
 * @typedef {Object} LanguagesPanelContext
 * @property {string[]} entries - Array of language names
 * @property {boolean} hasEntries - Whether character speaks languages
 * @property {boolean} canEdit - Whether languages can be modified
 */

/**
 * Racial Abilities Panel Context
 * Displays racial abilities from character species
 * @typedef {Object} RacialAbilitiesPanelContext
 * @property {RacialAbilityRow[]} entries - Array of racial abilities
 * @property {boolean} hasEntries - Whether character has racial abilities
 * @property {boolean} canEdit - Whether abilities can be modified
 */

/**
 * Equipment Ledger Panel Context
 * Displays all equipment items in tabular format with weight tracking
 * @typedef {Object} EquipmentLedgerPanelContext
 * @property {EquipmentRow[]} allEquipment - Array of all equipment items
 * @property {string} totalEquipmentWeight - Total weight formatted as string (e.g., "45 lbs")
 * @property {boolean} canEdit - Whether equipment can be edited
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROW CONTRACTS (Individual row/entry types for ledger panels)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Inventory Row Contract
 * Single item in inventory (weapon, armor, equipment)
 * @typedef {Object} InventoryRow
 * @property {string} id - Unique item ID
 * @property {string} name - Item name
 * @property {string} itemType - Item type (weapon, armor, equipment, etc.)
 * @property {number} quantity - Quantity in inventory
 * @property {string} weight - Weight per item
 * @property {number} totalWeight - Total weight (weight × quantity)
 * @property {string} status - Item status (equipped, carried, stored, etc.)
 * @property {boolean} isEquipped - Whether item is currently equipped
 * @property {boolean} canEdit - Whether item can be edited
 * @property {Object} data - Item-specific data
 */

/**
 * Talent Row Contract
 * Single talent known by character
 * @typedef {Object} TalentRow
 * @property {string} id - Unique talent ID
 * @property {string} name - Talent name
 * @property {string} source - Talent source book
 * @property {string} tier - Talent tier (1, 2, 3, etc.)
 * @property {string} description - Brief talent description
 * @property {boolean} canEdit - Whether talent can be edited
 */

/**
 * Feat Row Contract
 * Single feat the character possesses
 * @typedef {Object} FeatRow
 * @property {string} id - Unique feat ID
 * @property {string} name - Feat name
 * @property {string} source - Feat source book
 * @property {string} category - Feat category
 * @property {string} description - Feat effect/description
 * @property {boolean} canEdit - Whether feat can be edited
 */

/**
 * Maneuver Row Contract
 * Single maneuver known by character
 * @typedef {Object} ManeuverRow
 * @property {string} id - Unique maneuver ID
 * @property {string} name - Maneuver name
 * @property {string} type - Maneuver type (Force, lightsaber, etc.)
 * @property {string} tier - Maneuver tier
 * @property {string} description - Maneuver effect
 * @property {boolean} canEdit - Whether maneuver can be edited
 */

/**
 * Starship Maneuver Row Contract
 * Single starship combat maneuver
 * @typedef {Object} StarshipManeuverRow
 * @property {string} id - Unique maneuver ID
 * @property {string} name - Maneuver name
 * @property {string} class - Maneuver class
 * @property {string} description - Maneuver effect
 * @property {boolean} canEdit - Whether maneuver can be edited
 */

/**
 * Force Power Row Contract
 * Single Force power in the character's hand/deck
 * @typedef {Object} ForcePowerRow
 * @property {string} id - Unique power ID
 * @property {string} name - Power name
 * @property {string[]} tags - Power tags/keywords
 * @property {string} summary - Brief power description
 * @property {string} location - Where power is (hand, discard, secret, technique)
 * @property {boolean} canEdit - Whether power can be edited
 */

/**
 * Language Row Contract
 * Single language spoken by character
 * @typedef {Object} LanguageRow
 * @property {string} id - Unique language ID
 * @property {string} name - Language name
 * @property {string} script - Writing system if any
 * @property {boolean} canEdit - Whether language can be edited
 */

/**
 * Racial Ability Row Contract
 * Single racial ability from character's species
 * @typedef {Object} RacialAbilityRow
 * @property {string} id - Unique ability ID
 * @property {string} name - Ability name
 * @property {string} description - Ability effect
 * @property {boolean} canEdit - Whether ability can be edited (usually false)
 */

/**
 * Defense Row Contract
 * Single defense value row
 * @typedef {Object} DefenseRow
 * @property {string} key - Defense key (ref, fort, will)
 * @property {string} label - Defense label (Reflex, Fortitude, Will)
 * @property {number} base - Base defense (always 10)
 * @property {number} armorBonus - Bonus from equipped armor
 * @property {number} abilityMod - Ability modifier
 * @property {string} abilityModClass - CSS class for ability mod
 * @property {number} classDef - Class defense bonus
 * @property {number} miscMod - Miscellaneous modifier (user input)
 * @property {string} miscModClass - CSS class for misc mod
 * @property {number} total - Total defense value
 * @property {boolean} canEdit - Whether defense can be edited
 */

/**
 * Equipment Row Contract
 * Single item in equipment ledger
 * @typedef {Object} EquipmentRow
 * @property {string} id - Unique item ID
 * @property {string} name - Item name
 * @property {string} category - Category (Weapon, Armor, Equipment)
 * @property {number} quantity - Quantity
 * @property {string} weight - Weight formatted as string (e.g., "5 lbs")
 * @property {string} cost - Cost formatted as string
 * @property {boolean} equipped - Whether item is equipped
 */

/**
 * Condition Slot Contract
 * Single slot on the condition track
 * @typedef {Object} ConditionSlot
 * @property {number} step - Condition step number (1-6)
 * @property {string} label - Condition label (healthy, shaken, etc.)
 * @property {boolean} active - Whether this condition level is active
 * @property {boolean} canEdit - Whether condition can be set
 */

/**
 * Dark Side Segment Contract
 * Single box on the dark side points track
 * @typedef {Object} DarkSideSegment
 * @property {number} number - Box number
 * @property {boolean} filled - Whether box is filled
 * @property {boolean} canEdit - Whether box can be toggled
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPOSITE TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * All Panel Contexts Combined
 * Complete type for the panelContexts object
 * @typedef {Object} AllPanelContexts
 * @property {HealthPanelContext} healthPanel
 * @property {DefensePanelContext} defensePanel
 * @property {BiographyPanelContext} biographyPanel
 * @property {PortraitPanelContext} portraitPanel
 * @property {InventoryPanelContext} inventoryPanel
 * @property {TalentPanelContext} talentPanel
 * @property {FeatPanelContext} featPanel
 * @property {ManeuverPanelContext} maneuverPanel
 * @property {SecondWindPanelContext} secondWindPanel
 * @property {DarkSidePanelContext} darkSidePanel
 * @property {ForcePowersPanelContext} forcePowersPanel
 * @property {StarshipManeuversPanelContext} starshipManeuversPanel
 * @property {LanguagesPanelContext} languagesPanel
 * @property {RacialAbilitiesPanelContext} racialAbilitiesPanel
 * @property {ArmorSummaryPanelContext} armorSummaryPanel
 * @property {EquipmentLedgerPanelContext} equipmentLedgerPanel
 * @property {CombatNotesPanelContext} combatNotesPanel
 * @property {RelationshipsPanelContext} relationshipsPanel
 */

/**
 * Final Sheet Context
 * Complete context provided to templates
 * @typedef {Object} FinalSheetContext
 * @property {AllPanelContexts} [panelContexts] - All panel contexts
 * @property {boolean} isGM - Whether rendering for GM
 * @property {boolean} isLevel0 - Whether character is level 0 (creation)
 * @property {boolean} buildMode - Whether in build/edit mode
 * @property {Object} actionEconomy - Action economy state
 * @property {boolean} xpLevelReady - Whether level-up is available
 * @property {Object} derived - Derived stats object
 * @property {number} _sheetContractVersion - Contract version number
 */

export {
  // Re-export all typedefs for use in other files (for documentation purposes only)
};
