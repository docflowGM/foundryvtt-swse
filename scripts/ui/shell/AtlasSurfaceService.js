/** Player-facing Atlas surface view model. */

import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { HolonetIntelService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function titleCase(value = '') {
  return text(value).split(/[-_\s]+/g).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(entry => text(entry)).filter(Boolean);
  return String(value ?? '').split(/,|\n/g).map(entry => text(entry)).filter(Boolean);
}

function option(value, label, selected = '') {
  return { value, label: label || titleCase(value), selected: String(value) === String(selected || '') };
}

function optionsFrom(list = [], selected = '', { includeAll = false, allLabel = 'All' } = {}) {
  const rows = list.map(entry => option(entry.value, entry.label, selected));
  return includeAll ? [{ value: '', label: allLabel, selected: !selected }, ...rows] : rows;
}

function findFaction(factions = [], factionId = '') {
  const id = text(factionId).toLowerCase();
  if (!id) return null;
  return factions.find(faction => text(faction.id).toLowerCase() === id || text(faction.name).toLowerCase() === id) || null;
}

function contactRowsForLocation(location = {}, factions = []) {
  const ids = new Set(asArray(location.contactIds));
  if (!ids.size) return [];
  return factions.flatMap(faction => asArray(faction.contacts).map(contact => ({
    id: contact.id,
    name: contact.name,
    role: contact.role || contact.title || 'Contact',
    publicNotes: contact.publicNotes || contact.description || '',
    knownToPlayers: Boolean(contact.knownToPlayers || ['known', 'compromised'].includes(contact.revealState)),
    revealState: contact.revealState || 'hidden',
    disposition: contact.disposition || 'unknown',
    factionId: faction.id,
    factionName: faction.name
  }))).filter(contact => ids.has(contact.id) && contact.knownToPlayers);
}

function locationChain(location = {}, byId = new Map()) {
  const rows = [];
  let current = location;
  const seen = new Set();
  while (current?.id && !seen.has(current.id)) {
    seen.add(current.id);
    rows.unshift(current.name);
    current = current.parentLocationId ? byId.get(current.parentLocationId) : null;
  }
  return rows.filter(Boolean).join(' → ');
}

function depthFor(location = {}, byId = new Map()) {
  let depth = 0;
  let current = location.parentLocationId ? byId.get(location.parentLocationId) : null;
  const seen = new Set([location.id]);
  while (current?.id && !seen.has(current.id)) {
    depth += 1;
    seen.add(current.id);
    current = current.parentLocationId ? byId.get(current.parentLocationId) : null;
  }
  return depth;
}

function revealedFactsFor(location = {}, actorState = {}) {
  const actorRevealed = new Set(splitList(actorState.revealedFacts?.[location.id]));
  return asArray(location.atlasFacts).filter(fact => fact.knownToPlayers || ['known', 'active', 'compromised'].includes(fact.revealState) || actorRevealed.has(fact.id));
}

function lockedFactsFor(location = {}, actorState = {}) {
  const actorRevealed = new Set(splitList(actorState.revealedFacts?.[location.id]));
  return asArray(location.atlasFacts).filter(fact => !fact.knownToPlayers && !['known', 'active', 'compromised'].includes(fact.revealState) && !actorRevealed.has(fact.id));
}

function atlasStateFor(location = {}, actorState = {}) {
  if (location.activeForParty || actorState.activeLocationId === location.id) {
    return { key: 'active', label: 'Active', dotClass: 'is-active', toneClass: 'is-active' };
  }
  const revealState = text(location.revealState || (location.knownToPlayers ? 'known' : 'hinted')).toLowerCase();
  if (revealState === 'compromised') {
    return { key: 'compromised', label: 'Compromised', dotClass: 'is-compromised', toneClass: 'is-compromised' };
  }
  if (revealState === 'hinted') {
    return { key: 'hinted', label: 'Hinted', dotClass: 'is-hinted', toneClass: 'is-hinted' };
  }
  return { key: 'known', label: 'Known', dotClass: 'is-known', toneClass: 'is-known' };
}

function cardFromLocation(location = {}, records = [], factions = [], actorState = {}) {
  const byId = new Map(records.map(entry => [entry.id, entry]));
  const factionIds = Array.from(new Set([location.controllingFactionId, ...asArray(location.factionIds)].filter(Boolean)));
  const factionNames = factionIds.map(id => findFaction(factions, id)?.name || id).filter(Boolean);
  const knownFacts = revealedFactsFor(location, actorState);
  const lockedFacts = lockedFactsFor(location, actorState);
  const pins = new Set(actorState.pins || []);
  const reviewed = new Set(actorState.reviewed || []);
  const state = atlasStateFor(location, actorState);
  return {
    id: location.id,
    name: location.name,
    category: location.category,
    categoryLabel: LocationRegistryService.optionLabel(LocationRegistryService.CATEGORIES, location.category),
    type: location.type,
    typeLabel: LocationRegistryService.optionLabel(LocationRegistryService.TYPES, location.type),
    revealState: location.revealState,
    revealStateLabel: state.label,
    stateClass: state.toneClass,
    dotClass: state.dotClass,
    activeForParty: location.activeForParty,
    chain: locationChain(location, byId),
    depth: depthFor(location, byId),
    depthClass: `depth-${Math.min(5, depthFor(location, byId))}`,
    factionNames: factionNames.join(', '),
    factionCount: factionIds.length,
    contactCount: asArray(location.contactIds).length,
    intelCount: asArray(location.linkedIntelIds).length,
    jobCount: asArray(location.linkedJobIds).length,
    factCount: knownFacts.length,
    leadCount: lockedFacts.length,
    hasMap: Boolean(location.map?.imagePath || location.image),
    pinned: pins.has(location.id),
    reviewed: reviewed.has(location.id),
    playerNotes: actorState.playerNotes?.[location.id] || '',
    publicSummary: location.publicSummary || 'No public Atlas summary has been revealed yet.',
    searchText: [location.name, location.category, location.type, location.publicSummary, factionNames.join(' '), asArray(location.tags).join(' ')].join(' ').toLowerCase()
  };
}

function groupCards(cards = [], actorState = {}) {
  const current = cards.filter(card => card.activeForParty || actorState.activeLocationId === card.id);
  const currentIds = new Set(current.map(card => card.id));
  const pinned = cards.filter(card => card.pinned && !currentIds.has(card.id));
  const pinnedIds = new Set(pinned.map(card => card.id));
  const recent = cards.filter(card => !card.reviewed && !currentIds.has(card.id) && !pinnedIds.has(card.id));
  const recentIds = new Set(recent.map(card => card.id));
  const leadCards = cards.filter(card => card.leadCount > 0 && !currentIds.has(card.id) && !pinnedIds.has(card.id) && !recentIds.has(card.id));
  return [
    { id: 'current', label: 'Current', eyebrow: 'Active Site', emptyLabel: 'No active party location', cards: current },
    { id: 'pinned', label: 'Pinned', eyebrow: 'Saved Sites', emptyLabel: 'No pinned locations', cards: pinned },
    { id: 'recent', label: 'Recent', eyebrow: 'Unreviewed', emptyLabel: 'No recent updates', cards: recent },
    { id: 'leads', label: 'Research', eyebrow: 'Open Leads', emptyLabel: 'No open research leads', cards: leadCards },
    { id: 'all', label: 'All Known', eyebrow: 'Registry', emptyLabel: 'No revealed locations', cards }
  ].map(group => ({ ...group, count: group.cards.length })).filter(group => group.id === 'all' || group.cards.length > 0);
}

async function linkedIntelRows(location = {}) {
  const rows = [];
  for (const id of asArray(location.linkedIntelIds)) {
    const record = await HolonetIntelService.getIntelById(id).catch(() => null);
    const intel = record ? HolonetIntelService.getIntelMetadata(record) : null;
    rows.push({ id, title: intel?.title || id, summary: intel?.summary || intel?.publicBody || '' });
  }
  return rows;
}

export class AtlasSurfaceService {
  static async buildViewModel(actor, options = {}) {
    const requested = text(options.selectedLocationId || options.locationId || '');
    const filters = {
      search: text(options.search),
      category: text(options.category),
      special: text(options.special)
    };
    const actorState = LocationRegistryService.getActorAtlasState(actor);
    const allVisible = LocationRegistryService.visibleLocationsForActor(actor, { includeArchived: filters.special === 'archived' });
    const registrySummary = FactionRegistryService.summarizeForWorkspace();
    const factions = registrySummary.factions || [];
    const cards = allVisible.map(location => cardFromLocation(location, allVisible, factions, actorState));
    const visibleCards = cards.filter((card) => {
      if (filters.category && card.category !== filters.category) return false;
      if (filters.special === 'current' && !card.activeForParty && actorState.activeLocationId !== card.id) return false;
      if (filters.special === 'pinned' && !card.pinned) return false;
      if (filters.special === 'leads' && !card.leadCount) return false;
      if (filters.special === 'jobs' && !card.jobCount) return false;
      if (filters.special === 'intel' && !card.intelCount) return false;
      const q = filters.search.toLowerCase();
      if (q && !card.searchText.includes(q)) return false;
      return true;
    });
    const currentLocationCard = cards.find(card => card.activeForParty || actorState.activeLocationId === card.id) || null;
    const cardGroups = groupCards(visibleCards, actorState);
    const selectedLocationId = requested || visibleCards.find(card => card.activeForParty)?.id || visibleCards[0]?.id || '';
    const selectedLocation = selectedLocationId ? allVisible.find(location => location.id === selectedLocationId) || LocationRegistryService.findLocation(selectedLocationId) : null;
    const selectedCard = selectedLocation ? cardFromLocation(selectedLocation, allVisible, factions, actorState) : null;
    const knownFacts = selectedLocation ? revealedFactsFor(selectedLocation, actorState).map(fact => ({
      ...fact,
      categoryLabel: LocationRegistryService.optionLabel(LocationRegistryService.FACT_CATEGORIES, fact.category),
      revealModeLabel: LocationRegistryService.optionLabel(LocationRegistryService.FACT_REVEAL_MODES, fact.revealMode || 'any'),
      checkLabel: asArray(fact.checks).map(check => `${LocationRegistryService.optionLabel(LocationRegistryService.ATLAS_SKILLS, check.skill)} DC ${check.dc}${check.label ? ` — ${check.label}` : ''}`).join(' / ')
    })) : [];
    const lockedFacts = selectedLocation ? lockedFactsFor(selectedLocation, actorState).map(fact => ({
      id: fact.id,
      title: fact.title,
      teaser: fact.teaser,
      categoryLabel: LocationRegistryService.optionLabel(LocationRegistryService.FACT_CATEGORIES, fact.category),
      revealModeLabel: LocationRegistryService.optionLabel(LocationRegistryService.FACT_REVEAL_MODES, fact.revealMode || 'any'),
      checks: asArray(fact.checks).map(check => ({
        ...check,
        skillLabel: LocationRegistryService.optionLabel(LocationRegistryService.ATLAS_SKILLS, check.skill),
        buttonLabel: `${LocationRegistryService.optionLabel(LocationRegistryService.ATLAS_SKILLS, check.skill)} DC ${check.dc}${check.label ? ` — ${check.label}` : ''}`
      }))
    })) : [];
    const factionRows = selectedLocation ? Array.from(new Set([selectedLocation.controllingFactionId, ...selectedLocation.factionIds].filter(Boolean))).map(id => findFaction(factions, id)).filter(Boolean) : [];
    const contactRows = selectedLocation ? contactRowsForLocation(selectedLocation, factions) : [];
    const intelRows = selectedLocation ? await linkedIntelRows(selectedLocation) : [];

    const counts = {
      total: cards.length,
      current: cards.filter(card => card.activeForParty || actorState.activeLocationId === card.id).length,
      pinned: cards.filter(card => card.pinned).length,
      leads: cards.reduce((sum, card) => sum + card.leadCount, 0),
      facts: cards.reduce((sum, card) => sum + card.factCount, 0),
      jobs: cards.reduce((sum, card) => sum + card.jobCount, 0),
      intel: cards.reduce((sum, card) => sum + card.intelCount, 0)
    };

    return {
      id: 'atlas',
      title: 'Atlas',
      subtitle: 'Known locations, local facts, unresolved leads, maps, and campaign geography.',
      actorName: actor?.name || 'Unknown Actor',
      filters,
      counts,
      cards: visibleCards,
      cardGroups,
      hasLocations: cards.length > 0,
      hasVisibleLocations: visibleCards.length > 0,
      selectedLocationId,
      currentLocation: currentLocationCard,
      hasCurrentLocation: Boolean(currentLocationCard),
      selected: selectedLocation ? {
        ...selectedCard,
        raw: selectedLocation,
        knownFacts,
        lockedFacts,
        factionRows,
        contactRows,
        intelRows,
        jobRows: asArray(selectedLocation.linkedJobIds).map(id => ({ id })),
        mapImage: selectedLocation.map?.imagePath || selectedLocation.image || '',
        journalUuid: selectedLocation.linkedJournalUuid || '',
        sceneAvailable: Boolean(selectedLocation.map?.sceneUuid || selectedLocation.linkedSceneUuids?.length),
        factionCount: factionRows.length,
        contactCount: contactRows.length,
        detailTabs: [
          { id: 'overview', label: 'Overview', count: 1 },
          { id: 'facts', label: 'Facts', count: knownFacts.length },
          { id: 'factions', label: 'Factions', count: factionRows.length },
          { id: 'contacts', label: 'Contacts', count: contactRows.length },
          { id: 'jobs', label: 'Jobs', count: asArray(selectedLocation.linkedJobIds).length },
          { id: 'map', label: 'Map', count: selectedLocation.map?.imagePath || selectedLocation.image ? 1 : 0 },
          { id: 'notes', label: 'My Notes', count: selectedCard?.playerNotes ? 1 : 0 }
        ]
      } : null,
      categoryOptions: optionsFrom(LocationRegistryService.CATEGORIES, filters.category, { includeAll: true, allLabel: 'All categories' }),
      specialOptions: [
        { value: '', label: 'All Known', selected: !filters.special },
        { value: 'current', label: 'Current', selected: filters.special === 'current' },
        { value: 'pinned', label: 'Pinned', selected: filters.special === 'pinned' },
        { value: 'leads', label: 'Unresolved Leads', selected: filters.special === 'leads' },
        { value: 'jobs', label: 'Has Jobs', selected: filters.special === 'jobs' },
        { value: 'intel', label: 'Has Intel', selected: filters.special === 'intel' }
      ]
    };
  }

  static async buildSummary(actor) {
    const vm = await this.buildViewModel(actor);
    return {
      total: vm.counts.total,
      current: vm.counts.current,
      leads: vm.counts.leads,
      pinned: vm.counts.pinned,
      badge: vm.counts.leads > 0 ? String(vm.counts.leads) : (vm.counts.total > 0 ? String(vm.counts.total) : null)
    };
  }
}
