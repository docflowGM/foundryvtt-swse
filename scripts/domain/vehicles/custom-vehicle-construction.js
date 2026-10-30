/**
 * Phase 4E P5: custom (player- or GM-designed) starships.
 *
 * Published basis: Starships of the Galaxy, "Stock Ships" (printed pp. 53-54): to design a ship from
 * scratch, start with a stock frame and use the starship modification rules to add systems. The
 * Starship Designer feat is required, and the designer "normally needs the aid of a shipyard".
 *
 * A custom vehicle is NOT one of the 429 published vehicles. It carries a sealed
 * flags.swse.vehicleConstruction record naming its frame, systems and authorship, and carries no
 * canonicalPublication / universalVehicleSource claim. Systems are validated with the SAME planner,
 * rules and ledger entry format as the Shipyard (no second modification system).
 * Statistics are derived only where the books give the formula; everything else is listed under
 * `pending` with the reason, never invented. No Foundry globals: Node-testable.
 */
import { digestUniversalVehicleSource } from './vehicle-source-digest.js';
import { planVehicleInstallation, DEFAULT_VEHICLE_INSTALLATION_RULES } from './vehicle-installation-ledger.js';

export const CONSTRUCTION_SCHEMA = 'swse.vehicle.custom-construction.v1';
const finite = v => typeof v === 'number' && Number.isFinite(v);
const sizeKey = s => String(s ?? '').trim().toLowerCase();

/** Core Rulebook Table 10-1 (printed p. 166): applies to Reflex Defense. */
export const REFLEX_SIZE_MODIFIER = Object.freeze({
  'huge': -2, 'gargantuan': -5, 'colossal': -10,
  'colossal (frigate)': -10, 'colossal (cruiser)': -10, 'colossal (station)': -10
});
/** Core Rulebook "Damage Threshold" (vehicles): Fortitude Defense + size modifier. */
export const DAMAGE_THRESHOLD_SIZE_MODIFIER = Object.freeze({
  'large': 5, 'huge': 10, 'gargantuan': 20, 'colossal': 50,
  'colossal (frigate)': 100, 'colossal (cruiser)': 200, 'colossal (station)': 500
});

export const abilityModifier = score => finite(score) ? Math.floor((score - 10) / 2) : null;

/** Statistics derivable from a frame by published formulas; the rest is reported as pending. */
export function previewFrame(frame, { armorBonusFromSystems = 0 } = {}) {
  const size = sizeKey(frame?.size);
  const dex = abilityModifier(frame?.dexterity), str = abilityModifier(frame?.strength);
  const refSize = REFLEX_SIZE_MODIFIER[size], dtSize = DAMAGE_THRESHOLD_SIZE_MODIFIER[size];
  if (dex === null || str === null || refSize === undefined || dtSize === undefined)
    return { ok: false, reasons: ['FRAME_STATS_INCOMPLETE'] };
  const armor = frame.armor + armorBonusFromSystems;
  const fortitude = 10 + str; // Fortitude Defense = 10 + vehicle's Strength modifier
  return {
    ok: true, reasons: [],
    derived: {
      reflexDefense: 10 + dex + refSize + armor, // 10 + Dex mod + size modifier + armor bonus
      fortitudeDefense: fortitude,
      damageThreshold: fortitude + dtSize,
      hitPoints: frame.hitPoints, damageReduction: frame.damageReduction, armorBonus: armor,
      speed: frame.speed
    },
    pending: [
      { stat: 'initiative', reason: 'CREW_QUALITY_SIDEBAR_NOT_IN_TEXT (Core Rulebook p. 174; PDF required)' },
      { stat: 'perception', reason: 'CREW_QUALITY_SIDEBAR_NOT_IN_TEXT' },
      { stat: 'baseAttackBonus', reason: 'CREW_QUALITY_SIDEBAR_NOT_IN_TEXT' },
      { stat: 'grapple', reason: 'CREW_QUALITY_SIDEBAR_NOT_IN_TEXT' },
      { stat: 'fightingSpace', reason: 'NOT_TRANSCRIBED' },
      { stat: 'challengeLevel', reason: 'BOOK_GIVES_NO_FORMULA (compare with comparable ships)' }
    ]
  };
}

