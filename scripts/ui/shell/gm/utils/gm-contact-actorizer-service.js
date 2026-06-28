/**
 * GMContactActorizerService
 *
 * Turns lightweight GM Datapad contacts into barebones NPC Actor documents.
 * This keeps faction contacts and bulletin contacts as the source records, then
 * writes the created actor link back onto that source to prevent duplicate NPCs.
 */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { BulletinContactRegistry } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/bulletin-contact-registry.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const SYSTEM_ID = 'foundryvtt-swse';
const FALLBACK_IMAGE = 'icons/svg/mystery-man.svg';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function nowIso() {
  try { return new Date().toISOString(); } catch (_err) { return ''; }
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tokenImage(actor) {
  return text(actor?.prototypeToken?.texture?.src || actor?.img, FALLBACK_IMAGE);
}

function tokenDimensions(actor) {
  const proto = actor?.prototypeToken;
  return {
    width: Math.max(1, number(proto?.width, 1)),
    height: Math.max(1, number(proto?.height, 1))
  };
}

function sceneGridSize(scene = canvas?.scene) {
  return Math.max(1, number(scene?.grid?.size ?? canvas?.grid?.size, 100));
}

function centerDropToTopLeft({ x = 0, y = 0, actor = null, scene = canvas?.scene } = {}) {
  const grid = sceneGridSize(scene);
  const dims = tokenDimensions(actor);
  const rawX = number(x, 0) - ((dims.width * grid) / 2);
  const rawY = number(y, 0) - ((dims.height * grid) / 2);
  if (scene?.grid?.type === CONST?.GRID_TYPES?.GRIDLESS) return { x: rawX, y: rawY };
  return {
    x: Math.max(0, Math.round(rawX / grid) * grid),
    y: Math.max(0, Math.round(rawY / grid) * grid)
  };
}

async function createLinkedToken(actor, { x = 0, y = 0, scene = canvas?.scene } = {}) {
  if (!actor) throw new Error('No actor was available for token creation.');
  if (!scene?.createEmbeddedDocuments) throw new Error('No active Scene is available to create a token.');

  const position = centerDropToTopLeft({ x, y, actor, scene });
  const textureSrc = tokenImage(actor);
  const base = {
    name: actor.name || 'GM Contact',
    actorId: actor.id,
    actorLink: true,
    x: position.x,
    y: position.y,
    width: tokenDimensions(actor).width,
    height: tokenDimensions(actor).height,
    disposition: CONST?.TOKEN_DISPOSITIONS?.NEUTRAL ?? 0,
    displayName: CONST?.TOKEN_DISPLAY_MODES?.OWNER_HOVER ?? 20,
    displayBars: CONST?.TOKEN_DISPLAY_MODES?.OWNER_HOVER ?? 20,
    texture: { src: textureSrc }
  };

  let tokenData = base;
  try {
    const proto = await actor.getTokenDocument?.(base);
    if (proto?.toObject) tokenData = { ...proto.toObject(), ...base, texture: { ...(proto.texture?.toObject?.() ?? proto.texture ?? {}), src: textureSrc } };
  } catch (_err) {
    // Raw token data is sufficient for barebones contact tokens.
  }

  const created = await scene.createEmbeddedDocuments('Token', [tokenData]);
  const token = created?.[0] ?? null;
  if (token?.object?.control) token.object.control({ releaseOthers: true });
  return token;
}

function actorUuid(actor) {
  return text(actor?.uuid || (actor?.id ? `Actor.${actor.id}` : ''));
}

async function resolveActorReference({ uuid = '', actorId = '' } = {}) {
  const cleanUuid = text(uuid);
  if (cleanUuid) {
    try {
      const doc = await fromUuid(cleanUuid);
      if (doc?.documentName === 'Actor' || doc instanceof Actor) return doc;
    } catch (err) {
      SWSELogger.warn?.('[GMContactActorizer] Could not resolve actor UUID', { uuid: cleanUuid, err });
    }
  }
  const id = text(actorId);
  return id ? game.actors?.get?.(id) ?? null : null;
}

function isFactionContactPayload(payload = {}) {
  const kind = text(payload.kind).toLowerCase();
  return kind === 'contact' && Boolean(text(payload.factionId) && text(payload.contactId || payload.id));
}

function isBulletinContactPayload(payload = {}) {
  const kind = text(payload.kind).toLowerCase();
  const source = text(payload.source).toLowerCase();
  return kind === 'bulletin-contact' || (kind === 'contact' && source === 'bulletin');
}

export class GMContactActorizerService {
  static isActorizablePayload(payload = {}) {
    return isFactionContactPayload(payload) || isBulletinContactPayload(payload);
  }

  static async actorizePayload(payload = {}) {
    if (!game.user?.isGM) throw new Error('Only the GM can create actors from GM contacts.');
    if (isFactionContactPayload(payload)) return this.#actorizeFactionContact(payload);
    if (isBulletinContactPayload(payload)) return this.#actorizeBulletinContact(payload);
    throw new Error('Drop a GM Datapad contact onto the Actor Directory or canvas to create an NPC actor.');
  }

  static async createCanvasTokenFromPayload(payload = {}, { x = 0, y = 0, scene = canvas?.scene } = {}) {
    const result = await this.actorizePayload(payload);
    const token = await createLinkedToken(result?.actor, { x, y, scene });
    return { ...result, token };
  }

  static async #actorizeFactionContact(payload = {}) {
    const factionId = text(payload.factionId);
    const contactId = text(payload.contactId || payload.id);
    const result = await FactionRegistryService.promoteFactionContactToActor(factionId, contactId);
    return {
      ...result,
      source: 'faction-contact',
      created: result?.created === true,
      actor: result?.actor ?? null,
      label: result?.actor?.name || text(payload.name, 'Faction Contact')
    };
  }

  static async #actorizeBulletinContact(payload = {}) {
    const contactId = text(payload.contactId || payload.id);
    const contact = await BulletinContactRegistry.getById(contactId);
    if (!contact) throw new Error('Bulletin/source contact could not be found.');

    const existingActor = await resolveActorReference({
      uuid: contact.actorUuid || payload.uuid,
      actorId: contact.actorId || payload.actorId
    });
    if (existingActor) {
      const linked = await BulletinContactRegistry.saveContact({
        ...contact,
        actorId: existingActor.id,
        actorUuid: actorUuid(existingActor),
        actorName: existingActor.name,
        promotedAt: contact.promotedAt || nowIso()
      });
      return {
        source: 'bulletin-contact',
        contact: linked,
        actor: existingActor,
        created: false,
        label: existingActor.name
      };
    }

    const name = text(contact.label || contact.name, 'GM Contact');
    const actor = await Actor.create({
      name,
      type: 'npc',
      img: text(contact.imageUrl, FALLBACK_IMAGE),
      flags: {
        [SYSTEM_ID]: {
          bulletinContact: {
            contactId: contact.id,
            contactName: contact.name,
            contactLabel: contact.label,
            contactKind: contact.kind,
            contactDateline: contact.dateline,
            contactSector: contact.sector,
            contactDefaultCategory: contact.defaultCategory,
            contactNotes: contact.notes,
            source: 'bulletin-contact-registry',
            actorizedAt: nowIso()
          }
        }
      }
    }, { renderSheet: false });

    let linked;
    try {
      linked = await BulletinContactRegistry.saveContact({
        ...contact,
        actorId: actor.id,
        actorUuid: actorUuid(actor),
        actorName: actor.name,
        promotedAt: nowIso()
      });
      if (!linked) throw new Error('Registry did not confirm the contact link');
    } catch (linkErr) {
      // The actor was created but linking it to the source contact failed. Delete
      // the orphan so a subsequent drag/drop does not create a duplicate actor
      // for the same contact.
      try { await actor.delete?.(); } catch (_deleteErr) {}
      return {
        source: 'bulletin-contact',
        created: false,
        error: `Failed to link contact actor: ${linkErr?.message ?? 'unknown error'}`
      };
    }

    return {
      source: 'bulletin-contact',
      contact: linked,
      actor,
      created: true,
      label: actor.name
    };
  }
}

export default GMContactActorizerService;
