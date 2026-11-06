/**
 * Phase 2C source-evidence coercion primitives.
 * These functions do not infer source values. In particular a missing printed
 * attack bonus is not a printed +0, and missing SR is not SR 0.
 */
import { validateEvidenceClaim } from './vehicle-evidence-authority.js';

export function formatVehicleAttackSummary(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return null;
    return value >= 0 ? `+${value}` : `${value}`;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  // Preserve a complicated published attack line verbatim; no lossy parsing.
  if (!/^[+-]?\d+$/.test(text)) return text;
  const n = Number(text);
  return Number.isSafeInteger(n) ? (n >= 0 ? `+${n}` : `${n}`) : null;
}

export function numericVehicleAttackBonus(value) {
  const summary = formatVehicleAttackSummary(value);
  if (summary === null || !/^[+-]?\d+$/.test(summary)) return null;
  const bonus = Number(summary);
  return Number.isSafeInteger(bonus) ? bonus : null;
}

/**
 * For canonical source fields, preserve absent/unknown/conflict as unresolved.
 * The live runtime shield resource may be independently 0 (a depleted shield),
 * but that is never evidence the ship was printed with SR 0.
 */
export function resolvePrintedShieldEvidence(claim) {
  const v = validateEvidenceClaim(claim);
  if (!v.valid) return {status:'BLOCK',reason:v.reason};
  if (claim.state === 'PRINTED_VALUE') {
    if (!Number.isInteger(claim.value) || claim.value < 0) return {status:'BLOCK',reason:'INVALID_PRINTED_SR'};
    return {status:'SOURCE_VALUE',shieldRating:claim.value};
  }
  if (claim.state === 'EXPLICIT_NONE') return {status:'EXPLICIT_NONE',shieldRating:null};
  if (claim.state === 'SOURCE_SILENT_CONFIRMED') return {status:'SOURCE_SILENT_CONFIRMED'};
  if (claim.state === 'PUBLISHED_CONFLICT') return {status:'PUBLISHED_CONFLICT',alternatives:claim.alternatives};
  if (claim.state === 'CONFIGURATION_CONDITIONAL') return {status:'CONFIGURATION_CONDITIONAL',configurationKey:claim.configurationKey};
  return {status:'BLOCK',reason:'UNREVIEWED_SHIELD_SOURCE'};
}