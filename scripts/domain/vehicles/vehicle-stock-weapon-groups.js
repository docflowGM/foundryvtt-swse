/**
 * Published (factory) weapon groups of a source-backed vehicle: strict, fail-closed interpretation of the canonical
 * record's printed firing groups (record.armament.firingGroups, digest-verified with the rest of the record).
 *
 * The canonical records carry each printed attack group as a label, a printed attack total, and free-text notes whose
 * wording varies by source. This module reads ONLY the facts it can take unambiguously from those notes (damage dice and
 * multiplier, one pilot/gunner operator) and refuses everything else with a named reason. It never infers a weapon
 * family or mechanics from a label (the one lookup by printed designation is the Table 10-2 RANGE row, V-P6C-12).
 *
 * A group is EXECUTABLE as a plain stock weapon only when all of these hold:
 *   - the notes state damage as plain dice, with or without a printed multiplier and, optionally, the printed type "ion"
 *     (no splash/burst or other qualifier);
 *   - exactly one operator is printed and it is the pilot or a single gunner;
 *   - the group is a single-operator weapon or a PRINTED weapon battery whose gunner count and identical-weapon count are
 *     both printed and agree (Core p. 170, vehicle-weapon-battery.js); any size-dependent figure it prints is the Core -20;
 *   - the printed attack total reconciles with the printed crew Base Attack + the vehicle's Intelligence modifier
 *     (the Core vehicle attack formula), so applying the formula cannot contradict the statblock.
 * The firing arc follows determineStockArc() (owner ruling V-P6C-01): a stated, understood arc is enforced; a confirmed-
 * unstated arc imposes no automated restriction; a stated-but-uninterpreted or never-reviewed arc is refused.
 * Pure; no Foundry globals.
 */
import { establishPublishedBattery, establishIndependentBatteryWeapon, batteryAssistanceBonus } from './vehicle-weapon-battery.js';
import { resolveLauncherFamily } from './vehicle-ammunition-ledger.js';
import { rangeSlugFromPrintedDesignation } from './vehicle-weapon-range.js';

/** Names the sheet shows: the battery keeps the printed label; its independent single weapon is plainly labelled so it is never mistaken for the battery. */
export const stockItemName = (group, mode = 'single') => (mode === 'independent-weapon' ? `${group.label} (single weapon)` : group.label);
export const stockMountKey = (group, mode = 'single') => (mode === 'independent-weapon' ? `stock:${group.groupKey}#independent-weapon` : `stock:${group.groupKey}`);

const abilityMod = s => Math.floor((s - 10) / 2);
const finite = v => typeof v === 'number' && Number.isFinite(v);

