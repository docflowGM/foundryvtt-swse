/**
 * V2 schema-to-interface model for universal vehicles (P0-P5).
 *
 * One pure, read-only display model shared by the Vehicle sheet and the Asset Bay. It reads ONLY:
 *   - getVehicleRuntimeProjection()/classifyVehicleActorRuntime()  (published identity, sealed ledger)
 *   - flags.swse.vehicleConstruction (sealed record, digest-verified)
 *   - system.hp / system.shields (current state)
 *   - the published unused-EP table (data/canonical/vehicles/construction/unused-emplacement-points.json)
 * It never reads system.hull, system.installedSystems or system.weapons as evidence, never writes, and never
 * turns an unresolved value into a number: unknown is `null` with an explicit state/label.
 * No Foundry globals (the optional table loader uses fetch when called from the client).
 */
import { classifyVehicleActorRuntime, getVehicleRuntimeProjection } from '../../../domain/vehicles/vehicle-runtime-contract.js';
import { CREW_QUALITY, makeUnusedEmplacementResolver } from '../../../domain/vehicles/vehicle-modification-rules.js';
import { summarizeInstallations } from '../../../domain/vehicles/vehicle-installation-ledger.js';
import { verifyConstructionRecord, DEFAULT_CONSTRUCTION_RULES } from '../../../domain/vehicles/custom-vehicle-construction.js';
import { computeEffectiveStatistics, effectInstallability } from '../../../domain/vehicles/vehicle-modification-effects.js';
import { readJobs, describeJob, reservedEpFromJobs } from '../../../domain/vehicles/vehicle-installation-jobs.js';
import { describeShield, SOURCE_UNKNOWN } from './vehicle-publication-view-model.js';

const finite = v => typeof v === 'number' && Number.isFinite(v);
const UNRESOLVED = 'Unresolved';

export const VEHICLE_ORIGIN = Object.freeze({
  PUBLISHED: 'PUBLISHED',
  CUSTOM_CONSTRUCTED: 'CUSTOM_CONSTRUCTED',
  CUSTOM_UNVERIFIED_RECORD: 'CUSTOM_UNVERIFIED_RECORD',
  CUSTOM_UNRECORDED: 'CUSTOM_UNRECORDED',
  PUBLISHED_SOURCE_INVALID: 'PUBLISHED_SOURCE_INVALID'
});

let epTablePromise = null;
/** Client-side loader for the published unused-EP table. A failed load is reported as unknown EP, never as 0 or 1. */
export function loadUnusedEpTable() {
  if (!epTablePromise) {
    epTablePromise = (typeof fetch === 'function'
      ? fetch('systems/foundryvtt-swse/data/canonical/vehicles/construction/unused-emplacement-points.json')
        .then(r => (r.ok ? r.json() : null)).catch(() => null)
      : Promise.resolve(null)).then(t => { if (!t) epTablePromise = null; return t; });
  }
  return epTablePromise;
}

const rawFlags = actor => (typeof actor?.toObject === 'function' ? actor.toObject().flags : actor?.flags) ?? {};
const hasStarshipScale = published => (published?.movementModes ?? []).some(m => m.scale === 'starship');

function currentHp(actor, publishedMax = null) {
  const hp = actor?.system?.hp ?? {};
  const max = finite(publishedMax) ? publishedMax : (finite(hp.max) ? hp.max : null);
  const value = finite(hp.value) ? hp.value : null;
  return { value, max, label: value !== null && max !== null ? `HP ${value}/${max}` : max !== null ? `HP —/${max}` : 'HP not recorded' };
}

function entryView(e) {
  const weapon = e.category === 'Weapon' || e.category === 'Ammunition' || !!e.mount;
  const effectCertified = e.certification?.status === 'MECHANIC_SPECIFIED';
  return {
    installId: e.installId, name: e.name, category: e.category,
    certification: e.certification?.status ?? 'NONE',
    source: e.certification?.book ? `${e.certification.book}, p. ${e.certification.page}` : null,
    epCost: e.epCost, priceCredits: e.priceCredits,
    standard: e.quote?.nonstandard === true ? 'Nonstandard' : e.quote?.nonstandard === false ? 'Standard' : UNRESOLVED,
    shortfall: finite(e.quote?.shortfall) ? e.quote.shortfall : null,
    effectStatus: effectCertified ? 'EFFECT_CERTIFIED' : 'EFFECT_NOT_AUTOMATED',
    effectLabel: effectCertified ? 'Effect certified' : 'Effect not automated',
    weapon,
    mountLabel: weapon ? (e.mount ? `${e.mount.mountKey} (${e.mount.arc}, ${e.mount.operatorRole})` : 'No certified mount') : null,
    weaponStatus: weapon ? (e.executable === true ? 'AUTHORIZED' : 'NOT_AUTHORIZED') : null,
    weaponLabel: weapon ? (e.executable === true ? 'Weapon authorized' : 'Installed, not authorized to fire') : null,
    // The ledger records no operational/disabled flag; do not invent one.
    operationalState: 'NOT_TRACKED'
  };
}

