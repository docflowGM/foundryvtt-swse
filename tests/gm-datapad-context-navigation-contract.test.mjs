import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 2: the shell navigation contract
// (2T). GMDatapad extends ApplicationV2 and cannot be instantiated outside a
// real Foundry runtime — tests/gm-surface-render-seams.test.mjs already
// established this codebase's answer to that: reproduce the exact scheduler
// shape as a duck-typed fake and execute the real algorithm against it, then
// pin the real source file with regex assertions so the fake cannot silently
// drift from what scripts/apps/gm-datapad.js actually does.
//
// This proves, by executing the real _navigateTo()/navigateToSurface()
// method bodies (copied verbatim from scripts/apps/gm-datapad.js, not
// reimplemented or summarized):
//   - an unknown target surface is rejected/falls back to home
//   - destination state (or, for Jobs, a host property) is applied BEFORE
//     the render call — not after
//   - the shell surface (currentPage) is actually changed
//   - exactly one render happens per navigation call
//   - unrelated existing surface state on the destination survives the patch

registerFoundryPathLoader();
installFoundryShimGlobals({
  game: {
    user: { isGM: true },
    settings: { get: () => null, set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} },
    actors: [],
    scenes: new Map()
  }
});

const { GMSurfaceRegistry } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMSurfaceRegistry.js');
const { ShellSurfaceState } = await import('/systems/foundryvtt-swse/scripts/ui/shell/ShellSurfaceState.js');

/**
 * Fake GMDatapad host — reproduces the real getSurfaceState/patchSurfaceState/
 * requestSurfaceRender/_navigateTo/navigateToSurface bodies from
 * scripts/apps/gm-datapad.js exactly (see the assertions at the bottom of
 * this file, which pin the real file against this same shape).
 */
function makeFakeHost() {
  const renders = [];
  return {
    currentPage: 'locations',
    _gmTabletMinimized: false,
    _shellSurfaceState: new ShellSurfaceState({ locations: { search: 'existing-query' } }),
    _setGmDatapadMinimized(value) { this._gmTabletMinimized = value; },
    getSurfaceState(surfaceId = this.currentPage) {
      return this._shellSurfaceState.get(surfaceId || 'home');
    },
    patchSurfaceState(surfaceId = this.currentPage, patch = {}, { render = false } = {}) {
      const next = this._shellSurfaceState.patch(surfaceId || this.currentPage || 'home', patch);
      if (render) void this.requestSurfaceRender({ surfaceId });
      return next;
    },
    async requestSurfaceRender({ reason = 'gm-surface-render', surfaceId = this.currentPage } = {}) {
      renders.push({ reason, surfaceId, currentPageAtRenderTime: this.currentPage });
    },
    async _navigateTo(pageId) {
      if (this._gmTabletMinimized) this._setGmDatapadMinimized(false);
      const targetPage = GMSurfaceRegistry.hasSurface(pageId) ? pageId : 'home';
      this.currentPage = targetPage;
      if (targetPage === 'store') {
        const storeState = this.getSurfaceState('store');
        this.currentTab = storeState.currentTab || this.currentTab || 'options';
        this.patchSurfaceState('store', { currentTab: this.currentTab }, { render: false });
      }
      await this.requestSurfaceRender({ reason: 'gm-navigate', surfaceId: targetPage });
    },
    async navigateToSurface(surfaceId, { statePatch = null, hostPatch = null } = {}) {
      if (hostPatch && typeof hostPatch === 'object') {
        for (const [key, value] of Object.entries(hostPatch)) this[key] = value;
      }
      if (statePatch && typeof statePatch === 'object' && Object.keys(statePatch).length) {
        this.patchSurfaceState(surfaceId, statePatch, { render: false });
      }
      return this._navigateTo(surfaceId);
    },
    _renders: renders
  };
}

// --- Faction destination: statePatch, one render, prior state preserved ---
{
  const host = makeFakeHost();
  host._shellSurfaceState.patch('factions', { unrelatedFilter: 'keep-me' });
  await host.navigateToSurface('factions', { statePatch: { focusedFactionId: 'hutt-cartel' } });
  assert.equal(host.currentPage, 'factions', 'shell surface must change to the destination');
  assert.equal(host.getSurfaceState('factions').focusedFactionId, 'hutt-cartel', 'destination must receive the requested selection before render');
  assert.equal(host.getSurfaceState('factions').unrelatedFilter, 'keep-me', 'an unrelated existing filter must survive the patch (2O)');
  assert.equal(host._renders.length, 1, 'navigation must render exactly once');
  assert.equal(host._renders[0].currentPageAtRenderTime, 'factions', 'the render must happen AFTER currentPage/state are already set to the destination');
}

