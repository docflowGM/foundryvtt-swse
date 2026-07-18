import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import {
  createBlankCustomTalentTree,
  getCustomTalentTree,
  normalizeCustomTalentTree,
  saveCustomTalentTree,
  slugifyCustomTalentTree
} from '/systems/foundryvtt-swse/scripts/apps/talent-tree-workbench/custom-talent-tree-model.js';

/**
 * Custom Talent Tree Workbench
 *
 * Phase 1 shell only: metadata editor, empty graph-style canvas, + Add Talent
 * placeholder, and governed save. Talent import/drag-drop arrive in later phases.
 */

const STYLE_ID = 'swse-custom-talent-tree-workbench-styles';
const TREE_TYPES = Object.freeze({
  FORCE_TRADITION: 'force-tradition',
  CLASS: 'class',
  PRESTIGE_CLASS: 'prestige-class',
  SPECIES: 'species',
  GENERIC: 'generic'
});

function ensureWorkbenchStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .swse-custom-tree-workbench { min-height: 0; color: var(--swse-force-picker-text-light, #b5daff); background: linear-gradient(135deg, rgba(6, 12, 22, 0.96), rgba(10, 20, 34, 0.94)); }
    .swse-custom-tree-workbench__header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; padding: 16px 18px 12px; border-bottom: 1px solid rgba(0, 170, 255, 0.22); }
    .swse-custom-tree-workbench__header h2 { margin: 0 0 4px; color: var(--swse-force-picker-accent, #00d9ff); font-family: var(--swse-font-orbit, Orbitron, system-ui, sans-serif); font-size: 18px; }
    .swse-custom-tree-workbench__header p { margin: 0; color: var(--swse-force-picker-text-secondary, #6a9dcd); font-size: 12px; line-height: 1.45; }
    .swse-custom-tree-workbench__badge { flex: 0 0 auto; border: 1px solid rgba(172, 130, 255, 0.44); background: rgba(172, 130, 255, 0.10); color: #d7c2ff; border-radius: 999px; padding: 5px 9px; font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
    .swse-custom-tree-workbench__body { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 14px; padding: 14px 18px 18px; min-height: 470px; }
    .swse-custom-tree-workbench__panel { border: 1px solid rgba(0, 170, 255, 0.20); border-radius: 10px; background: rgba(2, 9, 18, 0.50); box-shadow: inset 0 0 22px rgba(0, 170, 255, 0.06); overflow: hidden; }
    .swse-custom-tree-workbench__panel-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid rgba(0, 170, 255, 0.18); color: var(--swse-force-picker-primary, #9ed0ff); font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
    .swse-custom-tree-workbench__fields { padding: 12px; display: flex; flex-direction: column; gap: 11px; }
    .swse-custom-tree-workbench__field { display: flex; flex-direction: column; gap: 5px; }
    .swse-custom-tree-workbench__field span { color: var(--swse-force-picker-primary, #9ed0ff); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
    .swse-custom-tree-workbench__field input,
    .swse-custom-tree-workbench__field textarea,
    .swse-custom-tree-workbench__field select { width: 100%; box-sizing: border-box; border: 1px solid rgba(0, 170, 255, 0.28); border-radius: 6px; background: rgba(3, 10, 20, 0.72); color: var(--swse-force-picker-text-light, #b5daff); padding: 8px 10px; outline: none; }
    .swse-custom-tree-workbench__field textarea { min-height: 96px; resize: vertical; }
    .swse-custom-tree-workbench__graph { position: relative; min-height: 420px; overflow: hidden; background: radial-gradient(circle at 50% 40%, rgba(0, 217, 255, 0.10), transparent 38%), linear-gradient(90deg, rgba(0, 170, 255, 0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(0, 170, 255, 0.08) 1px, transparent 1px); background-size: auto, 48px 48px, 48px 48px; }
    .swse-custom-tree-workbench__graph::after { content: ''; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 70px rgba(0, 0, 0, 0.54); }
    .swse-custom-tree-workbench__empty-graph { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; text-align: center; }
    .swse-custom-tree-workbench__plus-node { width: 180px; height: 180px; border-radius: 50%; border: 1px solid rgba(0, 217, 255, 0.48); background: radial-gradient(circle, rgba(0, 217, 255, 0.16), rgba(0, 170, 255, 0.05) 62%, transparent); color: var(--swse-force-picker-primary, #9ed0ff); box-shadow: 0 0 28px rgba(0, 217, 255, 0.18), inset 0 0 28px rgba(0, 217, 255, 0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
    .swse-custom-tree-workbench__plus-node strong { font-size: 48px; line-height: 1; color: var(--swse-force-picker-accent, #00d9ff); text-shadow: 0 0 16px rgba(0, 217, 255, 0.55); }
    .swse-custom-tree-workbench__plus-node span { font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 11px; letter-spacing: 0.10em; text-transform: uppercase; }
    .swse-custom-tree-workbench__node-count { color: var(--swse-force-picker-text-muted, rgba(181,218,255,0.5)); font-size: 10px; }
    .swse-custom-tree-workbench__node-list { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 12px; align-content: flex-start; padding: 18px; }
    .swse-custom-tree-workbench__node-card { width: 150px; min-height: 88px; border: 1px solid rgba(0, 217, 255, 0.32); border-radius: 10px; background: rgba(8, 20, 34, 0.82); padding: 10px; box-shadow: 0 0 16px rgba(0, 217, 255, 0.10); }
    .swse-custom-tree-workbench__node-card strong { display: block; color: var(--swse-force-picker-text-light, #b5daff); font-size: 12px; }
    .swse-custom-tree-workbench__node-card small { display: block; margin-top: 5px; color: var(--swse-force-picker-text-secondary, #6a9dcd); font-size: 10px; }
    .swse-custom-tree-workbench__phase-note { padding: 10px 12px; color: var(--swse-force-picker-text-secondary, #6a9dcd); font-size: 11px; line-height: 1.45; border-top: 1px solid rgba(0, 170, 255, 0.16); }
    @media (max-width: 820px) { .swse-custom-tree-workbench__body { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function option(value, label, selected) {
  return `<option value="${escapeHtml(value)}" ${selected === value ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function graphHtml(tree) {
  const nodes = Array.isArray(tree.nodes) ? tree.nodes : [];
  if (!nodes.length) {
    return `
      <div class="swse-custom-tree-workbench__empty-graph">
        <button type="button" class="swse-custom-tree-workbench__plus-node" data-action="custom-tree-add-talent">
          <strong>+</strong>
          <span>Add Talent</span>
          <small>Phase 2 imports arrive next</small>
        </button>
      </div>`;
  }
  return `
    <div class="swse-custom-tree-workbench__node-list">
      ${nodes.map(node => `
        <article class="swse-custom-tree-workbench__node-card" data-node-id="${escapeHtml(node.nodeId)}">
          <strong>${escapeHtml(node.name)}</strong>
          <small>${escapeHtml(node.sourceType || 'custom')} · ${escapeHtml(node.importMode || 'custom')}</small>
        </article>`).join('')}
      <button type="button" class="swse-custom-tree-workbench__plus-node" data-action="custom-tree-add-talent">
        <strong>+</strong>
        <span>Add Talent</span>
      </button>
    </div>`;
}

function buildWorkbenchHtml(tree, context = {}) {
  const attached = context.attachToTradition || tree.grantedByTraditions?.[0] || '';
  return `
    <form class="swse-custom-tree-workbench" data-custom-tree-workbench>
      <header class="swse-custom-tree-workbench__header">
        <div>
          <h2>Custom Talent Tree Workbench</h2>
          <p>Create the tree shell now. Talent import, prerequisite-chain import, and drag/drop are intentionally deferred until the model is stable.</p>
        </div>
        <span class="swse-custom-tree-workbench__badge">Phase 1 Shell</span>
      </header>
      <section class="swse-custom-tree-workbench__body">
        <aside class="swse-custom-tree-workbench__panel">
          <div class="swse-custom-tree-workbench__panel-title">
            <span>Tree Metadata</span>
            <span class="swse-custom-tree-workbench__node-count">${Number(tree.nodes?.length || 0)} Nodes</span>
          </div>
          <div class="swse-custom-tree-workbench__fields">
            <label class="swse-custom-tree-workbench__field">
              <span>Tree Name</span>
              <input type="text" name="name" value="${escapeHtml(tree.name || '')}" placeholder="Shattered Lens Seers" required>
            </label>
            <label class="swse-custom-tree-workbench__field">
              <span>Description / Theme</span>
              <textarea name="description" rows="5" placeholder="What kind of talents belong in this tree?">${escapeHtml(tree.description || '')}</textarea>
            </label>
            <label class="swse-custom-tree-workbench__field">
              <span>Tree Type</span>
              <select name="treeType">
                ${option(TREE_TYPES.FORCE_TRADITION, 'Force Tradition Tree', tree.treeType)}
                ${option(TREE_TYPES.CLASS, 'Class Tree', tree.treeType)}
                ${option(TREE_TYPES.PRESTIGE_CLASS, 'Prestige Class Tree', tree.treeType)}
                ${option(TREE_TYPES.SPECIES, 'Species Tree', tree.treeType)}
                ${option(TREE_TYPES.GENERIC, 'Generic / GM Granted', tree.treeType)}
              </select>
            </label>
            <label class="swse-custom-tree-workbench__field">
              <span>Granted By Tradition</span>
              <input type="text" name="grantedByTraditions" value="${escapeHtml(attached)}" placeholder="custom:order-of-the-shattered-lens">
            </label>
            <label class="swse-custom-tree-workbench__field">
              <span>Internal ID</span>
              <input type="text" name="id" value="${escapeHtml(tree.id || '')}" placeholder="auto-generated-from-name">
            </label>
          </div>
          <p class="swse-custom-tree-workbench__phase-note">Phase 1 saves an actor-scoped custom tree shell mirrored through system/progression/flag paths. Later phases plug this into TalentTreeDB and the progression picker.</p>
        </aside>
        <main class="swse-custom-tree-workbench__panel">
          <div class="swse-custom-tree-workbench__panel-title">
            <span>Talent Graph</span>
            <span>Editor Preview</span>
          </div>
          <div class="swse-custom-tree-workbench__graph" data-custom-tree-graph>
            ${graphHtml(tree)}
          </div>
        </main>
      </section>
    </form>`;
}

function rootFromHtml(html) {
  return html?.[0] || html?.element || (html instanceof HTMLElement ? html : document);
}

function bindWorkbench(html) {
  const root = rootFromHtml(html);
  const workbench = root.querySelector?.('[data-custom-tree-workbench]');
  if (!workbench || workbench.dataset.bound === 'true') return;
  workbench.dataset.bound = 'true';
  workbench.querySelectorAll('[data-action="custom-tree-add-talent"]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      ui?.notifications?.info?.('Talent import is Phase 2. This shell is saving the custom tree container first.');
    });
  });
}

function treeFromForm(html, original = {}, context = {}) {
  const root = rootFromHtml(html);
  const name = String(root.querySelector?.('input[name="name"]')?.value || '').trim();
  const id = slugifyCustomTalentTree(root.querySelector?.('input[name="id"]')?.value || name || original.id);
  const description = String(root.querySelector?.('textarea[name="description"]')?.value || '').trim();
  const treeType = String(root.querySelector?.('select[name="treeType"]')?.value || original.treeType || TREE_TYPES.FORCE_TRADITION).trim();
  const grantedByTraditions = String(root.querySelector?.('input[name="grantedByTraditions"]')?.value || context.attachToTradition || '')
    .split(/[\n,;]/)
    .map(value => value.trim())
    .filter(Boolean);
  return normalizeCustomTalentTree({
    ...original,
    id,
    name: name || original.name || 'New Custom Talent Tree',
    description,
    treeType,
    grantedByTraditions,
    nodes: original.nodes || [],
    edges: original.edges || [],
    gmApproved: true,
    active: true
  });
}

export async function openCustomTalentTreeWorkbench(actor, options = {}) {
  if (!actor?.isOwner) {
    ui?.notifications?.warn?.('You do not have permission to edit this actor.');
    return null;
  }
  ensureWorkbenchStyles();

  const existing = options.treeId ? getCustomTalentTree(actor, options.treeId) : null;
  const initial = existing || createBlankCustomTalentTree({
    name: options.name || 'New Custom Talent Tree',
    description: options.description || '',
    treeType: options.treeType || TREE_TYPES.FORCE_TRADITION,
    attachToTradition: options.attachToTradition || ''
  });

  const result = await SWSEDialogV2.wait({
    title: existing ? `Edit Custom Talent Tree: ${initial.name}` : 'Create Custom Talent Tree',
    content: buildWorkbenchHtml(initial, options),
    buttons: {
      cancel: {
        icon: '<i class="fa-solid fa-times"></i>',
        label: game?.i18n?.localize?.('Cancel') ?? 'Cancel',
        callback: () => null
      },
      ok: {
        icon: '<i class="fa-solid fa-save"></i>',
        label: 'Save Tree',
        callback: (html) => treeFromForm(html, initial, options)
      }
    },
    default: 'ok',
    render: bindWorkbench
  }, {
    width: 980,
    classes: ['swse-force-tradition-picker-dialog', 'swse-custom-talent-tree-workbench-dialog']
  });

  if (!result) return null;
  const saved = await saveCustomTalentTree(actor, result);
  ui?.notifications?.info?.(`Saved custom talent tree: ${saved.name}.`);
  if (typeof options.renderSheet === 'function') options.renderSheet();
  return saved;
}

export default openCustomTalentTreeWorkbench;
