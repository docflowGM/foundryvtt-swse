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
    return !!actor && actorHasFeat(actor, featName);
  }

  /**
   * Grappling Strike: after a melee hit, initiate a grab/grapple follow-up.
   *
   * This helper intentionally delegates the actual grab sequence to SWSEGrappling
   * so the canonical grapple attack, Reflex check, legality checks, state engine,
   * and chat output remain in one place.
   */
  static async grapplingStrike(attacker, target = null, options = {}) {
    target = actorFrom(target) ?? SWSEGrappling.getTargetActor?.(options);
    if (!attacker || !target) {
      ui?.notifications?.warn?.('Select one target before using Grappling Strike.');
      return null;
    }
    if (!actorHasFeat(attacker, 'Grappling Strike')) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the Grappling Strike feat.`);
      return null;
    }

    return SWSEGrappling.attemptGrab(attacker, target, {
      ...options,
      actionId: options.actionId ?? 'grappling-strike',
      source: 'Grappling Strike',
      skipLegalityConfirm: options.skipLegalityConfirm === true
    });
  }

  /**
   * Multi-Grab: attempt grab against up to two chosen adjacent targets.
   *
   * Adjacency/anatomy remains GM/player assisted; callers may pass explicit
   * targets or rely on current token targets. Each attempt uses the canonical
   * SWSEGrappling.attemptGrab path.
   */
  static async multiGrab(attacker, targets = null, options = {}) {
    const candidates = uniqueActors(Array.isArray(targets) ? targets : selectedTargets());
    const maxTargets = Math.max(1, Number(options.maxTargets ?? 2) || 2);
    const chosen = candidates.filter(actor => actor?.id !== attacker?.id).slice(0, maxTargets);

    if (!attacker || !chosen.length) {
      ui?.notifications?.warn?.('Select one or two targets before using Multi-Grab.');
      return [];
    }
    if (!actorHasFeat(attacker, 'Multi-Grab')) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the Multi-Grab feat.`);
      return [];
    }

    const results = [];
    for (const target of chosen) {
      const result = await SWSEGrappling.attemptGrab(attacker, target, {
        ...options,
        actionId: options.actionId ?? 'multi-grab',
        source: 'Multi-Grab'
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
    if (!actorHasFeat(defender, 'Grab Back')) {
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
    if (!actorHasFeat(attacker, 'Pincer')) {
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
