/**
 * LocationJobBridgeService
 *
 * Thin draft adapter from Location/Atlas facts into the existing Job Board. It
 * does not publish jobs; the GM Datapad job board remains the job authority.
 */

import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function number(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function findFactionName(factionId = '') {
  const faction = factionId ? FactionRegistryService.findFaction(factionId) : null;
  return faction?.name || '';
}

function locationChain(location = null) {
  const rows = [];
  let current = location;
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    rows.unshift(current.name);
    current = current.parentLocationId ? LocationRegistryService.findLocation(current.parentLocationId) : null;
  }
  return rows.filter(Boolean).join(' → ');
}

export class LocationJobBridgeService {
  static buildDraftFromLocation(locationOrId, overrides = {}) {
    const location = typeof locationOrId === 'object' ? locationOrId : LocationRegistryService.findLocation(locationOrId);
    if (!location) return null;
    const factionName = findFactionName(overrides.factionId || location.controllingFactionId);
    const chain = locationChain(location) || location.name;
    const title = text(overrides.title || `${location.name} Lead`);
    const objective = text(overrides.objective || `Investigate activity at ${location.name}.`);
    const briefing = [
      text(overrides.briefing || location.publicSummary || `A lead has surfaced near ${chain}.`),
      `Location: ${chain}`,
      factionName ? `Faction context: ${factionName}` : ''
    ].filter(Boolean).join('\n\n');
    return this._normalizeDraft({
      source: 'location-registry',
      issuer: {
        type: 'location-lead',
        source: 'location-registry',
        locationId: location.id,
        locationName: location.name,
        factionId: text(overrides.factionId || location.controllingFactionId),
        factionName,
        name: location.name,
        image: location.image
      },
      client: {
        type: 'location',
        name: location.name,
        factionName,
        imageUrl: location.image,
        notes: chain
      },
      title,
      primaryObjective: objective,
      briefing,
      instructions: text(overrides.instructions || location.travelNotes || ''),
      primaryCredits: number(overrides.rewardCredits ?? 0, 0),
      primaryXp: number(overrides.rewardXp ?? 0, 0),
      status: text(overrides.status || 'draft'),
      location: {
        id: location.id,
        name: location.name,
        category: location.category,
        type: location.type,
        parentLocationId: location.parentLocationId,
        chain
      }
    });
  }

  static buildDraftFromAtlasFact(locationOrId, factOrId, overrides = {}) {
    const location = typeof locationOrId === 'object' ? locationOrId : LocationRegistryService.findLocation(locationOrId);
    if (!location) return null;
    const fact = typeof factOrId === 'object'
      ? factOrId
      : (location.atlasFacts || []).find(entry => entry.id === factOrId);
    const onReveal = fact?.onReveal || {};
    return this.buildDraftFromLocation(location, {
      title: text(overrides.title || onReveal.jobTitle || fact?.title || `${location.name} Lead`),
      objective: text(overrides.objective || onReveal.jobObjective || fact?.teaser || `Follow up on a lead at ${location.name}.`),
      briefing: text(overrides.briefing || fact?.body || fact?.teaser || location.publicSummary),
      rewardCredits: number(overrides.rewardCredits ?? onReveal.jobRewardCredits ?? 0, 0),
      factId: fact?.id || '',
      ...overrides
    });
  }

  static _normalizeDraft(draft = {}) {
    return {
      source: text(draft.source || 'location-registry'),
      issuer: draft.issuer || {},
      client: draft.client || {},
      title: text(draft.title || 'Location Lead'),
      primaryObjective: text(draft.primaryObjective || 'Investigate the location lead.'),
      briefing: text(draft.briefing || ''),
      instructions: text(draft.instructions || ''),
      status: text(draft.status || 'draft'),
      primaryCredits: number(draft.primaryCredits, 0),
      primaryXp: number(draft.primaryXp, 0),
      location: draft.location || {},
      metadata: {
        ...(draft.metadata || {}),
        locationLead: true,
        locationId: draft.location?.id || draft.issuer?.locationId || '',
        factId: text(draft.factId || '')
      }
    };
  }
}
