// Golden-build integration: IdentityEngine survey channel -> tag-signal-engine (the Suggestion Engine's tag path).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { items: [] } });
const u = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const { IdentityEngine } = await import(u('scripts/engine/prestige/identity-engine.js'));
const T = await import(u('scripts/engine/suggestion/tag-signal-engine.js'));
const I = await import(u('scripts/mentor/mentor-survey-v2/survey-influence.js'));
const L = await import(u('scripts/mentor/mentor-survey-v2/intent-ledger.js'));

const item = (type, name, level) => ({ type, name, id: name, system: level ? { level } : {}, flags: {} });
// Golden builds: representative characters at different levels
const GOLDEN = {
  soldierL1: { items: [item('class', 'Soldier', 1)], system: { classes: { Soldier: { level: 1 } }, skills: {} } },
  scoutNobleL5: { items: [item('class', 'Scout', 3), item('class', 'Noble', 2), item('feat', 'Skill Focus')], system: { classes: { Scout: { level: 3 }, Noble: { level: 2 } }, skills: { stealth: { trained: true } } } },
  jediKnightL12: { items: [item('class', 'Jedi', 8), item('class', 'Jedi Knight', 4), item('talent', 'Block')], system: { classes: { Jedi: { level: 8 }, 'Jedi Knight': { level: 4 } }, skills: {} } },
  scoundrelL20: { items: [item('class', 'Scoundrel', 12), item('class', 'Outlaw', 8)], system: { classes: { Scoundrel: { level: 12 }, Outlaw: { level: 8 } }, skills: {} } },
};
const withLedger = (a, events) => ({ ...a, flags: { 'foundryvtt-swse': { mentorSurvey: { events } } } });
const mk = (kind, level, tagEvidence, scopeId = kind) => L.buildCompletionEvents({ payload: { surveyKind: kind, scopeId, definitionVersion: 1, contextRevision: 'x', answers: {} }, transactionId: `t-${kind}-${scopeId}-${level}`, actorLevel: level, completedAt: 'now', tagEvidence })[0];

test('SV-41 golden builds: with no certified evidence the survey channel is empty and identity bias is unchanged by surveys', () => {
  for (const [name, actor] of Object.entries(GOLDEN)) {
    const baseline = JSON.stringify(IdentityEngine.computeTotalBias(actor));
    const uncertified = [mk('l1', 1, []), mk('multiclass', 3, [], 'noble'), mk('prestige', 9, [{ questionId: 'q1', tag: 'x', E: 1, certified: false }])];
    const withSurveys = withLedger(actor, uncertified);
    assert.equal(JSON.stringify(IdentityEngine.computeTotalBias(withSurveys)), baseline, name);
    assert.deepEqual(T.getBiasTagsFromIdentity(IdentityEngine.computeTotalBias(withSurveys)), T.getBiasTagsFromIdentity(IdentityEngine.computeTotalBias(actor)), `${name}: tag signals unchanged`);
  }
});

test('SV-41 legacy survey bias paths are gone: actor surveyBias / classSurveyBias no longer influence identity', () => {
  const actor = { ...GOLDEN.soldierL1, system: { ...GOLDEN.soldierL1.system, swse: { surveyBias: { mechanicalBias: { accuracy: 5 } }, classSurveyBias: { mechanicalBias: { accuracy: 5 } } } } };
  assert.deepEqual(IdentityEngine.computeTotalBias(actor).mechanicalBias, IdentityEngine.computeTotalBias(GOLDEN.soldierL1).mechanicalBias);
  for (const gone of ['computeSurveyBias', 'injectSurveyBias', 'clearSurveyBias']) assert.equal(typeof IdentityEngine[gone], 'undefined', gone);
});

test('SV-41 certified evidence (test ontology) reaches the tag path bounded, per-event decayed, and survey count cannot beat the channel ceiling', () => {
  I.registerOntologyTags(['tag_a']);
  try {
    const cap = I.SURVEY_INFLUENCE_CONFIG.channel.maxAffinityToSuggestions;
    for (const [name, actor] of Object.entries(GOLDEN)) {
      const events = Array.from({ length: 12 }, (_, i) => mk(i % 2 ? 'prestige' : 'multiclass', 1 + (i % 5), [{ questionId: 'q1', tag: 'tag_a', E: 1, certified: true }, { questionId: 'q2', tag: 'tag_a', E: 1, certified: true }], `s${i}`));
      const bias = IdentityEngine.computeTotalBias(withLedger(actor, events));
      assert.ok(bias.surveyTagAffinity.tag_a > 0 && bias.surveyTagAffinity.tag_a <= cap, name);
      assert.ok(T.getBiasTagsFromIdentity(bias).tag_a <= cap, `${name}: suggestion tag weight is bounded`);
      // owned mechanics are unchanged by surveys: mechanical/role/attribute layers are identical
      const plain = IdentityEngine.computeTotalBias(actor);
      for (const k of ['mechanicalBias', 'roleBias', 'attributeBias']) assert.deepEqual(bias[k], plain[k], `${name}: ${k}`);
    }
  } finally { I.resetOntologyTags(); }
});

test('SV-41 ranking order is deterministic and survey influence is a bounded ranking signal that cannot create eligibility', () => {
  I.registerOntologyTags(['tag_a', 'tag_b']);
  try {
    const events = [mk('prestige', 12, [{ questionId: 'q1', tag: 'tag_a', E: 1, certified: true }]), mk('l1', 1, [{ questionId: 'q1', tag: 'tag_b', E: 1, certified: true }])];
    const actor = withLedger(GOLDEN.jediKnightL12, events);
    const bias = IdentityEngine.computeTotalBias(actor);
    const ranked = ['tag_a', 'tag_b'].map((t) => [t, bias.surveyTagAffinity[t]]).sort((a, b) => b[1] - a[1]);
    assert.equal(ranked[0][0], 'tag_a', 'fresh prestige intent outranks a level-1 preference decayed over 11 levels');
    // scoring a candidate only changes its alignment score; it carries no eligibility fields
    const out = T.scoreTagAlignment({ tags: ['tag_a'] }, {}, bias);
    assert.ok(out.score > 0 && out.score <= 1);
    assert.ok(!('eligible' in out) && !('legal' in out));
  } finally { I.resetOntologyTags(); }
});
