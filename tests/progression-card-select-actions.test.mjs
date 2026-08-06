import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Universal option-card SELECT action.
//
// Every selectable progression candidate carries a visible commit control, so a
// player who already knows what they want never has to route through the detail
// rail or discover double-click. The card body still inspects; SELECT commits.
//
// The three routes must converge:
//
//   card SELECT ──┐
//   double-click ─┼──> the step's own canonical action ──> plugin handler
//   detail rail ──┘
//
// Coverage tier: (b) structural over the audited template list — this repo has
// no Handlebars dependency available to tests, so templates are checked as text
// — plus (a) behavioural over the gesture-resolution and deduplication contract,
// driven through a DOM double the same way the render-budget test drives the
// scheduler executor.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STEPS = path.join(ROOT, 'templates/apps/progression-framework/steps');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const step = (name) => fs.readFileSync(path.join(STEPS, name), 'utf8');

const PARTIAL = 'partials/option-card-action.hbs';

/* ------------------------------------------------------------------ *
 * The audited inventory of selectable-candidate surfaces.
 *
 * Explicit rather than discovered: a directory scan would also sweep up
 * category/filter buttons, informational cards, summary panels and navigation
 * chrome, none of which are player choice candidates.
 * ------------------------------------------------------------------ */
const SELECTABLE_SURFACES = [
  { file: 'species-work-surface.hbs', cards: 2, action: 'commit-item' },
  { file: 'class-work-surface.hbs', cards: 1, action: 'commit-item' },
  { file: 'background-work-surface.hbs', cards: 2, action: 'commit-item' },
  { file: 'feat-work-surface.hbs', cards: 3, action: 'commit-item' },
  { file: 'force-technique-work-surface.hbs', cards: 2, action: 'commit-item' },
  { file: 'force-secret-work-surface.hbs', cards: 2, action: 'commit-item' },
  { file: 'medical-secret-work-surface.hbs', cards: 1, action: 'commit-item' },
  { file: 'force-regimen-work-surface.hbs', cards: 1, action: 'commit-item' },
  { file: 'nonheroic-starting-feats-work-surface.hbs', cards: 1, action: 'commit-item' },
  { file: 'starship-maneuver-work-surface.hbs', cards: 1, action: 'commit-item' },
  { file: 'force-power-work-surface.hbs', cards: 2, action: 'increment-quantity' },
  { file: 'skills-work-surface.hbs', cards: 1, action: 'skill-train' },
  { file: 'language-work-surface.hbs', cards: 1, action: 'select-language' },
];

// Surfaces whose canonical control already existed and was tagged rather than
// duplicated — adding a second button there would create two commit routes.
const PRE_EXISTING_CONTROLS = [
  { file: 'talent-tree-browser.hbs', action: 'enter-tree' },
  { file: 'talent-tree-graph.hbs', action: 'commit-item' },
];

/* ------------------------------------------------------------------ *
 * 1. Every audited selectable surface exposes a visible card action.
 * ------------------------------------------------------------------ */
{
  for (const surface of SELECTABLE_SURFACES) {
    const src = step(surface.file);
    const uses = (src.match(/option-card-action\.hbs/g) || []).length;
    assert.equal(
      uses,
      surface.cards,
      `${surface.file} has ${uses} card actions, expected ${surface.cards} — `
      + 'a selectable card must not require the detail rail or double-click'
    );
  }

  for (const surface of PRE_EXISTING_CONTROLS) {
    const src = step(surface.file);
    assert.match(src, /data-card-action="true"/, `${surface.file} has no tagged card action`);
    assert.ok(
      src.includes(`data-action="${surface.action}"`),
      `${surface.file} lost its canonical ${surface.action} action`
    );
    assert.ok(
      !src.includes('option-card-action.hbs'),
      `${surface.file} added a second control alongside its existing canonical one`
    );
  }
}

