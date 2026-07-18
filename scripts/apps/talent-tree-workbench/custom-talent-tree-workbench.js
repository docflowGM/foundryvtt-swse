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
import { createSafeEmbeddedItem } from '/systems/foundryvtt-swse/scripts/engine/items/safe-item-factory.js';

/**
 * Custom Talent Tree Workbench
 *
 * Phase 7 shell + importer + custom talent creation + drag/drop interaction.
 * The workbench owns metadata and graph state; the importer reuses TalentTreeDB,
 * membership authority, and the existing dependency graph builder.
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
    .swse-custom-tree-workbench__field select,
    .swse-custom-tree-node-prompt input,
    .swse-custom-tree-node-prompt textarea { width: 100%; box-sizing: border-box; border: 1px solid rgba(0, 170, 255, 0.28); border-radius: 6px; background: rgba(3, 10, 20, 0.72); color: var(--swse-force-picker-text-light, #b5daff); padding: 8px 10px; outline: none; }
    .swse-custom-tree-workbench__field textarea,
    .swse-custom-tree-node-prompt textarea { min-height: 96px; resize: vertical; }
    .swse-custom-tree-workbench__graph { position: relative; min-height: 480px; overflow: hidden; background: radial-gradient(circle at 50% 40%, rgba(0, 217, 255, 0.10), transparent 38%), linear-gradient(90deg, rgba(0, 170, 255, 0.08) 1px, transparent 1px), linear-gradient(0deg, rgba(0, 170, 255, 0.08) 1px, transparent 1px); background-size: auto, 48px 48px, 48px 48px; }
    .swse-custom-tree-workbench__graph::after { content: ''; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 70px rgba(0, 0, 0, 0.54); }
    .swse-custom-tree-workbench__graph.is-drag-over { outline: 2px dashed rgba(0, 255, 136, 0.72); outline-offset: -8px; box-shadow: inset 0 0 42px rgba(0, 255, 136, 0.16); }
    .swse-custom-tree-workbench__drop-hint { position: absolute; right: 14px; top: 14px; z-index: 2; border: 1px solid rgba(0, 255, 136, 0.35); border-radius: 999px; padding: 6px 10px; background: rgba(0, 0, 0, 0.42); color: var(--swse-success, #00ff88); font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; pointer-events: none; }
    .swse-custom-tree-workbench__toolbar { position: absolute; top: 12px; left: 12px; z-index: 2; display: flex; gap: 8px; }
    .swse-custom-tree-workbench__tool { font-family: var(--swse-font-orbit, Orbitron, system-ui, sans-serif); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; padding: 8px 13px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(0, 170, 255, 0.36); background: rgba(10,16,26,.85); color: var(--swse-force-picker-text-light, #b5daff); }
    .swse-custom-tree-workbench__tool--primary { background: linear-gradient(135deg, var(--swse-success, #00ff88), var(--swse-secondary, #0af)); color: #071522; border-color: var(--swse-success, #00ff88); }
    .swse-custom-tree-workbench__empty-graph { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; text-align: center; }
    .swse-custom-tree-workbench__plus-node { width: 166px; height: 166px; border-radius: 50%; border: 1px dashed rgba(0, 255, 136, 0.58); background: radial-gradient(circle, rgba(0, 255, 136, 0.13), rgba(0, 170, 255, 0.05) 62%, transparent); color: var(--swse-force-picker-primary, #9ed0ff); box-shadow: 0 0 28px rgba(0, 217, 255, 0.18), inset 0 0 28px rgba(0, 217, 255, 0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
    .swse-custom-tree-workbench__plus-node strong { font-size: 48px; line-height: 1; color: var(--swse-success, #00ff88); text-shadow: 0 0 16px rgba(0, 255, 136, 0.55); }
    .swse-custom-tree-workbench__plus-node span { font-family: var(--swse-font-mono, ui-monospace, monospace); font-size: 11px; letter-spacing: 0.10em; text-transform: uppercase; }
    .swse-custom-tree-workbench__node-count { color: var(--swse-force-picker-text-muted, rgba(181,218,255,0.5)); font-size: 10px; }
    .swse-custom-tree-workbench__node-list { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 16px; align-content: flex-start; padding: 70px 18px 18px; }
    .swse-custom-tree-workbench__node-card { width: 172px; min-height: 110px; border: 1px solid rgba(0, 217, 255, 0.32); border-radius: 14px; background: rgba(8, 20, 34, 0.82); padding: 12px; box-shadow: 0 0 16px rgba(0, 217, 255, 0.10); cursor: pointer; }
    .swse-custom-tree-workbench__node-card:hover { border-color: rgba(0, 255, 136, 0.50); box-shadow: 0 0 18px rgba(0, 255, 136, 0.16); }
    .swse-custom-tree-workbench__node-card[data-source-type="custom"] { border-color: rgba(172, 130, 255, 0.46); box-shadow: 0 0 16px rgba(172, 130, 255, 0.12); }
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
    .swse-custom-tree-node-prompt { display: flex; flex-direction: column; gap: 10px; }
    .swse-custom-tree-node-prompt label { display: flex; flex-direction: column; gap: 5px; color: var(--swse-force-picker-primary, #9ed0ff); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
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
  const dropHint = '<span class="swse-custom-tree-workbench__drop-hint">Drop talent items here</span>';
  if (!nodes.length) {
    return `
      ${dropHint}
      <div class="swse-custom-tree-workbench__toolbar">
        <button type="button" class="swse-custom-tree-workbench__tool swse-custom-tree-workbench__tool--primary" data-action="custom-tree-add-talent">+ Add Talent</button>
      </div>
      <div class="swse-custom-tree-workbench__empty-graph">
        <button type="button" class="swse-custom-tree-workbench__plus-node" data-action="custom-tree-add-talent">
          <strong>+</strong>
          <span>Add Talent</span>
          <small>Import, create, or drop</small>
        </button>
      </div>`;
  }
  return `
    ${dropHint}
    <div class="swse-custom-tree-workbench__toolbar">
      <button type="button" class="swse-custom-tree-workbench__tool swse-custom-tree-workbench__tool--primary" data-action="custom-tree-add-talent">+ Add Talent</button>
    </div>
    <div class="swse-custom-tree-workbench__node-list">
      ${nodes.map(node => `
        <article class="swse-custom-tree-workbench__node-card" data-node-id="${escapeHtml(node.nodeId)}" data-source-type="${escapeHtml(node.sourceType || 'custom')}" title="Open source talent">
          <strong>${escapeHtml(node.name)}</strong>
          <small>${escapeHtml(node.sourceTreeName || node.sourceType || 'custom')} · ${escapeHtml(node.importMode || 'custom')}</small>
          ${node.prerequisiteText ? `<em>Prereq: ${escapeHtml(node.prerequisiteText)}</em>` : ''}
          ${node.approvalStatus ? `<em>${escapeHtml(node.approvalStatus)}</em>` : ''}
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
          <p>Edit the custom tree container, import existing talents, create blank custom talent nodes, or drop talent items directly into the graph.</p>
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
          <p class="swse-custom-tree-workbench__phase-note">Phase 7 accepts dropped talent items from actors or compendiums. Pending player-created trees and custom talents do not grant access until GM approved.</p>
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

function renderGraph(root, tree, actor = null) {
  const graph = root.querySelector?.('[data-custom-tree-graph]');
  const count = root.querySelector?.('[data-node-count]');
  if (graph) graph.innerHTML = graphHtml(tree);
  if (count) count.textContent = `${Number(tree.nodes?.length || 0)} Nodes`;
  bindGraphInteractions(root, tree, actor);
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

async function openAddTalentModeDialog() {
  return SWSEDialogV2.wait({
    title: 'Add Talent to Custom Tree',
    content: `
      <form class="swse-custom-tree-importer" data-custom-tree-add-mode>
        <p class="swse-custom-tree-importer__hint">Choose how to add the next node to this custom talent tree.</p>
        <label class="swse-custom-tree-importer__talent is-selected">
          <input type="radio" name="mode" value="existing" checked hidden>
          <span class="swse-custom-tree-importer__mark"></span>
          <span class="swse-custom-tree-importer__copy">
            <strong>From Existing Tree</strong>
            <small>Pick a talent from an official tree and optionally import its prerequisite chain.</small>
          </span>
        </label>
        <label class="swse-custom-tree-importer__talent">
          <input type="radio" name="mode" value="custom" hidden>
          <span class="swse-custom-tree-importer__mark"></span>
          <span class="swse-custom-tree-importer__copy">
            <strong>Create Custom Talent</strong>
            <small>Create a blank custom talent item, add it as a graph node, and open the item sheet for editing.</small>
          </span>
        </label>
      </form>`,
    buttons: {
      cancel: {
        icon: '<i class="fa-solid fa-times"></i>',
        label: game?.i18n?.localize?.('Cancel') ?? 'Cancel',
        callback: () => null
      },
      ok: {
        icon: '<i class="fa-solid fa-plus"></i>',
        label: 'Continue',
        callback: html => rootFromHtml(html).querySelector?.('input[name="mode"]:checked')?.value || 'existing'
      }
    },
    default: 'ok',
    render: html => {
      const root = rootFromHtml(html);
      root.querySelectorAll?.('[data-custom-tree-add-mode] .swse-custom-tree-importer__talent').forEach(label => {
        label.addEventListener('click', () => {
          root.querySelectorAll('[data-custom-tree-add-mode] .swse-custom-tree-importer__talent').forEach(entry => entry.classList.remove('is-selected'));
          label.classList.add('is-selected');
          const input = label.querySelector('input[name="mode"]');
          if (input) input.checked = true;
        });
      });
    }
  }, {
    width: 620,
    classes: ['swse-force-tradition-picker-dialog', 'swse-custom-talent-importer-dialog']
  });
}

async function openCustomTalentPrompt(tree = {}) {
  const defaultName = `New ${tree.name || 'Custom Tree'} Talent`;
  return SWSEDialogV2.wait({
    title: 'Create Custom Talent Node',
    content: `
      <form class="swse-custom-tree-node-prompt" data-custom-tree-node-prompt>
        <p class="swse-custom-tree-importer__hint">Create a blank custom talent item. The item sheet will open after the node is added so the talent can be edited separately.</p>
        <label>
          Talent Name
          <input type="text" name="name" value="${escapeHtml(defaultName)}" required>
        </label>
        <label>
          Starting Description / Benefit
          <textarea name="description" rows="4" placeholder="Describe the custom talent. You can edit this later on the item sheet."></textarea>
        </label>
      </form>`,
    buttons: {
      cancel: {
        icon: '<i class="fa-solid fa-times"></i>',
        label: game?.i18n?.localize?.('Cancel') ?? 'Cancel',
        callback: () => null
      },
      ok: {
        icon: '<i class="fa-solid fa-sparkles"></i>',
        label: 'Create Talent',
        callback: html => {
          const root = rootFromHtml(html);
          const name = String(root.querySelector?.('input[name="name"]')?.value || '').trim();
          const description = String(root.querySelector?.('textarea[name="description"]')?.value || '').trim();
          if (!name) return null;
          return { name, description };
        }
      }
    },
    default: 'ok'
  }, {
    width: 620,
    classes: ['swse-force-tradition-picker-dialog', 'swse-custom-talent-importer-dialog']
  });
}

function nodeFromCustomTalentItem(item, tree = {}) {
  const system = item?.system || {};
  const name = String(item?.name || 'New Custom Talent').trim();
  const nodeId = slugifyCustomTalentTree(item?.id || name);
  return {
    nodeId,
    talentId: item?.id || nodeId,
    name,
    sourceType: 'custom',
    sourceTreeId: tree.id || tree.value || null,
    sourceTreeName: tree.name || 'Custom Talent Tree',
    sourceTalentId: item?.id || null,
    sourceName: 'Custom Talent',
    uuid: item?.uuid || null,
    importMode: 'custom',
    prerequisiteText: system.prerequisites || system.prerequisite || '',
    prerequisites: [],
    description: system.benefit || system.description || '',
    x: null,
    y: null,
    customTalent: {
      actorId: item?.actor?.id || item?.parent?.id || null,
      itemId: item?.id || null,
      uuid: item?.uuid || null,
      editable: true
    },
    approvalStatus: system.approvalStatus || null,
    gmApproved: system.gmApproved ?? null
  };
}

function nodeFromDroppedTalentDocument(item, tree = {}) {
  if (!item || item.type !== 'talent') return null;
  const system = item.system || {};
  const name = String(item.name || 'Dropped Talent').trim();
  const sourceType = system.isCustom === true || item.parent?.documentName === 'Actor' ? 'custom' : 'official';
  const treeLabel = system.talentTree || system.tree || system.talent_tree || tree.name || 'Dropped Talent';
  const nodeId = slugifyCustomTalentTree(item.id || item.uuid || name);
  return {
    nodeId,
    talentId: item.id || nodeId,
    name,
    sourceType,
    sourceTreeId: system.talentTreeId || system.customTreeId || tree.id || null,
    sourceTreeName: treeLabel,
    sourceTalentId: item.id || null,
    sourceName: system.source || item.pack || 'Dropped Talent',
    uuid: item.uuid || null,
    importMode: sourceType === 'custom' ? 'custom' : 'reference',
    prerequisiteText: system.prerequisites || system.prerequisite || '',
    prerequisites: [],
    description: system.benefit || system.description || '',
    x: null,
    y: null,
    customTalent: sourceType === 'custom' ? {
      actorId: item.actor?.id || item.parent?.id || null,
      itemId: item.id || null,
      uuid: item.uuid || null,
      editable: true
    } : null,
    approvalStatus: system.approvalStatus || null,
    gmApproved: system.gmApproved ?? null
  };
}

async function createCustomTalentNodePayload(actor, tree) {
  if (!actor?.isOwner) {
    ui?.notifications?.warn?.('You do not have permission to create a custom talent on this actor.');
    return null;
  }
  const request = await openCustomTalentPrompt(tree);
  if (!request?.name) return null;

  const item = await createSafeEmbeddedItem(actor, 'talent', {
    name: request.name,
    source: 'custom-talent-tree-workbench',
    system: {
      tree: tree.name || 'Custom',
      talentTree: tree.name || 'Custom',
      talentTreeId: tree.id || null,
      customTreeId: tree.value || (tree.id ? `custom-tree:${tree.id}` : null),
      source: 'Custom Talent Tree Workbench',
      description: request.description || '',
      benefit: request.description || '',
      isCustom: true
    }
  });

  if (!item) return null;
  item.sheet?.render?.(true);
  const node = nodeFromCustomTalentItem(item, tree);
  return {
    nodes: [node],
    edges: [],
    selectedNodeId: node.nodeId,
    selectedName: node.name,
    importMode: 'custom',
    prerequisiteMode: 'custom',
    importedNodeIds: [node.nodeId]
  };
}

async function resolveAddTalentPayload(actor, tree) {
  const mode = await openAddTalentModeDialog();
  if (!mode) return null;
  if (mode === 'custom') return createCustomTalentNodePayload(actor, tree);
  return openExistingTalentImportDialog(tree);
}

async function documentFromDropEvent(event) {
  let data = null;
  try {
    data = TextEditor?.getDragEventData?.(event) || null;
  } catch (_err) {
    data = null;
  }
  if (!data) {
    try { data = JSON.parse(event.dataTransfer?.getData('text/plain') || '{}'); }
    catch (_err) { data = null; }
  }
  const uuid = data?.uuid || data?.documentUuid || null;
  if (uuid && typeof fromUuid === 'function') return fromUuid(uuid);
  if (data?.type === 'Item' && data?.id && data?.actorId) return game.actors?.get?.(data.actorId)?.items?.get?.(data.id) || null;
  if (data?.type === 'Item' && data?.id) return game.items?.get?.(data.id) || null;
  return null;
}

async function payloadFromDroppedTalent(event, tree) {
  const item = await documentFromDropEvent(event);
  if (!item || item.documentName !== 'Item' || item.type !== 'talent') {
    ui?.notifications?.warn?.('Drop a talent item from an actor, item directory, or compendium.');
    return null;
  }
  const node = nodeFromDroppedTalentDocument(item, tree);
  if (!node) return null;
  return {
    nodes: [node],
    edges: [],
    selectedNodeId: node.nodeId,
    selectedName: node.name,
    importMode: node.importMode,
    prerequisiteMode: 'drop',
    importedNodeIds: [node.nodeId]
  };
}

async function openNodeSource(node, actor = null) {
  if (!node) return false;
  let document = null;
  if (node.uuid && typeof fromUuid === 'function') document = await fromUuid(node.uuid);
  if (!document && node.customTalent?.itemId && actor?.items?.get) document = actor.items.get(node.customTalent.itemId);
  if (!document && node.talentId && actor?.items?.get) document = actor.items.get(node.talentId);
  if (!document?.sheet?.render) {
    ui?.notifications?.info?.('This node has no editable source document yet.');
    return false;
  }
  document.sheet.render(true);
  return true;
}

function bindNodeCards(root, tree, actor = null) {
  root.querySelectorAll('.swse-custom-tree-workbench__node-card').forEach(card => {
    if (card.dataset.bound === 'true') return;
    card.dataset.bound = 'true';
    card.addEventListener('click', async event => {
      event.preventDefault();
      const node = (tree.nodes || []).find(entry => entry.nodeId === card.dataset.nodeId);
      await openNodeSource(node, actor);
    });
  });
}

function bindDropTarget(root, tree, actor = null) {
  const graph = root.querySelector?.('[data-custom-tree-graph]');
  if (!graph || graph.dataset.dropBound === 'true') return;
  graph.dataset.dropBound = 'true';
  graph.addEventListener('dragover', event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    graph.classList.add('is-drag-over');
  });
  graph.addEventListener('dragleave', event => {
    if (!graph.contains(event.relatedTarget)) graph.classList.remove('is-drag-over');
  });
  graph.addEventListener('drop', async event => {
    event.preventDefault();
    graph.classList.remove('is-drag-over');
    const payload = await payloadFromDroppedTalent(event, tree);
    if (!payload) return;
    const result = pushImportedPayload(tree, payload);
    if (!result.added) {
      ui?.notifications?.warn?.('That talent is already in this custom tree.');
      return;
    }
    renderGraph(root, tree, actor);
    ui?.notifications?.info?.(`Added ${payload.selectedName} from drop to the custom tree.`);
  });
}

function bindGraphInteractions(root, tree, actor = null) {
  bindAddTalentButtons(root, tree, actor);
  bindNodeCards(root, tree, actor);
  bindDropTarget(root, tree, actor);
}

function bindAddTalentButtons(root, tree, actor = null) {
  root.querySelectorAll('[data-action="custom-tree-add-talent"]').forEach(button => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const imported = await resolveAddTalentPayload(actor, tree);
      if (!imported) return;
      const result = pushImportedPayload(tree, imported);
      if (!result.added) {
        ui?.notifications?.warn?.('Those talents are already in this custom tree.');
        return;
      }
      renderGraph(root, tree, actor);
      const chainLabel = imported.prerequisiteMode === 'chain' ? ' with prerequisite chain' : '';
      const customLabel = imported.prerequisiteMode === 'custom' ? ' as a custom editable talent' : '';
      ui?.notifications?.info?.(`Added ${result.added} talent${result.added === 1 ? '' : 's'}${chainLabel}${customLabel} to the custom tree.`);
    });
  });
}

function bindWorkbench(html, tree, actor = null) {
  const root = rootFromHtml(html);
  const workbench = root.querySelector?.('[data-custom-tree-workbench]');
  if (!workbench || workbench.dataset.bound === 'true') return;
  workbench.dataset.bound = 'true';
  bindGraphInteractions(root, tree, actor);
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
    render: (html) => bindWorkbench(html, initial, actor)
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
