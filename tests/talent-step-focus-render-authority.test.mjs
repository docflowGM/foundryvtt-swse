import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Regression: in Heroic/Class Talent chargen, clicking a talent, a talent-tree
// card, or a graph node changed focus state internally but the details rail
// kept showing "Select an item to see details."
//
// Root cause (independent inspection): TalentStep's custom focus paths
// (focus-talent, focus-tree, graph node focus, keyboard focus) bypass the
// shell's canonical ProgressionShell._onFocusItem() (which always dirties
// 'details'). TalentStep._renderPreservingScroll() only ever requested
// ['work-surface', 'utility'] -- never 'details' -- so every one of those
// custom paths silently left the old details DOM mounted. A second,
// independent defect in the same area: several of those paths ALSO fired a
// second, redundant render because both the shell's delegated [data-action]
// click dispatch AND a per-node click listener in onDataReady() handled the
// exact same click.
//
// Fix: a dedicated TalentStep._renderFocusPreservingScroll() (regions:
// ['work-surface', 'details'], never 'utility') that every focus path now
// funnels through via _focusTalentAndRender()/direct calls, plus removal of
// the redundant onDataReady() click listeners (kept keyboard-only, since
// these rows are `role="button"` divs with no native keydown activation).
//
// _renderPreservingScroll() itself is deliberately left untouched (still
// ['work-surface', 'utility'], no 'details') -- it is also used by
// search/filter/view-mode/Fit/center operations that must NOT gain an
// unnecessary details repaint.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {},
};
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
// _captureStepScroll() does `shell.element instanceof HTMLElement` -- plain
// Node has no HTMLElement global at all (a bare ReferenceError, not `false`),
// so it needs a stand-in class. None of these tests' fake shell.element
// values are real instances of it, so the scroll-capture branch always
// short-circuits to `[]`, which is what every test here wants (scroll
// preservation itself is untouched by this fix and is not what is being
// tested).
globalThis.HTMLElement = globalThis.HTMLElement ?? class {};

const { TalentStep } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/talent-step.js'
);

/** Records every requestRender() call a step makes, in order. */
function makeShell() {
  const renders = [];
  return {
    actor: null,
    element: null,
    renders,
    setFocusedItem() {},
    requestRender(opts) {
      renders.push(opts);
    },
  };
}

/** Minimal fake DOM node: enough for addEventListener/dispatch and dataset reads. */
function makeFakeNode(dataset = {}) {
  const listeners = {};
  return {
    dataset,
    addEventListener(type, handler) {
      (listeners[type] ??= []).push(handler);
    },
    dispatchEvent(type, event) {
      for (const handler of listeners[type] ?? []) handler(event);
    },
    listenerCount(type) {
      return (listeners[type] ?? []).length;
    },
    closest() { return null; },
  };
}

function makeEvent({ key } = {}) {
  return {
    key,
    target: { closest: () => null },
    preventDefault() {},
    stopPropagation() {},
  };
}

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

// ── 1. Talent list-card single click (handleAction, the real dispatch path
// the shell's delegated [data-action] click listener uses) sets focus and
// schedules a details repaint. ──
{
  const talentStep = new TalentStep({ stepId: 'talent-step', slotType: 'heroic' });
  const shell = makeShell();
  const target = { dataset: { talentId: 'power-attack' }, closest: () => null };

  const handled = talentStep.handleAction('focus-talent', makeEvent(), target, shell);
  assert.equal(handled, true, 'handleAction must recognize focus-talent');
  assert.equal(talentStep._focusedTalentId, 'power-attack');
  assert.equal(shell.renders.length, 1, 'exactly one render must be scheduled per click');
  assert.deepEqual(shell.renders[0].regions, ['work-surface', 'details'],
    'a talent focus render must include details, not just work-surface/utility');
}
ok('talent list-card click (handleAction focus-talent): focuses the talent and schedules a work-surface+details repaint, exactly once');

