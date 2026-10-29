/**
 * Phase 4E P0: one source-aware, read-only vehicle Actor boundary.
 *
 * The published record in flags.swse.universalVehicleSource.source is the
 * publication claim; it is never an authorization to install or fire weapons.
 * This module has no Foundry globals and can be used in Node tests.
 */
import { getUniversalVehiclePackForCategory } from './universal-vehicle-pack-registry.js';
import { digestUniversalVehicleSource } from './vehicle-source-digest.js';

const SOURCE_SCHEMA = 'swse.vehicle.universal.actor-source.v1';
const finite = value => typeof value === 'number' && Number.isFinite(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key);
const copy = value => value === undefined ? undefined : structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const frozen = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
};
const issue = (errors, code) => { if (!errors.includes(code)) errors.push(code); };
const itemsCount = value => Array.isArray(value) ? value.length :
  typeof value?.size === 'number' ? value.size : 0;
/**
 * Published mirrors are presentation conveniences, never a second editable
 * rules database. Compare them to the stored source record at creation;
 * unknown values cannot silently become 0, 6, or a fabricated price.
 * Mutable HP/SR values and crewPositions are intentionally not constrained
 * to their initial values here.
 */
function validatePublishedMirrors(sys, record, errors) {
  if (!record || typeof record !== 'object') return;
  const check = (field, expected, code, { tolerateBlank = false } = {}) => {
    const actual = sys[field];
    if (tolerateBlank && expected === undefined &&
        (actual === undefined || actual === null || actual === '')) return;
    if (!same(actual, expected)) issue(errors, code);
  };
  const rawCrew = typeof record.crew?.raw === 'string'
    ? record.crew.raw.trim() : '';
  const count = record.crew?.crewCount;
  const crew = rawCrew || (finite(count) ? String(count) : undefined);
  check('crew', crew, 'PUBLISHED_CREW_MIRROR_DRIFT', { tolerateBlank: true });
  if (count !== null && count !== undefined)
    check('vehicleCrewCount', count, 'PUBLISHED_CREW_MIRROR_DRIFT');
  if (rawCrew)
    check('vehicleCrewLabel', rawCrew, 'PUBLISHED_CREW_MIRROR_DRIFT');

  const passengers = record.capacity?.passengerCount;
  if (finite(passengers))
    check('passengers', passengers, 'PUBLISHED_PASSENGERS_MIRROR_DRIFT');
  if (passengers !== null && passengers !== undefined)
    check('vehiclePassengers', passengers, 'PUBLISHED_PASSENGERS_MIRROR_DRIFT');

  const quantity = value => {
    if (!value || typeof value !== 'object') return undefined;
    if (typeof value.raw === 'string' && value.raw.trim()) return value.raw.trim();
    return value.value !== undefined && value.value !== null
      ? String(value.value) + (value.unit ? ' ' + value.unit : '')
      : undefined;
  };
  check('cargo', quantity(record.capacity?.cargo), 'PUBLISHED_CARGO_MIRROR_DRIFT',
    { tolerateBlank: true });
  check('consumables', quantity(record.capacity?.consumables), 'PUBLISHED_CONSUMABLES_MIRROR_DRIFT',
    { tolerateBlank: true });
  if (record.capacity?.cargo != null)
    check('vehiclePublishedCargo', record.capacity.cargo, 'PUBLISHED_CARGO_MIRROR_DRIFT');
  if (record.capacity?.consumables != null)
    check('vehiclePublishedConsumables', record.capacity.consumables, 'PUBLISHED_CONSUMABLES_MIRROR_DRIFT');

  const price = record.economics?.priceNew;
  if (price && typeof price === 'object')
    check('vehiclePublishedPrice', price, 'PUBLISHED_PRICE_MIRROR_DRIFT');
  if (price?.status === 'priced' && finite(price.amountCredits)) {
    check('cost', price.amountCredits, 'PUBLISHED_PRICE_MIRROR_DRIFT');
    check('costNumeric', price.amountCredits, 'PUBLISHED_PRICE_MIRROR_DRIFT');
  } else if ((finite(sys.cost) && sys.cost > 0) ||
             (finite(sys.costNumeric) && sys.costNumeric > 0)) {
    issue(errors, 'UNKNOWN_PRICE_PROMOTED_TO_NUMBER');
  }

  const hyper = record.hyperspace ?? {};
  if (Object.keys(hyper).length)
    check('vehiclePublishedHyperdrive', hyper, 'PUBLISHED_HYPERDRIVE_MIRROR_DRIFT');
  if (record.classification?.printedSize != null)
    check('size', record.classification.printedSize, 'PUBLISHED_SIZE_MIRROR_DRIFT');
}

