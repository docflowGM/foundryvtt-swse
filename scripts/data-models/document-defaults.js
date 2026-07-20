import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const DEFAULTS_PATH = 'systems/foundryvtt-swse/data/document-type-defaults.json';
let documentDefaults = null;

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return structuredClone(value);
}

function mergeDefaults(defaults, source) {
  if (globalThis.foundry?.utils?.mergeObject) {
    return foundry.utils.mergeObject(clone(defaults || {}), source || {}, {
      inplace: false,
      insertKeys: true,
      insertValues: true,
      overwrite: true,
      recursive: true,
    });
  }
  return { ...(defaults || {}), ...(source || {}) };
}

async function loadDocumentDefaults() {
  if (documentDefaults) return documentDefaults;
  const response = await fetch(DEFAULTS_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load ${DEFAULTS_PATH}: HTTP ${response.status}`);
  documentDefaults = await response.json();
  return documentDefaults;
}

function resolveTypeDefaults(documentName, type) {
  const domain = documentDefaults?.[documentName];
  if (!domain || !type) return {};
  const base = domain.templates?.base || {};
  const specific = domain[type] || {};
  const templateNames = Array.isArray(specific.templates) ? specific.templates : [];
  let merged = clone(base);
  for (const templateName of templateNames) {
    if (templateName === 'base') continue;
    merged = mergeDefaults(merged, domain.templates?.[templateName] || {});
  }
  const typeData = clone(specific);
  delete typeData.templates;
  return mergeDefaults(merged, typeData);
}

function applyDefaults(documentName, document, data = {}) {
  const defaults = resolveTypeDefaults(documentName, data.type || document.type);
  if (!Object.keys(defaults).length) return;
  const current = data.system || document._source?.system || {};
  const system = mergeDefaults(defaults, current);
  document.updateSource({ system });
}

export async function registerDocumentDefaultAuthority() {
  await loadDocumentDefaults();

  Hooks.on('preCreateActor', (actor, data) => applyDefaults('Actor', actor, data));
  Hooks.on('preCreateItem', (item, data) => applyDefaults('Item', item, data));

  globalThis.SWSE ??= {};
  globalThis.SWSE.documentDefaults = {
    get(documentName, type) {
      return clone(resolveTypeDefaults(documentName, type));
    },
    reload: async () => {
      documentDefaults = null;
      return loadDocumentDefaults();
    },
  };

  swseLogger.log('[DocumentDefaults] Registered V14 document default authority');
}
