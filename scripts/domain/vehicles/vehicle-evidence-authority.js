/**
 * SWSE Phase 2C: PURE evidence/certification policy probe, NOT wired into Foundry.
 * A trusted Foundry adapter must authenticate GM status and persist returned receipts.
 * Nothing here writes to compendia, actors, or any source-authority record.
 */
export const EVIDENCE_STATES = Object.freeze([
  'PRINTED_VALUE', 'EXPLICIT_NONE', 'SOURCE_SILENT_CONFIRMED',
  'PUBLISHED_CONFLICT', 'NOT_REVIEWED', 'CONFIGURATION_CONDITIONAL'
]);

function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj ?? {}, key); }
function validString(v) { return typeof v === 'string' && v.trim().length > 0; }
const ALLOWED_ARCS = new Set(['forward','aft','port','starboard','turret','omni']);
function validArc(v) { return ALLOWED_ARCS.has(v); }
function reject(reason) { return { status: 'BLOCK', reason, canonicalMutationAllowed: false }; }

export function validateEvidenceClaim(claim) {
  if (!claim || !EVIDENCE_STATES.includes(claim.state)) return { valid: false, reason: 'UNKNOWN_EVIDENCE_STATE' };
  const valueSupplied = own(claim, 'value');
  if (claim.state === 'PRINTED_VALUE') return valueSupplied && claim.value !== null && claim.value !== undefined
    ? { valid: true } : { valid: false, reason: 'MISSING_PRINTED_VALUE' };
  if (claim.state === 'EXPLICIT_NONE') return !valueSupplied || claim.value === null
    ? { valid: true } : { valid: false, reason: 'EXPLICIT_NONE_CANNOT_USE_NUMBER' };
  if (claim.state === 'SOURCE_SILENT_CONFIRMED' || claim.state === 'NOT_REVIEWED') return !valueSupplied
    ? { valid: true } : { valid: false, reason: 'UNKNOWN_CANNOT_BE_DEFAULTED' };
  if (claim.state === 'CONFIGURATION_CONDITIONAL') return validString(claim.configurationKey) && valueSupplied
    ? { valid: true } : { valid: false, reason: 'CONFIGURATION_SCOPE_REQUIRED' };
  if (claim.state === 'PUBLISHED_CONFLICT') {
    const a = claim.alternatives;
    if (valueSupplied || !Array.isArray(a) || a.length < 2 ||
        !a.every(x => own(x,'value') && validString(x.sourceField) && Number.isInteger(x.printedPage)))
      return { valid: false, reason: 'SOURCE_ALTERNATIVES_AND_LOCATORS_REQUIRED' };
    if (new Set(a.map(x => JSON.stringify(x.value))).size < 2)
      return { valid: false, reason: 'ALTERNATIVES_DO_NOT_DISAGREE' };
    return { valid: true };
  }
  return { valid: false, reason: 'UNRECOGNIZED' };
}

export function assessSourceCompleteness({ statblockReviewed, immediateNarrativeReviewed, claims }) {
  if (statblockReviewed !== true || immediateNarrativeReviewed !== true) return reject('PRIMARY_SOURCE_CLOSE_READ_INCOMPLETE');
  if (!Array.isArray(claims) || !claims.length || claims.some(x => !validateEvidenceClaim(x).valid))
    return reject('MALFORMED_EVIDENCE_CLAIMS');
  if (claims.some(x => x.state === 'NOT_REVIEWED')) return reject('CLAIM_NOT_REVIEWED');
  return { status: 'SOURCE_COMPLETE', strictMechanicalCertified: false, canonicalMutationAllowed: false };
}

/** A caller may not manufacture GM permission: Foundry adapter must supply verifiedUserIsGM. */
function validGmContext(context, override, { vehicleId, attackId, weaponGroupKey, targetId }) {
  return context?.verifiedUserIsGM === true && validString(context?.userId) &&
    validString(context?.instanceId) && override?.approvedByUserId === context.userId &&
    override?.instanceId === context.instanceId && override?.vehicleId === vehicleId &&
    override?.attackId === attackId && override?.weaponGroupKey === weaponGroupKey &&
    override?.targetId === targetId && validString(override?.reason) && validString(override?.receiptId);
}

