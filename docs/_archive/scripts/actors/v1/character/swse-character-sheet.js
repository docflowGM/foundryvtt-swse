/**
 * LEGACY SHEET (REMOVED)
 * ---------------------
 * Phase 3.3: legacy (v1) actor sheets were retired.
 *
 * This stub exists ONLY for backward compatibility with:
 * - old world sheet-class references
 * - old module/macros importing the legacy sheet symbol
 *
 * The authoritative sheet surface is the v2 ApplicationV2 sheet.
 */

import { SWSEV2CharacterSheet } from '../../sheets/v2/character-sheet.js';

/**
 * @deprecated Use {@link SWSEV2CharacterSheet}.
 */
export class SWSECharacterSheet extends SWSEV2CharacterSheet {}
