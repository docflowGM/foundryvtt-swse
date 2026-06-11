/**
 * CompendiumDirectory Click Repair
 *
 * Foundry v13's CompendiumDirectory is an ApplicationV2 sidebar app. When its
 * native row action delegation fails, the pack apps themselves can still open
 * through `game.packs.get(id).render(true)`. This repair installs a narrow,
 * capture-phase fallback opener for native compendium pack rows.
 *
 * Important invariant: the resolver must never resolve a click from a broad
 * directory container. A broad container contains many pack cards, so label or
 * child-attribute fallback there will always drift toward the first visible
 * pack. Every open must resolve from the clicked card/row itself.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

// ---------------------------------------------------------------------------
// Debug gate — same pattern as compendium-pack-registration-repair.js
// ---------------------------------------------------------------------------
function _isDebug() {
  if (globalThis.SWSE_DEBUG_COMPENDIUMS === true) return true;
  try { return game?.settings?.get?.("foundryvtt-swse", "debugMode") === true; } catch (_e) { return false; }
}

function _dlog(...args) {
  if (!_isDebug()) return;
  console.log("[SWSE-COMPENDIUM-CLICK]", ...args);
}

const REPAIR_FLAG = 'swseCompendiumClickRepairInstalled';
const DOCUMENT_FLAG = '__swseCompendiumClickRepairDocumentInstalled';
const ROOT_FLAG = '__swseCompendiumClickRepairRoots';

let registered = false;

const ROOT_SELECTOR = [
  '#sidebar #compendium',
  '#sidebar .compendium-sidebar',
  '#sidebar [data-tab="compendium"]',
  '#sidebar [data-application-part="directory"]',
  '#compendium',
  '.compendium-sidebar'
].join(',');

const PACK_DATA_SELECTOR = [
  '[data-pack]',
  '[data-pack-id]',
  '[data-collection]',
  '[data-collection-id]',
  '[data-uuid^="Compendium."]'
].join(',');

const PACK_ROW_SELECTOR = [
  'li.directory-item',
  'li.compendium',
  'li.pack',
  '.directory-item.compendium',
  '.compendium.directory-item',
  '.compendium-pack',
  '.pack-card',
  '.pack-row',
  '[role="listitem"]',
  '[data-pack]',
  '[data-pack-id]',
  '[data-collection]',
  '[data-collection-id]',
  '[data-uuid^="Compendium."]'
].join(',');

const TITLE_SELECTOR = [
  '.pack-title',
  '.entry-name',
  '.document-name',
  '.directory-item-name',
  '.compendium-name',
  '.pack-name',
  '.name',
  'h1',
  'h2',
  'h3',
  'h4',
  'label',
  'a',
  'span'
].join(',');

const POINT_CANDIDATE_SELECTOR = [
  PACK_ROW_SELECTOR,
  'button',
  'article',
  'li',
  'div'
].join(',');

const BROAD_CONTAINER_SELECTOR = [
  'html',
  'body',
  'main',
  'aside',
  'section',
  'nav',
  'ol',
  'ul',
  '#sidebar',
  '#sidebar-content',
  '#compendium',
  '.sidebar-tab',
  '.directory-list',
  '.directory',
  '.tab',
  '[data-application-part="directory"]',
  '[data-application-part="content"]'
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
  'button[data-action]:not([data-action="open"]):not([data-action="render"]):not([data-action="browse"]):not([data-action="view"])',
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

function _cleanLabel(text) {
  return String(text ?? '')
    .replace(/foundryvtt-swse/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\d+\b/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .trim()
    .toLowerCase();
}

function _allPacks() {
  if (Array.isArray(game.packs?.contents)) return game.packs.contents;
  if (typeof game.packs?.filter === 'function') return game.packs.filter(() => true);
  return Array.from(game.packs ?? []);
}

function _packLabel(pack) {
  const meta = pack?.metadata ?? {};
  return meta.label ?? pack?.title ?? pack?.collection ?? meta.id ?? '';
}

function _normalizePackId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  if (raw.startsWith('Compendium.')) {
    const parts = raw.split('.').filter(Boolean);
    if (parts.length >= 3) {
      const collection = `${parts[1]}.${parts[2]}`;
      return game.packs?.has?.(collection) ? collection : null;
    }
  }

  return raw.includes('.') && game.packs?.has?.(raw) ? raw : null;
}

function _resolvePackIdFromText(text) {
  const label = _cleanLabel(text);
  if (!label) return null;

  const packs = _allPacks();
  const exact = packs.filter(pack => _cleanLabel(_packLabel(pack)) === label);
  if (exact.length === 1) return exact[0].collection;

  const contained = packs.filter(pack => {
    const packLabel = _cleanLabel(_packLabel(pack));
    return packLabel && label.includes(packLabel);
  });
  if (contained.length === 1) return contained[0].collection;

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

function _resolvePackIdFromData(element) {
  if (!(element instanceof HTMLElement)) return null;
  for (const candidate of _candidateValuesFromElement(element)) {
    const packId = _normalizePackId(candidate);
    if (packId) return packId;
  }
  return null;
}

function _isInsideCompendiumDirectory(element) {
  if (!(element instanceof Element)) return false;
  if (element.closest(ROOT_SELECTOR)) return true;

  const directory = element.closest('[data-application-part="directory"]');
  if (!directory) return false;

  if (directory.querySelector(PACK_DATA_SELECTOR)) return true;
  return Array.from(directory.querySelectorAll(TITLE_SELECTOR))
    .some(el => _resolvePackIdFromText(el.textContent || el.getAttribute?.('title') || el.dataset?.tooltip));
}

function _queryRoots() {
  const roots = new Set();

  const direct = _getApplicationElement(ui?.compendium);
  if (direct) roots.add(direct);

  for (const selector of [ROOT_SELECTOR, '[data-application-part="directory"]']) {
    for (const el of document.querySelectorAll(selector)) {
      if (el instanceof HTMLElement && _isInsideCompendiumDirectory(el)) roots.add(el);
    }
  }

  return Array.from(roots);
}

function _nearestRoot(element) {
  if (!(element instanceof Element)) return null;
  const explicit = element.closest(ROOT_SELECTOR);
  if (explicit instanceof HTMLElement) return explicit;
  const directory = element.closest('[data-application-part="directory"]');
  return directory instanceof HTMLElement && _isInsideCompendiumDirectory(directory) ? directory : null;
}

function _visibleText(element) {
  if (!(element instanceof HTMLElement)) return '';
  const title = element.getAttribute('title') || element.dataset?.tooltip || '';
  const aria = element.getAttribute('aria-label') || '';
  const own = element.textContent || '';
  return `${title} ${aria} ${own}`;
}

function _packIdsInElementText(element) {
  if (!(element instanceof HTMLElement)) return [];
  const text = _cleanLabel(_visibleText(element));
  if (!text) return [];

  const matches = [];
  for (const pack of _allPacks()) {
    const label = _cleanLabel(_packLabel(pack));
    if (label && text.includes(label)) matches.push(pack.collection);
  }
  return Array.from(new Set(matches));
}

function _hasSinglePackLabel(element) {
  return _packIdsInElementText(element).length === 1;
}

function _isBroadContainer(element) {
  if (!(element instanceof HTMLElement)) return true;
  if (element.matches(BROAD_CONTAINER_SELECTOR)) return true;
  if (element.querySelectorAll?.(PACK_ROW_SELECTOR)?.length > 1) return true;
  if (_packIdsInElementText(element).length > 1) return true;
  return false;
}

function _resolvePackIdFromRow(element) {
  if (!(element instanceof HTMLElement) || _isBroadContainer(element)) return null;

  const ownData = _resolvePackIdFromData(element);
  if (ownData) return ownData;

  // Only use descendant data when this candidate is a single-card row. This is
  // the guard that prevents a directory/list container from opening its first
  // child every time.
  for (const child of Array.from(element.querySelectorAll(PACK_DATA_SELECTOR))) {
    if (!(child instanceof HTMLElement)) continue;
    const childData = _resolvePackIdFromData(child);
    if (childData) return childData;
  }

  const titleTexts = Array.from(element.querySelectorAll(TITLE_SELECTOR))
    .map(el => _visibleText(el))
    .filter(Boolean);
  for (const text of titleTexts) {
    const packId = _resolvePackIdFromText(text);
    if (packId) return packId;
  }

  const textMatches = _packIdsInElementText(element);
  return textMatches.length === 1 ? textMatches[0] : null;
}

function _rectContainsPoint(element, x, y) {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function _scoreCandidate(element) {
  const rect = element.getBoundingClientRect();
  const area = Math.max(1, rect.width * rect.height);
  const depth = (() => {
    let count = 0;
    let node = element;
    while (node?.parentElement) {
      count += 1;
      node = node.parentElement;
    }
    return count;
  })();
  return { area, depth };
}

function _findPackElementFromPoint(event) {
  const target = event?.target;
  if (!(target instanceof Element)) return null;

  const root = _nearestRoot(target);
  if (!(root instanceof HTMLElement)) return null;

  const x = Number(event.clientX);
  const y = Number(event.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const candidates = Array.from(root.querySelectorAll(POINT_CANDIDATE_SELECTOR))
    .filter(el => el instanceof HTMLElement)
    .filter(el => _rectContainsPoint(el, x, y))
    .filter(el => !_isBroadContainer(el) || _hasSinglePackLabel(el))
    .map(el => ({ el, packId: _resolvePackIdFromRow(el), score: _scoreCandidate(el) }))
    .filter(candidate => candidate.packId)
    .sort((a, b) => (a.score.area - b.score.area) || (b.score.depth - a.score.depth));

  const best = candidates[0];
  return best ? { element: best.el, packId: best.packId } : null;
}

function _findPackElementFromPath(event) {
  const target = event?.target;
  if (!(target instanceof Element)) return null;
  if (!_isInsideCompendiumDirectory(target)) return null;

  const path = typeof event.composedPath === 'function'
    ? event.composedPath().filter(el => el instanceof HTMLElement)
    : [];

  const seen = new Set();
  for (const el of path) {
    if (!(el instanceof HTMLElement)) continue;
    if (seen.has(el)) continue;
    seen.add(el);
    if (!_isInsideCompendiumDirectory(el)) break;
    if (el.matches(ROOT_SELECTOR) || el.matches(BROAD_CONTAINER_SELECTOR)) break;

    const row = el.matches(PACK_ROW_SELECTOR) ? el : el.closest?.(PACK_ROW_SELECTOR);
    for (const candidate of [el, row]) {
      if (!(candidate instanceof HTMLElement) || seen.has(candidate)) continue;
      seen.add(candidate);
      const packId = _resolvePackIdFromRow(candidate);
      if (packId) return { element: candidate, packId };
    }
  }

  return null;
}

function _findPackElementFromEvent(event) {
  return _findPackElementFromPoint(event) || _findPackElementFromPath(event);
}

function _isControlClick(target, packElement) {
  if (!(target instanceof Element) || !(packElement instanceof HTMLElement)) return false;

  const control = target.closest(CONTROL_SELECTOR);
  if (!control) return false;
  if (control === packElement) return false;
  if (packElement.contains(control) && _resolvePackIdFromRow(control) === _resolvePackIdFromRow(packElement)) return false;
  return true;
}

async function _openPackFromEvent(event, source = 'document') {
  try {
    if (event.defaultPrevented) return false;
    if (!(event.target instanceof Element)) return false;

    // --- Diagnostic: log every click that reaches this handler when debug is on ---
    if (_isDebug()) {
      const tgt = event.target;
      _dlog(`Click intercepted [source=${source}]`, {
        tag: tgt.tagName,
        id: tgt.id || null,
        className: tgt.className || null,
        dataset: { ...tgt.dataset },
        insideCompendiumDir: _isInsideCompendiumDirectory(tgt)
      });
    }

    const resolved = _findPackElementFromEvent(event);

    if (!resolved?.packId) {
      _dlog(`  → could not resolve pack id from click target; skipping`);
      return false;
    }

    _dlog(`  → resolved packId="${resolved.packId}" from element`, {
      tag: resolved.element?.tagName,
      className: resolved.element?.className || null,
      dataset: { ...resolved.element?.dataset }
    });

    if (_isControlClick(event.target, resolved.element)) {
      _dlog(`  → control click detected; skipping`);
      return false;
    }

    const pack = game.packs?.get?.(resolved.packId);
    if (!pack) {
      // This is important diagnostic info: we resolved an id but game.packs doesn't have it.
      console.warn(`[SWSE-COMPENDIUM-CLICK] Resolved packId="${resolved.packId}" but game.packs.get() returned undefined.`, {
        gamePacks: game.packs?.size ?? "?",
        allKeys: Array.from(game.packs?.keys?.() || []).filter(k => k.includes("swse") || k.includes("foundryvtt"))
      });
      return false;
    }

    _dlog(`  → game.packs.get("${resolved.packId}") OK`, {
      collection: pack.collection,
      label: pack.metadata?.label,
      locked: pack.locked
    });

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    SWSELogger.log(`[CompendiumDirectoryClickRepair] Opening ${resolved.packId} from ${source} fallback`);
    _dlog(`  → calling pack.render(true) for "${resolved.packId}"`);
    try {
      await pack.render(true);
      _dlog(`  → pack.render(true) resolved for "${resolved.packId}"`);
    } catch (renderErr) {
      console.error(`[SWSE-COMPENDIUM-CLICK] pack.render(true) threw for "${resolved.packId}":`, renderErr?.message, renderErr?.stack || renderErr);
    }
    return true;
  } catch (err) {
    SWSELogger.warn('[CompendiumDirectoryClickRepair] Failed to open pack from sidebar click:', err);
    console.error('[SWSE-COMPENDIUM-CLICK] _openPackFromEvent threw:', err?.message, err?.stack || err);
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
  const packDataRows = document.querySelectorAll(PACK_DATA_SELECTOR).length;
  const resolvableTitles = Array.from(document.querySelectorAll(TITLE_SELECTOR))
    .filter(el => _resolvePackIdFromText(el.textContent || el.getAttribute?.('title') || el.dataset?.tooltip)).length;
  return {
    registered,
    documentInstalled: !!document[DOCUMENT_FLAG],
    rootsFound: roots.length,
    rootsWithRepairFlag: roots.filter(root => root.dataset?.[REPAIR_FLAG] === 'true').length,
    packDataRows,
    resolvableTitles,
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

      // Diagnostic: log which packs the sidebar DOM actually shows vs what game.packs has.
      if (_isDebug()) {
        const domRoot = root || document.querySelector('#compendium, .compendium-sidebar');
        const domPackIds = domRoot
          ? Array.from(domRoot.querySelectorAll('[data-pack],[data-pack-id],[data-collection],[data-collection-id]'))
              .map(el => el.dataset.pack || el.dataset.packId || el.dataset.collection || el.dataset.collectionId)
              .filter(Boolean)
          : [];
        const gamePacks = Array.from(game?.packs?.keys?.() || []).filter(k => k.startsWith(game?.system?.id || "foundryvtt-swse"));
        const watchKeys = [
          "foundryvtt-swse.feats",
          "foundryvtt-swse.lightsaberformpowers",
          "foundryvtt-swse.heroic",
          "foundryvtt-swse.nonheroic"
        ];
        console.group("[SWSE-COMPENDIUM-CLICK] renderCompendiumDirectory fired");
        _dlog(`  DOM pack elements (${domPackIds.length}):`, domPackIds);
        _dlog(`  game.packs system keys (${gamePacks.length}):`, gamePacks);
        for (const k of watchKeys) {
          const inGamePacks = game?.packs?.has?.(k) ?? false;
          const inDom = domPackIds.some(id => id === k || id.endsWith(`.${k.split(".")[1]}`));
          const marker = inGamePacks && inDom ? "✅" : inGamePacks && !inDom ? "⚠️ in game.packs but NOT in DOM" : "❌ NOT in game.packs";
          _dlog(`  ${marker}  ${k}`);
        }
        console.groupEnd();
      }
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
    globalThis.SWSE.debug.resolveCompendiumClickTarget = (element = document.activeElement) => _resolvePackIdFromRow(element);
    globalThis.SWSE.debug.openCompendiumPack = (packIdOrLabel) => {
      const raw = String(packIdOrLabel ?? '').trim();
      const byId = game.packs?.get?.(raw);
      if (byId) return byId.render(true);

      const matchId = _resolvePackIdFromText(raw);
      const match = matchId ? game.packs?.get?.(matchId) : null;
      return match ? match.render(true) : null;
    };

    SWSELogger.log('[CompendiumDirectoryClickRepair] Registered document-level pack opener fallback');
  } catch (err) {
    SWSELogger.warn('[CompendiumDirectoryClickRepair] Registration failed:', err);
  }
}

export default registerCompendiumDirectoryClickRepair;
