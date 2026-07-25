import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Smoke test for tools/check-critical-confirmation-guard.mjs: report mode
// must run cleanly (exit 0) and, given this pass removed the last active
// caller of rollCriticalConfirmation(), must report zero findings. --strict
// mode must also pass for the same reason (proving the guard is not merely
// report-only masking a real regression).
const scriptPath = fileURLToPath(new URL('../tools/check-critical-confirmation-guard.mjs', import.meta.url));

const reportResult = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
assert.equal(reportResult.status, 0, `check-critical-confirmation-guard.mjs must exit 0 in report mode. stderr: ${reportResult.stderr}`);
assert.match(reportResult.stdout, /CRITICAL-CONFIRMATION GUARD/);
assert.match(reportResult.stdout, /No active callers of rollCriticalConfirmation\(\) found/);

const strictResult = spawnSync(process.execPath, [scriptPath, '--strict'], { encoding: 'utf8' });
assert.equal(strictResult.status, 0, `check-critical-confirmation-guard.mjs --strict must currently pass (zero active callers). stderr: ${strictResult.stderr}`);

console.log('check-critical-confirmation-guard.mjs smoke test passed.');
