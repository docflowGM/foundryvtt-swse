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

test('SV-01 clean break: the overloaded progression "survey" draft key keeps only its ACTIVE meanings (character name and starting level, template advisory signals)', () => {
  const writers = hits(/draftSelections\.survey\s*=/);
  assert.deepEqual(writers.sort(), ['scripts/apps/progression-framework/steps/galactic-profile-step.js', 'scripts/engine/progression/template/template-adapter.js']);
  for (const f of ['scripts/apps/progression-framework/steps/galactic-profile-step.js']) assert.match(read(f), /characterName/);
  assert.match(read('scripts/engine/progression/template/template-adapter.js'), /source: 'template'/);
  const mentor = hits(/selections\??\.mentorSurvey/);
  assert.ok(mentor.some((f) => f.includes('progression-finalizer')), 'the V2 mentor survey draft key is a different key from survey');
});

test('SV-01 clean break: the Force option engine no longer carries the survey-driven prestige alignment branch', () => {
  const t = read('scripts/engine/suggestion/ForceOptionSuggestionEngine.js');
  assert.ok(!/prestigeClassTarget|_getPrestigeClassPowerSuggestions|from L1 survey/.test(t));
});