// --- Job destination: hostPatch (bare property, not surface state) ---
{
  const host = makeFakeHost();
  await host.navigateToSurface('jobs', { hostPatch: { selectedJobThreadId: 'job-thread-2' } });
  assert.equal(host.currentPage, 'jobs');
  assert.equal(host.selectedJobThreadId, 'job-thread-2', 'Jobs selects via a bare host property, not surface state — hostPatch must set it before render');
  assert.equal(host._renders.length, 1);
}

// --- Intel destination: selectedRecordId ---
{
  const host = makeFakeHost();
  await host.navigateToSurface('intel', { statePatch: { selectedRecordId: 'intel-2' } });
  assert.equal(host.currentPage, 'intel');
  assert.equal(host.getSurfaceState('intel').selectedRecordId, 'intel-2');
  assert.equal(host._renders.length, 1);
}

// --- Reverse-compatible shape: Faction -> Locations, using Locations' own
// real current surface id/selection field (2J: generic enough for reverse
// nav, without wiring every reverse link this phase). ---
{
  const host = makeFakeHost();
  host.currentPage = 'factions';
  await host.navigateToSurface('locations', { statePatch: { selectedLocationId: 'mos-eisley' } });
  assert.equal(host.currentPage, 'locations', 'the same contract must work navigating the other direction');
  assert.equal(host.getSurfaceState('locations').selectedLocationId, 'mos-eisley');
  assert.equal(host.getSurfaceState('locations').search, 'existing-query', 'reverse nav into Locations must not blow away its existing search filter');
  assert.equal(host._renders.length, 1);
}

// --- Broken/unknown target surface fails safe (falls back to home, no throw) ---
{
  const host = makeFakeHost();
  await host.navigateToSurface('not-a-real-surface', { statePatch: { selectedThingId: 'x' } });
  assert.equal(host.currentPage, 'home', 'an unknown surface id must fail safe to home, never navigate to a nonexistent surface');
  assert.equal(host._renders.length, 1);
}

console.log('GM Datapad navigateToSurface()/_navigateTo() shell navigation contract passed (validated target, pre-render state, single render, state preserved, reverse-compatible shape, safe fallback).');

// --- Pin the fake above against the REAL scripts/apps/gm-datapad.js source,
// so this test cannot silently drift from what the real, un-instantiable
// (outside Foundry) class actually does. ---
{
  const source = await readFile(new URL('../scripts/apps/gm-datapad.js', import.meta.url), 'utf8');

  assert.match(source, /async navigateToSurface\(surfaceId, \{ statePatch = null, hostPatch = null \} = \{\}\) \{/, 'navigateToSurface signature must match the fake exercised above');
  assert.match(source, /for \(const \[key, value\] of Object\.entries\(hostPatch\)\) this\[key\] = value;/, 'hostPatch must be applied directly onto the host, matching the fake');
  assert.match(source, /this\.patchSurfaceState\(surfaceId, statePatch, \{ render: false \}\);/, 'statePatch must be applied with render:false before navigation, matching the fake');
  assert.match(source, /return this\._navigateTo\(surfaceId\);/, 'navigateToSurface must delegate to the existing _navigateTo(), not re-implement validation/render');

  assert.match(source, /async _navigateTo\(pageId\) \{/);
  assert.match(source, /const targetPage = GMSurfaceRegistry\.hasSurface\(pageId\) \? pageId : 'home';/, '_navigateTo must validate against the real GMSurfaceRegistry, matching the fake');
  assert.match(source, /this\.currentPage = targetPage;/);
  assert.match(source, /await this\.requestSurfaceRender\(\{ reason: 'gm-navigate', surfaceId: targetPage \}\);/, '_navigateTo must render exactly once, matching the fake');
}

console.log('scripts/apps/gm-datapad.js source pinned against the executed navigation contract above.');
