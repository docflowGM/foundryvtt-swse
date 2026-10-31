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
import { CREW_QUALITY } from './vehicle-modification-rules.js';

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

/** A frame is usable for rules-legal construction when every cell is clean OCR text or was read from the PDF. */
export const CERTIFIED_FRAME_STATUSES = Object.freeze(['SOURCE_VERIFIED_TEXT', 'PDF_CONFIRMED']);
export const isCertifiedFrame = frame => CERTIFIED_FRAME_STATUSES.includes(frame?.certification);

/**
 * Statistics derivable from a frame by published formulas. Crew modifiers and the size modifier are each
 * applied exactly once: published statblocks already include the crew quality, and
 * Initiative = vehicle Dexterity modifier + size modifier + crew check modifier (Core: "the pilot adds the
 * vehicle's size modifier and Dexterity modifier on all Initiative and Pilot checks"; the formula
 * reproduces the printed Initiative of 343 of 375 published vehicles). Perception, Mechanics, Use Computer and
 * the base attack bonus come from the Crew Quality table (Core p. 174).
 */
export function previewFrame(frame, { armorBonusFromSystems = 0, crewQuality = null } = {}) {
  const size = sizeKey(frame?.size);
  const dex = abilityModifier(frame?.dexterity), str = abilityModifier(frame?.strength);
  const refSize = REFLEX_SIZE_MODIFIER[size], dtSize = DAMAGE_THRESHOLD_SIZE_MODIFIER[size];
  if (dex === null || str === null || refSize === undefined || dtSize === undefined)
    return { ok: false, reasons: ['FRAME_STATS_INCOMPLETE'] };
  const armor = frame.armor + armorBonusFromSystems;
  const fortitude = 10 + str; // Fortitude Defense = 10 + vehicle's Strength modifier
  const crew = crewQuality ? CREW_QUALITY[crewQuality] : null;
  const derived = {
    reflexDefense: 10 + dex + refSize + armor, // 10 + Dex mod + size modifier + armor bonus
    fortitudeDefense: fortitude,
    damageThreshold: fortitude + dtSize,
    hitPoints: frame.hitPoints, damageReduction: frame.damageReduction, armorBonus: armor,
    speed: frame.speed
  };
  const pending = [
    { stat: 'grapple', reason: 'GRAPPLE_FORMULA_NOT_TRANSCRIBED (BAB + Strength modifier + special size modifier fits 325 of 375 published vehicles; PDF page needed)' },
    { stat: 'fightingSpace', reason: 'NOT_TRANSCRIBED' },
    { stat: 'challengeLevel', reason: 'BOOK_GIVES_NO_FORMULA (compare with comparable ships; the crew quality CL modifier is ' + (crew ? crew.clModifier : 'unknown until a crew quality is chosen') + ')' }
  ];
  if (crew) {
    derived.crewQuality = crewQuality;
    derived.baseAttackBonus = crew.attackBonus;
    derived.initiative = dex + refSize + crew.checkModifier;
    derived.pilot = derived.initiative;
    derived.perception = crew.checkModifier;
    derived.mechanics = crew.checkModifier;
    derived.useComputer = crew.checkModifier;
  } else {
    for (const stat of ['initiative', 'pilot', 'perception', 'mechanics', 'useComputer', 'baseAttackBonus'])
      pending.unshift({ stat, reason: 'CREW_QUALITY_NOT_CHOSEN' });
  }
  return { ok: true, reasons: [], derived, pending };
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
  /**
   * Unused emplacement points of a newly designed frame: the book's general rule for a standard design
   * (SotG p. 39: generally 1). The frame's printed "Emplacement Points" is its stock ALLOCATION, a
   * different quantity, and is not spendable (project owner direction 2026-10-30).
   */
  resolveFrameEpPool: () => 1,
  designRounding: undefined
});

function sealed(body) { return { ...body, recordDigest: digestUniversalVehicleSource(body) }; }
export function verifyConstructionRecord(record) {
  if (!record || record.schema !== CONSTRUCTION_SCHEMA || typeof record.recordDigest !== 'string') return false;
  const { recordDigest, ...body } = record;
  return digestUniversalVehicleSource(body) === recordDigest;
}

export const DESIGN_STATUS = Object.freeze({
  REJECTED: 'REJECTED', PREVIEWABLE: 'PREVIEWABLE', RULES_VALIDATED: 'RULES_VALIDATED', APPROVED: 'APPROVED_FOR_CONSTRUCTION'
});

/**
 * Trusted authority check. Caller-provided booleans and names are only CLAIMS; approval for construction
 * needs the designer actor and the approving user to be resolved by the system (game.actors / game.users)
 * and checked: the designer actor must actually own the Starship Designer feat, and the approver must be a GM.
 * @param {{kind:string, designerActorId?:string, shipyardAidApprovedBy?:string, gmUserId?:string}} authorship
 * @param {{getActor:(id:string)=>object|null, getUser:(id:string)=>object|null}} resolvers
 */
