import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Contract guards for Array / Standard / Organic pointer drag support.
// These are static checks; full drag gestures still require Foundry browser QA.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const step = read('scripts/apps/progression-framework/steps/attribute-step.js');
const css = read('styles/progression-framework/steps/attribute-step.css');
const template = read('templates/apps/progression-framework/steps/attribute-work-surface.hbs');

assert.match(step, /_wirePooledTouchDrag\(shell, workSurfaceEl, signal\)/,
  'The Attribute step must attach touch dragging after rendering');
assert.match(step, /\['touch', 'pen'\]/,
  'Touch and pen interactions must be supported');
assert.match(step, /\['array', 'standard', 'organic'\]/,
  'Touch drag must be limited to pooled generation methods');
assert.match(step, /document\.elementFromPoint\(x, y\)/,
  'Drag movement must resolve its drop target from pointer coordinates');
assert.match(step, /this\._assignSelectedPoolToAbility\(ability, shell\)/,
  'Pointer drops must use the existing allocation authority');
assert.match(step, /if \(!wasDragging\) return/,
  'A simple tap must remain a normal tap-to-select interaction');
assert.match(step, /source\.addEventListener\('pointercancel'/,
  'Cancelled touch gestures must clean up');
assert.match(step, /signal\.addEventListener\('abort', cleanup/,
  'Re-rendered controls must clean up in-progress drags');
assert.match(step, /ev\.dataTransfer\.setData\('text\/plain', poolId\)/,
  'Desktop HTML drag-and-drop must remain supported');
assert.match(template, /data-score-pool-id="{{id}}"/,
  'Pool chips must retain identity for both touch and desktop dragging');
assert.match(template, /data-ability-row="{{id}}"/,
  'Ability rows must remain drop targets');
assert.match(css, /\[data-score-pool-id\]\s*\{\s*touch-action: none/,
  'Pooled chips must opt out of the browser touch pan recognizer');
assert.match(css, /\.prog-attr-v2-cell\.is-drop-ready/,
  'Drop targets must provide visual feedback');
assert.match(css, /\.prog-attr-v2-drag-ghost/,
  'Dragging must display a pointer-following score preview');

// Organic's three dice per attribute and the pooled swap behavior are kept
// in the pre-existing allocation authority, not reimplemented in event code.
assert.match(step, /_getAssignmentsPerAbility\(shell\)\s*\{\s*return this\._method === 'organic' \? 3 : 1;/);
assert.match(step, /const currentOccupant = this\._scorePool\.find\(/);
assert.match(step, /assignedItems\.length >= slotsPerAbility/);

console.log('progression-attribute-touch-drag: all assertions passed');
