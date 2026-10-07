// Phase 5B-5 -- reconcile frozen Phase 3B attackProfiles (executable) with Phase 4H selector modes (selector evidence).
// Pure and deterministic; used by the registry builder (to precompute) and by tests. Never synthesizes mechanics:
// a 4H mode with no explicit-id / explicit-branch / strict-cardinality evidence stays a SELECTOR-ONLY mode that is
// non-executable and flagged profileDefinitionIncomplete. Neither frozen authority is altered.

export const modeKey = (mode) => mode?.mode ?? mode?.profile ?? null;
const branchEvidence = (mode) => {
  const v = mode?.branch ?? mode?.attackProfile ?? null;
  return v === 'melee' || v === 'ranged' ? v : null;
};

export function reconcileProfiles(attackProfiles = [], modes = []) {
  const profiles = attackProfiles.map((p) => ({
    profileId: p.id,
    branch: p.schemaFamily?.branch ?? null,
    matchedModes: [],
    reconciliation: 'profile-only',
  }));
  const byId = new Map(profiles.map((p) => [p.profileId, p]));
  let remainingModes = modes.map((m, index) => ({ m, index, key: modeKey(m) }));
  const remainingProfiles = () => profiles.filter((p) => p.matchedModes.length === 0);

  // 1. explicit id evidence
  remainingModes = remainingModes.filter((r) => {
    const p = byId.get(r.key);
    if (!p) return true;
    p.matchedModes.push(r.key);
    p.reconciliation = 'explicit-id';
    return false;
  });

  // 2. explicit branch evidence (mode.branch / mode.attackProfile in {melee, ranged}); unique on both sides
  for (const branch of ['melee', 'ranged']) {
    const ps = remainingProfiles().filter((p) => p.branch === branch);
    const ms = remainingModes.filter((r) => branchEvidence(r.m) === branch);
    if (ps.length === 1 && ms.length === 1) {
      ps[0].matchedModes.push(ms[0].key);
      ps[0].reconciliation = 'explicit-branch';
      remainingModes = remainingModes.filter((r) => r !== ms[0]);
    }
  }

  // 3. strict 1:1 cardinality (one leftover profile, one leftover mode, no conflicting evidence)
  const leftoverProfiles = remainingProfiles();
  if (leftoverProfiles.length === 1 && remainingModes.length === 1 && modes.length === attackProfiles.length) {
    const only = remainingModes[0];
    const ev = branchEvidence(only.m);
    if (!ev || ev === leftoverProfiles[0].branch) {
      leftoverProfiles[0].matchedModes.push(only.key);
      leftoverProfiles[0].reconciliation = 'strict-cardinality';
      remainingModes = [];
    }
  }

  const unmatchedModes = remainingModes.map((r) => ({
    mode: r.key,
    selectorOnlyMode: true,
    profileDefinitionIncomplete: true,
    executable: false,
    evidence: r.m,
  }));
  return {
    status: unmatchedModes.length ? 'PROFILE_DEFINITION_INCOMPLETE' : 'COMPLETE',
    profiles,
    unmatchedModes,
  };
}
