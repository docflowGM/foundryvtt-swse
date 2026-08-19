/**
 * Shared ability-modifier accessor for talent action helpers.
 *
 * Extracted during the Phase 2B authority-normalization closure pass from 5
 * byte-identical local copies (force-adept-talent-actions.js,
 * sith-talent-actions.js, jedi-prestige-talent-actions.js,
 * consular-talent-actions.js, sentinel-talent-actions.js). This is
 * intentionally NOT SchemaAdapters.getAbilityMod() — that helper checks
 * system.attributes before system.abilities, the reverse of this function's
 * priority order, so swapping to it would be a behavior change for actors
 * whose attributes/abilities mirrors have diverged.
 */
export function getTalentAbilityMod(actor, key) {
  return Number(
    actor?.system?.derived?.attributes?.[key]?.mod
      ?? actor?.system?.abilities?.[key]?.mod
      ?? actor?.system?.attributes?.[key]?.mod
      ?? 0
  ) || 0;
}
