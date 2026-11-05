#!/usr/bin/env node
/**
 * Evidence verification before owner rulings (EVIDENCE ONLY). Builds on the committed gap analysis (vehicle-100-percent-completion-analysis.json).
 *
 * SOURCE LIMITS, stated once and repeated in the report: the repository ships the sourcebook TEXT corpus (OCR/DjVu text, reference/sourcebooks) and NOT the
 * source PDFs. Every check below reads that text. A text check can CONFIRM a figure the OCR shows legibly, or REVEAL a defect; it can never replace the PDF, which
 * stays the final authority. So no fact here is called PDF_CONFIRMED; the strongest status is TEXT_CORROBORATED (the record and the legible OCR text agree),
 * and every group carries the printed page where the owner (or a later session with the PDFs) can check it.
 *
 * It changes NO canonical record, gate, certification, mechanic or house rule. Usage: --write | --check
 */
import fs from 'node:fs';
import { locateStatblocks, corpusLines } from './lib/statblock-locator.mjs';
import { LAUNCHER_CAPACITY } from '../../../scripts/domain/vehicles/vehicle-launcher-capacity.js';
import { launcherDesignationOf } from '../../../scripts/domain/vehicles/vehicle-ammunition-ledger.js';
import { renderVerification } from './lib/verification-report-md.mjs';

const MODE = process.argv[2];
if (!['--write', '--check'].includes(MODE)) { console.error('usage: --write|--check'); process.exit(2); }
const OUT_JSON = 'data/audits/vehicles/vehicle-evidence-verification.json';
const OUT_MD = 'docs/audits/vehicles/vehicle-evidence-verification.md';
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const A = readJson('data/audits/vehicles/vehicle-100-percent-completion-analysis.json');
const UNARMED = readJson('data/audits/vehicles/unarmed-vehicle-certification.json');
const records = new Map(fs.readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n').map(l => { const r = JSON.parse(l); return [r.identity.sourceEntryKey, r]; }));
const bg = new Map(A.blockedGroups.map(b => [b.groupKey, b]));
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9+ -]+/g, ' ').replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------------------------------------ statblock text
const sbCache = new Map();
function statblock(key) {
  if (sbCache.has(key)) return sbCache.get(key);
  const r = records.get(key); const { book, printedTitle } = r.publication;
  const { file, blocks } = locateStatblocks(book, printedTitle ?? r.identity.name);
  let out = { located: false, file, candidates: blocks.length };
  if (blocks.length) {
    // prefer the candidate whose Base Atk / Int agree with the record when several share a title (reprints, variants)
    const score = b => { const t = b.text.join('\n'); return (new RegExp(`Base Atk \\+?${r.combat?.baseAttackBonusPrinted}\\b`).test(t) ? 1 : 0) + (new RegExp(`\\bInt ${r.abilities?.int}\\b`).test(t) ? 1 : 0); };
    const b = [...blocks].sort((x, y) => score(y) - score(x))[0];
    const t = b.text;
    const rs = t.findIndex(l => /^\s*Ranged\b/.test(l));
    let re = rs; while (re >= 0 && re < t.length - 1 && !/^\s*(Fighting Space|Base Atk|Atk Options|Abilities)\b/.test(t[re + 1] ?? '')) re++;
    const ranged = rs >= 0 ? t.slice(rs, re + 1) : [];
    const full = t.join('\n');
    const after = t.slice(Math.max(re, 0)).join('\n');           // the ship's own Base Atk / Abilities follow its attack lines (a statblock may also list craft it carries)
    const baseAtk = /Base Atk\s*\+?(-?\d+)/.exec(after) ?? /Base Atk\s*\+?(-?\d+)/.exec(full), intM = /\bInt\s+(\d+)/.exec(after) ?? /\bInt\s+(\d+)/.exec(full);
    const payloadLine = t.filter(l => /\b(?:pay)?load\s*:?\s*\d/i.test(l) && !/\b(?:car|down|up|over)load/i.test(l)).map(l => l.trim());
    const payloadNums = payloadLine.flatMap(l => [...l.matchAll(/\b(\d[\d,]*)\b/g)].map(m => Number(m[1].replace(/,/g, ''))));
    out = { located: true, file, line: b.start + 1, candidates: blocks.length, ambiguous: blocks.length > 1, rangedLines: ranged.map(l => l.trim()), rangedText: ranged.join(' '), text: t, baseAtk: baseAtk ? Number(baseAtk[1]) : null, int: intM ? Number(intM[1]) : null, payloadNums,
      tail: (corpusLines(book)?.ls ?? []).slice(b.start + t.length, b.start + t.length + 60).map(l => l.trim()), payloadLine, payloadComposite: payloadLine.some(l => (l.match(/\b\d[\d,]*\b/g) ?? []).length > 1), start: b.start };
  }
  sbCache.set(key, out); return out;
}
/** The detail paragraph(s) the book prints after a statblock for a weapon ("Proton Torpedoes (gunner) ..."), found by the label's words. */
function detailLines(sb, label) {
  if (!sb.located) return [];
  const words = norm(label).split(' ').filter(w => w.length > 3).slice(0, 3);
  if (!words.length) return [];
  const book = records; void book;
  return sb.text.filter(l => words.every(w => norm(l).includes(w))).map(l => l.trim()).slice(0, 4);
}
const printedAttackFor = (sb, label) => {
  if (!sb.located) return null;
  const words = norm(label).split(' ').filter(w => w.length > 3);
  if (!words.length) return null;
  // the per-weapon detail line ("Quad turbolaser battery (6 gunners): Atk +18 ...") is the most specific printed figure
  const det = sb.text.map(l => l.trim()).find(l => /\bAtk\s*\+?\d+/.test(l) && !/^Base Atk/.test(l) && words.every(w => norm(l).includes(w)));
  const dm = det && /\bAtk\s*\+?(\d+)/.exec(det); if (dm) return { segment: det.slice(0, 90), value: Number(dm[1]), via: 'detail line' };
  const hit = sb.rangedLines.join(' ').split(/\band\b|\bor\b/i).map(s => s.trim()).find(seg => words.every(w => norm(seg).includes(w)));
  const m = hit && /\+\s?(\d+)/.exec(hit); return m ? { segment: hit.slice(0, 90), value: Number(m[1]), via: 'attack line' } : null;
};

