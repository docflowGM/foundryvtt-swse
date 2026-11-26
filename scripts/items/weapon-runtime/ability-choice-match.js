// Does an owned ability's stored choice select the weapon form being used? (split from ability-selector.js so ability-selector
// no longer imports attack-consumer, which imports it: static import cycle break; behavior unchanged.)
import { shapeOfWeapon } from './attack-consumer.js';
import { featKeyOf } from './ability-selector.js';
import { featChoiceSelectors, featChoiceMatchesShape, canonicalSelectionFromContext } from './attack-shape.js';

/**
 * Does the ability's stored choice select the weapon form being used?
 * @returns {boolean|null} true/false for a canonical weapon (structured join); null when the weapon is legacy/custom (caller keeps its legacy match)
 */
export function abilityChoiceMatchesWeapon(item, weapon, context = {}) {
  if (!weapon) return null;
  const shape = shapeOfWeapon(weapon, canonicalSelectionFromContext(context));
  if (shape.source === 'legacy') return null;
  if (shape.source === 'error') return false;
  const actor = item?.actor ?? item?.parent ?? context.actor ?? null;
  const slug = featKeyOf(item);
  return featChoiceMatchesShape(featChoiceSelectors(item, { actor, choiceKind: slug ? slug.replace(/-/g, '_') : null }), shape);
}
