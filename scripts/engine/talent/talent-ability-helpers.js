import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

/**
 * Shared ability-modifier accessor for talent action helpers.
 *
 * Extracted during the Phase 2B authority-normalization closure pass from 5
 * byte-identical local copies (force-adept-talent-actions.js,
 * sith-talent-actions.js, jedi-prestige-talent-actions.js,
 * consular-talent-actions.js, sentinel-talent-actions.js).
 *
 * Previously this was documented as INTENTIONALLY checking
 * system.abilities before system.attributes, with a comment reasoning that
 * swapping to SchemaAdapters' order would be a behavior change for actors
 * whose mirrors have diverged. Fail-before proof
 * (tests/talent-ability-helpers-fail-before-proof.test.mjs) shows that
 * "behavior change" was the bug, not a tradeoff: a live actor with a real
 * Dex 20 (system.attributes.dex.base=20, no system.derived yet) and the
 * default legacy stub (system.abilities.dex.mod=0) resolved to modifier 0
 * instead of the correct +5. A deliberate historical choice to prefer the
 * stale mirror does not make that order correct — see
 * docs/systems/ABILITY_SCHEMA_AUTHORITY.md. Separately, this function's own
 * "system.attributes" fallback tier only ever checked a `.mod` field, which
 * never exists on the real schema (system.attributes only ever has
 * .base/.racial/.enhancement/.temp) — that tier was permanently dead
 * regardless of ordering. Now delegates to
 * SchemaAdapters.getAbilityMod(), which reconstructs a real modifier from
 * system.attributes' base/racial/enhancement/temp components and only
 * falls through to system.abilities when system.attributes is entirely
 * absent.
 */
export function getTalentAbilityMod(actor, key) {
  return SchemaAdapters.getAbilityMod(actor, key);
}