// ------------------------------------------------------------------------------------------------ V100-01
const ALLOC = 'STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED';
const alloc = A.blockedGroups.filter(b => b.refusalCodes.includes(ALLOC));
const wordingOf = (label) => {
  const l = String(label ?? '').toLowerCase();
  if (/\b(battery|batteries)\b/.test(l)) return 'BATTERY';
  if (/\b(\d+|twin|double|dual|triple|quad|two|three|four)\b[\s-]+(?:\w+[\s-]+){0,3}(launchers?|torpedoes|missiles)/.test(l)) return 'NUMBERED_IN_LABEL';
  if (/\blaunchers\b/.test(l)) return 'PLURAL_LAUNCHER_UNNUMBERED';
  if (/\blauncher\b/.test(l)) return 'SINGULAR_LAUNCHER';
  return 'AMMUNITION_NAMED_ONLY';
};
const v1 = alloc.map(b => {
  const r = records.get(b.vehicleKey), sb = statblock(b.vehicleKey);
  const g = r.armament.firingGroups.find(x => x.groupKey === b.groupKey);
  const des = launcherDesignationOf(b.label);
  const cap = des ? LAUNCHER_CAPACITY[des.designation.launcherId] : null;
  const payload = b.payloadCount;
  const hwInNotes = /"hardwareCount":("?[^,}"]+"?)/.exec(g.specialNotes ?? '')?.[1] ?? null;
  const entry = printedAttackFor(sb, b.label);
  const wording = wordingOf(b.label);
  const ammoOnlyEntry = !/launcher/i.test(sb.rangedText ?? '') ? 'statblock attack line names no launcher' : 'statblock attack line names a launcher';
  return { groupKey: b.groupKey, vehicleKey: b.vehicleKey, vehicle: b.vehicle, book: b.book, printedPage: b.page, label: b.label, otherBlockingCauses: b.causeKeys.filter(k => !k.startsWith(ALLOC)),
    payload: { recordValue: payload, recordSource: r.armament.carriedPayloads?.map(x => x.raw) ?? null, textStatus: !sb.located ? 'STATBLOCK_NOT_LOCATED' : sb.payloadNums.includes(payload) ? (sb.payloadComposite ? 'TEXT_CORROBORATED_IN_COMPOSITE_LINE' : 'TEXT_CORROBORATED') : sb.payloadNums.length ? 'TEXT_SHOWS_DIFFERENT_FIGURE' : 'NO_PAYLOAD_LINE_FOUND_IN_TEXT', textLines: sb.payloadLine ?? [] },
    launcherCount: { recordValue: hwInNotes === '"SOURCE_SILENT_CONFIRMED"' ? 'SOURCE_SILENT_CONFIRMED' : hwInNotes, wording, attackLine: ammoOnlyEntry, textEntry: entry?.segment ?? null,
      textStatus: !sb.located ? 'STATBLOCK_NOT_LOCATED' : wording === 'NUMBERED_IN_LABEL' ? 'COUNT_WORD_IN_LABEL' : 'NO_NUMERIC_COUNT_IN_TEXT' },
    designation: des ? { launcherId: des.designation.launcherId, viaLauncherWord: !!des.viaLauncherWord } : null,
    publishedCapacityPerLauncher: cap ? { standard: cap.standard, source: `${cap.source.book} pp.${cap.source.printedPageRange.join('-')}, ${cap.source.section}` } : null,
    payloadVsCapacity: cap && payload ? { payloadDividesIntoWholeLaunchers: payload % cap.standard === 0, singleLauncherCouldHoldAll: payload <= cap.standard, note: 'informational only: a payload is not a launcher count' } : null,
    detailParagraph: detailLines(sb, b.label), battery: wording === 'BATTERY', statblock: sb.located ? { file: sb.file, line: sb.line } : null };
});
const tally = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});

// ------------------------------------------------------------------------------------------------ generic unlock by a set of unlocked groups
const vehicleState = new Map();
for (const vi of A.vehicleIdentities) vehicleState.set(vi.sourceEntryKey, vi);
const blockedByVehicle = new Map(); for (const b of A.blockedGroups) (blockedByVehicle.get(b.vehicleKey) ?? blockedByVehicle.set(b.vehicleKey, []).get(b.vehicleKey)).push(b);
function unlockGroups(keys) {
  const set = new Set(keys); const first = new Set(), full = new Set(), any = new Set();
  for (const [vk, bs] of blockedByVehicle) {
    const n = bs.filter(b => set.has(b.groupKey)).length; if (!n) continue; any.add(vk);
    if (vehicleState.get(vk).executableGroups === 0) first.add(vk);
    if (n === bs.length) full.add(vk);
  }
  return { groups: set.size, vehiclesGainingAnyGroup: any.size, vehiclesGainingFirstExecutableGroup: first.size, vehiclesBecomingFullyExecutable: full.size };
}
const onlyCause = (b, key) => b.causeKeys.every(k => k === key);

const sole57 = v1.filter(x => x.otherBlockingCauses.length === 0);
const v1Sub = {
  scope: v1.length, vehicles: new Set(v1.map(x => x.vehicleKey)).size, soleBlocker: sole57.length,
  payloadStatus: tally(v1, x => x.payload.textStatus),
  wording: tally(v1, x => x.launcherCount.wording),
  wordingSoleBlocker: tally(sole57, x => x.launcherCount.wording),
  recordCountStatus: tally(v1, x => String(x.launcherCount.recordValue)),
  textCountStatus: tally(v1, x => x.launcherCount.textStatus),
  payloadFitsWholeLaunchers: tally(v1.filter(x => x.payloadVsCapacity), x => x.payloadVsCapacity.payloadDividesIntoWholeLaunchers ? 'divisible' : 'not divisible'),
  singleLauncherCouldHoldAll: v1.filter(x => x.payloadVsCapacity?.singleLauncherCouldHoldAll).length,
  noCapacityPublished: v1.filter(x => !x.publishedCapacityPerLauncher).length
};
const sets = {
  textCountsToExtract: sole57.filter(x => x.launcherCount.textStatus === 'COUNT_WORD_IN_LABEL'),
  singular: sole57.filter(x => x.launcherCount.wording === 'SINGULAR_LAUNCHER'),
  payloadPool: sole57
};
const v1Unlock = {
  canonicalFromTextCountWordsAlone: unlockGroups(sets.textCountsToExtract.map(x => x.groupKey)),
  projectReadingSingularNounIsOneLauncher: unlockGroups(sets.singular.map(x => x.groupKey)),
  projectConventionPayloadIsThePool_option1: unlockGroups(sets.payloadPool.map(x => x.groupKey))
};

