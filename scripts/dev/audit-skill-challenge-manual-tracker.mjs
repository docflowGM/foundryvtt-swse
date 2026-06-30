#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REQUIRED = [
  'scripts/engine/skill-challenges/SkillChallengeConstants.js',
  'scripts/engine/skill-challenges/SkillChallengeState.js',
  'scripts/engine/skill-challenges/SkillChallengeRules.js',
  'scripts/engine/skill-challenges/SkillChallengeEffectResolver.js',
  'scripts/engine/skill-challenges/SkillChallengeEngine.js',
  'scripts/engine/skill-challenges/SkillChallengeStore.js',
  'scripts/engine/skill-challenges/SkillChallengeRollAdapter.js',
  'scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js',
  'scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js',
  'templates/apps/gm/skill-challenges/skill-challenge-surface.hbs',
  'templates/chat/skill-challenge-card.hbs',
  'data/skill-challenges/skill-challenge-system-model.json',
  'data/skill-challenges/skill-challenge-effects.json',
  'data/skill-challenges/sample-skill-challenges.json'
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

const checks = [];
function check(id, ok, detail) {
  checks.push({ id, ok: Boolean(ok), detail });
}

for (const file of REQUIRED) check(`exists:${file}`, exists(file), file);

const surfaceRegistry = read('scripts/ui/shell/gm/GMSurfaceRegistry.js');
check('surface-registry:skill-challenges-import', surfaceRegistry.includes("'skill-challenges'") && surfaceRegistry.includes('GMSkillChallengeSurfaceService'), 'GM surface registry exposes the Skill Challenges surface.');

const controllerRegistry = read('scripts/ui/shell/gm/controllers/GMSurfaceControllerRegistry.js');
check('controller-registry:skill-challenges', controllerRegistry.includes('GMSkillChallengeSurfaceController') && controllerRegistry.includes("'skill-challenges'"), 'GM controller registry binds the Skill Challenges controller.');

const shellSurface = read('templates/shell/shell-surface.hbs');
check('shell-surface:partial', shellSurface.includes('gm-skill-challenges') && shellSurface.includes('skill-challenge-surface.hbs'), 'Shell surface renders the GM Skill Challenges partial.');

const gmDatapad = read('scripts/apps/gm-datapad.js');
check('gm-datapad:known-route', gmDatapad.includes("'skill-challenges'") && gmDatapad.includes('skill-challenges'), 'GM Datapad route list includes skill-challenges.');
check('gm-datapad:badge-count', gmDatapad.includes('SkillChallengeStore.getAll') && gmDatapad.includes('skillChallenges'), 'GM Datapad loads active Skill Challenge badge count.');
check('gm-datapad:app-card', gmDatapad.includes("label: 'Skill Challenges'") && gmDatapad.includes("code: 'SKL'"), 'GM Datapad app card is present.');

const settings = read('scripts/core/settings.js');
check('settings:registered', settings.includes('registerSkillChallengeSettings') && settings.includes('SkillChallengeStore.js'), 'Skill Challenge world setting is registered from core settings.');

const store = read('scripts/engine/skill-challenges/SkillChallengeStore.js');
check('store:write-enabled', store.includes('saveChallenge') && store.includes('deleteChallenge') && !store.includes('intentionally disabled in Phase 3.5A'), 'Store write paths are enabled for GM tracker state.');
check('store:internal-setting', store.includes('skillChallengeState') && store.includes('config: false'), 'Skill Challenge state is internal world setting data.');

const controller = read('scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js');
check('controller:manual-actions', ['success-plus', 'failure-plus', 'add-selected-token', 'clear-completed'].every(token => controller.includes(token)), 'Controller supports manual tracker actions.');
check('controller:no-roll-capture', !controller.includes('fromSkillRollMessage') && !controller.includes('ChatMessage.create'), 'Phase 3.5B does not wire skill-roll chat automation.');

const report = {
  generatedAt: new Date().toISOString(),
  phase: '3.5B',
  scope: 'GM manual Skill Challenge tracker',
  summary: {
    ok: checks.filter(entry => entry.ok).length,
    errors: checks.filter(entry => !entry.ok).length
  },
  checks
};

const outDir = path.join(ROOT, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'skill-challenge-manual-tracker-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, 'skill-challenge-manual-tracker-report.md'), [
  '# Skill Challenge Manual Tracker Audit',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `Result: ${report.summary.ok} ok, ${report.summary.errors} errors`,
  '',
  ...checks.map(entry => `- ${entry.ok ? 'OK' : 'ERROR'}: ${entry.id} — ${entry.detail}`)
].join('\n'));

if (process.argv.includes('--strict') && report.summary.errors) {
  console.error(`Skill Challenge manual tracker audit failed with ${report.summary.errors} error(s).`);
  process.exit(1);
}

console.log(`Skill Challenge manual tracker audit: ${report.summary.ok} ok, ${report.summary.errors} errors`);
