import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const shell = read('scripts/apps/progression-framework/chargen-shell.js');
const splash = read('scripts/apps/progression-framework/steps/intro-step.js');
const gallery = read('templates/apps/progression-framework/steps/galactic-profile-archetype-work-surface.hbs');
const review = read('templates/apps/progression-framework/steps/galactic-profile-review-work-surface.hbs');
const css = read('styles/progression-framework/steps/intro.css');
const step = read('scripts/apps/progression-framework/steps/galactic-profile-step.js');

test('Galactic Profile uses one gallery step, then the explicit review step', () => {
  const injection = shell.split('_injectGalacticProfileDescriptors(descriptors) {')[1];
  assert.ok(injection, 'profile descriptor injection exists');
  assert.match(injection, /stepId: 'profile-archetype'/);
  assert.match(injection, /stepId: 'profile-review'/);
  assert.doesNotMatch(injection.split('const filtered =')[0], /stepId: 'profile-class'/);
  assert.match(splash, /_targetStepId = 'profile-archetype'/);
});

test('gallery contains real selectable cards without hover-only mechanics', () => {
  assert.match(gallery, /data-action="profile-select-template"/);
  assert.match(gallery, /data-action="profile-filter-class"/);
  assert.match(gallery, /data-profile-gallery-search/);
  assert.match(gallery, /selectedPreview/);
  assert.match(gallery, /aria-pressed/);
  assert.match(gallery, /data-profile-search-text="\{\{searchText\}\}"/, 'cards expose their search text to the DOM filter');
  assert.match(gallery, /data-profile-gallery-results[^>]*aria-live="polite"|aria-live="polite"[^>]*data-profile-gallery-results/, 'result count is announced');
  assert.match(gallery, /<p class="gpux-empty" data-profile-gallery-empty hidden>/, 'search-miss message exists and starts hidden');
  assert.doesNotMatch(gallery, /archetype-overlay/);
  assert.match(css, /gpux-card\.prog-profile-archetype-card\[hidden\]/);
});

test('gallery remains a pure catalog preview with explicit selection', () => {
  assert.match(step, /GalacticProfileRegistry\.listCatalog\(\{ subtype \}\)/);
  assert.match(step, /state\.templateId = profile\.profileId/);
  assert.match(step, /state\.classId = profile\.catalog\.classKey/);
  assert.match(step, /browseClassId/);
  assert.match(step, /_gallerySearch/);
  assert.doesNotMatch(gallery, /data-action="profile-apply"/);
});

test('review clearly distinguishes authored preview from V2 confirmation', () => {
  assert.match(review, /authored choices/i);
  assert.match(review, /data-action="profile-apply"/);
  assert.match(review, /template\.blocked/);
  assert.match(review, /template\.canApply/);
  assert.match(review, /data-action="previous-step"/);
  assert.match(review, /data-profile-character-name/);
  assert.match(step, /GalacticProfileService\.applyForShell/);
});

test('every gpux class used by the templates is styled (no typos / orphaned markup)', () => {
  const used = new Set();
  for (const tpl of [gallery, review]) for (const m of tpl.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c.startsWith('gpux')) used.add(c);
  assert.ok(used.size > 30, 'templates actually use the gpux vocabulary');
  const styled = new Set([...css.matchAll(/\.(gpux[\w-]*)/g)].map(m => m[1]));
  const missing = [...used].filter(c => c !== 'gpux' && !styled.has(c));
  assert.deepEqual(missing, [], `unstyled classes: ${missing}`);
});

test('every data-action in the two templates has a handler (step plugin or the shell action map)', () => {
  const shellSrc = read('scripts/apps/progression-framework/shell/progression-shell.js');
  const actions = new Set();
  for (const tpl of [gallery, review]) for (const m of tpl.matchAll(/data-action="([^"]+)"/g)) actions.add(m[1]);
  assert.deepEqual([...actions].sort(), ['previous-step', 'profile-apply', 'profile-filter-class', 'profile-resolve', 'profile-select-template']);
  for (const action of actions) {
    const inStep = step.includes(`action === '${action}'`);
    const inShell = new RegExp(`'${action}'\\(e, t\\)`).test(shellSrc);
    assert.ok(inStep || inShell, `${action} has a handler`);
  }
  // Back goes through the shell's own handler: the step never mutates the session for it.
  assert.equal(step.includes(`action === 'previous-step'`), false);
});

test('rails are hidden only by step-scoped CSS: no persisted rail state is touched', () => {
  const marker = css.indexOf('Galactic Profiles UX');
  const block = css.slice(css.indexOf('*/', marker) + 2).replace(/\/\*[\s\S]*?\*\//g, ''); // rules only, comments stripped
  const selectors = [...block.matchAll(/^([^{}@]+)\{/gm)].map(m => m[1]).join('\n');
  for (const line of selectors.split(/[,\n]/).map(s => s.trim()).filter(Boolean)) {
    assert.ok(line.startsWith('.progression-shell[data-step-id="profile-') || /^\.(gpux|prog-galactic-profile\.gpux)/.test(line) || line.startsWith('.gpux'), `unscoped selector: ${line}`);
  }
  for (const stepId of ['profile-archetype', 'profile-review']) {
    for (const hidden of ['.prog-rail-resizer', '.prog-content-gridline', '.prog-summary-restore']) {
      const escaped = `.progression-shell[data-step-id="${stepId}"] ${hidden}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.ok(new RegExp(`${escaped}(?![\\w-])`).test(block), `${hidden} hidden on ${stepId} so no blank space is reserved`);
    }
    for (const region of ['summary-panel', 'details-panel', 'utility-bar']) {
      assert.ok(block.includes(`.progression-shell[data-step-id="${stepId}"] [data-region="${region}"]`), `${region} hidden on ${stepId}`);
    }
  }
  assert.doesNotMatch(step, /progression-rail-resizer|localStorage|setSetting|game\.settings/, 'no rail preference writes from the step');
});

test('obsolete visual-class assets are gone', () => {
  for (const file of ['templates/apps/progression-framework/steps/galactic-profile-class-work-surface.hbs']) {
    assert.equal(fs.existsSync(new URL(`../${file}`, import.meta.url)), false, `${file} removed`);
  }
  assert.equal(/galactic-profile-class-work-surface/.test(read('scripts/load-templates.js')), false);
  assert.equal(/galactic-profile-class-work-surface/.test(read('scripts/apps/progression-framework/shell/chargen-splash-preloader.js')), false);
  assert.equal(/prog-profile-class-card|prog-profile-substeps|archetype-overlay/.test(css), false, 'old class-card / substep / hover-overlay CSS removed');
  assert.equal(/prog-profile-archetype-card/.test(gallery), true, 'cards keep the shared class the new CSS overrides');
});