// ------------------------------------------------------------------------------------------------ V100-02 (range rows)
const R = 'STOCK_RANGE_TABLE_NOT_IDENTIFIED|A';
const rangeGroups = A.blockedGroups.filter(b => b.causeKeys.includes(R));
const corpusCache = new Map();
const corpus = book => { const c = locateStatblocks(book, '__none__'); void c; return null; };
void corpus; void corpusCache;
const v2 = rangeGroups.map(b => {
  const r = records.get(b.vehicleKey), sb = statblock(b.vehicleKey);
  const ev = r.armament.firingGroups.find(x => x.groupKey === b.groupKey).specialNotes ?? '';
  const scale = /"attackScale":"character"/.test(ev) ? 'character (statblock evidence)' : /character scale|character-scale/i.test(ev) ? 'character (notes)' : 'not stated';
  const rangeWord = sb.located ? sb.text.filter(l => /\brange\b|\bkm\b|\bsquares?\b.*\b(range|distance)\b/i.test(l)).slice(0, 2).map(l => l.trim()) : [];
  return { groupKey: b.groupKey, vehicleKey: b.vehicleKey, vehicle: b.vehicle, book: b.book, printedPage: b.page, label: b.label, family: b.family, attackScale: scale, otherBlockingCauses: b.causeKeys.filter(k => k !== R),
    statblockMentionsRange: rangeWord.length ? rangeWord : null, statblockLocated: sb.located };
});
const v2Sub = { scope: v2.length, vehicles: new Set(v2.map(x => x.vehicleKey)).size, statblocksLocated: v2.filter(x => x.statblockLocated).length, withPrintedRangeWording: v2.filter(x => x.statblockMentionsRange).length,
  attackScale: tally(v2, x => x.attackScale), soleBlocker: v2.filter(x => !x.otherBlockingCauses.length).length, byFamily: tally(v2, x => x.family ?? '(none)'),
  distinctDesignations: Object.entries(tally(v2, x => x.label.toLowerCase().slice(0, 40))).sort((a, b) => b[1] - a[1]) };
const v2Unlock = { ifEveryRangeResolved: unlockGroups(v2.filter(x => !x.otherBlockingCauses.length).map(x => x.groupKey)) };

// ------------------------------------------------------------------------------------------------ V100-03 (attack totals)
const D = 'STOCK_ATTACK_TOTAL_UNEXPLAINED_DELTA|E';
const deltaGroups = A.blockedGroups.filter(b => b.causeKeys.includes(D));
const v3 = deltaGroups.map(b => {
  const r = records.get(b.vehicleKey), sb = statblock(b.vehicleKey);
  const g = r.armament.firingGroups.find(x => x.groupKey === b.groupKey);
  const gunners = /(\d+)\s*gunners?/i.exec(g.specialNotes ?? '')?.[1];
  const expected = gunners ? 2 * (Number(gunners) - 1) : null;
  const t = printedAttackFor(sb, b.label);
  return { groupKey: b.groupKey, vehicleKey: b.vehicleKey, vehicle: b.vehicle, book: b.book, printedPage: b.page, label: b.label, recordPrintedTotal: b.printedAttackTotal, recordBab: r.combat.baseAttackBonusPrinted, recordInt: r.abilities.int,
    gunnersPrinted: gunners ? Number(gunners) : null, delta: b.attackDelta, batteryAssistanceExpected: expected, residualAfterBatteryAssistance: expected === null ? null : b.attackDelta - expected,
    text: !sb.located ? { status: 'STATBLOCK_NOT_LOCATED' } : { status: t && t.value === b.printedAttackTotal && sb.baseAtk === r.combat.baseAttackBonusPrinted && sb.int === r.abilities.int ? 'TEXT_CORROBORATED' : sb.baseAtk !== r.combat.baseAttackBonusPrinted || sb.int !== r.abilities.int ? 'RECORD_BAB_OR_INT_DIFFERS_FROM_TEXT' : 'ATTACK_FIGURE_NOT_FOUND_OR_DIFFERENT_IN_TEXT', baseAtkInText: sb.baseAtk, intInText: sb.int, attackInText: t?.value ?? null, candidates: sb.candidates,
      deltaUsingTextBabAndInt: Number.isFinite(sb.baseAtk) && Number.isFinite(sb.int) ? b.printedAttackTotal - (sb.baseAtk + Math.floor((sb.int - 10) / 2)) : null,
      residualUsingTextValues: Number.isFinite(sb.baseAtk) && Number.isFinite(sb.int) && expected !== null ? b.printedAttackTotal - (sb.baseAtk + Math.floor((sb.int - 10) / 2)) - expected : null },
    crewQuality: r.crew?.crewQuality ?? null, otherBlockingCauses: b.causeKeys.filter(k => k !== D) };
});
const byVehicle = {}; for (const x of v3) (byVehicle[x.vehicleKey] ??= []).push(x);
const vehiclesConstantResidual = Object.entries(byVehicle).map(([k, xs]) => { const rs = xs.map(x => x.residualAfterBatteryAssistance).filter(v => v !== null); return { vehicleKey: k, groups: xs.length, residuals: [...new Set(rs)], constantAcrossGroups: new Set(rs).size === 1, textStatus: [...new Set(xs.map(x => x.text.status))] }; });
const v3Sub = { scope: v3.length, resolvedIfTextValuesConfirmed: v3.filter(x => x.text.residualUsingTextValues === 0).length, stillUnexplainedWithTextValues: v3.filter(x => x.text.residualUsingTextValues !== null && x.text.residualUsingTextValues !== 0).length, residualUsingTextValues: tally(v3.filter(x => x.text.residualUsingTextValues !== null), x => x.text.residualUsingTextValues), vehicles: Object.keys(byVehicle).length, textStatus: tally(v3, x => x.text.status), residualDistribution: tally(v3.filter(x => x.residualAfterBatteryAssistance !== null), x => x.residualAfterBatteryAssistance), vehiclesWithConstantResidual: vehiclesConstantResidual.filter(v => v.constantAcrossGroups).length, vehiclesWithVaryingResidual: vehiclesConstantResidual.filter(v => !v.constantAcrossGroups).length, vehiclesConstantResidual };
const resolvedKeys = new Set(v3.filter(x => x.text.residualUsingTextValues === 0).map(x => x.groupKey));
const v3Unlock = { ifEveryPrintedTotalAccepted: unlockGroups(deltaGroups.filter(b => onlyCause(b, D)).map(b => b.groupKey)),
  resolvedBySourceCorrectionAlone: unlockGroups(deltaGroups.filter(b => onlyCause(b, D) && resolvedKeys.has(b.groupKey)).map(b => b.groupKey)),
  needingARulingAfterSourceCorrection: unlockGroups(deltaGroups.filter(b => onlyCause(b, D) && !resolvedKeys.has(b.groupKey)).map(b => b.groupKey)) };