const fieldsWithClaims = [
  'vehicleSourceEntryKey', 'vehicleSourceBook', 'vehicleSourcePage',
  'vehicleSourcePrimaryCategory', 'vehiclePackName',
  'vehiclePublishedShieldStatus'
];

function inspect(document, data) {
  const raw = typeof document?.toObject === 'function' ? document.toObject() : document ?? {};
  // Foundry provides both the creation payload and an initialized Document.
  // Consult both: never allow an incomplete/contradictory data payload to hide
  // a canonical claim in the initialized Document, or vice versa.
  const docSystem = raw?.system ?? document?.system ?? {};
  const inputSystem = data?.system ?? {};
  const docFlags = raw?.flags?.swse ?? document?.flags?.swse ?? {};
  const inputFlags = data?.flags?.swse ?? {};
  const hasClaim = [docFlags, inputFlags].some(f =>
    own(f, 'canonicalPublication') || own(f, 'universalVehicleSource')) ||
    [docSystem, inputSystem].some(s => fieldsWithClaims.some(k => own(s, k)));
  return {
    raw, docSystem, inputSystem, docFlags, inputFlags, hasClaim,
    system: { ...docSystem, ...inputSystem },
    flags: { ...docFlags, ...inputFlags },
    type: data?.type ?? raw?.type ?? document?.type,
    items: data?.items ?? raw?.items ?? document?.items,
    documentItems: raw?.items ?? document?.items,
    inputItems: data?.items
  };
}

/**
 * Classify all vehicle creation shapes, with an explicit malformed-claim state.
 * This gate intentionally does NOT validate world Actor _id against a
 * compendium ID: sourceEntryKey identifies a publication, not a world Actor.
 *
 * For full source-only creations the printed base fields must match exactly.
 * Current HP/SR may be lower than their published maxima; source provenance
 * and maxima must not change. V13 may supply zero-only SR placeholders.
 */
