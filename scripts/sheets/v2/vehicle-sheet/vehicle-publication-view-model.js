/**
 * Phase 4E P1: pure display model for source-backed (canonical) vehicle Actors.
 *
 * Reads ONLY getVehicleRuntimeProjection(); never system.hull, system.type,
 * names, free-text categories or printed attack groups. Unknown, absent,
 * conditional, conflicting, explicit-zero and positive published values are
 * rendered as different states; nothing here fabricates a default.
 * No Foundry globals: Node-testable.
 */
import { getVehicleRuntimeProjection } from '../../../domain/vehicles/vehicle-runtime-contract.js';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const text = value => (typeof value === 'string' && value.trim()) ? value.trim() : null;
/** Signed printed bonus: -2 -> "-2", 0 -> "+0", 5 -> "+5" (never "+-2"; zero is a value). */
export function signedBonus(n) { return n < 0 ? String(n) : '+' + n; }

export const SOURCE_UNKNOWN = 'Not stated in source';

function quantity(q) {
  if (q === null || q === undefined) return { display: SOURCE_UNKNOWN, known: false };
  const raw = text(q.raw);
  if (raw) return { display: raw, known: true };
  if (finite(q.value)) return { display: q.value + (q.unit ? ' ' + q.unit : ''), known: true };
  return { display: SOURCE_UNKNOWN, known: false };
}

/** Shield display by published state; current value only for a known SR. */
export function describeShield(published, current) {
  const fact = published.defenses.shield;
  const out = { state: fact.state, rating: fact.value, current: null, max: null,
    editable: false, label: '' };
  switch (fact.state) {
    case 'unknown': out.label = 'Shield rating not stated in source'; break;
    case 'conditional': out.label = 'Shield rating conditional in source'; break;
    case 'conflicting': out.label = 'Shield rating conflicting in source'; break;
    case 'explicit-zero': out.label = 'SR 0 (printed)'; out.rating = 0; break;
    default:
      if (finite(fact.value)) {
        out.max = fact.value;
        out.current = finite(current?.value) ? current.value : fact.value;
        out.editable = true;
        out.label = `SR ${out.current} / ${fact.value}`;
      } else out.label = 'Shield rating not stated in source';
  }
  return out;
}

function priceView(price) {
  if (!price) return { status: 'absent', label: 'Price not stated in source', purchasable: false };
  if (price.status === 'priced' && finite(price.amountCredits))
    return { status: 'priced', label: `${price.amountCredits.toLocaleString('en-US')} credits (published)`,
      amountCredits: price.amountCredits, purchasable: false };
  const labels = { 'not-for-sale': 'Not for sale (published)',
    ambiguous: 'Price ambiguous in source' };
  return { status: String(price.status), label: labels[price.status] ?? 'Price not stated in source',
    purchasable: false }; // purchasability is a Store (P3) decision, never a sheet one
}

function hyperdriveView(h) {
  if (!h || !Object.keys(h).length) return { capability: 'not-stated', label: 'Hyperdrive not stated in source' };
  const raw = text(h.raw);
  const labels = { unavailable: 'No hyperdrive (published)', unknown: 'Hyperdrive not stated in source',
    external: 'External hyperdrive only' };
  const cap = h.capability ?? 'not-stated';
  return { capability: cap, label: cap === 'equipped' ? (raw ?? 'Hyperdrive equipped')
    : (labels[cap] ?? raw ?? 'Hyperdrive not stated in source') };
}

function crewView(crew, passengers) {
  const count = crew?.crewCount;
  const label = text(crew?.raw) ?? (finite(count) ? String(count) : null);
  return {
    label: label ?? SOURCE_UNKNOWN,
    count: finite(count) ? count : null, // never defaults to 6
    quality: text(crew?.crewQuality),
    descriptor: crew?.crewDescriptor ?? null,
    passengers: finite(passengers) ? passengers : null,
    passengersLabel: finite(passengers) ? String(passengers) : SOURCE_UNKNOWN
  };
}