const CREW_ATK = { untrained: -5, normal: 0, skilled: 2, expert: 5, ace: 10 };    // Core sidebar (printed p.174) as encoded in vehicle-modification-rules.js
v3Sub.residualEqualsCrewQualityAttackBonus = v3.filter(x => x.text.residualUsingTextValues !== null && x.text.residualUsingTextValues !== 0 && CREW_ATK[x.crewQuality] === x.text.residualUsingTextValues).length;
const babIntScan = { checked: 0, located: 0, babDiffers: [], intDiffers: [] };
for (const vi of A.vehicleIdentities.filter(x => x.class !== 'UNARMED_CONFIRMED')) {
  const r = records.get(vi.sourceEntryKey), sb = statblock(vi.sourceEntryKey); babIntScan.checked++;
  if (!sb.located) continue; babIntScan.located++;
  if (Number.isFinite(sb.baseAtk) && sb.baseAtk !== r.combat?.baseAttackBonusPrinted) babIntScan.babDiffers.push({ vehicleKey: vi.sourceEntryKey, record: r.combat?.baseAttackBonusPrinted, text: sb.baseAtk, executableGroups: vi.executableGroups, blockedGroups: vi.blockedGroups });
  if (Number.isFinite(sb.int) && sb.int !== r.abilities?.int) babIntScan.intDiffers.push({ vehicleKey: vi.sourceEntryKey, record: r.abilities?.int, text: sb.int });
}
// ------------------------------------------------------------------------------------------------ V100-04 (qualitative arcs)
const ARCQ = 'STOCK_FIRING_ARC_STATED_UNPARSED|E';
const v4 = A.blockedGroups.filter(b => b.causeKeys.includes(ARCQ)).map(b => {
  const r = records.get(b.vehicleKey), sb = statblock(b.vehicleKey);
  const g = r.armament.firingGroups.find(x => x.groupKey === b.groupKey);
  const ev = /\{[^{}]*\}/.exec(g.specialNotes ?? ''); let evid = {}; try { evid = JSON.parse(ev?.[0] ?? '{}'); } catch { /* */ }
  const arcWords = /\b(forward|front|aft|rear|turret|fixed|dorsal|ventral|port|starboard|flank|axial|articulated|arc|degrees?|360)\b/i;
  return { groupKey: b.groupKey, vehicleKey: b.vehicleKey, vehicle: b.vehicle, book: b.book, printedPage: b.page, label: b.label, recordArcText: evid.firingArc ?? evid.qualitativeDirection ?? null, otherBlockingCauses: b.causeKeys.filter(k => k !== ARCQ),
    textLinesWithArcWording: sb.located ? sb.text.filter(l => arcWords.test(l)).map(l => l.trim()).slice(0, 4) : [], statblockLocated: sb.located };
});
const v4Unlock = { ifQualitativeArcsUnrestricted: unlockGroups(v4.filter(x => !x.otherBlockingCauses.length).map(x => x.groupKey)) };

// ------------------------------------------------------------------------------------------------ V100-05 (special devices)
const DEV = 'STOCK_DAMAGE_NOT_PRINTED_IN_RECORD|D';
const MECH = /\b(DC \d+|check|damage|\+\d+|-\d+|squares?|round|condition|grapple|reflex|fortitude|attack)\b/i;
const v5 = A.blockedGroups.filter(b => b.causeKeys.includes(DEV)).map(b => {
  const r = records.get(b.vehicleKey), sb = statblock(b.vehicleKey);
  const words = norm(b.label).split(' ').filter(w => w.length > 3).slice(0, 2);
  const pool = sb.located ? [...sb.text.map(l => l.trim()), ...sb.tail] : [];
  const tailAt = sb.located ? sb.tail.findIndex(l => words.length && words.every(w => norm(l).includes(w))) : -1;
  const bodyAt = sb.located ? sb.text.findIndex(l => words.length && words.every(w => norm(l).includes(w)) && !/^\s*(Ranged|Atk Options)/.test(l)) : -1;
  const detail = tailAt >= 0 ? sb.tail.slice(tailAt, tailAt + 7) : bodyAt >= 0 ? sb.text.slice(bodyAt, bodyAt + 6).map(l => l.trim()) : []; void pool;
  return { groupKey: b.groupKey, vehicleKey: b.vehicleKey, vehicle: b.vehicle, book: b.book, printedPage: b.page, label: b.label, recordNotes: (r.armament.firingGroups.find(x => x.groupKey === b.groupKey).specialNotes ?? '').slice(0, 160), detailTextLines: detail,
    textHasMechanicalWording: detail.some(l => MECH.test(l)), textHasAnyDetail: detail.length > 0, otherBlockingCauses: b.causeKeys.filter(k => k !== DEV), statblockLocated: sb.located };
});
const v5Sub = { scope: v5.length, detailFound: v5.filter(x => x.textHasAnyDetail).length, mechanicalWordingFound: v5.filter(x => x.textHasMechanicalWording).length };