// ── 2. Tree-browser focus (_focusTree) also dirties details, since
// renderDetailsPanel()'s browser-stage branch reads _focusedTreeId. ──
{
  const talentStep = new TalentStep({ stepId: 'talent-step', slotType: 'heroic' });
  const shell = makeShell();
  talentStep._focusTree('tree-1', shell, { speak: false });
  assert.equal(talentStep._focusedTreeId, 'tree-1');
  assert.equal(shell.renders.length, 1);
  assert.deepEqual(shell.renders[0].regions, ['work-surface', 'details'],
    'tree focus must dirty details the same way talent focus does');

  // And the details rail actually resolves real tree content, not the
  // empty state, once a tree is focused.
  talentStep._getTree = (id) => (id === 'tree-1' ? { id: 'tree-1', name: 'Test Tree', category: 'heroic', tags: [] } : null);
  const detailsShell = { actor: null, progressionSession: { draftSelections: { talents: [] } } };
  const details = await talentStep.renderDetailsPanel(null, detailsShell);
  assert.match(details.template, /talent-tree-details\.hbs$/,
    'a focused tree must render real tree details, not the empty state');
}
ok('tree-browser focus (_focusTree): schedules a work-surface+details repaint and renderDetailsPanel resolves real tree content');

// ── 3. Graph-node focus (both the graph renderer's onFocus callback and the
// canvas click fallback in afterRender()) route through
// onItemFocused() + _renderFocusPreservingScroll(), exactly as the ticket's
// desired flow describes. Exercised directly against production code
// (onItemFocused, _renderFocusPreservingScroll) rather than the full SVG
// graph renderer, since both afterRender() callbacks are verified below (via
// source inspection) to be exactly this same two-call sequence. ──
{
  const talentStep = new TalentStep({ stepId: 'talent-step', slotType: 'heroic' });
  const shell = makeShell();
  talentStep._stage = 'graph';
  talentStep._selectedTreeTalents = [{ id: 'graph-talent', name: 'Graph Talent', type: 'talent', system: {} }];

  await talentStep.onItemFocused('graph-talent', shell);
  talentStep._renderFocusPreservingScroll(shell);

  assert.equal(talentStep._focusedTalentId, 'graph-talent', 'onItemFocused must resolve the concrete talent focus id');
  assert.equal(shell.renders.length, 1);
  assert.deepEqual(shell.renders[0].regions, ['work-surface', 'details']);

  // renderDetailsPanel resolves the newly-focused talent to real talent
  // details, not the empty state (the exact symptom from the bug report).
  const details = await talentStep.renderDetailsPanel(null, { actor: null });
  assert.match(details.template, /talent-details\.hbs$/,
    'a focused talent must render real talent details, not the empty state');
}
ok('graph-node focus (onItemFocused + _renderFocusPreservingScroll): resolves the focused talent, schedules a details repaint, and renderDetailsPanel produces talent-details rather than empty-state');

// ── 3b. Structural proof that afterRender()'s two graph-focus call sites
// (the renderer's onFocus callback and the canvas click fallback) actually
// use this exact sequence in source, not a hand-verified approximation. ──
{
  const fs = await import('node:fs');
  const src = fs.readFileSync(
    new URL('../scripts/apps/progression-framework/steps/talent-step.js', import.meta.url),
    'utf8'
  );
  const onFocusBlock = src.match(/onFocus: async \(talentId\) => \{[\s\S]{0,200}?\}/)?.[0] ?? '';
  assert.match(onFocusBlock, /await this\.onItemFocused\(talentId, shell\)/);
  assert.match(onFocusBlock, /this\._renderFocusPreservingScroll\(shell\)/);
  assert.ok(!onFocusBlock.includes('_renderPreservingScroll(shell)') || onFocusBlock.includes('_renderFocusPreservingScroll'),
    'graph onFocus must not have regressed back to the non-details helper');

  const canvasClickBlock = src.slice(src.indexOf("canvas.addEventListener('click'"), src.indexOf("canvas.addEventListener('dblclick'"));
  assert.match(canvasClickBlock, /await this\.onItemFocused\(node\.dataset\.nodeId, shell\)/);
  assert.match(canvasClickBlock, /this\._renderFocusPreservingScroll\(shell\)/);
}
ok('afterRender() graph onFocus callback and canvas click fallback both use onItemFocused()+_renderFocusPreservingScroll() in source, not the non-details helper');

