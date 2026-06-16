/** Thin bridge from Locations/Atlas facts into Holonet Intel drafts. */

import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { HolonetIntelService, INTEL_KIND, INTEL_PERSISTENCE, INTEL_REVEAL_STATE } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
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

export class LocationIntelBridgeService {
  static buildDraftDataFromLocation(locationOrId, overrides = {}) {
    const location = typeof locationOrId === 'object' ? locationOrId : LocationRegistryService.findLocation(locationOrId);
    if (!location) return null;
    const chain = locationChain(location) || location.name;
    return {
      title: text(overrides.title || `${location.name} Dossier`),
      kind: overrides.kind || INTEL_KIND.LOCATION_INTEL || 'location-intel',
      persistence: overrides.persistence || INTEL_PERSISTENCE.DOSSIER || 'dossier',
      revealState: overrides.revealState || INTEL_REVEAL_STATE.PARTIAL || 'partial',
      summary: text(overrides.summary || location.publicSummary || `Location dossier for ${chain}.`),
      publicBody: text(overrides.publicBody || location.publicSummary || ''),
      redactedBody: text(overrides.redactedBody || location.publicSummary || ''),
      fullBody: text(overrides.fullBody || [location.publicSummary, location.travelNotes, location.hazards].filter(Boolean).join('\n\n')),
      gmNotes: text(overrides.gmNotes || location.gmNotes || ''),
      linkedSceneUuid: text(location.map?.sceneUuid || location.linkedSceneUuids?.[0] || ''),
      linkedFactionId: text(overrides.linkedFactionId || location.controllingFactionId || ''),
      tags: ['location', location.category, location.type, ...(location.tags || [])].filter(Boolean),
      metadata: {
        locationId: location.id,
        locationName: location.name,
        locationChain: chain
      },
      ...overrides
    };
  }

  static buildDraftDataFromFact(locationOrId, factOrId, overrides = {}) {
    const location = typeof locationOrId === 'object' ? locationOrId : LocationRegistryService.findLocation(locationOrId);
    if (!location) return null;
    const fact = typeof factOrId === 'object' ? factOrId : location.atlasFacts?.find(entry => entry.id === factOrId);
    if (!fact) return this.buildDraftDataFromLocation(location, overrides);
    return this.buildDraftDataFromLocation(location, {
      title: text(overrides.title || fact.onReveal?.intelTitle || fact.title),
      summary: text(overrides.summary || fact.teaser || fact.title),
      publicBody: text(overrides.publicBody || fact.body || fact.teaser),
      redactedBody: text(overrides.redactedBody || fact.teaser),
      fullBody: text(overrides.fullBody || fact.body || fact.teaser),
      tags: ['atlas-fact', fact.category, ...(fact.tags || [])].filter(Boolean),
      metadata: {
        locationId: location.id,
        locationName: location.name,
        factId: fact.id,
        factTitle: fact.title
      },
      ...overrides
    });
  }

  static async createIntelDraftFromLocation(locationOrId, overrides = {}) {
    const data = this.buildDraftDataFromLocation(locationOrId, overrides);
    return data ? HolonetIntelService.createIntelDraft(data) : null;
  }

  static async createIntelDraftFromFact(locationOrId, factOrId, overrides = {}) {
    const data = this.buildDraftDataFromFact(locationOrId, factOrId, overrides);
    return data ? HolonetIntelService.createIntelDraft(data) : null;
  }
}