// ------------------------------------------------------------------------------------------------ Priority 3: extraction defects
const defects = [];
const add = (kind, b, finding, proposed) => defects.push({ kind, groupKey: b.groupKey, vehicleKey: b.vehicleKey, vehicle: b.vehicle, book: b.book, printedPage: b.page, label: b.label, finding, proposedCorrection: proposed });
for (const b of A.blockedGroups) {
  const r = records.get(b.vehicleKey), sb = statblock(b.vehicleKey);
  for (const c of b.causes) {
    const k = `${c.code}|${c.rootCause}`;
    if (k === 'STOCK_AMMUNITION_PAYLOAD_NOT_PRINTED|B' || k === 'STOCK_AMMUNITION_PAYLOAD_NOT_PRINTED|A') {
      const carried = r.armament.carriedPayloads ?? [];
      if (sb.located && sb.payloadLine.length && !carried.length) add('PAYLOAD_LINE_IN_TEXT_NOT_IN_RECORD', b, `statblock text shows: ${sb.payloadLine.join(' / ')}`, 'add the Payload entry to armament.carriedPayloads after reading the PDF line');
      else if (carried.length) add('PAYLOAD_PRESENT_BUT_NOT_ATTRIBUTABLE', b, `record carries ${carried.map(x => x.raw).join(' / ')}; the group label ("${b.label}") is not matched by exactly one entry`, 'attribute the entry to the group only if the book prints which launcher uses it; otherwise leave for a ruling or GM allocation');
    }
    if (['STOCK_RANGE_TABLE_NOT_IDENTIFIED|B', 'STOCK_OPERATOR_NOT_PRINTED|B', 'STOCK_ATTACK_TOTAL_NOT_PRINTED|B', 'STOCK_DAMAGE_NOT_PRINTED_IN_RECORD|B'].includes(k) && (b.label.length > 60 || /\b(Atk|Dmg)\b/.test(b.label))) {
      const m = /^(.*?)\s*\((pilot|gunner|copilot|co-pilot)\)\s*:?\s*Atk\s*([+-]\d+)(?:\s*\(([^)]*)\))?\s*,?\s*Dmg\s*([0-9d x+-]+)(?:,\s*(.*))?$/i.exec(b.label);
      add('LABEL_EMBEDS_PRINTED_LINE', b, `label carries the whole line: "${b.label}"`, m ? `label "${m[1].trim()}", operator "${m[2].toLowerCase()}", attack ${m[3]}${m[4] ? ` (${m[4]})` : ''}, damage ${m[5].trim()}${m[6] ? `, ${m[6].trim()}` : ''} (decomposition parsed mechanically from the label; confirm in the PDF)` : 'decompose label / operator / attack total / damage / area from the PDF line');
    }
    if (k === 'STOCK_OPERATOR_NOT_PRINTED|A' && sb.located) {
      const named = [...new Set((sb.text.join(' ').match(/\((pilot|gunner|copilot|co-pilot)s?\)/gi) ?? []).map(x => x.toLowerCase()))];
      if (named.length) add('OPERATOR_WORDING_IN_TEXT', b, `statblock text names ${named.join(', ')} near weapon descriptions`, 'read the PDF to see whether this group is operated by that seat; then record it');
    }
    if (k === 'STOCK_FIRING_ARC_NOT_REVIEWED|B') {
      const w = sb.located ? sb.rangedLines.join(' ').match(/\b(forward|front|aft|rear|turret|fixed|dorsal|ventral|port|starboard|broadside|360|arc)\b/gi) : null;
      add(w?.length ? 'ARC_WORDING_IN_ATTACK_LINE' : 'ARC_SILENT_IN_TEXT', b, w?.length ? `attack line contains: ${[...new Set(w)].join(', ')}` : sb.located ? 'the attack lines contain no arc wording' : 'statblock not located in text', w?.length ? 'read the PDF; the arc may be stated' : 'if the PDF is also silent, mark the arc reviewed as SOURCE_SILENT_CONFIRMED (V-P6C-01 then imposes no restriction)');
    }
    if (c.rootCause === 'C' && ['STOCK_DAMAGE_NOT_PRINTED_IN_RECORD|C', 'STOCK_SIZE_DEPENDENT_ATTACK_ADJUSTMENT|C', 'STOCK_DAMAGE_QUALIFIED|C', 'STOCK_OPERATOR_IS_A_STATION_BATTERY|C', 'STOCK_GROUP_IS_A_WEAPON_BATTERY|C'].includes(k))
      add('EXISTING_MECHANIC_NOT_CONNECTED', b, c.rationale, c.whatWouldUnlockIt);
  }
}
const defectKinds = tally(defects, d => d.kind);
const defectGroups = new Set(defects.map(d => d.groupKey));
// groups that would run if EVERY listed defect were repaired and nothing else remained
const defectOnly = A.blockedGroups.filter(b => b.causes.every(c => defects.some(d => d.groupKey === b.groupKey && ((d.kind === 'PAYLOAD_LINE_IN_TEXT_NOT_IN_RECORD' && c.code.includes('PAYLOAD')) || (d.kind === 'LABEL_EMBEDS_PRINTED_LINE' && /RANGE|OPERATOR|ATTACK_TOTAL|DAMAGE_NOT_PRINTED/.test(c.code)) || (d.kind === 'ARC_SILENT_IN_TEXT' && c.code.includes('ARC_NOT_REVIEWED')) || (d.kind === 'EXISTING_MECHANIC_NOT_CONNECTED' && c.rootCause === 'C')))));
const defectUnlock = unlockGroups(defectOnly.map(b => b.groupKey));

