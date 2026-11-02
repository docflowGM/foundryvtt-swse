/**
 * Published (factory) weapon groups of a source-backed vehicle: strict, fail-closed interpretation of the canonical
 * record's printed firing groups (record.armament.firingGroups, digest-verified with the rest of the record).
 *
 * The canonical records carry each printed attack group as a label, a printed attack total, and free-text notes whose
 * wording varies by source. This module reads ONLY the facts it can take unambiguously from those notes (damage dice and
 * multiplier, one pilot/gunner operator) and refuses everything else with a named reason. It never infers a weapon
 * family or mechanics from a label.
 *
 * A group is EXECUTABLE as a plain stock weapon only when all of these hold:
 *   - the notes state damage as plain dice with a x2 multiplier (no splash/burst, ion, special, capital x5 or other);
 *   - exactly one operator is printed and it is the pilot or a single gunner;
 *   - the group is not a multi-gunner station battery, and states no size-dependent attack adjustments;
 *   - the printed attack total reconciles with the printed crew Base Attack + the vehicle's Intelligence modifier
 *     (the Core vehicle attack formula), so applying the formula cannot contradict the statblock.
 * The arc is never published: it is reported as `arcEvidence` (source silent) and handled by the arc policy.
 * Pure; no Foundry globals.
 */
const abilityMod = s => Math.floor((s - 10) / 2);
const finite = v => typeof v === 'number' && Number.isFinite(v);

const DAMAGE = /(?:printed damage|published damage|damage)\s*:?\s*(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\s*(?:x\s*(\d+))?([^;.]*)/i;
const OPERATOR = /(?:printed operator|operator|station)\s*:?\s*([^;.(]*?)\s*(?:\(([^)]*)\))?\s*(?:;|\.|\s+(?:printed|source|damage|physical)\b|$)/i;
const EVIDENCE = /\{[^{}]*\}/;

/** Parse one printed group. Never throws; `reasons` names everything that makes it non-executable. */
export function parseStockFiringGroup(group) {
  const notes = String(group?.specialNotes ?? '');
  const reasons = [];
  const out = { groupKey: group?.groupKey ?? null, label: group?.label ?? null, attackBonusPrinted: finite(group?.attackBonusPrinted) ? group.attackBonusPrinted : null,
    damage: null, operator: null, evidence: {}, reasons };

  const d = notes.match(DAMAGE);
  if (!d) reasons.push('STOCK_DAMAGE_NOT_PRINTED_IN_RECORD');
  else {
    const dice = Number(d[1]), die = Number(d[2]), mult = d[5] ? Number(d[5]) : 1;
    const suffix = String(d[6] ?? '').trim().toLowerCase();
    out.damage = { dice, die, bonus: d[3] ? Number(`${d[3]}${d[4]}`) : 0, multiplier: mult, formula: `${dice}d${die}`, raw: `${d[1]}d${d[2]}${d[5] ? `x${d[5]}` : ''}`, suffix };
    if (d[3]) reasons.push('STOCK_DAMAGE_HAS_FLAT_TERM');
    if (/splash|burst|radius|area/.test(suffix)) reasons.push('STOCK_DAMAGE_AREA_OR_SPLASH');
    if (/ion/.test(suffix)) reasons.push('STOCK_DAMAGE_ION_UNVERIFIED');
    if (suffix && !/splash|burst|radius|area|ion/.test(suffix.replace(/^,\s*/, '')) && suffix.replace(/[\s,]/g, '') !== '') reasons.push('STOCK_DAMAGE_QUALIFIED');
    if (mult !== 2) reasons.push(mult === 1 ? 'STOCK_DAMAGE_NO_MULTIPLIER' : 'STOCK_DAMAGE_CAPITAL_OR_OTHER_MULTIPLIER');
  }

  const o = notes.match(OPERATOR);
  const opText = o ? String(o[1] ?? '').trim().toLowerCase() : '';
  const opDetail = o ? String(o[2] ?? '').trim().toLowerCase() : '';
  if (!o || !opText) reasons.push('STOCK_OPERATOR_NOT_PRINTED');
  else if (/^battery$/.test(opText) || /\d+\s*gunners/.test(`${opText} ${opDetail}`) || /batter/.test(opText)) reasons.push('STOCK_OPERATOR_IS_A_STATION_BATTERY');
  else if (opText === 'pilot' || opText === 'gunner') out.operator = opText;
  else reasons.push('STOCK_OPERATOR_NOT_A_SINGLE_PILOT_OR_GUNNER');
  if (group?.groupKind === 'weapon-battery') reasons.push('STOCK_GROUP_IS_A_WEAPON_BATTERY');
  // point-defense status is never inferred from a label: such groups stay non-executable until it is classified from source
  if (/point[- ]?defen[cs]e/i.test(String(group?.label ?? '') + notes)) reasons.push('STOCK_POINT_DEFENSE_CLASSIFICATION_UNVERIFIED');

  const e = notes.match(EVIDENCE);
  if (e) { try { out.evidence = JSON.parse(e[0]); } catch { reasons.push('STOCK_EVIDENCE_UNREADABLE'); } }
  for (const k of Object.keys(out.evidence)) if (/smaller|vs|against/i.test(k)) { reasons.push('STOCK_SIZE_DEPENDENT_ATTACK_ADJUSTMENT'); break; }
  out.arcStated = out.evidence.firingArc ? out.evidence.firingArc !== 'SOURCE_SILENT_CONFIRMED' : false;
  if (out.arcStated) reasons.push('STOCK_FIRING_ARC_STATED_UNPARSED');
  out.reasons = [...new Set(reasons)];
  return out;
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
      const reasons = [...p.reasons];
      // The arc is never published; the attack preflight can only reason about it when the source CONFIRMS that it is
      // silent (group evidence or the record's field state). An arc that was never reviewed stays non-executable.
      const arcSilent = p.evidence?.firingArc === 'SOURCE_SILENT_CONFIRMED' || record?.fieldStates?.['armament.firingArcs'] === 'not-stated';
      if (!arcSilent) reasons.push('STOCK_FIRING_ARC_NOT_REVIEWED');
      if (!finite(p.attackBonusPrinted)) reasons.push('STOCK_ATTACK_TOTAL_NOT_PRINTED');
      else if (!finite(bab) || !finite(intScore)) reasons.push('STOCK_CREW_ATTACK_BASIS_UNKNOWN');
      else if (p.attackBonusPrinted !== bab + abilityMod(intScore)) reasons.push('STOCK_ATTACK_TOTAL_DOES_NOT_RECONCILE_WITH_BAB_PLUS_INT');
      return { ...p, reasons: [...new Set(reasons)], executable: reasons.length === 0 };
    })
  };
}
