/**
 * @deprecated Legacy chargen barrel export.
 *
 * Active actor creation and sheet flows should use the unified progression
 * launcher instead of importing legacy chargen applications directly:
 *
 *   scripts/apps/progression-framework/progression-entry.js
 *
 * The exports below remain only for older macros/modules during migration.
 */

export { default as CharacterGenerator } from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js";
export { default as SWSECharacterGeneratorApp } from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js";
export { default as CharacterGeneratorImproved } from "/systems/foundryvtt-swse/scripts/apps/chargen-improved.js";
export { default as CharacterGeneratorNarrative } from "/systems/foundryvtt-swse/scripts/apps/chargen-narrative.js";