// ------------------------------------------------------------------------------------------------ Priority 4: unarmed validation
const WEAPON_WORDS = /\b(cannon|laser|blaster|turbolaser|torpedo|missile|launcher|tractor|ram|harpoon|grenade|mine|bomb|weapon|turret|gun|rifle|pistol|flamethrower|projector|ordnance|ejector|cutter|drill|jammer|dovin)\b/i;
const unarmedCheck = UNARMED.rows.map(row => {
  const r = records.get(row.sourceEntryKey); const sb = statblock(row.sourceEntryKey);
  if (!sb.located) return { sourceEntryKey: row.sourceEntryKey, certification: row.status, book: row.book, printedPage: row.page, recheck: 'STATBLOCK_NOT_LOCATED', weaponWords: [] };
  const lines = sb.text.map(l => l.trim()).filter(l => WEAPON_WORDS.test(l) && !/^(Skills|Abilities|Defense|Init|Speed|Base Atk)/.test(l));
  const hasAtk = sb.text.some(l => /^\s*(Ranged|Melee)\b/.test(l));
  const note = r.armament?.notes ?? null;
  return { sourceEntryKey: row.sourceEntryKey, certification: row.status, book: row.book, printedPage: row.page, recheck: hasAtk ? 'ATTACK_LINE_PRESENT' : lines.length ? 'WEAPON_WORDING_NEEDS_REVIEW' : 'NO_WEAPON_WORDING_IN_STATBLOCK_TEXT', weaponWordLines: lines.slice(0, 4), recordArmamentNote: note };
});
const unarmedTally = tally(unarmedCheck, x => x.recheck);

// ------------------------------------------------------------------------------------------------ revised docket
const pdfChecklist = [...new Map([...v1, ...v2, ...v3, ...v4, ...v5].map(x => [`${x.vehicleKey}`, { vehicle: x.vehicle, book: x.book, printedPage: x.printedPage, decisions: new Set() }])).entries()];
const dec = (list, id) => list.forEach(x => pdfChecklist.find(([k]) => k === x.vehicleKey)[1].decisions.add(id));
dec(v1, 'V100-01'); dec(v2, 'V100-02'); dec(v3, 'V100-03'); dec(v4, 'V100-04'); dec(v5, 'V100-05');
const checklist = pdfChecklist.map(([k, v]) => ({ vehicleKey: k, vehicle: v.vehicle, book: v.book, printedPage: v.printedPage, decisions: [...v.decisions].sort() })).sort((a, b) => a.book.localeCompare(b.book) || a.printedPage - b.printedPage);