/**
 * Starship Designer: minimum 30 days and DC 25; +1 DC and +1 day for every additional 100,000
 * credits of final cost beyond the first 100,000. Whether "every additional 100,000" means every
 * FULL 100,000 is the project owner's call, so the rounding must be supplied by the rules seam.
 * @param {{finalCredits:number, designers?:number, rounding?:'floor'|'ceil'}} p
 */
export function designTime({ finalCredits, designers = 1, rounding } = {}) {
  if (!finite(finalCredits) || finalCredits < 0 || !Number.isInteger(designers) || designers < 1)
    return { ok: false, reasons: ['DESIGN_INPUT_INVALID'] };
  if (rounding !== 'floor' && rounding !== 'ceil') return { ok: false, reasons: ['DESIGN_TIME_ROUNDING_UNRULED'] };
  // Several designers with the feat divide the cost used for TIME; the DC uses the full cost.
  const steps = cost => (cost <= 100000 ? 0 : Math[rounding]((cost - 100000) / 100000));
  return { ok: true, reasons: [], days: 30 + steps(finalCredits / designers), mechanicsDC: 25 + steps(finalCredits) };
}

/** Rules seam for decisions the project owner has not made (all default to "not allowed / unknown"). */
export const DEFAULT_CONSTRUCTION_RULES = Object.freeze({
  ...DEFAULT_VEHICLE_INSTALLATION_RULES,
  /** Spendable emplacement points of a new frame. null = unruled. */
  resolveFrameEpPool: () => null,
  designRounding: undefined
});

function sealed(body) { return { ...body, recordDigest: digestUniversalVehicleSource(body) }; }
export function verifyConstructionRecord(record) {
  if (!record || record.schema !== CONSTRUCTION_SCHEMA || typeof record.recordDigest !== 'string') return false;
  const { recordDigest, ...body } = record;
  return digestUniversalVehicleSource(body) === recordDigest;
}

/**
 * Validate a design: certified frame, authorship requirements, every system through the shared planner.
 * @param {object} p
 * @param {object} p.frame            a stock frame (data/canonical/vehicles/construction/stock-frames.json)
 * @param {Array}  p.systems          [{ catalogEntry, installId, nonstandard?, mount? }]
 * @param {object} p.authorship       { kind:'rules-legal'|'gm-homebrew', designerActorId, starshipDesigner, shipyardAidApprovedBy, gmUserId }
 */
export function validateDesign({ designId, name, frame, systems = [], authorship = {}, crewQuality = null, availableCredits = Infinity, rules = DEFAULT_CONSTRUCTION_RULES }) {
  const reasons = [];
  if (!designId || !String(name ?? '').trim()) reasons.push('DESIGN_IDENTITY_MISSING');
  if (!frame?.id) return { ok: false, reasons: ['FRAME_MISSING', ...reasons] };

  const kind = authorship.kind;
  if (kind !== 'rules-legal' && kind !== 'gm-homebrew') reasons.push('AUTHORSHIP_KIND_REQUIRED');
  if (kind === 'rules-legal') {
    if (frame.certification !== 'SOURCE_VERIFIED_TEXT') reasons.push('FRAME_NOT_SOURCE_VERIFIED');
    if (authorship.starshipDesigner !== true) reasons.push('STARSHIP_DESIGNER_FEAT_REQUIRED');
    if (!authorship.shipyardAidApprovedBy) reasons.push('SHIPYARD_AID_APPROVAL_REQUIRED');
  }
  if (kind === 'gm-homebrew' && !authorship.gmUserId) reasons.push('GM_AUTHORSHIP_REQUIRED');
  if (!['untrained', 'normal', 'skilled', 'expert', 'ace', null].includes(crewQuality)) reasons.push('CREW_QUALITY_INVALID');

  const preview = previewFrame(frame);
  if (!preview.ok) reasons.push(...preview.reasons);

  // Systems go through the one shared planner on a synthesized construction "record". A stock
  // frame includes no hyperdrive, cargo space, weapons or shields (SotG p. 53), and a designer with
  // the feat never treats work as nonstandard.
  const record = {
    identity: { sourceEntryKey: `custom-construction:${designId}`, name },
    classification: { printedSize: frame.size },
    hyperspace: { capability: 'unavailable' }, defenses: { shieldRating: 0 }
  };
  let flags = { swse: { vehicleInstallations: [] } };
  const quotes = [];
  let credits = frame.cost ?? 0;
  for (const sys of systems) {
    const plan = planVehicleInstallation({
      record, flags, catalogEntry: sys.catalogEntry, installId: sys.installId, mount: sys.mount ?? null,
      availableCredits: Number.isFinite(availableCredits) ? availableCredits - credits : Number.MAX_SAFE_INTEGER,
      nonstandard: sys.nonstandard, starshipDesigner: authorship.starshipDesigner === true, rules: {
        ...rules, resolveEpBudget: () => {
          const pool = rules.resolveFrameEpPool?.(frame);
          return finite(pool) ? { state: 'known', total: pool } : { state: 'unknown', reason: 'FRAME_EP_POOL_UNRULED' };
        }
      }
    });
    if (!plan.ok) { reasons.push(...plan.reasons.map(r => `${sys.catalogEntry?.id ?? 'system'}:${r}`)); continue; }
    flags = { swse: { vehicleInstallations: plan.nextLedger } };
    quotes.push({ installId: sys.installId, catalogId: sys.catalogEntry.id, credits: plan.entry.priceCredits, quote: plan.entry.quote });
    credits += plan.entry.priceCredits;
  }
  if (Number.isFinite(availableCredits) && credits > availableCredits) reasons.push('INSUFFICIENT_CREDITS');

  const time = designTime({ finalCredits: credits, designers: authorship.starshipDesigners ?? 1, rounding: rules.designRounding });
  return {
    ok: reasons.length === 0, reasons: [...new Set(reasons)], preview, quotes,
    totalCredits: credits, design: time.ok ? { days: time.days, mechanicsDC: time.mechanicsDC } : { unresolved: time.reasons },
    installedSystems: flags.swse.vehicleInstallations
  };
}

