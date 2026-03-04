/**
 * ATTACK_OPTION Execution Model - Primitive Enum
 *
 * Defines the 5 composable primitives for attack options.
 * Each attack option MUST declare its primitives from this enum.
 *
 * Primitives are composable building blocks:
 * - ATTACK_CONSTRUCTION_MODIFIER: Modifies attack bonus and damage
 * - TARGETING_MUTATION: Alters targeting rules and range
 * - ACTION_ECONOMY_MUTATION: Changes action cost
 * - EXTRA_ATTACK_GENERATOR: Creates additional attacks
 * - RIDER_EFFECT_ATTACHMENT: Applies effects on hit/crit/miss
 */

export const ATTACK_PRIMITIVES = {
  ATTACK_CONSTRUCTION_MODIFIER: "ATTACK_CONSTRUCTION_MODIFIER",
  TARGETING_MUTATION: "TARGETING_MUTATION",
  ACTION_ECONOMY_MUTATION: "ACTION_ECONOMY_MUTATION",
  EXTRA_ATTACK_GENERATOR: "EXTRA_ATTACK_GENERATOR",
  RIDER_EFFECT_ATTACHMENT: "RIDER_EFFECT_ATTACHMENT"
};
