/**
 * ActorActionResolver — the entitlement boundary (Part E): "does this
 * actor possess this action?" is a different, cheaper question than "can
 * the actor use it right now?" (ActionAvailabilityEngine). This resolver
 * answers only the first question, from the actor's owned items, never
 * from weapon/target/context state.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #1 addendum
 * (groundwork only). Does not evaluate requirements, does not mutate the
 * actor, does not calculate roll math.
 */
import { CombatOptionResolver, extractAttackOptionRules } from '/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js';
import { normalizeAttackOptionRule } from '/systems/foundryvtt-swse/scripts/engine/actions/action-definition-normalizer.js';

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); } catch { return []; }
}

export class ActorActionResolver {
  /**
   * @param {object} actor
   * @param {object} [options]
   * @param {string} [options.domain] - only 'attack' has a normalizer
   *   today; an unsupported domain returns an empty array rather than
   *   throwing, since a future domain's normalizer not existing yet is
   *   an expected, not exceptional, state during this migration.
   * @param {import('./action-registry.js').ActionRegistry} [options.registry] -
   *   when supplied, each resolved definition is also registered into it
   *   (convenience only; callers may ignore the return value and read
   *   from the registry instead).
   * @returns {import('./action-definition.js').ActionDefinition[]}
   */
  static getOwnedActions(actor, { domain = 'attack', registry } = {}) {
    if (domain !== 'attack') return [];
    const definitions = [];
    for (const item of actorItems(actor)) {
      for (const rule of extractAttackOptionRules(item)) {
        const definition = normalizeAttackOptionRule(item, rule);
        definitions.push(definition);
        registry?.register(definition);
      }
    }
    return definitions;
  }

  /**
   * Reference cross-check only (not consumed by production code): confirms
   * this resolver's entitlement set agrees with
   * CombatOptionResolver.getAvailableAttackOptions()'s own unfiltered
   * discovery (attackType/target-agnostic gates aside -- both start from
   * the exact same extractAttackOptionRules() call). Used by the
   * groundwork test suite, not by any runtime consumer.
   */
  static _debugCompareWithCombatOptionResolver(actor, weapon) {
    const owned = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' }).map(d => d.id).sort();
    const live = CombatOptionResolver.getAvailableAttackOptions(actor, weapon, {}).map(o => o.id).sort();
    return { owned, live };
  }
}

export default ActorActionResolver;