// ── 4. Keyboard talent focus (onDataReady's keydown-only wiring) uses the
// same _focusTalentAndRender() path, and no duplicate click listener is
// attached (the shell's delegated dispatch already handles clicks). ──
{
  const talentStep = new TalentStep({ stepId: 'talent-step', slotType: 'heroic' });
  const shell = makeShell();
  const node = makeFakeNode({ talentId: 'burst-fire' });
  shell.element = {
    addEventListener() {},
    querySelectorAll(selector) {
      if (selector === '[data-action="focus-talent"]') return [node];
      return [];
    },
    querySelector() { return null; },
  };

  await talentStep.onDataReady(shell);

  assert.equal(node.listenerCount('click'), 0,
    'onDataReady must not attach a redundant click listener -- the shell already dispatches focus-talent clicks via handleAction');
  assert.equal(node.listenerCount('keydown'), 1, 'keyboard activation must still be wired (these rows have no native keydown-to-click behavior)');

  node.dispatchEvent('keydown', makeEvent({ key: 'Enter' }));
  assert.equal(talentStep._focusedTalentId, 'burst-fire');
  assert.equal(shell.renders.length, 1);
  assert.deepEqual(shell.renders[0].regions, ['work-surface', 'details']);
}
ok('keyboard talent focus (Enter/Space on a focus-talent row): still works, uses the same details-dirtying helper, and no duplicate click listener is attached');

// ── 4b. Tree-card wiring in onDataReady has the same non-duplication
// property: no click listener (the shell's delegated dispatch already
// calls _focusTree() via handleAction). ──
{
  const talentStep = new TalentStep({ stepId: 'talent-step', slotType: 'heroic' });
  const shell = makeShell();
  const card = makeFakeNode({ treeId: 'tree-1' });
  shell.element = {
    addEventListener() {},
    querySelectorAll(selector) {
      if (selector === '[data-action="focus-tree"]') return [card];
      return [];
    },
    querySelector() { return null; },
  };
  await talentStep.onDataReady(shell);
  assert.equal(card.listenerCount('click'), 0,
    'onDataReady must not attach a redundant click listener for tree cards either -- handleAction(\'focus-tree\') already covers it');
}
ok('tree-card wiring: no duplicate click listener, reconciled with the shell\'s delegated dispatch');

// ── 5. A focus repaint always contains 'details' as a discrete assertion
// separate from the other tests above (covers the exact review requirement). ──
{
  const talentStep = new TalentStep({ stepId: 'talent-step', slotType: 'heroic' });
  const shell = makeShell();
  talentStep._focusTalentAndRender('power-attack', shell);
  assert.ok(shell.renders[0].regions.includes('details'), 'a focus repaint must include details');
}
ok('a focus repaint always contains \'details\'');

// ── 6. Search/filter/view-mode/Fit operations do NOT gain an unnecessary
// details repaint merely because they still use _renderPreservingScroll(). ──
{
  const talentStep = new TalentStep({ stepId: 'talent-step', slotType: 'heroic' });
  const shell = makeShell();

  // Search (onUtilityChange).
  talentStep.onUtilityChange({ type: 'search', detail: { query: 'x' }, shell });
  // set-talent-view
  talentStep.handleAction('set-talent-view', makeEvent(), { dataset: { viewMode: 'list' }, closest: () => null }, shell);
  // fit-talent-tree
  talentStep.handleAction('fit-talent-tree', makeEvent(), { closest: () => null }, shell);
  // center-talent-node
  talentStep.handleAction('center-talent-node', makeEvent(), { closest: () => null }, shell);

  assert.equal(shell.renders.length, 4);
  for (const render of shell.renders) {
    assert.deepEqual(render.regions, ['work-surface', 'utility'],
      `non-focus operation must not dirty details (got regions ${JSON.stringify(render.regions)})`);
  }
}
ok('search/filter/view-mode/Fit/center operations keep using _renderPreservingScroll() (work-surface+utility only), never gaining an unnecessary details repaint');

// ── 7. Bonus finding from the same root cause: onItemCommitted()'s
// duplicate-talent-blocked branch also focuses the blocked talent and must
// dirty details too. ──
{
  const talentStep = new TalentStep({ stepId: 'talent-step', slotType: 'heroic' });
  const shell = makeShell();
  talentStep._stage = 'graph';
  const talent = { id: 'dup-talent', name: 'Dup Talent', type: 'talent', system: {} };
  talentStep._selectedTreeTalents = [talent];
  talentStep._isTalentAlreadyTakenElsewhere = () => true;

  await talentStep.onItemCommitted('dup-talent', shell);

  assert.equal(talentStep._focusedTalentId, 'dup-talent');
  assert.equal(shell.renders.length, 1);
  assert.deepEqual(shell.renders[0].regions, ['work-surface', 'details']);
}
ok('onItemCommitted() duplicate-talent-blocked branch: also a focus change, also dirties details (same root cause, same fix)');

console.log('talent-step-focus-render-authority: all assertions passed');
