import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// Finding F-GOV-001 (Phase 3D.3): MutationInterceptor kept ONE context slot; an inner ActorEngine call's clearContext() ended the outer call's authorization.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader(); installFoundryShimGlobals();
const { MutationInterceptor: MI } = await import('/systems/foundryvtt-swse/scripts/governance/mutation/MutationInterceptor.js');
while (MI.hasContext()) MI.clearContext();

// 1. nested: inner clear must leave the outer authorized
MI.setContext({ operation: 'outer' });
MI.setContext({ operation: 'inner' });
MI.clearContext();
assert.equal(MI.hasContext(), true, 'outer call is still authorized after the inner call clears');
MI.clearContext();
assert.equal(MI.hasContext(), false, 'authorization ends when the outermost call clears');
console.log('  [1] nested contexts OK');

// 2. interleaved async calls (A set, B set, A clear, B clear) never leave B unauthorized mid-flight
MI.setContext({ operation: 'A' }); MI.setContext({ operation: 'B' }); MI.clearContext();
assert.equal(MI.hasContext(), true); MI.clearContext(); assert.equal(MI.hasContext(), false);
console.log('  [2] interleaved contexts OK');

// 3. unbalanced clear is a no-op, never negative
MI.clearContext(); MI.clearContext();
MI.setContext({ operation: 'x' }); assert.equal(MI.hasContext(), true); MI.clearContext(); assert.equal(MI.hasContext(), false);
console.log('  [3] unbalanced clear is safe OK');

// 4. blockNestedMutations still refuses while any context is active
MI.setContext({ operation: 'hook' });
assert.throws(() => MI.setContext({ operation: 'second', blockNestedMutations: true }), /already in progress/);
MI.clearContext(); assert.equal(MI.hasContext(), false, 'a refused nested set pushes nothing');
console.log('  [4] blockNestedMutations preserved OK');
console.log('mutation-interceptor-nested-context: ok');