function epView({ supported, record, entries, rules, epTable, constructed, reserved = 0 }) {
  if (!supported) return { state: 'UNSUPPORTED', label: 'Starship modification rules do not apply to this vehicle. No emplacement-point budget.', total: null, used: null, remaining: null, shortfall: null, nonstandardCount: 0 };
  let budget;
  if (constructed) {
    const pool = rules.resolveFrameEpPool?.();
    budget = finite(pool) ? { state: 'known', total: pool, basis: 'NEW_DESIGN_GENERAL_RULE' } : { state: 'unknown', reason: 'FRAME_EP_POOL_UNRULED' };
  } else if (epTable) {
    budget = makeUnusedEmplacementResolver(epTable)(record);
  } else budget = { state: 'unknown', reason: 'UNUSED_EP_TABLE_UNAVAILABLE' };
  const s = summarizeInstallations(entries, budget);
  const shortfall = s.epRemaining !== null ? Math.max(0, -s.epRemaining) : null;
  const nonstandardCount = entries.filter(e => e.quote?.nonstandard === true).length;
  return {
    state: budget.state === 'known' ? 'KNOWN' : 'UNKNOWN',
    total: s.epTotal, used: s.epUsed, reserved, remaining: s.epRemaining === null ? null : Math.max(0, s.epRemaining - reserved), shortfall,
    nonstandardCount, basis: budget.basis ?? budget.reason ?? null,
    label: budget.state === 'known'
      ? `Unused EP ${s.epTotal}; consumed ${s.epUsed}` + (reserved ? `; reserved by pending installations ${reserved}` : '') + `; remaining ${Math.max(0, s.epRemaining - reserved)}` + (shortfall ? `; shortfall ${shortfall}` : '')
      : `Unused EP unknown (${budget.reason ?? 'not decidable'}); consumed ${s.epUsed}`
  };
}

function constructionView(c) {
  const crew = CREW_QUALITY[c.crewQuality] ?? null;
  const sysCost = (c.installedSystems ?? []).reduce((n, e) => n + (finite(e.priceCredits) ? e.priceCredits : 0), 0);
  const approved = c.approval?.status === 'APPROVED';
  return {
    designId: c.designId, frame: c.frame?.id ?? null, frameClass: c.frame?.class ?? null,
    frameCertification: c.frame?.certification ?? null, book: c.frame?.book ?? null,
    crewQuality: c.crewQuality ?? null,
    crewQualityLabel: crew ? `${c.crewQuality} (attack ${crew.attackBonus >= 0 ? '+' : ''}${crew.attackBonus}, checks ${crew.checkModifier}, CL ${crew.clModifier >= 0 ? '+' : ''}${crew.clModifier})` : UNRESOLVED,
    authorshipKind: c.authorship?.kind ?? null,
    certifiedPublishedRules: c.authorship?.certifiedPublishedRules === true,
    approvalStatus: c.approval?.status ?? UNRESOLVED,
    statusLabel: approved ? 'Approved for construction' : 'Awaiting GM approval',
    rulesLabel: c.authorship?.kind === 'rules-legal'
      ? (c.authorship.certifiedPublishedRules ? 'Rules-validated under published rules (Starship Designer); GM-approved' : 'Rules-legal design; not yet certified')
      : c.authorship?.kind === 'gm-homebrew' ? 'GM homebrew (not published rules)' : UNRESOLVED,
    totalCredits: finite(c.totalCredits) ? c.totalCredits : null,
    systemCredits: sysCost,
    baseFrameCredits: finite(c.totalCredits) ? c.totalCredits - sysCost : null,
    totalCreditsLabel: creditsLabel(c.totalCredits),
    systemCreditsLabel: creditsLabel(sysCost),
    baseFrameCreditsLabel: creditsLabel(finite(c.totalCredits) ? c.totalCredits - sysCost : null),
    designStatus: c.designStatus ?? null,
    designTime: c.design?.days ?? null,
    mechanicsDC: c.design?.mechanicsDC ?? null,
    designTimeLabel: finite(c.design?.days) ? `${c.design.days} days` : UNRESOLVED,
    mechanicsDCLabel: finite(c.design?.mechanicsDC) ? String(c.design.mechanicsDC) : UNRESOLVED,
    outstanding: [...(c.design?.unresolved ?? [])],
    pending: c.pending ?? null
  };
}

