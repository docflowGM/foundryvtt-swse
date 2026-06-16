/**
 * DossierDragDropService
 *
 * Small shared drag/drop adapter for campaign dossier records. It does not own
 * any data; it only serializes links so existing authorities can decide what a
 * drop means.
 */

const MIME = 'application/x-swse-dossier-link';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function readDataset(element) {
  const dataset = element?.dataset || {};
  return {
    kind: text(dataset.swseDragKind || dataset.dossierDragKind || dataset.kind),
    id: text(dataset.swseDragId || dataset.dossierDragId || dataset.id),
    uuid: text(dataset.swseDragUuid || dataset.dossierDragUuid || dataset.uuid),
    name: text(dataset.swseDragName || dataset.dossierDragName || dataset.name),
    factionId: text(dataset.swseDragFactionId || dataset.factionId),
    contactId: text(dataset.swseDragContactId || dataset.contactId),
    threadId: text(dataset.swseDragThreadId || dataset.threadId),
    recordId: text(dataset.swseDragRecordId || dataset.recordId),
    type: text(dataset.swseDragType || dataset.type),
    source: text(dataset.swseDragSource || dataset.source || 'swse-dossier')
  };
}

function normalizeFoundryPayload(data = {}) {
  const type = text(data.type || data.documentName || data.documentType);
  const pack = text(data.pack || data.compendium || data.collection || '');
  const id = text(data.id || data._id || data.documentId || '');
  const inferredUuid = pack && type && id ? `Compendium.${pack}.${id}` : (type && id ? `${type}.${id}` : '');
  const uuid = text(data.uuid || data.documentUuid || data.uuidPath || inferredUuid);
  const name = text(data.name || data.label || data.documentName || type);
  if (!type && !uuid) return null;
  const lower = type.toLowerCase();
  const base = { uuid, id, name, type, pack, source: pack ? 'compendium' : 'foundry' };
  if (lower === 'actor') return { ...base, kind: 'actor' };
  if (lower === 'scene') return { ...base, kind: 'scene' };
  if (lower === 'journalentry' || lower === 'journal') return { ...base, kind: 'journal' };
  if (lower === 'item') return { ...base, kind: 'item' };
  return { ...base, kind: lower || 'document' };
}

export class DossierDragDropService {
  static MIME = MIME;

  static payloadFromElement(element) {
    const payload = readDataset(element);
    return payload.kind || payload.id || payload.uuid ? payload : null;
  }

  static bindDragSources(root, { signal } = {}) {
    root?.querySelectorAll?.('[data-swse-drag-kind], [data-dossier-drag-kind]')?.forEach((element) => {
      if (element.dataset.swseDragBound === 'true') return;
      element.dataset.swseDragBound = 'true';
      element.setAttribute('draggable', 'true');
      element.addEventListener('dragstart', (event) => {
        const payload = this.payloadFromElement(element);
        if (!payload) return;
        this.writePayload(event, payload);
      }, { signal });
    });
  }

  static writePayload(event, payload = {}) {
    const normalized = {
      kind: text(payload.kind || payload.type || 'link'),
      id: text(payload.id),
      uuid: text(payload.uuid),
      name: text(payload.name),
      factionId: text(payload.factionId),
      contactId: text(payload.contactId),
      threadId: text(payload.threadId),
      recordId: text(payload.recordId),
      type: text(payload.type),
      pack: text(payload.pack),
      category: text(payload.category),
      role: text(payload.role),
      quantity: text(payload.quantity),
      source: text(payload.source || 'swse-dossier')
    };
    const raw = JSON.stringify(normalized);
    event.dataTransfer?.setData?.(MIME, raw);
    event.dataTransfer?.setData?.('application/json', raw);
    event.dataTransfer?.setData?.('text/plain', raw);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyLink';
    return normalized;
  }

  static readPayload(event) {
    const transfer = event?.dataTransfer;
    const tryParse = (raw) => {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.kind || parsed?.type || parsed?.uuid) return parsed;
      } catch (_err) {
        return null;
      }
      return null;
    };

    const explicit = tryParse(transfer?.getData?.(MIME)) || tryParse(transfer?.getData?.('application/json')) || tryParse(transfer?.getData?.('text/plain'));
    if (explicit?.kind) return explicit;

    try {
      const data = TextEditor.getDragEventData?.(event);
      const normalized = normalizeFoundryPayload(data || {});
      if (normalized) return normalized;
    } catch (_err) {
      // Foundry drag payloads are optional here.
    }
    return explicit ? normalizeFoundryPayload(explicit) || explicit : null;
  }
}

export default DossierDragDropService;
