import { DossierDragDropService } from '/systems/foundryvtt-swse/scripts/ui/dragdrop/dossier-drag-drop-service.js';

const IMAGE_NAME_RE = /(^|_|-|\b)(image|img|portrait|avatar|icon|sigil|logo|token)(url|path|src)?($|_|-|\b)/i;
const UUID_NAME_RE = /uuid$/i;
const ITEM_LIST_RE = /(items?|rewards?|lockboxitems)$/i;

function asText(value = '') {
  return String(value ?? '').trim();
}

function fieldName(field) {
  return asText(field?.name || field?.dataset?.smartTarget || '');
}

function dispatchField(field) {
  if (!field || typeof field.dispatchEvent !== 'function') return;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

function setFieldValue(field, value, { append = false } = {}) {
  if (!field || !('value' in field)) return false;
  const next = asText(value);
  if (!next) return false;
  if (append && field.value) {
    const separator = field.tagName === 'TEXTAREA' ? '\n' : '; ';
    field.value = `${field.value}${separator}${next}`;
  } else {
    field.value = next;
  }
  dispatchField(field);
  return true;
}

function setNamed(form, names = [], value, options = {}) {
  if (!form) return false;
  for (const name of names) {
    const field = form.elements?.[name] || form.querySelector?.(`[name="${CSS.escape(name)}"]`);
    if (setFieldValue(field, value, options)) return true;
  }
  return false;
}

function findField(root, name) {
  if (!root || !name) return null;
  const form = root.closest?.('form') || root.querySelector?.('form') || root;
  return form?.elements?.[name] || form?.querySelector?.(`[name="${CSS.escape(name)}"]`) || null;
}

function isImageField(field) {
  const name = fieldName(field);
  const placeholder = asText(field?.placeholder);
  const dataset = field?.dataset || {};
  return dataset.smartImageInput === 'true' || IMAGE_NAME_RE.test(name) || /image url|image path|sigil|portrait|avatar/i.test(placeholder);
}

function isUuidField(field) {
  const name = fieldName(field);
  const placeholder = asText(field?.placeholder);
  const dataset = field?.dataset || {};
  return dataset.smartUuidInput === 'true' || UUID_NAME_RE.test(name) || /uuid/i.test(placeholder);
}

function isItemListField(field) {
  const name = fieldName(field);
  const placeholder = asText(field?.placeholder);
  const dataset = field?.dataset || {};
  return dataset.smartAppend === 'item' || ITEM_LIST_RE.test(name) || /drop item|item uuid|compendium.*item/i.test(placeholder);
}

async function resolveDocument(payload = {}) {
  let uuid = asText(payload.uuid || payload.documentUuid || payload.itemUuid || payload.actorUuid || payload.sceneUuid);
  const type = asText(payload.type || payload.kind || payload.documentName);
  const id = asText(payload.id || payload._id || payload.documentId);
  const pack = asText(payload.pack || payload.collection || payload.compendium);
  if (!uuid && pack && id) uuid = `Compendium.${pack}.${id}`;
  if (!uuid && type && id) uuid = `${type}.${id}`;

  let doc = null;
  if (uuid && typeof fromUuid === 'function') {
    try { doc = await fromUuid(uuid); } catch (_err) {}
  }
  if (!doc && id) {
    const lower = type.toLowerCase();
    if (lower === 'actor') doc = game.actors?.get?.(id) || null;
    if (lower === 'item') doc = game.items?.get?.(id) || null;
    if (lower === 'scene') doc = game.scenes?.get?.(id) || null;
  }

  const documentName = asText(doc?.documentName || doc?.constructor?.documentName || payload.documentName || payload.type || payload.kind);
  return {
    doc,
    uuid: asText(doc?.uuid || uuid),
    id: asText(doc?.id || id),
    name: asText(doc?.name || payload.name || payload.label || documentName || 'Dropped Document'),
    img: asText(doc?.img || doc?.texture?.src || doc?.prototypeToken?.texture?.src || payload.img || payload.image || payload.src),
    type: documentName,
    kind: documentName.toLowerCase() || asText(payload.kind || payload.type).toLowerCase()
  };
}

function readDroppedPath(event) {
  const transfer = event?.dataTransfer;
  const raw = asText(transfer?.getData?.('text/uri-list') || transfer?.getData?.('text/plain'));
  if (!raw) return '';
  if (raw.startsWith('{') || raw.startsWith('[')) return '';
  if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(raw) || raw.startsWith('icons/') || raw.startsWith('systems/') || raw.startsWith('modules/') || raw.startsWith('worlds/') || raw.startsWith('https://') || raw.startsWith('http://')) return raw;
  return '';
}