/** Explicit numeric presence: 0 is a value, never "absent" (Handlebars truthiness would hide it). */
function presence(effective, current) {
  return {
    effectiveLabel: finite(effective) ? String(effective) : SOURCE_UNKNOWN,
    hasCurrent: finite(current), currentLabel: finite(current) ? String(current) : ''
  };
}
const creditsLabel = n => (finite(n) ? `${n} cr` : UNRESOLVED);

const signed = n => (n < 0 ? String(n) : '+' + n);
const NONE_AUTOMATED = 'No automated modification effects';
function modLabel(st) {
  if (!st || !st.delta) return NONE_AUTOMATED;
  return `${signed(st.delta)} (${st.sources.map(x => x.name).join(', ')})`;
}

/** Effective-statistics rows from the certified effects module (baseline untouched; recomputed from the ledger). */
function effectiveRows({ record, entries, hp, hpBase, fortitude, extra = [] }) {
  const fx = computeEffectiveStatistics({ record, entries });
  const rows = [statRow('Hit Points', hpBase, NONE_AUTOMATED, hp.value)];
  rows.push(statRow('Reflex Defense', fx.reflex.base, modLabel(fx.reflex), null, fx.reflex.effective));
  if (finite(fortitude)) rows.push(statRow('Fortitude Defense', fortitude, NONE_AUTOMATED));
  if (finite(fx.initiative.base) && fx.initiative.delta) rows.push(statRow('Initiative', fx.initiative.base, modLabel(fx.initiative), null, fx.initiative.effective));
  rows.push(...extra);
  for (const m of fx.movement.filter(m => m.sources.length)) {
    rows.push({ label: `Atmospheric ${m.mode} speed`, base: m.baseSquares, baseLabel: `${m.baseSquares ?? SOURCE_UNKNOWN} sq / ${m.baseKmh ?? '—'} km/h`,
      modification: `${m.sources.map(x => x.name).join(', ')} (${m.conditional})`, effective: m.effectiveSquares,
      effectiveLabel: `${m.effectiveSquares ?? SOURCE_UNKNOWN} sq / ${m.effectiveKmh ?? '—'} km/h`, current: null, hasCurrent: false, currentLabel: '' });
  }
  if (fx.hyperdrive.effectiveClass !== null)
    rows.push({ label: 'Hyperdrive', base: null, baseLabel: 'None', modification: fx.hyperdrive.sources.map(x => x.name).join(', '), effective: fx.hyperdrive.effectiveClass,
      effectiveLabel: `Class ${fx.hyperdrive.effectiveClass}`, current: null, hasCurrent: false, currentLabel: '' });
  return { rows, fx };
}

function statRow(label, base, modification, current = null, effective = base) {
  return {
    label, base: finite(base) ? base : null, baseLabel: finite(base) ? String(base) : SOURCE_UNKNOWN,
    modification, effective: finite(effective) ? effective : null, current: finite(current) ? current : null,
    ...presence(effective, current)
  };
}

/**
 * @param {object} actor vehicle Actor (or Actor-like)
 * @param {{epTable?: object|null}} [options]
 */
