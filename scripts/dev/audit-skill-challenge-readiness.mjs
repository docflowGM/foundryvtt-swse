#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const REPORT_DIR = path.join(ROOT, 'docs/audits/generated');
const JSON_REPORT = path.join(REPORT_DIR, 'skill-challenge-readiness-report.json');
const MD_REPORT = path.join(REPORT_DIR, 'skill-challenge-readiness-report.md');

const REQUIRED_NEW_FILES = [
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
  'data/skill-challenges/sample-skill-challenges.json',
  'data/feat-source-parity/skill-challenge-feat-readiness-manifest.json',
  'docs/design/skill-challenge-system-fit.md',
  'docs/audits/skill-challenge-feat-readiness.md'
];

function readJson(relativePath, fallback = null) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return fallback;
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function findFeat(catalog, name) {
  return Array.isArray(catalog) ? catalog.find(entry => entry?.name === name) : null;
}

function getAbilityMeta(feat) {
  return feat?.system?.abilityMeta ?? {};
}

function getSkillChallengeRules(feat) {
  const rules = getAbilityMeta(feat).skillChallengeRules;
  return Array.isArray(rules) ? rules : [];
}

function includesText(value, needle) {
  return String(value ?? '').toLowerCase().includes(String(needle ?? '').toLowerCase());
}

function evaluate() {
  const results = [];
  const catalog = readJson('data/feat-catalog.json', []);
  const manifest = readJson('data/feat-source-parity/skill-challenge-feat-readiness-manifest.json', {});
  const model = readJson('data/skill-challenges/skill-challenge-system-model.json', {});
  const effects = readJson('data/skill-challenges/skill-challenge-effects.json', {});
  const samples = readJson('data/skill-challenges/sample-skill-challenges.json', {});

  for (const file of REQUIRED_NEW_FILES) {
    results.push({
      type: 'file',
      subject: file,
      status: exists(file) ? 'ok' : 'error',
      message: exists(file) ? 'Required foundation file exists.' : 'Missing required foundation file.'
    });
  }

  const expectedFeats = Array.isArray(manifest.expectedFeats) ? manifest.expectedFeats : [];
  for (const expected of expectedFeats) {
    const feat = findFeat(catalog, expected.name);
    if (!feat) {
      results.push({ type: 'feat', subject: expected.name, status: 'error', message: 'Expected Skill Challenge feat missing from feat catalog.' });
      continue;
    }

    const system = feat.system ?? {};
    const meta = getAbilityMeta(feat);
    const rules = getSkillChallengeRules(feat);
    const staticPolicy = meta.staticSheetPolicy ?? meta.modifiers?.[0]?.staticSheetPolicy ?? '';
    const mechanicsMode = meta.mechanicsMode ?? meta.modifiers?.[0]?.mechanicsMode ?? '';

    results.push({
      type: 'feat',
      subject: expected.name,
      status: includesText(system.sourcebook ?? system.source, 'Galaxy of Intrigue') ? 'ok' : 'warning',
      message: `Source is ${system.sourcebook ?? system.source ?? 'unknown'}.`
    });

    results.push({
      type: 'feat',
      subject: expected.name,
      status: includesText(staticPolicy, 'exclude') || includesText(staticPolicy, 'manual') || includesText(staticPolicy, 'punted') ? 'ok' : 'warning',
      message: `Static sheet policy is ${staticPolicy || 'unset'}. Expected exclude/manual while subsystem is absent.`
    });

    results.push({
      type: 'feat',
      subject: expected.name,
      status: includesText(mechanicsMode, 'metadata') || includesText(mechanicsMode, 'manual') || includesText(mechanicsMode, 'punted') ? 'ok' : 'warning',
      message: `Mechanics mode is ${mechanicsMode || 'unset'}. Expected metadata/manual while subsystem is absent.`
    });

    results.push({
      type: 'feat',
      subject: expected.name,
      status: rules.some(rule => rule?.type === expected.futureRuleType || includesText(rule?.type, expected.futureRuleType.replace('SKILL_CHALLENGE_', ''))) ? 'ok' : 'warning',
      message: `Future rule hook ${expected.futureRuleType} ${rules.length ? 'has metadata entries.' : 'is not represented yet.'}`
    });
  }

  results.push({
    type: 'model',
    subject: 'skill-challenge-system-model.json',
    status: model?.challenge && model?.rollContext && model?.outcome ? 'ok' : 'error',
    message: 'System model should define challenge, rollContext, and outcome shapes.'
  });

  results.push({
    type: 'model',
    subject: 'skill-challenge-effects.json',
    status: Array.isArray(effects.effects) && effects.effects.length >= 5 ? 'ok' : 'warning',
    message: `${Array.isArray(effects.effects) ? effects.effects.length : 0} challenge effects modeled.`
  });

  results.push({
    type: 'model',
    subject: 'sample-skill-challenges.json',
    status: Array.isArray(samples.samples) && samples.samples.length >= 1 ? 'ok' : 'warning',
    message: `${Array.isArray(samples.samples) ? samples.samples.length : 0} sample challenges modeled.`
  });

  return results;
}

function summarize(results) {
  return results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] ?? 0) + 1;
    return summary;
  }, { ok: 0, warning: 0, error: 0 });
}

function writeReports(results, summary) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '3.5A',
    strict: STRICT,
    summary,
    results
  };

  fs.writeFileSync(JSON_REPORT, `${JSON.stringify(payload, null, 2)}\n`);

  const lines = [
    '# Skill Challenge Readiness Report',
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    '## Summary',
    '',
    `- OK: ${summary.ok ?? 0}`,
    `- Warnings: ${summary.warning ?? 0}`,
    `- Errors: ${summary.error ?? 0}`,
    '',
    '## Results',
    ''
  ];

  for (const result of results) {
    lines.push(`- **${result.status.toUpperCase()}** ${result.type}: ${result.subject} - ${result.message}`);
  }

  fs.writeFileSync(MD_REPORT, `${lines.join('\n')}\n`);
}

const results = evaluate();
const summary = summarize(results);
writeReports(results, summary);

console.log(`Skill Challenge readiness audit complete: ${summary.ok ?? 0} ok, ${summary.warning ?? 0} warnings, ${summary.error ?? 0} errors.`);
console.log(`Wrote ${path.relative(ROOT, JSON_REPORT)}`);
console.log(`Wrote ${path.relative(ROOT, MD_REPORT)}`);

if ((summary.error ?? 0) > 0 || (STRICT && (summary.warning ?? 0) > 0)) {
  process.exitCode = 1;
}
