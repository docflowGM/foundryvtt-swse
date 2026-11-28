import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// F-ACT-007: ActorEngine must not shadow `actor.items.filter/some/map/find` on every update when Sentinel diagnostics are OFF (the wrappers only report SSOT
// violations, which returns immediately when OFF). Instrumentation applies only in a diagnostic mode.
for (const l of ['log', 'info', 'debug', 'warn']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const { SentinelEngine } = await import('/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js');
const mkActor = () => { const items = [{ id: 'i' }]; items.get = () => null; return { id: 'a', name: 'A', items }; };
const patched = (a) => ['filter', 'some', 'map', 'find'].filter((m) => Object.prototype.hasOwnProperty.call(a.items, m));

const savedMode = SentinelEngine.getMode();
try {
  SentinelEngine.setMode(SentinelEngine.MODES.OFF);
  const off = mkActor(); ActorEngine._instrumentActorItemsForSSSTOT(off);
  assert.deepEqual(patched(off), [], 'diagnostics OFF: the items collection is left untouched');
  const dev = mkActor(); SentinelEngine.setMode(SentinelEngine.MODES.DEV); ActorEngine._instrumentActorItemsForSSSTOT(dev);
  assert.deepEqual(patched(dev).sort(), ['filter', 'find', 'map', 'some'], 'a diagnostic mode still instruments');
  assert.equal(dev.items.filter((i) => i.id === 'i').length, 1, 'wrapped methods keep their behavior');
} finally { SentinelEngine.setMode(savedMode); }
process.stdout.write('actor-engine-items-instrumentation-gated: ok\n');
