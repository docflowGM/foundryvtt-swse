// Phase 5B-4/5 -- WeaponRuntimeResolver: item + context -> immutable ResolvedWeapon.
// Fail-closed: no canonical identity -> legacy adapter; canonical identity -> registry resolver (never heuristics);
// canonical identity with missing/corrupt entry -> ERROR; explicit unknown profile/payload/configuration -> ERROR
// (never substituted by a default); no profileId -> the canonical default profile.
// Nothing actor-dependent is cached; only the immutable registry (and its indexes) is shared.
import { WeaponRuntimeError, ERROR_CODES, reportWeaponRuntimeError } from './errors.js';
import { deepFreeze } from './deep-freeze.js';
import { resolveCanonicalIdentity } from './canonical-identity.js';
import { adaptLegacyWeapon } from './legacy-adapter.js';
import { resolveProficiency } from './proficiency-resolver.js';
import { resolveDamageProfile } from './damage-profile-resolver.js';
import { resolveRange } from './range-resolver.js';
import { resolveResource } from './resource-resolver.js';

function buildProfiles(record) {
  const rec = record.profileReconciliation;
  const byId = new Map(rec.profiles.map((p) => [p.profileId, p]));
  return record.canonicalStats.attackProfiles.map((p) => Object.freeze({
    id: p.id, label: p.label ?? p.id, kind: p.kind ?? 'attack',
    branch: p.schemaFamily?.branch ?? null,
    subcategory: p.schemaFamily?.subcategory ?? null,
    proficiencyGroup: p.schemaFamily?.proficiency ?? null,
    exoticWeaponIdentity: p.schemaFamily?.exoticWeaponIdentity ?? null,
    executable: true,
    matchedModes: byId.get(p.id)?.matchedModes ?? [],
    reconciliation: byId.get(p.id)?.reconciliation ?? 'profile-only',
    definition: p,
  }));
}

function chooseDefaultProfile(record, profiles) {
  const d = record.canonicalStats.operatingModes?.default;
  return profiles.find((p) => p.id === d)?.id ?? profiles[0].id;
}

function readOwnedState(item) {
  const sys = item?.system ?? {};
  return Object.freeze({
    equipped: sys.equipped ?? null,
    quantity: sys.quantity ?? null,
    ammo: Object.freeze({ type: sys.ammunition?.type ?? null, current: sys.ammunition?.current ?? null, max: sys.ammunition?.max ?? null }),
  });
}

