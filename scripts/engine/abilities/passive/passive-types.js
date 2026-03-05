/**
 * PASSIVE Execution Model - Subtype Enum
 *
 * Defines the 5 formal subtypes for passive abilities.
 * Each passive ability MUST declare its subType from this enum.
 */

export const PASSIVE_SUBTYPES = {
  MODIFIER: "MODIFIER",
  RULE: "RULE",
  DERIVED_OVERRIDE: "DERIVED_OVERRIDE",
  AURA: "AURA",
  TRIGGERED: "TRIGGERED"
};
