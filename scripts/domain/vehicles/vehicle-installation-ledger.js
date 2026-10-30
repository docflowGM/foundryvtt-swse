/**
 * Phase 4E P2: pure installation ledger + fail-closed planner for canonical vehicles.
 *
 * The published base (flags.swse.universalVehicleSource) is never modified. Installed
 * hardware lives in a separate append/remove ledger at flags.swse.vehicleInstallations,
 * each entry individually certified (book/page + MECHANIC_SPECIFIED) and digest-sealed.
 * The digest is tamper-evidence only, not a signature.
 *
 * Rules the project owner has not ruled on are NOT encoded here. They enter through
 * the `rules` seam (see DEFAULT_VEHICLE_INSTALLATION_RULES), whose defaults deny.
 * No Foundry globals: Node-testable.
 */
import { digestUniversalVehicleSource } from './vehicle-source-digest.js';
import { VEHICLE_FIRING_ARCS } from './vehicle-firing-arc-geometry.js';
import { costModifierForSize, nonstandardAssessment, quoteInstallation, systemCost } from './vehicle-modification-rules.js';

export const VEHICLE_INSTALLATION_FLAG = 'vehicleInstallations';
export const VEHICLE_INSTALLATION_FLAG_PATH = `flags.swse.${VEHICLE_INSTALLATION_FLAG}`;

const finite = v => typeof v === 'number' && Number.isFinite(v);
const nonEmpty = v => typeof v === 'string' && v.trim() !== '';

