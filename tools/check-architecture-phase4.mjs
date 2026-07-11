#!/usr/bin/env node

/**
 * check-architecture-phase4.mjs
 *
 * Phase 4 architecture enforcement runner.
 *
 * This is the practical check entrypoint for the architecture work from phases
 * 1-3. It intentionally separates hard gates from migration-debt reports:
 *
 * HARD GATES
 * - ability schema authority: no new writable system.abilities drift
 * - combat math SSOT: roll/breakdown/wrapper math must delegate to canonical resolvers
 * - direct actor mutation: actor mutations outside ActorEngine/governance gateways fail
 *
 * REPORT-ONLY DEBT
 * - derived writes
 * - broad system payloads
 * - progression registry bypasses
 *
 * Usage:
 *   node tools/check-architecture-phase4.mjs
 *   node tools/check-architecture-phase4.mjs --json
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const JSON_OUT = process.argv.includes('--json');

const checks = [
  {
    id: 'ability-schema-authority',
    label: 'Ability schema authority',
    mode: 'hard',
    command: ['node', 'tools/check-ability-schema-authority.mjs', '--strict'],
  },
  {
    id: 'combat-math-ssot',
    label: 'Combat math SSOT',
    mode: 'hard',
    command: ['node', 'tools/check-combat-math-ssot.mjs', '--strict'],
  },
  {
    id: 'direct-actor-mutation-boundary',
    label: 'Direct actor mutation boundary',
    mode: 'hard',
    command: ['node', 'tools/check-architecture-boundaries.mjs', '--category=direct-actor-mutation', '--strict'],
  },
  {
    id: 'derived-write-report',
    label: 'Derived write debt report',
    mode: 'report',
    command: ['node', 'tools/check-architecture-boundaries.mjs', '--category=derived-write'],
  },
  {
    id: 'broad-system-payload-report',
    label: 'Broad system payload debt report',
    mode: 'report',
    command: ['node', 'tools/check-architecture-boundaries.mjs', '--category=broad-system-payload'],
  },
  {
    id: 'progression-registry-bypass-report',
    label: 'Progression registry bypass debt report',
    mode: 'report',
    command: ['node', 'tools/check-architecture-boundaries.mjs', '--category=progression-registry-bypass'],
  },
];

function runCheck(check) {
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: JSON_OUT ? ['ignore', 'pipe', 'pipe'] : 'pipe',
  });
  return {
    ...check,
    status: result.status === 0 ? 'pass' : (check.mode === 'hard' ? 'fail' : 'report'),
    exitCode: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const results = checks.map(runCheck);
const failedHardChecks = results.filter(result => result.mode === 'hard' && result.exitCode !== 0);

if (JSON_OUT) {
  console.log(JSON.stringify({
    ok: failedHardChecks.length === 0,
    failedHardChecks: failedHardChecks.map(check => check.id),
    results: results.map(({ id, label, mode, status, exitCode }) => ({ id, label, mode, status, exitCode })),
  }, null, 2));
} else {
  console.log('\n' + '='.repeat(72));
  console.log('  SWSE PHASE 4 ARCHITECTURE ENFORCEMENT');
  console.log('='.repeat(72));

  for (const result of results) {
    const marker = result.mode === 'hard'
      ? (result.exitCode === 0 ? 'PASS' : 'FAIL')
      : 'REPORT';
    console.log(`\n[${marker}] ${result.label}`);
    console.log(`       ${result.command.join(' ')}`);
    const body = `${result.stdout}${result.stderr ? `\n${result.stderr}` : ''}`.trim();
    if (body) console.log(body);
  }

  console.log('\n' + '-'.repeat(72));
  if (failedHardChecks.length === 0) {
    console.log('  Hard architecture gates passed. Report-only debt may still remain above.');
  } else {
    console.log('  Hard architecture gates failed:');
    for (const check of failedHardChecks) console.log(`   - ${check.label}`);
  }
  console.log('='.repeat(72) + '\n');
}

process.exit(failedHardChecks.length === 0 ? 0 : 1);
