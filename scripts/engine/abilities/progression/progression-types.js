/**
 * PROGRESSION Execution Model - Types & Constants
 *
 * Defines the contract for lifecycle-triggered ability effects.
 * PROGRESSION abilities respond to character lifecycle events like leveling up.
 *
 * PHASE 1: Infrastructure only - no effect implementation yet
 */

/**
 * Lifecycle trigger types for PROGRESSION abilities
 */
export const PROGRESSION_TRIGGERS = {
  LEVEL_UP: "LEVEL_UP",           // Character gained a level in any class
  CLASS_LEVEL_GAIN: "CLASS_LEVEL_GAIN",  // Character gained a level in specific class
  FIRST_ACQUIRED: "FIRST_ACQUIRED"       // Ability was first added to actor
};

/**
 * Effect types for PROGRESSION abilities
 */
export const PROGRESSION_EFFECTS = {
  GRANT_CREDITS: "GRANT_CREDITS",        // Grant wealth/credits (Phase 4: Implemented)
  GRANT_XP: "GRANT_XP",                  // Grant experience points (NOT IMPLEMENTED)
  GRANT_ITEM: "GRANT_ITEM",              // Grant item by UUID (NOT IMPLEMENTED)
  CUSTOM: "CUSTOM"                       // Custom effect handler (NOT IMPLEMENTED)
};

/**
 * Effect amount types for GRANT_CREDITS
 */
export const PROGRESSION_AMOUNT_TYPES = {
  LINEAGE_LEVEL_MULTIPLIER: "LINEAGE_LEVEL_MULTIPLIER"  // 5000 credits per Lineage level
};

/**
 * PROGRESSION execution model identifier
 */
export const PROGRESSION_EXECUTION_MODEL = "PROGRESSION";