export function classifyVehicleActorSource(document, data = undefined) {
  const view = inspect(document, data);
  if (view.type !== 'vehicle') return { kind: 'not-vehicle', errors: [] };
  if (!view.hasClaim) {
    const scratch = Boolean(view.flags.vehiclePhase4dScratch);
    return { kind: scratch ? 'scratch' : 'custom', errors: [] };
  }

  const errors = [], sys = view.system, flags = view.flags;
  const canonical = flags.canonicalPublication;
  const universal = flags.universalVehicleSource;
  const original = universal?.source;
  const key = original?.identity?.sourceEntryKey;
  const category = original?.classification?.primaryCategory;
  const book = original?.publication?.book, page = original?.publication?.page;
  const owner = getUniversalVehiclePackForCategory(category);
  const groups = original?.armament?.firingGroups;
  const printedSR = original?.defenses?.shieldRating;

  // If both Foundry surfaces supplied a claim, they must agree. A partial
  // source payload must never silently win over an initialized Document.
  for (const field of fieldsWithClaims) {
    if (own(view.docSystem, field) && own(view.inputSystem, field) &&
        !same(view.docSystem[field], view.inputSystem[field]))
      issue(errors, 'CONFLICTING_CREATION_SYSTEM');
  }
  // A supplied swse canonical-claim payload must be complete. An omitted
  // half of provenance cannot be inherited from a different creation surface.
  if (object(data?.flags?.swse) &&
      (own(view.inputFlags, 'canonicalPublication') || own(view.inputFlags, 'universalVehicleSource')) &&
      (!own(view.inputFlags, 'canonicalPublication') || !own(view.inputFlags, 'universalVehicleSource')))
    issue(errors, 'INCOMPLETE_CREATION_PROVENANCE');
  if ((own(view.docFlags, 'canonicalPublication') || own(view.docFlags, 'universalVehicleSource')) &&
      (!own(view.docFlags, 'canonicalPublication') || !own(view.docFlags, 'universalVehicleSource')))
    issue(errors, 'INCOMPLETE_DOCUMENT_PROVENANCE');
  for (const field of ['canonicalPublication', 'universalVehicleSource']) {
    if (own(view.docFlags, field) && own(view.inputFlags, field) &&
        !same(view.docFlags[field], view.inputFlags[field]))
      issue(errors, 'CONFLICTING_CREATION_FLAGS');
  }

  if (universal?.schema !== SOURCE_SCHEMA ||
      original?.recordType !== 'vehicle-source-entry' ||
      !/^[0-9a-f]{64}$/.test(String(universal?.recordDigest ?? '')))
    issue(errors, 'SOURCE_EVIDENCE_MISSING');
  else if (digestUniversalVehicleSource(original) !== universal.recordDigest)
    issue(errors, 'SOURCE_RECORD_DIGEST_DRIFT');
  if (typeof key !== 'string' || !key.trim() ||
      sys.vehicleSourceEntryKey !== key ||
      canonical?.sourceEntryKey !== key)
    issue(errors, 'SOURCE_IDENTITY_DRIFT');
  if (!book || page === undefined || page === null ||
      sys.vehicleSourceBook !== book || sys.vehicleSourcePage !== page ||
      canonical?.sourceBook !== book || canonical?.printedPage !== page)
    issue(errors, 'SOURCE_PUBLICATION_DRIFT');
  if (!owner || sys.vehiclePackName !== owner.name ||
      sys.vehicleSourcePrimaryCategory !== category ||
      sys.category !== category)
    issue(errors, 'SOURCE_CATEGORY_DRIFT');
  if (typeof original?.identity?.name !== 'string' ||
      sys.model !== original.identity.name)
    issue(errors, 'SOURCE_MODEL_DRIFT');

  if (canonical?.sourceCertification !== 'SOURCE_ONLY' ||
      canonical?.foundryStockAttackTrusted !== false ||
      canonical?.physicalMountCertification !== false)
    issue(errors, 'SOURCE_ONLY_TRUST_REQUIRED');

  if (!finite(original?.abilities?.initiativePrinted) ||
      !finite(sys.initiative) ||
      sys.initiative !== original.abilities.initiativePrinted)
    issue(errors, 'PUBLISHED_INITIATIVE_DRIFT');
  if (!finite(original?.durability?.hitPoints) ||
      !finite(sys.hp?.max) || sys.hp.max !== original.durability.hitPoints ||
      !finite(sys.hp?.value) || sys.hp.value < 0 || sys.hp.value > sys.hp.max)
    issue(errors, 'PUBLISHED_HP_DRIFT');
  if (!finite(original?.defenses?.reflex) ||
      !finite(original?.defenses?.fortitude) ||
      sys.reflexDefense !== original.defenses.reflex ||
      sys.fortitudeDefense !== original.defenses.fortitude)
    issue(errors, 'PUBLISHED_DEFENSE_DRIFT');

  const shieldStatus = finite(printedSR) && printedSR >= 0 ? 'published' : 'unknown';
  if (sys.vehiclePublishedShieldStatus !== shieldStatus ||
      (shieldStatus === 'published' && (
        sys.shieldRating !== printedSR || sys.shields?.max !== printedSR ||
        !finite(sys.shields?.value) || sys.shields.value < 0 ||
        sys.shields.value > printedSR)) ||
      (shieldStatus === 'unknown' && (
        (own(sys, 'shieldRating') && sys.shieldRating !== 0) ||
        (own(sys, 'shields') && (
          sys.shields?.max !== 0 || sys.shields?.value !== 0)))))
    issue(errors, 'PUBLISHED_SHIELD_STATE_DRIFT');

  if (!Array.isArray(groups) ||
      !groups.every(g => Array.isArray(g.mountKeys) && g.mountKeys.length === 0) ||
      own(original?.armament, 'weaponMounts') ||
      !Array.isArray(sys.weapons) || sys.weapons.length !== 0 ||
      itemsCount(view.items) !== 0 ||
      itemsCount(view.documentItems) !== 0 ||
      itemsCount(view.inputItems) !== 0 ||
      (own(sys, 'sourceAttackGroups') && !same(sys.sourceAttackGroups, groups)))
    issue(errors, 'SOURCE_ATTACKS_NOT_INSTALLABLE');

  if (own(sys, 'vehicleMovementModes') &&
      !same(sys.vehicleMovementModes, original?.movement?.speedModes ?? []))
    issue(errors, 'SOURCE_MOVEMENT_DRIFT');
  if (own(sys, 'vehicleSourceFieldStates') &&
      !same(sys.vehicleSourceFieldStates, original?.fieldStates ?? {}))
    issue(errors, 'SOURCE_FIELD_STATES_DRIFT');
  validatePublishedMirrors(sys, original, errors);

  return {
    kind: errors.length ? 'invalid-canonical' : 'canonical',
    sourceEntryKey: key ?? null,
    errors
  };
}