export class WeaponRuntimeResolver {
  #registry; #legacy;
  constructor(registry, { legacyAdapter = adaptLegacyWeapon } = {}) { this.#registry = registry; this.#legacy = legacyAdapter; }
  get registry() { return this.#registry; }

  /** Throws WeaponRuntimeError for every fail-closed condition. */
  resolve(item, context = {}) {
    const id = resolveCanonicalIdentity(item, this.#registry);
    if (id.kind === 'legacy') return this.#legacy(item, context);
    return this.resolveIdentity(id.identityKey, item, context, id.via);
  }

  /** Non-throwing wrapper for runtime callers: reports to the GM and returns an error result (never legacy). */
  resolveSafe(item, context = {}) {
    try { return this.resolve(item, context); } catch (err) {
      if (!(err instanceof WeaponRuntimeError)) throw err;
      reportWeaponRuntimeError(err);
      return Object.freeze({ source: 'error', error: err });
    }
  }

  /** Resolve directly from a registry identity key (synthetic fixtures / tooling). */
  resolveIdentity(identityKey, item = null, context = {}, via = 'direct') {
    const record = this.#registry.getByIdentityKey(identityKey);
    if (!record) throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_MISSING, `no registry entry for ${identityKey}`, { identityKey });
    const cs = record.canonicalStats;
    if (!cs || !Array.isArray(cs.attackProfiles) || !cs.attackProfiles.length || !record.profileReconciliation) {
      throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_CORRUPT, `registry entry ${identityKey} is corrupt`, { identityKey });
    }
    const profiles = buildProfiles(record);
    const defaultProfileId = chooseDefaultProfile(record, profiles);
    const payloads = (cs.payloadProfiles ?? []);
    const configurationStates = (cs.configurationStates ?? []);
    const configurationIds = [...configurationStates.map((c) => c.id), ...(cs.stateMachine?.states ?? [])];

    let profileId = context.profileId ?? null;
    if (profileId !== null && profileId !== undefined) {
      if (!profiles.some((p) => p.id === profileId)) {
        const selectorOnly = record.profileReconciliation.unmatchedModes.some((m) => m.mode === profileId);
        throw new WeaponRuntimeError(selectorOnly ? ERROR_CODES.PROFILE_NOT_EXECUTABLE : ERROR_CODES.UNKNOWN_PROFILE,
          selectorOnly ? `${profileId} is a selector-only mode of ${identityKey} and is not executable` : `unknown profileId ${profileId} for ${identityKey}`, { identityKey, profileId });
      }
    } else profileId = defaultProfileId;

    let payloadId = context.payloadId ?? null;
    if (payloadId !== null && payloadId !== undefined) {
      if (!payloads.some((p) => p.id === payloadId)) throw new WeaponRuntimeError(ERROR_CODES.UNKNOWN_PAYLOAD, `unknown payloadId ${payloadId} for ${identityKey}`, { identityKey, payloadId });
    } else payloadId = payloads.find((p) => p.default === true)?.id ?? null;

    let configurationId = context.configurationId ?? null;
    if (configurationId !== null && configurationId !== undefined) {
      if (!configurationIds.includes(configurationId)) throw new WeaponRuntimeError(ERROR_CODES.UNKNOWN_CONFIGURATION, `unknown configurationId ${configurationId} for ${identityKey}`, { identityKey, configurationId });
    } else configurationId = configurationStates.find((c) => c.default === true)?.id ?? cs.stateMachine?.initialState ?? null;

    const rec = record.profileReconciliation;
    const resolved = {
      source: 'canonical',
      identity: { identityKey, canonicalName: record.canonicalName, via, productionId: record.repo?.id ?? null, repoPresent: record.repo?.present === true, registryHash: this.#registry.registryHash },
      weaponGroup: record.weaponGroup,
      schemaFamily: record.schemaFamily,
      canonicalStats: cs,
      proficiency: record.proficiency,
      damageReductionInteraction: cs.damageReductionInteraction ?? null,
      profiles,
      defaultProfileId,
      payloads,
      configurationStates,
      stateMachine: cs.stateMachine ?? null,
      selection: { profileId, payloadId, configurationId, damageMode: context.damageMode ?? 'normal' },
      selectors: record.selectors,
      semanticTags: record.semantic?.tags?.finalTags ?? [],
      abilityInteractions: record.abilityInteractions,
      operation: record.operation,
      proficiencyRules: record.proficiencyRules,
      ontologyGaps: record.ontologyGapsAndUnrepresentedMechanics,
      authorityDiscrepancies: record.authorityDiscrepancies,
      conditionalQualities: record.conditionalQualities,
      conditionalDamageProfiles: record.conditionalDamageProfiles,
      qualities: record.qualities,
      qualityParameters: record.qualityParameters,
      display: { canonicalName: record.canonicalName, summary: record.summary, canonicalPlayerText: record.canonicalPlayerText, sourceFootnotes: record.sourceFootnotes },
      provenance: { firstPublication: record.firstPublication, sourceClaims: record.sourceClaims, ambiguities: record.ambiguities, qualityAuthority: record.qualityAuthority, repo: record.repo, phase3B: record.provenance.phase3B, phase4H: record.provenance.phase4H },
      recommendation: { categories: record.semantic?.categories ?? [], authorities: record.authorities },
      ownedState: readOwnedState(item),
      diagnostics: {
        profileReconciliation: rec.status,
        profileDefinitionIncomplete: rec.status !== 'COMPLETE',
        selectorOnlyModes: rec.unmatchedModes.map((m) => m.mode),
        unmatchedPhase4HModes: rec.unmatchedModes,
        heuristics: [],
      },
      heuristics: [],
    };
    return deepFreeze(resolved);
  }
}

export function getProfile(resolved, profileId = null) {
  const id = profileId ?? resolved.selection?.profileId ?? resolved.defaultProfileId;
  const p = resolved.profiles.find((x) => x.id === id);
  if (!p) throw new WeaponRuntimeError(ERROR_CODES.UNKNOWN_PROFILE, `unknown profileId ${id}`, { profileId: id });
  return p;
}

/** Convenience bundle for the selected profile; each facet remains independently callable. */
export function resolveSelected(resolved, actor, context = {}) {
  const profile = getProfile(resolved);
  return Object.freeze({
    profile,
    proficiency: resolveProficiency(resolved, profile, actor, context),
    damage: resolveDamageProfile(resolved, profile, context),
    range: resolveRange(resolved, profile, context),
    resource: resolveResource(resolved, profile, context),
  });
}
