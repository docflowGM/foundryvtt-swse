/**
 * Pure partition of an actor's mapped Game Center sessions into the library shelves (active / invites / recent results).
 * Input must come from a TERMINAL-INCLUSIVE listing (GameSessionStore.listForActor(actor, { includeTerminal: true })), newest first;
 * the old path used summarizeForActor(), which drops finished sessions, so Recent Results could never show anything, and it sliced to 12
 * BEFORE filtering so a busy table list could also hide invites. Filters first, then caps each shelf.
 * Recent results are COMPLETED matches only: cancelled / refunded sessions are never presented as results.
 */
export function partitionSessionShelf(mappedSessions = [], { limit = 4 } = {}) {
  const list = Array.isArray(mappedSessions) ? mappedSessions : [];
  const active = list.filter((s) => s.isActive);
  const invites = list.filter((s) => s.isInvite);
  const recent = list.filter((s) => s.isComplete);
  return {
    activeSessions: active.slice(0, limit),
    inviteSessions: invites.slice(0, limit),
    recentSessions: recent.slice(0, limit),
    overflow: { active: Math.max(0, active.length - limit), invites: Math.max(0, invites.length - limit), recent: Math.max(0, recent.length - limit) }
  };
}