export function buildVehicleSchemaViewModel(actor, options = {}) {
  const assessment = classifyVehicleActorRuntime(actor);
  const flags = rawFlags(actor);
  const result = { origin: null, identity: {}, hp: null, shield: null, ep: null, installed: null, effective: [], construction: null, reasons: [], notes: [] };

  if (assessment.kind === 'invalid-canonical') {
    return { ...result, origin: VEHICLE_ORIGIN.PUBLISHED_SOURCE_INVALID, hp: currentHp(actor),
      identity: { badge: 'Published source invalid', callSign: actor?.name ?? null, printedModel: null, published: false },
      ep: { state: 'UNAVAILABLE', label: 'Unavailable: published source failed verification', total: null, used: null, remaining: null, shortfall: null, nonstandardCount: 0 },
      installed: { entries: [], count: 0, certification: 'NONE', rejected: 0, equipmentItemCount: 0, uncertifiedWeaponItems: 0 },
      reasons: [...assessment.errors], summaryLabel: 'Published source failed verification' };
  }

  if (assessment.kind === 'canonical') {
    const p = getVehicleRuntimeProjection(actor);
    const { source, published, installed } = p;
    const record = flags.swse.universalVehicleSource.source;
    const supported = hasStarshipScale(published);
    const entries = installed.modifications.map(entryView);
    const shipyard = shipyardView({ record, flags, key: source.sourceEntryKey, catalog: options.catalog ?? null, entries: installed.modifications, supported,
      canAct: actor?.isOwner === true || options.isGM === true, isGM: options.isGM === true });
    const hp = currentHp(actor, published.hitPoints.value);
    const shield = describeShield(published, p.current.shields);
    return {
      ...result, origin: VEHICLE_ORIGIN.PUBLISHED,
      identity: {
        badge: 'Published vehicle', published: true, printedModel: published.model,
        callSign: actor?.name ?? published.model, callSignDiffers: (actor?.name ?? published.model) !== published.model,
        book: source.book, page: source.page, sourceLabel: `${source.book}, p. ${source.page}`,
        sourceKey: source.sourceEntryKey, category: source.primaryCategory, size: record.classification?.printedSize ?? null
      },
      hp, shield, shipyard,
      ep: epView({ supported, record, entries: installed.modifications, rules: DEFAULT_CONSTRUCTION_RULES, epTable: options.epTable ?? null, constructed: false, reserved: shipyard.reservedEp }),
      installed: { entries, count: entries.length, certification: installed.certification, rejected: installed.rejectedLedgerEntries,
        equipmentItemCount: installed.equipmentItemCount, uncertifiedWeaponItems: installed.uncertifiedWeaponItems },
      effective: (() => {
        const shieldFx = computeEffectiveStatistics({ record, entries: installed.modifications }).shield;
        const shieldRow = { label: 'Shield Rating', base: shield.max, baseLabel: shield.label, modification: modLabel(shieldFx), effective: shieldFx.sources.length ? shieldFx.effective : shield.max, current: shield.current, ...presence(shieldFx.sources.length ? shieldFx.effective : shield.max, shield.current) };
        return effectiveRows({ record, entries: installed.modifications, hp, hpBase: published.hitPoints.value, fortitude: published.defenses.fortitude, extra: [shieldRow] }).rows;
      })(),
      reasons: supported ? [] : ['STARSHIP_MODIFICATION_RULES_UNSUPPORTED'],
      summaryLabel: 'Published'
    };
  }

  // custom / scratch vehicle: never presented as a published record.
  const cons = flags.swse?.vehicleConstruction;
  const verified = !!cons && verifyConstructionRecord(cons);
  if (verified) {
    const c = cons;
    const entries = (c.installedSystems ?? []).map(entryView);
    const d = c.derived ?? {};
    const hp = currentHp(actor);
    return {
      ...result, origin: VEHICLE_ORIGIN.CUSTOM_CONSTRUCTED,
      identity: { badge: 'Custom-built vehicle', published: false, printedModel: null, callSign: actor?.name ?? c.name,
        stockFrame: c.frame?.id ?? null, sourceLabel: `Custom design (${c.frame?.book ?? 'Starships of the Galaxy'} frame ${c.frame?.id ?? UNRESOLVED})`, size: actor?.system?.size ?? null },
      hp,
      shield: { state: 'none-installed', label: 'No shield installed (stock frame includes none)', current: null, max: null },
      ep: epView({ supported: true, record: null, entries: c.installedSystems ?? [], rules: DEFAULT_CONSTRUCTION_RULES, epTable: null, constructed: true }),
      installed: { entries, count: entries.length, certification: entries.length ? 'CONSTRUCTION_RECORD' : 'NONE', rejected: 0, equipmentItemCount: 0, uncertifiedWeaponItems: 0 },
      construction: constructionView(c),
      effective: (() => {
        const synthetic = { defenses: { reflex: d.reflexDefense, shieldRating: 0 }, abilities: { initiativePrinted: d.initiative }, hyperspace: { capability: 'unavailable' }, movement: {} };
        const fxShield = computeEffectiveStatistics({ record: synthetic, entries: c.installedSystems ?? [] }).shield;
        const shieldRow = fxShield.sources.length
          ? { label: 'Shield Rating', base: 0, baseLabel: '0', modification: modLabel(fxShield), effective: fxShield.effective, current: null, hasCurrent: false, currentLabel: '', effectiveLabel: String(fxShield.effective) }
          : null;
        return effectiveRows({ record: synthetic, entries: c.installedSystems ?? [], hp, hpBase: d.hitPoints, fortitude: d.fortitudeDefense,
          extra: [...(shieldRow ? [shieldRow] : []), statRow('Damage Threshold', d.damageThreshold, NONE_AUTOMATED), statRow('Damage Reduction', d.damageReduction, NONE_AUTOMATED)] }).rows;
      })(),
      summaryLabel: c.approval?.status === 'APPROVED' ? 'Custom-built' : 'Custom-built (awaiting GM approval)'
    };
  }

  const tampered = !!cons;
  const hp = currentHp(actor);
  const sh = actor?.system?.shields;
  return {
    ...result, origin: tampered ? VEHICLE_ORIGIN.CUSTOM_UNVERIFIED_RECORD : VEHICLE_ORIGIN.CUSTOM_UNRECORDED,
    identity: { badge: tampered ? 'Custom vehicle (construction record failed verification)' : 'Custom vehicle (no construction record)',
      published: false, printedModel: null, callSign: actor?.name ?? null, sourceLabel: 'No published source' },
    hp,
    shield: { state: 'not-recorded', label: finite(sh?.max) && sh.max > 0 ? `Shields ${sh.value ?? 0}/${sh.max} (unverified)` : 'Shields not recorded', current: finite(sh?.value) ? sh.value : null, max: finite(sh?.max) && sh.max > 0 ? sh.max : null },
    ep: { state: 'UNVERIFIABLE', label: 'Emplacement points cannot be verified without a verified construction record', total: null, used: null, remaining: null, shortfall: null, nonstandardCount: 0 },
    installed: { entries: [], count: 0, certification: 'NONE', rejected: 0, equipmentItemCount: 0, uncertifiedWeaponItems: 0 },
    reasons: tampered ? ['CONSTRUCTION_RECORD_DIGEST_MISMATCH'] : [],
    summaryLabel: tampered ? 'Custom (unverified record)' : 'Custom (unrecorded)'
  };
}

