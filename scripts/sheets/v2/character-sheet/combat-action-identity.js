/**
 * Combat action identity -- removes GENUINE duplicates from the combat action rows a sheet shows, and never anything else.
 *
 * Why this exists: `registerAction` (character-like-sheet.js) is the one choke point that four registries feed (the combat-actions compendium, actor
 * species abilities, feat / talent action cards, combined-feat cards). It pushes every row unconditionally, so the same action arriving from two
 * registries was rendered twice, while `combatActionLookup[key]` silently kept only the last one. This module is the pure rule for what counts as
 * the same action. It owns no combat rule, spends nothing and executes nothing.
 *
 * Identity of a row  =  canonical key + action lane (the economy type) + source item id + source action id.
 * Names are NEVER an identity: two rows with the same display name but different keys, items or lanes are different actions.
 *
 *   same identity, same mechanical contract  -> a duplicate: the first is kept, the other's source is recorded on it (`alsoFrom`)
 *   same identity, DIFFERENT contract        -> a CONFLICT: both stay visible, both are flagged `identityConflict`, and the conflict is reported.
 *                                               Nothing chooses a winner silently.
 *   same key, different identity             -> distinct variants (a different lane / cost, or a different source item). Both stay. They are
 *                                               reported as `sharedKeys` because the key-addressed use handler resolves ONE of them.
 *
 * The mechanical contract is cost, executable, spendAction, resolution mode and the related-skill set: the fields that change what using the action does.
 */
const norm = (v) => String(v ?? '').trim();
const lower = (v) => norm(v).toLowerCase();
const laneOf = (row) => lower(row?.laneKey ?? row?.actionType ?? row?.type ?? '');
const identityOf = (row) => [norm(row?.key ?? row?.id), laneOf(row), norm(row?.itemId), norm(row?.sourceActionId)].join('|');

export function contractOf(row = {}) {
  const skills = Array.isArray(row.relatedSkills) ? row.relatedSkills : (row.relatedSkills ? [row.relatedSkills] : []);
  return JSON.stringify({
    cost: norm(row.cost ?? ''), actionCost: row.actionCost ?? null,
    executable: row.executable !== false, spendAction: row.spendAction !== false,
    resolutionMode: lower(row.resolutionMode ?? (row.manualResolution ? 'manual' : 'auto')),
    requiresSelectedChoice: row.requiresSelectedChoice === true,
    skills: skills.map((s) => lower(typeof s === 'object' ? (s.key ?? s.id ?? s.name) : s)).sort()
  });
}

/**
 * @param {Array<object>} rows  action rows in registration / display order
 * @returns {{rows:object[], removed:object[], conflicts:object[], sharedKeys:object[]}}
 */
export function dedupeCombatActionRows(rows = []) {
  const kept = [];
  const byKey = new Map();
  const removed = [], conflicts = [], sharedKeys = [];
  const sharedSeen = new Set();
  for (const input of Array.isArray(rows) ? rows : []) {
    if (!input || typeof input !== 'object') continue;
    const key = norm(input.key ?? input.id);
    // a row with no key at all has no canonical identity: it is never merged
    if (!key) { kept.push(input); continue; }
    const group = byKey.get(key) ?? [];
    const identity = identityOf(input);
    const twin = group.find((e) => identityOf(e.row) === identity);
    if (twin) {
      if (contractOf(twin.row) === contractOf(input)) {
        const from = norm(input.sourceName);
        const first = norm(twin.row.sourceName);
        if (from && from !== first) twin.row.alsoFrom = [...new Set([...(twin.row.alsoFrom ?? []), from])];
        removed.push({ key, lane: laneOf(input), keptSource: first, droppedSource: from });
        continue;
      }
      // contradictory mechanics under one identity: keep BOTH, flag BOTH, report
      const reason = 'same identity with contradictory mechanical contracts';
      for (const r of [twin.row, input]) { r.identityConflict = true; r.identityConflictReason = reason; }
      conflicts.push({ key, lane: laneOf(input), reason, sources: [norm(twin.row.sourceName), norm(input.sourceName)], contracts: [JSON.parse(contractOf(twin.row)), JSON.parse(contractOf(input))] });
    } else if (group.length && !sharedSeen.has(key)) {
      sharedSeen.add(key);
      sharedKeys.push({ key, lanes: [...new Set([...group.map((e) => laneOf(e.row)), laneOf(input)])], sources: [...group.map((e) => norm(e.row.sourceName)), norm(input.sourceName)] });
    }
    group.push({ row: input });
    byKey.set(key, group);
    kept.push(input);
  }
  return { rows: kept, removed, conflicts, sharedKeys };
}

export default { dedupeCombatActionRows, contractOf };
