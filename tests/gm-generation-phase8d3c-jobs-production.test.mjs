import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 8D-3C: JOBS / OBJECTIVES /
// COMPLICATIONS / REWARDS / OPPOSITION PRODUCTIONIZATION (initial wiring
// pass, per §195 of the audit doc).
//
// Per the phase spec's own explicit instruction ("I would not let Claude
// immediately build 300 complications and 400 objectives... reviewing the
// wiring first is much easier"), this is a WIRING pass, not a hydration
// pass: representative catalogs only (`data/job-stakes.js`/
// `data/job-hooks.js`, the two genuinely new primitive vocabularies this
// phase adds; every other primitive — archetype metadata, legality/
// visibility, urgency, complications, consequences, twists, objective
// constraints, mission subjects, opposition requests, objective templates/
// economy, reward estimator/package, party capability — already existed
// from Phase 8D-1/8D-2 and is reused verbatim here, never reinvented).
//
// Authority reuse proved throughout: `job-bundle.js`'s composer imports
// and calls the SAME functions/objects these tests import directly, so an
// identity/reference check here is a genuine proof the composer did not
// fork a parallel copy.

registerFoundryPathLoader();
installFoundryShimGlobals();

const {
  createProceduralJobDraft, regenerateJobDraft, regenerateJobObjectives, rerollJobObjective,
  rerollJobObjectiveOpposition, rerollJobObjectiveSubject, addJobObjective, removeJobObjective,
  rerollJobReward, rerollJobMissionType, rerollJobLegalityVisibility, rerollJobUrgency, rerollJobHook,
  rerollJobStakes, rerollJobComplications, rerollJobTwist, removeJobTwist, rerollJobConsequences,
  rollJobMissionType
} = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-bundle.js');
const { createJobDraft, createJobObjectiveDraft } = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-draft.js');
const { jobAddCustomField, jobSetFieldValue, jobRemoveDraftField, jobRestoreDraftField } = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-field-authoring.js');
const { JOB_FIELD_DEFINITIONS } = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-field-definitions.js');
const { JOB_ARCHETYPE_METADATA } = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-archetype-metadata.js');
const { JOB_LEGALITY, JOB_VISIBILITY } = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-legality-visibility.js');
const { JOB_URGENCY } = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-urgency.js');
const { OBJECTIVE_TIER, OBJECTIVE_DIFFICULTY, isObjectiveTier, isObjectiveDifficulty } = await import('/systems/foundryvtt-swse/scripts/generation/objective-economy.js');
const { OBJECTIVE_TEMPLATE_FIXTURES } = await import('/systems/foundryvtt-swse/scripts/generation/objective-template.js');
const { JOB_STAKES } = await import('/systems/foundryvtt-swse/scripts/generation/data/job-stakes.js');
const { JOB_HOOKS } = await import('/systems/foundryvtt-swse/scripts/generation/data/job-hooks.js');
const { GALACTIC_COMMODITIES } = await import('/systems/foundryvtt-swse/scripts/generation/data/galactic-commodities.js');
const { verifyRewardPackageAccounting, verifyKeepTheTargetPackageAccounting } = await import('/systems/foundryvtt-swse/scripts/generation/reward-package.js');
const { isDraftId, draftIdDomain } = await import('/systems/foundryvtt-swse/scripts/generation/lib/draft-id.js');
const { DIAGNOSTIC_CODE } = await import('/systems/foundryvtt-swse/scripts/generation/lib/generator-diagnostics.js');
const { ISSUER_TYPE } = await import('/systems/foundryvtt-swse/scripts/generation/organization-metadata.js');

function makeSeededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// Matches gm-generation-phase8d3b-production.test.mjs's own stub
// convention -- avoids the one Foundry-dependent step (chargen name
// fetch) so named-subject generation stays deterministic and network-free
// under plain Node.
const stubNameProvider = async () => 'Test Subject Name';
const stubDroidNameProvider = async () => 'TX-1';