function movementView(modes) {
  return (modes ?? []).map(m => ({
    mode: m.mode, scale: m.scale,
    squares: finite(m.squaresPerMove) ? m.squaresPerMove : null,
    maxVelocityKmh: finite(m.maxVelocityKmh) ? m.maxVelocityKmh : null,
    raw: text(m.raw),
    label: `${m.scale === 'starship' ? 'Starship' : 'Character'} scale: ${m.mode}` +
      (finite(m.squaresPerMove) ? ` ${m.squaresPerMove} squares` : '') +
      (finite(m.maxVelocityKmh) ? ` (max ${m.maxVelocityKmh} km/h)` : '')
  }));
}

/**
 * @returns {null|object} null for scratch/custom/non-vehicle Actors.
 */
export function buildVehiclePublicationViewModel(actor, projection = getVehicleRuntimeProjection(actor)) {
  if (projection?.kind !== 'canonical') return null;
  const { source, published, current, installed } = projection;
  const record = actor?.flags?.swse?.universalVehicleSource?.source
    ?? (typeof actor?.toObject === 'function' ? actor.toObject().flags?.swse?.universalVehicleSource?.source : null) ?? {};
  const defenses = record.defenses ?? {};
  const known = (v) => finite(v) ? { value: v, display: String(v), known: true }
    : { value: null, display: SOURCE_UNKNOWN, known: false };
  const shield = describeShield(published, current.shields);
  const hpValue = current.hitPoints?.value, hpMax = published.hitPoints.value;
  return {
    identity: {
      sourceKey: source.sourceEntryKey, printedModel: published.model,
      callSign: actor?.name ?? published.model,
      callSignDiffers: (actor?.name ?? published.model) !== published.model,
      book: source.book, page: source.page,
      printedType: text(record.publication?.printedTypeLine),
      category: source.primaryCategory, size: text(record.classification?.printedSize),
      packName: source.packName, certification: source.certification
    },
    initiative: known(published.initiative.value), // signed numeric; 0 is a value
    hp: { current: hpValue, max: hpMax, editable: true },
    defenses: {
      reflex: known(published.defenses.reflex), fortitude: known(published.defenses.fortitude),
      flatFooted: known(defenses.reflexFlatFooted), armorBonus: known(defenses.armorBonus),
      damageReduction: known(defenses.damageReduction),
      damageThreshold: known(record.durability?.damageThreshold),
      will: { value: null, display: 'Not a vehicle defense', known: false }
    },
    shield,
    movement: movementView(published.movementModes),
    crew: crewView(published.crew, published.capacity?.passengerCount),
    cargo: quantity(published.capacity?.cargo),
    consumables: quantity(published.capacity?.consumables),
    hyperdrive: hyperdriveView(published.hyperspace),
    price: priceView(published.price),
    availability: text(record.economics?.availability),
    attackReference: {
      executable: false,
      note: 'Printed attack groups are reference-only. No installed mounts are certified.',
      groups: published.attackGroups.map(g => ({
        label: g.label, attackBonusPrinted: finite(g.attackBonusPrinted) ? g.attackBonusPrinted : null,
        attackLabel: finite(g.attackBonusPrinted) ? signedBonus(g.attackBonusPrinted) : null,
        notes: text(g.specialNotes)
      }))
    },
    installed: { mounts: installed.mounts, modifications: installed.modifications,
      certification: installed.certification },
    unverifiedModificationClaims: projection.unverifiedModificationClaims ?? []
  };
}

/** Crew summary that never invents a complement. */
export function buildPublishedCrewSummary(view, crewPositions = {}) {
  const filled = Object.values(crewPositions ?? {}).filter(e =>
    typeof e === 'string' ? !!e : !!(e && (e.uuid || e.id || e.actorId || e.name))).length;
  return { filledSlots: filled, totalSlots: view.crew.count, totalKnown: view.crew.count !== null,
    complementLabel: view.crew.label, quality: view.crew.quality ?? SOURCE_UNKNOWN,
    passengers: view.crew.passengers === null ? 'Passengers: ' + SOURCE_UNKNOWN
      : `${view.crew.passengers} passengers` };
}