// ------------------------------------------------------------------------------------------------ revised docket (authored text over computed numbers)
const cls1 = x => (typeof x.launcherCount.recordValue === 'string' && /^\d+$/.test(x.launcherCount.recordValue) ? 'PRINTED_NUMERIC_COUNT_BUT_AMMUNITION_NAMED' : x.launcherCount.recordValue === 'SOURCE_SILENT_CONFIRMED' ? 'RECORD_CERTIFIES_SILENT' : 'COUNT_NEVER_REVIEWED');
const v1Class = tally(v1, cls1), v1ClassSole = tally(sole57, cls1);
const sub = c => sole57.filter(x => cls1(x) === c).map(x => x.groupKey);
const u1 = { printedNumeric: unlockGroups(sub('PRINTED_NUMERIC_COUNT_BUT_AMMUNITION_NAMED')), neverReviewed: unlockGroups(sub('COUNT_NEVER_REVIEWED')), certifiedSilent: unlockGroups(sub('RECORD_CERTIFIES_SILENT')) };
const grappleDevices = v5.filter(x => /grapple/i.test(x.recordNotes + x.detailTextLines.join(' '))).length;
const revisedDocket = [
  { id: 'V100-01', title: 'Stock launchers: may a printed Payload define the ammunition pool when no launcher count is printed?',
    evidence: ['Published: a standard proton torpedo launcher holds three torpedoes; concussion launcher capacity is light 6 / medium 16 / heavy 30 (Starships of the Galaxy, Launchers entries, pp.45-46). These are properties of a LAUNCHER.',
      'Published: the statblock Payload line is the vehicle\'s complement of grenades, rockets, missiles and torpedoes (Core Rulebook statblock key). It is a carried complement.',
      `Of the ${v1.length} groups, ${v1Sub.wording.AMMUNITION_NAMED_ONLY} attack lines name only the ammunition ("proton torpedoes +14"), ${v1Sub.wording.SINGULAR_LAUNCHER} use a singular launcher noun and ${v1Sub.wording.PLURAL_LAUNCHER_UNNUMBERED} a plural without a number; no statblock text shows a launcher count (${v1Sub.textCountStatus.NO_NUMERIC_COUNT_IN_TEXT} located, 0 numeric).`,
      `Payload is corroborated in the text for ${(v1Sub.payloadStatus.TEXT_CORROBORATED ?? 0) + (v1Sub.payloadStatus.TEXT_CORROBORATED_IN_COMPOSITE_LINE ?? 0)} groups (${v1Sub.payloadStatus.TEXT_CORROBORATED_IN_COMPOSITE_LINE ?? 0} inside a multi-ammunition line); ${v1Sub.payloadStatus.NO_PAYLOAD_LINE_FOUND_IN_TEXT ?? 0} show no payload line, ${v1Sub.payloadStatus.TEXT_SHOWS_DIFFERENT_FIGURE ?? 0} a different figure and ${v1Sub.payloadStatus.STATBLOCK_NOT_LOCATED ?? 0} could not be located (all ${(v1Sub.payloadStatus.NO_PAYLOAD_LINE_FOUND_IN_TEXT ?? 0) + (v1Sub.payloadStatus.TEXT_SHOWS_DIFFERENT_FIGURE ?? 0) + (v1Sub.payloadStatus.STATBLOCK_NOT_LOCATED ?? 0)} need the PDF).`],
    resolvedBySourceResearch: [`${v1Class.PRINTED_NUMERIC_COUNT_BUT_AMMUNITION_NAMED ?? 0} groups carry a printed hardwareCount in the record but are named by their ammunition, so the gate does not read it as a launcher count: the PDF decides what that figure counts (${u1.printedNumeric.groups} would run if it is a launcher count and nothing else blocks them).`,
      `${v1Class.COUNT_NEVER_REVIEWED ?? 0} groups have a launcher count nobody has reviewed (record value null, not "silent"): a PDF check may find a count (${u1.neverReviewed.groups} would run) or confirm silence.`],
    genuinelySilent: [`${v1Class.RECORD_CERTIFIES_SILENT ?? 0} groups: the record certifies the source silent on the launcher count and the text corroborates it. ${u1.certifiedSilent.groups} of them have no other blocker.`],
    needsRuling: ['Only the genuinely silent groups: whether the Payload alone may define the pool.'],
    options: [
      { option: 1, text: 'Project convention STOCK_POOL: the printed Payload is the pool (no magazine, no reload) for stock groups whose launcher count the source does not print. Executes, but is labelled a project convention, never canonical.', unlock: u1.certifiedSilent },
      { option: 2, text: 'Keep requiring a launcher count (source-printed or GM-certified). No change; these groups stay GM-configured.', unlock: null },
      { option: 3, text: 'Both: canonical where a count is printed after the PDF check, STOCK_POOL convention where the source is silent, GM configuration otherwise.', unlock: { note: 'canonical share = the two source-research rows above; convention share = the silent row' } }],
    consequences: 'Option 1 changes what "executable" means for ammunition (launched rounds are drawn from the Payload with no per-launcher magazine); installed launchers are unaffected. It must be reported as its own outcome so canonical coverage is not inflated.',
    recommendation: `UNAPPROVED, evidence-based: option 3, with a distinct STOCK_POOL_CONVENTION outcome. The text shows the book defines Payload as a carried complement and capacity as a launcher property, so the Payload alone does not establish a launcher count; do the PDF check on the ${(v1Class.COUNT_NEVER_REVIEWED ?? 0) + (v1Class.PRINTED_NUMERIC_COUNT_BUT_AMMUNITION_NAMED ?? 0)} unreviewed or numeric-count groups first.` },
  { id: 'V100-02', title: 'Weapons whose type has no Table 10-2 row: how is range resolved?',
    evidence: ['Core Rulebook, Attack with Vehicle Weapon: "The maximum range and the range modifiers of a vehicle weapon depend on the weapon used (see Table 10-2: Vehicle Weapon Ranges)." The table itself is an image and is not in the text corpus; data/vehicle-weapon-ranges.json holds its 9 rows.',
      `${v2Sub.scope} groups on ${v2Sub.vehicles} vehicles name weapons that match none of those rows (${v2Sub.distinctDesignations.length} distinct designations; ${v2Sub.soleBlocker} have no other blocker). Statblocks located in the text: ${v2Sub.statblocksLocated}.`],
    resolvedBySourceResearch: ['None resolvable from text: whether the PDF table or the weapon entries give these weapons a range cannot be read from the OCR corpus.'],
    genuinelySilent: ['Not established. The owner (or a session with the PDFs) must read Table 10-2 and each weapon entry before any group is called silent.'],
    needsRuling: ['Only the weapons the PDF shows have no range at all.'],
    options: [{ option: 1, text: 'Keep refusing groups with no printed range row.', unlock: null }, { option: 2, text: 'GM-certified range bands per weapon, labelled GM_CONFIGURED.', unlock: v2Unlock.ifEveryRangeResolved }, { option: 3, text: 'Owner-supplied mapping of each type to an existing row, labelled project convention.', unlock: v2Unlock.ifEveryRangeResolved }],
    consequences: `Options 2 and 3 only make the range lookup resolve; ${v2Sub.scope - v2Sub.soleBlocker} of the ${v2Sub.scope} groups also carry other blockers.`,
    recommendation: 'UNAPPROVED: do not rule yet. Read Table 10-2 and the listed weapon entries in the PDF first (checklist below); then decide only for weapons the book leaves without a range.' },
  { id: 'V100-03', title: 'Printed attack totals that the Core formula plus battery assistance does not reproduce',
    evidence: ['Core vehicle attack basis used by the gate: crew Base Attack + Intelligence modifier, +2 for a pilot-crewed weapon, +2 per assisting gunner of a printed battery (Core pp.170-171).',
      `Of ${v3Sub.scope} groups on ${v3Sub.vehicles} capital ships, ${v3Sub.resolvedIfTextValuesConfirmed} are reproduced exactly (residual 0) once the Base Atk / Int shown in the statblock text replace the record's values: the RECORD disagrees with the text on ${new Set(v3.filter(x => x.text.status === 'RECORD_BAB_OR_INT_DIFFERS_FROM_TEXT').map(x => x.vehicleKey)).size} vehicles. That is an extraction defect, not a rules gap.`,
      `${v3Sub.stillUnexplainedWithTextValues} groups remain unexplained with the text values (residuals ${Object.entries(v3Sub.residualUsingTextValues).filter(([k]) => k !== '0').map(([k, n]) => `${k}:${n}`).join(', ')}); the residual equals the Core crew-quality attack bonus in ${v3Sub.residualEqualsCrewQualityAttackBonus} of them, so crew quality does not explain them either.`,
      `A wider scan of ${babIntScan.located} located statblocks finds the record's Base Atk differing from the text on ${babIntScan.babDiffers.length} vehicles and Int on ${babIntScan.intDiffers.length}.`],
    resolvedBySourceResearch: [`${v3Sub.resolvedIfTextValuesConfirmed} groups, if the PDF confirms the text Base Atk / Int (${v3Unlock.resolvedBySourceCorrectionAlone.groups} would then run with no other blocker).`],
    genuinelySilent: ['Not applicable: these are printed figures, not omissions.'],
    needsRuling: [`${v3Sub.stillUnexplainedWithTextValues} groups whose printed total stays unexplained after the correction (${v3Unlock.needingARulingAfterSourceCorrection.groups} would run with no other blocker), plus the Eclipse's conflicting +7 header / +15 row.`],
    options: [{ option: 1, text: 'Keep refusing unreconciled printed totals.', unlock: null }, { option: 2, text: 'Accept the verified printed total as the published generic-crew modifier and record the unexplained residual (labelled "printed-authority", not "reconciled"). It does not transfer to assigned characters, whose modifier is computed from their own Base Attack and Intelligence.', unlock: v3Unlock.needingARulingAfterSourceCorrection }],
    consequences: 'Option 2 makes the book\'s number authoritative without an explaining rule; it must stay labelled so a later rule can replace it.',
    recommendation: 'UNAPPROVED: first correct the record Base Atk / Int from the PDF (no ruling needed); only then decide option 2 for the remaining residuals.' },
  { id: 'V100-04', title: 'Qualitative firing arcs',
    evidence: [`${v4.length} groups state an arc without a geometry: ${v4.map(x => `${x.vehicle} - "${x.recordArcText}"`).join('; ')}.`, 'V-P6C-01 (existing owner ruling): a defined fixed-forward arc is enforced; a confirmed-silent arc imposes no restriction; a stated but uninterpretable arc is refused.'],
    resolvedBySourceResearch: ['None: the wording is the source wording.'], genuinelySilent: ['The geometry (degrees, coverage) is not printed for any of the five.'],
    needsRuling: [`All ${v4.length}: how a stated-but-undefined arc is treated.`],
    options: [{ option: 1, text: 'Keep refusing.', unlock: null }, { option: 2, text: 'GM-certified arc per group, labelled GM_CONFIGURED (the stated direction recorded beside it).', unlock: v4Unlock.ifQualitativeArcsUnrestricted }, { option: 3, text: 'Treat an undefined arc as unrestricted (this would let a "forward-mounted" weapon fire anywhere).', unlock: v4Unlock.ifQualitativeArcsUnrestricted }],
    consequences: 'Option 3 contradicts the stated direction; option 2 keeps GM adjudication but is not canonical.',
    recommendation: 'UNAPPROVED: option 2 (GM-certified arcs), as you suggested; option 3 is not recommended.' },
  { id: 'V100-05', title: 'Special-effect devices without ordinary damage',
    evidence: [`All ${v5.length} groups print a weapon entry in the statblock text: ${v5.map(x => x.label).join(', ')}.`, `${grappleDevices} use the tractor-beam notation "Atk +N, Dmg - (grapple +M)" (boarding drill, microtractor-pressor, plasma beam cutter and the harpoon gun's grapple +27), which is the notation the existing tractor-beam opposed-control mechanic already reads for tractor beams.`,
      'The marker missile prints "target vessel successfully tagged for tracking" and the gravity mine refers to a sidebar; the Droch boarding drill prints a full procedure (standard action, adjacent square, attaches to the target).'],
    resolvedBySourceResearch: ['The effect text for each is printed (not silent); extracting it is source work, not a ruling.'],
    genuinelySilent: ['Gravity mine effect lives in a sidebar not captured here; the harpoon gun has no located statblock detail.'],
    needsRuling: ['Whether a grapple-notation device should reuse the tractor-beam opposed-control mechanic (a mechanic choice), and whether narrative-only effects (marker missile tagging) are certified manual.'],
    options: [{ option: 1, text: 'Leave as implementation-required until each effect is specified from its printed text.', unlock: null }, { option: 2, text: 'Reuse the tractor-beam opposed-control mechanic for grapple-notation devices (owner confirms it is the right generic mechanic) and certify narrative-only devices as GM_ADJUDICATED.', unlock: null }],
    consequences: 'Option 2 changes reporting only for GM_ADJUDICATED devices (neither executable nor failed); the grapple devices become implementation work with a printed basis.',
    recommendation: 'UNAPPROVED: separate the two kinds as you suggested; ask for the ruling only on the reuse of the tractor-beam mechanic after the printed text of each device is read.' }
];

