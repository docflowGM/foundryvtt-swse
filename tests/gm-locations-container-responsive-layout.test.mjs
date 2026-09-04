import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Locations Stage 3 — container-aware responsive layout contract.
//
// GMDatapad's own window can be resized independently of the browser
// viewport (GM_TABLET_MIN_WIDTH ~= 792px, see scripts/apps/gm-datapad.js),
// and the Locations surface sits behind a command rail that further eats
// into that width. The workbench's two-column grid
// (minmax(360px,.85fr) minmax(520px,1.15fr) + gap) needs ~892px minimum,
// so a `@media` breakpoint measuring the BROWSER viewport can stay
// well above its threshold while the actual surface has far less than
// that available, silently clipping/overflowing with no responsive
// fallback ever firing. This proves the surface now measures its OWN
// width via a CSS container query, with the original viewport media
// query retained as a fallback rather than deleted.

const root = new URL('../', import.meta.url);
const css = await readFile(new URL('styles/apps/gm-holopad-concept-phase2.css', root), 'utf8');

// 1. The Locations surface establishes an inline-size containment context
// under a stable, referenceable name.
assert.match(
  css,
  /\.gm-datapad-locations\s*\{[^}]*container-type:\s*inline-size;[^}]*container-name:\s*gm-locations-surface;/s,
  '.gm-datapad-locations must declare container-type: inline-size and container-name: gm-locations-surface'
);

// 2. A @container rule keyed to that name collapses the two-column
// workbench (and the filter/support grids that assume its width) once the
// SURFACE itself narrows — not the browser viewport.
const containerBlockMatch = css.match(/@container gm-locations-surface \(max-width:\s*(\d+)px\)\s*\{([\s\S]*?)\n\}/);
assert.ok(containerBlockMatch, 'expected an @container gm-locations-surface (max-width: ...) rule');
const [, , containerBlockBody] = containerBlockMatch;
assert.match(containerBlockBody, /\.gm-location-workbench\s*\{[^}]*grid-template-columns:\s*1fr;/s, 'the @container rule must collapse .gm-location-workbench to a single column');
assert.match(containerBlockBody, /\.gm-location-modal-filters--friendly\s*\{[^}]*grid-template-columns:\s*1fr\s*!important;/s, 'the @container rule must also collapse the friendly filter grid');
assert.match(containerBlockBody, /\.gm-location-selected-support\s*\{[^}]*grid-template-columns:\s*1fr;/s, 'the @container rule must also collapse the selected-location support grid');

// 3. The original viewport media-query fallback for the same three rules
// must still exist — this is a layered fix (container query as the real
// signal, viewport media query kept as a coarse fallback for browsers or
// contexts without container-query support), not a swap that could
// regress older behavior.
assert.match(
  css,
  /@media \(max-width: 1180px\)\s*\{\s*\.swse-sheet-v2-shell--gm-datapad \.gm-command-screen-v2--phase2 \.gm-location-workbench\s*\{\s*grid-template-columns:\s*1fr;/,
  'the original @media (max-width: 1180px) fallback for .gm-location-workbench must still be present, not deleted'
);

console.log('GM Locations container-responsive layout contract passed (surface-width container query present and layered over the original viewport fallback, not replacing it).');