async function uploadImageFile(file) {
  if (!file || !globalThis.FilePicker?.upload) return '';
  const source = 'data';
  let target = 'uploads';
  try {
    target = game.settings?.get?.('core', 'uploadDirectory') || target;
  } catch (_err) {}
  try {
    const result = await FilePicker.upload(source, target, file, {}, { notify: false });
    return asText(result?.path || result?.url || result);
  } catch (err) {
    console.warn('[SWSE] Smart image upload failed', err);
    ui.notifications?.warn?.('Could not upload that image. Drop an existing image path or use the File Picker instead.');
    return '';
  }
}

async function readDroppedImage(event) {
  const files = Array.from(event?.dataTransfer?.files || []).filter(file => /^image\//i.test(file.type || '') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || ''));
  if (files.length) return uploadImageFile(files[0]);
  return readDroppedPath(event);
}

function describeDoc(doc) {
  if (!doc?.uuid) return doc?.name || 'document';
  return `${doc.name || 'Document'} (${doc.uuid})`;
}

function formatItemLine(doc) {
  if (!doc?.uuid) return '';
  return `${doc.uuid} | 1 | ${doc.name || 'Dropped Item'}`;
}

function matchesExpectedKind(doc, expected = '') {
  const wanted = asText(expected).toLowerCase();
  if (!wanted || wanted === 'any' || wanted === 'document') return true;
  const actual = asText(doc?.type || doc?.kind).toLowerCase();
  if (wanted === 'vehicle') return actual === 'actor' || actual === 'item' || actual === 'vehicle';
  return actual === wanted || actual.includes(wanted);
}

function markZone(zone, active) {
  zone?.classList?.toggle?.('is-smart-drop-hover', Boolean(active));
}

function showFeedback(zone, message) {
  const host = zone?.closest?.('.gm-smart-drop-zone, [data-smart-document-zone]') || zone;
  if (!host || !message) return;
  let feedback = host.querySelector?.('.gm-smart-drop-feedback');
  if (!feedback) {
    feedback = document.createElement('span');
    feedback.className = 'gm-smart-drop-feedback';
    host.appendChild(feedback);
  }
  feedback.textContent = message;
  feedback.hidden = false;
  window.setTimeout(() => { if (feedback) feedback.hidden = true; }, 2200);
}

async function handleFieldDrop(event, field, zone) {
  const imageField = isImageField(field);
  const uuidField = isUuidField(field);
  const itemListField = isItemListField(field);

  if (imageField) {
    const path = await readDroppedImage(event);
    if (path) {
      setFieldValue(field, path);
      showFeedback(zone, 'Image linked');
      return true;
    }
  }

  const payload = DossierDragDropService.readPayload(event);
  if (!payload) return false;
  const doc = await resolveDocument(payload);
  const name = fieldName(field);

  if (imageField && doc.img) {
    setFieldValue(field, doc.img);
    showFeedback(zone, 'Image linked');
    return true;
  }

  if (itemListField && (doc.type === 'Item' || doc.kind === 'item')) {
    setFieldValue(field, formatItemLine(doc), { append: Boolean(field.value) });
    showFeedback(zone, 'Item appended');
    return true;
  }

  if (uuidField) {
    setFieldValue(field, doc.uuid || payload.uuid || payload.id || '');
    showFeedback(zone, 'UUID linked');
    return true;
  }

  if (/name|title/i.test(name)) {
    setFieldValue(field, doc.name);
    showFeedback(zone, 'Name filled');
    return true;
  }

  return false;
}

async function handleDocumentZoneDrop(event, zone) {
  const payload = DossierDragDropService.readPayload(event);
  if (!payload) return false;
  const doc = await resolveDocument(payload);
  const expected = asText(zone.dataset.smartDocKind || zone.dataset.smartDocumentKind || 'any');
  if (!matchesExpectedKind(doc, expected)) {
    ui.notifications?.warn?.(`Drop a ${expected} here.`);
    return false;
  }

  const form = zone.closest('form');
  const targetName = asText(zone.dataset.smartTarget);
  if (targetName) {
    const target = findField(zone, targetName);
    if (target) {
      let value = doc.name;
      if (isUuidField(target)) value = doc.uuid || doc.name;
      else if (isImageField(target)) value = doc.img || doc.name;
      else if (isItemListField(target) && (doc.type === 'Item' || doc.kind === 'item')) value = formatItemLine(doc);
      if (setFieldValue(target, value, { append: isItemListField(target) && Boolean(target.value) })) {
        showFeedback(zone, `${doc.name} linked`);
        return true;
      }
    }
  }

  if (doc.type === 'Actor' || doc.kind === 'actor') {
    setNamed(form, ['linkedActorUuid', 'issuerContactActorUuid', 'clientActorUuid', 'actorUuid'], doc.uuid);
    setNamed(form, ['issuerContactActorId', 'clientActorId', 'actorId'], doc.id);
    setNamed(form, ['issuerContactActorName', 'issuerContactName', 'issuerName', 'clientName', 'actorName', 'name'], doc.name);
    setNamed(form, ['issuerImage', 'clientImage', 'imageUrl', 'image', 'avatar', 'portrait'], doc.img);
    setNamed(form, ['issuerType'], 'contact');
    setNamed(form, ['issuerSource'], 'actor');
    showFeedback(zone, `${doc.name} linked`);
    return true;
  }

  if (doc.type === 'Item' || doc.kind === 'item') {
    if (setNamed(form, ['linkedItemUuid', 'itemUuid'], doc.uuid)) {
      showFeedback(zone, `${doc.name} linked`);
      return true;
    }
    const itemField = Array.from(form?.elements || []).find(control => isItemListField(control));
    if (itemField) {
      setFieldValue(itemField, formatItemLine(doc), { append: Boolean(itemField.value) });
      showFeedback(zone, `${doc.name} appended`);
      return true;
    }
  }

  if (doc.type === 'Scene' || doc.kind === 'scene') {
    if (setNamed(form, ['linkedSceneUuid', 'sceneUuid'], doc.uuid)) {
      showFeedback(zone, `${doc.name} linked`);
      return true;
    }
  }

  const genericUuid = Array.from(form?.elements || []).find(control => isUuidField(control));
  if (genericUuid && setFieldValue(genericUuid, doc.uuid)) {
    showFeedback(zone, describeDoc(doc));
    return true;
  }
  return false;
}

function makeSmartZone(element, kind = 'generic') {
  if (!element || element.dataset.smartDropBound === 'true') return;
  element.dataset.smartDropBound = 'true';
  element.classList?.add?.('gm-smart-drop-zone');
  if (kind) element.dataset.smartDropKind = kind;
}

function appendHint(zone, text) {
  if (!zone || !text || zone.querySelector?.('.gm-smart-field-hint')) return;
  const hint = document.createElement('small');
  hint.className = 'gm-smart-field-hint';
  hint.textContent = text;
  zone.appendChild(hint);
}

export class GMSmartFormDropService {
  static bind(root, { signal } = {}) {
    if (!root) return;
    this.bindModalBehavior(root, { signal });
    this.bindSmartDrops(root, { signal });
  }

  static bindModalBehavior(root, { signal } = {}) {
    this.syncModalBounds(root);
    this.syncModalState(root);

    root.addEventListener('click', (event) => {
      if (!event.target?.closest?.('[data-gm-wizard-open], [data-gm-wizard-close], [data-intel-action="new"], [data-intel-action="edit"], [data-intel-action="close-modal"]')) return;
      window.setTimeout(() => {
        this.syncModalBounds(root);
        this.syncModalState(root);
      }, 0);
    }, { signal, capture: true });

    const onResize = () => this.syncModalBounds(root);
    window.addEventListener('resize', onResize, { signal });

    const screen = this._screenElement(root);
    if (screen && globalThis.ResizeObserver) {
      const observer = new ResizeObserver(() => this.syncModalBounds(root));
      observer.observe(screen);
      signal?.addEventListener?.('abort', () => observer.disconnect(), { once: true });
    }
  }

  static syncModalBounds(root) {
    const shell = root?.closest?.('.swse-sheet-v2-shell--gm-datapad') || root?.closest?.('.gm-datapad') || root;
    const screen = this._screenElement(root);
    const rect = screen?.getBoundingClientRect?.();
    if (!shell || !rect) return;
    shell.style.setProperty('--gm-smart-modal-left', `${Math.round(rect.left)}px`);
    shell.style.setProperty('--gm-smart-modal-top', `${Math.round(rect.top)}px`);
    shell.style.setProperty('--gm-smart-modal-width', `${Math.round(rect.width)}px`);
    shell.style.setProperty('--gm-smart-modal-height', `${Math.round(rect.height)}px`);
  }

  static syncModalState(root) {
    const host = root?.closest?.('.swse-shell-surface-host');
    const open = Boolean(root?.querySelector?.('[data-gm-wizard].is-open:not([hidden]), [data-intel-modal]:not([hidden])'));
    host?.classList?.toggle?.('gm-has-modal-open', open);
    root?.classList?.toggle?.('gm-has-modal-open', open);
    if (open) this.syncModalBounds(root);
  }

  static _screenElement(root) {
    return root?.closest?.('.swse-sheet-v2-shell--gm-datapad')?.querySelector?.('.gm-datapad-screen')
      || root?.closest?.('.gm-datapad-screen')
      || root?.closest?.('.swse-shell-surface-host')
      || root;
  }

  static bindSmartDrops(root, { signal } = {}) {
    const fieldSelector = 'input:not([type="hidden"]), textarea';
    root.querySelectorAll(fieldSelector).forEach((field) => {
      if (!(isImageField(field) || isUuidField(field) || isItemListField(field))) return;
      const zone = field.closest('label, .gm-job-reward-drop, .gm-smart-drop-zone') || field;
      if (zone?.matches?.('[data-job-reward-drop]')) return;
      makeSmartZone(zone, isImageField(field) ? 'image' : isUuidField(field) ? 'uuid' : 'item');
      if (isImageField(field)) appendHint(zone, 'Drop an image file/path here.');
      else if (isUuidField(field)) appendHint(zone, 'Drop an Actor, Item, Scene, vehicle, or compendium document here.');
      else appendHint(zone, 'Drop an Item or compendium item here.');
      this._bindZone(zone, async (event) => handleFieldDrop(event, field, zone), { signal });
    });

    root.querySelectorAll('[data-smart-document-zone]').forEach((zone) => {
      makeSmartZone(zone, 'document');
      appendHint(zone, zone.dataset.smartHint || 'Drop an Actor, Item, Scene, or compendium entry here to prefill this form.');
      this._bindZone(zone, async (event) => handleDocumentZoneDrop(event, zone), { signal });
    });
  }

  static _bindZone(zone, handler, { signal } = {}) {
    if (!zone || zone.dataset.smartZoneDropBound === 'true') return;
    zone.dataset.smartZoneDropBound = 'true';
    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      markZone(zone, true);
    }, { signal });
    zone.addEventListener('dragleave', () => markZone(zone, false), { signal });
    zone.addEventListener('drop', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      markZone(zone, false);
      const handled = await handler(event);
      if (!handled) ui.notifications?.warn?.('That drop could not be used here. Try dropping an image, Actor, Item, Scene, or compendium document.');
    }, { signal });
  }
}

export default GMSmartFormDropService;
