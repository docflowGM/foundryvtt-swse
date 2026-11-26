import assert from 'node:assert/strict';
import fs from 'node:fs';
// F-PRG-001/F-PAT-001 (3N): the force-suite render-guard hotfix wrapped every open sheet's render() and inspected the call stack. The surface
// render guard is now applied at the repaint call sites themselves.
const src = fs.readFileSync('scripts/engine/force/force-suite-runtime-repairs.js', 'utf8');
assert.ok(!/actor\.sheet\?\.render\?\.\(false\)/.test(src), 'no unguarded sheet repaint remains in the force-suite repairs');
assert.ok(/ShellMutationGuard\.withSurfaceRender\(sheet/.test(src), 'repaints use the shell surface-render guard');
assert.ok(!fs.existsSync('scripts/patches/force-suite-render-guard-hotfix.js'), 'the stack-inspecting render patch is gone');
assert.ok(!/stack\.includes\(/.test(src));
console.log('force-suite-repaint-guard: ok');
