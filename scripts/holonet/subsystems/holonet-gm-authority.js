/**
 * Holonet GM Authority
 *
 * Deterministic "which connected GM is authoritative" rule, extracted
 * from HolonewsAutoPublisher.isPrimaryActiveGm() (Phase 8A correction
 * pass, C1) so HolonetSocketService's GM-authoritative request handling
 * can reuse the exact same tie-break instead of inventing a second one.
 * Do not couple generic Holonet socket transport directly to the
 * HoloNews subsystem merely to call its helper — this is the shared
 * seam both now depend on.
 *
 * Rule: among all currently ACTIVE GM users, the one with the
 * lexicographically lowest user id is authoritative. Deterministic and
 * stateless — every connected client (GM or not) computes the same
 * answer from the same game.users list, with no election/coordination
 * protocol needed.
 *
 * Compatibility: if game.users carries no active-GM information at all
 * (activeGms.length === 0 — e.g. a degraded/test environment, or the
 * active flag genuinely unavailable), any GM caller is treated as
 * authoritative rather than every GM silently refusing to act.
 *
 * Known, pre-existing limitation this rule does not attempt to solve:
 * it disambiguates between DIFFERENT GM users, not between multiple
 * browser tabs/connections of the SAME GM user — Foundry's game.users
 * list is per-user, not per-connection, and this codebase has no
 * per-connection identity anywhere. A GM with two open tabs will see
 * both tabs evaluate as authoritative. HolonewsAutoPublisher
 * .isPrimaryActiveGm() already had this exact limitation before this
 * pass; this seam does not introduce it and does not widen it.
 */
export class HolonetGmAuthority {
  static isPrimaryActiveGm() {
    if (!game.user?.isGM) return false;
    const activeGms = Array.from(game.users ?? [])
      .filter((user) => user?.isGM && user?.active)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return !activeGms.length || activeGms[0]?.id === game.user.id;
  }
}
