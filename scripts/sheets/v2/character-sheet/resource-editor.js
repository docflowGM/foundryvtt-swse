import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';

const STYLE_ID = 'swse-v2-character-resource-editor-style';

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureStyles(doc) {
  if (!doc || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .swse-v2-quick-resources {
      display: grid;
      grid-template-columns: repeat(2, minmax(150px, 1fr));
      gap: 8px;
      width: 100%;
      margin-top: 8px;
    }
    .swse-v2-quick-resource {
      display: grid;
      grid-template-columns: auto minmax(42px, 64px) auto minmax(42px, 64px);
      align-items: center;
      gap: 6px;
      min-width: 0;
      padding: 7px 9px;
      border: 1px solid rgba(90, 220, 255, .28);
      border-radius: 9px;
      background: rgba(3, 12, 24, .82);
      box-shadow: inset 0 0 16px rgba(40, 188, 255, .05);
    }
    .swse-v2-quick-resource > strong {
      color: #d9f8ff;
      font-size: 11px;
      letter-spacing: .08em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .swse-v2-quick-resource > span {
      color: rgba(215, 244, 255, .58);
      font-weight: 700;
    }
    .swse-v2-quick-resource input {
      box-sizing: border-box;
      width: 100% !important;
      min-width: 42px;
      height: 28px;
      margin: 0;
      padding: 3px 6px;
      text-align: center;
      color: #effcff;
      border: 1px solid rgba(104, 223, 255, .34);
      border-radius: 6px;
      background: rgba(0, 8, 18, .9);
    }
    .swse-v2-quick-resource input:focus {
      border-color: rgba(125, 255, 178, .7);
      box-shadow: 0 0 0 2px rgba(125, 255, 178, .12);
      outline: none;
    }
    .swse-v2-quick-resource.is-saving { opacity: .72; }
    .swse-v2-quick-resource.is-error { border-color: rgba(255, 92, 92, .72); }
    @media (max-width: 800px) {
      .swse-v2-quick-resources { grid-template-columns: 1fr; }
    }
  `;
  doc.head.appendChild(style);
}

function createResource(doc, {
  label,
  currentPath,
  maxPath,
  currentValue,
  maxValue,
  disabled = false
}) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'swse-v2-quick-resource';
  wrapper.dataset.resourceCurrentPath = currentPath;
  wrapper.dataset.resourceMaxPath = maxPath;

  const title = doc.createElement('strong');
  title.textContent = label;

  const current = doc.createElement('input');
  current.type = 'number';
  current.step = '1';
  current.min = '0';
  current.value = String(number(currentValue, 0));
  current.dataset.resourcePath = currentPath;
  current.setAttribute('aria-label', `Current ${label}`);
  current.title = `Current ${label}`;
  current.disabled = disabled;

  const separator = doc.createElement('span');
  separator.textContent = '/';

  const maximum = doc.createElement('input');
  maximum.type = 'number';
  maximum.step = '1';
  maximum.min = '0';
  maximum.value = String(number(maxValue, 0));
  maximum.dataset.resourcePath = maxPath;
  maximum.setAttribute('aria-label', `Maximum ${label}`);
  maximum.title = `Maximum ${label}`;
  maximum.disabled = disabled;

  wrapper.append(title, current, separator, maximum);
  return wrapper;
}

function resolveMount(root) {
  return root.querySelector('.sheet-header .header-center')
    || root.querySelector('.sheet-header')
    || root.querySelector('[data-shell-region="persistent-header"]')
    || root.querySelector('header');
}

export function bindCharacterResourceEditor(sheet, root, { signal } = {}) {
  if (!sheet?.actor || !root?.querySelector) return false;
  const doc = root.ownerDocument || document;
  ensureStyles(doc);

  root.querySelector('.swse-v2-quick-resources')?.remove();
  const mount = resolveMount(root);
  if (!mount) return false;

  const canEdit = sheet.isEditable !== false && sheet.actor?.isOwner !== false;
  const system = sheet.actor.system ?? {};
  const controls = doc.createElement('section');
  controls.className = 'swse-v2-quick-resources';
  controls.setAttribute('aria-label', 'Editable character resources');
  controls.append(
    createResource(doc, {
      label: 'HP',
      currentPath: 'system.hp.value',
      maxPath: 'system.hp.max',
      currentValue: system.hp?.value,
      maxValue: system.hp?.max,
      disabled: !canEdit
    }),
    createResource(doc, {
      label: 'Force Points',
      currentPath: 'system.forcePoints.value',
      maxPath: 'system.forcePoints.max',
      currentValue: system.forcePoints?.value,
      maxValue: system.forcePoints?.max,
      disabled: !canEdit
    })
  );
  mount.appendChild(controls);

  let committing = false;
  const commit = async (input) => {
    if (!canEdit || committing || !input?.dataset?.resourcePath) return;
    const path = input.dataset.resourcePath;
    const value = Math.max(0, Math.trunc(number(input.value, 0)));
    input.value = String(value);
    const card = input.closest('.swse-v2-quick-resource');
    card?.classList.remove('is-error');
    card?.classList.add('is-saving');
    committing = true;
    try {
      await ActorEngine.updateActor(sheet.actor, { [path]: value });
    } catch (error) {
      card?.classList.add('is-error');
      globalThis.ui?.notifications?.error?.(`Could not update ${path}: ${error?.message || error}`);
    } finally {
      committing = false;
      card?.classList.remove('is-saving');
    }
  };

  controls.addEventListener('change', event => {
    const input = event.target?.closest?.('[data-resource-path]');
    if (input) void commit(input);
  }, { signal });

  controls.addEventListener('keydown', event => {
    const input = event.target?.closest?.('[data-resource-path]');
    if (!input || event.key !== 'Enter') return;
    event.preventDefault();
    input.blur?.();
  }, { signal });

  return true;
}

export default bindCharacterResourceEditor;
