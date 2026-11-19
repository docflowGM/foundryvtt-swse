import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Layout contract for the shared chargen/level-up mentor rail.
// Keep portrait geometry local to the progression shell while reusing the
// canonical hologram image filter, tint and scanline effects unchanged.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const css = read('styles/progression-framework/mentor-rail-stability.css');
const template = read('templates/apps/progression-framework/mentor-rail.hbs');
const hologram = read('styles/system/mentor-hologram.css');

const zone = css.match(/\.progression-shell \[data-region="mentor-rail"\] \.prog-mentor__portrait-zone\s*\{([^}]*)\}/)?.[1];
const frame = css.match(/\.progression-shell \[data-region="mentor-rail"\] \.prog-mentor__portrait\s*\{([^}]*)\}/)?.[1];
const image = css.match(/\.progression-shell \[data-region="mentor-rail"\] \.prog-mentor__portrait-image\s*\{([^}]*)\}/)?.[1];
assert.ok(zone && frame && image, 'The rail needs explicit portrait zone, frame and image rules');

for (const [name, rule] of [['portrait zone', zone], ['portrait frame', frame]]) {
  assert.match(rule, /width:\s*78px;/, name + ' must have a bounded width');
  assert.match(rule, /height:\s*78px;/, name + ' must have a square height');
  assert.doesNotMatch(rule, /height:\s*100%/, name + ' must not stretch to the rail height');
}
assert.match(frame, /overflow:\s*hidden/, 'The portrait frame must clip the image and overlay');
assert.match(image, /object-fit:\s*cover/, 'Mentor art should fill its portrait frame');
assert.match(image, /object-position:\s*center\s+32%/, 'Faces should stay within the circular crop');
assert.match(css, /\.progression-shell\.is-shell-compact \[data-region="mentor-rail"\] \.prog-mentor__portrait-zone/,
  'Compact shells need their smaller bounded frame');
assert.match(template, /swse-mentor-hologram__image/, 'Keep the shared mentor image effect');
assert.match(template, /swse-mentor-hologram__tint/, 'Keep the shared mentor tint');
assert.match(template, /swse-mentor-hologram__scan/, 'Keep the shared mentor scanlines');
assert.match(hologram, /grayscale\(1\)/, 'Retain canonical hologram filter');
assert.match(hologram, /repeating-linear-gradient/, 'Retain canonical hologram scanlines');

console.log('progression-mentor-portrait-fit: all assertions passed');
