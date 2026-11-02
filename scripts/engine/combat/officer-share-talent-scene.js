/**
 * Officer Share Talent current-scene eligibility.
 *
 * This is the runtime authority for measurable target requirements. Sight,
 * hearing and true alliance remain explicit GM adjudications; the combat
 * action must NOT trust stale distances or caller-authored actor proofs.
 */
const tokensOf = canvasRef => Array.from(canvasRef?.tokens?.placeables || []);
const tokenId = token => String(token?.id || token?.document?.id || '');
const disposition = token => Number(token?.document?.disposition ?? token?.disposition);
const actorId = token => String(token?.actor?.id || '');
const sceneId = scene => String(scene?.id || (typeof scene === 'string' ? scene : ''));

export function officerShareTalentDistanceSquares(scene, grid, from, to) {
  if (typeof grid?.measurePath !== 'function' || !from?.center || !to?.center) return null;
  const distance = Number(grid.measurePath([from.center, to.center])?.distance);
  const squareUnits = Number(scene?.grid?.distance);
  return Number.isFinite(distance) && Number.isFinite(squareUnits) && squareUnits > 0
    ? distance / squareUnits : null;
}

/** Rebuild real recipient identities and range evidence at action time. */
export function resolveOfficerShareTalentScene({
  officer, combat, recipientTokenIds, confirmedSenses = false,
  confirmedAllies = false, canvasRef = globalThis.canvas,
} = {}) {
  if (confirmedSenses !== true || confirmedAllies !== true) {
    throw new Error('GM must confirm target sight, hearing and allied status');
  }
  const scene = canvasRef?.scene, grid = canvasRef?.grid;
  if (!sceneId(scene) || !sceneId(combat?.scene)
    || sceneId(scene) !== sceneId(combat.scene) || combat?.started !== true) {
    throw new Error('Share Talent must use the current active encounter scene');
  }
  if (typeof grid?.measurePath !== 'function') {
    throw new Error('Share Talent range measurement is unavailable');
  }
  if (!officer?.id || !Array.isArray(recipientTokenIds) || !recipientTokenIds.length
    || recipientTokenIds.some(id => typeof id !== 'string' || !id.trim())
    || new Set(recipientTokenIds).size !== recipientTokenIds.length) {
    throw new Error('Share Talent requires unique recipient token identities');
  }
  const tokens = tokensOf(canvasRef);
  const officerTokens = tokens.filter(token => actorId(token) === String(officer.id));
  if (officerTokens.length !== 1) throw new Error('Officer token is ambiguous or absent');
  const source = officerTokens[0], faction = disposition(source);
  if (![1, -1].includes(faction)) throw new Error('Officer allegiance is unresolved');
  const activeTokenIds = new Set(Array.from(combat?.combatants || []).map(c => String(c.tokenId || '')));
  if (!activeTokenIds.has(tokenId(source))) throw new Error('Officer token does not belong to this encounter');

  const recipients = [], proofs = [], seenActors = new Set();
  for (const id of recipientTokenIds) {
    const matches = tokens.filter(token => tokenId(token) === id);
    if (matches.length !== 1 || !activeTokenIds.has(id)) {
      throw new Error('Share Talent recipient token is absent from the active encounter');
    }
    const token = matches[0], target = token.actor;
    const targetId = actorId(token);
    if (!targetId || targetId === String(officer.id) || seenActors.has(targetId)
      || disposition(token) !== faction) {
      throw new Error('Share Talent recipient is not a unique allied actor');
    }
    const distance = officerShareTalentDistanceSquares(scene, grid, source, token);
    if (!Number.isFinite(distance) || distance < 0 || distance > 10) {
      throw new Error('Share Talent recipient is no longer within 10 squares');
    }
    seenActors.add(targetId);
    recipients.push(target);
    proofs.push({
      actorId: targetId, isAlly: true, distanceSquares: distance,
      canSeeOfficer: true, canHearOfficer: true,
    });
  }
  return {recipientActors: recipients, recipientProofs: proofs};
}
