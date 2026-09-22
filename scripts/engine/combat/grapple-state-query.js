/**
 * Pure, dependency-free Grapple state lookup.
 *
 * Split out of GrappleStateEngine (Math Integrity Freeze, round 7) so a
 * read-only consumer -- specifically DefenseCalculator, which needs to know
 * whether an actor is currently Pinned in order to apply Pin's real RAW
 * effect (lose positive Dexterity bonus to Reflex Defense, see
 * defense-calculator.js) -- can query grapple state without importing
 * GrappleStateEngine itself. GrappleStateEngine transitively imports
 * ActorEngine -> DerivedCalculator -> DefenseCalculator, so importing
 * GrappleStateEngine from DefenseCalculator would create a circular import.
 * This module has zero project imports and operates only on plain
 * actor/effect data, so both GrappleStateEngine (actions/mutation) and
 * DefenseCalculator (read-only defense math) can safely depend on it as a
 * shared leaf authority instead of each maintaining their own copy of the
 * "what grapple state is this actor in" logic.
 */

const GRAPPLE_FLAG_KEY = 'grappleState';

export function normalizeGrappleState(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'grab' || key === 'grabbed') return 'grabbed';
  if (key === 'grapple' || key === 'grappled') return 'grappled';
  if (key === 'pin' || key === 'pinned') return 'pinned';
  return null;
}

export function getGrappleFlag(effect) {
  return effect?.flags?.swse?.[GRAPPLE_FLAG_KEY]
    ?? (effect?.flags?.swse?.grapple ? { state: effect.flags.swse.grapple, sourceId: effect.flags.swse.source ?? null } : null);
}

function actorId(actor) {
  return actor?.id ?? actor?._id ?? null;
}

export function grappleEffectMatches(effect, { sourceActor = null, state = null } = {}) {
  const flag = getGrappleFlag(effect);
  if (!flag) return false;
  const wantedState = normalizeGrappleState(state);
  if (wantedState && normalizeGrappleState(flag.state ?? flag) !== wantedState) return false;
  const sourceId = actorId(sourceActor);
  if (sourceId && flag.sourceId && flag.sourceId !== sourceId) return false;
  return true;
}

export function getGrappleEffects(actor, filters = {}) {
  let effects;
  try {
    effects = Array.from(actor?.effects ?? []);
  } catch (_err) {
    return [];
  }
  return effects.filter(effect => grappleEffectMatches(effect, filters));
}

export function actorHasGrappleState(actor, state = null) {
  return getGrappleEffects(actor, { state }).length > 0;
}

export function getGrappleStateInfo(actor) {
  const effects = getGrappleEffects(actor);
  if (!effects.length) return null;
  const rank = { grabbed: 1, grappled: 2, pinned: 3 };
  let best = null;
  for (const effect of effects) {
    const flag = getGrappleFlag(effect);
    const state = normalizeGrappleState(flag?.state ?? flag);
    if (!state) continue;
    if (!best || (rank[state] ?? 0) > (rank[best.state] ?? 0)) {
      best = {
        state,
        effect,
        sourceId: flag?.sourceId ?? effect?.flags?.swse?.source ?? null,
        sourceName: flag?.sourceName ?? null,
        targetId: flag?.targetId ?? actorId(actor)
      };
    }
  }
  return best;
}