/** A field's published epistemic state; 0 is never treated as missing. */
export function getVehiclePublishedFieldState(value, evidence = undefined) {
  const state = typeof evidence === 'string' ? evidence :
    evidence?.status ?? evidence?.state ?? '';
  const label = String(state).toLowerCase();
  if (/conflict|ambiguous/.test(label)) return 'conflicting';
  if (/conditional/.test(label)) return 'conditional';
  if (/unknown|missing|silent|not.published/.test(label)) return 'unknown';
  if (value === undefined || value === null) return 'unknown';
  if (typeof value === 'number' && value === 0) return 'explicit-zero';
  return 'known';
}

/**
 * Read-only selector for P1-P4. Never synthesize source statistics from
 * system.hull, shipyard formulas, a name lookup or printed attack groups.
 * Mutable gameplay state is exposed separately from the published base.
 */
export function getVehicleRuntimeProjection(actor) {
  const assessment = classifyVehicleActorSource(actor);
  if (assessment.kind === 'invalid-canonical')
    throw new Error('UNIVERSAL_VEHICLE_SOURCE_INVALID: ' + assessment.errors.join(','));
  if (assessment.kind !== 'canonical') return frozen({
    kind: assessment.kind, source: null, published: null,
    current: null, installed: null
  });

  const raw = typeof actor?.toObject === 'function' ? actor.toObject() : actor;
  const sys = raw.system ?? {};
  const record = raw.flags.swse.universalVehicleSource.source;
  const shield = record.defenses?.shieldRating;
  const fieldStates = record.fieldStates ?? {};
  const state = (path, value) => getVehiclePublishedFieldState(
    value, fieldStates[path] ?? fieldStates['/' + path.replaceAll('.', '/')]
  );
  const published = {
    model: record.identity.name,
    initiative: { value: record.abilities.initiativePrinted,
      state: state('abilities.initiativePrinted', record.abilities.initiativePrinted) },
    hitPoints: { value: record.durability.hitPoints,
      state: state('durability.hitPoints', record.durability.hitPoints) },
    defenses: {
      reflex: record.defenses.reflex, fortitude: record.defenses.fortitude,
      shield: { value: finite(shield) ? shield : null,
        state: state('defenses.shieldRating', shield) }
    },
    movementModes: copy(record.movement?.speedModes ?? []),
    crew: copy(record.crew ?? null),
    capacity: copy(record.capacity ?? null),
    hyperspace: copy(record.hyperspace ?? null),
    price: copy(record.economics?.priceNew ?? null),
    attackGroups: copy(record.armament?.firingGroups ?? []),
    attackGroupsExecutable: false
  };
  return frozen({
    kind: 'canonical',
    source: {
      sourceEntryKey: record.identity.sourceEntryKey,
      book: record.publication.book, page: record.publication.page,
      primaryCategory: record.classification.primaryCategory,
      packName: sys.vehiclePackName,
      certification: 'SOURCE_ONLY'
    },
    published,
    current: {
      hitPoints: copy(sys.hp),
      shields: { value: sys.shields?.value ?? null, max: sys.shields?.max ?? null },
      crewAssignments: copy(sys.crewPositions ?? null)
    },
    // Until the P2 installation ledger exists, actor-provided modification
    // claims are display/reference only, never certified installed hardware.
    installed: {
      modifications: [], mounts: [], stockMountsCertified: false,
      certification: 'NONE'
    },
    unverifiedModificationClaims: copy(sys.vehicleModifications ?? [])

  });
}
