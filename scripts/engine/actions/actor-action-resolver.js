/**
 * ActorActionResolver — the entitlement boundary (Part E): "does this
 * actor possess this action?" is a different, cheaper question than "can
 * the actor use it right now?" (ActionAvailabilityEngine). This resolver
 * answers only the first question, from the actor's owned items, never
 * from weapon/target/context state.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #2 (Blocker 3):
 * this used to create a brand-new ActionDefinition object per owned item,
 * embedding that item's own provenance directly into the definition --
 * two different feats granting the same logical action id would collide
 * as a "duplicate definition" ActionRegistry error, when what actually
 * happened is one action with two grants. getOwnedActions() now returns
 * `{ definitions, entitlements }`: ONE canonical ActionDefinition per
 * unique domain:id (registered into `registry` at most once), and a
 * SEPARATE ActionEntitlement per actor-owned source item that grants it
 * (however many there are) -- no persistent entitlement database, no
 * actor mutation, computed fresh from the actor's current items every
 * call.
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

/** @returns {import('./action-definition.js').ActionEntitlement} */
function buildEntitlement(actor, definition, sourceItem) {
  return {
    actionKey: { domain: definition.domain, id: definition.id },
    actorId: actor?.id ?? null,
    source: {
      type: String(sourceItem?.type ?? 'item').toLowerCase(),
      id: sourceItem?.id ?? null,
      uuid: sourceItem?.uuid ?? null,
      name: sourceItem?.name ?? null
    },
    configuration: {}
  };
}

export class ActorActionResolver {
  /**
   * @param {object} actor
   * @param {object} [options]
   * @param {string} [options.domain] - only 'attack' has a normalizer
   *   today; an unsupported domain returns empty results rather than
   *   throwing, since a future domain's normalizer not existing yet is
   *   an expected, not exceptional, state during this migration.
   * @param {import('./action-registry.js').ActionRegistry} [options.registry] -
   *   when supplied, each unique (domain, id) definition is registered
   *   into it exactly once (convenience only; callers may ignore the
   *   return value and read from the registry instead).
   * @returns {{definitions: import('./action-definition.js').ActionDefinition[], entitlements: import('./action-definition.js').ActionEntitlement[]}}
   */
  static getOwnedActions(actor, { domain = 'attack', registry } = {}) {
    if (domain !== 'attack') return { definitions: [], entitlements: [] };
    const definitionsByKey = new Map();
    const entitlements = [];
    for (const item of actorItems(actor)) {
      for (const rule of extractAttackOptionRules(item)) {
        const definition = normalizeAttackOptionRule(item, rule);
        const key = `${definition.domain}:${definition.id}`;
        let canonical = definitionsByKey.get(key);
        if (!canonical) {
          canonical = definition;
          definitionsByKey.set(key, canonical);
          registry?.register(canonical);
        }
        entitlements.push(buildEntitlement(actor, canonical, item));
      }
    }
    return { definitions: Array.from(definitionsByKey.values()), entitlements };
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
    const owned = ActorActionResolver.getOwnedActions(actor, { domain: 'attack' }).definitions.map(d => d.id).sort();
    const live = CombatOptionResolver.getAvailableAttackOptions(actor, weapon, {}).map(o => o.id).sort();
    return { owned, live };
  }
}

export default ActorActionResolver;
