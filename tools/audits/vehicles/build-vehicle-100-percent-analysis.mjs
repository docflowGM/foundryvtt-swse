#!/usr/bin/env node
/**
 * Universal Vehicles - Gap Consolidation and Owner Decision Report (ANALYSIS ONLY).
 *
 * Reads the canonical vehicle records, the runtime stock-group gate (assessStockWeaponGroups - the SAME assessment the coverage builder uses), the stock
 * coverage/unarmed/readiness audit outputs and the sourcebook TEXT corpus, and writes:
 *   data/audits/vehicles/vehicle-100-percent-completion-analysis.json   (machine-readable evidence)
 *   docs/audits/vehicles/vehicle-100-percent-completion-analysis.md     (the report; Parts I-IX)
 * It changes NO canonical record, gate, certification or house rule. Every count is recomputed from repository inputs; nothing here is authored by hand except the
 * root-cause TABLE (codes -> taxonomy), the PROPOSED unlock packages and the OWNER DECISION DOCKET, which are labelled as such.
 *
 * Usage: node tools/audits/vehicles/build-vehicle-100-percent-analysis.mjs --write | --check
 */
import fs from 'node:fs';
import { assessStockWeaponGroups, evidenceReasons } from '../../../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';
import { locateStatblocks } from './lib/statblock-locator.mjs';
import { renderReport } from './lib/analysis-report-md.mjs';

const MODE = process.argv[2];
if (!['--write', '--check'].includes(MODE)) { console.error('usage: --write|--check'); process.exit(2); }
const OUT_JSON = 'data/audits/vehicles/vehicle-100-percent-completion-analysis.json';
const OUT_MD = 'docs/audits/vehicles/vehicle-100-percent-completion-analysis.md';
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

const records = fs.readFileSync('data/canonical/vehicles/vehicles.json', 'utf8').trim().split('\n').map(JSON.parse);
const coverage = readJson('data/audits/vehicles/stock-weapon-coverage.json');
const unarmed = readJson('data/audits/vehicles/unarmed-vehicle-certification.json');
const readiness = readJson('data/audits/vehicles/weapon-ecosystem-readiness.json');
const inventory = readJson('data/audits/vehicles/weapon-ecosystem-inventory.json');
const catalog = readJson('data/vehicle-modifications/weapon-systems.json');
const catalogById = new Map(catalog.map(c => [c.id, c]));

// ---------------------------------------------------------------------------------------------------------------------------------
// 0. BASELINE: the owner's stated baseline vs the HEAD measurement
// ---------------------------------------------------------------------------------------------------------------------------------
const OWNER_BASELINE = Object.freeze({ vehicles: 429, groups: 846, executableGroups: 528, blockedGroups: 318, vehiclesWithExecutableGroup: 331, vehiclesFullyExecutable: 169, aftermarketRows: 63, aftermarketInstallable: 30 });
/** Groups added to the canonical-executable set after the owner baseline, each with the commit-level reason. Every one still passes the unchanged gate on its own record facts. */
const TRACTOR_NOTATION_GROUPS = ['fucg-neutron-star-bulk-cruiser-attack-2', 'fucg-venator-class-star-destroyer-attack-5', 'gaw-corona-class-armed-transport-source-attack-4', 'gaw-koensayr-ilh-kk-citadel-class-cruiser-source-attack-4',
  'sotg-eclipse-group-6', 'sotg-fondor-shipyards-super-star-destroyer-group-4', 'sotg-kuat-drive-yards-nebulon-b-frigate-group-3', 'sotg-loronar-corporation-strike-class-medium-cruiser-group-4', 'sotg-lusankya-group-5'];
const BASELINE_DELTA_GROUPS = Object.freeze([
  { match: { vehicle: /starviper/i, label: /proton torpedo launcher/i }, why: 'Starviper proton torpedo launchers (commit aeea5c4): the record prints 2 launchers (hardwareCount) and a Payload line of 6 proton torpedoes; designation reconciled by grammatical normalisation only.' },
  { match: { vehicle: /cutlass-9/i, label: /medium concussion missile/i }, why: 'Cutlass-9 medium concussion missiles (commit aeea5c4): the record prints 1 launcher and a Payload line of 8 medium concussion missiles.' },
  ...['cw-grievous-wheel-bike-modified-tsmeu-6-source-attack-1', 'cw-oevvaor-jet-catamaran-source-attack-1', 'cw-raddaugh-gnasp-fluttercraft-source-attack-1'].map(groupKey => ({ match: { groupKey }, why: 'Damage-line autofire figure (feature/v2-vehicles-next): the record prints the autofire attack figure on the damage line; it is accepted only because it reconciles with the printed total by the -5 autofire penalty.' })),
  ...TRACTOR_NOTATION_GROUPS.map(groupKey => ({ match: { groupKey }, why: 'Tractor-beam notation (feature/v2-vehicles-next): the record prints the grapple modifier in a spelling the gate did not read ("damage grapple +N" / "damage - (grapple +N)"); the mechanic and every other gate are unchanged.' }))
]);

// ---------------------------------------------------------------------------------------------------------------------------------
// 1. ASSESS EVERY GROUP FROM THE RECORDS (and require agreement with the committed coverage audit)
// ---------------------------------------------------------------------------------------------------------------------------------
const UMBRELLA = new Set(['STOCK_AMMUNITION_LIMITED_UNTRACKED']);
const covByKey = new Map(coverage.vehicles.map(v => [v.sourceEntryKey, v]));
const rangeSlugs = new Set(readJson('data/vehicle-weapon-ranges.json').map(r => r.slug));
const unarmedByKey = new Map(unarmed.rows.map(r => [r.sourceEntryKey, r]));

/** The reasons that actually BLOCK a group. A printed battery runs in two modes (Core p.170): its mode reasons only block when NEITHER mode can run, and then the cheaper mode's reasons are the blockers. */
function blockingReasons(g) {
  if (g.executable) return [];
  const umbrellaFree = r => r.filter(x => !UMBRELLA.has(x));
  if (!g.modes) return umbrellaFree(g.reasons);
  const modeReasonSet = new Set([...(g.modes['full-battery']?.reasons ?? []), ...(g.modes['independent-weapon']?.reasons ?? [])]);
  const common = g.reasons.filter(r => !modeReasonSet.has(r));
  const cheaper = [g.modes['full-battery'].reasons, g.modes['independent-weapon'].reasons].sort((a, b) => a.length - b.length)[0];
  return umbrellaFree([...new Set([...common, ...cheaper])]);
}