const V = {
  schema: 'swse.vehicle.evidence-verification.v1',
  note: 'EVIDENCE ONLY. Built from the committed gap analysis, the canonical vehicle records and the sourcebook TEXT corpus. The source PDFs are not in the repository, so no fact below is PDF-confirmed; TEXT_CORROBORATED means the record and the legible OCR text agree. No record, gate, mechanic or house rule was changed.',
  sourceLimits: { pdfsAvailable: false, textCorpus: 'reference/sourcebooks/*_djvu.txt', strongestStatus: 'TEXT_CORROBORATED', pdfConfirmedFacts: 0, pdfChecklistVehicles: checklist.length },
  v100_01: { summary: { ...v1Sub, launcherCountClasses: v1Class, soleBlockerByClass: v1ClassSole }, unlock: v1Unlock, publishedRules: [{ rule: 'A standard proton torpedo launcher holds three torpedoes (more may be bought, +25% per torpedo, to 16).', where: 'Starships of the Galaxy, Proton Torpedoes: Launchers (pp.45-46)' },
      { rule: 'Concussion missile launcher capacity by size: light 6, medium 16, heavy 30 (more may be bought, +20% per missile, to double).', where: 'Starships of the Galaxy, Concussion Missiles: Launchers (pp.45-46)' },
      { rule: 'The statblock Payload line is "the vehicle\'s complement of grenades, rockets, missiles, and torpedoes" (Core, statblock key). It is a carried complement, not a magazine.', where: 'Core Rulebook, vehicle statblock key (OCR line 16535)' }],
    groups: v1 },
  babIntScan,
  v100_02: { summary: v2Sub, unlock: v2Unlock, groups: v2 },
  v100_03: { summary: v3Sub, unlock: v3Unlock, groups: v3 },
  v100_04: { summary: { scope: v4.length, withArcWordingInText: v4.filter(x => x.textLinesWithArcWording.length).length }, unlock: v4Unlock, groups: v4 },
  v100_05: { summary: v5Sub, groups: v5 },
  extractionDefects: { kinds: defectKinds, groupsAffected: defectGroups.size, wouldRunIfRepairedAndNothingElseRemained: { ...defectUnlock, note: 'conditional on the PDF confirming each proposed correction' }, defects },
  unarmedRecheck: { counts: unarmedTally, vehicles: unarmedCheck },
  revisedDocket,
  pdfChecklist: checklist
};

const jsonText = JSON.stringify(V, null, 1) + '\n';
const mdText = renderVerification(V, A);
if (MODE === '--write') { fs.writeFileSync(OUT_JSON, jsonText); fs.writeFileSync(OUT_MD, mdText); console.log('wrote', OUT_JSON, OUT_MD); }
else { const same = fs.existsSync(OUT_JSON) && fs.readFileSync(OUT_JSON, 'utf8') === jsonText && fs.existsSync(OUT_MD) && fs.readFileSync(OUT_MD, 'utf8') === mdText; console.log(same ? 'up to date' : 'STALE'); process.exit(same ? 0 : 1); }
