import { SWSEGrappling } from "/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js";
import { GrappleStateEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js";

function normalizeFeatName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeFeatName(featName);
  try {
    return Array.from(actor?.items ?? []).some(item => item?.type === 'feat'
      && item?.system?.disabled !== true
      && normalizeFeatName(item?.name) === wanted);
  } catch (_err) {
    return false;
  }
}

function actorGrappleRules(actor) {
  const rules = [];
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
      const grappleRules = item?.system?.abilityMeta?.grappleRules;
      if (!Array.isArray(grappleRules)) continue;
      for (const rule of grappleRules) rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  } catch (_err) {
    // Treat malformed actor/items as having no grapple rules.
  }
  return rules;
}

function findGrappleRule(actor, type, predicate = null) {
  return actorGrappleRules(actor).find(rule => rule?.type === type && (!predicate || predicate(rule)));
}

function actorHasGrappleCapability(actor, type, fallbackFeatName, predicate = null) {
  return !!findGrappleRule(actor, type, predicate) || actorHasFeat(actor, fallbackFeatName);
}

function actorFrom(value) {
  return value?.actor ?? value ?? null;
}

function uniqueActors(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const actor = actorFrom(value);
    if (!actor?.id || seen.has(actor.id)) continue;
    seen.add(actor.id);
    out.push(actor);
  }
  return out;
}

function selectedTargets() {
  try {
    return Array.from(game?.user?.targets ?? []).map(token => token?.actor).filter(Boolean);
  } catch (_err) {
    return [];
  }
}

export class GrappleFeatActions {
  static canUse(actor, featName) {
    if (!actor) return false;
    const normalized = normalizeFeatName(featName);
    switch (normalized) {
      case 'grappling strike':
        return false;
      case 'multi grab':
        return actorHasGrappleCapability(actor, 'MULTI_GRAB', 'Multi-Grab');
      case 'grab back':
        return actorHasGrappleCapability(actor, 'REACTION_GRAB_BACK', 'Grab Back');
      case 'pincer':
        return actorHasGrappleCapability(actor, 'PIN_MAINTENANCE_AND_CRUSH', 'Pincer');
      default:
        return actorHasFeat(actor, featName);
    }
  }

  /**
   * Grappling Strike was present in generated/bad data, but it is not a valid
   * SWSE feat for this ruleset. Keep the helper as a safe no-op so stale UI
   * buttons or macros do not route into a fake feat implementation.
   */
  static async grapplingStrike(_attacker, _target = null, _options = {}) {
    ui?.notifications?.warn?.('Grappling Strike is not a valid SWSE feat in this system.');
    return null;
  }

  /**
   * Multi-Grab: attempt grab against up to two chosen adjacent targets.
   *
   * Adjacency/anatomy remains GM/player assisted; callers may pass explicit
   * targets or rely on current token targets. Each attempt uses the canonical
   * SWSEGrappling.attemptGrab path.
   */
  static async multiGrab(attacker, targets = null, options = {}) {
    const rule = findGrappleRule(attacker, 'MULTI_GRAB');
    const candidates = uniqueActors(Array.isArray(targets) ? targets : selectedTargets());
    const maxTargets = Math.max(1, Number(options.maxTargets ?? rule?.maxTargets ?? 2) || 2);
    const chosen = candidates.filter(actor => actor?.id !== attacker?.id).slice(0, maxTargets);

    if (!attacker || !chosen.length) {
      ui?.notifications?.warn?.('Select one or two targets before using Multi-Grab.');
      return [];
    }
    if (!rule && !actorHasFeat(attacker, 'Multi-Grab')) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the Multi-Grab feat.`);
      return [];
    }

    const results = [];
    for (const target of chosen) {
      const result = await SWSEGrappling.attemptGrab(attacker, target, {
        ...options,
        actionId: options.actionId ?? 'multi-grab',
        source: rule?.source ?? 'Multi-Grab'
      });
      results.push(result);
    }
    return results;
  }

  /**
   * Grab Back: reaction helper for grabbing an enemy after their failed grab/grapple.
   * Trigger detection belongs in ReactionEngine/event wiring; this helper performs
   * the canonical counter-grab once the reaction is selected.
   */
  static async grabBack(defender, attacker = null, options = {}) {
    attacker = actorFrom(attacker) ?? SWSEGrappling.getTargetActor?.(options);
    if (!defender || !attacker) {
      ui?.notifications?.warn?.('Select the triggering opponent before using Grab Back.');
      return null;
    }
    if (!actorHasGrappleCapability(defender, 'REACTION_GRAB_BACK', 'Grab Back')) {
      ui?.notifications?.warn?.(`${defender.name} lacks the Grab Back feat.`);
      return null;
    }

    return SWSEGrappling.attemptGrab(defender, attacker, {
      ...options,
      actionId: options.actionId ?? 'grab-back',
      source: 'Grab Back'
    });
  }

  /**
   * Pincer: helper for maintaining a Pin and optionally applying Crush.
   *
   * The existing grapple system owns Pin and Crush. This helper only checks the
   * feat and target state, then delegates to those canonical methods.
   */
  static async pincer(attacker, defender = null, options = {}) {
    defender = actorFrom(defender) ?? SWSEGrappling.getTargetActor?.(options);
    if (!attacker || !defender) {
      ui?.notifications?.warn?.('Select one pinned target before using Pincer.');
      return null;
    }
    if (!actorHasGrappleCapability(attacker, 'PIN_MAINTENANCE_AND_CRUSH', 'Pincer')) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the Pincer feat.`);
      return null;
    }
    if (!GrappleStateEngine.hasState(defender, 'pinned')) {
      ui?.notifications?.warn?.(`${defender.name} must already be Pinned for Pincer.`);
      return null;
    }

    const maintain = options.skipMaintainCheck === true
      ? { attackerWins: true, pinned: true, skipped: true }
      : await SWSEGrappling.attemptPin(attacker, defender, {
        ...options,
        actionId: options.actionId ?? 'pincer-maintain'
      });

    if (!maintain?.attackerWins && !maintain?.pinned) return { maintain, crush: null };

    const crush = options.applyCrush === false
      ? null
      : await SWSEGrappling.crushPinnedOpponent(attacker, defender, {
        ...options,
        actionId: options.crushActionId ?? 'pincer-crush'
      });

    return { maintain, crush };
  }

  static registerGlobals() {
    globalThis.SWSE ??= {};
    globalThis.SWSE.GrappleFeatActions = GrappleFeatActions;
    if (globalThis.game?.swse) globalThis.game.swse.GrappleFeatActions = GrappleFeatActions;
  }
}

export function registerGrappleFeatActions() {
  GrappleFeatActions.registerGlobals();
}

export default GrappleFeatActions;