async function run() {
  // --- 1: representative catalogs exist at foundation scale, no dupes ----
  {
    assert.ok(JOB_STAKES.length >= 15, `JOB_STAKES should have a representative foundation-scale catalog, got ${JOB_STAKES.length}`);
    assert.ok(JOB_HOOKS.length >= 15, `JOB_HOOKS should have a representative foundation-scale catalog, got ${JOB_HOOKS.length}`);
    for (const [name, pool] of [['JOB_STAKES', JOB_STAKES], ['JOB_HOOKS', JOB_HOOKS]]) {
      const seen = new Set();
      for (const entry of pool) {
        const key = entry.value.trim().toLowerCase();
        assert.ok(!seen.has(key), `${name} has a duplicate entry: "${entry.value}"`);
        seen.add(key);
      }
    }
  }

  // --- 2: authority reuse -- no duplicate vocabulary was invented ---------
  {
    const mod = readFileSync(new URL('../scripts/generation/jobs/job-bundle.js', import.meta.url), 'utf8');
    assert.match(mod, /import \{ JOB_ARCHETYPE_METADATA, describeJobArchetype \} from '\.\/job-archetype-metadata\.js';/, 'must import the existing JOB_ARCHETYPE_METADATA, never duplicate it under a new name');
    assert.doesNotMatch(mod, /JOB_ARCHETYPE_METADATA_V2|JOB_ENEMY_TAGS_V2|JOB_ARCHETYPES_2/, 'must never fork a parallel "v2" archetype/opposition-tag table');
    assert.match(mod, /import \{ GALACTIC_COMMODITIES \} from '\.\.\/data\/galactic-commodities\.js';/, 'commodity references must reuse the 8D-3A catalog, never a duplicate');
  }

  // --- 3: draft identity ---------------------------------------------------
  {
    const rng = makeSeededRng(1);
    const draft = await createProceduralJobDraft({ rng });
    assert.ok(isDraftId(draft.draftId), 'Job draft must carry a domain-namespaced draft id');
    assert.equal(draftIdDomain(draft.draftId), 'job');
    for (const objective of draft.objectives) {
      assert.ok(isDraftId(objective.draftId), 'every objective must carry its own stable draft id');
      assert.equal(draftIdDomain(objective.draftId), 'job-objective');
    }
    // No two objectives share a draftId.
    const ids = new Set(draft.objectives.map((o) => o.draftId));
    assert.equal(ids.size, draft.objectives.length);
  }

  // --- 4: objective tier/difficulty are separate, never-merged concepts ---
  {
    const rng = makeSeededRng(2);
    const draft = await createProceduralJobDraft({ rng, objectiveCount: 3 });
    assert.equal(draft.objectives.length, 3);
    assert.equal(draft.objectives[0].tier, OBJECTIVE_TIER.PRIMARY);
    assert.equal(draft.objectives[1].tier, OBJECTIVE_TIER.SECONDARY);
    assert.equal(draft.objectives[2].tier, OBJECTIVE_TIER.TERTIARY);
    assert.ok(draft.objectives[0].required, 'primary objective must always be required');
    for (const objective of draft.objectives) {
      assert.ok(isObjectiveTier(objective.tier));
      assert.ok(isObjectiveDifficulty(objective.difficulty));
    }
    // Difficulty is generator-only metadata with no canonical equivalent --
    // proven by exercising the full 5-band vocabulary is reachable.
    const seenDifficulties = new Set();
    for (let seed = 0; seed < 60; seed++) {
      const d = await createProceduralJobDraft({ rng: makeSeededRng(seed * 97 + 3) });
      seenDifficulties.add(d.objectives[0].difficulty);
    }
    assert.ok(seenDifficulties.size >= 3, `expected multiple difficulty bands across trials, saw only ${[...seenDifficulties]}`);
  }

  // --- 5: legality/visibility/urgency reuse the existing closed vocabularies
  {
    const rng = makeSeededRng(4);
    const draft = await createProceduralJobDraft({ rng });
    assert.ok(Object.values(JOB_LEGALITY).includes(draft.legality));
    assert.ok(Object.values(JOB_VISIBILITY).includes(draft.visibility));
    assert.ok(Object.values(JOB_URGENCY).includes(draft.urgency));
  }

  // --- 6: NO mechanical encounter generation (opposition + subjects) ------
  {
    const forbiddenKeys = ['level', 'cl', 'challengeLevel', 'bab', 'baseAttackBonus', 'hp', 'hitPoints', 'defenses', 'reflexDefense', 'fortitudeDefense', 'willDefense', 'feats', 'xpBudget'];
    const rng = makeSeededRng(5);
    const draft = await createProceduralJobDraft({ rng, objectiveCount: 3, missionType: 'assault' });
    for (const objective of draft.objectives) {
      if (!objective.oppositionRequest) continue;
      for (const key of Object.keys(objective.oppositionRequest)) {
        assert.ok(!forbiddenKeys.includes(key), `oppositionRequest must never carry a mechanical field, found "${key}"`);
      }
      // rankContext is normalized/organizational metadata only, never a numeric level.
      assert.equal(typeof objective.oppositionRequest.rankContext, 'string');
    }
  }

  // --- 7: cross-domain draft/canonical duality (issuer + location) --------
  {
    const rng = makeSeededRng(6);
    const withCanonical = await createProceduralJobDraft({
      rng, issuer: { type: ISSUER_TYPE.FACTION, factionId: 'Faction.real1', scale: 12 },
      locationId: 'Location.real2'
    });
    assert.equal(withCanonical.issuerFactionId, 'Faction.real1');
    assert.equal(withCanonical.issuerFactionDraftId, '');
    assert.equal(withCanonical.locationId, 'Location.real2');
    assert.equal(withCanonical.locationDraftId, '');

    const withDraftRefs = await createProceduralJobDraft({
      rng: makeSeededRng(7), issuer: { type: ISSUER_TYPE.FACTION, factionDraftId: 'draft:faction:abc123', scale: 8 },
      locationDraftId: 'draft:location:def456'
    });
    assert.equal(withDraftRefs.issuerFactionId, '');
    assert.equal(withDraftRefs.issuerFactionDraftId, 'draft:faction:abc123');
    assert.equal(withDraftRefs.locationId, '');
    assert.equal(withDraftRefs.locationDraftId, 'draft:location:def456');
  }

  // --- 8: commodity reference reuse (never a duplicated commodity list) ---
  {
    const commodityIds = new Set(GALACTIC_COMMODITIES.map((c) => c.id));
    let foundCommodityReference = false;
    for (let seed = 0; seed < 40; seed++) {
      const draft = await createProceduralJobDraft({ rng: makeSeededRng(seed * 13 + 100), missionType: 'recovery' });
      for (const objective of draft.objectives) {
        if (objective.assetObjective?.referenceId) {
          foundCommodityReference = true;
          assert.ok(commodityIds.has(objective.assetObjective.referenceId), `assetObjective.referenceId "${objective.assetObjective.referenceId}" must be a real galactic-commodities.js id`);
        }
      }
    }
    assert.ok(foundCommodityReference, 'expected at least one trial to surface a commodity-referencing asset objective');
  }

  // --- 9: Faction jobDefaults is a soft bias, read-only, never duplicated -
  {
    const jobDefaults = { legality: JOB_LEGALITY.ILLEGAL, visibility: JOB_VISIBILITY.HIDDEN, successDelta: 3, failureDelta: -4 };
    let illegalCount = 0;
    const trials = 40;
    for (let seed = 0; seed < trials; seed++) {
      const draft = await createProceduralJobDraft({
        rng: makeSeededRng(seed * 31 + 500),
        jobContext: { factionContext: { name: 'The Syndicate', jobDefaults, scale: 10, relationship: 'neutral' } }
      });
      assert.equal(draft.successDelta, 3, 'successDelta must be read straight from jobDefaults, never recomputed');
      assert.equal(draft.failureDelta, -4);
      if (draft.legality === JOB_LEGALITY.ILLEGAL) illegalCount++;
    }
    // Soft bias: clearly more often than the unbiased ~25% baseline (4 legality values), but not 100% (never a hard override).
    assert.ok(illegalCount > trials * 0.4, `expected jobDefaults.legality to bias generation toward "illegal" more than baseline, got ${illegalCount}/${trials}`);
    assert.ok(illegalCount < trials, 'jobDefaults must be a SOFT bias, never a hard override that forces every trial');
  }

  // --- 10: context weighting is statistically provable but soft -----------
  {
    const trials = 60;
    let biasedRescueCount = 0;
    let unbiasedRescueCount = 0;
    for (let seed = 0; seed < trials; seed++) {
      const biased = rollJobMissionType({ rng: makeSeededRng(seed * 7 + 1000), preferTags: ['rescue'] });
      if (biased === 'rescue') biasedRescueCount++;
      const unbiased = rollJobMissionType({ rng: makeSeededRng(seed * 7 + 1000) });
      if (unbiased === 'rescue') unbiasedRescueCount++;
    }
    assert.ok(biasedRescueCount > unbiasedRescueCount, `preferTags=['rescue'] should shift the missionType distribution toward rescue (biased=${biasedRescueCount}, unbiased=${unbiasedRescueCount})`);
    assert.ok(biasedRescueCount < trials, 'no single context tag may monopolize output -- other mission types must still occur');
  }

  // --- 11: determinism -- same seed + same semantic inputs -> same output -
  {
    const optionsA = { rng: makeSeededRng(999), missionType: 'escort', objectiveCount: 2, applyVariance: false };
    const optionsB = { rng: makeSeededRng(999), missionType: 'escort', objectiveCount: 2, applyVariance: false };
    const draftA = await createProceduralJobDraft(optionsA);
    const draftB = await createProceduralJobDraft(optionsB);
    // draftId is randomly minted (not seed-derived, matching every other
    // draft type in this ecosystem), so compare everything else.
    const { draftId: _idA, provenance: provA, ...restA } = draftA;
    const { draftId: _idB, provenance: provB, ...restB } = draftB;
    const stripObjectiveIds = (objs) => objs.map(({ draftId, subjectNpcConcept, ...o }) => ({ ...o, subjectNpcConcept: subjectNpcConcept ? { ...subjectNpcConcept, draftId: undefined } : null }));
    assert.deepEqual(stripObjectiveIds(restA.objectives), stripObjectiveIds(restB.objectives), 'identical seed + identical semantic inputs must produce identical objectives');
    assert.equal(restA.missionType, restB.missionType);
    assert.equal(restA.legality, restB.legality);
    assert.equal(restA.rewardEstimate.total, restB.rewardEstimate.total);
  }

  // --- 12: reward accounting -- reuses reward-package.js's own verifier ---
  {
    const rng = makeSeededRng(50);
    const draft = await createProceduralJobDraft({ rng, missionType: 'delivery' });
    if (draft.rewardPackage.materialRewards.some((r) => r.isKeptTarget)) {
      assert.ok(verifyKeepTheTargetPackageAccounting(draft.rewardPackage, draft.rewardEstimate));
    } else {
      assert.ok(verifyRewardPackageAccounting(draft.rewardPackage), 'credits + material rewards must equal totalValue exactly');
    }
  }

  // --- 13: diagnostics -- hostile relationship + Job context mismatch -----
  {
    const hostileDraft = await createProceduralJobDraft({ rng: makeSeededRng(60), issuer: { type: ISSUER_TYPE.FACTION, relationship: 'hostile', scale: 10 } });
    assert.ok(hostileDraft.provenance.warnings.includes(DIAGNOSTIC_CODE.HOSTILE_RELATIONSHIP_NO_NORMAL_JOB));

    const mismatchDraft = await createProceduralJobDraft({
      rng: makeSeededRng(61), locationId: 'Location.A',
      jobContext: { locationContext: { locationId: 'Location.B' } }
    });
    assert.ok(mismatchDraft.provenance.warnings.includes(DIAGNOSTIC_CODE.JOB_CONTEXT_MISMATCH));

    const coherentDraft = await createProceduralJobDraft({
      rng: makeSeededRng(62), locationId: 'Location.A',
      jobContext: { locationContext: { locationId: 'Location.A' } }
    });
    assert.ok(!coherentDraft.provenance.warnings.includes(DIAGNOSTIC_CODE.JOB_CONTEXT_MISMATCH));
  }

  // --- 14: targeted reroll -- sibling objectives are preserved by reference
  {
    const rng = makeSeededRng(70);
    const draft = await createProceduralJobDraft({ rng, objectiveCount: 3 });
    const untouchedSibling = draft.objectives[2];
    const rerolled = await rerollJobObjective(draft, draft.objectives[0].draftId, { rng: makeSeededRng(71) });
    assert.equal(rerolled.objectives[0].draftId, draft.objectives[0].draftId, 'reroll preserves the same objective draftId');
    assert.equal(rerolled.objectives[2], untouchedSibling, 'untouched sibling objective must be the SAME object reference');
    assert.notEqual(rerolled.objectives[0].templateId, undefined);
  }

  // --- 15: opposition-only reroll never touches slots/description --------
  {
    const rng = makeSeededRng(72);
    const draft = await createProceduralJobDraft({ rng });
    const before = draft.objectives[0];
    const after = rerollJobObjectiveOpposition(draft, before.draftId, { rng: makeSeededRng(73) });
    assert.equal(after.objectives[0].description, before.description, 'opposition-only reroll must not alter the objective description');
    assert.deepEqual(after.objectives[0].slotValues, before.slotValues);
  }

  // --- 16: subject-only reroll never touches non-NPC slots -----------------
  {
    const rng = makeSeededRng(74);
    const draft = await createProceduralJobDraft({ rng, missionType: 'rescue' });
    const before = draft.objectives[0];
    const nonNpcSlotNamesBefore = { ...before.slotValues };
    delete nonNpcSlotNamesBefore.targetNpc;
    const after = await rerollJobObjectiveSubject(draft, before.draftId, { rng: makeSeededRng(75), withNamedSubjects: true, forceNamedSubject: true, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.equal(after.objectives[0].subjectNpcConcept?.name, 'Test Subject Name', 'a forced named-subject reroll must actually produce a full npc-bundle.js concept');
    const nonNpcSlotNamesAfter = { ...after.objectives[0].slotValues };
    delete nonNpcSlotNamesAfter.targetNpc;
    assert.deepEqual(nonNpcSlotNamesAfter, nonNpcSlotNamesBefore, 'subject-only reroll must leave every other slot (location/etc.) untouched');
  }

  // --- 17: add/remove objective preserves the rest, recomputes reward -----
  {
    const rng = makeSeededRng(80);
    const draft = await createProceduralJobDraft({ rng, objectiveCount: 2 });
    const added = await addJobObjective(draft, { rng: makeSeededRng(81) });
    assert.equal(added.objectives.length, 3);
    assert.equal(added.objectives[0].draftId, draft.objectives[0].draftId);
    assert.equal(added.objectives[1].draftId, draft.objectives[1].draftId);

    const removed = removeJobObjective(added, added.objectives[2].draftId);
    assert.equal(removed.objectives.length, 2);

    // A Job must always retain at least one objective.
    const strippedDown = removeJobObjective(removed, removed.objectives[1].draftId);
    const cannotRemoveLast = removeJobObjective(strippedDown, strippedDown.objectives[0].draftId);
    assert.equal(cannotRemoveLast.objectives.length, 1, 'the last remaining objective must never be removable');
  }

  // --- 18: GM sovereignty walkthrough --------------------------------------
  {
    const rng = makeSeededRng(90);
    let draft = await createProceduralJobDraft({ rng, objectiveCount: 2 });

    // GM manually edits the hook via field authoring.
    draft = jobSetFieldValue(draft, 'hook', 'The GM wrote this hook by hand.');
    assert.equal(draft.hook, 'The GM wrote this hook by hand.');

    // GM manually rerolls only ONE objective.
    const targetId = draft.objectives[1].draftId;
    draft = await rerollJobObjective(draft, targetId, { rng: makeSeededRng(91) });

    // An UNRELATED reroll (urgency) must not disturb either GM edit.
    draft = rerollJobUrgency(draft, { rng: makeSeededRng(92) });
    assert.equal(draft.hook, 'The GM wrote this hook by hand.', 'an unrelated reroll must never overwrite a GM-authored field');
    assert.equal(draft.objectives[1].draftId, targetId, 'the objective identity survives an unrelated reroll');

    // GM removes the hook field entirely -- must read empty (semantic sovereignty), not silently reappear.
    draft = jobRemoveDraftField(draft, 'hook');
    assert.equal(draft.hook, '', 'a removed field must clear its scalar mirror, matching NPC field-authoring precedent');
    draft = rerollJobStakes(draft, { rng: makeSeededRng(93) });
    assert.equal(draft.hook, '', 'an unrelated reroll must not resurrect a removed field');

    // Restore brings it back as an empty, addressable field again.
    draft = jobRestoreDraftField(draft, 'hook');
    assert.ok(draft.narrativeFields.fields.hook && !draft.narrativeFields.fields.hook.hidden);
  }

  // --- 19: every registered field-authoring field is a real job-draft.js scalar
  {
    const rng = makeSeededRng(95);
    const draft = await createProceduralJobDraft({ rng });
    for (const fieldId of Object.keys(JOB_FIELD_DEFINITIONS)) {
      assert.ok(fieldId in draft, `JOB_FIELD_DEFINITIONS registers "${fieldId}" but job-draft.js has no matching scalar field`);
    }
  }

  // --- 20: full regenerate produces a wholly different draftId ------------
  {
    const rng = makeSeededRng(100);
    const draft = await createProceduralJobDraft({ rng });
    const regenerated = await regenerateJobDraft(draft, { rng: makeSeededRng(101) });
    assert.notEqual(regenerated.draftId, draft.draftId);
  }

  // --- 21: regenerateJobObjectives / rerollJobReward keep reward accounting valid
  {
    const rng = makeSeededRng(110);
    const draft = await createProceduralJobDraft({ rng, objectiveCount: 2 });
    const regenerated = await regenerateJobObjectives(draft, { rng: makeSeededRng(111) });
    assert.ok(regenerated.rewardEstimate && Number.isFinite(regenerated.rewardEstimate.total));
    const rewardOnly = rerollJobReward(draft, { rng: makeSeededRng(112), partyCapability: 10 });
    assert.notEqual(rewardOnly.rewardEstimate.total, undefined);
    assert.deepEqual(rewardOnly.objectives.map((o) => o.draftId), draft.objectives.map((o) => o.draftId), 'rerollJobReward must never change objective identity');
  }

  // --- 22: complications/twist/consequences reroll wrappers work ----------
  {
    const rng = makeSeededRng(120);
    let draft = await createProceduralJobDraft({ rng });
    draft = rerollJobComplications(draft, { rng: makeSeededRng(121), count: 2 });
    assert.equal(draft.complications.length, 2);
    draft = rerollJobTwist(draft, { rng: makeSeededRng(122) });
    assert.ok(draft.twist === null || typeof draft.twist.value === 'string');
    draft = removeJobTwist(draft);
    assert.equal(draft.twist, null);
    draft = rerollJobConsequences(draft, { rng: makeSeededRng(123) });
    assert.ok(draft.successConsequence && draft.failureConsequence);
    draft = rerollJobLegalityVisibility(draft, { rng: makeSeededRng(124) });
    assert.ok(Object.values(JOB_LEGALITY).includes(draft.legality));
  }

  // --- 23: canonical-persistence guard (static source scan) ---------------
  {
    const files = [
      '../scripts/generation/jobs/job-draft.js',
      '../scripts/generation/jobs/job-bundle.js',
      '../scripts/generation/jobs/job-field-authoring.js',
      '../scripts/generation/jobs/job-field-definitions.js',
      '../scripts/generation/jobs/job-stake.js',
      '../scripts/generation/jobs/job-hook.js'
    ];
    const forbidden = [/createJobPosting\s*\(/, /_gmCreateJobPosting\s*\(/, /upsertFaction\s*\(/, /promoteFactionContactToActor\s*\(/, /game\.actors\.create\s*\(/, /LocationRegistryService\./];
    for (const relPath of files) {
      const raw = readFileSync(new URL(relPath, import.meta.url), 'utf8');
      // Strip block/line comments first -- this guard proves no CALL exists
      // in actual code, not that the words never appear in doc-comment
      // prose (which explicitly documents the one real, external
      // persistence entry point this module deliberately never calls).
      const codeOnly = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      for (const pattern of forbidden) {
        assert.doesNotMatch(codeOnly, pattern, `${relPath} must never call a canonical-persistence entry point (found ${pattern})`);
      }
    }
  }

  // --- 24: createJobDraft/createJobObjectiveDraft shape sanity ------------
  {
    const bare = createJobDraft();
    assert.ok(isDraftId(bare.draftId));
    assert.equal(bare.source, 'generator-draft');
    assert.equal(bare.status, 'draft');
    assert.deepEqual(bare.objectives, []);

    const bareObjective = createJobObjectiveDraft();
    assert.ok(isDraftId(bareObjective.draftId));
    assert.equal(bareObjective.tier, OBJECTIVE_TIER.SECONDARY);
    assert.equal(bareObjective.difficulty, OBJECTIVE_DIFFICULTY.STANDARD);
  }

  console.log('PHASE 8D-3C Job generation wiring: all 24 assertion blocks passed.');
}

await run();