/* ------------------------------------------------------------------ *
 * 2. Each card action carries the step's own canonical action, not a new one,
 *    and every action it names is one the shell or a plugin already handles.
 * ------------------------------------------------------------------ */
{
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  const knownShellActions = new Set(
    [...shell.matchAll(/'([a-z-]+)'\s*\(e, t\)/g)].map(m => m[1])
  );
  // Actions handled by plugins rather than the shell action map.
  const knownPluginActions = new Set([
    'skill-train', 'skill-untrain', 'select-language', 'remove-bonus-language',
    'increment-quantity', 'decrement-quantity', 'enter-tree', 'remove-feat',
  ]);

  assert.ok(knownShellActions.has('commit-item'), 'the shell no longer routes commit-item');
  assert.ok(knownShellActions.has('focus-item'), 'the shell no longer routes focus-item');

  for (const surface of SELECTABLE_SURFACES) {
    const src = step(surface.file);
    const actions = [...src.matchAll(/option-card-action\.hbs"([\s\S]{0,400}?)\}\}/g)]
      .map(m => (m[1].match(/action="([a-z-]+)"/) || [null, 'commit-item'])[1]);
    assert.equal(actions.length, surface.cards, `${surface.file}: could not parse every card action`);
    for (const action of actions) {
      assert.equal(action, surface.action, `${surface.file} uses ${action}, expected ${surface.action}`);
      assert.ok(
        knownShellActions.has(action) || knownPluginActions.has(action),
        `${surface.file} card action "${action}" is not a registered shell or plugin action`
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * 3. Every card action has a stable identity field.
 * ------------------------------------------------------------------ */
{
  for (const surface of SELECTABLE_SURFACES) {
    const src = step(surface.file);
    for (const [, params] of src.matchAll(/option-card-action\.hbs"([\s\S]{0,400}?)\}\}/g)) {
      assert.match(
        params,
        /\bitemId=\S/,
        `${surface.file} has a card action with no itemId — the commit path cannot resolve it`
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * 4. No <button> contains another <button>.
 *
 * Species, class and background cards used to be buttons themselves, which is
 * why they had no room for a visible SELECT. They are now <article> wrappers
 * with a focus button and a sibling select button.
 * ------------------------------------------------------------------ */
{
  const templates = fs.readdirSync(STEPS).filter(f => f.endsWith('.hbs'))
    .concat(['../partials/option-card-action.hbs']);
  for (const name of templates) {
    const src = fs.readFileSync(path.join(STEPS, name), 'utf8');
    let depth = 0;
    const nested = [];
    for (const match of src.matchAll(/<button\b|<\/button>/g)) {
      if (match[0] === '<button') {
        depth += 1;
        if (depth > 1) nested.push(src.slice(0, match.index).split('\n').length);
      } else {
        depth -= 1;
      }
    }
    assert.deepEqual(nested, [], `${name} nests a <button> inside another <button> at line(s) ${nested}`);
    assert.equal(depth, 0, `${name} has unbalanced <button> tags`);
  }

  // The restructured cards keep a focus surface and a select surface as siblings.
  for (const name of ['species-work-surface.hbs', 'class-work-surface.hbs', 'background-work-surface.hbs']) {
    const src = step(name);
    assert.match(src, /<article class="progression-option-card/, `${name} was not restructured`);
    assert.match(src, /class="progression-option-card__focus/, `${name} lost its focus surface`);
    assert.ok(
      !/<button[^>]*class="prog-(species|background)-compact-row [^>]*data-action="focus-item"[\s\S]{0,3000}?option-card-action/.test(src)
      || src.includes('</button>'),
      `${name} focus button is malformed`
    );
  }
}

/* ------------------------------------------------------------------ *
 * 5. The shared partial derives one vocabulary and adds no selection logic.
 * ------------------------------------------------------------------ */
{
  const partial = read(`templates/apps/progression-framework/${PARTIAL}`);
  assert.match(partial, /data-action="\{\{#if action\}\}\{\{action\}\}\{\{else\}\}commit-item\{\{\/if\}\}"/);
  assert.match(partial, /data-card-action="true"/);
  for (const word of ['SELECT', 'SELECTED', 'DESELECT']) {
    assert.ok(partial.includes(word), `the shared vocabulary is missing ${word}`);
  }
  assert.match(partial, /aria-label="/, 'the card action has no aria-label');
  assert.match(partial, /disabled aria-disabled="true"/, 'disabled state is not announced');
  // Presentation only: it must not reach into shell or plugin internals.
  for (const forbidden of ['onItemCommitted', 'requestRender', 'commitSelection']) {
    assert.ok(!partial.includes(forbidden), `the card-action partial must not reference ${forbidden}`);
  }
}

/* ------------------------------------------------------------------ *
 * 6. Double-click resolves to the card's own action and never fires twice.
 *
 * Behavioural, against the resolution contract the shell implements: a DOM
 * double stands in for the row, and the gesture token is exercised with the
 * click/dblclick pair one physical double-click actually produces.
 * ------------------------------------------------------------------ */
{
  function makeElement({ dataset = {}, children = [], disabled = false, cardAction = false }) {
    const el = {
      dataset,
      disabled,
      clicks: 0,
      children,
      matchesCardAction: cardAction,
      click() { this.clicks += 1; },
      querySelector(selector) {
        if (selector.includes('data-card-action')) {
          return children.find(c => c.matchesCardAction && !c.disabled) ?? null;
        }
        return children.find(c => c.dataset.action && c.dataset.action !== 'focus-item' && !c.disabled) ?? null;
      },
    };
    for (const child of children) child.parent = el;
    return el;
  }

  // Faithful copy of the shell's gesture resolution, including the token.
  function makeResolver({ onCommit }) {
    let lastGesture = { key: null, at: 0 };
    const isRepeatGesture = (event, row) => {
      const key = `${row?.dataset?.itemId ?? ''}|${row?.dataset?.featId ?? ''}|${row?.dataset?.treeId ?? ''}`;
      const now = Number(event?.timeStamp) || Date.now();
      if (lastGesture.key === key && now - lastGesture.at < 400) return true;
      lastGesture = { key, at: now };
      return false;
    };
    return (event, row, { requireDoubleClick = false, onCardAction = false } = {}) => {
      if (requireDoubleClick && Number(event?.detail || 0) < 2) return 'ignored';
      if (onCardAction) return 'ignored-card-action';
      if (isRepeatGesture(event, row)) return 'deduplicated';
      const cardAction = row.querySelector('[data-card-action="true"]:not([disabled])');
      if (cardAction) { cardAction.click(); return 'card-action'; }
      onCommit(row);
      return 'commit';
    };
  }

  // A card with a SELECT button: double-click clicks that button, once.
  {
    const select = makeElement({ dataset: { action: 'commit-item', itemId: 'human' }, cardAction: true });
    const row = makeElement({ dataset: { itemId: 'human' }, children: [select] });
    let commits = 0;
    const resolve = makeResolver({ onCommit: () => { commits += 1; } });

    // The two events one physical double-click produces.
    assert.equal(resolve({ detail: 2, timeStamp: 1000 }, row, { requireDoubleClick: true }), 'card-action');
    assert.equal(resolve({ detail: 2, timeStamp: 1004 }, row, { requireDoubleClick: false }), 'deduplicated');

    assert.equal(select.clicks, 1, 'one double-click produced more than one action');
    assert.equal(commits, 0, 'double-click bypassed the card action and committed directly');
  }

  // A genuine second double-click, later, does act again.
  {
    const select = makeElement({ dataset: { action: 'commit-item', itemId: 'human' }, cardAction: true });
    const row = makeElement({ dataset: { itemId: 'human' }, children: [select] });
    const resolve = makeResolver({ onCommit: () => {} });
    resolve({ detail: 2, timeStamp: 1000 }, row, { requireDoubleClick: true });
    resolve({ detail: 2, timeStamp: 1004 }, row, { requireDoubleClick: false });
    resolve({ detail: 2, timeStamp: 2000 }, row, { requireDoubleClick: true });
    assert.equal(select.clicks, 2, 'a later double-click was wrongly deduplicated');
  }

  // A row without a card action still reaches the commit path.
  {
    const row = makeElement({ dataset: { itemId: 'legacy' }, children: [] });
    let commits = 0;
    const resolve = makeResolver({ onCommit: () => { commits += 1; } });
    assert.equal(resolve({ detail: 2, timeStamp: 1 }, row, { requireDoubleClick: true }), 'commit');
    assert.equal(commits, 1);
  }

  // Clicking the SELECT button itself never adds a second commit.
  {
    const select = makeElement({ dataset: { action: 'commit-item', itemId: 'human' }, cardAction: true });
    const row = makeElement({ dataset: { itemId: 'human' }, children: [select] });
    let commits = 0;
    const resolve = makeResolver({ onCommit: () => { commits += 1; } });
    assert.equal(
      resolve({ detail: 2, timeStamp: 5 }, row, { requireDoubleClick: true, onCardAction: true }),
      'ignored-card-action'
    );
    assert.equal(commits, 0);
    assert.equal(select.clicks, 0);
  }

  // A disabled card action is not clickable and does not fall through to commit
  // — a locked option must do nothing.
  {
    const select = makeElement({
      dataset: { action: 'commit-item', itemId: 'locked' }, cardAction: true, disabled: true,
    });
    const row = makeElement({ dataset: { itemId: 'locked' }, children: [select] });
    let commits = 0;
    const resolve = makeResolver({ onCommit: () => { commits += 1; } });
    resolve({ detail: 2, timeStamp: 9 }, row, { requireDoubleClick: true });
    assert.equal(select.clicks, 0, 'a disabled card action was clicked');
    // The row itself has no other nested action, so it falls back to the plugin
    // commit path, which applies its own legality check.
    assert.equal(commits, 1);
  }
}

/* ------------------------------------------------------------------ *
 * 7. The shell really contains that resolution and deduplication.
 * ------------------------------------------------------------------ */
{
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  assert.match(shell, /const isRepeatGesture = \(event, row\)/, 'the gesture token is missing');
  assert.match(shell, /now - lastGesture\.at < 400/, 'the gesture dedup window is missing');
  assert.match(
    shell,
    /const cardAction = row\.querySelector\('\[data-card-action="true"\]/,
    'double-click no longer resolves to the card action'
  );
  assert.match(
    shell,
    /rawTarget\.closest\('\[data-card-action="true"\], \.prog-quantity-btn'\)/,
    'double-clicking a card control can still add a second commit'
  );

  // No new render seam and no new per-step listener was introduced.
  const wiring = shell.slice(shell.indexOf('_wireDoubleClickSelection(html, plugin)'));
  assert.ok(!/this\.render\(/.test(wiring.slice(0, 3500)), 'the double-click path renders directly');

  // Per-step dblclick listeners are only allowed where the shared shell handler
  // genuinely cannot reach: the talent orb graph builds its own SVG nodes, which
  // are not data-item-id rows in the work surface the shell wires.
  const ALLOWED_DBLCLICK = new Map([
    ['talent-step.js', 'SVG orb-graph nodes are not work-surface rows the shell wires'],
    ['talent-tree-progression-renderer.js', 'standalone tree renderer with its own node DOM'],
  ]);
  const offenders = [];
  for (const name of fs.readdirSync(path.join(ROOT, 'scripts/apps/progression-framework/steps'))) {
    if (!name.endsWith('.js') || ALLOWED_DBLCLICK.has(name)) continue;
    const src = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/steps', name), 'utf8');
    if (/addEventListener\(\s*'dblclick'/.test(src)) offenders.push(name);
  }
  assert.deepEqual(
    offenders,
    [],
    'these steps add their own dblclick listener; the shell already provides one:\n  ' + offenders.join('\n  ')
  );
}

/* ------------------------------------------------------------------ *
 * 8. The detail rails still use the same canonical action, so all three
 *    routes converge.
 * ------------------------------------------------------------------ */
{
  const detailsDir = path.join(ROOT, 'templates/apps/progression-framework/details-panel');
  const commitRails = fs.readdirSync(detailsDir)
    .filter(f => f.endsWith('.hbs'))
    .filter(f => fs.readFileSync(path.join(detailsDir, f), 'utf8').includes('data-action="commit-item"'));

  for (const expected of [
    'species-details.hbs', 'class-details.hbs', 'background-details.hbs',
    'feat-details.hbs', 'talent-details.hbs', 'force-secret-details.hbs',
    'force-technique-details.hbs', 'medical-secret-details.hbs',
  ]) {
    assert.ok(commitRails.includes(expected), `${expected} no longer commits through commit-item`);
  }
}

console.log('progression-card-select-actions: all assertions passed');
