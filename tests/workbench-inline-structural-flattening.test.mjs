/**
 * Workbench UX Refactor — Phase 1: inline Holopad structural flattening.
 *
 * Before this phase, the character Holopad shell hosted the Item
 * Customization Workbench by rendering the ENTIRE standalone
 * item-customization-workbench.hbs template (stage > tablet > screen >
 * content) inline via WorkbenchSurfaceAdapter.buildViewModel(), then
 * surface-workbench.hbs wrapped that whole rendered frame in yet another
 * .swse-item-customization-workbench container. The result was a "tablet
 * inside the Holopad": four nested chrome layers before any actual workbench
 * content appeared, two of which (the standalone app's own stage background
 * and the tablet's 16px device bezel) existed purely to imitate a standalone
 * application window that the Holopad already provides.
 *
 * This phase:
 *   - extracts the canonical workbench UI (HUD, mentor, category tabs,
 *     inventory/detail workarea, lightsaber workspace, footer) into a single
 *     shared partial: templates/apps/customization/partials/workbench-content.hbs
 *   - has BOTH the standalone ItemCustomizationWorkbench window and the
 *     inline Holopad surface wrap that exact same partial in their own
 *     stage/screen chrome, instead of one embedding the other's full frame
 *   - removes the .swse-customization-tablet bezel entirely (verified to
 *     have zero CSS rules depending on it as an ancestor scope), which was
 *     the one layer of nesting that was safely, universally removable
 *     without rewriting the ~300 CSS rules that key off .swse-customization-
 *     stage as their scoping ancestor for lightsaber/general workbench
 *     styling in this pass.
 *
 * These are static/source-level tests (this repo has no Handlebars runtime
 * dependency and no jsdom harness for this template), following the existing
 * pattern in tests/gm-surface-render-seams.test.mjs. They pin the actual
 * architectural contract — one canonical content body, no duplicated markup,
 * no reintroduced double-frame, mentor hook intact, action bindings intact —
 * not incidental whitespace/indentation.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const PARTIAL_PATH = 'templates/apps/customization/partials/workbench-content.hbs';
const STANDALONE_PATH = 'templates/apps/customization/item-customization-workbench.hbs';
const SURFACE_PATH = 'templates/shell/partials/surface-workbench.hbs';
const ADAPTER_PATH = 'scripts/ui/shell/WorkbenchSurfaceAdapter.js';
const PARTIAL_INCLUDE = '{{> "systems/foundryvtt-swse/templates/apps/customization/partials/workbench-content.hbs"}}';

// Markers that must appear exactly once across the whole codebase: the
// canonical regions of the workbench UI. If these start appearing twice,
// someone has forked the content into a second, separately-maintained copy
// instead of sharing the partial.
const CANONICAL_REGION_MARKERS = [
  'class="swse-customization-hud"',
  'class="swse-customization-mentor',
  'class="swse-customization-tabs"',
  'class="workbench-inventory panel"',
  'class="workbench-detail"',
  'lightsaber-workspace lightsaber-workspace--tabs',
  'class="swse-customization-footer"',
  'class="swse-customization-empty"',
];

// A representative sample of data-action bindings the workbench relies on,
// spanning category/item selection, search, tabs, inspection, lightsaber
// construction, and footer actions. If extraction dropped or mistyped any
// of these, the corresponding user-facing control silently breaks.
const REQUIRED_ACTIONS = [
  'data-action="select-category"',
  'data-action="select-item"',
  'data-action="search-items"',
  'data-action="set-workbench-tab"',
  'data-action="inspect-upgrade"',
  'data-action="inspect-template"',
  'data-action="inspect-structural"',
  'data-action="apply-item"',
  'data-action="reset-item"',
  'data-action="close-workbench"',
  'data-action="inspect-lightsaber-component"',
  'data-action="set-lightsaber-tab"',
  'data-action="set-lightsaber-finish"',
  'data-action="attempt-lightsaber-construction"',
  'data-action="open-color-picker"',
];

// 1. The canonical partial exists and contains every required major region.
{
  const partial = await read(PARTIAL_PATH);
  for (const marker of CANONICAL_REGION_MARKERS) {
    assert.ok(partial.includes(marker), `workbench-content.hbs is missing required region marker: ${marker}`);
  }
}

// 2. Canonical region markers appear in the partial and NOWHERE else in the
// two host templates — i.e. the content is not duplicated into a second,
// independently-maintained copy inside either host.
{
  const partial = await read(PARTIAL_PATH);
  const standalone = await read(STANDALONE_PATH);
  const surface = await read(SURFACE_PATH);

  for (const marker of CANONICAL_REGION_MARKERS) {
    assert.ok(partial.includes(marker), `canonical partial missing marker: ${marker}`);
    assert.ok(
      !standalone.includes(marker),
      `standalone item-customization-workbench.hbs contains a duplicated copy of canonical marker "${marker}" instead of including the shared partial`
    );
    assert.ok(
      !surface.includes(marker),
      `surface-workbench.hbs contains a duplicated copy of canonical marker "${marker}" instead of including the shared partial via WorkbenchSurfaceAdapter`
    );
  }
}

// 3. Both hosts actually reference the canonical partial — the standalone
// template via a Handlebars {{> }} partial include, and the inline surface
// via WorkbenchSurfaceAdapter rendering that exact partial path into
// contentHtml (proven by the adapter source, since contentHtml itself is
// injected as a raw string at render time, not a static include).
{
  const standalone = await read(STANDALONE_PATH);
  assert.ok(
    standalone.includes(PARTIAL_INCLUDE),
    'standalone item-customization-workbench.hbs must wrap the canonical workbench-content.hbs partial'
  );

  const adapter = await read(ADAPTER_PATH);
  assert.match(
    adapter,
    /renderTemplate\(\s*\n?\s*'systems\/foundryvtt-swse\/templates\/apps\/customization\/partials\/workbench-content\.hbs'/,
    'WorkbenchSurfaceAdapter.buildViewModel() must render the canonical workbench-content.hbs partial'
  );
}

// 4. The inline Holopad surface must NOT render the full standalone
// application frame a second time. This is the core Phase 1 regression
// guard: it fails if someone reverts to rendering
// item-customization-workbench.hbs (stage>tablet>screen) directly inline,
// or reintroduces the eliminated .swse-customization-tablet bezel anywhere.
{
  const adapter = await read(ADAPTER_PATH);
  assert.doesNotMatch(
    adapter,
    /renderTemplate\(\s*\n?\s*'systems\/foundryvtt-swse\/templates\/apps\/customization\/item-customization-workbench\.hbs'/,
    'WorkbenchSurfaceAdapter must not render the full standalone workbench template inline — that reintroduces the double application frame'
  );

  const surface = await read(SURFACE_PATH);
  assert.doesNotMatch(
    surface,
    /\{\{>\s*"systems\/foundryvtt-swse\/templates\/apps\/customization\/item-customization-workbench\.hbs"/,
    'surface-workbench.hbs must not include the full standalone workbench template'
  );

  // The tablet bezel was verified to have zero CSS rules depending on it as
  // an ancestor scope, and was removed universally (standalone AND inline).
  // It must never reappear in the templates or the workbench/shell stylesheets.
  const filesThatMustNotMentionTablet = [
    STANDALONE_PATH,
    SURFACE_PATH,
    PARTIAL_PATH,
    'styles/apps/item-customization-workbench.css',
    'styles/system/shell-host.css',
    'styles/system/app-responsive-workbench.css',
  ];
  for (const rel of filesThatMustNotMentionTablet) {
    const source = await read(rel);
    assert.ok(
      !source.includes('swse-customization-tablet'),
      `${rel} must not reference the eliminated swse-customization-tablet bezel`
    );
  }
}

// 5. Mentor dialogue hook survives the extraction, and the adapter's inline
// hydration still targets it exactly as before.
{
  const partial = await read(PARTIAL_PATH);
  assert.match(
    partial,
    /data-workbench-mentor-text data-mentor="\{\{mentorKey\}\}" data-raw-text="\{\{mentorText\}\}"/,
    'canonical partial must retain the data-workbench-mentor-text hook with mentor key/raw-text data'
  );

  const adapter = await read(ADAPTER_PATH);
  assert.match(
    adapter,
    /surfaceRoot\?\.querySelector\?\.\('\[data-workbench-mentor-text\]'\)/,
    'WorkbenchSurfaceAdapter.afterInlineRender() must still hydrate [data-workbench-mentor-text]'
  );
  assert.match(adapter, /MentorTranslationIntegration\.render\(/, 'mentor translation pipeline must still be wired');
}

// 6. Representative data-action bindings survive the extraction intact.
{
  const partial = await read(PARTIAL_PATH);
  for (const action of REQUIRED_ACTIONS) {
    assert.ok(partial.includes(action), `canonical partial is missing required action binding: ${action}`);
  }
}

// 7. The new partial is registered for runtime preload (Foundry partial
// resolution requires this — see tools/check-runtime-template-preload.mjs),
// and both hosts still carry the theme/motion attributes (data-theme,
// data-motion-style, and the inline custom-property styles) needed for
// per-actor theme inheritance and the [data-motion-style] motion-reduction
// CSS scope, since those attributes now live on each host's own stage
// wrapper rather than inside the shared partial.
{
  const loader = await read('scripts/load-templates.js');
  assert.match(
    loader,
    /'systems\/foundryvtt-swse\/templates\/apps\/customization\/partials\/workbench-content\.hbs'/,
    'scripts/load-templates.js must preload the new canonical partial'
  );

  const standalone = await read(STANDALONE_PATH);
  assert.match(standalone, /data-theme="\{\{themeKey\}\}"/, 'standalone wrapper must set data-theme');
  assert.match(standalone, /data-motion-style="\{\{motionStyle\}\}"/, 'standalone wrapper must set data-motion-style');
  assert.match(standalone, /\{\{\{themeStyleInline\}\}\}/, 'standalone wrapper must apply themeStyleInline');

  const surface = await read(SURFACE_PATH);
  assert.match(surface, /data-theme="\{\{vm\.vm\.themeKey\}\}"/, 'inline wrapper must set data-theme from the workbench VM');
  assert.match(surface, /data-motion-style="\{\{vm\.vm\.motionStyle\}\}"/, 'inline wrapper must set data-motion-style from the workbench VM');
  assert.match(surface, /\{\{\{vm\.vm\.themeStyleInline\}\}\}/, 'inline wrapper must apply themeStyleInline from the workbench VM');
  // The inline wrapper must carry the same swse-datapad/swse-ui-shell/
  // swse-sheet-ui classes the standalone stage carries, since global theme
  // CSS (scanline strength, glow multiplier) keys off those class names —
  // dropping them would be an unintended visual regression, not a
  // structural simplification.
  assert.match(surface, /class="swse-customization-stage swse-datapad swse-ui-shell swse-sheet-ui"/,
    'inline stage wrapper must carry the same theme-integration classes as the standalone stage');
}

// 8. Inline hosting still never opens a standalone ApplicationV2 window: the
// adapter's _renderPreservingUi()/close() overrides that redirect rendering
// back to the shell host must still be in place.
{
  const adapter = await read(ADAPTER_PATH);
  assert.match(adapter, /this\._workbench\._renderPreservingUi = async function/, 'inline render must stay redirected to the shell host, not a standalone window');
  assert.match(adapter, /self\._shellHost\?\.setSurface\?\.\('sheet'\)/, 'closing the inline workbench must return to the character sheet surface');
}

console.log('workbench-inline-structural-flattening: all assertions passed');
