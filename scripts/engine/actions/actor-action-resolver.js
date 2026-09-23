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
 * Math Integrity Freeze, Attack Bonus round 8 correction #3 (Blocker 1):
 * correction #2 stopped short: normalizeAttackOptionRule() still embedded
 * the granting item's own provenance (`source`, `_legacyRule`) directly
 * INSIDE the definition object, so "one canonical definition per domain:id"
 * was only true because this resolver silently kept whichever item's
 * definition it normalized FIRST and discarded the rest -- order-dependent
 * identity, exactly the bug the split was meant to remove. The normalizer
 * no longer embeds any item-specific data in the definition (see its own
 * doc comment), so two grants of the same domain:id action now produce
 * byte-identical definitions when they're genuinely the same configuration,
 * and a REAL divergence in content the v1 schema actually models (e.g. two
 * sources disagreeing on `requiresAttackType`) is now a loud, explicit
 * error here rather than a silent pick -- this groundwork does not yet
 * support per-grant configuration divergence for the same logical action
 * id; a future round would need an explicit grant-normalized/ActionInstance
 * layer to represent that.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #4 (documentation
 * correction, per explicit reviewer request): an earlier version of this
 * comment cited "two sources disagreeing on a slider's `max`" as an
 * example of a divergence this conflict check catches -- that was
 * MISLEADING. `ActionDefinition` v1 does not model slider bounds
 * (`rule.max`) at all (see `normalizeAttackOptionRule()` -- `max` is
 * never read), so two sources differing ONLY on `max` normalize to
 * IDENTICAL definition content and are NOT caught here; that divergence
 * would currently be silently invisible at the definition level (though
 * still visible per-grant on each entitlement's own
 * `configuration.rule.max`, see below). The actual, true contract:
 * conflict detection covers content the schema actually models
 * (`requirements`/`presentation`/`economy`/`execution`/`tags`), never
 * fields v1 doesn't canonicalize yet. Production wiring of any consumer
 * that needs slider bounds or other not-yet-modeled execution/
 * presentation properties is forbidden until that configuration is either
 * explicitly added to the schema or deliberately read through the
 * entitlement/`ActionInstance` boundary instead.
 *
 * The grant-specific raw rule is preserved on each ActionEntitlement's
 * `configuration.rule` (deep-cloned -- round 8 correction #4, Blocker 4 --
 * never the source item's own live nested object by reference) instead of
 * being folded into (or discarded from) the shared definition.
 *
 * Math Integrity Freeze, Attack Bonus round 8 correction #1 addendum
 * (groundwork only). Does not evaluate requirements, does not mutate the
 * actor, does not calculate roll math.
 */
import { CombatOptionResolver, extractAttackOptionRules } from '/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js';
import { normalizeAttackOptionRule } from '/systems/foundryvtt-swse/scripts/engine/actions/action-definition-normalizer.js';
import { definitionsContentEqual } from '/systems/foundryvtt-swse/scripts/engine/actions/action-registry.js';
import { deepClone } from '/systems/foundryvtt-swse/scripts/utils/data-utils.js';

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); } catch { return []; }
}

/**
 * Math Integrity Freeze, Attack Bonus round 8 correction #4 (Blocker 4):
 * `rule` is the source Item's own live, nested rule object (read directly
 * from `item.system.abilityMeta.rules[]` by `extractAttackOptionRules()`)
 * -- storing it on the entitlement BY REFERENCE would let a caller mutate
 * `entitlement.configuration.rule` and silently corrupt the actor's real
 * owned Item data. `deepClone()` (a plain JSON-safe clone, appropriate
 * here since every ATTACK_OPTION rule field is plain JSON-serializable
 * data -- no functions, no Dates, no circular references) breaks that
 * reference before storing.
 * @returns {import('./action-definition.js').ActionEntitlement}
 */
function buildEntitlement(actor, actionKey, sourceItem, rule) {
  return {
    actionKey,
    actorId: actor?.id ?? null,
    source: {
      type: String(sourceItem?.type ?? 'item').toLowerCase(),
      id: sourceItem?.id ?? null,
      uuid: sourceItem?.uuid ?? null,
      name: sourceItem?.name ?? null
    },
    configuration: { rule: deepClone(rule) }
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
        const existing = definitionsByKey.get(key);
        if (!existing) {
          definitionsByKey.set(key, definition);
          registry?.register(definition);
        } else if (!definitionsContentEqual(existing, definition)) {
          throw new Error(`ActorActionResolver.getOwnedActions(): conflicting ActionDefinition content for "${key}" -- granted by multiple sources whose normalized requirements/presentation/economy content genuinely differs (e.g. a differing requiresAttackType); this groundwork does not yet support per-grant configuration divergence for the same logical action id`);
        }
        entitlements.push(buildEntitlement(actor, { domain: definition.domain, id: definition.id }, item, rule));
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
