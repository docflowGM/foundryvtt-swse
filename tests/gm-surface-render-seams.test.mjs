/**
 * GM/shell surface render seams.
 *
 * The three surfaces below used to repaint with a direct `render(false)`,
 * which bypasses the guarded seam that captures scroll/UI state and coalesces
 * repeated requests. These tests pin the repaired behaviour:
 *
 *   - the static contract check reports zero findings, in strict mode too;
 *   - no direct render(false) survives in the governed shell/GM surfaces;
 *   - repeated requests in one task coalesce into a single repaint;
 *   - one rejected render does not strand the in-flight flag;
 *   - the GM Datapad re-open path stays eligible for scroll preservation;
 *   - the two controllers request their owning surface rather than rendering.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

// 1. The static contract check is clean in both modes.
{
  for (const args of [[], ['--strict']]) {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('tools/check-shell-mutation-contract.mjs', root)), ...args],
      { encoding: 'utf8' }
    );
    assert.equal(
      result.status,
      0,
      `check-shell-mutation-contract ${args.join(' ')} failed:\n${result.stdout}${result.stderr}`
    );
    assert.match(result.stdout, /check passed/);
  }
}

// 2. No direct render(false) remains in the three repaired surfaces. The only
// permitted call sites are inside each surface's own guarded scheduler, where
// the render is wrapped in ShellMutationGuard.withSurfaceRender.
{
  const files = [
    'scripts/apps/gm-datapad.js',
    'scripts/ui/shell/TransmissionDecryptionSurfaceController.js',
    'scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js',
  ];
  for (const rel of files) {
    const source = await read(rel);
    for (const [index, line] of source.split('\n').entries()) {
      if (!/\brender\??\.?\(false\)/.test(line)) continue;
      assert.match(
        line,
        /ShellMutationGuard\.withSurfaceRender/,
        `${rel}:${index + 1} renders outside the guarded seam: ${line.trim()}`
      );
    }
  }
}

// 3. Repeated requests coalesce, and a rejected render clears the in-flight
// promise instead of latching. Exercised against the GM Datapad's scheduler
// shape, reproduced here because the real class needs a Foundry runtime.
{
  const scheduler = {
    _shellRenderPromise: null,
    _isRendering: false,
    renders: 0,
    failNext: false,
    element: null,
    _shellUiStatePreserver: { captures: [], capture(_el, info) { this.captures.push(info); } },
    requestSurfaceRender({ reason = 'gm-surface-render', surfaceId = 'home', preserveUi = true } = {}) {
      if (this._shellRenderPromise) {
        if (preserveUi) {
          this._shellUiStatePreserver.capture(this.element, {
            surfaceId, reason: `${reason}:coalesced-before-render`,
          });
        }
        return this._shellRenderPromise;
      }
      this._shellRenderPromise = Promise.resolve().then(async () => {
        if (preserveUi) {
          this._shellUiStatePreserver.capture(this.element, { surfaceId, reason: `${reason}:before-render` });
        }
        if (this.failNext) { this.failNext = false; throw new Error('render rejected'); }
        this.renders += 1;
      }).finally(() => { this._shellRenderPromise = null; });
      return this._shellRenderPromise;
    },
  };

  const first = scheduler.requestSurfaceRender({ reason: 'a' });
  const second = scheduler.requestSurfaceRender({ reason: 'b' });
  const third = scheduler.requestSurfaceRender({ reason: 'c' });
  assert.equal(second, first, 'second request must join the pending repaint');
  assert.equal(third, first, 'third request must join the pending repaint');
  await first;
  assert.equal(scheduler.renders, 1, 'three requests in one task must produce one repaint');

  // Coalesced requests still capture UI state, so scroll survives the merge.
  assert.equal(
    scheduler._shellUiStatePreserver.captures.filter(c => c.reason.endsWith(':coalesced-before-render')).length,
    2
  );

  scheduler.failNext = true;
  await assert.rejects(scheduler.requestSurfaceRender({ reason: 'boom' }), /render rejected/);
  assert.equal(scheduler._shellRenderPromise, null, 'a rejected render must not strand the flag');
  await scheduler.requestSurfaceRender({ reason: 'after-failure' });
  assert.equal(scheduler.renders, 2, 'a later request must still run after a rejection');
}

// 4. The GM Datapad re-open path goes through the guarded seam, which defaults
// to preserveUi, so the surface being brought to front keeps its scroll.
{
  const source = await read('scripts/apps/gm-datapad.js');
  assert.match(source, /reason: 'gm-datapad-reopen'/);
  assert.doesNotMatch(source, /existing\.render\(false\)/);
  assert.match(source, /requestSurfaceRender\(\{ reason = 'gm-surface-render', surfaceId = this\.currentPage, preserveUi = true \} = \{\}\)/);
}

// 5. Both controllers route to their owning surface and report, rather than
// silently no-opping, when no host is attached.
{
  const transmission = await read('scripts/ui/shell/TransmissionDecryptionSurfaceController.js');
  assert.match(transmission, /requestShellRender\(this\._host, \{ reason, surfaceId \}\)/);
  assert.match(transmission, /No shell host available to repaint/);
  assert.doesNotMatch(transmission, /this\._host\?\.render\?\.\(false\)/);

  const faction = await read('scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js');
  assert.match(faction, /requestShellRender\(this\.host, \{ reason \}\)/);
  assert.match(faction, /No shell host available to repaint/);
  assert.doesNotMatch(faction, /this\.host\?\.render\?\.\(false\)/);
}

// 6. requestShellRender itself prefers the host scheduler and otherwise still
// wraps the render in the mutation guard — no ungoverned path exists.
{
  const helper = await read('scripts/ui/shell/request-shell-render.js');
  assert.match(helper, /host\.requestSurfaceRender\(\{ reason, surfaceId, preserveUi \}\)/);
  assert.match(helper, /ShellMutationGuard\.withSurfaceRender\(host, \(\) => host\.render\(false\)/);
}

console.log('GM/shell surface render seam guards passed.');