const vehicles = [];
for (const r of records) {
  const key = r.identity.sourceEntryKey;
  const assessed = assessStockWeaponGroups(r).groups;
  const cov = covByKey.get(key);
  const groups = assessed.map(g => {
    const cg = cov.groups.find(x => x.groupKey === g.groupKey);
    if (!cg || cg.offlineExecutable !== g.executable) throw new Error(`coverage audit disagrees with the gate for ${g.groupKey}: regenerate stock-weapon-coverage first`);
    return { g, cg, blocking: blockingReasons(g) };
  });
  vehicles.push({ r, key, groups, cov });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// 2. FAMILY OWNERSHIP of each stock group (same partition the readiness matrix uses; reporting only)
// ---------------------------------------------------------------------------------------------------------------------------------
const PARTITION_ORDER = ['hapan-triple-ion-cannon', 'ion-pulse-cannon', 'superlaser', 'autoblasters', 'shieldbuster-torpedoes', 'armor-piercing-concussion-missiles', 'proton-grenade-launcher', 'proton-torpedoes',
  'concussion-missiles', 'gravity-mines', 'space-mines', 'ion-bombs', 'tractor-beams', 'gravity-well-projectors', 'docking-guns', 'anti-aircraft-flak-pod', 'composite-beam-cannon', 'microtractor-pressor',
  'harpoon-gun', 'discord-missile', 'chaff-gun', 'defoliator', 'energy-bomblet-generator', 'heavy-ordnance-launcher', 'droid-jammer', 'mass-driver-and-projectile-cannons', 'laser-cannons', 'blaster-cannons',
  'turbolasers', 'ion-cannons'];
const invById = new Map(inventory.rows.map(r => [r.id, r]));
for (const id of PARTITION_ORDER) if (!invById.has(id)) throw new Error('partition names an unknown family ' + id);
const matchers = new Map(PARTITION_ORDER.map(id => [id, (invById.get(id).stockLabelPatterns ?? []).map(p => new RegExp(p, 'i'))]));
const familyOf = label => PARTITION_ORDER.find(id => matchers.get(id).some(re => re.test(label ?? ''))) ?? null;

// ---------------------------------------------------------------------------------------------------------------------------------
// 3. SOURCE PROBE (sourcebook TEXT corpus; OCR - the PDF is the final authority, so a probe never certifies anything by itself)
// ---------------------------------------------------------------------------------------------------------------------------------
const probeCache = new Map();
function probeVehicle(r) {
  const key = r.identity.sourceEntryKey;
  if (probeCache.has(key)) return probeCache.get(key);
  const { book, printedTitle } = r.publication;
  const { file, blocks } = locateStatblocks(book, printedTitle ?? r.identity.name);
  let p = { located: false, file, statblocks: blocks.length };
  if (blocks.length) {
    const b = blocks[0], t = b.text;
    const rs = t.findIndex(l => /^\s*Ranged\b/.test(l));
    let re = rs; while (re >= 0 && re < t.length && !/^\s*(Fighting Space|Base Atk|Atk Options|Abilities)\b/.test(t[re + 1] ?? '')) re++;
    const ranged = rs >= 0 ? t.slice(rs, Math.min(re + 1, t.length)).join(' ') : '';
    p = { located: true, ambiguous: blocks.length > 1, file, line: b.start + 1, statblocks: blocks.length,
      rangedLines: rs >= 0 ? Math.min(re + 1, t.length) - rs : 0,
      arcWordsInRanged: [...new Set((ranged.match(/\b(forward|front|aft|rear|turret|fixed|dorsal|ventral|port|starboard|broadside|360|arc)\b/gi) ?? []).map(x => x.toLowerCase()))],
      payloadLine: t.some(l => /\b(?:pay)?load\s*:?\s*\d/i.test(l) && !/\b(?:car|down|up|over)load/i.test(l)),
      seeBelow: /see below/i.test(ranged) };
  }
  probeCache.set(key, p);
  return p;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// 4. ROOT-CAUSE TABLE (taxonomy). AUTHORED ANALYSIS: it maps refusal codes to the owner's taxonomy; each entry says what exists and what would unlock it.
//    A = source evidence missing; B = evidence exists in a source/record but is not extracted or reconciled; C = an existing mechanic is not connected;
//    D = a mechanical implementation is missing; E = a genuine printed-rule ambiguity (only after the source is examined); F = GM configuration required;
//    G = identity / classification / denominator problem.
// ---------------------------------------------------------------------------------------------------------------------------------
const CLS = Object.freeze({ ENG: 'ENGINEERING_WORK — NO OWNER RULING REQUIRED', SRC: 'SOURCE_RESEARCH_REQUIRED', OWN: 'OWNER_DECISION_REQUIRED', GM: 'GM_CERTIFICATION_OPTION' });
const SRC = Object.freeze({ CONFIRMED: 'SOURCE_CONFIRMED', INCOMPLETE: 'SOURCE_INCOMPLETE', CONTRADICTORY: 'SOURCE_CONTRADICTORY', UNVERIFIED: 'SOURCE_NOT_YET_VERIFIED' });
const silent = v => v === 'SOURCE_SILENT_CONFIRMED';

/** Each entry: (ctx) -> { rootCause, classes[], engine, sourceStatus, rationale, docket? }. ctx = { code, g, r, probe, family, label }. */
const TABLE = {
  STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED: ctx => ({ rootCause: 'A', classes: [CLS.OWN, CLS.GM], engine: 'ammunition ledger + GM stock ammunition configuration (both exist and are offline-tested)',
    sourceStatus: silent(ctx.g.evidence?.hardwareCount) ? SRC.INCOMPLETE : SRC.UNVERIFIED, docket: 'V100-01',
    rationale: 'Payload and launcher identity are reconciled for this group; the statblock prints no launcher count. Whether a printed Payload alone defines a canonical pool is the open owner question (V-P6C-21).' }),
  STOCK_AMMUNITION_PAYLOAD_NOT_PRINTED: ctx => {
    const n = (ctx.r.armament?.carriedPayloads ?? []).length;
    if (n === 0 && ctx.probe.located && ctx.probe.payloadLine) return { rootCause: 'B', classes: [CLS.SRC], engine: 'payload reconciliation (matchPrintedPayload) exists', sourceStatus: SRC.UNVERIFIED, rationale: 'The corpus text shows a payload-shaped line in this statblock but the canonical record carries no Payload entry: an extraction/reconciliation gap, to be confirmed against the PDF.' };
    if (n === 0) return { rootCause: 'A', classes: [CLS.SRC, CLS.GM], engine: 'GM stock ammunition configuration exists', sourceStatus: SRC.UNVERIFIED, rationale: ctx.probe.located ? 'No Payload entry in the record and no payload-shaped line found in the corpus statblock: the book may be silent (PDF check required before calling it SOURCE_INCOMPLETE).' : 'No Payload entry in the record and the statblock was not isolated in the corpus text.' };
    return { rootCause: 'B', classes: [CLS.SRC], engine: 'payload reconciliation (matchPrintedPayload) exists', sourceStatus: SRC.UNVERIFIED, rationale: `The record carries ${n} Payload entr${n === 1 ? 'y' : 'ies'} but none is attributable to this group by a single exact designation (composite, unsized, qualified or shared by several launcher groups). Attribution needs the printed statblock; if the book gives no per-launcher split this becomes an owner decision.` };
  },
  STOCK_LAUNCHER_IDENTITY_NOT_ESTABLISHED: ctx => {
    const fam = ctx.family, l = ctx.label.toLowerCase();
    const genericMissile = /^(?:(?:\d+|twin|light|medium|heavy|advanced|spha-c heavy)\s+)*missile launchers?$/.test(l.replace(/\s*\(.*$/, '').trim());
    const noFamily = !genericMissile && (!fam || ['mass-driver-and-projectile-cannons', 'proton-grenade-launcher', 'heavy-ordnance-launcher', 'harpoon-gun', 'energy-bomblet-generator', 'defoliator', 'discord-missile', 'chaff-gun'].includes(fam));
    return noFamily
      ? { rootCause: 'D', classes: [CLS.ENG, CLS.SRC], engine: 'launcher families in LAUNCHER_CAPACITY (proton torpedo, concussion light/medium/heavy, shieldbuster, space mines, ion bomb rack) do not include this weapon', sourceStatus: SRC.UNVERIFIED, rationale: 'The printed designation names a weapon/ammunition kind that has no certified launcher family; a source row (price, capacity, ammunition) is also unreconciled for it.' }
      : { rootCause: 'A', classes: [CLS.SRC], engine: 'launcher designation normalisation exists (grammatical only)', sourceStatus: SRC.UNVERIFIED, rationale: 'The printed label does not name a certified launcher (generic "missile launcher"/"launcher" wording); the book may name the missile elsewhere in the entry. No identity is inferred from the vehicle or lore.' };
  },
  STOCK_BATTERY_WEAPON_COUNT_NOT_STATED: ctx => ({ rootCause: 'A', classes: [CLS.GM], engine: 'weapon-battery establishment + GM stock battery configuration (exist, offline-tested)', sourceStatus: silent(ctx.g.evidence?.hardwareCount) ? SRC.INCOMPLETE : SRC.UNVERIFIED,
    rationale: 'FULL-BATTERY mode needs the printed number of identical weapons; the statblock prints the gunner count only. This code blocks a group only when the independent-weapon mode is also unavailable.' }),
  STOCK_RANGE_TABLE_NOT_IDENTIFIED: ctx => {
    if (ctx.label.length > 60 || /\bAtk\s*[+-]\d/.test(ctx.label)) return { rootCause: 'B', classes: [CLS.SRC], engine: 'range lookup (rangeSlugFromPrintedDesignation) exists', sourceStatus: SRC.UNVERIFIED, rationale: 'The group label carries the whole printed attack line ("... (gunner): Atk +7, Dmg ..."): the record has not decomposed it into label / operator / total / damage.' };
    return { rootCause: 'A', classes: [CLS.SRC, CLS.OWN], engine: 'Table 10-2 lookup exists for the weapon types the table names (data/vehicle-weapon-ranges.json)', sourceStatus: SRC.UNVERIFIED, docket: 'V100-02',
      rationale: 'The printed designation names no weapon type with a row in Table 10-2. Whether the book assigns a range row (or a range at all) to it must be read from the source; mapping it to the nearest row would be a ruling.' };
  },
  STOCK_DAMAGE_NOT_PRINTED_IN_RECORD: ctx => {
    const notes = String(ctx.group?.specialNotes ?? '');
    const dash = /damage\s*:?\s*(?:—|–|none)|grapple\s*[+-]\d+/i.test(notes);
    if (dash && ctx.family === 'tractor-beams') return { rootCause: 'C', classes: [CLS.ENG], engine: 'tractor-beam opposed control exists and the gate already accepts "damage —" for tractor designations; this record writes the grapple figure in a notation variant ("damage grapple +N") the gate does not recognise', sourceStatus: SRC.CONFIRMED, rationale: 'A tractor beam group whose notes print a grapple modifier instead of a damage figure. The mechanic is built; only the notation variant is unread.' };
    if (dash) return { rootCause: 'D', docket: 'V100-05', classes: [CLS.OWN, CLS.SRC], engine: 'none: a non-damage special device (harpoon, boarding drill, marker, cutter, jammer, mine...) has no certified effect', sourceStatus: SRC.UNVERIFIED, rationale: 'The statblock prints no damage ("—", grapple modifier, special effect): the weapon is not an ordinary damage attack and its effect text must be read before any mechanic can be specified (a mechanic is a rules specification, not an engineering choice).' };
    if (ctx.label.length > 60 || /\bDmg\s*\d/.test(ctx.label)) return { rootCause: 'B', classes: [CLS.SRC], engine: 'damage parsing exists', sourceStatus: SRC.UNVERIFIED, rationale: 'The damage is inside the un-decomposed group label; the record has not extracted it.' };
    return { rootCause: 'B', classes: [CLS.SRC], engine: 'damage parsing exists', sourceStatus: SRC.UNVERIFIED, rationale: 'The group notes carry no parsable damage expression; the printed damage must be read from the statblock (PDF) and the record repaired.' };
  },
  STOCK_OPERATOR_NOT_PRINTED: ctx => {
    if (ctx.label.length > 60 || /\((?:pilot|gunner|copilot|co-pilot)\)/i.test(ctx.label)) return { rootCause: 'B', classes: [CLS.SRC], engine: 'operator parsing exists', sourceStatus: SRC.UNVERIFIED, rationale: 'The operator is inside the un-decomposed group label ("(gunner)"): the record has not extracted it.' };
    return { rootCause: 'A', classes: [CLS.SRC], engine: 'operator parsing exists', sourceStatus: SRC.UNVERIFIED, rationale: 'The group notes carry no operator; the statblock must be read to see whether one is printed.' };
  },
  STOCK_ATTACK_TOTAL_NOT_PRINTED: ctx => (ctx.label.length > 60 || /\bAtk\s*[+-]\d/.test(ctx.label)
    ? { rootCause: 'B', classes: [CLS.SRC], engine: 'attack-total reconciliation exists', sourceStatus: SRC.UNVERIFIED, rationale: 'The printed attack total is inside the un-decomposed group label; the record has not extracted it.' }
    : { rootCause: 'A', classes: [CLS.SRC], engine: 'attack-total reconciliation exists', sourceStatus: SRC.UNVERIFIED, rationale: 'The record prints no attack total for the group; the statblock must be read.' }),
  STOCK_ATTACK_TOTAL_UNEXPLAINED_DELTA: ctx => ({ rootCause: 'E', classes: [CLS.SRC, CLS.OWN], engine: 'printed-total reconciliation exists for delta 0, +2 (pilot), 2(N-1) (battery); anything else is refused', sourceStatus: SRC.UNVERIFIED, docket: 'V100-03',
    rationale: `The printed attack total differs from Base Attack + Intelligence modifier by ${ctx.delta ?? '?'} with no published rule that explains it (delta recorded per group). Confirm the printed figure in the PDF first; only a confirmed, unexplained printed figure is an owner question.` }),
  STOCK_FIRING_ARC_NOT_REVIEWED: ctx => ({ rootCause: 'B', classes: [CLS.SRC], engine: 'V-P6C-01: a confirmed-unstated arc imposes no automated restriction (exists)', sourceStatus: SRC.UNVERIFIED,
    rationale: ctx.probe.located ? (ctx.probe.arcWordsInRanged.length ? `The corpus statblock's attack lines contain arc-like words (${ctx.probe.arcWordsInRanged.join(', ')}): read the PDF - the arc may be stated.` : 'The corpus statblock\'s attack lines contain no arc wording (consistent with a silent source, which V-P6C-01 already treats as "no automated restriction"); the record just has not been marked reviewed. PDF confirmation required.') : 'The statblock was not isolated in the corpus text; the arc review has not been done.' }),
  STOCK_FIRING_ARC_STATED_UNPARSED: ctx => ({ rootCause: 'E', classes: [CLS.SRC, CLS.OWN], engine: 'only an explicit fixed-forward / forward-firing arc is interpreted (V-P6C-01); other stated arcs are refused', sourceStatus: SRC.INCOMPLETE, docket: 'V100-04',
    rationale: `The source states a qualitative arc ("${String(ctx.g.evidence?.firingArc ?? ctx.g.evidence?.qualitativeDirection ?? '').slice(0, 80)}") that is not a defined geometry; whether it restricts fire, and how, is not printed.` }),
  STOCK_SIZE_DEPENDENT_ATTACK_ADJUSTMENT: ctx => (ctx.g.evidence?.sourceConflict
    ? { rootCause: 'E', classes: [CLS.SRC, CLS.OWN], engine: 'capital-ship -20 attack component exists (W3)', sourceStatus: SRC.CONTRADICTORY, docket: 'V100-03', rationale: `The record documents a source conflict (${String(ctx.g.evidence.sourceConflict).slice(0, 80)}).` }
    : { rootCause: 'C', classes: [CLS.ENG], engine: 'target-size attack adjustment for capital-ship weapons exists (W3); the printed per-weapon figure is not connected to the stock path', sourceStatus: SRC.CONFIRMED,
      rationale: 'The statblock prints an explicit attack figure against targets smaller than Colossal. The mechanic (size-conditioned attack) exists; the printed value is not yet read by the stock path.' }),
  STOCK_DAMAGE_QUALIFIED: ctx => {
    const sfx = String(ctx.g.damage?.suffix ?? ctx.group?.specialNotes ?? '').toLowerCase();
    if (/autofire/.test(sfx)) {
      const m = /([+-]\d+)\s*autofire/.exec(sfx), printed = ctx.g.attackBonusPrinted;
      const consistent = m && Number.isFinite(printed) ? printed - Number(m[1]) === 5 : null;
      if (consistent === false) return { rootCause: 'E', classes: [CLS.SRC, CLS.OWN], engine: 'autofire reconciliation exists: printed autofire figure must equal the printed total less the -5 penalty', sourceStatus: SRC.UNVERIFIED, docket: 'V100-03',
        rationale: `The damage line prints an autofire figure (${m[1]}) that does NOT equal the printed total (${printed}) less 5: the printed figures are not reconciled by a published rule. Confirm in the PDF first.` };
      return { rootCause: 'C', classes: [CLS.ENG, CLS.SRC], engine: 'autofire attack-bonus reconciliation exists (printed bonus = total - 5); a damage-line qualifier "autofire ..." is not connected', sourceStatus: SRC.UNVERIFIED,
        rationale: consistent ? `The damage line carries an autofire qualifier (${m[1]}) that reconciles with the printed total (${printed} - ${m[1]} = 5): the mechanic exists; the qualifier is only read from the structured autofireAttackBonus key.` : 'The damage line carries an autofire qualifier without a numeric figure ("autofire only"); autofire exists as a mechanic, the qualifier is not read.' };
    }
    return { rootCause: 'D', classes: [CLS.ENG, CLS.SRC], engine: 'none for this qualifier', sourceStatus: SRC.UNVERIFIED, rationale: `The printed damage carries a qualifier ("${sfx.slice(0, 60)}") that no mechanic models; fail-closed until it is read from source.` };
  },
  STOCK_DAMAGE_AREA_OR_SPLASH: () => ({ rootCause: 'D', classes: [CLS.ENG, CLS.SRC], engine: 'starship-scale single-target area (P6C-3B) and area-miss half damage (V-P6C-07) exist; this group\'s area notation is outside them', sourceStatus: SRC.UNVERIFIED,
    rationale: 'The printed damage names an area/burst/splash shape that the existing area mechanic does not cover (character-scale splash with a radius, multi-mode damage, or radius area on a ship).' }),
  STOCK_DAMAGE_ION_UNVERIFIED: () => ({ rootCause: 'B', classes: [CLS.SRC], engine: 'ion lifecycle exists (P6C-2C); type is taken only from printed text', sourceStatus: SRC.UNVERIFIED, rationale: 'The label says "ion" but the record does not type the damage as ion; the printed damage line must be read.' }),
  STOCK_POSSIBLE_AREA_WEAPON_UNVERIFIED: () => ({ rootCause: 'A', classes: [CLS.SRC], engine: 'area mechanics exist; the label only denies', sourceStatus: SRC.UNVERIFIED, rationale: 'A weapon name suggests an area effect the record does not state; the printed weapon text decides.' }),
  STOCK_OPERATOR_IS_A_STATION_BATTERY: () => ({ rootCause: 'C', classes: [CLS.GM, CLS.SRC], engine: 'weapon-battery establishment (Core p.170) exists; this group\'s record does not mark it as a printed weapon battery', sourceStatus: SRC.UNVERIFIED,
    rationale: 'The operator is "N gunners" but the record\'s group kind does not mark a printed weapon battery, so the battery path is not entered. Gunner count is not weapon count; marking it a battery is a record reconciliation.' }),
  STOCK_OPERATOR_NOT_A_SINGLE_PILOT_OR_GUNNER: () => ({ rootCause: 'D', classes: [CLS.ENG, CLS.SRC], engine: 'operator parser accepts pilot / copilot / gunner (and "or"/"/" joins) and printed droid operators', sourceStatus: SRC.UNVERIFIED,
    rationale: 'The printed operator ("gunners", "bombardier", ...) is not a single recognised seat. Which seat or crew roster operates it is not established by the group text.' }),
  STOCK_GROUP_IS_A_WEAPON_BATTERY: () => ({ rootCause: 'C', classes: [CLS.SRC], engine: 'weapon-battery establishment exists', sourceStatus: SRC.UNVERIFIED, rationale: 'The record marks the group a weapon battery but the printed operator line does not match the battery form the gate understands ("N gunners" / "battery (N gunners)").' }),
  STOCK_SPECIAL_ATTACK_NOTATION_UNMODELED: ctx => ({ rootCause: 'D', classes: [CLS.ENG, CLS.SRC], engine: 'fire-link options, area, autofire exist as separate mechanics; this free-text notation is not read', sourceStatus: SRC.UNVERIFIED,
    rationale: `A structured specialAttackNotation is present ("${String(ctx.g.evidence?.specialAttackNotation ?? '').slice(0, 90)}"); the gate refuses any notation it does not model.` }),
  STOCK_EVIDENCE_UNMODELED: ctx => {
    const keys = Object.keys(ctx.g.evidence ?? {}).filter(k => evidenceReasons({ [k]: ctx.g.evidence[k] }).includes('STOCK_EVIDENCE_UNMODELED'));
    return { rootCause: 'D', classes: [CLS.ENG, CLS.SRC], engine: 'none for these evidence keys', sourceStatus: SRC.UNVERIFIED, evidenceKeys: keys, rationale: `Structured evidence the gate does not model: ${keys.join(', ') || '(unlisted)'}.` };
  },
  STOCK_VARIANT_SPECIFIC_GROUP_UNMODELED: () => ({ rootCause: 'F', classes: [CLS.ENG, CLS.GM], engine: 'none (no variant selection on a stock vehicle)', sourceStatus: SRC.CONFIRMED, rationale: 'The group applies only to named variants of the vehicle; which variant an actor is must be chosen by the GM.' }),
  STOCK_POINT_DEFENSE_CLASSIFICATION_UNVERIFIED: () => ({ rootCause: 'A', classes: [CLS.SRC], engine: 'point-defense modification exists for eligible weapons', sourceStatus: SRC.UNVERIFIED, rationale: 'Point-defense status is only taken from the printed designation.' })
};

function deltaOf(g, r) {
  const bab = r.combat?.baseAttackBonusPrinted, intScore = r.abilities?.int;
  if (!Number.isFinite(g.attackBonusPrinted) || !Number.isFinite(bab) || !Number.isFinite(intScore)) return null;
  return g.attackBonusPrinted - (bab + Math.floor((intScore - 10) / 2));
}

const FALLBACK = code => ({ rootCause: 'D', classes: [CLS.ENG], engine: 'unclassified', sourceStatus: SRC.UNVERIFIED, rationale: `No taxonomy entry for ${code}.` });

// ---------------------------------------------------------------------------------------------------------------------------------
// 5. CENSUS OF EVERY STOCK GROUP; the blocked ones carry causes
// ---------------------------------------------------------------------------------------------------------------------------------
const blockedGroups = [];
const allGroupsFlat = [];
for (const v of vehicles) {
  const probe = probeVehicle(v.r);
  for (const { g, cg, blocking } of v.groups) {
    const group = v.r.armament.firingGroups.find(x => x.groupKey === g.groupKey);
    const row = { groupKey: g.groupKey, vehicleKey: v.key, vehicle: v.r.identity.name, book: v.r.publication.book, page: v.r.publication.page, label: g.label, family: familyOf(g.label), executable: g.executable, outcome: cg.outcome };
    allGroupsFlat.push(row);
    if (g.executable) continue;
    const ctxBase = { g, r: v.r, group, probe, family: row.family, label: String(g.label ?? ''), delta: deltaOf(g, v.r) };
    const causes = blocking.map(code => ({ code, ...(TABLE[code] ?? FALLBACK)({ ...ctxBase, code }) }));
    // a printed BATTERY of launchers: the ammunition ledger (resolveLauncherFamily) only completes a family for a non-battery group, so even a settled launcher count would not run it
    if (g.battery && blocking.includes('STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED')) causes.push({ code: 'DERIVED_LAUNCHER_BATTERY_LEDGER_UNSUPPORTED', rootCause: 'D', classes: [CLS.ENG], engine: 'weapon-battery execution (Core p.170) and the launcher ammunition ledger exist separately; they are not combined for one group', sourceStatus: SRC.CONFIRMED,
      rationale: 'The group is a printed weapon battery whose weapons are launchers. The ledger completes a family only for a non-battery group, so this group needs the two mechanics combined in addition to the launcher count.' });
    for (const c of causes) {
      c.repoMechanic = c.rootCause === 'C' ? 'EXISTS_NOT_CONNECTED' : c.rootCause === 'D' ? 'MISSING_OR_PARTIAL' : 'EXISTS_SOURCE_FACT_MISSING';
      c.sourceContainsFact = c.sourceStatus === SRC.CONFIRMED ? 'YES' : c.sourceStatus === SRC.INCOMPLETE ? 'NO (the record certifies the source silent)' : c.sourceStatus === SRC.CONTRADICTORY ? 'CONFLICTING' : 'UNKNOWN (PDF check required)';
      c.whatWouldUnlockIt = [c.classes.includes(CLS.SRC) ? 'confirm the printed fact in the PDF and repair the record' : null, c.classes.includes(CLS.ENG) ? 'engineering: ' + (c.rootCause === 'C' ? 'connect the existing mechanic' : 'build or extend the mechanic') : null, c.classes.includes(CLS.OWN) ? `owner ruling${c.docket ? ' ' + c.docket : ''}` : null, c.classes.includes(CLS.GM) ? 'or a GM configuration (labelled GM_CONFIGURED, never canonical)' : null].filter(Boolean).join('; ');
    }
    const nonBlockingModeReasons = (g.reasons ?? []).filter(r => !UMBRELLA.has(r) && !blocking.includes(r));
    blockedGroups.push({ ...row, printedOperator: g.operator ?? null, printedDamage: g.damage?.raw ?? null, printedAttackTotal: g.attackBonusPrinted, payloadCount: Number.isFinite(g.evidence?.payloadCount) ? g.evidence.payloadCount : null,
      refusalCodes: g.reasons, blockingCodes: blocking, nonBlockingModeReasons, causes, attackDelta: ctxBase.delta,
      gmConfigurable: !!g.gmConfigurable, gmBatteryConfigurable: !!g.gmBatteryConfigurable,
      sourceProbe: { located: probe.located, line: probe.line ?? null, ambiguous: probe.ambiguous ?? false, seeBelow: probe.seeBelow ?? null } });
  }
}


// ---------------------------------------------------------------------------------------------------------------------------------
// 6. VEHICLE IDENTITY (armed / unarmed / record gap / fully / partial / all-blocked)
// ---------------------------------------------------------------------------------------------------------------------------------
const execByVehicle = new Map(), blockedByVehicle = new Map();
for (const v of vehicles) { execByVehicle.set(v.key, v.groups.filter(x => x.g.executable).length); blockedByVehicle.set(v.key, v.groups.filter(x => !x.g.executable).length); }
const vehicleClass = key => {
  const u = unarmedByKey.get(key);
  if (u) return u.status;                                                             // UNARMED_CONFIRMED | ARMED_RECORD_GAP | (UNRESOLVED)
  const e = execByVehicle.get(key), b = blockedByVehicle.get(key);
  return b === 0 ? 'ARMED_FULLY_EXECUTABLE' : e === 0 ? 'ARMED_ALL_GROUPS_BLOCKED' : 'ARMED_PARTIALLY_EXECUTABLE';
};
const vehicleIdentities = vehicles.map(v => ({ sourceEntryKey: v.key, name: v.r.identity.name, book: v.r.publication.book, page: v.r.publication.page, category: v.r.classification.primaryCategory, size: v.r.classification.printedSize,
  class: vehicleClass(v.key), groups: v.groups.length, executableGroups: execByVehicle.get(v.key), blockedGroups: blockedByVehicle.get(v.key) }));
const countBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const vehicleClassCounts = countBy(vehicleIdentities, x => x.class);
const armedVehicles = vehicleIdentities.filter(x => !['UNARMED_CONFIRMED'].includes(x.class));

// ---------------------------------------------------------------------------------------------------------------------------------
// 7. CAUSE KEYS, SHARED BLOCKERS, UNLOCK ANALYSIS
// ---------------------------------------------------------------------------------------------------------------------------------
const causeKey = c => `${c.code}|${c.rootCause}`;
for (const b of blockedGroups) b.causeKeys = [...new Set(b.causes.map(causeKey))].sort();
const blockedByKey = new Map(); for (const b of blockedGroups) { (blockedByKey.get(b.vehicleKey) ?? blockedByKey.set(b.vehicleKey, []).get(b.vehicleKey)).push(b); }
const armedNow = new Map(vehicleIdentities.map(x => [x.sourceEntryKey, x]));

/** What clearing a SET of cause keys would unlock, IF each cleared cause were fully resolved and nothing else remained. Conditional by construction; never a forecast of certification. */
function unlock(cleared) {
  const set = cleared instanceof Set ? cleared : new Set(cleared);
  const immediate = blockedGroups.filter(b => b.causeKeys.length && b.causeKeys.every(k => set.has(k)));
  const gross = blockedGroups.filter(b => b.causeKeys.some(k => set.has(k)));
  const immKeys = new Set(immediate.map(b => b.groupKey));
  const gainingFirst = new Set(), fully = new Set(), anyGain = new Set();
  for (const [vk, bs] of blockedByKey) {
    const cls = armedNow.get(vk)?.class; if (!cls || cls === 'UNARMED_CONFIRMED') continue;
    const im = bs.filter(b => immKeys.has(b.groupKey));
    if (im.length) anyGain.add(vk);
    if (im.length && (armedNow.get(vk).executableGroups === 0)) gainingFirst.add(vk);
    if (im.length === bs.length) fully.add(vk);
  }
  return { grossAffectedGroups: gross.length, immediatelyUnlockedGroups: immediate.length, vehiclesGainingAnyGroup: anyGain.size, vehiclesGainingFirstExecutableGroup: gainingFirst.size, vehiclesBecomingFullyExecutable: fully.size };
}

const allKeys = [...new Set(blockedGroups.flatMap(b => b.causeKeys))].sort();
const causeIndex = new Map();
for (const b of blockedGroups) for (const c of b.causes) { const k = causeKey(c); if (!causeIndex.has(k)) causeIndex.set(k, { key: k, code: c.code, rootCause: c.rootCause, classes: c.classes, engine: c.engine, docket: c.docket ?? null, groups: [], statusTally: {}, rationaleSample: c.rationale }); const e = causeIndex.get(k); e.groups.push(b); e.statusTally[c.sourceStatus] = (e.statusTally[c.sourceStatus] ?? 0) + 1; }
const sharedBlockers = [...causeIndex.values()].map(e => {
  const gk = new Set(e.groups.map(g => g.groupKey));
  const sole = blockedGroups.filter(b => b.causeKeys.length === 1 && b.causeKeys[0] === e.key);
  const u = unlock([e.key]);
  return { causeKey: e.key, code: e.code, rootCause: e.rootCause, classes: e.classes, existingEngine: e.engine, ownerDecision: e.classes.some(c => c === CLS.OWN) ? (e.docket ?? 'yes') : 'no', docket: e.docket,
    sourceEvidenceStatus: e.statusTally, grossGroups: gk.size, grossVehicles: new Set(e.groups.map(g => g.vehicleKey)).size, soleBlockerGroups: sole.length, ...u, rationale: e.rationaleSample };
}).sort((a, b) => b.grossGroups - a.grossGroups || b.immediatelyUnlockedGroups - a.immediatelyUnlockedGroups || a.causeKey.localeCompare(b.causeKey));

const coOccurrence = {};
for (const b of blockedGroups) for (let i = 0; i < b.causeKeys.length; i++) for (let j = i + 1; j < b.causeKeys.length; j++) { const k = `${b.causeKeys[i]} + ${b.causeKeys[j]}`; coOccurrence[k] = (coOccurrence[k] ?? 0) + 1; }
const topOverlaps = Object.entries(coOccurrence).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([pair, groups]) => ({ pair, groups }));

const keysWhere = f => allKeys.filter(k => f(causeIndex.get(k)));
const only = (e, ...cls) => e.classes.length > 0 && e.classes.every(c => cls.includes(c));
const KEY = { ALLOC: 'STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED|A', ARC: 'STOCK_FIRING_ARC_NOT_REVIEWED|B', RANGE_A: 'STOCK_RANGE_TABLE_NOT_IDENTIFIED|A', DELTA: 'STOCK_ATTACK_TOTAL_UNEXPLAINED_DELTA|E', ARC_Q: 'STOCK_FIRING_ARC_STATED_UNPARSED|E', DEV: 'STOCK_DAMAGE_NOT_PRINTED_IN_RECORD|D' };
const has = ks => ks.filter(k => causeIndex.has(k));
/** PROPOSED unlock packages (analysis, not authorisation). Each is a SET of cause keys; results are conditional on full resolution. */
const PACKAGES = [
  { id: 'PKG-A', name: 'Engineering only: connect or build mechanics whose source facts are already printed (no ruling, no new research)', basis: 'cause keys whose only class is ENGINEERING_WORK', keys: keysWhere(e => only(e, CLS.ENG)) },
  { id: 'PKG-B', name: 'Engineering + source research: PKG-A plus every cause that needs only PDF confirmation or record repair', basis: 'cause keys whose classes are within {ENGINEERING_WORK, SOURCE_RESEARCH_REQUIRED}', keys: keysWhere(e => only(e, CLS.ENG, CLS.SRC)) },
  { id: 'PKG-C', name: 'Record reconciliation (root cause B): evidence already exists in the record or the book and only needs extraction/repair', basis: 'all cause keys with root cause B', keys: keysWhere(e => e.rootCause === 'B') },
  { id: 'PKG-D', name: 'V100-01 option 1 (printed Payload defines the pool)', basis: 'clears STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED', keys: has([KEY.ALLOC]) },
  { id: 'PKG-E', name: 'Arc review of never-reviewed arcs (record + PDF; V-P6C-01 already treats a confirmed-silent arc as unrestricted)', basis: 'clears STOCK_FIRING_ARC_NOT_REVIEWED', keys: has([KEY.ARC]) },
  { id: 'PKG-F', name: 'V100-03 option "printed total is authoritative" (unexplained deltas, one source conflict)', basis: 'clears STOCK_ATTACK_TOTAL_UNEXPLAINED_DELTA and the contradictory size row', keys: has([KEY.DELTA, 'STOCK_SIZE_DEPENDENT_ATTACK_ADJUSTMENT|E', 'STOCK_DAMAGE_QUALIFIED|E']) },
  { id: 'PKG-G', name: 'V100-04 option "qualitative arcs impose no restriction"', basis: 'clears STOCK_FIRING_ARC_STATED_UNPARSED', keys: has([KEY.ARC_Q]) },
  { id: 'PKG-H', name: 'V100-02 option "GM-certified range band for weapon types outside Table 10-2"', basis: 'clears STOCK_RANGE_TABLE_NOT_IDENTIFIED (root cause A)', keys: has([KEY.RANGE_A]) },
  { id: 'PKG-I', name: 'Everything that needs no owner ruling and no GM configuration (PKG-B), then V100-01..04 options above', basis: 'union of PKG-B, PKG-D, PKG-F, PKG-G, PKG-H', keys: [] }
];
PACKAGES[8].keys = [...new Set([...PACKAGES[1].keys, ...PACKAGES[3].keys, ...PACKAGES[5].keys, ...PACKAGES[6].keys, ...PACKAGES[7].keys])].sort();
for (const p of PACKAGES) p.result = unlock(p.keys);

// greedy marginal path: ANALYSIS of where the biggest unlocks lie, not a recommended order
const greedy = []; { const cleared = new Set(); let prev = 0;
  for (let step = 0; step < allKeys.length; step++) {
    let best = null;
    for (const k of allKeys) { if (cleared.has(k)) continue; const u = unlock([...cleared, k]); const gain = u.immediatelyUnlockedGroups - prev; if (!best || gain > best.gain || (gain === best.gain && u.vehiclesBecomingFullyExecutable > best.u.vehiclesBecomingFullyExecutable)) best = { k, u, gain }; }
    if (!best || best.gain <= 0) break;
    cleared.add(best.k); prev = best.u.immediatelyUnlockedGroups;
    greedy.push({ step: greedy.length + 1, add: best.k, classes: causeIndex.get(best.k).classes, marginalGroups: best.gain, cumulativeGroups: best.u.immediatelyUnlockedGroups, cumulativeVehiclesFullyExecutable: best.u.vehiclesBecomingFullyExecutable });
  }
  greedy.push({ note: 'remaining blocked groups after the greedy path', groupsStillBlocked: blockedGroups.length - prev });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// 8. FAMILY AND AFTERMARKET ANALYSIS
// ---------------------------------------------------------------------------------------------------------------------------------
const groupsByFamily = new Map();
for (const g of allGroupsFlat) { const f = g.family ?? '(unclassified)'; (groupsByFamily.get(f) ?? groupsByFamily.set(f, []).get(f)).push(g); }
const ammoIdsWithInstalledLauncher = new Set();
const { EFFECTS } = await import('../../../scripts/domain/vehicles/vehicle-modification-effects.js');
for (const e of Object.values(EFFECTS)) if (e.kind === 'weapon' && e.ammunition?.id) ammoIdsWithInstalledLauncher.add(e.ammunition.id);
const blockedKeyed = new Map(blockedGroups.map(b => [b.groupKey, b]));
const families = readiness.rows.map(row => {
  const gs = groupsByFamily.get(row.id) ?? [];
  const blocked = gs.filter(g => !g.executable).map(g => blockedKeyed.get(g.groupKey));
  const tally = {}; for (const b of blocked) for (const k of b.causeKeys) tally[k] = (tally[k] ?? 0) + 1;
  const inv = invById.get(row.id);
  return { id: row.id, name: row.name, kind: row.kind, mechanic: row.mechanic, sourceCertification: row.sourceCertification, isPartitionOwner: PARTITION_ORDER.includes(row.id),
    stockGroups: PARTITION_ORDER.includes(row.id) ? gs.length : row.stock?.groups ?? null, stockExecutable: PARTITION_ORDER.includes(row.id) ? gs.filter(g => g.executable).length : row.stock?.offlineExecutable ?? null,
    stockBlocked: PARTITION_ORDER.includes(row.id) ? blocked.length : null, stockVehicles: PARTITION_ORDER.includes(row.id) ? new Set(gs.map(g => g.vehicleKey)).size : row.stock?.vehicles ?? null,
    stockBasis: PARTITION_ORDER.includes(row.id) ? 'partition (first matching family owns a group)' : 'overlay (a configuration/attack mode; not additive with partition families)',
    mechanicImplemented: row.attackExecution, damageOrEffect: row.damageOrEffectExecution, installation: row.aftermarket?.status ?? null, aftermarketWeaponRows: row.aftermarket?.weaponRows ?? 0, aftermarketInstallable: row.aftermarket?.installable ?? 0,
    resourceTracking: row.resourceTracking, configurations: row.configurations ?? [], inventoryBlockers: (row.openBlockers ?? []).map(b => b.code), overall: row.overall,
    sharedStockBlockers: Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => ({ causeKey: k, groups: n })), authoredNextSlice: inv?.nextSlice ?? null };
});
const unclassifiedGroups = groupsByFamily.get('(unclassified)') ?? [];
const unclassifiedByLabel = Object.entries(countBy(unclassifiedGroups, g => String(g.label).toLowerCase().slice(0, 60))).sort((a, b) => b[1] - a[1]).map(([label, groups]) => ({ label, groups }));

const aftermarketRows = [];
for (const row of readiness.rows) for (const cr of row.catalogRows ?? []) {
  const c = catalogById.get(cr.id);
  const priced = c.cost !== null && c.cost !== undefined || c.costMultiplier !== null && c.costMultiplier !== undefined;
  const ep = c.emplacementPoints !== null && c.emplacementPoints !== undefined;
  const blockers = (row.openBlockers ?? []).map(b => b.code);
  let rowClass, why;
  if (cr.installable) { rowClass = 'INSTALLABLE_OFFLINE_TESTED'; why = 'certified effect + Shipyard install/fire/remove tested offline'; }
  else if (cr.category === 'Ammunition') {
    const viaLauncher = ammoIdsWithInstalledLauncher.has(cr.id);
    rowClass = viaLauncher ? 'AMMUNITION_CONSUMABLE_PURCHASABLE_FOR_INSTALLED_LAUNCHER' : 'AMMUNITION_CONSUMABLE_NO_INSTALLED_LAUNCHER';
    why = viaLauncher ? 'an ammunition row, not a component: bought through the ammunition shop for an installed launcher that uses it' : 'an ammunition row whose launcher has no certified effect, so there is nothing to load it into';
  } else { rowClass = 'WEAPON_ROW_NOT_INSTALLABLE'; why = [cr.certification ? `certification ${cr.certification}` : 'no certification', `reconciliation ${cr.reconciliation}`, ...blockers.filter(b => /NOT_IMPLEMENTED|NOT_REPRODUCED|STATBLOCK_ONLY|SOURCE_ROW|SPECIAL_WEAPON|NO_CERTIFIED/.test(b))].join('; '); }
  aftermarketRows.push({ catalogId: cr.id, name: c.name, category: cr.category, weaponType: c.weaponType ?? null, familyId: row.id, certification: cr.certification, reconciliation: cr.reconciliation, installable: cr.installable, rowClass, why,
    pricedInCatalog: priced, emplacementPointsInCatalog: ep, pricingAndEpPrinted: priced && ep, cost: c.cost ?? null, costMultiplier: c.costMultiplier ?? null, emplacementPoints: c.emplacementPoints ?? null, familyBlockers: blockers, testFile: cr.testFile });
}
aftermarketRows.sort((a, b) => a.catalogId.localeCompare(b.catalogId));

// ---------------------------------------------------------------------------------------------------------------------------------
// 9. METRICS (Part I) AND BASELINE RECONCILIATION
// ---------------------------------------------------------------------------------------------------------------------------------
const execGroups = allGroupsFlat.filter(g => g.executable).length;
const headBaseline = { vehicles: vehicles.length, groups: allGroupsFlat.length, executableGroups: execGroups, blockedGroups: blockedGroups.length,
  vehiclesWithExecutableGroup: vehicles.filter(v => execByVehicle.get(v.key) > 0).length, vehiclesFullyExecutable: vehicles.filter(v => v.groups.length > 0 && blockedByVehicle.get(v.key) === 0).length,
  aftermarketRows: aftermarketRows.length, aftermarketInstallable: aftermarketRows.filter(r => r.installable).length };
const deltaGroups = BASELINE_DELTA_GROUPS.map(d => { const g = allGroupsFlat.find(x => (d.match.groupKey ? x.groupKey === d.match.groupKey : d.match.vehicle.test(x.vehicleKey) && d.match.label.test(x.label)) && x.executable); return { groupKey: g?.groupKey ?? null, vehicleKey: g?.vehicleKey ?? null, label: g?.label ?? null, why: d.why }; });
const baselineDifferences = Object.keys(OWNER_BASELINE).map(k => ({ metric: k, ownerBaseline: OWNER_BASELINE[k], head: headBaseline[k], difference: headBaseline[k] - OWNER_BASELINE[k] }));
const gmConfigurableBlocked = blockedGroups.filter(b => b.gmConfigurable).length;
const metrics = {
  vehicles: headBaseline.vehicles, stockFiringGroups: headBaseline.groups,
  distinctions: {
    sourceVerifiedGroups: coverage.totals.sourceVerifiedGroups,
    offlineExecutableGroups: execGroups,
    gmConfigurableGroupsCurrentlyBlocked: gmConfigurableBlocked,
    gmConfiguredGroups: 'not countable offline: GM configuration lives on world Actors; the gate reports it as GM_CONFIGURED_EXECUTABLE and never as canonical',
    liveVerifiedGroups: 0
  },
  groupOutcomes: coverage.totals.outcomes,
  vehicles_: { classCounts: vehicleClassCounts, armedVehicles: armedVehicles.length, armedWithAtLeastOneExecutableGroup: armedVehicles.filter(x => x.executableGroups > 0).length, armedFullyExecutable: vehicleClassCounts.ARMED_FULLY_EXECUTABLE ?? 0 },
  aftermarket: { catalogRows: aftermarketRows.length, weaponRows: aftermarketRows.filter(r => r.category === 'Weapon').length, ammunitionRows: aftermarketRows.filter(r => r.category === 'Ammunition').length, installable: headBaseline.aftermarketInstallable, rowClasses: countBy(aftermarketRows, r => r.rowClass) }
};

// ---------------------------------------------------------------------------------------------------------------------------------
// 10. OWNER DECISION DOCKET (AUTHORED from the data above; rulings are PENDING; recommendations are labelled and never authorisation)
// ---------------------------------------------------------------------------------------------------------------------------------
const scopeOf = id => { const gs = blockedGroups.filter(b => b.causes.some(c => c.docket === id)); return { groups: gs.length, vehicles: new Set(gs.map(g => g.vehicleKey)).size, groupKeys: gs.map(g => g.groupKey) }; };
const docket = [
  { id: 'V100-01', title: 'Stock launchers: does a printed Payload alone define a canonical ammunition pool?', registerRef: 'V-P6C-21', problem: 'The statblock prints a Payload and the launcher designation but no launcher count or magazine; the ledger needs a launcher count to run.',
    canonicalEvidence: 'Core Rulebook and Starships of the Galaxy statblock Payload lines (recorded as armament.carriedPayloads); SotG pp.45-46 launcher capacities (properties of launchers a ship BUYS).', scope: scopeOf('V100-01'),
    options: [{ option: 1, text: 'The printed Payload is the pool; no magazine / reload modelling for stock groups.', clears: has([KEY.ALLOC]) },
      { option: 2, text: 'A launcher count must also be established (source-printed or GM-certified); stock groups without one stay GM-configured, never canonical.', clears: [] }],
    consequences: 'Option 1 makes the ledger run from the Payload alone (no magazine size, no reload step) for stock groups, while installed launchers keep magazines and reload. Option 2 keeps current behaviour and routes these groups to GM configuration.',
    recommended: 'Labelled recommendation (not authorisation): none. Option 1 maximises canonical coverage; option 2 preserves the printed-launcher-count standard. The evidence supports both.' },
  { id: 'V100-02', title: 'Weapons whose type has no row in Table 10-2: how is their range resolved?', registerRef: 'V-P6C-12 (convention) - new question', problem: 'Table 10-2 (plus the two SotG rows) names 9 weapon types. Stock groups named rocket / grenade / mass-driver / mine / repeating blaster / harpoon etc. match none, so the attack cannot resolve a range band.',
    canonicalEvidence: 'Core Rulebook Table 10-2 (Vehicle Weapon Ranges); SotG Table 3-5 additions; data/vehicle-weapon-ranges.json (9 rows).', scope: scopeOf('V100-02'),
    options: [{ option: 1, text: 'Refuse permanently (current): such groups stay non-executable unless a source row is found.', clears: [] },
      { option: 2, text: 'GM-certified range bands per weapon (a new GM-configured outcome, labelled apart from canonical; the record is never edited).', clears: has([KEY.RANGE_A]) },
      { option: 3, text: 'Adopt a stated project convention mapping each such type to an existing Table 10-2 row (owner supplies the mapping).', clears: has([KEY.RANGE_A]) }],
    consequences: 'Options 2 and 3 can only make the range lookup resolve; each group may still carry other blockers (see unlock estimates).', recommended: 'Labelled recommendation: source research first - a printed range for some of these weapons may exist in the book entry; decide only for those where the book is silent.' },
  { id: 'V100-03', title: 'Printed attack totals and autofire figures that no published rule reconciles: which is authoritative?', registerRef: 'new', problem: 'The gate accepts a printed total only when its difference from crew BAB + Int is explained by a published rule (0, +2 pilot, 2(N-1) battery). The groups below differ by other amounts, or print an autofire figure that is not total - 5, or (one case) print two conflicting totals.',
    canonicalEvidence: 'Core Rulebook vehicle attack rules (pp.169-171); the statblock printed totals; deltas are recorded per group in the companion JSON.', scope: scopeOf('V100-03'),
    options: [{ option: 1, text: 'Refuse unreconciled printed totals (current).', clears: [] },
      { option: 2, text: 'Treat the printed total as the published generic crew modifier and record the unexplained delta as source-authoritative (labelled, not reconciled).', clears: has([KEY.DELTA, 'STOCK_SIZE_DEPENDENT_ATTACK_ADJUSTMENT|E', 'STOCK_DAMAGE_QUALIFIED|E']) }],
    consequences: 'Option 2 accepts the book\'s number without an explanatory rule; the Eclipse conflict (header +7 vs row +15) would still need a choice of which printed figure governs.', recommended: 'Labelled recommendation: confirm each printed figure in the PDF first (OCR errors are the likeliest cause of an odd delta); only then decide.' },
  { id: 'V100-04', title: 'Qualitative firing arcs ("forward-mounted", "articulated", "flank turrets", "axial"): do they restrict fire?', registerRef: 'V-P6C-01 (extends)', problem: 'V-P6C-01 enforces only a defined fixed-forward arc and treats a confirmed-silent arc as unrestricted. These groups state a direction without a geometry.',
    canonicalEvidence: 'The statblock/weapon text quoted per group in the companion JSON.', scope: scopeOf('V100-04'),
    options: [{ option: 1, text: 'Refuse (current).', clears: [] }, { option: 2, text: 'Treat an undefined qualitative arc like a silent one (no automated restriction).', clears: has([KEY.ARC_Q]) }, { option: 3, text: 'GM-configured arc per group (labelled, not canonical).', clears: has([KEY.ARC_Q]) }],
    consequences: 'Option 2 can let a "forward-mounted" weapon fire in any direction; option 3 keeps it GM-adjudicated.', recommended: 'Labelled recommendation: none; the evidence is the source wording only.' },
  { id: 'V100-05', title: 'Special-effect devices with no damage and no specified mechanic: automate, or certify as GM-adjudicated?', registerRef: 'new', problem: 'Harpoon guns, boarding drills, marker missiles, plasma cutters, beacon launchers, jammers, mass pulse tubes, pseudograv projectors and similar stock groups print no damage; their effect is text. A mechanic for each is a rules specification.',
    canonicalEvidence: 'Per-group statblock/weapon text (quoted in the companion JSON); no sourcebook mechanic has been extracted for them.', scope: scopeOf('V100-05'),
    options: [{ option: 1, text: 'Leave as IMPLEMENTATION_REQUIRED until the owner specifies each mechanic.', clears: [] },
      { option: 2, text: 'Add a certified outcome "GM_ADJUDICATED_DEVICE": the group is shown with its printed text, no automation, and counts separately from both executable and blocked.', clears: [] }],
    consequences: 'Option 2 changes the denominator reporting (not the 846): these groups would be neither canonical-executable nor failures, but certified manual.', recommended: 'Labelled recommendation: option 2 for devices whose book text is purely narrative; option 1 for any the owner wants automated.' }
];
for (const d of docket) { d.ownerRuling = 'PENDING'; d.unlockEstimates = d.options.map(o => ({ option: o.option, ...(o.clears.length ? unlock(o.clears) : { grossAffectedGroups: 0, immediatelyUnlockedGroups: 0, vehiclesGainingAnyGroup: 0, vehiclesGainingFirstExecutableGroup: 0, vehiclesBecomingFullyExecutable: 0 }), label: o.clears.length ? 'CONDITIONAL on the ruling and on no other blocker remaining' : 'no canonical unlock' })); }

// ---------------------------------------------------------------------------------------------------------------------------------
// 11. SOURCE COMPLETENESS, CLASSES, FORECAST
// ---------------------------------------------------------------------------------------------------------------------------------
const causeStatusTally = {}; for (const b of blockedGroups) for (const c of b.causes) causeStatusTally[c.sourceStatus] = (causeStatusTally[c.sourceStatus] ?? 0) + 1;
const groupStatus = b => (b.causes.some(c => c.sourceStatus === SRC.CONTRADICTORY) ? SRC.CONTRADICTORY : b.causes.some(c => c.sourceStatus === SRC.INCOMPLETE) ? SRC.INCOMPLETE : b.causes.every(c => c.sourceStatus === SRC.CONFIRMED) ? SRC.CONFIRMED : SRC.UNVERIFIED);
for (const b of blockedGroups) { b.sourceStatus = groupStatus(b); b.classes = [...new Set(b.causes.flatMap(c => c.classes))].sort(); b.rootCauses = [...new Set(b.causes.map(c => c.rootCause))].sort(); b.primaryRootCause = ['E', 'A', 'B', 'C', 'D', 'F', 'G'].find(rc => b.rootCauses.includes(rc)); }
const groupSourceStatus = countBy(blockedGroups, b => b.sourceStatus);
const groupClassCombos = countBy(blockedGroups, b => b.classes.join(' + '));
const rootCauseGroups = countBy(blockedGroups, b => b.primaryRootCause);
const pct = (n, d) => Math.round((n / d) * 1000) / 10;
const armedN = armedVehicles.length;
const forecast = {
  note: 'Upper bounds under stated conditions. They are NOT promises: a SOURCE_RESEARCH item may end SOURCE_INCOMPLETE; an OWNER_DECISION item may be ruled "refuse"; a GM_CERTIFICATION_OPTION is never canonical.',
  canonicalExecutableNow: { groups: execGroups, of: allGroupsFlat.length, pct: pct(execGroups, allGroupsFlat.length) },
  afterEngineeringOnly: { ...unlock(PACKAGES[0].keys), cumulativeGroups: execGroups + unlock(PACKAGES[0].keys).immediatelyUnlockedGroups },
  afterEngineeringAndSourceResearch_upperBound: { ...unlock(PACKAGES[1].keys), cumulativeGroups: execGroups + unlock(PACKAGES[1].keys).immediatelyUnlockedGroups },
  afterOwnerRulingsToo_upperBound: { ...unlock(PACKAGES[8].keys), cumulativeGroups: execGroups + unlock(PACKAGES[8].keys).immediatelyUnlockedGroups },
  gmCertificationOnly_notCanonical: { groups: gmConfigurableBlocked, label: 'groups blocked ONLY by the four ammunition facts; a GM configuration (existing route) would run them, labelled GM_CONFIGURED_EXECUTABLE' },
  liveFoundryV13Verification: { verifiedGroups: 0, label: 'nothing is live-verified; offline functional coverage and production acceptance are separate milestones' },
  residualNeverCanonicalWithoutRuling: { groups: blockedGroups.filter(b => b.sourceStatus === SRC.INCOMPLETE || b.sourceStatus === SRC.CONTRADICTORY).length, label: 'groups with at least one cause whose source is incomplete/contradictory as recorded' },
  armedVehicleDenominator: armedN
};

const sourceGaps = blockedGroups.filter(b => b.sourceStatus === SRC.INCOMPLETE || b.sourceStatus === SRC.CONTRADICTORY).map(b => ({ groupKey: b.groupKey, vehicle: b.vehicle, book: b.book, page: b.page, label: b.label, status: b.sourceStatus, causeKeys: b.causeKeys }));
const unarmedFindings = { unarmedConfirmed: unarmed.rows.filter(r => r.status === 'UNARMED_CONFIRMED').map(r => ({ sourceEntryKey: r.sourceEntryKey, book: r.book, page: r.page })),
  armedRecordGap: unarmed.rows.filter(r => r.status === 'ARMED_RECORD_GAP').map(r => ({ sourceEntryKey: r.sourceEntryKey, book: r.book, page: r.page, attackLines: r.evidence?.attackLines ?? [], rootCause: 'B', classes: [CLS.SRC], note: 'The statblock prints an attack line the record has no firing group for: a record repair (canonical data is not touched in this phase).' })) };

const analysis = {
  schema: 'swse.vehicle.completion-analysis.v1',
  note: 'ANALYSIS ONLY. Generated by tools/audits/vehicles/build-vehicle-100-percent-analysis.mjs from the canonical vehicle records, the runtime stock-group gate, the stock/unarmed/readiness audits and the sourcebook TEXT corpus (the PDF is the final source authority; a corpus probe never certifies by itself). No canonical record, gate, certification or house rule was changed to produce it.',
  taxonomy: { A: 'source evidence missing', B: 'evidence exists in a source/record but is not extracted or reconciled', C: 'an existing mechanic is not connected', D: 'a mechanical implementation is missing', E: 'a genuine printed-rule ambiguity (only after the source is examined)', F: 'GM configuration required', G: 'identity / classification / denominator problem' },
  classes: Object.values(CLS), sourceStatuses: Object.values(SRC),
  baseline: { ownerBaseline: OWNER_BASELINE, head: headBaseline, differences: baselineDifferences, explanation: { changedBy: 'three reviewed batches after the owner baseline: aeea5c4 (two launcher groups whose records PRINT the launcher count and Payload), the tractor-beam notation batch (nine groups) and the damage-line autofire batch (three groups whose printed autofire figure reconciles with the printed total)', groups: deltaGroups, denominatorsChanged: false } },
  metrics, vehicleClassCounts, vehicleIdentities, unarmedFindings,
  blockedGroups, causeStatusTally, groupSourceStatus, groupClassCombos, primaryRootCauseGroups: rootCauseGroups,
  sharedBlockers, topOverlaps, packages: PACKAGES, greedyPath: greedy,
  families, unclassifiedStock: { groups: unclassifiedGroups.length, byLabel: unclassifiedByLabel }, aftermarketRows,
  sourceGaps, docket, forecast
};
const jsonText = JSON.stringify(analysis, null, 1) + '\n';
const mdText = renderReport(analysis);
if (MODE === '--write') { fs.writeFileSync(OUT_JSON, jsonText); fs.writeFileSync(OUT_MD, mdText); console.log('wrote', OUT_JSON, OUT_MD, JSON.stringify(headBaseline)); }
else {
  const same = fs.existsSync(OUT_JSON) && fs.readFileSync(OUT_JSON, 'utf8') === jsonText && fs.existsSync(OUT_MD) && fs.readFileSync(OUT_MD, 'utf8') === mdText;
  console.log(same ? 'up to date' : 'STALE', JSON.stringify(headBaseline)); process.exit(same ? 0 : 1);
}
