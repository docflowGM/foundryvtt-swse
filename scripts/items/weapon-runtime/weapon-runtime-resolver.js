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
import { resolveHostAugmentations } from './host-augmentation.js';

function buildProfiles(record, registry) {
  const rec = record.profileReconciliation;
  const byId = new Map(rec.profiles.map((p) => [p.profileId, p]));
  const profiles = record.canonicalStats.attackProfiles.map((p) => Object.freeze({
    id: p.id, label: p.label ?? p.id, kind: p.kind ?? 'attack',
    branch: p.schemaFamily?.branch ?? null,
    subcategory: p.schemaFamily?.subcategory ?? null,
    proficiencyGroup: p.schemaFamily?.proficiency ?? null,
    exoticWeaponIdentity: p.schemaFamily?.exoticWeaponIdentity ?? null,
    executable: true,
    availableIn: byId.get(p.id)?.availableInConfigurations ?? null,
    delegatedFrom: null,
    matchedModes: byId.get(p.id)?.matchedModes ?? [],
    reconciliation: byId.get(p.id)?.reconciliation ?? 'profile-only',
    definition: p,
  }));
  // configuration-driven delegation: a configuration resolves as another certified identity's attack (no duplicated stats)
  for (const [configId, to] of Object.entries(record.operation?.configurationResolution ?? {})) {
    const target = registry.getByIdentityKey(to.resolveAsIdentityKey);
    const tp = target?.canonicalStats?.attackProfiles?.find((x) => x.id === to.resolveAsProfileId);
    if (!tp) throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_CORRUPT, `${record.identityKey} delegates ${configId} to missing ${to.resolveAsIdentityKey}/${to.resolveAsProfileId}`, { identityKey: record.identityKey });
    profiles.push(Object.freeze({
      id: configId, label: `${target.canonicalName} (${configId})`, kind: tp.kind ?? 'attack', branch: tp.schemaFamily?.branch ?? null,
      subcategory: tp.schemaFamily?.subcategory ?? null, proficiencyGroup: tp.schemaFamily?.proficiency ?? null, exoticWeaponIdentity: tp.schemaFamily?.exoticWeaponIdentity ?? null,
      executable: true, availableIn: [configId], delegatedFrom: Object.freeze({ identityKey: to.resolveAsIdentityKey, profileId: to.resolveAsProfileId }),
      matchedModes: rec.modes.filter((m) => m.mappedConfigurationId === configId).map((m) => m.mode), reconciliation: 'configuration-delegation', definition: tp,
    }));
  }
  return profiles;
}

const availableIn = (p, configurationId) => !p.availableIn || (configurationId !== null && p.availableIn.includes(configurationId));

function chooseDefaultProfile(record, profiles, configurationId) {
  const usable = profiles.filter((p) => availableIn(p, configurationId));
  const d = record.canonicalStats.operatingModes?.default;
  return (usable.find((p) => p.id === d) ?? usable[0])?.id ?? null;
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

  /** Host-weapon augmentations (e.g. rifle + mounted Vibrobayonet = double weapon) for the resolved configuration. */
  resolveHostAugmentations(resolved, context = {}) { return resolveHostAugmentations(resolved, this.#registry, context); }

  /** Resolve directly from a registry identity key (synthetic fixtures / tooling). */
  resolveIdentity(identityKey, item = null, context = {}, via = 'direct') {
    const record = this.#registry.getByIdentityKey(identityKey);
    if (!record) throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_MISSING, `no registry entry for ${identityKey}`, { identityKey });
    const cs = record.canonicalStats;
    if (!cs || !Array.isArray(cs.attackProfiles) || !cs.attackProfiles.length || !record.profileReconciliation) {
      throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_CORRUPT, `registry entry ${identityKey} is corrupt`, { identityKey });
    }
    const profiles = buildProfiles(record, this.#registry);
    const payloads = (cs.payloadProfiles ?? []);
    const configurationStates = (cs.configurationStates ?? []);
    const configurationIds = [...configurationStates.map((c) => c.id), ...(cs.stateMachine?.states ?? [])];
    const operatingModes = (cs.modeProfiles ?? []);

    let configurationId = context.configurationId ?? null;
    if (configurationId !== null && configurationId !== undefined) {
      if (!configurationIds.includes(configurationId)) throw new WeaponRuntimeError(ERROR_CODES.UNKNOWN_CONFIGURATION, `unknown configurationId ${configurationId} for ${identityKey}`, { identityKey, configurationId });
    } else configurationId = configurationStates.find((c) => c.default === true)?.id ?? cs.stateMachine?.initialState ?? null;

    let modeId = context.modeId ?? null;
    if (modeId !== null && modeId !== undefined && !operatingModes.some((m) => m.id === modeId)) throw new WeaponRuntimeError(ERROR_CODES.UNKNOWN_MODE, `unknown modeId ${modeId} for ${identityKey}`, { identityKey, modeId });
    modeId = modeId ?? null;

    const defaultProfileId = chooseDefaultProfile(record, profiles, configurationId);
    if (!defaultProfileId) throw new WeaponRuntimeError(ERROR_CODES.NO_EXECUTABLE_PROFILE, `${identityKey} has no executable profile in configuration ${configurationId}`, { identityKey, configurationId });

    let profileId = context.profileId ?? null;
    if (profileId !== null && profileId !== undefined) {
      const found = profiles.find((p) => p.id === profileId);
      if (!found) {
        const unresolved = record.profileReconciliation.unresolvedModes.some((m) => m.mode === profileId);
        throw new WeaponRuntimeError(unresolved ? ERROR_CODES.PROFILE_NOT_EXECUTABLE : ERROR_CODES.UNKNOWN_PROFILE,
          unresolved ? `${profileId} is an unresolved selector mode of ${identityKey} and is not executable` : `unknown profileId ${profileId} for ${identityKey}`, { identityKey, profileId });
      }
      if (!availableIn(found, configurationId)) throw new WeaponRuntimeError(ERROR_CODES.PROFILE_UNAVAILABLE, `profile ${profileId} of ${identityKey} is not available in configuration ${configurationId}`, { identityKey, profileId, configurationId });
    } else {
      const m = modeId ? operatingModes.find((x) => x.id === modeId) : null;
      profileId = (m?.attackProfileId && profiles.some((p) => p.id === m.attackProfileId)) ? m.attackProfileId : defaultProfileId;
    }

    let payloadId = context.payloadId ?? null;
    if (payloadId !== null && payloadId !== undefined) {
      if (!payloads.some((p) => p.id === payloadId)) throw new WeaponRuntimeError(ERROR_CODES.UNKNOWN_PAYLOAD, `unknown payloadId ${payloadId} for ${identityKey}`, { identityKey, payloadId });
    } else payloadId = payloads.find((p) => p.default === true)?.id ?? null;

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
      selection: { profileId, payloadId, configurationId, modeId, damageMode: context.damageMode ?? 'normal' },
      operatingModes,
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
        modeReconciliation: rec.modes,
        unresolvedModes: rec.unresolvedModes,
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
