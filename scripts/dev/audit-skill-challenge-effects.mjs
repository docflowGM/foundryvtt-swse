#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const strict = process.argv.includes('--strict');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function json(file) {
  return JSON.parse(read(file));
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function check(id, pass, message) {
  checks.push({ id, status: pass ? 'ok' : 'error', message });
}

const constants = read('scripts/engine/skill-challenges/SkillChallengeConstants.js');
const state = read('scripts/engine/skill-challenges/SkillChallengeState.js');
const resolver = read('scripts/engine/skill-challenges/SkillChallengeEffectResolver.js');
const engine = read('scripts/engine/skill-challenges/SkillChallengeEngine.js');
const controller = read('scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js');
const service = read('scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js');
const template = read('templates/apps/gm/skill-challenges/skill-challenge-surface.hbs');
const effects = json('data/skill-challenges/skill-challenge-effects.json');
const css = read('styles/apps/gm-holopad-concept-phase2.css');

const implementedEffects = ['catastrophicFailure', 'restrictedSkills', 'recovery', 'secondEffort', 'timedChallenge'];

check('phase:file-exists', exists('data/skill-challenges/skill-challenge-effects.json'), 'Skill Challenge effects metadata file exists.');
check('phase:metadata-version', effects.phase === '3.5D' && effects.schemaVersion === 2, 'Effects metadata is marked for Phase 3.5D schema version 2.');
for (const effect of implementedEffects) {
  check(`metadata:${effect}`, effects.effects.some(entry => entry.type === effect), `${effect} is represented in effect metadata.`);
  check(`constants:${effect}`, constants.includes(effect), `${effect} has a stable effect identifier.`);
}
check('state:default-parameters', state.includes('defaultEffectParameters') && state.includes('autoFailAtZero'), 'State normalization applies safe default parameters for implemented effects.');
check('resolver:catastrophic', resolver.includes('applyCatastrophicFailure') && resolver.includes('extraFailures'), 'Catastrophic Failure adjusts failed roll outcomes before GM accepts suggested results.');
check('resolver:restricted', resolver.includes('applyRestrictedSkills') && resolver.includes('GM approval is required'), 'Restricted Skills downgrades unlisted skills to GM review.');
check('resolver:recovery', resolver.includes('buildRecoveryOutcome') && resolver.includes('failuresDelta: -1'), 'Recovery can remove one accumulated failure through a GM action.');
check('resolver:second-effort', resolver.includes('buildSecondEffortOutcome') && resolver.includes('effect-second-effort'), 'Second Effort records a GM-approved retry/additional attempt without mutating roll math.');
check('resolver:timed', resolver.includes('advanceTimedChallenge') && resolver.includes('remaining'), 'Timed Challenge supports a GM-adjusted countdown.');
check('engine:effect-actions', engine.includes('recoverFailure') && engine.includes('recordSecondEffort') && engine.includes('advanceTimedChallenge'), 'Engine exposes effect actions for the GM tracker.');
check('controller:effect-actions', controller.includes('recover-failure') && controller.includes('second-effort') && controller.includes('timed-minus') && controller.includes('timed-plus'), 'GM surface controller handles effect action buttons.');
check('controller:json-params', controller.includes('parseEffectParameters') && controller.includes('JSON.parse'), 'GM form parser accepts optional JSON effect parameters.');
check('service:decorates-effects', service.includes('decorateEffect') && service.includes('buildEffectSummary'), 'GM surface service decorates effects for display and controls.');
check('template:effect-controls', template.includes('Recover Failure') && template.includes('Record Second Effort') && template.includes('- Time') && template.includes('+ Time'), 'GM template exposes manual effect controls.');
check('css:effect-styles', css.includes('.swse-skill-challenge-effect') && css.includes('.swse-skill-challenge-timer'), 'GM datapad CSS includes basic effect control styling.');
check('no-feat-hooks-yet', !resolver.includes('SKILL_CHALLENGE_FEAT_RULE_TYPES') && !engine.includes('Catastrophic Avoidance'), 'Phase 3.5D still does not implement Skill Challenge feat hooks.');
check('no-dice-reroll', !resolver.includes('new Roll(') && !engine.includes('new Roll('), 'Challenge effects do not roll dice or duplicate the skill roller.');

const ok = checks.filter(row => row.status === 'ok').length;
const errors = checks.filter(row => row.status === 'error');
const report = { phase: '3.5D', ok, errors: errors.length, implementedEffects, checks };

const outDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'skill-challenge-effects-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, 'skill-challenge-effects-report.md'), [
  '# Skill Challenge Effects Audit',
  '',
  `Phase: ${report.phase}`,
  `Implemented effects: ${implementedEffects.join(', ')}`,
  `OK: ${ok}`,
  `Errors: ${errors.length}`,
  '',
  ...checks.map(row => `- ${row.status === 'ok' ? 'OK' : 'ERROR'} ${row.id}: ${row.message}`),
  ''
].join('\n'));

console.log(`${ok} ok, ${errors.length} errors`);
if (strict && errors.length) process.exit(1);
