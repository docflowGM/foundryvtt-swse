import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const hbs = readFileSync('templates/shell/partials/games/surface-games-hintaro-table.hbs', 'utf8');
const css = readFileSync('styles/system/games-hintaro-table.css', 'utf8');
const sys = JSON.parse(readFileSync('system.json', 'utf8'));

// HIN-01: the dedicated layout stylesheet is registered AFTER the shared unification layer so its scoped rules win
const styles = sys.styles;
assert(styles.includes('styles/system/games-hintaro-table.css'));
assert(styles.indexOf('styles/system/games-hintaro-table.css') > styles.indexOf('styles/system/games-table-unification.css'));
// scoping: every selector is Hintaro-specific, so other games are unaffected
for (const sel of css.replace(/\/\*[\s\S]*?\*\//g, '').split('{').map((p) => p.split('}').pop().trim()).filter((p) => p && !p.startsWith('@media'))) {
  for (const one of sel.split(',')) assert.match(one.trim(), /hintaro/, `selector must be Hintaro-scoped: ${one.trim()}`);
}
// HIN-04: avatar image carries a constrained class and the CSS fixes its size
assert.match(hbs, /<img class="swse-hintaro-seat-avatar" src="\{\{this\.avatar\}\}"/);
assert.match(css, /width: 44px;[\s\S]*?height: 44px;/);
// HIN-02/03: the dock is in normal flow and is never an overflow:hidden clip target; the felt scrolls instead
const dockRule = css.match(/\.swse-hintaro-player-dock \{[\s\S]*?\}/)[0];
assert.match(dockRule, /position: static/); assert.doesNotMatch(dockRule, /overflow:\s*hidden/);
assert.match(css, /\.swse-hintaro-felt \{[\s\S]*?overflow: auto/);
// HIN-07: reference panels are in a drawer, the live actions are not
const helpOpen = hbs.indexOf('<details class="swse-hintaro-help">'); const helpClose = hbs.indexOf('</details>', helpOpen);
const drawer = hbs.slice(helpOpen, helpClose);
for (const cls of ['swse-hintaro-ranks-panel', 'swse-hintaro-callout', 'swse-hintaro-rules-panel']) assert(drawer.includes(cls), `${cls} is in the drawer`);
for (const action of ['hintaro-check', 'hintaro-bet', 'hintaro-call-bet', 'hintaro-raise', 'hintaro-drop', 'hintaro-keep-roll', 'hintaro-reroll-die', 'hintaro-next-round', 'hintaro-cash-out']) {
  const at = hbs.indexOf(`data-games-action="${action}"`);
  assert(at > helpClose, `${action} exists and is outside the reference drawer`);
}
// the dock follows the felt (actions never nested in the clipped stage)
assert(hbs.indexOf('<section class="swse-hintaro-player-dock">') > hbs.indexOf('</section>', hbs.indexOf('<section class="swse-hintaro-felt"')));
console.log('hintaro layout contract: ok');
