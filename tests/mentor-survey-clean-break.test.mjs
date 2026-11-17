import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
(function walk(d) { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = `${d}/${e.name}`; if (e.isDirectory()) walk(rel); else if (/\.(js|mjs|hbs)$/.test(e.name)) files.push(rel); } })('scripts');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const hits = (re) => files.filter((f) => re.test(read(f)));

test('SV-01 clean break: no code reads or writes the retired mentorBuildIntentBiases actor field', () => {
  assert.deepEqual(hits(/mentorBuildIntentBiases/), []);
});

test('SV-01 clean break: the retired actor.system.swse.surveyResponses store and the legacy survey intent shapes are not read', () => {
  assert.deepEqual(hits(/swse\??\.surveyResponses/), []);
  assert.deepEqual(hits(/survey\??\.(intentTags|mergedBias)|surveyBias\??\.intentTags|mentorBiases\??\.intentTags/), [], 'legacy L1 intent-tag shapes');
  assert.deepEqual(hits(/survey\??\.prestigeClassTarget/), []);
});

test('SV-01 clean break: the overloaded progression "survey" draft key keeps only its ACTIVE meaning (character name and starting level) and is committed through ProgressionSession', () => {
  // The retired template path (template-adapter) no longer exists; the Galactic Profile step commits the key through commitSelection.
  assert.deepEqual(hits(/draftSelections\.survey\s*=/), []);
  assert.match(read('scripts/apps/progression-framework/steps/galactic-profile-step.js'), /commitSelection\('galactic-profile-name', 'survey'/);
  assert.match(read('scripts/apps/progression-framework/steps/galactic-profile-step.js'), /characterName/);
  assert.ok(!fs.existsSync(path.join(ROOT, 'scripts/engine/progression/template/template-adapter.js')));
  const mentor = hits(/selections\??\.mentorSurvey/);
  assert.ok(mentor.some((f) => f.includes('progression-finalizer')), 'the V2 mentor survey draft key is a different key from survey');
});

test('SV-01 clean break: the Force option engine no longer carries the survey-driven prestige alignment branch', () => {
  const t = read('scripts/engine/suggestion/ForceOptionSuggestionEngine.js');
  assert.ok(!/prestigeClassTarget|_getPrestigeClassPowerSuggestions|from L1 survey/.test(t));
});
