import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');
const lib = read('templates/shell/partials/games/surface-games-library.hbs');
const detail = read('templates/shell/partials/games/surface-games-detail.hbs');
const rail = read('templates/shell/partials/games/surface-games-rail.hbs');
const css = read('styles/system/games-library-launcher.css');
const all = lib + detail + rail;

// GC-LIB-04/07: no developer phase / build / guardrail copy in the player view
for (const bad of ['implementationPhase', 'phaseShort', 'infrastructureNotes', 'RulesGuardrails', 'ShellUI.SSOT', 'swse-games-rail-card--notes', 'ShellUI.Build']) assert(!all.includes(bad), `player view must not contain ${bad}`);
assert(!/\{\{this\.status\}\}/.test(lib) && !/vm\.selectedGame\.status/.test(detail), 'registry status ("Playable MVP") is not shown to players');

// every existing action contract survives the recomposition
const actions = [...all.matchAll(/data-games-action="([^"]+)"/g)].map((m) => m[1]);
for (const a of ['select-game', 'open-games-composer', 'open-session', 'accept-invite', 'decline-invite', 'open-thread']) assert(actions.includes(a), `${a} still wired`);
assert.match(detail, /data-game-id="\{\{vm\.selectedGame\.id\}\}"/, 'composer opens for the selected game');
// GC-LIB-08: the primary action precedes the spec grid
assert(detail.indexOf('swse-games-configure-cta') < detail.indexOf('swse-games-spec-grid'));
// the activity shelf is still the rail partial (active tables, invites, recent results)
for (const c of ['hasActiveSessions', 'hasInviteSessions', 'hasRecentSessions']) assert(rail.includes(c));

// registry: every game has a player-facing blurb without developer wording
const reg = read('scripts/games/game-center-registry.js');
const blurbs = [...reg.matchAll(/blurb: "([^"]+)"/g)].map((m) => m[1]);
assert.equal(blurbs.length, 4);
for (const b of blurbs) assert(!/MVP|phase|foundation|implementation|SSOT/i.test(b), b);

// stylesheet: registered after the shared layers, scoped, grid fills, narrow fallback, reduced motion
const sys = JSON.parse(read('system.json')).styles;
assert(sys.indexOf('styles/system/games-library-launcher.css') > sys.indexOf('styles/system/games-table-unification.css'));
for (const sel of css.replace(/\/\*[\s\S]*?\*\//g, '').split('{').map((p) => p.split('}').pop().trim()).filter((p) => p && !p.startsWith('@media'))) {
  for (const one of sel.split(',')) assert.match(one.trim(), /launcher|games-game-card|swse-games-game-card--/, `scoped: ${one.trim()}`);
}
assert.match(css, /grid-template-rows: repeat\(2, minmax\(0, 1fr\)\)/, 'gallery rows grow with the window');
assert.match(css, /@media \(max-width: 900px\)/); assert.match(css, /prefers-reduced-motion/);
// GC-LIB-06: a capped shelf says so, so the header count and the shelf can never silently disagree
for (const k of ['active', 'invites', 'recent']) assert(rail.includes(`vm.shelfOverflow.${k}`), `${k} overflow is shown`);
console.log('games library launcher contract: ok');
