/**
 * Environment Rule
 *
 * Applies penalties from environmental conditions.
 *
 * Environment factors:
 * - Lighting: normal, dim, dark
 * - Concealment: 0-100% (affects perception, stealth)
 * - Terrain: type string (affects mobility skills)
 * - Weather: (future)
 * - Gravity: (future)
 *
 * These come from context, not calculated here.
 */

export function environmentRule({ actor, skillKey, context }, result) {
  const environment = context.environment || {};
  const lighting = environment.lighting || "normal";
  const concealment = environment.concealment || 0;
  const terrain = environment.terrain;

  // Darkness penalty
  if (lighting === "dark") {
    result.warnings.push("Darkness: vision-based skills are impaired");
    // Specific penalty depends on skill (perception -5, stealth +5 bonus, etc.)
  }

  if (lighting === "dim") {
    result.warnings.push("Dim light: vision penalties apply");
  }

  // Concealment penalty
  if (concealment > 0) {
    result.warnings.push(`Concealment ${Math.round(concealment)}%`);
    // Affects perception, stealth, targeting skills
  }

  // Terrain effects
  if (terrain) {
    result.warnings.push(`Terrain: ${terrain}`);
    // Affects athletics, acrobatics, stealth, etc. depending on terrain type
  }

  result.diagnostics.rulesTriggered.push("environmentRule");
  return result;
}
