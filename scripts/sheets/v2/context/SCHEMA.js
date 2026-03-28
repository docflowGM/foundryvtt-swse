/**
 * SCHEMA.js
 *
 * JSDoc type definitions for panel contexts and row structures.
 * Documents the contract between panel builders and partials.
 *
 * All panels follow a strict normalized format:
 * - No live Foundry Documents in context
 * - Arrays are arrays, numbers are numbers, booleans are booleans
 * - All computed values precomputed (no template logic)
 * - Empty states explicit (hasEntries: false)
 * - canEdit/canDelete explicitly set based on sheet permissions
 *
 * @typedef {Object} HPState
 * @property {number} value - Current HP
 * @property {number} max - Maximum HP
 * @property {number} percent - Health percentage (0-100) for bar display
 * @property {string} stateClass - CSS class for styling (state--healthy, state--wounded, state--damaged, state--critical, state--dead)
 * @property {boolean} canEdit - Whether HP inputs are editable
 *
 * @typedef {Object} BonusHP
 * @property {number} value - Bonus HP amount
 * @property {boolean} hasBonus - True if value > 0
 *
 * @typedef {Object} ShieldState
 * @property {number} max - Maximum shield rating
 * @property {number} current - Current shield remaining
 * @property {number} rating - Effective shield rating (0 if max is 0)
 * @property {boolean} hasShield - True if max > 0
 *
 * @typedef {Object} ConditionTrack
 * @property {number} current - Current condition level (0-6)
 * @property {number} max - Maximum level (always 6)
 * @property {boolean} canEdit - Whether buttons are clickable
 *
 * @typedef {Object} ConditionSlot
 * @property {number} step - Condition level 0-5
 * @property {string} label - Display label (e.g. "Level 0")
 * @property {boolean} active - True if current condition matches this step
 * @property {boolean} canEdit - Whether button is clickable
 *
 * @typedef {Object} HealthPanelContext
 * @property {HPState} hp - Current health information
 * @property {BonusHP} bonusHp - Bonus HP details
 * @property {ShieldState} shield - Shield rating information
 * @property {number} damageReduction - Flat damage reduction value
 * @property {ConditionTrack} conditionTrack - Condition track state
 * @property {Array<ConditionSlot>} conditionSlots - 6 clickable condition slots
 * @property {string} stateLabel - Health state as text ("Healthy", "Wounded", "Damaged", "Critical", "Dead")
 * @property {string} stateClass - CSS state class for panel styling
 * @property {boolean} showConditionTrack - Whether condition track is visible
 * @property {boolean} showShield - Whether shield display is visible
 * @property {boolean} showDamageReduction - Whether DR display is visible
 *
 * @typedef {Object} DefenseValue
 * @property {string} key - Defense key ("ref", "fort", "will")
 * @property {string} label - Display label ("Reflex", "Fortitude", "Will")
 * @property {number} total - Final defense value
 * @property {number} armorBonus - Bonus from equipped armor
 * @property {number} abilityMod - Ability modifier applied
 * @property {string} abilityModClass - CSS class for positive/negative styling
 * @property {number} classDef - Class feature bonus
 * @property {number} miscMod - Manual adjustment modifier
 * @property {string} miscModClass - CSS class for positive/negative styling
 * @property {boolean} canEdit - Whether misc input is editable
 *
 * @typedef {Object} DefensePanelContext
 * @property {Array<DefenseValue>} defenses - Always array of 3 (ref, fort, will)
 * @property {boolean} hasDefenses - True if defenses array length > 0
 * @property {boolean} canEdit - Sheet editability
 *
 * @typedef {Object} CharacterIdentity
 * @property {string} name - Character name
 * @property {string} class - Class name
 * @property {number} level - Character level
 * @property {string} species - Race/species
 * @property {string} size - Size category
 * @property {string} age - Age (free text or "—")
 * @property {string} gender - Gender (free text or "—")
 * @property {string} height - Height (free text or "—")
 * @property {string} weight - Weight (free text or "—")
 * @property {string} homeworld - Planet of origin (free text or "—")
 * @property {string} profession - Profession (free text or "—")
 * @property {string} background - Background/event (free text or "—")
 * @property {Object} destinyPoints
 * @property {number} destinyPoints.value - Current destiny points
 * @property {number} destinyPoints.max - Maximum destiny points
 * @property {boolean} canEdit - Whether text inputs are editable
 *
 * @typedef {Object} CharacterBiography
 * @property {string} notes - Character notes
 * @property {string} relationshipNotes - Relationship notes
 * @property {boolean} canEdit - Whether text area is editable
 *
 * @typedef {Object} BiographyPanelContext
 * @property {CharacterIdentity} identity - Character record fields
 * @property {CharacterBiography} biography - Biography text areas
 *
 * @typedef {Object} InventoryRow
 * @property {string} id - Item ID
 * @property {string} uuid - Item UUID
 * @property {string} name - Item display name
 * @property {string} img - Item image path
 * @property {string} type - Item type (weapon, equipment, armor)
 * @property {string} typeLabel - Type label with capitalization
 * @property {string} label - Display label (same as name)
 * @property {number} value - Item value
 * @property {number} quantity - Item quantity
 * @property {number} weight - Item weight (per unit)
 * @property {string} rarity - Rarity level (common, uncommon, rare, etc.)
 * @property {boolean} equipped - Whether item is equipped
 * @property {Array<string>} tags - Tags extracted from item flags
 * @property {string} cssClass - CSS classes for styling (item-type, equipped/unequipped, rarity-X)
 * @property {boolean} canEdit - Whether row is editable
 * @property {boolean} canDelete - Whether row can be deleted
 *
 * @typedef {Object} InventoryPanelContext
 * @property {Array<InventoryRow>} entries - Normalized inventory rows
 * @property {boolean} hasEntries - True if entries.length > 0
 * @property {number} totalWeight - Sum of all weights (weight × quantity)
 * @property {Object|null} equippedArmor - Equipped armor summary or null
 * @property {string} emptyMessage - Message when no entries
 * @property {boolean} canEdit - Sheet editability
 *
 * @typedef {Object} TalentRow
 * @property {string} id - Item ID
 * @property {string} uuid - Item UUID
 * @property {string} name - Talent name
 * @property {string} img - Talent image path
 * @property {string} type - Always "talent"
 * @property {string} label - Display label (same as name)
 * @property {string} source - Source book/reference
 * @property {string} sourceType - Source type qualifier
 * @property {string} tree - Talent tree/group
 * @property {string} group - Group key for grouping (same as tree)
 * @property {number} cost - Talent cost in points
 * @property {string} prerequisites - Prerequisites text
 * @property {string} description - Full description
 * @property {Array<string>} tags - Tags (Rare, Unique, etc.)
 * @property {string} cssClass - CSS classes (talent-row, tree-X)
 * @property {boolean} canEdit - Whether row is editable
 * @property {boolean} canDelete - Whether row can be deleted
 *
 * @typedef {Object} TalentPanelContext
 * @property {Array<TalentRow>} entries - Normalized talent rows
 * @property {Object} grouped - Talents grouped by tree {tree: [entries]}
 * @property {boolean} hasEntries - True if entries.length > 0
 * @property {number} totalCount - Total talent count
 * @property {string} emptyMessage - Message when no entries
 * @property {boolean} canEdit - Sheet editability
 *
 * @typedef {Object} FeatRow
 * @property {string} id - Item ID
 * @property {string} uuid - Item UUID
 * @property {string} name - Feat name
 * @property {string} img - Feat image path
 * @property {string} type - Always "feat"
 * @property {string} label - Display label (same as name)
 * @property {string} source - Source book/reference
 * @property {string} category - Feat category (e.g. Combat, Talent, etc.)
 * @property {string} requirements - Requirements text
 * @property {string} description - Full description
 * @property {Array<string>} tags - Tags (Rare, Unique, etc.)
 * @property {string} cssClass - CSS classes (feat-row, category-X)
 * @property {boolean} canEdit - Whether row is editable
 * @property {boolean} canDelete - Whether row can be deleted
 *
 * @typedef {Object} FeatPanelContext
 * @property {Array<FeatRow>} entries - Normalized feat rows
 * @property {boolean} hasEntries - True if entries.length > 0
 * @property {number} totalCount - Total feat count
 * @property {string} emptyMessage - Message when no entries
 * @property {boolean} canEdit - Sheet editability
 *
 * @typedef {Object} ManeuverRow
 * @property {string} id - Item ID
 * @property {string} uuid - Item UUID
 * @property {string} name - Maneuver name
 * @property {string} img - Maneuver image path
 * @property {string} type - Always "maneuver"
 * @property {string} label - Display label (same as name)
 * @property {string} source - Source book/reference
 * @property {string} difficulty - Difficulty check (e.g. "DC 15")
 * @property {string} actionType - Action type (standard, move, free, reaction)
 * @property {string} description - Full description
 * @property {Array<string>} tags - Tags (Rare, Unique, etc.)
 * @property {string} cssClass - CSS classes (maneuver-row, action-X)
 * @property {boolean} canEdit - Whether row is editable
 * @property {boolean} canDelete - Whether row can be deleted
 *
 * @typedef {Object} ManeuverPanelContext
 * @property {Array<ManeuverRow>} entries - Normalized maneuver rows
 * @property {boolean} hasEntries - True if entries.length > 0
 * @property {number} totalCount - Total maneuver count
 * @property {string} emptyMessage - Message when no entries
 * @property {boolean} canEdit - Sheet editability
 *
 * @typedef {Object} ArmorSummaryRow
 * @property {string} id - Armor item ID
 * @property {string} uuid - Armor item UUID
 * @property {string} name - Armor name
 * @property {string} img - Armor image path
 * @property {string} type - Always "armor"
 * @property {string} armorType - Armor type (Light, Medium, Heavy, Power)
 * @property {number} weight - Armor weight
 * @property {boolean} isPowered - Whether armor is powered suit
 * @property {number} upgradeSlots - Number of upgrade slots
 * @property {number} reflexBonus - Bonus to Reflex defense
 * @property {number} fortBonus - Bonus to Fortitude defense
 * @property {number} maxDexBonus - Max dexterity modifier that applies
 * @property {number} armorCheckPenalty - Armor check penalty
 * @property {number} speedPenalty - Speed movement penalty
 *
 * @module SCHEMA
 */

// This module is for documentation only. All exports are types used in JSDoc.
export {};
