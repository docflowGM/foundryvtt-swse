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

/** executable and usable / executable but blocked by economy or another authority / not executable from the sheet */
function availabilityOf(item) {
  if (item.executable === false) return 'reference';
  return item.canUseNow === false ? 'unavailable' : 'available';
}

export function buildCombatActionLibrary(actionGroups = [], { defaultCategory = 'standard' } = {}) {
  const items = [];
  const seen = new Set();
  for (const group of asArray(actionGroups)) {
    for (const raw of asArray(group?.items)) {
      const lane = raw.laneKey || group.key || 'free';
      // the same row object is never listed twice (groups carry items and subgroup views of the same rows)
      const token = `${raw.key}|${lane}|${raw.itemId ?? ''}|${raw.sourceActionId ?? ''}|${raw.sourceName ?? ''}|${raw.cost ?? ''}`;
      if (seen.has(token)) continue; seen.add(token);
      const availability = availabilityOf(raw);
      const reason = raw.unavailableReason || raw.restrictionReason || '';
      items.push({
        key: raw.key, name: raw.name, laneKey: lane, laneLabel: LANE_LABEL[lane] ?? group.label ?? lane,
        costLabel: raw.cost !== '' && raw.cost !== undefined && raw.cost !== null ? String(raw.cost) : '',
        sourceName: raw.sourceName || '', alsoFrom: asArray(raw.alsoFrom), itemId: raw.itemId || '',
        description: raw.description || '', useLabel: raw.useLabel || 'Use',
        executable: raw.executable !== false, canUseNow: raw.canUseNow !== false && raw.executable !== false,
        availability, availabilityLabel: availability === 'reference' ? 'Reference' : (availability === 'unavailable' ? (raw.availabilityLabel || 'Unavailable') : 'Usable'),
        reason: availability === 'available' ? '' : (reason || (availability === 'reference' ? 'This action cannot be used from the sheet.' : 'Unavailable')),
        identityConflict: raw.identityConflict === true, identityConflictReason: raw.identityConflictReason || '',
        gmManaged: raw.gmManaged === true,
        searchText: `${raw.name ?? ''} ${raw.sourceName ?? ''} ${raw.description ?? ''} ${(raw.alsoFrom ?? []).join(' ')}`.toLowerCase().replace(/\s+/g, ' ').trim(),
        visible: defaultCategory === 'all' || lane === defaultCategory
      });
    }
  }
  items.sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.laneKey).localeCompare(String(b.laneKey)));
  const counts = Object.fromEntries(LIBRARY_CATEGORIES.map((c) => [c.key, c.key === 'all' ? items.length : items.filter((i) => i.laneKey === c.key).length]));
  const categories = LIBRARY_CATEGORIES.map((c) => ({ ...c, count: counts[c.key], active: c.key === defaultCategory }));
  return {
    items, total: items.length, hasItems: items.length > 0, categories, defaultCategory,
    visibleCount: items.filter((i) => i.visible).length,
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

export default { buildCombatActionLibrary, orderEconomySteps, LIBRARY_CATEGORIES };