function instanceReceipt({ context, override, type, value }) {
  return Object.freeze({
    receiptId: override.receiptId, decisionKind: type, instanceId: context.instanceId,
    gmUserId: context.userId, vehicleId: override.vehicleId, attackId: override.attackId,
    weaponGroupKey: override.weaponGroupKey, targetId: override.targetId,
    reason: override.reason, selectedValue: value,
    sourceAuthorityMutated: false, certificationIssued: false,
    MUST_PERSIST_BY_TRUSTED_FOUNDRY_ADAPTER: true
  });
}

/**
 * Automatic arc-dependent attacks must have confirmed source arc evidence.
 * Missing/ambiguous operator and target block even a GM arc exception.
 * Non-arc actions must use a different capability gate; this only governs arc targeting.
 */
export function decideArcDependentAttack({
  sourceComplete, crewStationResolved, targetResolved,
  arcEvidence, arc, context, override, vehicleId, attackId, weaponGroupKey, targetId
}) {
  if (sourceComplete !== true) return reject('SOURCE_INCOMPLETE');
  if (crewStationResolved !== true) return reject('CREW_STATION_UNRESOLVED');
  if (targetResolved !== true || !validString(targetId)) return reject('TARGET_UNRESOLVED');
  if (!validString(vehicleId) || !validString(attackId) || !validString(weaponGroupKey)) return reject('ATTACK_SCOPE_UNRESOLVED');
  if (arcEvidence === 'PRINTED_VALUE' && validArc(arc)) {
    return { status: 'ALLOW_VERIFIED_ARC', arc, canonicalMutationAllowed: false };
  }
  if (arcEvidence !== 'SOURCE_SILENT_CONFIRMED') return reject('ARC_NOT_RESOLVED_BY_SOURCE');
  if (!validGmContext(context, override, {vehicleId, attackId, weaponGroupKey, targetId}) || !validArc(override.selectedArc))
    return reject('UNPRINTED_ARC_BLOCKS_AUTOMATIC_TARGETING');
  return { status: 'ALLOW_GM_INSTANCE_EXCEPTION', selectedArc: override.selectedArc,
    receipt: instanceReceipt({ context, override, type: 'UNKNOWN_ARC_INSTANCE_EXCEPTION', value: override.selectedArc }),
    canonicalMutationAllowed: false, operationalCertificationGranted: false };
}

/** Preserve all contradictory printed values. No automatic source-number precedence. */
export function decideConflictedAttackValue({ conflict, context, override, vehicleId, attackId, weaponGroupKey, targetId }) {
  if (!validateEvidenceClaim(conflict).valid || conflict.state !== 'PUBLISHED_CONFLICT')
    return reject('INVALID_SOURCE_CONFLICT');
  if (!validString(vehicleId) || !validString(attackId) || !validString(weaponGroupKey) || !validString(targetId))
    return reject('ATTACK_SCOPE_UNRESOLVED');
  if (!validGmContext(context, override, {vehicleId, attackId, weaponGroupKey, targetId}) || !own(override, 'selectedValue') ||
      !conflict.alternatives.some(x => Object.is(x.value, override.selectedValue)))
    return reject('PUBLISHED_CONFLICT_REQUIRES_EXPLICIT_GM_CHOICE');
  return { status: 'ALLOW_GM_INSTANCE_ADJUDICATION', selectedValue: override.selectedValue,
    receipt: instanceReceipt({context,override,type:'PUBLISHED_CONFLICT_INSTANCE_CHOICE',value:override.selectedValue}),
    canonicalMutationAllowed: false, canonicalValueSelected: false, operationalCertificationGranted: false };
}

