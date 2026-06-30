#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function check(id, pass, message) {
  checks.push({ id, status: pass ? 'ok' : 'error', message });
}

const strict = process.argv.includes('--strict');

const rollAdapter = read('scripts/engine/skill-challenges/SkillChallengeRollAdapter.js');
const skillRoller = read('scripts/rolls/skills.js');
const chatBridge = read('scripts/ui/chat/chat-interaction-bridge.js');
const engine = read('scripts/engine/skill-challenges/SkillChallengeEngine.js');
const store = read('scripts/engine/skill-challenges/SkillChallengeStore.js');
const card = read('templates/chat/skill-challenge-card.hbs');
const controller = read('scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js');

check('adapter:exists', exists('scripts/engine/skill-challenges/SkillChallengeRollAdapter.js'), 'Skill Challenge roll adapter exists.');
check('adapter:posts-review-card', rollAdapter.includes('postRollReviewCardFromSkillRoll') && rollAdapter.includes('skillChallengeReviewCard'), 'Adapter can post GM review cards from completed skill rolls.');
check('adapter:active-challenges-only', rollAdapter.includes('getApplicableActiveChallenges') && store.includes('getActiveChallenges'), 'Adapter filters to active Skill Challenges only.');
check('adapter:no-skill-math', !rollAdapter.includes('RollCore.execute') && !rollAdapter.includes('new Roll('), 'Adapter does not duplicate skill roll math.');
check('adapter:gm-resolution', rollAdapter.includes('resolveReviewAction') && rollAdapter.includes('Only a GM can resolve'), 'Adapter requires GM confirmation for tracker mutations.');
check('roller:imports-adapter', skillRoller.includes('SkillChallengeRollAdapter'), 'Canonical skill roller imports the Skill Challenge adapter.');
check('roller:after-chat-post', skillRoller.includes('skillRollMessage = await SWSEChat.postRoll') && skillRoller.includes('postRollReviewCardFromSkillRoll'), 'Skill Challenge review happens after the normal holo roll card is posted.');
check('roller:flags-context', skillRoller.includes('skillLabel') && skillRoller.includes('actorId') && skillRoller.includes('total') && skillRoller.includes('dc'), 'Skill roll chat flags include enough context for review cards.');
check('bridge:handler', chatBridge.includes('handleSkillChallengeReviewButton'), 'Chat interaction bridge has a Skill Challenge review button handler.');
check('bridge:binds-buttons', chatBridge.includes('[data-skill-challenge-chat-action]'), 'Chat interaction bridge binds Skill Challenge review buttons.');
check('engine:preview', engine.includes('previewRollOutcome'), 'Engine supports previewing suggested roll outcomes.');
check('engine:accept-suggested', engine.includes('roll-accepted-suggested'), 'Engine can accept suggested roll outcomes.');
check('engine:accept-success', engine.includes('acceptRollAsSuccess'), 'Engine can force-count a roll as success.');
check('engine:accept-failure', engine.includes('acceptRollAsFailure'), 'Engine can force-count a roll as failure.');
check('engine:ignore-review', engine.includes('ignoreRoll') && engine.includes('markRollForReview'), 'Engine can ignore or defer a roll without changing progress.');
check('template:gm-actions', card.includes('accept-suggested') && card.includes('accept-success') && card.includes('accept-failure') && card.includes('ignore-roll') && card.includes('gm-review'), 'Chat card exposes GM confirmation actions.');
check('controller:external-refresh', controller.includes('swse.skillChallengeUpdated'), 'GM surface refreshes when chat review updates a challenge.');
check('no-feat-hooks-yet', !rollAdapter.includes('SKILL_CHALLENGE_FEAT_RULE_TYPES') && !engine.includes('Catastrophic Avoidance'), 'Phase 3.5C does not implement Skill Challenge feat hooks yet.');

const ok = checks.filter(row => row.status === 'ok').length;
const errors = checks.filter(row => row.status === 'error');
const report = { phase: '3.5C', ok, errors: errors.length, checks };

const outDir = path.join(root, 'docs/audits/generated');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'skill-challenge-roll-integration-report.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, 'skill-challenge-roll-integration-report.md'), [
  '# Skill Challenge Roll Integration Audit',
  '',
  `Phase: ${report.phase}`,
  `OK: ${ok}`,
  `Errors: ${errors.length}`,
  '',
  ...checks.map(row => `- ${row.status === 'ok' ? 'OK' : 'ERROR'} ${row.id}: ${row.message}`),
  ''
].join('\n'));

console.log(`${ok} ok, ${errors.length} errors`);
if (strict && errors.length) process.exit(1);
