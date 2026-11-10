/**
 * Combat Action Library view model -- PRESENTATION ONLY.
 *
 * ONE flat list of the action rows the sheet already assembled (buildActionGroups: de-duplicated, with the economy availability the action-economy
 * authority resolved). Each action appears exactly once, tagged with its lane; the category tabs (Standard | Move | Swift | Full-round | Reaction |
 * Free | All) only decide which rows are visible in the browser, they never produce a second list. Nothing here spends an action, executes anything or
 * changes availability: an action that is a reference, or unavailable, stays so, and the reason is the authority's own text.
 */
const asArray = (v) => (Array.isArray(v) ? v : []);

export const LIBRARY_CATEGORIES = Object.freeze([
  { key: 'standard', label: 'Standard' },
  { key: 'move', label: 'Move' },
  { key: 'swift', label: 'Swift' },
  { key: 'full-round', label: 'Full-round' },
  { key: 'reaction', label: 'Reaction' },
  { key: 'free', label: 'Free' },
  { key: 'all', label: 'All' }
]);
const LANE_LABEL = Object.fromEntries(LIBRARY_CATEGORIES.filter((c) => c.key !== 'all').map((c) => [c.key, c.label]));
const SORT_KEYS = Object.freeze([{ key: 'name', label: 'Name' }, { key: 'source', label: 'Source' }, { key: 'cost', label: 'Cost' }, { key: 'availability', label: 'Availability' }]);
const AVAILABILITY_FILTERS = Object.freeze([{ key: 'all', label: 'All' }, { key: 'available', label: 'Usable now' }, { key: 'unavailable', label: 'Unavailable' }, { key: 'reference', label: 'Reference only' }]);
export const LIBRARY_SCOPES = Object.freeze([{ key: 'mine', label: 'My Actions' }, { key: 'reference', label: 'All Rules' }]);

/**
 * Eligibility (earned) is the sheet's own result (combat-action-eligibility.js); this module only presents it.
 *   unlocked    -> My Actions            (usable now / temporarily unavailable with the authority's reason / reference-only when not executable)
 *   unresolved  -> My Actions, disabled  (eligibility evidence is missing: shown with the reason, never executable)
 *   locked      -> All Rules only        (prerequisites shown, no executable control)
 * A row with no eligibility result fails closed as unresolved.
 */
const UNRESOLVED_FALLBACK = Object.freeze({ state: 'unresolved', entitlement: [], basis: [], missing: [], unresolved: ['no eligibility result'], reason: 'Eligibility is not established for this action.', execution: { allowed: false, reason: 'Eligibility is not established for this action.' } });

function availabilityOf(item, elig) {
  if (elig.state === 'locked') return 'locked';
  if (item.executable === false) return 'reference';
  if (elig.state === 'unresolved' || elig.execution?.allowed === false) return 'unavailable';
  return item.canUseNow === false ? 'unavailable' : 'available';
}