/** Demonstration certification gate. GM exception never raises certification. */
export function assessStrictMechanicalCertification({ sourceComplete, allRequiredConsumerFieldsValidated, sourceConflictsResolvedWithAuthority, requiredOperationalCapabilitiesValidated, usesGmInstanceOverride }) {
  const blockers = [];
  if (sourceComplete !== true) blockers.push('SOURCE_INCOMPLETE');
  if (allRequiredConsumerFieldsValidated !== true) blockers.push('FIELD_PRODUCER_CONSUMER_PARITY_UNPROVEN');
  if (sourceConflictsResolvedWithAuthority !== true) blockers.push('PUBLISHED_CONFLICTS_UNADJUDICATED');
  if (requiredOperationalCapabilitiesValidated !== true) blockers.push('OPERATIONAL_CAPABILITIES_UNPROVEN');
  if (usesGmInstanceOverride === true) blockers.push('TEMPORARY_GM_OVERRIDE_NOT_CERTIFICATION');
  return { strictMechanicalCertified: blockers.length === 0, blockers };
}

/** Supplemental identities may not collide or rewrite historical source claims. */
export function validateSupplementalCensus(originalKeys, overlay) {
  if (!Array.isArray(originalKeys) || originalKeys.length !== 316 || new Set(originalKeys).size !== 316) return reject('HISTORICAL_ROSTER_INVALID');
  if (overlay?.immutablePhase1?.historicalCount !== 316 || overlay?.amendedClaimCount !== 318 ||
      overlay?.supplementalCount !== 2 || overlay?.existing316EntriesModified !== 0 ||
      !Array.isArray(overlay.supplementalEntries) || overlay.supplementalEntries.length !== 2) return reject('OVERLAY_POLICY_MISMATCH');
  const supplemental = overlay.supplementalEntries.map(e => e.sourceEntryKey);
  if (supplemental.some(k => !validString(k)) || new Set(supplemental).size !== 2 || supplemental.some(k=>originalKeys.includes(k))) return reject('SUPPLEMENTAL_KEY_COLLISION');
  if (overlay.supplementalEntries.some(e=>e.certification?.sourceComplete!==true || e.certification?.strictMechanicalCertified!==false)) return reject('UNVERIFIED_OR_MISLABELED_SUPPLEMENTAL_SOURCE');
  return {status:'APPROVED_SUPPLEMENTAL_CENSUS', historicalCount:316, amendedClaimCount:318, originalPhase1Mutated:false};
}
/** CP22 published-book effective rule lookup; never installed-weapon trust. */
export {resolveCP21ApprovedPublicationReference,inspectCP21LegacyPackCandidate}
  from './vehicle-cp22-source-view.js';

/**
 * CP23-C1 conservative source-draft integrity reading. These exports never
 * authenticate Foundry pack installation or permit an automated stock attack.
 */
export {CP23C_RECEIPT_STATE,canonicalCP23CJson,draftCP23CSnapshot,evaluateCP23CDraftParity}
  from './vehicle-cp23c-source-integrity.js';

/**
 * CP23-C2: non-authorizing config-vs-game-state parity and native-pack
 * installation prerequisites. Unregistered CP23B draft actors cannot be
 * authenticated as canonical world installations by these observers.
 */
export {CP23C2_STATUS,assessCP23C2ConfigurationParity,inspectCP23C2NativeInstallCandidate}
  from './vehicle-cp23c2-installation-preflight.js';

/** CP23-C4 GM-owned world observation ledger: never a stock installation receipt. */
export {CP23C4_SCHEMA,emptyCP23C4Ledger,validateCP23C4Ledger,readCP23C4ObservationLedger}
  from './vehicle-cp23c4-gm-observation-ledger.js';

/**
 * CP23-C4B: source-document and world-Actor identity are independent.
 * Read-time structural matching never mints a native installation receipt.
 */
export {CP23C4B_STATUS,CP23C4B_SOURCE_PACK,
  inspectCP23C4BWorldInstallationCandidate,verifyCP23C4BClaimedReceipt}
  from './vehicle-cp23c4b-world-binding.js';
