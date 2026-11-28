import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Structural regression for the active ProgressionShell intro, not the
// historical standalone SWSEProgressionSplashV2.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'styles/progression-framework/steps/intro.css'), 'utf8');
const shellCSS = fs.readFileSync(path.join(root, 'styles/progression-framework/progression-shell.css'), 'utf8');
const template = fs.readFileSync(path.join(root, 'templates/apps/progression-framework/progression-shell.hbs'), 'utf8');
const hostCSS = fs.readFileSync(path.join(root, 'styles/system/shell-host.css'), 'utf8');
// The intro containment section ends where the separate, step-scoped Galactic Profiles UX block begins
// (that block intentionally hides progression rails on its own steps and is not splash CSS).
const containmentStart = css.indexOf('PROGRESSION INTRO — DATAPAD VIEWPORT CONTAINMENT');
const galacticUxStart = css.indexOf('Galactic Profiles UX: unified illustrated gallery');
const scoped = css.slice(containmentStart, galacticUxStart > containmentStart ? galacticUxStart : undefined);

assert.ok(scoped.startsWith('PROGRESSION INTRO — DATAPAD VIEWPORT CONTAINMENT'));
assert.match(template, /<div class="prog-intro-stage" data-region="work-surface">/);
assert.match(shellCSS, /\.progression-shell \.prog-intro-stage\[data-region="work-surface"\]\s*\{/);
assert.match(hostCSS, /\.swse-prog-inline-intro/);

// The embedded container is measured independently of the browser viewport.
// Without this, a 1920px browser can still have a 700px datapad viewport.
assert.match(scoped, /\.progression-shell\[data-step-id="intro"\] \.prog-intro-stage\[data-region="work-surface"\]\s*\{[^}]*container-type:\s*inline-size/s);
assert.match(scoped, /@container \(max-width:\s*1020px\)/);
assert.match(scoped, /@container \(max-width:\s*600px\)/);
assert.match(scoped, /max-width:\s*100%;/);
assert.match(scoped, /overflow:\s*hidden;/);

// The original actor override forces a minimum 270px + center + 310px.
// The container breakpoint must replace that with a shrinkable single column,
// and must occur after the original override in the cascade.
const oldColumns = css.indexOf('grid-template-columns: 270px minmax(0, 1fr) 310px');
const containment = css.indexOf('PROGRESSION INTRO — DATAPAD VIEWPORT CONTAINMENT');
assert.ok(oldColumns > 0 && containment > oldColumns, 'Fix must win over the original fixed-column rule');
assert.match(scoped, /\.prog-intro-surface--actor-v2 \.boot,\s*\.progression-shell\[data-step-id="intro"\] \.prog-intro-surface--droid-v2 \.boot\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
assert.match(scoped, /overflow-y:\s*auto;/, 'Inner screen must scroll rather than clipping tall splash content');
assert.match(scoped, /overflow-x:\s*hidden;/, 'Horizontal overspill must be prevented');
assert.match(scoped, /\.prog-intro-surface--actor-v2 \.pane,[^}]*height:\s*auto;/s);
assert.match(scoped, /\.prog-intro-surface--droid-v2 \.screen-inner\s*\{[^}]*height:\s*auto;/s);
assert.match(scoped, /position:\s*sticky;\s*bottom:\s*0;/,
  'Continue actions must stay accessible at the bottom of the scrollable screen');

// No changes to source data, splash animation, or progression behavior.
assert.ok(!scoped.includes('display: none'), 'Do not hide splash panels to make the frame fit');
console.log('progression-intro-datapad-containment: all assertions passed');
