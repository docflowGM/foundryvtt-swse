/**
 * Responsible GM — the single client that should act on a world-level Foundry event.
 *
 * Hooks such as `combatTurn`/`combatRound` fire on EVERY connected client. A listener that writes (damage, effect expiry, Force Point grants,
 * flag resets) would otherwise run once per client. Exactly one client — the active GM — acts. When no active GM is known, any GM acts; a
 * non-GM never does. Pure leaf: no imports.
 * @param {User} [user] defaults to the current user
 */
export function isResponsibleGM(user = globalThis.game?.user ?? null) {
  if (user?.isGM !== true) return false;
  const active = globalThis.game?.users?.activeGM;
  return !active || active.id === user.id;
}
