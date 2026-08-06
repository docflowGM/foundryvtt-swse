import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
  { file: 'starship-maneuver-work-surface.hbs', cards: 1, action: 'increment-quantity' },
  { file: 'force-power-work-surface.hbs', cards: 2, action: 'increment-quantity' },
  { file: 'language-work-surface.hbs', cards: 1, action: 'select-language' },
];

// Bespoke interaction steps. These are deliberately NOT part of the generic
// card contract: their controls encode an interaction, not a candidate choice,
// and flattening them into SELECT would lose meaning the player relies on.
const BESPOKE_STEPS = new Map([
  ['skills-work-surface.hbs', 'Train/Untrain carries the rules meaning; training limits and class-skill legality are step-specific'],
  ['attribute-work-surface.hbs', 'ability dice, point-buy and array assignment are an interaction, not a candidate list'],
]);

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
 * 1b. Bespoke steps keep their purpose-built controls.
 *
 * The accurate claim is "every conventional candidate-card step has a visible
 * card-level SELECT", not "every progression step uses the generic partial".
 * ------------------------------------------------------------------ */
{
  for (const [file, reason] of BESPOKE_STEPS) {
    const src = step(file);
    assert.ok(
      !src.includes('option-card-action.hbs'),
      `${file} was flattened into the generic SELECT contract, but it is bespoke: ${reason}`
    );
  }
  // Skills keeps its own vocabulary and actions.
  const skills = step('skills-work-surface.hbs');
  assert.match(skills, /data-action="skill-train"/, 'skills lost its Train action');
  assert.match(skills, /data-action="skill-untrain"/, 'skills lost its Untrain action');
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
    'select-language', 'remove-bonus-language',
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
 * 6. Double-click resolution — driven through the PRODUCTION helper.
 *
 * This block used to keep a hand-copied "faithful" duplicate of the shell's
 * logic. It drifted, and it asserted that a locked card falls through to the
 * generic commit path — encoding the defect instead of catching it.
 * ------------------------------------------------------------------ */
{
  const { resolveCardGesture, findCardAction, isDisabledControl, rowGestureKey, GESTURE_WINDOW_MS } =
    await import(pathToFileURL(
      path.join(ROOT, 'scripts/apps/progression-framework/shell/card-gesture-resolver.js')
    ).href);

  const makeEl = ({ dataset = {}, cardAction = false, disabled = false, aria = null, children = [] } = {}) => {
    const el = {
      dataset, disabled, clicks: 0, children,
      _cardAction: cardAction,
      getAttribute: (name) => (name === 'aria-disabled' ? aria : null),
      click() { this.clicks += 1; },
      closest(selector) {
        if (selector.includes('data-card-action') && el._isControl) return el;
        return null;
      },
      querySelector(selector) {
        if (!selector.includes('data-card-action')) return null;
        return children.find(c => c._cardAction) ?? null;
      },
    };
    return el;
  };

  const freshState = () => ({ key: null, at: 0, seq: 0 });

  // An enabled card action is invoked once for one gesture.
  {
    const action = makeEl({ dataset: { action: 'commit-item' }, cardAction: true });
    const row = makeEl({ dataset: { itemId: 'human' }, children: [action] });
    const state = freshState();
    const first = resolveCardGesture({ row, target: row, timeStamp: 1000, state });
    assert.equal(first.outcome, 'card-action');
    first.action.click();
    const second = resolveCardGesture({ row, target: row, timeStamp: 1005, state });
    assert.equal(second.outcome, 'deduplicated', 'the click/dblclick pair produced two actions');
    assert.equal(action.clicks, 1);
  }

  // A DISABLED card action does nothing. It must NOT fall through to commit.
  {
    const action = makeEl({ dataset: { action: 'commit-item' }, cardAction: true, disabled: true });
    const row = makeEl({ dataset: { itemId: 'locked' }, children: [action] });
    const result = resolveCardGesture({ row, target: row, timeStamp: 1, state: freshState() });
    assert.equal(result.outcome, 'blocked-disabled',
      'a locked card still reached the generic commit path');
    assert.notEqual(result.outcome, 'fallback-commit');
    assert.equal(action.clicks, 0);
  }

  // aria-disabled counts too.
  {
    const action = makeEl({ dataset: { action: 'commit-item' }, cardAction: true, aria: 'true' });
    const row = makeEl({ dataset: { itemId: 'locked-aria' }, children: [action] });
    assert.equal(isDisabledControl(action), true);
    assert.equal(
      resolveCardGesture({ row, target: row, timeStamp: 1, state: freshState() }).outcome,
      'blocked-disabled'
    );
  }

  // Legacy rows with no marked action still reach the commit fallback.
  {
    const row = makeEl({ dataset: { itemId: 'legacy' } });
    assert.equal(findCardAction(row), null);
    assert.equal(
      resolveCardGesture({ row, target: row, timeStamp: 1, state: freshState() }).outcome,
      'fallback-commit'
    );
  }

  // A click on the card's own control never enters the row gesture path.
  {
    const action = makeEl({ dataset: { action: 'commit-item' }, cardAction: true });
    action._isControl = true;
    const row = makeEl({ dataset: { itemId: 'human' }, children: [action] });
    assert.equal(
      resolveCardGesture({ row, target: action, timeStamp: 1, state: freshState() }).outcome,
      'ignored-control'
    );
  }

  // A genuine later double-click acts again.
  {
    const action = makeEl({ dataset: { action: 'commit-item' }, cardAction: true });
    const row = makeEl({ dataset: { itemId: 'human' }, children: [action] });
    const state = freshState();
    resolveCardGesture({ row, target: row, timeStamp: 1000, state });
    resolveCardGesture({ row, target: row, timeStamp: 1005, state });
    assert.equal(
      resolveCardGesture({ row, target: row, timeStamp: 1000 + GESTURE_WINDOW_MS + 10, state }).outcome,
      'card-action'
    );
  }

  // Two identity-less rows never share a gesture key.
  {
    const state = freshState();
    const a = makeEl({ dataset: {} });
    const b = makeEl({ dataset: {} });
    const seq = { next: () => (state.seq = (state.seq ?? 0) + 1) };
    const keyA = rowGestureKey(a, seq);
    const keyB = rowGestureKey(b, seq);
    assert.notEqual(keyA, keyB, 'two identity-less rows shared a deduplication key');

    assert.equal(resolveCardGesture({ row: a, target: a, timeStamp: 3000, state }).outcome, 'fallback-commit');
    assert.equal(resolveCardGesture({ row: b, target: b, timeStamp: 3005, state }).outcome, 'fallback-commit',
      'one row suppressed a different row');
  }

  // Different cards do not suppress each other.
  {
    const state = freshState();
    const rowA = makeEl({ dataset: { itemId: 'a' } });
    const rowB = makeEl({ dataset: { itemId: 'b' } });
    assert.equal(resolveCardGesture({ row: rowA, target: rowA, timeStamp: 1000, state }).outcome, 'fallback-commit');
    assert.equal(resolveCardGesture({ row: rowB, target: rowB, timeStamp: 1005, state }).outcome, 'fallback-commit');
  }
}

/* ------------------------------------------------------------------ *
 * 7. The shell really contains that resolution and deduplication.
 * ------------------------------------------------------------------ */
{
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  assert.match(shell, /import \{ resolveCardGesture \} from '\.\/card-gesture-resolver\.js'/,
    'the shell no longer uses the shared gesture resolver');
  assert.match(shell, /resolveCardGesture\(\{\n\s*row,/, 'the shell does not call the resolver');
  assert.match(shell, /outcome === 'blocked-disabled'/,
    'the shell no longer stops on a disabled card action');
  assert.ok(!shell.includes('const isRepeatGesture = (event, row)'),
    'the shell still keeps its own copy of the gesture logic');

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

/* ------------------------------------------------------------------ *
 * 9. Legality lives in the step, never in the shared partial.
 *
 * A prerequisite check inside the partial would be a second copy of the rules
 * the detail rail already applies, free to diverge silently.
 * ------------------------------------------------------------------ */
{
  const partial = read(`templates/apps/progression-framework/${PARTIAL}`);
  // The doc comment may name the rules it deliberately does not apply; the
  // markup below it must not touch them.
  const partialMarkup = partial.slice(partial.indexOf('--}}') + 4);
  for (const rule of [
    'prerequisite', 'missingPrereq', 'meetsPrereqs', 'isAvailable',
    'remainingPicks', 'budget', 'canIncrement', 'canAddMore',
  ]) {
    assert.ok(
      !partialMarkup.includes(rule),
      `the shared partial's markup references "${rule}" — legality belongs to the owning step`
    );
  }

  // The steps that gained a state decision keep it in the view model.
  const featStep = read('scripts/apps/progression-framework/steps/feat-step.js');
  assert.match(featStep, /_buildFeatCardAction\(feat, featId\)/, 'feat card state is not computed in the plugin');
  for (const state of ['granted', 'owned', 'unavailable']) {
    assert.ok(featStep.includes(`state: '${state}'`), `feat card state is missing ${state}`);
  }

  const techniqueStep = read('scripts/apps/progression-framework/steps/force-technique-step.js');
  assert.match(techniqueStep, /cardActionState:/, 'technique card state is not computed in the plugin');
  assert.match(techniqueStep, /cardActionDisabled:/, 'technique card disabled state is not computed');

  const powerStep = read('scripts/apps/progression-framework/steps/force-power-step.js');
  assert.match(powerStep, /cardActionState:/, 'force power quantity state is not computed in the plugin');
  assert.ok(powerStep.includes("'maximum'") && powerStep.includes("'again'"),
    'force power card state does not distinguish "add another" from "at maximum"');
}

/* ------------------------------------------------------------------ *
 * 10. Feat cards render the state the step decided, and never a bare
 *     `disabled` flag the plugin does not set.
 *
 * The first cut passed `disabled=feat.isUnavailable`, a field no plugin ever
 * sets, so an unavailable feat still offered an enabled SELECT.
 * ------------------------------------------------------------------ */
{
  const feats = step('feat-work-surface.hbs');
  assert.ok(!feats.includes('disabled=feat.isUnavailable'),
    'feat cards still key their disabled state on a field the plugin never sets');
  const calls = [...feats.matchAll(/option-card-action\.hbs"([\s\S]{0,400}?)\}\}/g)].map(m => m[1]);
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.match(call, /state=feat\.cardAction\.state/);
    assert.match(call, /disabled=feat\.cardAction\.disabled/);
    assert.match(call, /deselect=feat\.cardAction\.deselect/);
  }
}

/* ------------------------------------------------------------------ *
 * 11. Quantity steps use increment semantics and a real budget flag.
 * ------------------------------------------------------------------ */
{
  const powers = step('force-power-work-surface.hbs');
  const calls = [...powers.matchAll(/option-card-action\.hbs"([\s\S]{0,400}?)\}\}/g)].map(m => m[1]);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.match(call, /action="increment-quantity"/, 'force power SELECT must not imitate commit-item');
    assert.match(call, /enabled=canIncrement/, 'force power SELECT ignores the budget');
    assert.match(call, /state=cardActionState/);
  }
  // The +/- controls survive.
  assert.match(powers, /data-action="increment-quantity"[\s\S]{0,400}?prog-quantity-btn|prog-quantity-btn[\s\S]{0,400}?data-action="increment-quantity"/);
  assert.match(powers, /data-action="decrement-quantity"/);

  for (const [file, flag] of [
    ['force-secret-work-surface.hbs', '../canAddMore'],
    ['medical-secret-work-surface.hbs', '../canAddMore'],
    ['force-regimen-work-surface.hbs', '../../canAddMore'],
    ['starship-maneuver-work-surface.hbs', '../canAddMore'],
  ]) {
    const src = step(file);
    assert.ok(src.includes(`enabled=${flag}`), `${file} SELECT ignores the step's budget (${flag})`);
    assert.ok(src.includes('useEnabled=true'), `${file} SELECT has no enable gate`);
  }
}


console.log('progression-card-select-actions: all assertions passed');