/** The sealed construction record carried by the created Actor. */
export function buildConstructionRecord({ designId, name, frame, validation, authorship, crewQuality = null }) {
  if (!validation?.ok) throw new Error('CUSTOM_VEHICLE_DESIGN_INVALID: ' + (validation?.reasons ?? []).join(','));
  return sealed({
    schema: CONSTRUCTION_SCHEMA, designId, name,
    frame: { id: frame.id, class: frame.class, book: frame.book ?? 'Starships of the Galaxy', printedPages: frame.printedPages ?? [53, 54], certification: frame.certification },
    authorship: { kind: authorship.kind, designerActorId: authorship.designerActorId ?? null, starshipDesigner: authorship.starshipDesigner === true,
      shipyardAidApprovedBy: authorship.shipyardAidApprovedBy ?? null, gmUserId: authorship.gmUserId ?? null,
      // Homebrew is GM-authored and must never be presented as certified published rules.
      certifiedPublishedRules: authorship.kind === 'rules-legal' },
    crewQuality, installedSystems: validation.installedSystems, totalCredits: validation.totalCredits,
    derived: validation.preview.derived, pending: validation.preview.pending
  });
}

/**
 * Actor creation payload for a custom vehicle. It makes NO publication claim (so it classifies as
 * "custom"), starts with no Items and no weapon rows, and carries the sealed construction record.
 */
export function buildCustomVehicleActorData({ record, frame, img = 'icons/svg/mystery-man.svg' }) {
  if (!verifyConstructionRecord(record)) throw new Error('CUSTOM_VEHICLE_RECORD_INVALID');
  const d = record.derived;
  return {
    name: record.name, type: 'vehicle', img,
    system: {
      category: 'custom-starship', size: frame.size,
      hp: { value: d.hitPoints, max: d.hitPoints },
      reflexDefense: d.reflexDefense, fortitudeDefense: d.fortitudeDefense, damageThreshold: d.damageThreshold,
      damageReduction: d.damageReduction, armorBonus: d.armorBonus,
      attributes: { str: { base: frame.strength, racial: 0, temp: 0 }, dex: { base: frame.dexterity, racial: 0, temp: 0 }, int: { base: frame.intelligence, racial: 0, temp: 0 } },
      crew: String(frame.crew), passengers: frame.passengers, cargo: frame.cargo, consumables: frame.consumables,
      weapons: []
    },
    flags: { swse: { vehicleConstruction: record } },
    items: [], effects: []
  };
}