export function verifyConstructionAuthority(authorship = {}, resolvers = {}) {
  const reasons = [];
  const user = id => (id ? resolvers.getUser?.(id) ?? null : null);
  if (authorship.kind === 'rules-legal') {
    const actor = authorship.designerActorId ? resolvers.getActor?.(authorship.designerActorId) ?? null : null;
    if (!actor) reasons.push('DESIGNER_ACTOR_NOT_FOUND');
    else {
      const items = Array.from(actor.items ?? []);
      if (!items.some(i => i?.type === 'feat' && /^starship designer$/i.test(String(i.name ?? '').trim()))) reasons.push('DESIGNER_LACKS_STARSHIP_DESIGNER_FEAT');
    }
    if (user(authorship.shipyardAidApprovedBy)?.isGM !== true) reasons.push('SHIPYARD_AID_APPROVER_NOT_A_GM');
  } else if (authorship.kind === 'gm-homebrew') {
    if (user(authorship.gmUserId)?.isGM !== true) reasons.push('HOMEBREW_AUTHOR_NOT_A_GM');
  } else reasons.push('AUTHORSHIP_KIND_REQUIRED');
  return { verified: reasons.length === 0, reasons };
}

/**
 * Validate a design in three tiers:
 *   previewable      - a frame (and crew quality, if chosen) yields statistics
 *   rulesValidated   - no rule violated AND no required published rule is unresolved
 *   approved         - rulesValidated AND the authority was verified by the system (see verifyConstructionAuthority)
 * `reasons` are hard failures; `unresolved` are required rules the project owner has not ruled on yet.
 *
 * @param {object} p
 * @param {object} p.frame            a stock frame (data/canonical/vehicles/construction/stock-frames.json)
 * @param {Array}  p.systems          [{ catalogEntry, installId, nonstandard?, mount? }]
 * @param {object} p.authorship       claims: { kind:'rules-legal'|'gm-homebrew', designerActorId, starshipDesigner, shipyardAidApprovedBy, gmUserId }
 * @param {{verified:boolean}} [p.authority] result of verifyConstructionAuthority for these claims
 */
export function validateDesign({ designId, name, frame, systems = [], authorship = {}, crewQuality = null, availableCredits = Infinity, rules = DEFAULT_CONSTRUCTION_RULES, authority = null }) {
  const reasons = [], unresolved = [];
  if (!designId || !String(name ?? '').trim()) reasons.push('DESIGN_IDENTITY_MISSING');
  if (!frame?.id) return { ok: false, status: DESIGN_STATUS.REJECTED, previewable: false, rulesValidated: false, approved: false, reasons: ['FRAME_MISSING', ...reasons], unresolved };

  const kind = authorship.kind;
  if (kind !== 'rules-legal' && kind !== 'gm-homebrew') reasons.push('AUTHORSHIP_KIND_REQUIRED');
  if (kind === 'rules-legal') {
    if (!isCertifiedFrame(frame)) reasons.push('FRAME_NOT_SOURCE_VERIFIED');
    if (authorship.starshipDesigner !== true) reasons.push('STARSHIP_DESIGNER_FEAT_REQUIRED');
    if (!authorship.shipyardAidApprovedBy) reasons.push('SHIPYARD_AID_APPROVAL_REQUIRED');
  }
  if (kind === 'gm-homebrew' && !authorship.gmUserId) reasons.push('GM_AUTHORSHIP_REQUIRED');
  if (crewQuality !== null && !CREW_QUALITY[crewQuality]) reasons.push('CREW_QUALITY_INVALID');
  if (crewQuality === null) unresolved.push('CREW_QUALITY_NOT_CHOSEN');

  const preview = previewFrame(frame, { crewQuality });
  if (!preview.ok) reasons.push(...preview.reasons);

  // Systems go through the one shared planner on a synthesized construction "record". A stock frame
  // includes no hyperdrive, cargo space, weapons or shields (SotG p. 52), and a designer with the feat
  // never treats work as nonstandard.
  const record = {
    identity: { sourceEntryKey: `custom-construction:${designId}`, name },
    classification: { printedSize: frame.size },
    hyperspace: { capability: 'unavailable' },
    defenses: { shieldRating: 0, reflex: preview.ok ? preview.derived.reflexDefense : null },
    abilities: { dex: frame.dexterity ?? null, initiativePrinted: preview.ok ? preview.derived.initiative : null }
  };
  let flags = { swse: { vehicleInstallations: [] } };
  const quotes = [];
  let credits = frame.cost ?? 0;
  const budget = () => {
    const pool = rules.resolveFrameEpPool?.(frame);
    return finite(pool) ? { state: 'known', total: pool } : { state: 'unknown', reason: 'FRAME_EP_POOL_UNRULED' };
  };
  for (const sys of systems) {
    const plan = planVehicleInstallation({
      record, flags, catalogEntry: sys.catalogEntry, installId: sys.installId, mount: sys.mount ?? null,
      availableCredits: Number.isFinite(availableCredits) ? availableCredits - credits : Number.MAX_SAFE_INTEGER,
      nonstandard: sys.nonstandard, starshipDesigner: authorship.starshipDesigner === true,
      rules: { ...rules, resolveEpBudget: budget }
    });
    if (!plan.ok) { reasons.push(...plan.reasons.map(r => `${sys.catalogEntry?.id ?? 'system'}:${r}`)); continue; }
    flags = { swse: { vehicleInstallations: plan.nextLedger } };
    quotes.push({ installId: sys.installId, catalogId: sys.catalogEntry.id, credits: plan.entry.priceCredits, quote: plan.entry.quote });
    credits += plan.entry.priceCredits;
  }
  if (Number.isFinite(availableCredits) && credits > availableCredits) reasons.push('INSUFFICIENT_CREDITS');

  // Design time applies to rules-legal designs (the feat). An unruled rounding is an unresolved REQUIRED rule.
  let design = null;
  if (kind === 'rules-legal') {
    const time = designTime({ finalCredits: credits, designers: authorship.starshipDesigners ?? 1, rounding: rules.designRounding });
    if (time.ok) design = { days: time.days, mechanicsDC: time.mechanicsDC };
    else { design = { unresolved: time.reasons }; unresolved.push(...time.reasons); }
  }

  const uniqueReasons = [...new Set(reasons)], uniqueUnresolved = [...new Set(unresolved)];
  const previewable = preview.ok;
  const rulesValidated = previewable && uniqueReasons.length === 0 && uniqueUnresolved.length === 0;
  const approved = rulesValidated && authority?.verified === true;
  const status = approved ? DESIGN_STATUS.APPROVED : rulesValidated ? DESIGN_STATUS.RULES_VALIDATED : previewable ? DESIGN_STATUS.PREVIEWABLE : DESIGN_STATUS.REJECTED;
  return {
    ok: uniqueReasons.length === 0, status, previewable, rulesValidated, approved,
    reasons: uniqueReasons, unresolved: uniqueUnresolved, preview, quotes,
    totalCredits: credits, design, authority: authority ?? null, installedSystems: flags.swse.vehicleInstallations
  };
}