export function buildCombatActionLibrary(actionGroups = [], { defaultCategory = 'standard' } = {}) {
  const items = [];
  const seen = new Set();
  for (const group of asArray(actionGroups)) {
    for (const raw of asArray(group?.items)) {
      const lane = raw.laneKey || group.key || 'free';
      // passive riders are not executable actions: they belong to the Combat Features passive-rider surface, never to this list
      if (lane === 'passive' || String(raw.actionType ?? '').toLowerCase() === 'passive') continue;
      // the same row object is never listed twice (groups carry items and subgroup views of the same rows)
      const token = `${raw.key}|${lane}|${raw.itemId ?? ''}|${raw.sourceActionId ?? ''}|${raw.sourceName ?? ''}|${raw.cost ?? ''}`;
      if (seen.has(token)) continue; seen.add(token);
      const elig = raw.eligibility ?? UNRESOLVED_FALLBACK;
      const availability = availabilityOf(raw, elig);
      const scope = elig.state === 'locked' ? 'reference' : 'mine';
      const reason = elig.state === 'unlocked' && elig.execution?.allowed !== false ? (raw.unavailableReason || raw.restrictionReason || '') : (elig.execution?.reason || elig.reason || raw.unavailableReason || '');
      const canUse = scope === 'mine' && availability === 'available';
      items.push({
        key: raw.key, name: raw.name, laneKey: lane, laneLabel: LANE_LABEL[lane] ?? group.label ?? lane,
        costLabel: raw.cost !== '' && raw.cost !== undefined && raw.cost !== null ? String(raw.cost) : '',
        sourceName: raw.sourceName || '', alsoFrom: asArray(raw.alsoFrom), itemId: raw.itemId || '',
        description: raw.description || '', useLabel: raw.useLabel || 'Use',
        executable: raw.executable !== false, canUseNow: raw.canUseNow !== false && raw.executable !== false,
        availability, scope, canUse, showUse: scope === 'mine' && raw.executable !== false, eligibilityState: elig.state,
        entitlement: asArray(elig.entitlement), prerequisites: asArray(elig.missing), unresolvedEvidence: asArray(elig.unresolved),
        availabilityLabel: availability === 'locked' ? 'Locked' : availability === 'reference' ? 'Reference' : (availability === 'unavailable' ? (elig.state === 'unresolved' ? 'Unresolved' : (raw.availabilityLabel || 'Unavailable')) : 'Usable'),
        reason: availability === 'available' ? '' : (reason || (availability === 'reference' ? 'This action cannot be used from the sheet.' : 'Unavailable')),
        identityConflict: raw.identityConflict === true, identityConflictReason: raw.identityConflictReason || '',
        gmManaged: raw.gmManaged === true,
        searchText: `${raw.name ?? ''} ${raw.sourceName ?? ''} ${raw.description ?? ''} ${(raw.alsoFrom ?? []).join(' ')}`.toLowerCase().replace(/\s+/g, ' ').trim(),
        visible: scope === 'mine' && (defaultCategory === 'all' || lane === defaultCategory)
      });
    }
  }
  items.sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.laneKey).localeCompare(String(b.laneKey)));
  const mineItems = items.filter((i) => i.scope === 'mine');
  const counts = Object.fromEntries(LIBRARY_CATEGORIES.map((c) => [c.key, c.key === 'all' ? mineItems.length : mineItems.filter((i) => i.laneKey === c.key).length]));
  const categories = LIBRARY_CATEGORIES.map((c) => ({ ...c, count: counts[c.key], active: c.key === defaultCategory }));
  const usable = mineItems.filter((i) => i.canUse).length;
  return {
    items, total: mineItems.length, hasItems: items.length > 0, categories, defaultCategory,
    defaultScope: 'mine', scopes: LIBRARY_SCOPES,
    visibleCount: items.filter((i) => i.visible).length,
    counts: { mine: { total: mineItems.length, available: usable, unavailable: mineItems.length - usable }, reference: items.filter((i) => i.scope === 'reference').length },
    unresolvedCount: items.filter((i) => i.eligibilityState === 'unresolved').length,
    sorts: SORT_KEYS, availabilityFilters: AVAILABILITY_FILTERS,
    conflictCount: items.filter((i) => i.identityConflict).length
  };
}

/** The action-economy authority's own steps, shown in the order the strip reads (Standard, Move, Swift, Full-round, Reaction, Free). Unknown steps keep their place after the known ones. */
const STRIP_ORDER = ['standard', 'move', 'swift', 'full-round', 'reaction', 'free'];
export function orderEconomySteps(steps = []) {
  const key = (s) => String(s?.key ?? s?.label ?? '').toLowerCase().replace(/[^a-z-]+/g, '-').replace(/^-+|-+$/g, '');
  const rank = (s) => { const i = STRIP_ORDER.indexOf(key(s)); return i === -1 ? STRIP_ORDER.length : i; };
  return asArray(steps).map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map((x) => x.s);
}

export default { buildCombatActionLibrary, orderEconomySteps, LIBRARY_CATEGORIES, LIBRARY_SCOPES };
