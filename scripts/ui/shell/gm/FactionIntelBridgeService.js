/**
 * FactionIntelBridgeService
 *
 * Thin adapter between the existing GM Faction Registry / named NPC dossiers
 * and the Holonet-backed Intel service. This does not deliver Intel to players;
 * it only creates and links draft records that the GM Intel surface can edit.
 */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import {
  HolonetIntelService,
  INTEL_CLASSIFICATION,
  INTEL_KIND,
  INTEL_PERSISTENCE,
  INTEL_REVEAL_STATE,
  INTEL_STATUS
} from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';

function text(value, fallback = '') {
  return String(value ?? fallback ?? '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function lines(parts = []) {
  return parts.map(part => text(part)).filter(Boolean).join('\n\n');
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of asArray(values).flatMap(entry => Array.isArray(entry) ? entry : [entry])) {
    const clean = text(value);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function tagList(...values) {
  return uniqueStrings(values.flatMap(value => {
    if (Array.isArray(value)) return value;
    return text(value).split(',').map(part => part.trim()).filter(Boolean);
  }));
}

function intelId(record) {
  return HolonetIntelService.getIntelMetadata(record)?.id || record?.id || '';
}

function revealVisibility() {
  return { mode: 'party', userIds: [], actorIds: [] };
}

function factionBody(faction = {}) {
  return lines([
    faction.notes,
    faction.benefits ? `Known benefits / leverage:\n${faction.benefits}` : '',
    faction.leader ? `Known leader: ${faction.leader}` : '',
    faction.planetSystem ? `Primary region: ${faction.planetSystem}` : ''
  ]);
}

function factionGmNotes(faction = {}) {
  return lines([
    faction.gmNotes,
    faction.sourceLabel ? `Registry source: ${faction.sourceLabel}` : '',
    faction.status ? `Registry status: ${faction.status}` : ''
  ]);
}

function contactBody(contact = {}, faction = {}) {
  return lines([
    contact.publicNotes,
    contact.description,
    contact.role || contact.title ? `Known role: ${text(contact.role || contact.title)}` : '',
    contact.factionRank ? `Faction rank: ${contact.factionRank}` : '',
    contact.lastKnownLocation ? `Last known location: ${contact.lastKnownLocation}` : '',
    faction.name ? `Associated faction: ${faction.name}` : ''
  ]);
}

function contactFullBody(contact = {}, faction = {}) {
  return lines([
    contactBody(contact, faction),
    contact.agenda ? `Agenda:\n${contact.agenda}` : '',
    contact.secret ? `Hidden Intel:\n${contact.secret}` : ''
  ]);
}

function contactGmNotes(contact = {}, faction = {}) {
  return lines([
    contact.gmNotes,
    contact.agenda ? `Agenda: ${contact.agenda}` : '',
    contact.secret ? `Secret: ${contact.secret}` : '',
    contact.disposition ? `Disposition: ${contact.disposition}` : '',
    faction.gmNotes ? `Faction GM notes:\n${faction.gmNotes}` : ''
  ]);
}

export class FactionIntelBridgeService {
  static resolveFaction(factionOrId = '') {
    return typeof factionOrId === 'object' && factionOrId?.id
      ? factionOrId
      : FactionRegistryService.findFaction(factionOrId);
  }

  static resolveContact(factionOrId = '', contactOrId = '') {
    if (typeof contactOrId === 'object' && contactOrId?.id) {
      const faction = this.resolveFaction(factionOrId) || FactionRegistryService.findFaction(contactOrId.factionId || contactOrId.factionName);
      return faction ? { faction, contact: contactOrId } : null;
    }
    const faction = this.resolveFaction(factionOrId);
    if (!faction) return null;
    return FactionRegistryService.findFactionContact(faction.id, contactOrId)
      || FactionRegistryService.findFactionContact(faction.name, contactOrId);
  }

  static async createDraftFromFaction(factionOrId, overrides = {}) {
    const faction = this.resolveFaction(factionOrId);
    if (!faction) return null;
    const name = text(faction.name, 'Faction');
    return HolonetIntelService.buildDraftFromFaction(faction, {
      title: `${name} Dossier`,
      kind: INTEL_KIND.FACTION_DOSSIER,
      classification: overrides.classification || INTEL_CLASSIFICATION.RESTRICTED,
      persistence: overrides.persistence || INTEL_PERSISTENCE.GM_ONLY,
      revealState: overrides.revealState || INTEL_REVEAL_STATE.SEALED,
      summary: overrides.summary || `Known intelligence profile for ${name}.`,
      publicBody: overrides.publicBody ?? factionBody(faction),
      fullBody: overrides.fullBody ?? lines([factionBody(faction), factionGmNotes(faction)]),
      gmNotes: overrides.gmNotes ?? factionGmNotes(faction),
      tags: tagList(faction.tags, faction.type, faction.source, name, 'faction', overrides.tags),
      ...overrides
    });
  }

  static async createDraftFromContact(factionOrId, contactOrId, overrides = {}) {
    const found = this.resolveContact(factionOrId, contactOrId);
    if (!found?.faction || !found?.contact) return null;
    const { faction, contact } = found;
    const factionName = text(faction.name, 'Faction');
    const contactName = text(contact.name, 'Named NPC');
    const record = await HolonetIntelService.buildDraftFromContact(faction, contact, {
      title: `${contactName} — NPC Dossier`,
      kind: INTEL_KIND.NPC_DOSSIER,
      classification: overrides.classification || INTEL_CLASSIFICATION.RESTRICTED,
      persistence: overrides.persistence || INTEL_PERSISTENCE.GM_ONLY,
      revealState: overrides.revealState || INTEL_REVEAL_STATE.SEALED,
      linkedActorUuid: overrides.linkedActorUuid ?? text(contact.actorUuid),
      summary: overrides.summary || `${contactName}, ${text(contact.role || contact.title, 'contact')} associated with ${factionName}.`,
      publicBody: overrides.publicBody ?? contactBody(contact, faction),
      fullBody: overrides.fullBody ?? contactFullBody(contact, faction),
      gmNotes: overrides.gmNotes ?? contactGmNotes(contact, faction),
      tags: tagList(contact.tags, contact.role, contact.disposition, factionName, 'npc', 'contact', overrides.tags),
      ...overrides
    });
    await this.#linkIntelToContact(faction.id, contact.id, intelId(record));
    return record;
  }

  static async buildFactionRevealIntel(factionOrId, overrides = {}) {
    const faction = this.resolveFaction(factionOrId);
    if (!faction) return null;
    const name = text(faction.name, 'Faction');
    return this.createDraftFromFaction(faction, {
      title: overrides.title || `${name} — Player Reveal`,
      status: INTEL_STATUS.READY,
      persistence: INTEL_PERSISTENCE.DOSSIER,
      revealState: INTEL_REVEAL_STATE.FULLY_REVEALED,
      visibility: revealVisibility(),
      dossierCommit: true,
      summary: overrides.summary || `${name} is ready to be revealed to the player dossier.`,
      tags: tagList('reveal', 'dossier', overrides.tags),
      ...overrides
    });
  }

  static async buildContactRevealIntel(factionOrId, contactOrId, overrides = {}) {
    const found = this.resolveContact(factionOrId, contactOrId);
    if (!found?.faction || !found?.contact) return null;
    const { faction, contact } = found;
    const contactName = text(contact.name, 'Named NPC');
    const record = await this.createDraftFromContact(faction, contact, {
      title: overrides.title || `${contactName} — Player Reveal`,
      status: INTEL_STATUS.READY,
      persistence: INTEL_PERSISTENCE.DOSSIER,
      revealState: INTEL_REVEAL_STATE.FULLY_REVEALED,
      visibility: revealVisibility(),
      dossierCommit: true,
      summary: overrides.summary || `${contactName} is ready to be revealed to the player dossier.`,
      tags: tagList('reveal', 'dossier', overrides.tags),
      ...overrides
    });
    return record;
  }

  static async #linkIntelToContact(factionId = '', contactId = '', id = '') {
    const cleanId = text(id);
    if (!cleanId) return null;
    const found = FactionRegistryService.findFactionContact(factionId, contactId);
    if (!found?.faction || !found?.contact) return null;
    const linkedIntelIds = uniqueStrings([...(found.contact.linkedIntelIds || []), cleanId]);
    return FactionRegistryService.upsertFactionContact(found.faction.id, {
      ...found.contact,
      linkedIntelIds
    });
  }
}
