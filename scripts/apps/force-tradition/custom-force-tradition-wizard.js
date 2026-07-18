import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { TalentTreeDB } from '/systems/foundryvtt-swse/scripts/data/talent-tree-db.js';

/**
 * Custom Force Tradition Wizard
 *
 * Three-step house-rule wizard:
 * 1. Name of tradition
 * 2. Background / purpose / philosophy
 * 3. Talent access from existing trees plus custom talent references
 */

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
        <p>Grant access by choosing existing talent trees, then optionally list custom talents created elsewhere in the system.</p>
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

function bindWizard(html) {
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
}

export async function openCustomForceTraditionWizard(actor, { renderSheet = null } = {}) {
  if (!actor?.isOwner) {
    ui.notifications?.warn?.('You do not have permission to edit this actor.');
    return null;
  }

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
    render: bindWizard
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
