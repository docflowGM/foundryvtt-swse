/**
 * @deprecated Duplicate nested compatibility path.
 * Use /systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-dialogues.js instead.
 *
 * This file intentionally remains as a shim rather than being deleted so any
 * legacy macro/import using the accidental scripts/scripts path does not break.
 * It can be pruned once searches confirm there are no external consumers.
 */

export * from "../../mentor/mentor-suggestion-dialogues.js";
export { default } from "../../mentor/mentor-suggestion-dialogues.js";
