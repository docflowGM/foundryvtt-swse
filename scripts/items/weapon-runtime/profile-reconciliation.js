// Phase 5B / 5B-R -- typed reconciliation of Phase 4H selector modes against the frozen Phase 3B structures.
// Each 4H mode is exactly one of:
//   ATTACK_PROFILE      "what attack is physically made"      -> a 3B attackProfile (kind attack)
//   SPECIAL_ACTION      a once-per-period / special attack    -> a 3B attackProfile (kind special|utility)
//   CONFIGURATION       "what form/state is the weapon in"    -> a 3B configurationState / stateMachine state
//   OPERATING_MODE      "how the same attack is resolved"     -> a 3B modeProfile
//   PROFICIENCY_ROUTE   a proficiency-route descriptor filed under 4H modes -> structured species route
// Evidence order: explicit configuration id, explicit modeProfile id, explicit profile id, explicit branch (unique 1:1),
// strict cardinality. A mode with no evidence is UNRESOLVED (must be 0). Never synthesizes mechanics; pure/deterministic.

export const modeKey = (mode) => mode?.mode ?? mode?.profile ?? null;
const branchEvidence = (mode) => {
  const v = mode?.branch ?? mode?.attackProfile ?? null;
  return v === 'melee' || v === 'ranged' ? v : null;
};

const FUTURE_CONSUMER = {
  ATTACK_PROFILE: 'attack dialog profile chooser / AttackWorkflowContext.profileId (5C)',
  SPECIAL_ACTION: 'special-action attack with usage limit and effect executor (5C/5E)',
  CONFIGURATION: 'configuration change action + profile availability by configuration (5E)',
  OPERATING_MODE: 'operating-mode selector layered on the same attack (5C/5E)',
  PROFICIENCY_ROUTE: 'resolveProficiency species route (5C)',
};

const profileConfigIds = (p) => (p.activationRequirements ?? []).filter((r) => r?.type === 'configuration').map((r) => r.id);

export function reconcileProfiles(canonicalStats, modes = [], proficiency = null, operation = null) {
  const cs = canonicalStats ?? {};
  const attackProfiles = cs.attackProfiles ?? [];
  const configIds = new Set([...(cs.configurationStates ?? []).map((c) => c.id), ...(cs.stateMachine?.states ?? [])]);
  const modeProfiles = new Map((cs.modeProfiles ?? []).map((m) => [m.id, m]));
  const profiles = attackProfiles.map((p) => ({
    profileId: p.id, branch: p.schemaFamily?.branch ?? null, kind: p.kind ?? 'attack',
    matchedModes: [], reconciliation: 'profile-only',
    availableInConfigurations: profileConfigIds(p).length ? profileConfigIds(p) : null,
  }));
  const byId = new Map(profiles.map((p) => [p.profileId, p]));
  const records = [];
  let rest = [];
  const rec = (key, classification, extra) => ({
    mode: key, classification, authorityComplete: true, executableNow: true,
    futureConsumer: FUTURE_CONSUMER[classification], reason: '', mappedProfileIds: [], ...extra,
  });

  for (const m of modes) {
    const key = modeKey(m);
    if (configIds.has(key)) {
      const gated = profiles.filter((p) => p.availableInConfigurations?.includes(key)).map((p) => p.profileId);
      const viaMode = [...modeProfiles.values()].filter((x) => x.configurationId === key).flatMap((x) => x.attackProfileIds ?? [x.attackProfileId]).filter(Boolean);
      const delegated = operation?.configurationResolution?.[key] ? [key] : [];
      const mapped = [...new Set([...gated, ...viaMode, ...delegated])];
      records.push(rec(key, 'CONFIGURATION', { mappedConfigurationId: key, mappedProfileIds: mapped.length ? mapped : profiles.map((p) => p.profileId), reason: 'matches a Phase 3B configuration state by explicit id' }));
      for (const id of mapped) { const p = byId.get(id); if (p && !p.matchedModes.includes(key)) { p.matchedModes.push(key); if (p.reconciliation === 'profile-only') p.reconciliation = 'configuration-gated'; } }
    } else if (modeProfiles.has(key)) {
      const mp = modeProfiles.get(key);
      const mapped = (mp.attackProfileIds ?? [mp.attackProfileId]).filter(Boolean);
      records.push(rec(key, 'OPERATING_MODE', { mappedModeProfileId: key, mappedProfileIds: mapped, reason: 'matches a Phase 3B modeProfile by explicit id (same attack, different resolution)' }));
      for (const id of mapped) { const p = byId.get(id); if (p) { p.matchedModes.push(key); if (p.reconciliation === 'profile-only') p.reconciliation = 'mode-profile'; } }
    } else if (byId.has(key)) {
      const p = byId.get(key);
      p.matchedModes.push(key); p.reconciliation = 'explicit-id';
      records.push(rec(key, p.kind === 'attack' ? 'ATTACK_PROFILE' : 'SPECIAL_ACTION', { mappedProfileIds: [key], reason: 'matches a Phase 3B attack profile by explicit id' }));
    } else rest.push({ m, key });
  }

  // explicit branch evidence, unique on both sides, among profiles not yet matched
  const free = () => profiles.filter((p) => p.matchedModes.length === 0);
  for (const branch of ['melee', 'ranged']) {
    const ps = free().filter((p) => p.branch === branch), ms = rest.filter((r) => branchEvidence(r.m) === branch);
    if (ps.length === 1 && ms.length === 1) {
      ps[0].matchedModes.push(ms[0].key); ps[0].reconciliation = 'explicit-branch';
      records.push(rec(ms[0].key, ps[0].kind === 'attack' ? 'ATTACK_PROFILE' : 'SPECIAL_ACTION', { mappedProfileIds: [ps[0].profileId], reason: 'unique explicit branch evidence' }));
      rest = rest.filter((r) => r !== ms[0]);
    }
  }
  if (free().length === 1 && rest.length === 1 && modes.length === attackProfiles.length) {
    const only = rest[0], p = free()[0], ev = branchEvidence(only.m);
    if (!ev || ev === p.branch) {
      p.matchedModes.push(only.key); p.reconciliation = 'strict-cardinality';
      records.push(rec(only.key, 'ATTACK_PROFILE', { mappedProfileIds: [p.profileId], reason: 'strict 1:1 cardinality with no conflicting evidence' }));
      rest = [];
    }
  }
  // proficiency-route descriptor filed under modes
  const structuredRoutes = (proficiency?.speciesOverrides?.length ?? 0) > 0 || (proficiency?.alternateRoutesPhase3B ?? []).some((r) => r.species);
  rest = rest.filter((r) => {
    const m = r.m;
    if (structuredRoutes && m.condition && m.effect && !branchEvidence(m) && !m.attackProfile && !m.proficiency) {
      records.push(rec(r.key, 'PROFICIENCY_ROUTE', { reason: 'proficiency-route descriptor; the route is carried by structured species data (not an attack/mode)' }));
      return false;
    }
    return true;
  });
  const unresolved = rest.map((r) => rec(r.key, 'UNRESOLVED', { authorityComplete: false, executableNow: false, futureConsumer: null, reason: 'no id, branch or cardinality evidence', evidence: r.m }));
  records.sort((a, b) => (a.mode < b.mode ? -1 : a.mode > b.mode ? 1 : 0));
  return { status: unresolved.length ? 'UNRESOLVED_MODES' : 'COMPLETE', profiles, modes: [...records, ...unresolved], unresolvedModes: unresolved };
}
