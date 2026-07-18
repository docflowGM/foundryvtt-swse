import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { TalentTreeDB } from '/systems/foundryvtt-swse/scripts/data/talent-tree-db.js';
import { getTalentMembership } from '/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-tree-membership-authority.js';
import { buildDependencyGraph } from '/systems/foundryvtt-swse/scripts/apps/chargen/chargen-talent-tree-graph.js';
import { slugifyCustomTalentTree } from '/systems/foundryvtt-swse/scripts/apps/talent-tree-workbench/custom-talent-tree-model.js';

/**
 * Custom Talent Tree Importer
 *
 * Phase 3 importer. It reuses TalentTreeDB, talent-tree membership authority,
 * and buildDependencyGraph(...) to pick an existing talent from an existing tree,
 * then offers selected-only vs prerequisite-chain import when graph prerequisites
 * are detected.
 */

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function textFrom(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function talentId(talent = {}) {
  return String(talent.id || talent._id || talent.uuid || talent.name || '').trim();
}

function talentName(talent = {}) {
  return textFrom(talent.name || talent.label || talentId(talent), 'Unnamed Talent');
}

function talentDescription(talent = {}) {
  return textFrom(
    talent.system?.benefit
    || talent.system?.description
    || talent.system?.text
    || talent.description
    || talent.summary,
    ''
  );
}

function talentPrerequisiteText(talent = {}) {
  const values = [
    talent.system?.prerequisites,
    talent.system?.prerequisite,
    talent.system?.requirements,
    talent.prerequisites,
    talent.prerequisite
  ];
  for (const value of values) {
    if (Array.isArray(value)) {
      const joined = value.map(String).map(v => v.trim()).filter(Boolean).join(', ');
      if (joined) return joined;
    }
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function nodeFromTalent(talent, tree, importMode = 'reference', graphNode = null) {
  const sourceTalentId = talentId(talent);
  const name = talentName(talent);
  const nodeId = slugifyCustomTalentTree(sourceTalentId || name);
  return {
    nodeId,
    talentId: sourceTalentId || nodeId,
    name,
    sourceType: 'official',
    sourceTreeId: tree.id || tree.sourceId || tree.key || tree.name,
    sourceTreeName: tree.name || tree.displayName || tree.id,
    sourceTalentId,
    sourceName: talent.system?.source || talent.source || tree.name || tree.id || 'Official',
    uuid: talent.uuid || talent.documentUuid || null,
    importMode,
    prerequisiteText: talentPrerequisiteText(talent),
    prerequisites: asArray(graphNode?.prerequisites).map(value => slugifyCustomTalentTree(value)),
    missingPrerequisiteIds: asArray(graphNode?.prerequisites).map(value => slugifyCustomTalentTree(value)),
    description: talentDescription(talent),
    x: null,
    y: null
  };
}

function getGraphNode(graph, id) {
  return graph?.nodes?.get?.(id) || graph?.nodes?.get?.(slugifyCustomTalentTree(id)) || null;
}

function collectPrerequisiteIds(graph, talentIdValue) {
  const ordered = [];
  const seen = new Set();

  const visit = (nodeId) => {
    const node = getGraphNode(graph, nodeId);
    if (!node) return;
    for (const prereqId of asArray(node.prerequisites)) {
      const key = String(prereqId);
      if (seen.has(key)) continue;
      visit(key);
      seen.add(key);
      ordered.push(key);
    }
  };

  visit(talentIdValue);
  return ordered;
}

function graphEdgesForIds(graph, ids) {
  const allowed = new Set(ids.map(String));
  return asArray(graph?.edges)
    .filter(edge => allowed.has(String(edge.from)) && allowed.has(String(edge.to)))
    .map(edge => ({
      from: slugifyCustomTalentTree(edge.from),
      to: slugifyCustomTalentTree(edge.to),
      type: edge.type || 'prerequisite'
    }));
}

async function buildImportTrees() {
  const out = [];
  for (const tree of TalentTreeDB.all?.() || []) {
    const talents = await getTalentMembership(tree);
    if (!talents.length) continue;
    const graph = buildDependencyGraph(talents);
    const treeId = tree.id || tree.sourceId || tree.key || tree.name;
    out.push({
      id: treeId,
      name: tree.name || tree.displayName || treeId,
      tree,
      graph,
      talentsById: new Map(talents.map(talent => [talentId(talent), talent])),
      talents: talents.map(talent => {
        const id = talentId(talent);
        const graphNode = getGraphNode(graph, id);
        const prereqs = graphNode?.prerequisites || [];
        return {
          id,
          name: talentName(talent),
          description: talentDescription(talent),
          prerequisiteText: talentPrerequisiteText(talent),
          prerequisites: prereqs,
          prerequisiteChain: collectPrerequisiteIds(graph, id),
          talent,
          graphNode
        };
      }).sort((a, b) => a.name.localeCompare(b.name))
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function buildHtml(importTrees, currentTree = {}) {
  const existingNodeIds = new Set(asArray(currentTree.nodes).map(node => slugifyCustomTalentTree(node.nodeId || node.talentId || node.name)));
  const treeButtons = importTrees.map((tree, index) => `
    <button type="button" class="swse-custom-tree-importer__tree ${index === 0 ? 'is-active' : ''}" data-tree-index="${index}">
      <strong>${escapeHtml(tree.name)}</strong>
      <small>${tree.talents.length} talents</small>
    </button>`).join('');

  return `
    <form class="swse-custom-tree-importer" data-custom-tree-importer>
      <p class="swse-custom-tree-importer__hint">Choose an existing talent tree, then select a talent to import. Talents with graph prerequisites can import the selected talent only or its prerequisite chain.</p>
      <div class="swse-custom-tree-importer__layout">
        <aside class="swse-custom-tree-importer__trees">${treeButtons}</aside>
        <main class="swse-custom-tree-importer__talents" data-importer-talents></main>
      </div>
      <footer class="swse-custom-tree-importer__footer">
        <label>Import as
          <select name="importMode">
            <option value="reference">Reference Original</option>
            <option value="copy">Copy Into Tree</option>
            <option value="clone">Clone & Edit</option>
          </select>
        </label>
        <input type="hidden" name="treeIndex" value="0">
        <input type="hidden" name="talentId" value="">
        <input type="hidden" name="existingNodeIds" value="${escapeHtml(Array.from(existingNodeIds).join(','))}">
      </footer>
    </form>`;
}

function talentRows(tree, existingNodeIds = new Set()) {
  return tree.talents.map(talent => {
    const nodeId = slugifyCustomTalentTree(talent.id || talent.name);
    const imported = existingNodeIds.has(nodeId);
    return `
      <button type="button"
              class="swse-custom-tree-importer__talent ${imported ? 'is-imported' : ''}"
              data-talent-id="${escapeHtml(talent.id)}"
              ${imported ? 'disabled' : ''}>
        <span class="swse-custom-tree-importer__mark"></span>
        <span class="swse-custom-tree-importer__copy">
          <strong>${escapeHtml(talent.name)}</strong>
          ${talent.description ? `<small>${escapeHtml(talent.description)}</small>` : '<small>No summary available.</small>'}
          ${talent.prerequisiteText ? `<em>Prerequisites: ${escapeHtml(talent.prerequisiteText)}</em>` : ''}
          ${talent.prerequisiteChain?.length ? `<em>Import chain available: ${talent.prerequisiteChain.length} prerequisite${talent.prerequisiteChain.length === 1 ? '' : 's'}</em>` : ''}
          ${imported ? '<em>Already in this custom tree.</em>' : ''}
        </span>
      </button>`;
  }).join('');
}

function rootFromHtml(html) {
  return html?.[0] || html?.element || (html instanceof HTMLElement ? html : document);
}

function bindImporter(html, importTrees) {
  const root = rootFromHtml(html);
  const form = root.querySelector?.('[data-custom-tree-importer]');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';

  const treeInput = form.querySelector('input[name="treeIndex"]');
  const talentInput = form.querySelector('input[name="talentId"]');
  const list = form.querySelector('[data-importer-talents]');
  const existingNodeIds = new Set(String(form.querySelector('input[name="existingNodeIds"]')?.value || '').split(',').filter(Boolean));

  const renderTalentList = (index = 0) => {
    const tree = importTrees[index];
    if (!tree) {
      list.innerHTML = '<div class="swse-custom-tree-importer__empty">No talents available.</div>';
      return;
    }
    list.innerHTML = talentRows(tree, existingNodeIds);
    talentInput.value = '';
  };

  form.querySelectorAll('.swse-custom-tree-importer__tree').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      form.querySelectorAll('.swse-custom-tree-importer__tree').forEach(entry => entry.classList.remove('is-active'));
      button.classList.add('is-active');
      treeInput.value = String(button.dataset.treeIndex || 0);
      renderTalentList(Number(treeInput.value));
    });
  });

  list?.addEventListener('click', event => {
    const button = event.target?.closest?.('.swse-custom-tree-importer__talent');
    if (!button || button.disabled) return;
    event.preventDefault();
    list.querySelectorAll('.swse-custom-tree-importer__talent').forEach(entry => entry.classList.remove('is-selected'));
    button.classList.add('is-selected');
    talentInput.value = button.dataset.talentId || '';
  });

  renderTalentList(0);
}

async function openPrerequisiteChoiceDialog(talentEntry, chainNames = []) {
  if (!chainNames.length) return 'only';
  const result = await SWSEDialogV2.wait({
    title: 'Talent Has Prerequisites',
    content: `
      <form class="swse-custom-tree-prereq-choice" data-custom-tree-prereq-choice>
        <p class="swse-custom-tree-importer__hint"><strong>${escapeHtml(talentEntry.name)}</strong> has prerequisite talents in its source graph.</p>
        <div class="swse-custom-tree-importer__talent is-selected" style="margin-bottom: 10px;">
          <span class="swse-custom-tree-importer__mark"></span>
          <span class="swse-custom-tree-importer__copy">
            <strong>Prerequisite chain</strong>
            <small>${chainNames.map(escapeHtml).join(' → ')}</small>
          </span>
        </div>
        <label class="swse-custom-tree-importer__talent is-selected">
          <input type="radio" name="mode" value="chain" checked hidden>
          <span class="swse-custom-tree-importer__mark"></span>
          <span class="swse-custom-tree-importer__copy">
            <strong>Import prerequisite chain + selected talent</strong>
            <small>Recommended. Adds the required talents first and preserves prerequisite edges between them.</small>
          </span>
        </label>
        <label class="swse-custom-tree-importer__talent">
          <input type="radio" name="mode" value="only" hidden>
          <span class="swse-custom-tree-importer__mark"></span>
          <span class="swse-custom-tree-importer__copy">
            <strong>Import selected talent only</strong>
            <small>Adds only the chosen talent and keeps prerequisite text as a rules warning you can waive or rewrite later.</small>
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
        label: 'Import',
        callback: html => rootFromHtml(html).querySelector?.('input[name="mode"]:checked')?.value || 'chain'
      }
    },
    default: 'ok',
    render: html => {
      const root = rootFromHtml(html);
      root.querySelectorAll?.('.swse-custom-tree-prereq-choice .swse-custom-tree-importer__talent').forEach(label => {
        label.addEventListener('click', () => {
          root.querySelectorAll('.swse-custom-tree-prereq-choice .swse-custom-tree-importer__talent').forEach(entry => entry.classList.remove('is-selected'));
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
  return result;
}

function buildImportPayload(tree, talentEntry, importMode, prerequisiteMode = 'only') {
  const selectedId = talentEntry.id;
  const rawIds = prerequisiteMode === 'chain'
    ? [...collectPrerequisiteIds(tree.graph, selectedId), selectedId]
    : [selectedId];
  const ids = Array.from(new Set(rawIds.map(String)));
  const nodes = ids
    .map(id => {
      const talent = tree.talentsById.get(id);
      if (!talent) return null;
      return nodeFromTalent(talent, tree.tree, importMode, getGraphNode(tree.graph, id));
    })
    .filter(Boolean);
  const nodeIds = nodes.map(node => node.nodeId);
  const edges = prerequisiteMode === 'chain' ? graphEdgesForIds(tree.graph, ids) : [];

  if (prerequisiteMode !== 'chain') {
    for (const node of nodes) {
      node.prerequisites = [];
    }
  }

  return {
    nodes,
    edges,
    selectedNodeId: slugifyCustomTalentTree(selectedId || talentEntry.name),
    selectedName: talentEntry.name,
    importMode,
    prerequisiteMode,
    importedNodeIds: nodeIds
  };
}

async function selectedImport(html, importTrees) {
  const root = rootFromHtml(html);
  const treeIndex = Number(root.querySelector?.('input[name="treeIndex"]')?.value || 0);
  const talentIdValue = String(root.querySelector?.('input[name="talentId"]')?.value || '').trim();
  const importMode = String(root.querySelector?.('select[name="importMode"]')?.value || 'reference');
  const tree = importTrees[treeIndex];
  const talentEntry = tree?.talents?.find(talent => talent.id === talentIdValue);
  if (!tree || !talentEntry) return null;

  const chainIds = collectPrerequisiteIds(tree.graph, talentEntry.id);
  if (!chainIds.length) return buildImportPayload(tree, talentEntry, importMode, 'only');

  const chainNames = chainIds
    .map(id => talentName(tree.talentsById.get(id)))
    .filter(Boolean);
  const choice = await openPrerequisiteChoiceDialog(talentEntry, chainNames);
  if (!choice) return null;
  return buildImportPayload(tree, talentEntry, importMode, choice === 'chain' ? 'chain' : 'only');
}

export async function openExistingTalentImportDialog(currentTree = {}) {
  const importTrees = await buildImportTrees();
  if (!importTrees.length) {
    ui?.notifications?.warn?.('No talent trees with resolved talents are available to import from.');
    return null;
  }

  const result = await SWSEDialogV2.wait({
    title: 'Import Talent From Existing Tree',
    content: buildHtml(importTrees, currentTree),
    buttons: {
      cancel: {
        icon: '<i class="fa-solid fa-times"></i>',
        label: game?.i18n?.localize?.('Cancel') ?? 'Cancel',
        callback: () => null
      },
      ok: {
        icon: '<i class="fa-solid fa-plus"></i>',
        label: 'Import Talent',
        callback: async (html) => selectedImport(html, importTrees)
      }
    },
    default: 'ok',
    render: (html) => bindImporter(html, importTrees)
  }, {
    width: 840,
    classes: ['swse-force-tradition-picker-dialog', 'swse-custom-talent-importer-dialog']
  });

  if (!result) return null;
  return result;
}
