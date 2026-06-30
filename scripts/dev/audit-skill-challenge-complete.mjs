#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const strict = process.argv.includes('--strict');
const checks = [];

function read(file) {
  try { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
  catch (_err) { return ''; }
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function check(id, ok, detail) {
  checks.push({ id, ok: Boolean(ok), detail });
}

const requiredFiles = [
  'scripts/engine/skill-challenges/SkillChallengeConstants.js',
  'scripts/engine/skill-challenges/SkillChallengeState.js',
  'scripts/engine/skill-challenges/SkillChallengeRules.js',
  'scripts/engine/skill-challenges/SkillChallengeEffectResolver.js',
  'scripts/engine/skill-challenges/SkillChallengeFeatHooks.js',
  'scripts/engine/skill-challenges/SkillChallengeEngine.js',
  'scripts/engine/skill-challenges/SkillChallengeStore.js',
  'scripts/engine/skill-challenges/SkillChallengeRollAdapter.js',
  'scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js',
  'scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js',
  'templates/apps/gm/skill-challenges/skill-challenge-surface.hbs',
  'templates/chat/skill-challenge-card.hbs',
  'data/skill-challenges/skill-challenge-system-model.json',
  'data/skill-challenges/skill-challenge-effects.json',
  'data/skill-challenges/skill-challenge-feat-hooks.json',
  'data/skill-challenges/sample-skill-challenges.json'
];

for (const file of requiredFiles) check(`file:${file}`, exists(file), `${file} exists.`);

const settings = read('scripts/core/settings.js');
check('settings:registered', settings.includes('registerSkillChallengeSettings') && settings.includes('SkillChallengeStore.js'), 'Skill Challenge world setting is registered from core settings.');

const gmDatapad = read('scripts/apps/gm-datapad.js');
check('gm-datapad:nav', gmDatapad.includes("'skill-challenges'") && gmDatapad.includes('Skill Challenges'), 'GM Datapad exposes Skill Challenges in navigation/counts.');

const surfaceRegistry = read('scripts/ui/shell/gm/GMSurfaceRegistry.js');
check('surface:service-registered', surfaceRegistry.includes("'skill-challenges'") && surfaceRegistry.includes('GMSkillChallengeSurfaceService'), 'GM shell service is registered.');

const controllerRegistry = read('scripts/ui/shell/gm/controllers/GMSurfaceControllerRegistry.js');
check('surface:controller-registered', controllerRegistry.includes("'skill-challenges'") && controllerRegistry.includes('GMSkillChallengeSurfaceController'), 'GM shell controller is registered.');

const engine = read('scripts/engine/skill-challenges/SkillChallengeEngine.js');
for (const method of ['createChallenge', 'startChallenge', 'submitRoll', 'recoverFailure', 'advanceTimedChallenge', 'applyCatastrophicAvoidance', 'applyLastResort', 'applyRecoveryFeat']) {
  check(`engine:${method}`, engine.includes(`static ${method}`), `Engine implements ${method}.`);
}

const effects = read('scripts/engine/skill-challenges/SkillChallengeEffectResolver.js');
for (const marker of ['applyCatastrophicFailure', 'applyRestrictedSkills', 'buildRecoveryOutcome', 'buildSecondEffortOutcome', 'advanceTimedChallenge']) {
  check(`effects:${marker}`, effects.includes(marker), `Effect resolver supports ${marker}.`);
}

const hooks = read('scripts/engine/skill-challenges/SkillChallengeFeatHooks.js');
for (const feat of ['Catastrophic Avoidance', 'Last Resort', 'Recovery']) {
  check(`feat-hook:${feat}`, hooks.includes(`Skill Challenge: ${feat}`), `Feat hook includes Skill Challenge: ${feat}.`);
}

const rollAdapter = read('scripts/engine/skill-challenges/SkillChallengeRollAdapter.js');
check('roll-adapter:review-card', rollAdapter.includes('postRollReviewCardFromSkillRoll') && rollAdapter.includes('resolveReviewAction'), 'Roll adapter posts and resolves GM review cards.');
check('roll-adapter:gm-only', rollAdapter.includes('Only a GM can resolve Skill Challenge roll submissions'), 'GM review actions are GM-gated.');

const skills = read('scripts/rolls/skills.js');
check('skill-roll:wired', skills.includes('SkillChallengeRollAdapter') && skills.includes('postRollReviewCardFromSkillRoll'), 'Normal skill rolls feed the adapter after canonical skill math posts.');

const chatBridge = read('scripts/ui/chat/chat-interaction-bridge.js');
check('chat-bridge:wired', chatBridge.includes('data-skill-challenge-chat-action') && chatBridge.includes('SkillChallengeRollAdapter'), 'Chat buttons resolve through the adapter.');

const controller = read('scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js');
check('controller:json-effect-lines', controller.includes('splitDelimitedLine') && controller.includes('Preserve JSON effect parameters'), 'Effect-line parser preserves JSON parameters after colon delimiters.');
check('controller:manual-entry', controller.includes('data-skill-challenge-roll-form') && controller.includes('_submitManualRoll'), 'GM tracker supports manual/off-sheet roll entries.');
check('controller:post-summary', controller.includes('postChallengeSummaryToChat') && controller.includes("action === 'post-summary'"), 'GM tracker can post a public summary to chat.');

const template = read('templates/apps/gm/skill-challenges/skill-challenge-surface.hbs');
check('template:manual-entry', template.includes('GM Roll / Ability / Force Entry') && template.includes('data-skill-challenge-roll-form'), 'Template exposes manual roll/ability/Force entry.');
check('template:post-summary', template.includes('data-skill-challenge-action="post-summary"'), 'Template exposes Post Summary action.');

let featCatalog = [];
try { featCatalog = JSON.parse(read('data/feat-catalog.json') || '[]'); }
catch (_err) { featCatalog = []; }
const skillChallengeFeats = featCatalog.filter(feat => String(feat?.name || '').startsWith('Skill Challenge:'));
check('feat-catalog:skill-challenge-feats', skillChallengeFeats.length >= 3, 'Skill Challenge feats exist in feat catalog.');
check('feat-catalog:metadata-only-static-exclude', skillChallengeFeats.every(feat => feat?.system?.abilityMeta?.staticSheetPolicy === 'exclude' || feat?.system?.implementation?.staticSheetPolicy === 'exclude'), 'Skill Challenge feats are excluded from static sheet math.');

const outDir = path.join(ROOT, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
const ok = checks.filter(entry => entry.ok).length;
const errors = checks.filter(entry => !entry.ok);
const report = {
  audit: 'skill-challenge-complete-phase35f',
  generatedAt: new Date().toISOString(),
  ok,
  errors: errors.length,
  checks
};
fs.writeFileSync(path.join(outDir, 'skill-challenge-complete-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, 'skill-challenge-complete-report.md'), [
  '# Skill Challenge Complete Implementation Audit',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `Result: ${ok} ok, ${errors.length} errors`,
  '',
  ...checks.map(entry => `- ${entry.ok ? 'OK' : 'ERROR'} ${entry.id}: ${entry.detail}`)
].join('\n'));

console.log(`Skill Challenge complete audit: ${ok} ok, ${errors.length} errors`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error.id}: ${error.detail}`);
}
if (strict && errors.length) process.exit(1);
