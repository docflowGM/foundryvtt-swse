/**
 * CompendiumDirectory Click Repair
 *
 * Foundry v13's CompendiumDirectory is an ApplicationV2 sidebar app. When its
 * native row action delegation fails, the pack apps themselves can still open
 * through `game.packs.get(id).render(true)`. This repair installs a narrow,
 * capture-phase fallback opener for native compendium pack rows.
 *
 * Step 4 hardening:
 * - does not rely on `#compendium` existing during init
 * - installs on document capture so root-level/bubble-level handlers cannot
 *   swallow the click before the fallback sees it
 * - resolves pack ids from V13 data attrs, Compendium UUIDs, child attrs, or
 *   pack label text as a last resort
 * - exposes status/probe helpers instead of returning a bare boolean
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

const REPAIR_FLAG = 'swseCompendiumClickRepairInstalled';
const DOCUMENT_FLAG = '__swseCompendiumClickRepairDocumentInstalled';
const ROOT_FLAG = '__swseCompendiumClickRepairRoots';

let registered = false;

const PACK_ELEMENT_SELECTOR = [
  '[data-pack]',
  '[data-pack-id]',
  '[data-collection]',
  '[data-collection-id]',
  '[data-uuid^="Compendium."]',
  'li.directory-item.compendium',
  'li.compendium.directory-item',
  '.directory-item.compendium',
  '.compendium.directory-item',
  '.compendium-pack',
  '.pack'
].join(',');

const CONTROL_SELECTOR = [
  '.directory-header',
  '.directory-footer',
  '.header-actions',
  '.document-controls',
  '.folder-header',
  '.create',
  '.document-create',
  '.folder-create',
  '.context',
  '.context-menu',
  '.control',
  'button',
  'a[href]',
  'input',
  'select',
  'textarea'
].join(',');

function _getApplicationElement(appOrRoot = null) {
  if (appOrRoot instanceof HTMLElement) return appOrRoot;
  if (appOrRoot?.element instanceof HTMLElement) return appOrRoot.element;
  if (appOrRoot?.element?.[0] instanceof HTMLElement) return appOrRoot.element[0];
  return null;
}

function _queryRoots() {
  const roots = new Set();

  const direct = _getApplicationElement(ui?.compendium);
  if (direct) roots.add(direct);

  for (const selector of [
    '#sidebar #compendium',
    '#sidebar .compendium-sidebar',
    '#sidebar [data-tab="compendium"]',
    '#sidebar [data-application-part="directory"]',
    '#compendium',
    '.compendium-sidebar',
    '[data-application-part="directory"]'
  ]) {
    for (const el of document.querySelectorAll(selector)) {
      if (el instanceof HTMLElement) roots.add(el);
    }
  }

  return Array.from(roots);
}

function _normalizePackId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  if (raw.startsWith('Compendium.')) {
    const parts = raw.split('.').filter(Boolean);
    if (parts.length >= 3) return `${parts[1]}.${parts[2]}`;
  }

  if (raw.includes('.') && game.packs?.has?.(raw)) return raw;
  return null;
}

function _candidateValuesFromElement(element) {
  if (!(element instanceof HTMLElement)) return [];

  const dataset = element.dataset ?? {};
  const values = [
    dataset.pack,
    dataset.packId,
    dataset.collection,
    dataset.collectionId,
    dataset.uuid,
    dataset.entryId,
    dataset.id,
    element.getAttribute('data-pack'),
    element.getAttribute('data-pack-id'),
    element.getAttribute('data-collection'),
    element.getAttribute('data-collection-id'),
    element.getAttribute('data-uuid'),
    element.getAttribute('data-entry-id'),
    element.getAttribute('data-id')
  ];

  return values.filter(v => v != null && String(v).trim() !== '');
}

function _resolvePackIdFromElement(element) {
  if (!(element instanceof HTMLElement)) return null;

  // 1. Try the element's own data attributes first. This avoids scanning all
  //    descendants when a broad container element is matched by .closest().
  for (const candidate of _candidateValuesFromElement(element)) {
    const packId = _normalizePackId(candidate);
    if (packId && game.packs?.has?.(packId)) return packId;
  }

  // 2. Foundry V13 can put the pack id on a direct child control (header/button)
  //    rather than the row container. Only scan immediate children to avoid
  //    pulling in sibling rows from a parent container.
  for (const child of element.children) {
    for (const candidate of _candidateValuesFromElement(child)) {
      const packId = _normalizePackId(candidate);
      if (packId && game.packs?.has?.(packId)) return packId;
    }
  }

  return _resolvePackIdFromLabel(element);
}

function _cleanLabel(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\b\d+\b/g, '')
    .trim()
    .toLowerCase();
}

function _resolvePackIdFromLabel(element) {
  if (!(element instanceof HTMLElement)) return null;

  const labelSource = element.querySelector('.pack-title, .entry-name, .document-name, h3, h4, label')
    || element;
  const label = _cleanLabel(labelSource.textContent);
  if (!label) return null;

  const matches = game.packs?.filter?.((pack) => {
    const meta = pack?.metadata ?? {};
    const packLabel = _cleanLabel(meta.label ?? pack.title ?? pack.collection ?? pack.metadata?.id);
    return packLabel && packLabel === label;
  }) ?? [];

  if (matches.length === 1) return matches[0].collection;

  // Last resort: some rows include the label plus document count or controls.
  const loose = game.packs?.filter?.((pack) => {
    const meta = pack?.metadata ?? {};
    const packLabel = _cleanLabel(meta.label ?? pack.title ?? pack.collection ?? pack.metadata?.id);
    return packLabel && (label.includes(packLabel) || packLabel.includes(label));
  }) ?? [];

  return loose.length === 1 ? loose[0].collection : null;
}

function _isInsideCompendiumDirectory(element) {
  if (!(element instanceof Element)) return false;

  if (element.closest('#sidebar #compendium, #sidebar .compendium-sidebar, #sidebar [data-tab="compendium"]')) {
    return true;
  }

  const directory = element.closest('[data-application-part="directory"]');
  if (!directory) return false;

  // Do not hijack actor/item/journal directories. Only claim a generic V13
  // directory when it contains compendium-ish rows or pack ids.
  return !!directory.querySelector(PACK_ELEMENT_SELECTOR);
}

function _findPackElement(target) {
  if (!(target instanceof Element)) return null;
  if (!_isInsideCompendiumDirectory(target)) return null;

  // Prefer the nearest explicit pack-bearing ancestor.
  const explicit = target.closest(PACK_ELEMENT_SELECTOR);
  if (explicit instanceof HTMLElement && _isInsideCompendiumDirectory(explicit)) {
    const id = _resolvePackIdFromElement(explicit);
    if (id) return { element: explicit, packId: id };
  }

  // Walk row ancestors and resolve from descendants/text.
  let node = target;
  while (node && node instanceof HTMLElement && node !== document.body) {
    const maybeRow = node.matches?.('li, .directory-item, .compendium, .pack, article, div') ? node : null;
    if (maybeRow) {
      const id = _resolvePackIdFromElement(maybeRow);
      if (id) return { element: maybeRow, packId: id };
    }
    node = node.parentElement;
  }

  return null;
}

function _isControlClick(target, packElement) {
  if (!(target instanceof Element) || !(packElement instanceof HTMLElement)) return false;

  const actionElement = target.closest('[data-action]');
  const action = String(actionElement?.dataset?.action ?? '').toLowerCase();

  // Open-like actions are allowed to fall through to the fallback; everything
  // else is likely a header/search/folder/import/lock control.
  if (actionElement && action && !['open', 'render', 'browse', 'view'].includes(action)) {
    return true;
  }

  const control = target.closest(CONTROL_SELECTOR);
  if (!control) return false;
  if (control === packElement) return false;

  // A row title can be an anchor in some Foundry skins; allow it when it still
  // belongs to the same resolved pack row.
  if (control instanceof HTMLElement && _resolvePackIdFromElement(control) === _resolvePackIdFromElement(packElement)) {
    return false;
  }

  return true;
}

async function _openPackFromEvent(event, source = 'document') {
  try {
    if (event.defaultPrevented) return false;
    if (!(event.target instanceof Element)) return false;

    const resolved = _findPackElement(event.target);
    if (!resolved?.packId) return false;
    if (_isControlClick(event.target, resolved.element)) return false;

    const pack = game.packs?.get?.(resolved.packId);
    if (!pack) return false;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    SWSELogger.log(`[CompendiumDirectoryClickRepair] Opening ${resolved.packId} from ${source} fallback`);
    await pack.render(true);
    return true;
  } catch (err) {
    SWSELogger.warn('[CompendiumDirectoryClickRepair] Failed to open pack from sidebar click:', err);
    return false;
  }
}

function _installOnRoot(root) {
  if (!(root instanceof HTMLElement)) return { installed: false, reason: 'missing-root' };
  if (root.dataset?.[REPAIR_FLAG] === 'true') return { installed: false, reason: 'already-installed', root };

  root.dataset[REPAIR_FLAG] = 'true';
  root.addEventListener('click', (event) => {
    void _openPackFromEvent(event, 'root');
  }, { capture: true });

  return { installed: true, root };
}

function _installDocumentCapture() {
  if (document[DOCUMENT_FLAG]) return { installed: false, reason: 'already-installed' };
  document[DOCUMENT_FLAG] = true;
  document.addEventListener('click', (event) => {
    void _openPackFromEvent(event, 'document');
  }, { capture: true });
  return { installed: true };
}

function _installAllRoots() {
  const roots = _queryRoots();
  const results = roots.map(root => _installOnRoot(root));
  document[ROOT_FLAG] = roots.length;
  return {
    document: _installDocumentCapture(),
    rootsFound: roots.length,
    rootsInstalled: results.filter(r => r.installed).length,
    rootsAlreadyInstalled: results.filter(r => r.reason === 'already-installed').length,
    results
  };
}

function _status() {
  const roots = _queryRoots();
  const explicitPackRows = document.querySelectorAll(PACK_ELEMENT_SELECTOR).length;
  return {
    registered,
    documentInstalled: !!document[DOCUMENT_FLAG],
    rootsFound: roots.length,
    rootsWithRepairFlag: roots.filter(root => root.dataset?.[REPAIR_FLAG] === 'true').length,
    explicitPackRows,
    packsLoaded: game.packs?.size ?? 0,
    rootSelectorsMayBeStale: roots.length === 0
  };
}

export function registerCompendiumDirectoryClickRepair() {
  if (registered) return;
  registered = true;

  try {
    _installDocumentCapture();

    Hooks.on('renderCompendiumDirectory', (app, html) => {
      const root = _getApplicationElement(html) || _getApplicationElement(app);
      if (root) _installOnRoot(root);
      _installAllRoots();
    });

    Hooks.on('renderSidebar', () => _installAllRoots());
    Hooks.on('collapseSidebar', () => setTimeout(_installAllRoots, 0));
    Hooks.on('sidebarCollapse', () => setTimeout(_installAllRoots, 0));

    for (const delay of [0, 100, 250, 750, 1500, 3000]) {
      setTimeout(_installAllRoots, delay);
    }

    globalThis.SWSE ??= {};
    globalThis.SWSE.debug ??= {};
    globalThis.SWSE.debug.repairCompendiumClicks = () => _installAllRoots();
    globalThis.SWSE.debug.compendiumClickRepairStatus = () => _status();
    globalThis.SWSE.debug.openCompendiumPack = (packIdOrLabel) => {
      const raw = String(packIdOrLabel ?? '').trim();
      const byId = game.packs?.get?.(raw);
      if (byId) return byId.render(true);

      const label = _cleanLabel(raw);
      const match = game.packs?.find?.((pack) => _cleanLabel(pack.metadata?.label ?? pack.title) === label);
      return match ? match.render(true) : null;
    };

    SWSELogger.log('[CompendiumDirectoryClickRepair] Registered document-level pack opener fallback');
  } catch (err) {
    SWSELogger.warn('[CompendiumDirectoryClickRepair] Registration failed:', err);
  }
}

export default registerCompendiumDirectoryClickRepair;
