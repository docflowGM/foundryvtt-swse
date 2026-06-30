import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const REPORT_DIR = path.join(ROOT, 'docs/audits/generated');
const REPORT_JSON = path.join(REPORT_DIR, 'skill-challenge-feat-hooks-report.json');
const REPORT_MD = path.join(REPORT_DIR, 'skill-challenge-feat-hooks-report.md');

const EXPECTED_FILES = [
  'scripts/engine/skill-challenges/SkillChallengeFeatHooks.js',
  'scripts/engine/skill-challenges/SkillChallengeState.js',
  'scripts/engine/skill-challenges/SkillChallengeEngine.js',
  'scripts/engine/skill-challenges/SkillChallengeRollAdapter.js',
  'scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js',
  'scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js',
  'templates/chat/skill-challenge-card.hbs',
  'templates/apps/gm/skill-challenges/skill-challenge-surface.hbs',
  'data/skill-challenges/skill-challenge-feat-hooks.json',
  'docs/design/skill-challenge-feat-hooks-phase35e.md'
];

const FEATS = [
  ['Skill Challenge: Catastrophic Avoidance', 'SKILL_CHALLENGE_CATASTROPHIC_AVOIDANCE'],
  ['Skill Challenge: Last Resort', 'SKILL_CHALLENGE_LAST_RESORT'],
  ['Skill Challenge: Recovery', 'SKILL_CHALLENGE_RECOVERY']
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function loadCatalog() {
  return JSON.parse(read('data/feat-catalog.json'));
}

function loadPack() {
  return read('packs/feats.db').split(/\r?\n/g).filter(Boolean).map(line => JSON.parse(line));
}

function getMeta(doc) {
  return doc?.system?.abilityMeta ?? {};
}

function has(text, needle) {
  return String(text || '').includes(needle);
}

function push(results, status, message, detail = {}) {
  results.push({ status, message, detail });
}

function audit() {
  const results = [];

  for (const file of EXPECTED_FILES) {
    push(results, exists(file) ? 'ok' : 'error', `${file} exists`);
  }

  const hooks = read('scripts/engine/skill-challenges/SkillChallengeFeatHooks.js');
  const state = read('scripts/engine/skill-challenges/SkillChallengeState.js');
  const engine = read('scripts/engine/skill-challenges/SkillChallengeEngine.js');
  const adapter = read('scripts/engine/skill-challenges/SkillChallengeRollAdapter.js');
  const service = read('scripts/ui/shell/gm/GMSkillChallengeSurfaceService.js');
  const controller = read('scripts/ui/shell/gm/controllers/GMSkillChallengeSurfaceController.js');
  const chat = read('templates/chat/skill-challenge-card.hbs');
  const surface = read('templates/apps/gm/skill-challenges/skill-challenge-surface.hbs');

  for (const [_name, ruleType] of FEATS) {
    push(results, has(hooks, ruleType) ? 'ok' : 'error', `Feat hook includes ${ruleType}`);
  }

  push(results, has(state, 'featUsage') && has(state, 'normalizeFeatUsage') ? 'ok' : 'error', 'SkillChallengeState persists featUsage');
  push(results, has(engine, 'applyCatastrophicAvoidance') ? 'ok' : 'error', 'Engine exposes Catastrophic Avoidance action');
  push(results, has(engine, 'applyLastResort') ? 'ok' : 'error', 'Engine exposes Last Resort action');
  push(results, has(engine, 'applyRecoveryFeat') ? 'ok' : 'error', 'Engine exposes Recovery feat action');
  push(results, has(adapter, 'feat-catastrophic-avoidance') && has(adapter, 'feat-last-resort') ? 'ok' : 'error', 'Roll adapter resolves feat review-card actions');
  push(results, has(service, 'getTrackerOptions') ? 'ok' : 'error', 'GM surface decorates tracker feat options');
  push(results, has(controller, "action === 'feat-recovery'") && has(controller, "action === 'feat-last-resort'") ? 'ok' : 'error', 'GM controller resolves tracker feat actions');
  push(results, has(chat, 'Skill Challenge feat reactions') ? 'ok' : 'error', 'Chat review card renders feat reactions');
  push(results, has(surface, 'Skill Challenge Feats') ? 'ok' : 'error', 'GM tracker renders feat panel');

  const catalog = loadCatalog();
  const pack = loadPack();

  for (const [name, ruleType] of FEATS) {
    for (const [label, docs] of [['catalog', catalog], ['pack', pack]]) {
      const doc = docs.find(entry => entry.name === name);
      if (!doc) {
        push(results, 'error', `${label} contains ${name}`);
        continue;
      }
      const meta = getMeta(doc);
      const rules = Array.isArray(meta.skillChallengeRules) ? meta.skillChallengeRules : [];
      push(results, meta.mechanicsMode === 'skill_challenge_hook' ? 'ok' : 'error', `${label} ${name} mechanicsMode is skill_challenge_hook`, { value: meta.mechanicsMode });
      push(results, meta.staticSheetPolicy === 'exclude' ? 'ok' : 'error', `${label} ${name} remains excluded from static sheet math`, { value: meta.staticSheetPolicy });
      push(results, meta.implementationStatus === 'implemented_skill_challenge_hook' ? 'ok' : 'error', `${label} ${name} implementationStatus is implemented_skill_challenge_hook`, { value: meta.implementationStatus });
      push(results, rules.some(rule => rule.type === ruleType && rule.gmConfirmed === true) ? 'ok' : 'error', `${label} ${name} has GM-confirmed ${ruleType} rule`);
    }
  }

  return results;
}

function summarize(results) {
  return {
    phase: '3.5E',
    generatedAt: new Date().toISOString(),
    ok: results.filter(r => r.status === 'ok').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length,
    results
  };
}

function writeReports(summary) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(summary, null, 2) + '\n');
  const lines = [
    '# Skill Challenge Feat Hooks Report',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `- OK: ${summary.ok}`,
    `- Warnings: ${summary.warnings}`,
    `- Errors: ${summary.errors}`,
    '',
    '| Status | Check |',
    '| --- | --- |',
    ...summary.results.map(result => `| ${result.status} | ${String(result.message).replace(/\|/g, '\\|')} |`),
    ''
  ];
  fs.writeFileSync(REPORT_MD, lines.join('\n'));
}

const summary = summarize(audit());
writeReports(summary);
console.log(`Skill Challenge feat hooks audit: ${summary.ok} ok, ${summary.warnings} warnings, ${summary.errors} errors`);
if (STRICT && summary.errors > 0) process.exit(1);
