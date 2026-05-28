/** GM Faction Relationship Manager surface view-model. */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';

function asArray(value) { return Array.isArray(value) ? value : []; }
function scoreClass(score) { return score > 0 ? 'is-positive' : score < 0 ? 'is-negative' : 'is-neutral'; }
function scoreLabel(score) { return score > 0 ? `+${score}` : score === 0 ? '+0' : String(score); }
function actorOption(actor) {
  return {
    id: actor.id,
    name: actor.name || 'Unnamed Actor',
    type: actor.type || 'actor',
    img: actor.img || actor.prototypeToken?.texture?.src || 'icons/svg/mystery-man.svg'
  };
}

export class GMFactionRelationshipSurfaceService {
  static async buildViewModel(_host) {
    const registrySummary = FactionRegistryService.summarizeForWorkspace();
    const relationships = FactionRegistryService.getAllActorRelationshipRows().map((row) => ({
      ...row,
      scoreClass: scoreClass(row.score),
      scoreLabel: scoreLabel(row.score),
      registryMissing: !FactionRegistryService.findFaction(row.factionId || row.factionName),
      canEdit: !row.isSuggestion
    }));
    const suggestions = FactionRegistryService.getPendingSuggestions().map((row) => ({
      actorId: row.actorId,
      actorName: row.actorName,
      id: row.record.id,
      name: row.record.name,
      type: row.record.type,
      relationshipType: row.record.relationshipType,
      notes: row.record.notes,
      status: row.record.status
    }));
    const actors = Array.from(game.actors ?? [])
      .filter(actor => ['character', 'npc', 'droid'].includes(actor.type) || actor.hasPlayerOwner || actor.isOwner)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      .map(actorOption);
    const activeRelationships = relationships.filter(row => !row.isSuggestion);

    return {
      pageTitle: 'Faction Manager',
      pageDescription: 'GM-owned campaign faction registry, party-wide actor relationships, score adjustments, and player suggestions.',
      factionManager: {
        registry: registrySummary.factions.map((record) => ({
          ...record,
          scoreClass: scoreClass(record.score),
          scoreLabel: scoreLabel(record.score)
        })),
        relationships: activeRelationships,
        suggestions,
        actors,
        relationshipTypes: FactionRegistryService.getRelationshipTypeOptions(),
        sourceTypes: FactionRegistryService.getSourceTypeOptions(),
        counts: {
          registry: registrySummary.count,
          relationships: activeRelationships.length,
          suggestions: suggestions.length,
          actorsWithRelationships: new Set(activeRelationships.map(row => row.actorId)).size
        },
        hasRegistry: registrySummary.factions.length > 0,
        hasRelationships: activeRelationships.length > 0,
        hasSuggestions: suggestions.length > 0,
        hasActors: actors.length > 0
      }
    };
  }
}