/** The sealed construction record carried by the created Actor. Requires a rules-validated design. */
export function buildConstructionRecord({ designId, name, frame, validation, authorship, crewQuality = null }) {
  if (!validation?.rulesValidated)
    throw new Error('CUSTOM_VEHICLE_DESIGN_INVALID: ' + [...(validation?.reasons ?? []), ...(validation?.unresolved ?? [])].join(','));
  const approved = validation.approved === true;
  return sealed({
    schema: CONSTRUCTION_SCHEMA, designId, name,
    frame: { id: frame.id, class: frame.class, book: frame.book ?? 'Starships of the Galaxy', printedTables: frame.printedTables ?? null, certification: frame.certification },
    authorship: { kind: authorship.kind, designerActorId: authorship.designerActorId ?? null, starshipDesigner: authorship.starshipDesigner === true,
      shipyardAidApprovedBy: authorship.shipyardAidApprovedBy ?? null, gmUserId: authorship.gmUserId ?? null,
      // Only an APPROVED rules-legal design is certified; homebrew is GM-authored and never presented as published rules.
      certifiedPublishedRules: approved && authorship.kind === 'rules-legal' },
    approval: { status: approved ? 'APPROVED' : 'PENDING_APPROVAL', verifiedBy: approved ? 'system-authority-check' : null },
    crewQuality, installedSystems: validation.installedSystems, totalCredits: validation.totalCredits,
    designStatus: validation.status, design: validation.design ?? null,
    derived: validation.preview.derived, pending: validation.preview.pending
  });
}

/**
 * Actor creation payload for a custom vehicle. It makes NO publication claim (so it classifies as
 * "custom"), starts with no Items and no weapon rows, and carries the sealed construction record.
 * Only an APPROVED record may become an Actor.
 */
export function buildCustomVehicleActorData({ record, frame, img = 'icons/svg/mystery-man.svg' }) {
  if (!verifyConstructionRecord(record)) throw new Error('CUSTOM_VEHICLE_RECORD_INVALID');
  if (record.approval?.status !== 'APPROVED') throw new Error('CUSTOM_VEHICLE_NOT_APPROVED');
  const d = record.derived;
  return {
    name: record.name, type: 'vehicle', img,
    system: {
      category: 'custom-starship', size: frame.size,
      hp: { value: d.hitPoints, max: d.hitPoints },
      reflexDefense: d.reflexDefense, fortitudeDefense: d.fortitudeDefense, damageThreshold: d.damageThreshold,
      damageReduction: d.damageReduction, armorBonus: d.armorBonus,
      initiative: d.initiative, crewQuality: record.crewQuality,
      attributes: { str: { base: frame.strength, racial: 0, temp: 0 }, dex: { base: frame.dexterity, racial: 0, temp: 0 }, int: { base: frame.intelligence, racial: 0, temp: 0 } },
      crew: String(frame.crew), passengers: frame.passengers, cargo: frame.cargo, consumables: frame.consumables,
      weapons: []
    },
    flags: { swse: { vehicleConstruction: record } },
    items: [], effects: []
  };
}
