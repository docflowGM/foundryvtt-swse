/**
 * Phase 4E P4-A: published base values for derived vehicle data.
 *
 * For source-backed vehicles, printed defenses, damage threshold, damage reduction and
 * maximum hit points come from the digest-verified publication record, never from the
 * mutable system mirrors (which the creation gate does not fully constrain and which a
 * later update could drift). Current HP/SR remain actor state. Unknown printed values
 * are reported as unknown, not turned into plausible numbers.
 * No Foundry globals: Node-testable.
 */
import { getVerifiedPublishedRecord, claimsPublishedSource } from './vehicle-source-identity.js';
import { readCertifiedInstallations } from './vehicle-installation-ledger.js';
import { computeEffectiveStatistics } from './vehicle-modification-effects.js';

const finite = v => typeof v === 'number' && Number.isFinite(v);

// One verification implementation for every consumer (see vehicle-source-identity.js).
export { getVerifiedPublishedRecord, claimsPublishedSource };

/** @returns {null|object} null when the actor has no verified publication record. */
export function getPublishedDerivedBase(actor) {
  const r = getVerifiedPublishedRecord(actor);
  if (!r) return null;
  const d = r.defenses ?? {};
  return {
    reflex: finite(d.reflex) ? d.reflex : null,
    fortitude: finite(d.fortitude) ? d.fortitude : null,
    flatFooted: finite(d.reflexFlatFooted) ? d.reflexFlatFooted : null,
    damageThreshold: finite(r.durability?.damageThreshold) ? r.durability.damageThreshold : null,
    damageReduction: finite(d.damageReduction) ? d.damageReduction : null,
    hpMax: finite(r.durability?.hitPoints) ? r.durability.hitPoints : null,
    initiative: finite(r.abilities?.initiativePrinted) ? r.abilities.initiativePrinted : null,
    movement: summarizeMovement(r.movement?.speedModes)
  };
}

/** Printed Initiative (signed; 0 is a value) or null when the actor has no verified record. */
export function getPublishedVehicleInitiative(actor) {
  if (actor?.type !== 'vehicle') return null;
  const base = getPublishedDerivedBase(actor);
  if (base) return base.initiative;
  // A publication claim that fails verification never falls back to the character formula.
  if (claimsPublishedSource(actor)) throw new Error('UNIVERSAL_VEHICLE_SOURCE_INVALID: initiative');
  return null;
}

/**
 * Structured published movement. Character-scale and starship-scale squares are kept
 * apart, every mode is preserved, and a vehicle with no published mode has unknown
 * (null) movement, never a character default speed.
 */
export function summarizeMovement(speedModes) {
  const modes = (Array.isArray(speedModes) ? speedModes : []).map(m => ({
    mode: m?.mode ?? null, scale: m?.scale ?? null,
    squares: finite(m?.squaresPerMove) ? m.squaresPerMove : null,
    maxVelocityKmh: finite(m?.maxVelocityKmh) ? m.maxVelocityKmh : null
  }));
  const character = modes.filter(m => m.scale === 'character');
  const starship = modes.filter(m => m.scale === 'starship');
  return {
    known: modes.length > 0, modes,
    primaryCharacter: character[0] ?? null,
    primaryStarship: starship[0] ?? null,
    walking: character.find(m => m.mode === 'walking') ?? null
  };
}

/* ------------------------------------------------------------------ */
/* Effective statistics: published base + certified installed effects  */
/* ------------------------------------------------------------------ */

/**
 * The ONE effective-statistics authority for source-backed vehicles (sheet, derived data, combat).
 * effective = verified published record + effects of the sealed, certified installation ledger
 * (vehicle-modification-effects.js). The published record is never rewritten; removing an installation
 * restores the published values because this is recomputed every time. null = no verified record.
 *
 * Applied to gameplay: Reflex Defense, Initiative, Shield Rating maximum, hyperdrive availability.
 * Exposed but not auto-applied: the Dexterity-modifier delta for Pilot checks (no vehicle Pilot roller exists
 * yet) and atmospheric speed (conditional on being in an atmosphere; no atmosphere state exists).
 */
export function getEffectiveVehicleDerived(actor) {
  const base = getPublishedDerivedBase(actor);
  if (!base) return null;
  const record = getVerifiedPublishedRecord(actor);
  const raw = typeof actor?.toObject === 'function' ? actor.toObject() : actor;
  const { entries } = readCertifiedInstallations(raw?.flags, record.identity.sourceEntryKey);
  const fx = computeEffectiveStatistics({ record, entries });
  const printedSR = record.defenses?.shieldRating;
  const shieldMax = fx.shield.sources.length ? fx.shield.effective : (finite(printedSR) ? printedSR : null);
  return {
    ...base,
    published: base,
    reflex: fx.reflex.effective ?? base.reflex,
    initiative: fx.initiative.effective ?? base.initiative,
    shieldMax,
    shieldFromInstallation: fx.shield.sources.length > 0,
    hyperdrive: fx.hyperdrive.effectiveClass !== null
      ? { capability: 'equipped', class: fx.hyperdrive.effectiveClass, fromInstallation: true }
      : { capability: record.hyperspace?.capability ?? null, class: record.hyperspace?.primaryMultiplier ?? null, fromInstallation: false },
    pilotDexModifierDelta: fx.initiative.delta,
    atmosphericMovement: fx.movement.filter(m => m.sources.length),
    contributions: { reflex: fx.reflex, initiative: fx.initiative, shield: fx.shield },
    unimplemented: fx.unimplemented
  };
}

/** Effective Initiative (printed + certified effects) or null when the actor has no verified record. */
export function getEffectiveVehicleInitiative(actor) {
  if (actor?.type !== 'vehicle') return null;
  const eff = getEffectiveVehicleDerived(actor);
  if (eff) return eff.initiative;
  if (claimsPublishedSource(actor)) throw new Error('UNIVERSAL_VEHICLE_SOURCE_INVALID: initiative');
  return null;
}
