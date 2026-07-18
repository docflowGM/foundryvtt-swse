import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { TalentTreeDB } from '/systems/foundryvtt-swse/scripts/data/talent-tree-db.js';
import { openCustomTalentTreeWorkbench } from '/systems/foundryvtt-swse/scripts/apps/talent-tree-workbench/custom-talent-tree-workbench.js';

/**
 * Custom Force Tradition Wizard
 *
 * Three-step house-rule wizard:
 * 1. Name of tradition
 * 2. Background / purpose / philosophy
 * 3. Talent access from existing trees, custom tree shells, plus custom talent references
 */

const STYLE_ID = 'swse-custom-force-tradition-wizard-styles';

function ensureWizardStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .swse-custom-tradition-wizard { display: flex; flex-direction: column; min-height: 0; color: var(--swse-force-picker-text-light, #b5daff); }
    .swse-custom-tradition-wizard__steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 14px 18px; border-bottom: 1px solid rgba(0, 170, 255, 0.2); }
    .swse-custom-tradition-wizard__steps button,
    .swse-custom-tradition-wizard__footer button,
    .swse-force-tradition-picker__create,
    .swse-custom-tradition-wizard__create-tree { border: 1px solid rgba(0, 170, 255, 0.28); border-radius: 6px; background: rgba(0, 0, 0, 0.24); color: var(--swse-force-picker-primary, #9ed0ff); padding: 8px 10px; cursor: pointer; font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 11px; letter-spacing: 0.04em; }
    .swse-custom-tradition-wizard__steps button.is-active,
    .swse-force-tradition-picker__create:hover,
    .swse-custom-tradition-wizard__create-tree:hover { border-color: var(--swse-force-picker-border-active, #00baff); background: rgba(0, 170, 255, 0.14); box-shadow: 0 0 12px rgba(0, 170, 255, 0.28); }
    .swse-custom-tradition-wizard__step { display: none; padding: 16px 18px; min-height: 360px; }
    .swse-custom-tradition-wizard__step.is-active { display: block; }
    .swse-custom-tradition-wizard__step h3 { margin: 0 0 6px; color: var(--swse-force-picker-accent, #00d9ff); font-family: var(--swse-font-orbit, Orbitron, system-ui, sans-serif); }
    .swse-custom-tradition-wizard__step p { margin: 0 0 14px; color: var(--swse-force-picker-text-secondary, #6a9dcd); line-height: 1.45; }
    .swse-custom-tradition-wizard__field { display: flex; flex-direction: column; gap: 6px; margin: 0 0 12px; }
    .swse-custom-tradition-wizard__field span { color: var(--swse-force-picker-primary, #9ed0ff); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
    .swse-custom-tradition-wizard__field input,
    .swse-custom-tradition-wizard__field textarea,
    .swse-custom-tradition-wizard__tree-toolbar input { width: 100%; box-sizing: border-box; border: 1px solid rgba(0, 170, 255, 0.28); border-radius: 6px; background: rgba(3, 10, 20, 0.62); color: var(--swse-force-picker-text-light, #b5daff); padding: 9px 11px; outline: none; }
    .swse-custom-tradition-wizard__field textarea { resize: vertical; min-height: 110px; }
    .swse-custom-tradition-wizard__tree-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .swse-custom-tradition-wizard__tree-count { white-space: nowrap; font-size: 11px; color: var(--swse-force-picker-text-muted, rgba(181,218,255,0.5)); font-family: var(--swse-font-mono, ui-monospace, monospace); }
    .swse-custom-tradition-wizard__tree-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-height: 260px; overflow-y: auto; padding-right: 4px; margin-bottom: 14px; }
    .swse-custom-tradition-wizard__tree { display: grid; grid-template-columns: 20px 1fr; gap: 8px; align-items: start; padding: 9px 10px; border: 1px solid rgba(0, 170, 255, 0.18); border-radius: 6px; background: rgba(10, 20, 34, 0.52); cursor: pointer; }
    .swse-custom-tradition-wizard__tree:hover { border-color: rgba(0, 217, 255, 0.58); background: rgba(0, 170, 255, 0.10); }
    .swse-custom-tradition-wizard__tree input { margin-top: 2px; accent-color: var(--swse-force-picker-accent, #00d9ff); }
    .swse-custom-tradition-wizard__tree strong { display: block; color: var(--swse-force-picker-text-light, #b5daff); font-size: 12px; }
    .swse-custom-tradition-wizard__tree small { display: block; color: var(--swse-force-picker-text-secondary, #6a9dcd); font-size: 10.5px; margin-top: 2px; }
    .swse-custom-tradition-wizard__tree[hidden] { display: none; }
    .swse-custom-tradition-wizard__empty { padding: 14px; border: 1px dashed rgba(0, 170, 255, 0.28); border-radius: 6px; color: var(--swse-force-picker-text-secondary, #6a9dcd); }
    .swse-custom-tradition-wizard__custom-tree-band { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 0 0 12px; padding: 10px 12px; border: 1px solid rgba(172, 130, 255, 0.28); border-radius: 8px; background: rgba(172, 130, 255, 0.08); }
    .swse-custom-tradition-wizard__custom-tree-band strong { display: block; color: #d7c2ff; font-size: 12px; }
    .swse-custom-tradition-wizard__custom-tree-band small { display: block; color: var(--swse-force-picker-text-secondary, #6a9dcd); font-size: 10.5px; margin-top: 2px; }
    .swse-custom-tradition-wizard__custom-tree-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
    .swse-custom-tradition-wizard__custom-tree-pill { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid rgba(172, 130, 255, 0.34); border-radius: 8px; background: rgba(10, 20, 34, 0.62); color: #d7c2ff; }
    .swse-custom-tradition-wizard__footer { display: flex; justify-content: space-between; padding: 12px 18px; border-top: 1px solid rgba(0, 170, 255, 0.2); }
    .swse-custom-tradition-wizard__footer button:disabled { opacity: 0.45; cursor: not-allowed; }
    .swse-force-tradition-picker__toolbar { display: flex; justify-content: flex-end; padding: 10px 18px 0; }
    .swse-force-tradition-picker__custom-badge { min-height: 23px; display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; border: 1px solid rgba(172, 130, 255, 0.44); background: rgba(172, 130, 255, 0.10); color: #d7c2ff; font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 10px; letter-spacing: 0.04em; }
    .swse-force-tradition-picker__option[data-custom] { border-style: dashed; }
    @media (max-width: 720px) { .swse-custom-tradition-wizard__tree-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function slugify(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function traditionValueFromForm(root) {
  const name = String(root.querySelector?.('input[name="name"]')?.value || '').trim();
  const alias = String(root.querySelector?.('input[name="alias"]')?.value || '').trim();
  const id = slugify(name || alias || 'custom-force-tradition');
  return id ? `custom:${id}` : '';
}

function existingCustomTraditions(actor) {
  const candidates = [
    actor?.system?.customForceTraditions,
    actor?.system?.progression?.customForceTraditions,
    actor?.flags?.['foundryvtt-swse']?.customForceTraditions,
    actor?.flags?.swse?.customForceTraditions
  ];
  const out = [];
  const seen = new Set();
  for (const source of candidates) {
    for (const entry of asArray(source)) {
      if (!entry || typeof entry !== 'object') continue;
      const id = slugify(entry.id || entry.key || entry.name);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({ ...entry, id });
    }
  }
  return out;
}

function treeSortLabel(tree = {}) {
  return String(tree.name || tree.displayName || tree.id || '').trim();
}

function forceRelevantTrees() {
  const all = TalentTreeDB.all?.() || [];
  const scored = all.map(tree => {
    const haystack = [tree.id, tree.name, tree.displayName, tree.role, tree.category, ...(Array.isArray(tree.tags) ? tree.tags : [])]
      .join(' ')
      .toLowerCase();
    const forceish = /force|jedi|sith|alter|control|sense|tradition|adept|witch|shaman|monk|sage|current|disciple|dervish|matukai|zeison|jensaarai|krath/.test(haystack);
    return { tree, forceish };
  });
  return scored
    .sort((a, b) => Number(b.forceish) - Number(a.forceish) || treeSortLabel(a.tree).localeCompare(treeSortLabel(b.tree)))
    .map(entry => entry.tree);
}

function buildTreeCards() {
  const trees = forceRelevantTrees();
  if (!trees.length) {
    return '<div class="swse-custom-tradition-wizard__empty">Talent trees have not loaded yet. You can still save custom talent names and return later to map trees.</div>';
  }

  return trees.map(tree => {
    const id = tree.id || tree.sourceId || tree.key || tree.name;
    const name = tree.name || tree.displayName || id;
    const count = Number(tree.talentCount || tree.talentNames?.length || tree.talentIds?.length || 0);
    const tags = [tree.role, tree.category, ...(Array.isArray(tree.tags) ? tree.tags : [])].filter(Boolean).slice(0, 3).join(' · ');
    return `
      <label class="swse-custom-tradition-wizard__tree" data-search="${escapeHtml(`${name} ${id} ${tags}`.toLowerCase())}">
        <input type="checkbox" name="grantedTalentTrees" value="${escapeHtml(id)}">
        <span>
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml(tags || 'Talent Tree')} ${count ? `· ${count} talents` : ''}</small>
        </span>
      </label>`;
  }).join('');
}

function buildWizardHtml() {
  return `
    <form class="swse-custom-tradition-wizard" data-step="1">
      <nav class="swse-custom-tradition-wizard__steps" aria-label="Custom tradition wizard steps">
        <button type="button" class="is-active" data-wizard-step-button="1">1 · Name</button>
        <button type="button" data-wizard-step-button="2">2 · Background</button>
        <button type="button" data-wizard-step-button="3">3 · Talents</button>
      </nav>

      <section class="swse-custom-tradition-wizard__step is-active" data-wizard-step="1">
        <h3>Name of Tradition</h3>
        <p>Give this Force tradition a name. The system will make a stable internal id from it.</p>
        <label class="swse-custom-tradition-wizard__field">
          <span>Tradition Name</span>
          <input type="text" name="name" placeholder="Order of the Shattered Lens" required>
        </label>
        <label class="swse-custom-tradition-wizard__field">
          <span>Short Label or Alias</span>
          <input type="text" name="alias" placeholder="Shattered Lens">
        </label>
      </section>

      <section class="swse-custom-tradition-wizard__step" data-wizard-step="2">
        <h3>Background</h3>
        <p>Describe the purpose, philosophy, and origin of the tradition. This is narrative-facing and can be edited later.</p>
        <label class="swse-custom-tradition-wizard__field">
          <span>Purpose / Philosophy</span>
          <textarea name="background" rows="7" placeholder="What does this tradition believe? How does it teach the Force? What makes it distinct?"></textarea>
        </label>
      </section>

      <section class="swse-custom-tradition-wizard__step" data-wizard-step="3">
        <h3>Talents</h3>
        <p>Grant access by choosing existing talent trees, create custom talent tree shells, then optionally list custom talents created elsewhere in the system.</p>
        <div class="swse-custom-tradition-wizard__custom-tree-band">
          <div>
            <strong>Custom Talent Trees</strong>
            <small>Phase 1 creates the tree container and attaches it to this custom tradition.</small>
          </div>
          <button type="button" class="swse-custom-tradition-wizard__create-tree" data-action="create-custom-talent-tree">+ Custom Tree</button>
        </div>
        <div class="swse-custom-tradition-wizard__custom-tree-list" data-custom-talent-tree-list></div>
        <div class="swse-custom-tradition-wizard__tree-toolbar">
          <input type="text" name="treeSearch" placeholder="Filter existing talent trees…" autocomplete="off">
          <span class="swse-custom-tradition-wizard__tree-count"></span>
        </div>
        <div class="swse-custom-tradition-wizard__tree-grid">${buildTreeCards()}</div>
        <label class="swse-custom-tradition-wizard__field">
          <span>Custom Talents</span>
          <textarea name="customTalents" rows="4" placeholder="One custom talent name or id per line"></textarea>
        </label>
      </section>

      <footer class="swse-custom-tradition-wizard__footer">
        <button type="button" data-wizard-back disabled>Back</button>
        <button type="button" data-wizard-next>Next</button>
      </footer>
    </form>`;
}

function dialogRoot(html) {
  return html?.[0] || html?.element || (html instanceof HTMLElement ? html : document);
}

function selectedTreeIds(root) {
  return Array.from(root.querySelectorAll?.('input[name="grantedTalentTrees"]:checked') ?? [])
    .map(input => String(input.value || '').trim())
    .filter(Boolean);
}

function customTalentValues(root) {
  return String(root.querySelector?.('textarea[name="customTalents"]')?.value || '')
    .split(/\r?\n/)
    .map(value => value.trim())
    .filter(Boolean);
}

function wizardValue(root) {
  const name = String(root.querySelector?.('input[name="name"]')?.value || '').trim();
  const alias = String(root.querySelector?.('input[name="alias"]')?.value || '').trim();
  const background = String(root.querySelector?.('textarea[name="background"]')?.value || '').trim();
  const id = slugify(name || alias);
  return {
    id,
    value: `custom:${id}`,
    name,
    alias,
    label: name,
    background,
    philosophy: background,
    grantedTalentTrees: selectedTreeIds(root),
    customTalents: customTalentValues(root),
    gmApproved: true,
    active: true,
    adopted: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function appendCustomTreeSelection(wizard, tree) {
  if (!wizard || !tree?.id) return;
  const list = wizard.querySelector('[data-custom-talent-tree-list]');
  const value = tree.value || `custom-tree:${tree.id}`;
  if (wizard.querySelector(`input[name="grantedTalentTrees"][value="${CSS.escape(value)}"]`)) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'swse-custom-tradition-wizard__custom-tree-pill';
  wrapper.dataset.customTreeId = tree.id;
  wrapper.innerHTML = `
    <span><strong>${escapeHtml(tree.name)}</strong><small>${escapeHtml(tree.treeType || 'custom')}</small></span>
    <span>Attached</span>
    <input type="checkbox" name="grantedTalentTrees" value="${escapeHtml(value)}" checked hidden>`;
  list?.appendChild(wrapper);
}

function bindWizard(html, actor = null) {
  const root = dialogRoot(html);
  const wizard = root.querySelector?.('.swse-custom-tradition-wizard');
  if (!wizard || wizard.dataset.bound === 'true') return;
  wizard.dataset.bound = 'true';

  const stepButtons = Array.from(wizard.querySelectorAll('[data-wizard-step-button]'));
  const stepPanels = Array.from(wizard.querySelectorAll('[data-wizard-step]'));
  const back = wizard.querySelector('[data-wizard-back]');
  const next = wizard.querySelector('[data-wizard-next]');
  const treeSearch = wizard.querySelector('input[name="treeSearch"]');
  const treeCount = wizard.querySelector('.swse-custom-tradition-wizard__tree-count');
  const createTreeButton = wizard.querySelector('[data-action="create-custom-talent-tree"]');
  const trees = () => Array.from(wizard.querySelectorAll('.swse-custom-tradition-wizard__tree'));
  let step = 1;

  const applyStep = () => {
    wizard.dataset.step = String(step);
    for (const button of stepButtons) button.classList.toggle('is-active', Number(button.dataset.wizardStepButton) === step);
    for (const panel of stepPanels) panel.classList.toggle('is-active', Number(panel.dataset.wizardStep) === step);
    if (back) back.disabled = step <= 1;
    if (next) next.textContent = step >= 3 ? 'Review' : 'Next';
  };
  const updateTreeCount = () => {
    if (!treeCount) return;
    const visible = trees().filter(tree => !tree.hidden).length;
    treeCount.textContent = `${visible} / ${trees().length}`;
  };

  applyStep();
  updateTreeCount();

  stepButtons.forEach(button => button.addEventListener('click', () => {
    step = Math.max(1, Math.min(3, Number(button.dataset.wizardStepButton) || 1));
    applyStep();
  }));
  back?.addEventListener('click', () => { step = Math.max(1, step - 1); applyStep(); });
  next?.addEventListener('click', () => { step = Math.min(3, step + 1); applyStep(); });
  treeSearch?.addEventListener('input', () => {
    const query = String(treeSearch.value || '').trim().toLowerCase();
    for (const tree of trees()) tree.hidden = !!query && !String(tree.dataset.search || '').includes(query);
    updateTreeCount();
  });

  createTreeButton?.addEventListener('click', async event => {
    event.preventDefault();
    event.stopPropagation();
    if (!actor) {
      ui?.notifications?.warn?.('Could not resolve actor for custom talent tree creation.');
      return;
    }
    const attachToTradition = traditionValueFromForm(root);
    if (!attachToTradition || attachToTradition === 'custom:custom-force-tradition') {
      ui?.notifications?.warn?.('Name the custom Force tradition before creating an attached custom talent tree.');
      return;
    }
    const tree = await openCustomTalentTreeWorkbench(actor, {
      attachToTradition,
      treeType: 'force-tradition',
      name: `${String(root.querySelector?.('input[name="name"]')?.value || 'Custom')} Talent Tree`
    });
    if (tree) appendCustomTreeSelection(wizard, tree);
  });
}

export async function openCustomForceTraditionWizard(actor, { renderSheet = null } = {}) {
  if (!actor?.isOwner) {
    ui.notifications?.warn?.('You do not have permission to edit this actor.');
    return null;
  }

  ensureWizardStyles();

  const result = await SWSEDialogV2.wait({
    title: 'Create Custom Force Tradition',
    content: buildWizardHtml(),
    buttons: {
      cancel: {
        icon: '<i class="fa-solid fa-times"></i>',
        label: game?.i18n?.localize?.('Cancel') ?? 'Cancel',
        callback: () => null
      },
      ok: {
        icon: '<i class="fa-solid fa-check"></i>',
        label: 'Create Tradition',
        callback: (html) => wizardValue(dialogRoot(html))
      }
    },
    default: 'ok',
    render: (html) => bindWizard(html, actor)
  }, {
    width: 860,
    classes: ['swse-force-tradition-picker-dialog', 'swse-custom-tradition-wizard-dialog']
  });

  if (!result) return null;
  if (!result.name || !result.id) {
    ui.notifications?.warn?.('Custom Force tradition requires a name.');
    return null;
  }

  const existing = existingCustomTraditions(actor).filter(entry => entry.id !== result.id);
  const customTraditions = [...existing, result];
  const currentMemberships = [
    ...asArray(actor?.system?.forceTraditions),
    ...asArray(actor?.system?.progression?.forceTraditions),
    ...asArray(actor?.flags?.['foundryvtt-swse']?.forceTraditions),
    ...asArray(actor?.flags?.swse?.forceTraditions),
  ].map(value => typeof value === 'object' ? (value.value || value.id || value.name) : value).filter(Boolean);
  const memberships = Array.from(new Set([...currentMemberships, result.value]));

  await ActorEngine.updateActor(actor, {
    'system.customForceTraditions': customTraditions,
    'system.progression.customForceTraditions': customTraditions,
    'system.forceTraditions': memberships,
    'system.progression.forceTraditions': memberships,
    'flags.foundryvtt-swse.customForceTraditions': customTraditions,
    'flags.foundryvtt-swse.forceTraditions': memberships,
    'flags.swse.customForceTraditions': customTraditions,
    'flags.swse.forceTraditions': memberships,
  }, {
    meta: { guardKey: `custom-force-tradition-${result.id}` },
    source: 'custom-force-tradition-wizard'
  });

  ui.notifications?.info?.(`Created custom Force tradition: ${result.name}.`);
  if (typeof renderSheet === 'function') renderSheet();
  return result;
}

export function getCustomForceTraditions(actor) {
  return existingCustomTraditions(actor);
}
