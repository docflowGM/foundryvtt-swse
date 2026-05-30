/**
 * @deprecated Legacy enhanced level-up export shim.
 *
 * The ApplicationV2 level-up stack under `scripts/apps/levelup/` has been
 * superseded by the unified progression framework. Active sheets and new code
 * should use `launchProgression()` from:
 *
 *   scripts/apps/progression-framework/progression-entry.js
 *
 * This export remains only for older macros/modules during migration.
 */

export { SWSELevelUpEnhanced } from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-main.js";