/** Pending installation work and installable choices (read-only model; actions go through VehicleInstallationService). */
function shipyardView({ record, flags, key, catalog, entries, supported, canAct = false, isGM = false }) {
  const { jobs, rejected } = readJobs(flags, key);
  const views = jobs.map(describeJob);
  const options = supported && catalog
    ? [...catalog.values()].filter(c => c.certification?.status === 'MECHANIC_SPECIFIED' && !effectInstallability({ catalogEntry: c, record, entries }).length)
      .map(c => ({ id: c.id, name: c.name, category: c.category, ep: c.emplacementPoints })).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  return { supported, canAct, isGM, jobs: views, activeJobs: views.filter(j => j.active), reservedEp: reservedEpFromJobs(jobs), rejected, options, hasOptions: options.length > 0 };
}

/** Compact Asset Bay line set derived from the same model. */
export function buildVehicleAssetSummary(actor, options = {}) {
  const m = buildVehicleSchemaViewModel(actor, options);
  const installedLabel = m.origin === VEHICLE_ORIGIN.PUBLISHED_SOURCE_INVALID ? 'Installations unavailable'
    : m.installed.count ? `${m.installed.count} certified system${m.installed.count === 1 ? '' : 's'}` : 'No certified installations';
  const shieldLabel = m.shield?.state === 'known' || m.shield?.max != null ? `Shields ${m.shield.current ?? 0}/${m.shield.max}` : (m.shield?.label ?? 'Shields —');
  return {
    origin: m.origin, originLabel: m.summaryLabel, name: m.identity.printedModel ?? m.identity.callSign,
    published: m.identity.published === true, hp: m.hp, hpLabel: m.hp.label, shieldLabel,
    installationLabel: installedLabel, epLabel: m.ep.label,
    constructionLabel: m.construction ? `${m.construction.statusLabel}; Crew Quality ${m.construction.crewQuality ?? UNRESOLVED}` : null,
    sourceLabel: m.identity.sourceLabel ?? null
  };
}
