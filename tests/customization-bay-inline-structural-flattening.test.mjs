/**
 * Garage / Shipyard corrective engineering — Phase 2: inline Holopad
 * structural flattening.
 *
 * Before this phase, the character Holopad shell hosted Droid Garage /
 * Starship Shipyard by rendering the ENTIRE standalone customization-bay.hbs
 * template (its own outer border, glow, screen-fill background, framing
 * padding, window-sizing, and full-surface scanline, all bundled into one
 * <div class="swse-customization-bay">) inline via
 * CustomizationSurfaceAdapter.buildViewModel(), then
 * surface-customization.hbs injected that whole rendered frame into the
 * Holopad's own screen — a second, redundant device frame drawn inside the
 * real one ("a datapad inside a datapad").
 *
 * This phase:
 *   - extracts the canonical Garage/Shipyard UI (header, mode tabs, context
 *     strip, mentor region, build-stage/legal/budget/warning rails, systems
 *     work area, compliance/readiness sections, summary rail, footer) into a
 *     single shared content partial:
 *     templates/apps/customization/partials/customization-bay-content.hbs.
 *     This is what actually separates content from chrome: the same
 *     content root (.swse-customization-bay, unchanged — still the design-
 *     token scope and internal flex layout used by ~300 .bay-* CSS rules)
 *     is used by both hosts, so nothing is forked into a second,
 *     independently-maintained copy.
 *   - turns the standalone customization-bay.hbs into a thin wrapper that
 *     adds ONE new element, .swse-customization-bay-standalone-frame,
 *     supplying the standalone-only device-frame chrome (border, outer
 *     glow, screen-fill background, 18px framing padding, min/max window
 *     sizing, full-surface scanline).
 *   - has CustomizationSurfaceAdapter render the canonical content partial
 *     directly (no wrapper) for the inline Holopad path, so the
 *     standalone-only frame class never appears in that DOM at all — there
 *     is nothing to strip or override inline, because the chrome is never
 *     rendered there in the first place.
 *
 * These are static/source-level tests (this repo has no Handlebars runtime
 * dependency and no jsdom harness for this template), following the
 * existing pattern in tests/workbench-inline-structural-flattening.test.mjs.
 * They pin the actual architectural contract — one canonical content body,
 * no duplicated markup, no reintroduced double-frame, mentor hook intact,
 * action bindings intact — not incidental whitespace/indentation.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const ROOT_DIR = fileURLToPath(root);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const PARTIAL_PATH = 'templates/apps/customization/partials/customization-bay-content.hbs';
const STANDALONE_PATH = 'templates/apps/customization/customization-bay.hbs';
const SURFACE_PATH = 'templates/shell/partials/surface-customization.hbs';
const ADAPTER_PATH = 'scripts/ui/shell/CustomizationSurfaceAdapter.js';
const PARTIAL_INCLUDE = '{{> "systems/foundryvtt-swse/templates/apps/customization/partials/customization-bay-content.hbs"}}';
const STANDALONE_FRAME_CLASS = 'swse-customization-bay-standalone-frame';
const CONTENT_ROOT_MARKER = 'data-customization-bay-content';
const CSS_PATH = 'styles/apps/customization-bay.css';

// Classes proven (by direct CSS audit — see PR #947 correction) to
// independently paint a full min-height:100% screen background AND an
// absolutely-positioned ::before page-frame SVG overlay
// (styles/ui/swse-holo-phase1.css). Carrying either on the canonical
// content root reintroduces "a second full-screen frame drawn inside the
// real one" even though the standalone/inline wrapper split is otherwise
// correct. swse-datapad is deliberately NOT in this list: it was audited
// to contribute only typography, a GPU-acceleration hint, tooltip
// focus-visible styling, and select/option theming — no background, no
// border, no frame chrome.
const RESIDUAL_SHELL_CLASSES = ['swse-ui-shell', 'swse-sheet-ui'];

// Markers that must appear exactly once across the whole codebase: the
// canonical regions of the Garage/Shipyard UI. If these start appearing
// twice, someone has forked the content into a second, separately-
// maintained copy instead of sharing the partial.
const CANONICAL_REGION_MARKERS = [
  'class="bay-header"',
  'class="bay-mode-tabs"',
  'class="bay-context-strip"',
  'class="bay-mentor bay-mentor--{{config.mentorClass}}"',
  'class="bay-workgrid"',
  'class="bay-left-rail"',
  'class="bay-main"',
  'class="bay-right-rail"',
  'class="bay-footer"',
  'class="bay-implementation-notes"',
];

// A representative sample of data-action bindings the Bay relies on,
// spanning mode/context switching, Tech Specialist, systems browsing, and
// footer actions. If extraction dropped or mistyped any of these, the
// corresponding user-facing control silently breaks.
const REQUIRED_ACTIONS = [
  'data-action="set-mode"',
  'data-action="set-context"',
  'data-action="open-tech-specialist"',
  'data-action="designate-signature-device"',
  'data-action="toggle-tech-signature-trait"',
  'data-action="browse-systems"',
  'data-action="save-draft"',
  'data-action="request-gm-approval"',
  'data-action="store-quote"',
  'data-action="reset-build"',
  'data-action="close-bay"',
  'data-action="validate-build"',
  'data-action="apply-build"',
];

async function findHbsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findHbsFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.hbs')) files.push(full);
  }
  return files;
}

// ---------------------------------------------------------------------------
// TEST CONTRACT A — one canonical content partial.
// ---------------------------------------------------------------------------
{
  const partial = await read(PARTIAL_PATH);
  for (const marker of CANONICAL_REGION_MARKERS) {
    assert.ok(partial.includes(marker), `customization-bay-content.hbs is missing required region marker: ${marker}`);
  }

  const standalone = await read(STANDALONE_PATH);
  const surface = await read(SURFACE_PATH);
  for (const marker of CANONICAL_REGION_MARKERS) {
    assert.ok(
      !standalone.includes(marker),
      `standalone customization-bay.hbs contains a duplicated copy of canonical marker "${marker}" instead of including the shared partial`
    );
    assert.ok(
      !surface.includes(marker),
      `surface-customization.hbs contains a duplicated copy of canonical marker "${marker}" instead of including the shared partial via CustomizationSurfaceAdapter`
    );
  }

  assert.ok(
    standalone.includes(PARTIAL_INCLUDE),
    'standalone customization-bay.hbs must wrap the canonical customization-bay-content.hbs partial'
  );

  const adapter = await read(ADAPTER_PATH);
  assert.match(
    adapter,
    /renderTemplate\(\s*\n?\s*'systems\/foundryvtt-swse\/templates\/apps\/customization\/partials\/customization-bay-content\.hbs'/,
    'CustomizationSurfaceAdapter.buildViewModel() must render the canonical customization-bay-content.hbs partial'
  );

  // Whole-repo scan: the canonical content root's stable identity hook
  // (data-customization-bay-content) must appear in EXACTLY one template
  // file. This is the real guard against a second, independently
  // rendered inline-only content root (Mutation 2) — a duplicated hook
  // would mean two DOM trees both claim to be the canonical Bay content.
  const allHbs = await findHbsFiles(path.join(ROOT_DIR, 'templates'));
  const filesWithMarker = [];
  for (const full of allHbs) {
    const source = await readFile(full, 'utf8');
    if (source.includes(CONTENT_ROOT_MARKER)) {
      filesWithMarker.push(path.relative(ROOT_DIR, full).split(path.sep).join('/'));
    }
  }
  assert.deepEqual(
    filesWithMarker,
    [PARTIAL_PATH],
    `the ${CONTENT_ROOT_MARKER} content-root hook must appear in exactly one template file (found: ${filesWithMarker.join(', ') || 'none'}) — a second occurrence means the content was forked instead of shared`
  );
}

// ---------------------------------------------------------------------------
// TEST CONTRACT B — inline does not render the standalone frame.
// ---------------------------------------------------------------------------
{
  const adapter = await read(ADAPTER_PATH);
  assert.doesNotMatch(
    adapter,
    /renderTemplate\(\s*\n?\s*'systems\/foundryvtt-swse\/templates\/apps\/customization\/customization-bay\.hbs'/,
    'CustomizationSurfaceAdapter must not render the full standalone customization-bay.hbs inline — that reintroduces the double device frame'
  );

  const surface = await read(SURFACE_PATH);
  assert.doesNotMatch(
    surface,
    /\{\{>\s*"systems\/foundryvtt-swse\/templates\/apps\/customization\/customization-bay\.hbs"/,
    'surface-customization.hbs must not include the full standalone customization-bay.hbs'
  );
  assert.ok(
    !surface.includes(STANDALONE_FRAME_CLASS),
    'surface-customization.hbs must not itself declare the standalone-only frame class'
  );
}

// ---------------------------------------------------------------------------
// TEST CONTRACT C — standalone still owns its frame.
// ---------------------------------------------------------------------------
{
  const standalone = await read(STANDALONE_PATH);
  const frameIdx = standalone.indexOf(STANDALONE_FRAME_CLASS);
  const includeIdx = standalone.indexOf(PARTIAL_INCLUDE);
  assert.notEqual(frameIdx, -1, 'standalone customization-bay.hbs must declare the standalone-only frame class');
  assert.notEqual(includeIdx, -1, 'standalone customization-bay.hbs must include the canonical content partial');
  assert.ok(
    frameIdx < includeIdx,
    'the standalone frame class must wrap (appear before, as an ancestor element of) the canonical content partial include, not sit alongside/after it'
  );
}

// ---------------------------------------------------------------------------
// TEST CONTRACT D — no second inline device frame: the canonical content
// root must never itself carry the standalone-only frame class, since it is
// rendered bare (no wrapper) for the inline Holopad host.
// ---------------------------------------------------------------------------
{
  const partial = await read(PARTIAL_PATH);
  const classAttrRe = new RegExp(`class="[^"]*\\b${STANDALONE_FRAME_CLASS}\\b[^"]*"`);
  assert.doesNotMatch(
    partial,
    classAttrRe,
    `canonical customization-bay-content.hbs must not carry ${STANDALONE_FRAME_CLASS} on any element — that class exists only on the standalone-only wrapper, never on content rendered inline`
  );
}

// ---------------------------------------------------------------------------
// TEST CONTRACT D2 — no residual generic device/shell chrome on the
// canonical content root (PR #947 correction). Structural extraction alone
// (Contract D) does not make inline content frameless if the content root
// itself still opts into a class that independently paints a full-screen
// background and page-frame overlay — see RESIDUAL_SHELL_CLASSES above.
// Checked against the actual class="..." attribute, not a blind substring
// search, so a code comment mentioning these class names elsewhere in the
// file (e.g. explaining why they were removed) can never cause a false
// positive.
// ---------------------------------------------------------------------------
{
  const partial = await read(PARTIAL_PATH);
  const rootClassMatch = partial.match(/<div class="([^"]*)"\s*\n\s*data-customization-bay-content/);
  assert.ok(rootClassMatch, 'could not locate the canonical content root\'s class attribute');
  const rootClasses = rootClassMatch[1].split(/\s+/);
  for (const shellClass of RESIDUAL_SHELL_CLASSES) {
    assert.ok(
      !rootClasses.includes(shellClass),
      `canonical content root must not carry ${shellClass} — its effective CSS (styles/ui/swse-holo-phase1.css) paints a full-screen background and a ::before page-frame overlay, reintroducing a second frame inside the Holopad`
    );
  }
  assert.ok(rootClasses.includes('swse-customization-bay'), 'canonical content root must still carry its own identity class');
  assert.ok(rootClasses.includes('swse-datapad'), 'canonical content root should retain swse-datapad — audited to contribute only typography/tooltip/select theming, no frame chrome');
}

// ---------------------------------------------------------------------------
// TEST CONTRACT E — shared content hooks survive extraction: action
// delegation and mentor hydration hooks must still be present in the
// canonical partial (this is what ShellHost._wireCustomizationSurfaceEvents,
// character-sheet.js's inline wiring, and
// CustomizationSurfaceAdapter.afterInlineRender() all depend on).
// ---------------------------------------------------------------------------
{
  const partial = await read(PARTIAL_PATH);
  for (const action of REQUIRED_ACTIONS) {
    assert.ok(partial.includes(action), `canonical partial is missing required action binding: ${action}`);
  }
  assert.match(partial, /data-customization-mentor-text/, 'canonical partial must retain the mentor-text hydration hook');
  assert.match(partial, /data-mentor="\{\{mentor\.mentorKey\}\}"/, 'canonical partial must retain the mentor key hook');
  assert.match(partial, /data-raw-text="\{\{mentor\.mentorText\}\}"/, 'canonical partial must retain the raw-text hydration hook');
  assert.match(partial, /data-mode="\{\{mode\}\}"/, 'canonical partial must retain the mode root attribute used by ShellHost route lookups');
}

// ---------------------------------------------------------------------------
// TEST CONTRACT F — exactly one mentor region: the canonical partial has
// exactly one hologram mentor container, and neither host template adds a
// second one around it.
// ---------------------------------------------------------------------------
{
  const partial = await read(PARTIAL_PATH);
  const mentorContainerCount = (partial.match(/class="bay-mentor__portrait swse-mentor-hologram"/g) || []).length;
  assert.equal(mentorContainerCount, 1, `canonical partial must contain exactly one mentor hologram container, found ${mentorContainerCount}`);

  const standalone = await read(STANDALONE_PATH);
  const surface = await read(SURFACE_PATH);
  assert.ok(!standalone.includes('bay-mentor'), 'standalone wrapper must not add its own mentor region around the included content');
  assert.ok(!surface.includes('bay-mentor'), 'surface-customization.hbs must not add its own mentor region around the injected content');
}

// ---------------------------------------------------------------------------
// TEST CONTRACT G — Phase 1 foundation frozen: structural flattening must
// not regress wallet/asset authority, host-scoped adapter isolation, mentor
// identity, player-portrait exclusion, or mentor translation. Composed by
// actually re-running the Phase 1 contract suites (not re-implementing
// their assertions here) — any assertion failure inside either propagates
// as a failure of this contract.
// ---------------------------------------------------------------------------
{
  await import('./customization-bay-foundation-contract.test.mjs');
  await import('./mentor-hologram-contract.test.mjs');
}

// ---------------------------------------------------------------------------
// TEST CONTRACT H — standalone height/flex chain (PR #947 correction).
// Protects the definite-height chain from the real Foundry .window-content
// down through the standalone frame into the canonical content root, which
// is what lets .bay-workgrid's existing flex:1 1 auto/min-height:0 actually
// bound a height for the three existing scroll lanes to scroll within
// (rather than only ever growing with their content). Semantic presence
// checks against the actual CSS rule bodies, not pixel/exact-value
// snapshots, except where preserving the pre-existing sizing values is the
// point.
// ---------------------------------------------------------------------------
{
  const css = await read(CSS_PATH);

  // (a) window-content itself must become a definite-height flex column,
  // scoped to the Bay's own ApplicationV2 root class — never a bare/global
  // .window-content rule, which would leak into every other application.
  const windowContentMatch = css.match(
    /\.swse-customization-bay-app \.window-content,\s*\n\.swse-customization-bay-app \[data-application-content\]\s*\{([^}]*)\}/
  );
  assert.ok(windowContentMatch, '.swse-customization-bay-app .window-content/[data-application-content] rule must exist');
  const windowContentBody = windowContentMatch[1];
  assert.match(windowContentBody, /display:\s*flex/, 'window-content must become a flex container');
  assert.match(windowContentBody, /flex-direction:\s*column/, 'window-content must lay out as a column');
  assert.match(windowContentBody, /height:\s*100%/, 'window-content must be given a definite height to flex against');
  assert.match(windowContentBody, /min-height:\s*0/, 'window-content must allow its flex children to shrink');

  // (b) the standalone frame itself must be a flex participant in that
  // chain (flex:1 1 auto) while still retaining its own display:flex
  // column layout for its one child, and its existing sizing values.
  // Anchored on "position: relative;" as the rule's first declaration (not
  // just the bare selector) because .swse-customization-bay-standalone-
  // frame also appears as part of the shared token-declaration selector
  // list earlier in the file — a bare selector match would find that block
  // instead.
  const frameMatch = css.match(/\.swse-customization-bay-standalone-frame\s*\{\s*\n\s*position:\s*relative;([^}]*)\}/);
  assert.ok(frameMatch, '.swse-customization-bay-standalone-frame frame-chrome rule must exist');
  const frameBody = frameMatch[1];
  assert.match(frameBody, /display:\s*flex/, 'standalone frame must be a flex container for its content child');
  assert.match(frameBody, /flex-direction:\s*column/, 'standalone frame must lay out as a column');
  assert.match(frameBody, /flex:\s*1 1 auto/, 'standalone frame must participate in window-content\'s flex chain');
  assert.match(frameBody, /min-height:\s*720px/, 'standalone frame must retain its existing 720px minimum sizing');
  // max-height is declared in a separate, later rule (the "scroll safety"
  // section) — checked against the whole file, not this rule body.
  assert.match(
    css,
    /\.swse-customization-bay-standalone-frame\s*\{\s*\n\s*max-height:\s*calc\(100vh - 96px\);\s*\n\}/,
    'standalone frame must retain its existing max-height window-sizing constraint'
  );

  // (c) the canonical content root must participate as a flex child of the
  // standalone frame specifically (not globally — inline already gets this
  // via the pre-existing .swse-shell-surface--customization rules in
  // shell-host.css, which must not be duplicated or altered here).
  const contentParticipationMatch = css.match(
    /\.swse-customization-bay-standalone-frame > \.swse-customization-bay\s*\{([^}]*)\}/
  );
  assert.ok(contentParticipationMatch, '.swse-customization-bay-standalone-frame > .swse-customization-bay rule must exist');
  const contentParticipationBody = contentParticipationMatch[1];
  assert.match(contentParticipationBody, /flex:\s*1 1 auto/, 'content root must flex to fill the standalone frame');
  assert.match(contentParticipationBody, /min-height:\s*0/, 'content root must be allowed to shrink so bay-workgrid can bound the scroll lanes');

  // (d) the pre-existing bounded work-area and lane scroll owners must be
  // completely unchanged by this correction.
  assert.match(css, /\.swse-customization-bay \.bay-workgrid\s*\{\s*\n\s*flex:\s*1 1 auto;\s*\n\s*min-height:\s*0;\s*\n\s*overflow:\s*hidden;\s*\n\}/, '.bay-workgrid\'s existing bounded flex rule must be unchanged');
  assert.match(
    css,
    /\.swse-customization-bay \.bay-left-rail,\s*\n\.swse-customization-bay \.bay-main,\s*\n\.swse-customization-bay \.bay-right-rail\s*\{\s*\n\s*min-height:\s*0;\s*\n\s*overflow-y:\s*auto;/,
    'the existing three lane scroll owners (.bay-left-rail/.bay-main/.bay-right-rail) must be unchanged'
  );

  // (e) the standalone template must actually carry the attribute this CSS
  // scopes against.
  const standalone = await read(STANDALONE_PATH);
  assert.match(standalone, /data-application-content/, 'standalone wrapper must carry data-application-content for the height-chain CSS to scope against');
}

console.log('customization-bay-inline-structural-flattening: all assertions passed');
