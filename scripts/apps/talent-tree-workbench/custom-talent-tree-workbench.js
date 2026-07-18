import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import {
  createBlankCustomTalentTree,
  getCustomTalentTree,
  normalizeCustomTalentTree,
  saveCustomTalentTree,
  slugifyCustomTalentTree
} from '/systems/foundryvtt-swse/scripts/apps/talent-tree-workbench/custom-talent-tree-model.js';
import { openExistingTalentImportDialog } from '/systems/foundryvtt-swse/scripts/apps/talent-tree-workbench/custom-talent-tree-importer.js';
import { customContentApprovalNotice } from '/systems/foundryvtt-swse/scripts/settings/custom-content-approval.js';

/**
 * Custom Talent Tree Workbench
 *
 * Phase 3 shell + existing-tree importer. The workbench owns metadata and graph
 * state; the importer reuses TalentTreeDB, membership authority, and the existing
 * dependency graph builder. This phase accepts prerequisite-chain payloads.
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
    .swse-custom-tree-workbench__body { display: grid; grid-template-columns: 310px minmax(0, 1fr); gap: 14px; padding: 14px 18px 18px; min-height: 520px; }
    .swse-custom-tree-workbench__panel { border: 1px solid rgba(0, 170, 255, 0.20); border-radius: 10px; background: rgba(2, 9, 18, 0.50); box-shadow: inset 0 0 22px rgba(0, 170, 255, 0.06); overflow: hidden; }
    .swse-custom-tree-workbench__panel-title { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid rgba(0, 170, 255, 0.18); color: var(--swse-force-picker-primary, #9ed0ff); font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
    .swse-custom-tree-workbench__fields { padding: 12px; display: flex; flex-direction: column; gap: 11px; }
    .swse-custom-tree-workbench__field { display: flex; flex-direction: column; gap: 5px; }
    .swse-custom-tree-workbench__field span { color: var(--swse-force-picker-primary, #9ed0ff); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
    .swse-custom-tree-workbench__field input,
    .swse-custom-tree-workbench__field textarea,
    .swse-custom-tree-workbench__field select { width: 100%; box-sizing: border-box; border: 1px solid rgba(0, 170, 255, 0.28); border-radius: 6px; background: rgba(3, 10, 20, 0.72); color: var(--swse-force-picker-text-light, #b5daff); padding: 8px 10px; outline: none; }
    .swse-custom-tree-workbench__field textarea { min-height: 96px; resize: vertical; }
    .swse-custom-tree-workbench__graph { position: relative; min-height: 480px; overflow: hidden; background: radial-gradient(circle at 50% 40%, rgba(0, 217, 255, 0.10), transparent 38%), linear-gradient(90deg, rgba(0, 170, 255, 0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(0, 170, 255, 0.08) 1px, transparent 1px); background-size: auto, 48px 48px, 48px 48px; }
    .swse-custom-tree-workbench__graph::after { content: ''; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 70px rgba(0, 0, 0, 0.54); }
    .swse-custom-tree-workbench__toolbar { position: absolute; top: 12px; left: 12px; z-index: 2; display: flex; gap: 8px; }
    .swse-custom-tree-workbench__tool { font-family: var(--swse-font-orbit, Orbitron, system-ui, sans-serif); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; padding: 8px 13px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(0, 170, 255, 0.36); background: rgba(10,16,26,.85); color: var(--swse-force-picker-text-light, #b5daff); }
    .swse-custom-tree-workbench__tool--primary { background: linear-gradient(135deg, var(--swse-success, #00ff88), var(--swse-secondary, #0af)); color: #071522; border-color: var(--swse-success, #00ff88); }
    .swse-custom-tree-workbench__empty-graph { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; text-align: center; }
    .swse-custom-tree-workbench__plus-node { width: 166px; height: 166px; border-radius: 50%; border: 1px dashed rgba(0, 255, 136, 0.58); background: radial-gradient(circle, rgba(0, 255, 136, 0.13), rgba(0, 170, 255, 0.05) 62%, transparent); color: var(--swse-force-picker-primary, #9ed0ff); box-shadow: 0 0 28px rgba(0, 217, 255, 0.18), inset 0 0 28px rgba(0, 217, 255, 0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
    .swse-custom-tree-workbench__plus-node strong { font-size: 48px; line-height: 1; color: var(--swse-success, #00ff88); text-shadow: 0 0 16px rgba(0, 255, 136, 0.55); }
    .swse-custom-tree-workbench__plus-node span { font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 11px; letter-spacing: 0.10em; text-transform: uppercase; }
    .swse-custom-tree-workbench__node-count { color: var(--swse-force-picker-text-muted, rgba(181,218,255,0.5)); font-size: 10px; }
    .swse-custom-tree-workbench__node-list { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 16px; align-content: flex-start; padding: 70px 18px 18px; }
    .swse-custom-tree-workbench__node-card { width: 172px; min-height: 110px; border: 1px solid rgba(0, 217, 255, 0.32); border-radius: 14px; background: rgba(8, 20, 34, 0.82); padding: 12px; box-shadow: 0 0 16px rgba(0, 217, 255, 0.10); }
    .swse-custom-tree-workbench__node-card strong { display: block; color: var(--swse-force-picker-text-light, #b5daff); font-size: 12px; }
    .swse-custom-tree-workbench__node-card small { display: block; margin-top: 5px; color: var(--swse-force-picker-text-secondary, #6a9dcd); font-size: 10px; line-height: 1.35; }
    .swse-custom-tree-workbench__node-card em { display: block; margin-top: 6px; color: var(--swse-warning, #ffd66b); font-style: normal; font-size: 9.5px; }
    .swse-custom-tree-workbench__phase-note { padding: 10px 12px; color: var(--swse-force-picker-text-secondary, #6a9dcd); font-size: 11px; line-height: 1.45; border-top: 1px solid rgba(0, 170, 255, 0.16); }
    .swse-custom-tree-importer__hint { margin: 0 0 12px; color: var(--swse-force-picker-text-secondary, #6a9dcd); font-size: 12px; line-height: 1.45; }
    .swse-custom-tree-importer__layout { display: grid; grid-template-columns: 220px 1fr; gap: 0; border: 1px solid rgba(0,170,255,.2); border-radius: 8px; overflow: hidden; min-height: 430px; }
    .swse-custom-tree-importer__trees { background: rgba(0,0,0,.22); border-right: 1px solid rgba(0,170,255,.2); overflow-y: auto; }
    .swse-custom-tree-importer__tree { display: block; width: 100%; text-align: left; padding: 11px 13px; border: 0; border-bottom: 1px solid rgba(0,170,255,.14); border-left: 2px solid transparent; background: transparent; color: var(--swse-force-picker-text-secondary, #6a9dcd); cursor: pointer; }
    .swse-custom-tree-importer__tree.is-active { border-left-color: var(--swse-force-picker-accent, #00d9ff); background: rgba(0,170,255,.14); color: var(--swse-force-picker-primary, #9ed0ff); }
    .swse-custom-tree-importer__tree strong { display: block; font-family: var(--swse-font-orbit, Orbitron, sans-serif); font-size: 12px; }
    .swse-custom-tree-importer__tree small { display: block; font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 9.5px; color: var(--swse-force-picker-text-muted, rgba(181,218,255,.5)); margin-top: 3px; }
    .swse-custom-tree-importer__talents { overflow-y: auto; padding: 7px; background: rgba(3,10,20,.35); }
    .swse-custom-tree-importer__talent { width: 100%; display: grid; grid-template-columns: 18px 1fr; gap: 10px; align-items: start; padding: 10px 12px; border: 0; border-radius: 7px; background: transparent; color: inherit; text-align: left; cursor: pointer; }
    .swse-custom-tree-importer__talent:hover { background: rgba(0,170,255,.08); }
    .swse-custom-tree-importer__talent.is-selected { background: rgba(0,170,255,.14); outline: 1px solid rgba(0,217,255,.38); }
    .swse-custom-tree-importer__talent.is-imported { opacity: .5; cursor: default; }
    .swse-custom-tree-importer__mark { width: 14px; height: 14px; border-radius: 3px; border: 2px solid rgba(0,170,255,.45); margin-top: 2px; }
    .swse-custom-tree-importer__talent.is-selected .swse-custom-tree-importer__mark { background: var(--swse-force-picker-accent, #00d9ff); box-shadow: 0 0 8px rgba(0,217,255,.7); }
    .swse-custom-tree-importer__copy strong { display: block; color: var(--swse-force-picker-text-light, #b5daff); font-size: 12.5px; }
    .swse-custom-tree-importer__copy small { display: block; color: var(--swse-force-picker-text-secondary, #6a9dcd); font-size: 10.5px; line-height: 1.45; }
    .swse-custom-tree-importer__copy em { display: block; margin-top: 4px; color: var(--swse-warning, #ffd66b); font-style: normal; font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 9.5px; }
    .swse-custom-tree-importer__footer { display: flex; justify-content: flex-end; align-items: center; padding-top: 10px; color: var(--swse-force-picker-text-muted, rgba(181,218,255,.5)); font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 10px; }
    .swse-custom-tree-importer__footer select { margin-left: 6px; background: rgba(3,10,20,.65); color: var(--swse-force-picker-text-light, #b5daff); border: 1px solid rgba(0,170,255,.35); border-radius: 6px; padding: 5px 8px; }
    @media (max-width: 820px) { .swse-custom-tree-workbench__body, .swse-custom-tree-importer__layout { grid-template-columns: 1fr; } }
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
      <div class="swse-custom-tree-workbench__toolbar">
        <button type="button" class="swse-custom-tree-workbench__tool swse-custom-tree-workbench__tool--primary" data-action="custom-tree-add-talent">+ Add Talent</button>
      </div>
      <div class="swse-custom-tree-workbench__empty-graph">
        <button type="button" class="swse-custom-tree-workbench__plus-node" data-action="custom-tree-add-talent">
          <strong>+</strong>
          <span>Add Talent</span>
          <small>Import from existing tree</small>
        </button>
      </div>`;
  }
  return `
    <div class="swse-custom-tree-workbench__toolbar">
      <button type="button" class="swse-custom-tree-workbench__tool swse-custom-tree-workbench__tool--primary" data-action="custom-tree-add-talent">+ Add Talent</button>
    </div>
    <div class="swse-custom-tree-workbench__node-list">
      ${nodes.map(node => `
        <article class="swse-custom-tree-workbench__node-card" data-node-id="${escapeHtml(node.nodeId)}">
          <strong>${escapeHtml(node.name)}</strong>
          <small>${escapeHtml(node.sourceTreeName || node.sourceType || 'custom')} · ${escapeHtml(node.importMode || 'custom')}</small>
          ${node.prerequisiteText ? `<em>Prereq: ${escapeHtml(node.prerequisiteText)}</em>` : ''}
        </article>`).join('')}
      <button type="button" class="swse-custom-tree-workbench__plus-node" data-action="custom-tree-add-talent">
        <strong>+</strong>
        <span>Add Talent</span>
      </button>
    </div>`;
}

function buildWorkbenchHtml(tree, context = {}) {
  const attached = context.attachToTradition || tree.grantedByTraditions?.[0] || '';
  const approval = tree.approvalStatus || (tree.gmApproved === false ? 'pending' : 'approved');
  return `
    <form class="swse-custom-tree-workbench" data-custom-tree-workbench>
      <header class="swse-custom-tree-workbench__header">
        <div>
          <h2>Custom Talent Tree Workbench</h2>
          <p>Edit the custom tree container and import existing talents into the graph. Drag/drop arrives later; prerequisite-chain import is active.</p>
        </div>
        <span class="swse-custom-tree-workbench__badge">${escapeHtml(approval)}</span>
      </header>
      <section class="swse-custom-tree-workbench__body">
        <aside class="swse-custom-tree-workbench__panel">
          <div class="swse-custom-tree-workbench__panel-title">
            <span>Tree Metadata</span>
            <span class="swse-custom-tree-workbench__node-count" data-node-count>${Number(tree.nodes?.length || 0)} Nodes</span>
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
          <p class="swse-custom-tree-workbench__phase-note">Phase 3 can import the selected talent only or the prerequisite chain plus selected talent. Pending player-created trees do not grant access until GM approved.</p>
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

function renderGraph(root, tree) {
  const graph = root.querySelector?.('[data-custom-tree-graph]');
  const count = root.querySelector?.('[data-node-count]');
  if (graph) graph.innerHTML = graphHtml(tree);
  if (count) count.textContent = `${Number(tree.nodes?.length || 0)} Nodes`;
  bindAddTalentButtons(root, tree);
}

function edgeKey(edge = {}) {
  return `${edge.from || ''}->${edge.to || ''}:${edge.type || 'prerequisite'}`;
}

function pushImportedPayload(tree, payload) {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : (payload?.nodeId ? [payload] : []);
  const edges = Array.isArray(payload?.edges) ? payload.edges : [];
  if (!nodes.length) return { added: 0, skipped: 0, edges: 0 };

  tree.nodes ??= [];
  tree.edges ??= [];
  let added = 0;
  let skipped = 0;
  for (const node of nodes) {
    if (!node?.nodeId) {
      skipped += 1;
      continue;
    }
    const exists = tree.nodes.some(existing => existing.nodeId === node.nodeId || existing.talentId === node.talentId);
    if (exists) {
      skipped += 1;
      continue;
    }
    tree.nodes.push(node);
    added += 1;
  }

  const existingEdges = new Set(tree.edges.map(edgeKey));
  let addedEdges = 0;
  for (const edge of edges) {
    if (!edge?.from || !edge?.to) continue;
    const key = edgeKey(edge);
    if (existingEdges.has(key)) continue;
    tree.edges.push(edge);
    existingEdges.add(key);
    addedEdges += 1;
  }

  tree.talentCount = tree.nodes.length;
  return { added, skipped, edges: addedEdges };
}

function bindAddTalentButtons(root, tree) {
  root.querySelectorAll('[data-action="custom-tree-add-talent"]').forEach(button => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const imported = await openExistingTalentImportDialog(tree);
      if (!imported) return;
      const result = pushImportedPayload(tree, imported);
      if (!result.added) {
        ui?.notifications?.warn?.('Those talents are already in this custom tree.');
        return;
      }
      renderGraph(root, tree);
      const chainLabel = imported.prerequisiteMode === 'chain' ? ' with prerequisite chain' : '';
      ui?.notifications?.info?.(`Added ${result.added} talent${result.added === 1 ? '' : 's'}${chainLabel} to the custom tree.`);
    });
  });
}

function bindWorkbench(html, tree) {
  const root = rootFromHtml(html);
  const workbench = root.querySelector?.('[data-custom-tree-workbench]');
  if (!workbench || workbench.dataset.bound === 'true') return;
  workbench.dataset.bound = 'true';
  bindAddTalentButtons(root, tree);
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
    gmApproved: original.gmApproved,
    active: original.active,
    approvalStatus: original.approvalStatus,
    approvalPolicy: original.approvalPolicy,
    approvalRequestedAt: original.approvalRequestedAt,
    approvalRequestedBy: original.approvalRequestedBy,
    approvalReviewedAt: original.approvalReviewedAt,
    approvalReviewedBy: original.approvalReviewedBy
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
    render: (html) => bindWorkbench(html, initial)
  }, {
    width: 1080,
    classes: ['swse-force-tradition-picker-dialog', 'swse-custom-talent-tree-workbench-dialog']
  });

  if (!result) return null;
  const saved = await saveCustomTalentTree(actor, result);
  ui?.notifications?.info?.(`Saved custom talent tree: ${saved.name} (${customContentApprovalNotice(saved)}).`);
  if (typeof options.renderSheet === 'function') options.renderSheet();
  return saved;
}

export default openCustomTalentTreeWorkbench;
