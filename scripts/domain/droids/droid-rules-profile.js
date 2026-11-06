/**
 * Droid rules profile (clean-break convergence, U-1).
 *
 * ONE pure answer to "does this actor follow Droid rules?", independent of the
 * Foundry actor type. A droid follower is stored as an `npc` actor, so
 * `actor.type === 'droid'` is not the identity; it is one piece of evidence.
 *
 * Dimensions are reported independently (an actor can be an NPC, a Droid and a
 * follower at once). Nothing here derives one dimension from another, reads a
 * name/species heuristic as sufficient, mutates anything, or imports Foundry.
 *
 * Contradictory evidence FAILS CLOSED: if any signal asserts "droid" and any
 * signal asserts "not a droid", the actor is not treated as a droid, the
 * conflict is listed, and `confidence` is 'CONTRADICTORY'.
 */
import { resolveDroidCalculationMode } from '/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js';

const MOD_ID = 'foundryvtt-swse';

function collectDroidSignals(actor) {
  const positive = [];
  const negative = [];
  const note = (source, value) => {
    if (value === true) positive.push({ source, value });
    else if (value === false) negative.push({ source, value });
  };
  if (actor?.type === 'droid') positive.push({ source: 'actor.type', value: 'droid' });
  note('system.isDroid', actor?.system?.isDroid);
  note('system.progression.droidConfig.isDroid', actor?.system?.progression?.droidConfig?.isDroid);
  note('system.progression.followerChoices.droidConfig.isDroid', actor?.system?.progression?.followerChoices?.droidConfig?.isDroid);
  note(`flags.${MOD_ID}.isDroid`, actor?.flags?.[MOD_ID]?.isDroid);
  return { positive, negative };
}

function collectFollowerSignals(actor) {
  const evidence = [];
  if (actor?.system?.isFollower === true) evidence.push({ source: 'system.isFollower', value: true });
  if (actor?.system?.progression?.isFollower === true) evidence.push({ source: 'system.progression.isFollower', value: true });
  if (actor?.flags?.swse?.follower?.isFollower === true) evidence.push({ source: 'flags.swse.follower.isFollower', value: true });
  if (actor?.system?.npcProfile?.kind === 'follower') evidence.push({ source: 'system.npcProfile.kind', value: 'follower' });
  return evidence;
}

/**
 * @param {object|null} actor
 * @returns {{foundryType:string|null, droidRules:{isDroid:boolean, evidence:object[], conflicting:object[]},
 *   follower:{isFollower:boolean, evidence:object[]}, calculationMode:string|null, confidence:'EXPLICIT'|'CONTRADICTORY'|'NONE'}}
 */
export function resolveDroidRulesProfile(actor) {
  const foundryType = actor?.type ?? null;
  const { positive, negative } = collectDroidSignals(actor);
  const contradictory = positive.length > 0 && negative.length > 0;
  const isDroid = positive.length > 0 && !contradictory;
  const followerEvidence = collectFollowerSignals(actor);
  // The stock/derived mode is owned by the existing mode authority and is only
  // consulted for real droid-type actors (it returns playable-derived for any
  // other type). A droid follower is a playable-derived build by construction.
  const calculationMode = !isDroid ? null
    : foundryType === 'droid' ? resolveDroidCalculationMode(actor).mode
      : 'playable-derived';
  return {
    foundryType,
    droidRules: { isDroid, evidence: positive, conflicting: contradictory ? negative : [] },
    follower: { isFollower: followerEvidence.length > 0, evidence: followerEvidence },
    calculationMode,
    confidence: contradictory ? 'CONTRADICTORY' : (positive.length ? 'EXPLICIT' : 'NONE')
  };
}

/** Does this actor follow Droid rules (fail-closed on contradiction)? */
export function followsDroidRules(actor) {
  return resolveDroidRulesProfile(actor).droidRules.isDroid;
}

/**
 * May this resolved component contribute Droid-component modifiers?
 *
 * One rule for every actor that follows Droid rules (PC droid, NPC droid,
 * follower): only hardware CONFIRMED in `system.installedSystems` is
 * mechanically installed. Mirror-only (`droidSystems`), embedded-Item and
 * legacy-mod components are present, never installed. Stock-statblock
 * suppression (published totals already include factory equipment) is applied
 * separately by the caller and is unchanged.
 */
export function componentMayContributeDroidModifiers(actor, component, profile = resolveDroidRulesProfile(actor)) {
  if (!profile.droidRules.isDroid) return false;
  return component?.primarySource?.kind === 'installedLedger' && component?.installed === true;
}