const DAMAGE = /(?:printed damage|published damage|damage)\s*:?\s*(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\s*(?:x\s*(\d+))?([^;.]*)/i;
const OPERATOR = /(?:printed operator|operator|station)\s*:?\s*([^;.(]*?)\s*(?:\(([^)]*)\))?\s*(?:;|\.|\s+(?:printed|source|damage|physical)\b|$)/i;
const EVIDENCE = /\{[^{}]*\}/;
// weapon names that suggest an area effect the notes may not state; they can only deny
const POSSIBLE_AREA = /\b(flak|pulse-wave|barrage|cluster)\b/i;
const AMMUNITION_LIMITED = /\b(missiles?|torpedo(?:es)?|rockets?|mines?|bombs?|bomblets?|grenades?|launchers?|projectiles?|shells?|canisters?|payload)\b/i;


/**
 * The group's structured source evidence (the JSON the record keeps beside the free-text notes) is read as a WHOLE: a key the
 * gate understands is informational or handled by another check; a key that carries a mechanic the runtime does not model
 * (area / splash, hit-and-miss riders, recharge, variants, special attack notations...) refuses the group; any key the gate has
 * never seen refuses it too (fail closed). Values that are null mean "the source states nothing" and refuse nothing.
 */
const INFORMATIONAL_EVIDENCE_KEYS = new Set([
  'firingArc', 'damageType',
  'hardwareCount', 'hardwareCountBasis', 'hardwareCountKind', 'hardwareCountStatus', 'hardwareEvidence', 'physicalMountCount', 'physicalMountSource',
  'physicalCountEvidence', 'narrativePhysicalCount', 'printedMultiplicity', 'printedRangedMultiplicity', 'rangedMultiplicity', 'printedRangedGroupCount',
  'printedRangedCount', 'printedRangedWeaponCount', 'firingGroupCountEvidence', 'attackGroupIndex', 'batteryCount', 'batteryComposition',
  'gunnerCountPrinted', 'sourceEvidenceStatus', 'printedWeaponDesignation', 'fireLink',
  // the vehicle's printed complement of ammunition: read by the launcher-family check, never by itself a mechanic
  'payloadCount',
  // autofire figures: autofire/burst are refused for every vehicle-managed weapon at attack time
  'autofire', 'autofireBonus', 'autofireAttackBonus', 'auto'
]);
const SIZE_FIGURE_KEY = /smaller|small|vs|against/i;          // the size-dependent attack figures checkSizeDependentAdjustments() verifies
const AREA_EVIDENCE_KEY = /^(splash|area.*|hit|miss|recharge.*)$/i;

const ORDINARY_AREA_SQUARES = /^\s*(\d+)[- ]?squares?\s*$/i;
const ORDINARY_AREA_IN_TEXT = /(\d+)[- ]square\s+(splash|burst)\b/i;

/**
 * An ORDINARY area (splash / burst radius, printed as "N-square splash" on the damage line or as `splash: "N-square"` in the
 * evidence) is a character-scale area. At STARSHIP scale it resolves as an attack on a single target (Core, Vehicle Combat); at
 * character scale it needs the multi-target area engine, which does not exist, so the attack is refused there (see
 * vehicle-encounter-scale.js). Any other area wording (an unsized radius, an explicit starship-scale area, hit/miss riders,
 * recharge) is not ordinary and stays refused.
 * @returns {null | {kind:'splash'|'burst', squares:number|null, source:string}}
 */
export function extractOrdinaryArea(evidence = {}, suffix = '') {
  const fromText = ORDINARY_AREA_IN_TEXT.exec(String(suffix)) ?? (/\bsplash\b/i.test(suffix) ? [null, null, 'splash'] : null);
  const fromEvidence = typeof evidence?.splash === 'string' ? ORDINARY_AREA_SQUARES.exec(evidence.splash) : null;
  if (!fromText && !fromEvidence) return null;
  const textSquares = fromText?.[1] ? Number(fromText[1]) : null, evSquares = fromEvidence ? Number(fromEvidence[1]) : null;
  return { kind: fromText ? String(fromText[2]).toLowerCase() : 'splash', squares: textSquares ?? evSquares, source: fromText ? 'damage-line' : 'evidence',
    conflict: textSquares !== null && evSquares !== null && textSquares !== evSquares };
}

export function evidenceReasons(evidence = {}) {
  const out = [];
  for (const [k, v] of Object.entries(evidence ?? {})) {
    if (INFORMATIONAL_EVIDENCE_KEYS.has(k) || SIZE_FIGURE_KEY.test(k)) continue;
    if (k === 'splash') { if (v !== null && v !== undefined && !ORDINARY_AREA_SQUARES.test(String(v))) out.push('STOCK_DAMAGE_AREA_OR_SPLASH'); continue; }   // "4-square": an ordinary (character-scale) splash, see extractOrdinaryArea()
    if (AREA_EVIDENCE_KEY.test(k)) { if (v !== null && v !== undefined) out.push('STOCK_DAMAGE_AREA_OR_SPLASH'); continue; }
    if (k === 'applicableVariants') { if (Array.isArray(v) && v.length) out.push('STOCK_VARIANT_SPECIFIC_GROUP_UNMODELED'); continue; }
    if (k === 'qualitativeDirection') { if (v) out.push('STOCK_FIRING_ARC_STATED_UNPARSED'); continue; }
    if (k === 'specialAttackNotation') { if (v) out.push('STOCK_SPECIAL_ATTACK_NOTATION_UNMODELED'); continue; }
    if (k === 'ammunition') { if (v !== 'SOURCE_SILENT_CONFIRMED') out.push('STOCK_AMMUNITION_LIMITED_UNTRACKED'); continue; }
    if (k === 'attackScale') { if (v !== 'starship') out.push('STOCK_EVIDENCE_UNMODELED'); continue; }
    if (k === 'fireLinkOption') continue;                      // an option flag; the printed damage is the published figure
    out.push('STOCK_EVIDENCE_UNMODELED');                      // payload*, pointDefense, effect, weaponKind, deviceType, configuration, sourceConflict...
  }
  return out;
}

/** Parse one printed group. Never throws; `reasons` names everything that makes it non-executable. */
export function parseStockFiringGroup(group) {
  const notes = String(group?.specialNotes ?? '');
  const reasons = [];
  const out = { groupKey: group?.groupKey ?? null, label: group?.label ?? null, attackBonusPrinted: finite(group?.attackBonusPrinted) ? group.attackBonusPrinted : null,
    damage: null, operator: null, evidence: {}, reasons };

  const e = notes.match(EVIDENCE);
  if (e) { try { out.evidence = JSON.parse(e[0]); } catch { reasons.push('STOCK_EVIDENCE_UNREADABLE'); } }

  reasons.push(...evidenceReasons(out.evidence));

  const d = notes.match(DAMAGE);
  if (!d) reasons.push('STOCK_DAMAGE_NOT_PRINTED_IN_RECORD');
  else {
    const dice = Number(d[1]), die = Number(d[2]), mult = d[5] ? Number(d[5]) : 1;
    const suffix = String(d[6] ?? '').trim().toLowerCase();
    out.damage = { dice, die, bonus: d[3] ? Number(`${d[3]}${d[4]}`) : 0, multiplier: mult, formula: `${dice}d${die}`, raw: `${d[1]}d${d[2]}${d[5] ? `x${d[5]}` : ''}`, suffix };
    if (d[3]) reasons.push('STOCK_DAMAGE_HAS_FLAT_TERM');
    const area = extractOrdinaryArea(out.evidence, suffix);
    if (area) { out.area = area; if (area.conflict) reasons.push('STOCK_DAMAGE_AREA_OR_SPLASH'); }
    const afterArea = suffix.replace(ORDINARY_AREA_IN_TEXT, ' ').replace(/\bsplash\b/i, ' ');
    if (/splash|burst|radius|area/.test(afterArea)) reasons.push('STOCK_DAMAGE_AREA_OR_SPLASH');
    // Ion damage (Core pp. 159-160): the damage TYPE is taken only from what the source states -- the printed damage line
    // ("6d10x2 ion") or the group's structured evidence (damageType: "ion") -- and only as the whole word "ion" ("concussion"
    // is not ion). A weapon NAME can only deny, never type.
    const suffixIon = /(^|[\s,])ion\b/.test(suffix);
    const evidenceType = typeof out.evidence?.damageType === 'string' ? out.evidence.damageType.trim().toLowerCase() : null;
    if (suffixIon) out.damage.type = 'ion';
    if (evidenceType === 'ion') out.damage.type = 'ion';
    if (suffixIon && evidenceType && evidenceType !== 'ion') reasons.push('STOCK_DAMAGE_TYPE_CONFLICT');
    if (evidenceType && evidenceType !== 'ion' && !suffixIon) reasons.push('STOCK_DAMAGE_TYPE_NOT_ORDINARY');
    const rest = afterArea.replace(/(^|[\s,])ion\b/, ' ').replace(/^[\s,]+|[\s,]+$/g, '');
    if (rest && !/splash|burst|radius|area/.test(rest)) reasons.push('STOCK_DAMAGE_QUALIFIED');
    // Core: weapon damage x the listed multiplier. A plain expression (no multiplier) is simply the dice (x1; owner ruling
    // 2026-11-03: an omitted multiplier neither invalidates a vehicle weapon nor makes it a personal weapon); x2, x5, x10...
    // are applied exactly as printed. The multiplier is never guessed.
    if (!Number.isInteger(mult) || mult < 1) reasons.push('STOCK_DAMAGE_MULTIPLIER_UNREADABLE');
  }

  const o = notes.match(OPERATOR);
  const opText = o ? String(o[1] ?? '').trim().toLowerCase() : '';
  const opDetail = o ? String(o[2] ?? '').trim().toLowerCase() : '';
  // A weapon battery is understood only when the source PRINTS it as one ("battery (N gunners)" on a group the record marks
  // as a printed weapon battery). Fire-linked weapons that a statblock loosely calls "batteries" are NOT weapon batteries in
  // game terms (Starships of the Galaxy, Fire-Linked Weapons) and never get battery rules. A printed battery runs in up to two
  // MODES (Core p. 170, owner direction V-P6C-02): FULL-BATTERY needs the printed gunner count AND the printed number of
  // identical weapons (independent quantities, neither inferred from the other); INDEPENDENT-WEAPON (one weapon, no
  // assistance, no margin hits) needs only the printed gunner count, to remove the assistance inside the printed total.
  const gunnerMatch = /(\d+)\s*gunners?/.exec(`${opText} ${opDetail}`);
  const fireLinked = /fire[- ]?linked/i.test(`${group?.label ?? ''} ${notes}`);
  const printedBattery = group?.groupKind === 'weapon-battery' && group?.batteryMembershipStatus === 'printed' && /^battery$/.test(opText) && !!gunnerMatch && !fireLinked;
  if (!o || !opText) reasons.push('STOCK_OPERATOR_NOT_PRINTED');
  else if (printedBattery) {
    const gunners = Number(gunnerMatch[1]);
    const weaponCount = Number.isInteger(out.evidence?.hardwareCount) ? out.evidence.hardwareCount : null;
    const full = establishPublishedBattery({ gunners, weaponCount });
    const independent = establishIndependentBatteryWeapon({ gunners });
    out.operator = 'gunner';
    out.battery = {
      gunners, weaponCount, weaponCountBasis: typeof out.evidence?.hardwareCountBasis === 'string' ? out.evidence.hardwareCountBasis : null,
      fullBattery: full.ok, independentWeapon: independent.ok,
      participatingWeapons: full.ok ? full.participatingWeapons : null, maxExtraHits: full.ok ? full.maxExtraHits : null,
      modeReasons: { 'full-battery': full.ok ? [] : [`STOCK_${full.reason}`], 'independent-weapon': independent.ok ? [] : [`STOCK_${independent.reason}`] }
    };
    if (!independent.ok) reasons.push(`STOCK_${independent.reason}`);          // without the gunner count neither mode can remove/credit the assistance
  }
  else if (/^battery$/.test(opText) || /\d+\s*gunners/.test(`${opText} ${opDetail}`) || /batter/.test(opText)) reasons.push('STOCK_OPERATOR_IS_A_STATION_BATTERY');
  else if (opText === 'pilot' || opText === 'gunner') out.operator = opText;
  else if (opText === 'copilot' || opText === 'co-pilot') out.operator = 'copilot';
  else reasons.push('STOCK_OPERATOR_NOT_A_SINGLE_PILOT_OR_GUNNER');
  if (fireLinked && group?.groupKind === 'weapon-battery') reasons.push('STOCK_FIRE_LINKED_IS_NOT_A_WEAPON_BATTERY');
  if (group?.groupKind === 'weapon-battery' && !printedBattery) reasons.push('STOCK_GROUP_IS_A_WEAPON_BATTERY');
  // Fail-closed denials by wording (a name can only DENY, never authorize): finite-ammunition weapons have no magazine
  // authority yet and torpedoes/missiles/mines/grenades carry splash and payload rules; a name that says "ion" while the
  // source does not type the damage as ion stays refused.
  if (AMMUNITION_LIMITED.test(`${group?.label ?? ''} ${notes}`) || out.evidence?.payloadCount !== undefined) {
    // FINITE AMMUNITION (P6C-3D). A family is complete only when the source prints the payload, the launcher is identified by its exact
    // printed designation (with a certified capacity) and the launcher count is verified as exactly one; then the ledger machinery
    // (vehicle-ammunition-ledger.js) can run it. A family that lacks any of that keeps the umbrella refusal plus the specific reasons.
    const fam = resolveLauncherFamily({ label: group?.label, evidence: out.evidence, battery: out.battery });
    if (fam.status === 'complete') out.ammunition = fam.family;
    else {
      reasons.push('STOCK_AMMUNITION_LIMITED_UNTRACKED', ...fam.reasons);
      if (fam.status === 'allocation-required') out.ammunitionPending = fam.family;
    }
  }
  if (/\bion\b/i.test(String(group?.label ?? '')) && out.damage?.type !== 'ion') reasons.push('STOCK_DAMAGE_ION_UNVERIFIED');   // the name says ion but the source does not type the damage
  if (POSSIBLE_AREA.test(String(group?.label ?? ''))) reasons.push('STOCK_POSSIBLE_AREA_WEAPON_UNVERIFIED');
  // point-defense status is never inferred from a label: such groups stay non-executable until it is classified from source
  // A weapon the statblock PRINTS as "point-defense" is a point-defense weapon: that is the source stating the fact (Starships of the Galaxy: a
  // point-defense weapon takes no penalty against targets smaller than Colossal; Table 10-2 point-defense ranges). Only the printed designation
  // counts -- never the notes, never another word. A designation that is point-defense AND names another weapon type stays unidentified.
  out.pointDefense = /^\s*(?:\d+\s+)?(?:(?:light|medium|heavy|double|twin|quad|triple|dual)\s+)*point[- ]?defen[cs]e\b/i.test(String(group?.label ?? ''));
  if (!out.pointDefense && /point[- ]?defen[cs]e/i.test(String(group?.label ?? '') + notes)) reasons.push('STOCK_POINT_DEFENSE_CLASSIFICATION_UNVERIFIED');

  // WE-2 (V-P6C-12): the Table 10-2 range row is the weapon's TYPE read from its printed designation (exact words of the table's own
  // weapon types). A designation that names none or several is refused: without a range table the attack cannot be resolved. This is a
  // lookup of the type for range only; it never supplies damage, type or any other mechanic.
  out.rangeSlug = out.pointDefense ? 'point-defense' : rangeSlugFromPrintedDesignation(group?.label);
  if (!out.rangeSlug) reasons.push('STOCK_RANGE_TABLE_NOT_IDENTIFIED');

  out.reasons = [...new Set(reasons)];
  return out;
}

/**
 * Firing arc of a published group, by the owner's hierarchy (V-P6C-01):
 *   PUBLISHED        the source states an arc the system understands (group evidence): enforced;
 *   UNSTATED         the source is confirmed silent (group evidence, or the record's reviewed `firingArcs` field state):
 *                    no automated arc restriction;
 *   STATED_UNPARSED  the source states an arc the system cannot interpret (turret, articulated, axial, flank...): refused;
 *   NOT_REVIEWED     no arc evidence at all: refused until the source is reviewed.
 * A stated arc in the group evidence always outranks a record-level "not stated". Only an explicit fixed-forward / forward-
 * firing statement is interpreted; everything else that is stated stays refused rather than guessed.
 */
export function determineStockArc(record, parsedGroup) {
  const stated = parsedGroup?.evidence?.firingArc;
  if (typeof stated === 'string' && stated !== 'SOURCE_SILENT_CONFIRMED') {
    const t = stated.trim().toLowerCase();
    if (/^fixed[- ]forward\b/.test(t) || t === 'forward-firing' || t === 'forward firing') return { state: 'PUBLISHED', value: 'forward', basis: stated };
    return { state: 'STATED_UNPARSED', value: null, basis: stated };
  }
  if (stated === 'SOURCE_SILENT_CONFIRMED') return { state: 'UNSTATED', value: null, basis: 'group evidence' };
  const f = record?.fieldStates ?? {};
  const rec = f['armament.firingArcs'] ?? f['/armament/firingArcs'];     // both pointer styles occur in the canonical records
  if (rec === 'not-stated') return { state: 'UNSTATED', value: null, basis: 'record field state' };
  return { state: 'NOT_REVIEWED', value: null, basis: null };
}

/**
 * What a statblock's printed attack total contains. The printed total of a group is the GENERIC crew's complete attack
 * modifier (range and conditions are applied at attack time on top of it). It is accepted as the stock baseline only when
 * its difference from the Core vehicle formula (crew Base Attack + vehicle Intelligence modifier) is fully explained by a
 * published rule:
 *   delta 0                        crew Base Attack + Intelligence modifier;
 *   delta +2, pilot-operated       plus the trained-Pilot bonus (Core p. 171: +2 on attacks with a pilot-crewed weapon);
 *   delta 2(N-1), printed battery  the assistance of the N-1 assisting gunners of a weapon battery (Core p. 170).
 * Any other difference is UNEXPLAINED and the group is refused rather than "corrected" to match.
 * @returns {{basis: object|null, reason: string|null}}
 */
export function explainPrintedAttackTotal(parsed, bab, intScore) {
  const printed = parsed.attackBonusPrinted;
  if (!finite(printed)) return { basis: null, reason: 'STOCK_ATTACK_TOTAL_NOT_PRINTED' };
  // A PRINTED total is the published generic crew's complete attack modifier (accelerated-completion directive B): when the crew basis is
  // unknown, or the printed number is not BAB + Int (+2 pilot), it is still the verified baseline -- nothing is recomposed, corrected or
  // added to it; its known components are only shown when they reconcile. A battery's assistance arithmetic still has to reconcile.
  if (!parsed.battery && (!finite(bab) || !finite(intScore))) return { basis: { kind: 'PRINTED_TOTAL', printed, delta: null, components: [] }, reason: null };
  if (!finite(bab) || !finite(intScore)) return { basis: null, reason: 'STOCK_CREW_ATTACK_BASIS_UNKNOWN' };
  const base = bab + abilityMod(intScore), delta = printed - base;
  const components = [{ id: 'crew-bab', label: 'Crew Base Attack (published statblock)', value: bab }, { id: 'vehicle-int', label: 'Vehicle Intelligence modifier', value: abilityMod(intScore) }];
  // A printed weapon battery: the generic crew's total already contains the assistance of the printed gunners (Core p. 170:
  // +2 for each assisting gunner). It is accepted only when the difference is EXACTLY that assistance.
  if (parsed.battery?.gunners) {
    const assistance = batteryAssistanceBonus(parsed.battery.gunners);
    if (assistance.ok && delta === assistance.bonus)
      return { basis: { kind: 'BAB_PLUS_INT_PLUS_BATTERY_ASSISTANCE', printed, delta, components: [...components, { id: 'battery-assistance', label: `Weapon battery: ${assistance.assistingGunners} assisting gunner(s) at +2 each (Core p. 170)`, value: assistance.bonus }] }, reason: null };
    return { basis: { kind: 'UNEXPLAINED', printed, delta, components }, reason: 'STOCK_ATTACK_TOTAL_UNEXPLAINED_DELTA' };
  }
  if (delta === 0) return { basis: { kind: 'BAB_PLUS_INT', printed, delta, components }, reason: null };
  if (delta === 2 && parsed.operator === 'pilot')
    return { basis: { kind: 'BAB_PLUS_INT_PLUS_TRAINED_PILOT', printed, delta, components: [...components, { id: 'pilot-trained', label: 'Trained Pilot, pilot-crewed weapon (Core p. 171)', value: 2 }] }, reason: null };
  return { basis: { kind: 'PRINTED_TOTAL', printed, delta, components: [] }, reason: null };
}

/**
 * Size-dependent attack figures printed with a group. The Core capital-ship rule (-20 against targets smaller than Colossal,
 * applied at attack time by the vehicle attack math) is what these statblock figures express: a printed "vs smaller than
 * Colossal" total equals the printed total minus 20. That is accepted as a CONSISTENCY CHECK only when the ship is Colossal
 * (frigate) or larger (so the runtime applies the same -20 once). Any other size-dependent figure, a different value, or a
 * ship the rule does not cover is refused rather than guessed.
 * @returns {string|null} refusal reason
 */
export function checkSizeDependentAdjustments(parsed, record) {
  const keys = Object.keys(parsed.evidence ?? {}).filter(k => SIZE_FIGURE_KEY.test(k) && parsed.evidence[k] !== null && parsed.evidence[k] !== undefined);
  if (!keys.length) return null;
  const capital = ['colossal (frigate)', 'colossal (cruiser)', 'colossal (station)'].includes(String(record?.classification?.printedSize ?? '').trim().toLowerCase());
  for (const k of keys) {
    const v = parsed.evidence[k];
    if (!/smaller|small/i.test(k) || !finite(v) || !finite(parsed.attackBonusPrinted) || v !== parsed.attackBonusPrinted - 20 || !capital) return 'STOCK_SIZE_DEPENDENT_ATTACK_ADJUSTMENT';
  }
  return null;
}

/**
 * Assess every printed group of a verified record.
 * @returns {{groups: object[]}} each group: parse fields + `executable` + final `reasons`
 */
export function assessStockWeaponGroups(record) {
  const bab = record?.combat?.baseAttackBonusPrinted;
  const intScore = record?.abilities?.int;
  return {
    groups: (record?.armament?.firingGroups ?? []).map(g => {
      const p = parseStockFiringGroup(g);
      const common = [...p.reasons];
      const arc = determineStockArc(record, p);
      if (arc.state === 'NOT_REVIEWED') common.push('STOCK_FIRING_ARC_NOT_REVIEWED');
      if (arc.state === 'STATED_UNPARSED') common.push('STOCK_FIRING_ARC_STATED_UNPARSED');
      const sizeReason = checkSizeDependentAdjustments(p, record);
      if (sizeReason) common.push(sizeReason);
      const attack = explainPrintedAttackTotal(p, bab, intScore);

      if (!p.battery) {
        if (attack.reason) common.push(attack.reason);
        const reasons = [...new Set(common)];
        return { ...p, arc, attackBasis: attack.basis, reasons, executable: reasons.length === 0 };
      }

      // A printed battery: two execution modes sharing one group (counted ONCE). The printed total contains the printed
      // gunners' assistance; both modes need that arithmetic to reconcile exactly.
      const total = attack.reason ? [attack.reason] : [];
      const independentBasis = attack.basis?.kind === 'BAB_PLUS_INT_PLUS_BATTERY_ASSISTANCE' ? (() => {
        const removed = attack.basis.components.find(c => c.id === 'battery-assistance').value;
        return { kind: 'BAB_PLUS_INT_BATTERY_ASSISTANCE_REMOVED', printed: attack.basis.printed - removed, publishedPrinted: attack.basis.printed, delta: 0, removedAssistance: removed,
          components: attack.basis.components.filter(c => c.id !== 'battery-assistance') };
      })() : null;
      const base = common.length === 0;
      const modes = {
        'full-battery': { reasons: [...p.battery.modeReasons['full-battery'], ...total], attackBasis: attack.basis },
        'independent-weapon': { reasons: [...p.battery.modeReasons['independent-weapon'], ...total], attackBasis: independentBasis }
      };
      for (const m of Object.values(modes)) m.executable = base && m.reasons.length === 0;
      const executable = modes['full-battery'].executable || modes['independent-weapon'].executable;
      // a refused group lists every reason of both modes (overlapping, never summed); an executable one lists none
      const reasons = executable ? [] : [...new Set([...common, ...modes['full-battery'].reasons, ...modes['independent-weapon'].reasons])];
      return { ...p, arc, attackBasis: attack.basis, modes, reasons, executable };
    })
  };
}