/** Hull size order (SWSE printed size categories); subtype hulls rank above plain Colossal. */
const SIZE_RANK = new Map([
  ['large', 1], ['huge', 2], ['gargantuan', 3], ['colossal', 4],
  ['colossal (frigate)', 5], ['colossal (cruiser)', 6], ['colossal (station)', 7]
]);
const rankOf = s => SIZE_RANK.get(String(s ?? '').trim().toLowerCase()) ?? null;
const isSubtype = s => /\(/.test(String(s ?? ''));

/**
 * Evaluate a catalog sizeRestriction against a hull size.
 * @returns {'ok'|'ineligible'|'ambiguous'|'unparseable'}
 */
export function evaluateSizeRestriction(restriction, hullSize) {
  if (restriction === null || restriction === undefined || restriction === '') return 'ok';
  const hull = rankOf(hullSize);
  if (hull === null) return 'unparseable';
  const text = String(restriction).trim();
  let m = text.match(/^(.+?) or (larger|smaller)$/i);
  if (m) {
    const bound = rankOf(m[1]);
    if (bound === null) return 'unparseable';
    const up = m[2].toLowerCase() === 'larger';
    // "Colossal or Smaller" vs a Colossal (frigate) hull: whether the bare word
    // includes subtype hulls is not established -> ambiguous, never guessed.
    if (!up && isSubtype(hullSize) && !isSubtype(m[1])) return 'ambiguous';
    return (up ? hull >= bound : hull <= bound) ? 'ok' : 'ineligible';
  }
  m = text.match(/^(.+?) or (.+)$/i);
  if (m) {
    const a = rankOf(m[1]), b = rankOf(m[2]);
    if (a === null || b === null) return 'unparseable';
    if (isSubtype(hullSize) && !isSubtype(m[1]) && !isSubtype(m[2]) && hull > Math.min(a, b))
      return 'ambiguous';
    return hull >= Math.min(a, b) && hull <= Math.max(a, b) ? 'ok' : 'ineligible';
  }
  const exact = rankOf(text);
  if (exact === null) return 'unparseable';
  if (isSubtype(hullSize) && !isSubtype(text) && rankOf(hullSize) !== exact && exact === 4) return 'ambiguous';
  return hull === exact ? 'ok' : 'ineligible';
}

/**
 * Owner-ruling seam. Each default denies or reports "undecided"; replace a member only
 * when a documented project ruling exists (docs/audits/swse-rules-decisions-pending.md).
 */
export const DEFAULT_VEHICLE_INSTALLATION_RULES = Object.freeze({
  /** @returns {{state:'known', total:number}|{state:'unknown', reason:string}} spendable EP */
  resolveEpBudget: () => ({ state: 'unknown', reason: 'EP_BUDGET_SEMANTICS_UNRULED' }),
  /** Credits returned when hardware is removed. null = no ruling. */
  resolveUninstallRefund: () => null,
  /** An install may exceed the unused emplacement points with the published penalties (SotG p. 38); project owner direction 2026-10-30. */
  allowEpShortfall: true,
  /** Objective nonstandard-modification test; null means the Gamemaster must decide. */
  resolveNonstandard: nonstandardAssessment
});

export function sealLedgerEntry(entry) {
  const { entryDigest: _ignored, ...body } = entry;
  return { ...body, entryDigest: digestUniversalVehicleSource(body) };
}

export function isValidLedgerEntry(entry, sourceEntryKey) {
  if (!entry || typeof entry !== 'object') return false;
  const { entryDigest, ...body } = entry;
  return nonEmpty(entry.installId) && nonEmpty(entry.catalogId) &&
    entry.sourceEntryKey === sourceEntryKey &&
    entry.certification?.status === 'MECHANIC_SPECIFIED' &&
    nonEmpty(entry.certification?.book) && entry.certification?.page != null &&
    finite(entry.epCost) && entry.epCost >= 0 && finite(entry.priceCredits) && entry.priceCredits >= 0 &&
    typeof entryDigest === 'string' && digestUniversalVehicleSource(body) === entryDigest;
}

/** Valid, sealed ledger entries for a vehicle; anything else is ignored (never trusted). */
export function readCertifiedInstallations(flags, sourceEntryKey) {
  const raw = flags?.swse?.[VEHICLE_INSTALLATION_FLAG];
  if (!Array.isArray(raw)) return { entries: [], rejected: 0 };
  const entries = raw.filter(e => isValidLedgerEntry(e, sourceEntryKey));
  return { entries, rejected: raw.length - entries.length };
}

export function summarizeInstallations(entries, budget) {
  const epUsed = entries.reduce((n, e) => n + e.epCost, 0);
  return {
    count: entries.length, epUsed,
    epTotal: budget?.state === 'known' ? budget.total : null,
    epRemaining: budget?.state === 'known' ? budget.total - epUsed : null,
    epState: budget?.state ?? 'unknown'
  };
}

const deny = (...reasons) => ({ ok: false, reasons });

/**
 * Plan one installation. Pure: caller supplies ids/timestamps and funds.
 * @param {object} p
 * @param {object} p.record        published source record (flags.swse.universalVehicleSource.source)
 * @param {object} p.flags         actor flags (for the existing ledger)
 * @param {object} p.catalogEntry  catalog row (must carry a certification block)
 * @param {string} p.installId
 * @param {number} p.availableCredits owner funds
 * @param {object} [p.rules]
 */
export function planVehicleInstallation({ record, flags, catalogEntry, installId, availableCredits, installedAt, rules = DEFAULT_VEHICLE_INSTALLATION_RULES, mount = null, nonstandard = undefined, starshipDesigner = false, workers = null }) {
  const reasons = [];
  const key = record?.identity?.sourceEntryKey;
  if (!nonEmpty(key)) return deny('VEHICLE_NOT_SOURCE_BACKED');
  if (!catalogEntry || !nonEmpty(catalogEntry.id)) return deny('CATALOG_ENTRY_MISSING');

  const cert = catalogEntry.certification;
  const certPage = cert?.page ?? cert?.printedPage ?? (Array.isArray(cert?.printedPageRange) ? cert.printedPageRange.join('-') : null);
  if (cert?.status === 'SOURCE_VERIFIED') reasons.push('MODIFICATION_EFFECT_NOT_IMPLEMENTED'); // table text verified, effect not encoded
  else if (cert?.status !== 'MECHANIC_SPECIFIED' || !nonEmpty(cert?.book) || certPage == null)
    reasons.push('CATALOG_ENTRY_UNCERTIFIED');
  if (!finite(catalogEntry.emplacementPoints) || catalogEntry.emplacementPoints < 0)
    reasons.push('EP_COST_UNKNOWN');
  if (!nonEmpty(catalogEntry.availability)) reasons.push('AVAILABILITY_UNKNOWN');
  const hullSize = record.classification?.printedSize;
  if (costModifierForSize(hullSize) === null) reasons.push('HULL_SIZE_HAS_NO_PUBLISHED_COST_MODIFIER');
  else { const price = systemCost(catalogEntry, hullSize); if (!price.ok) reasons.push(price.reason === 'PRICE_UNKNOWN' ? 'PRICE_UNKNOWN_OR_UNRESOLVED' : price.reason); }

  const size = evaluateSizeRestriction(catalogEntry.sizeRestriction, record.classification?.printedSize);
  if (size !== 'ok') reasons.push('SIZE_' + size.toUpperCase());

  if (catalogEntry.category === 'Weapon' || catalogEntry.category === 'Ammunition') {
    const ok = mount && nonEmpty(mount.mountKey) && nonEmpty(mount.arc) &&
      nonEmpty(mount.operatorRole) && mount.evidence?.book && mount.evidence?.page != null;
    if (!ok) reasons.push('WEAPON_MOUNT_UNCERTIFIED');
    else if (!VEHICLE_FIRING_ARCS.has(mount.arc)) reasons.push('WEAPON_MOUNT_ARC_INVALID');
  }

  const { entries } = readCertifiedInstallations(flags, key);
  const rawLedger = Array.isArray(flags?.swse?.[VEHICLE_INSTALLATION_FLAG]) ? flags.swse[VEHICLE_INSTALLATION_FLAG] : [];
  if (!nonEmpty(installId)) reasons.push('INSTALL_ID_MISSING');
  // Compare against the RAW ledger: an unsealed/invalid entry still occupies its id.
  else if (rawLedger.some(e => e?.installId === installId)) reasons.push('DUPLICATE_INSTALL_ID');
  if (entries.some(e => e.catalogId === catalogEntry.id && catalogEntry.unique === true))
    reasons.push('ALREADY_INSTALLED');
  // An invalid ledger entry means the stored ledger is not trustworthy; installing on top
  // of it would silently drop (re-seal) or compound the problem.
  if (rawLedger.length !== entries.length) reasons.push('LEDGER_CONTAINS_UNVERIFIED_ENTRIES');

  // Nonstandard modification: an explicit Gamemaster decision wins; otherwise only objectively
  // determinable cases are decided and anything else must come back as a GM decision.
  const nsInput = typeof nonstandard === 'boolean'
    ? { nonstandard, basis: 'GM_DECISION' }
    : (rules.resolveNonstandard ?? nonstandardAssessment)(catalogEntry, record, { starshipDesigner });
  if (nsInput.nonstandard === null) reasons.push('NONSTANDARD_DETERMINATION_REQUIRED');

  const budget = rules.resolveEpBudget(record);
  let quote = null;
  if (budget?.state !== 'known' || !finite(budget.total)) reasons.push('EP_BUDGET_UNKNOWN');
  else if (nsInput.nonstandard !== null && !reasons.some(r => ['EP_COST_UNKNOWN', 'HULL_SIZE_HAS_NO_PUBLISHED_COST_MODIFIER', 'PRICE_UNKNOWN_OR_UNRESOLVED', 'COST_TYPE_NOT_RESOLVED_BY_PUBLISHED_RULES'].includes(r))) {
    const remaining = Math.max(0, budget.total - summarizeInstallations(entries, budget).epUsed);
    quote = quoteInstallation({ entry: catalogEntry, size: hullSize, unusedEmplacementPoints: remaining, workers, nonstandard: nsInput.nonstandard });
    if (!quote.ok) reasons.push(...quote.reasons);
    else if (quote.shortfall > 0 && rules.allowEpShortfall !== true) reasons.push('EP_EXCEEDED');
  }
  if (quote?.ok && (!finite(availableCredits) || availableCredits < quote.credits)) reasons.push('INSUFFICIENT_CREDITS');

  if (reasons.length) return { ok: false, reasons: [...new Set(reasons)] };

  const entry = sealLedgerEntry({
    installId, catalogId: catalogEntry.id, name: catalogEntry.name, category: catalogEntry.category,
    sourceEntryKey: key, certification: { status: cert.status, book: cert.book, page: certPage },
    epCost: quote.emplacementPoints, priceCredits: quote.credits,
    quote: { days: quote.days, mechanicsDC: quote.mechanicsDC, workForce: quote.workForce, shortfall: quote.shortfall,
      nonstandard: quote.nonstandard, nonstandardBasis: nsInput.basis, consequences: quote.consequences },
    mount: mount ? { mountKey: mount.mountKey, arc: mount.arc, operatorRole: mount.operatorRole, evidence: mount.evidence } : null,
    executable: false, // enabling a weapon is P4-D's separate gate
    installedAt: installedAt ?? null
  });
  return { ok: true, reasons: [], entry, cost: entry.priceCredits,
    nextLedger: [...(Array.isArray(flags?.swse?.[VEHICLE_INSTALLATION_FLAG]) ? flags.swse[VEHICLE_INSTALLATION_FLAG] : []), entry] };
}

export function planVehicleUninstall({ record, flags, installId, rules = DEFAULT_VEHICLE_INSTALLATION_RULES }) {
  const key = record?.identity?.sourceEntryKey;
  const raw = Array.isArray(flags?.swse?.[VEHICLE_INSTALLATION_FLAG]) ? flags.swse[VEHICLE_INSTALLATION_FLAG] : [];
  const target = raw.find(e => e?.installId === installId);
  if (!target) return deny('INSTALL_NOT_FOUND');
  const certified = isValidLedgerEntry(target, key);
  const refund = certified ? rules.resolveUninstallRefund(target) : null;
  return {
    ok: true, reasons: [], entry: target, certified,
    // No refund ruling => no credit movement; reported, never guessed.
    refund: finite(refund) && refund >= 0 ? refund : 0,
    refundPolicyDecided: finite(refund),
    nextLedger: raw.filter(e => e !== target)
  };
}

/**
 * Ledger write authorization. The seal is unkeyed (tamper evidence), so the ledger flag may
 * only be changed by VehicleInstallationService: it authorizes the exact ledger it is about
 * to write for the duration of its transaction, and a preUpdateActor hook rejects any other
 * change to the flag. Guards against accidental/macro writes, not a hostile console.
 */
const pendingLedgerWrites = new Map();
export function authorizeLedgerWrite(actorId, ledger) { pendingLedgerWrites.set(actorId, JSON.stringify(ledger)); }
export function clearLedgerWrite(actorId) { pendingLedgerWrites.delete(actorId); }

/** @returns {boolean} true when the update does not touch the ledger or the touch is authorized */
export function isLedgerUpdateAllowed(actorId, changes) {
  const flat = changes && Object.prototype.hasOwnProperty.call(changes, VEHICLE_INSTALLATION_FLAG_PATH);
  const nested = changes?.flags?.swse && Object.prototype.hasOwnProperty.call(changes.flags.swse, VEHICLE_INSTALLATION_FLAG);
  const removal = changes?.flags?.swse && Object.prototype.hasOwnProperty.call(changes.flags.swse, '-=' + VEHICLE_INSTALLATION_FLAG);
  if (!flat && !nested && !removal && !(changes && Object.prototype.hasOwnProperty.call(changes, `flags.swse.-=${VEHICLE_INSTALLATION_FLAG}`))) return true;
  if (removal || changes?.[`flags.swse.-=${VEHICLE_INSTALLATION_FLAG}`] !== undefined) return false;
  const proposed = flat ? changes[VEHICLE_INSTALLATION_FLAG_PATH] : changes.flags.swse[VEHICLE_INSTALLATION_FLAG];
  return pendingLedgerWrites.get(actorId) === JSON.stringify(proposed);
}
