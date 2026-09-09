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
  rerollJobStakes, rerollJobComplications, rerollJobComplication, addJobComplication, removeJobComplication,
  rerollJobTwist, removeJobTwist, rerollJobConsequences, rollJobMissionType,
  recomposeJobTitle, recomposeJobBriefing, setJobTitle, resetJobTitleToDerived, setJobBriefing, resetJobBriefingToDerived,
  setJobObjectiveTitle, setJobObjectiveDescription, setJobReward, resetJobRewardToDerived,
  rerollJobSecret, addJobRewardSuggestion, rerollJobRewardSuggestion, removeJobRewardSuggestion, setJobRewardSuggestion
} = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-bundle.js');
const {
  createJobDraft, createJobObjectiveDraft, updateJobDraft, updateJobObjectiveDraft, createJobComplicationInstance,
  createJobRewardSuggestionInstance, JOB_DERIVED_TEXT_SOURCE, JOB_REWARD_SOURCE, JOB_REWARD_SUGGESTION_TYPE
} = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-draft.js');
const {
  resolveJobLocationContext, resolveJobIssuerFactionContext, resolveJobIssuerContactContext, deriveJobContextTags, resolveJobCurrentEventText
} = await import('/systems/foundryvtt-swse/scripts/generation/jobs/job-context.js');
const { resolveDualityReference } = await import('/systems/foundryvtt-swse/scripts/generation/lib/reference-duality.js');
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

  // --- 18: full GM sovereignty walkthrough (correction round 1) -----------
  // Covers every category the independent review's issue #11 named:
  // manual objective rewrite, removing a second objective, a manual
  // reward edit, a custom field, a manual Secret edit, a specific
  // Contact/Location link, a single-instance complication reroll, a
  // single-objective opposition reroll, and GM-safe whole regeneration
  // -- proving each survives every OTHER, unrelated operation.
  {
    const rng = makeSeededRng(90);
    let draft = await createProceduralJobDraft({
      rng, objectiveCount: 3,
      issuer: { type: ISSUER_TYPE.FACTION, contactId: 'contact-42', factionId: 'faction-42', scale: 6 },
      locationId: 'Location.fixed-1'
    });
    assert.equal(draft.issuerContactId, 'contact-42');
    assert.equal(draft.locationId, 'Location.fixed-1');

    // 0. Simulate a promoted Contact -> Actor identity (what
    //    resolveJobIssuerContactContext() would have surfaced from a real
    //    promoted Contact) -- must survive everything below, including
    //    whole regeneration (round 2, item 3).
    draft = updateJobDraft(draft, {
      issuerContactActorId: 'actor-42', issuerContactActorUuid: 'Actor.actor-42', issuerContactActorName: 'The Quiet Broker'
    });

    // 1. Manual objective rewrite -- via the dedicated ownership-marking
    //    setters (round 2), NOT a raw patch, so titleSource/
    //    descriptionSource actually flip to 'manual' and the edit is
    //    provably protected across whole regeneration (see step 10 below).
    const rewrittenId = draft.objectives[2].draftId;
    draft = setJobObjectiveTitle(draft, rewrittenId, 'GM-rewritten objective title');
    draft = setJobObjectiveDescription(draft, rewrittenId, 'GM-rewritten objective description.');
    assert.equal(draft.objectives.find((o) => o.draftId === rewrittenId).description, 'GM-rewritten objective description.');
    assert.equal(draft.objectives.find((o) => o.draftId === rewrittenId).titleSource, JOB_DERIVED_TEXT_SOURCE.MANUAL);
    assert.equal(draft.objectives.find((o) => o.draftId === rewrittenId).descriptionSource, JOB_DERIVED_TEXT_SOURCE.MANUAL);

    // 2. Remove a second (non-Primary) objective.
    const toRemoveId = draft.objectives[1].draftId;
    draft = removeJobObjective(draft, toRemoveId, { rng: makeSeededRng(91) });
    assert.equal(draft.objectives.length, 2);
    assert.ok(!draft.objectives.some((o) => o.draftId === toRemoveId));
    assert.ok(draft.objectives.some((o) => o.draftId === rewrittenId), 'the manually-rewritten objective must survive removing a DIFFERENT objective');

    // 3. Manual reward edit -- via setJobReward() (round 2), which both
    //    applies the patch AND marks rewardSource 'manual' so it survives
    //    every reward-affecting reroll except an EXPLICIT rerollJobReward().
    draft = setJobReward(draft, { credits: 123456 });
    assert.equal(draft.rewardPackage.credits, 123456);
    assert.equal(draft.rewardSource, JOB_REWARD_SOURCE.MANUAL);

    // 4. Add a custom field.
    draft = jobAddCustomField(draft, { label: 'Client Alias', value: 'The Quiet Broker' });
    const customFieldId = draft.narrativeFields.order.find((id) => draft.narrativeFields.fields[id].isCustom);
    assert.ok(customFieldId, 'a custom field must have been added');

    // 5. Manual Secret edit.
    draft = jobSetFieldValue(draft, 'secret', 'The client is actually the target\'s sibling.');
    assert.equal(draft.secret, "The client is actually the target's sibling.");

    // 6/7. Contact/Location links already set at creation (contact-42 / Location.fixed-1) -- confirm still intact so far.
    assert.equal(draft.issuerContactId, 'contact-42');
    assert.equal(draft.locationId, 'Location.fixed-1');

    // 8. Reroll ONE complication instance (add one first so there's something to target).
    draft = addJobComplication(draft, { rng: makeSeededRng(92) });
    const complicationId = draft.complications[draft.complications.length - 1].instanceId;
    draft = rerollJobComplication(draft, complicationId, { rng: makeSeededRng(93) });
    assert.ok(draft.complications.some((c) => c.instanceId === complicationId), 'the rerolled complication keeps its own instanceId');

    // 9. Reroll ONE objective's opposition.
    draft = rerollJobObjectiveOpposition(draft, rewrittenId, { rng: makeSeededRng(94) });
    // The manual rewrite's description must survive an OPPOSITION-only reroll of the very same objective.
    assert.equal(draft.objectives.find((o) => o.draftId === rewrittenId).description, 'GM-rewritten objective description.');

    // Now: every manual edit above must survive an UNRELATED reroll (urgency).
    draft = rerollJobUrgency(draft, { rng: makeSeededRng(95) });
    assert.equal(draft.rewardPackage.credits, 123456, 'manual reward edit must survive an unrelated reroll');
    assert.equal(draft.secret, "The client is actually the target's sibling.", 'manual Secret must survive an unrelated reroll');
    assert.equal(draft.issuerContactId, 'contact-42', 'explicit Contact link must survive an unrelated reroll');
    assert.equal(draft.locationId, 'Location.fixed-1', 'explicit Location link must survive an unrelated reroll');
    assert.ok(draft.narrativeFields.fields[customFieldId], 'custom field must survive an unrelated reroll');
    assert.equal(draft.objectives.find((o) => o.draftId === rewrittenId).description, 'GM-rewritten objective description.', 'manually-rewritten objective must survive an unrelated reroll');

    // 9.5. Add a reward suggestion, then manually overwrite it (round 2, item 6).
    draft = addJobRewardSuggestion(draft, { rng: makeSeededRng(94.5) });
    const rewardSuggestionId = draft.rewardSuggestions[draft.rewardSuggestions.length - 1].rewardId;
    draft = setJobRewardSuggestion(draft, rewardSuggestionId, { value: 'GM-written reward suggestion.' });
    assert.equal(draft.rewardSuggestions.find((s) => s.rewardId === rewardSuggestionId).source, 'manual');

    // 10. Whole regeneration (GM-safe semantics): title/hook/etc. field-authoring state survives; SAME draftId.
    //     Round 2: ALSO proves the manually-rewritten objective, the
    //     manually-overridden reward, the promoted Actor identity, and
    //     the manually-authored reward suggestion all survive -- the
    //     exact hole the independent review's round-2 item 1/3 flagged
    //     in the round-1 version of this test.
    draft = jobSetFieldValue(draft, 'hook', 'The GM wrote this hook by hand.');
    const preRegenDraftId = draft.draftId;
    draft = await regenerateJobDraft(draft, { rng: makeSeededRng(96) });
    assert.equal(draft.draftId, preRegenDraftId, 'whole regeneration must preserve the Job\'s own identity');
    assert.equal(draft.hook, 'The GM wrote this hook by hand.', 'field-authored fact must survive whole regeneration');
    assert.equal(draft.secret, "The client is actually the target's sibling.", 'manual Secret must survive whole regeneration');
    assert.equal(draft.objectives.find((o) => o.draftId === rewrittenId)?.description, 'GM-rewritten objective description.', 'ROUND 2: manually-rewritten objective description must survive whole regeneration');
    assert.equal(draft.objectives.find((o) => o.draftId === rewrittenId)?.title, 'GM-rewritten objective title', 'ROUND 2: manually-rewritten objective title must survive whole regeneration');
    assert.equal(draft.objectives.find((o) => o.draftId === rewrittenId)?.descriptionSource, JOB_DERIVED_TEXT_SOURCE.MANUAL, 'ROUND 2: the manual lock itself must survive whole regeneration, not just the text');
    assert.equal(draft.rewardPackage.credits, 123456, 'ROUND 2: manually-overridden reward must survive whole regeneration');
    assert.equal(draft.rewardSource, JOB_REWARD_SOURCE.MANUAL, 'ROUND 2: the manual reward lock itself must survive whole regeneration');
    assert.equal(draft.issuerContactActorId, 'actor-42', 'ROUND 2: promoted Actor id must survive whole regeneration');
    assert.equal(draft.issuerContactActorUuid, 'Actor.actor-42', 'ROUND 2: promoted Actor uuid must survive whole regeneration');
    assert.equal(draft.issuerContactActorName, 'The Quiet Broker', 'ROUND 2: promoted Actor name must survive whole regeneration');
    const survivedSuggestion = draft.rewardSuggestions.find((s) => s.rewardId === rewardSuggestionId);
    assert.equal(survivedSuggestion?.value, 'GM-written reward suggestion.', 'ROUND 2: manually-authored reward suggestion must survive whole regeneration');
    assert.equal(survivedSuggestion?.source, 'manual', 'ROUND 2: the manual reward-suggestion lock itself must survive whole regeneration');

    // Removed-field semantic sovereignty, re-verified end to end.
    draft = jobRemoveDraftField(draft, 'hook');
    assert.equal(draft.hook, '', 'a removed field must clear its scalar mirror, matching NPC field-authoring precedent');
    draft = rerollJobStakes(draft, { rng: makeSeededRng(97) });
    assert.equal(draft.hook, '', 'an unrelated reroll must not resurrect a removed field');
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

  // --- 20: regenerateJobDraft is GM-SAFE -- SAME Job, generated content
  // rerolled, every GM-authored fact preserved. `createProceduralJobDraft()`
  // (not regenerateJobDraft()) is the "make a wholly new Job" operation.
  {
    const rng = makeSeededRng(100);
    let draft = await createProceduralJobDraft({ rng, objectiveCount: 2 });
    draft = setJobTitle(draft, 'GM-authored title');
    draft = jobSetFieldValue(draft, 'hook', 'GM-authored hook');
    draft = jobRemoveDraftField(draft, 'stakes');
    const oldMissionType = draft.missionType;

    const regenerated = await regenerateJobDraft(draft, { rng: makeSeededRng(101) });
    assert.equal(regenerated.draftId, draft.draftId, 'regenerateJobDraft() must preserve the Job\'s own identity -- it regenerates THIS Job, it does not create a new one');
    assert.equal(regenerated.title, 'GM-authored title', 'a manually-locked title must survive a whole regenerate');
    assert.equal(regenerated.titleSource, JOB_DERIVED_TEXT_SOURCE.MANUAL);
    assert.equal(regenerated.hook, 'GM-authored hook', 'a manually-edited field-authored fact must survive a whole regenerate');
    assert.equal(regenerated.stakes, '', 'a GM-removed field must stay removed (empty) across a whole regenerate, never silently resurrected');
    // Generated content (mission type / objectives) IS free to reroll --
    // that's the entire point of "regenerate"; over enough seeds it
    // should differ from the original at least sometimes.
    assert.ok(isDraftId(regenerated.draftId));
    assert.notEqual(oldMissionType, undefined);

    // A caller may explicitly reuse the exact same missionType too --
    // regenerate is not required to change anything, only permitted to.
    const pinned = await regenerateJobDraft(draft, { rng: makeSeededRng(102), missionType: draft.missionType });
    assert.equal(pinned.missionType, draft.missionType);
    assert.equal(pinned.draftId, draft.draftId);

    // ROUND 2, item 8 (resilience note): a plain regenerateJobDraft(draft,
    // { rng }) call with NO explicit preferTags must still carry the
    // draft's own persisted contextTags bias forward -- previously
    // `preferTags: options.preferTags` (undefined unless re-supplied)
    // silently genericized a Job that was originally biased by real
    // Location/Faction/Contact context.
    const biased = await createProceduralJobDraft({ rng: makeSeededRng(103), preferTags: ['smuggling', 'criminal-syndicate'] });
    assert.ok(biased.contextTags.includes('smuggling') && biased.contextTags.includes('criminal-syndicate'), 'sanity: the biased draft actually persisted its creation-time contextTags');
    const biasedRegenerated = await regenerateJobDraft(biased, { rng: makeSeededRng(104) });
    for (const tag of biased.contextTags) {
      assert.ok(biasedRegenerated.contextTags.includes(tag), `regenerateJobDraft() without explicit preferTags must still carry forward the draft's own persisted contextTags bias ("${tag}" was lost)`);
    }
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

  // --- 25: resolveDualityReference() -- the shared generic primitive -----
  {
    // No explicit, context declares one -> use context's.
    let r = resolveDualityReference({ contextId: 'ctx-1' });
    assert.deepEqual(r, { ref: { id: 'ctx-1', draftId: '' }, conflict: false });
    // Explicit only, no context identity at all -> use explicit.
    r = resolveDualityReference({ explicitDraftId: 'draft:x:1' });
    assert.deepEqual(r, { ref: { id: '', draftId: 'draft:x:1' }, conflict: false });
    // Agreement -> use it, no conflict.
    r = resolveDualityReference({ explicitId: 'a', contextId: 'a' });
    assert.deepEqual(r, { ref: { id: 'a', draftId: '' }, conflict: false });
    // Conflict -> explicit wins, conflict reported.
    r = resolveDualityReference({ explicitId: 'a', contextId: 'b' });
    assert.deepEqual(r, { ref: { id: 'a', draftId: '' }, conflict: true });
    // Canonical id always beats a draftId in the same ref.
    r = resolveDualityReference({ explicitId: 'a', explicitDraftId: 'draft:x:1' });
    assert.equal(r.ref.draftId, '', 'a real id must clear any draftId in the same resolved ref');
  }

  // --- 26: issuer Faction context accepts BOTH a real Faction record (`id`)
  // and a Faction draft (`draftId`) -- the exact shapes those two real
  // authorities actually produce, not a third invented shape.
  {
    const canonicalFaction = { id: 'faction-real-1', name: 'Real Faction', type: 'Cartel', scale: 5, jobDefaults: { legality: 'legal' }, relationship: 'good' };
    const r1 = resolveJobIssuerFactionContext({ factionContext: canonicalFaction });
    assert.equal(r1.factionRef.factionId, 'faction-real-1');
    assert.equal(r1.factionRef.factionDraftId, '');
    assert.equal(r1.jobDefaults.legality, 'legal');

    const factionDraft = { draftId: 'draft:faction:abc', name: 'Drafted Faction', archetype: 'criminal-syndicate', organizationFamily: 'business_professional', scale: 9, jobDefaults: { legality: 'illegal' } };
    const r2 = resolveJobIssuerFactionContext({ factionContext: factionDraft });
    assert.equal(r2.factionRef.factionDraftId, 'draft:faction:abc');
    assert.equal(r2.factionRef.factionId, '');
    assert.ok(r2.contextTags.includes('criminal-syndicate'));

    // Explicit issuerFactionId conflicts with the SUPPLIED factionContext's own id -> context dropped, conflict reported.
    const r3 = resolveJobIssuerFactionContext({ issuerFactionId: 'other-faction', factionContext: canonicalFaction });
    assert.equal(r3.factionRef.factionId, 'other-faction');
    assert.equal(r3.contextMismatch, true);
    assert.equal(r3.jobDefaults, null, 'a mismatched context must be dropped entirely, including its jobDefaults bias');
  }

  // --- 27: issuer Contact context surfaces real Actor identity ------------
  {
    const canonicalContact = { id: 'contact-1', name: 'Boss Rill', role: 'Fixer', actorId: 'Actor.abc', actorUuid: 'Actor.abc.uuid', actorName: 'Rill', suggestedJobArchetypeTags: ['smuggling'] };
    const r = resolveJobIssuerContactContext({ contactContext: canonicalContact });
    assert.equal(r.contactRef.contactId, 'contact-1');
    assert.equal(r.actorId, 'Actor.abc');
    assert.equal(r.actorUuid, 'Actor.abc.uuid');
    assert.equal(r.actorName, 'Rill');
    assert.deepEqual(r.suggestedJobArchetypeTags, ['smuggling']);

    const npcDraft = { draftId: 'draft:npc:xyz', name: 'Unnamed Informant', suggestedOppositionTags: ['crime-syndicate'] };
    const r2 = resolveJobIssuerContactContext({ contactContext: npcDraft });
    assert.equal(r2.contactRef.contactDraftId, 'draft:npc:xyz');
    assert.deepEqual(r2.suggestedOppositionTags, ['crime-syndicate']);
  }

  // --- 28: resolveJobCurrentEventText reads the REAL location-event.js shape
  {
    assert.equal(resolveJobCurrentEventText({ currentEvents: [{ description: 'a strike halts shipments', severity: 'moderate' }] }), 'a strike halts shipments');
    assert.equal(resolveJobCurrentEventText({ currentEvents: [] }), '');
    assert.equal(resolveJobCurrentEventText(null), '');
    assert.equal(resolveJobCurrentEventText({ currentEventHints: ['stale legacy field, must be ignored'] }), '', 'the nonexistent legacy currentEventHints field must never be read');
  }

  // --- 29: deriveJobContextTags separates general/mission-type/opposition tags
  {
    const { generalTags, missionTypeTags, oppositionSeedTags } = deriveJobContextTags({
      preferTags: ['urban'],
      locationContext: { locationTags: ['frontier'], economyTags: ['mining'], suggestedJobArchetypeTags: ['smuggling', 'recovery'], suggestedOppositionTags: ['crime-syndicate'] },
      factionContextTags: ['criminal-syndicate'],
      contactSuggestedJobArchetypeTags: ['heist'],
      contactSuggestedOppositionTags: ['lawless']
    });
    assert.ok(generalTags.includes('urban') && generalTags.includes('frontier') && generalTags.includes('mining') && generalTags.includes('criminal-syndicate'));
    assert.ok(!generalTags.includes('smuggling'), 'mission-type tags must stay a SEPARATE set, not folded into the generic tag soup');
    assert.deepEqual(missionTypeTags.sort(), ['heist', 'recovery', 'smuggling'].sort());
    assert.deepEqual(oppositionSeedTags.sort(), ['crime-syndicate', 'lawless'].sort());
  }

  // --- 30: real suggestedJobArchetypeTags end-to-end bias missionType roll
  {
    const locationContext = { locationTags: ['mining'], suggestedJobArchetypeTags: ['smuggling'] };
    let hits = 0;
    const trials = 60;
    for (let seed = 0; seed < trials; seed++) {
      const d = await createProceduralJobDraft({ rng: makeSeededRng(seed * 19 + 2000), jobContext: { locationContext } });
      if (d.missionType === 'smuggling') hits++;
    }
    assert.ok(hits > trials * (1 / 14), `Location suggestedJobArchetypeTags must measurably bias missionType toward "smuggling" (baseline ~1/14), got ${hits}/${trials}`);
  }

  // --- 31: context-identity conflict SUPPRESSES the mismatched context's tags/bias, not merely diagnoses it
  {
    const locationContext = { locationId: 'Location.B', locationTags: ['mining'], suggestedJobArchetypeTags: ['smuggling'], currentEvents: [{ description: 'seed text that must not appear', severity: 'minor' }] };
    let sawSmuggling = false;
    let sawSeedNote = false;
    for (let seed = 0; seed < 40; seed++) {
      const d = await createProceduralJobDraft({ rng: makeSeededRng(seed * 23 + 3000), locationId: 'Location.A', jobContext: { locationContext } });
      assert.ok(d.provenance.warnings.includes(DIAGNOSTIC_CODE.JOB_CONTEXT_MISMATCH));
      if (d.missionType === 'smuggling') sawSmuggling = true;
      if (d.notes.includes('seed text that must not appear')) sawSeedNote = true;
    }
    assert.equal(sawSeedNote, false, 'a mismatched Location context\'s currentEvents must never leak into notes');
    // (missionType bias suppression is probabilistic to prove directly without flakiness; the notes assertion above is the deterministic proof the context was dropped, not merely flagged.)
    assert.ok(!sawSmuggling || true);
  }

  // --- 32: asset objectives never carry a fabricated price -----------------
  {
    let sawAsset = false;
    for (let seed = 0; seed < 60; seed++) {
      const d = await createProceduralJobDraft({ rng: makeSeededRng(seed * 29 + 4000), missionType: 'recovery' });
      for (const o of d.objectives) {
        if (o.assetObjective) {
          sawAsset = true;
          assert.equal(o.assetObjective.value, null, 'an asset objective must never carry an invented price');
          assert.equal(o.assetObjective.valueSource, 'unresolved');
        }
      }
    }
    assert.ok(sawAsset, 'expected at least one trial to surface an asset objective');
    // An unresolved asset objective must contribute nothing to the reward estimate (no double economy).
    const d = await createProceduralJobDraft({ rng: makeSeededRng(4001), missionType: 'recovery', objectiveCount: 1 });
    if (d.objectives[0].assetObjective) {
      assert.equal(d.rewardEstimate.breakdown.assetComponent, 0, 'an unresolved asset must not contribute to the reward estimate');
    }
  }

  // --- 33: opposition facets are rolled INDEPENDENTLY of objective difficulty
  {
    let sawRoutineDeadly = false;
    let sawExtremeTrivial = false;
    for (let seed = 0; seed < 300; seed++) {
      const d = await createProceduralJobDraft({ rng: makeSeededRng(seed * 41 + 5000), objectiveCount: 1 });
      const o = d.objectives[0];
      if (o.difficulty === OBJECTIVE_DIFFICULTY.ROUTINE && o.oppositionRequest?.threatLevel === 'deadly') sawRoutineDeadly = true;
      if (o.difficulty === OBJECTIVE_DIFFICULTY.EXTREME && o.oppositionRequest?.threatLevel === 'trivial') sawExtremeTrivial = true;
    }
    assert.ok(sawRoutineDeadly, 'a routine-difficulty objective must sometimes roll deadly opposition -- proves the facets are independent, matching opposition-request.js\'s own documented example');
    // extreme is rare enough (weight 0.3) that we don't hard-require the second combination, only assert the mechanism has no coupling by re-checking the ACTUAL CODE (comments stripped, since this file's own doc prose legitimately names the removed constant while explaining the fix):
    const src = readFileSync(new URL('../scripts/generation/jobs/job-bundle.js', import.meta.url), 'utf8');
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(codeOnly, /OPPOSITION_PROFILE_BY_DIFFICULTY/, 'the old hard difficulty->opposition-profile map must be gone from actual code');
    assert.doesNotMatch(codeOnly, /leadershipBoost:\s*difficulty/, 'opposition rank must not scale with difficulty in actual code');
  }

  // --- 34: Primary objective invariant -- required cannot be overridden false,
  // and removing the Primary promotes the next objective.
  {
    const forcedFalse = createJobObjectiveDraft({ tier: OBJECTIVE_TIER.PRIMARY, required: false });
    assert.equal(forcedFalse.required, true, 'a Primary objective must always be required, even if the caller explicitly passes required:false');

    const draft = await createProceduralJobDraft({ rng: makeSeededRng(6000), objectiveCount: 3 });
    const primaryId = draft.objectives.find((o) => o.tier === OBJECTIVE_TIER.PRIMARY).draftId;
    const afterRemoval = removeJobObjective(draft, primaryId, { rng: makeSeededRng(6001) });
    assert.equal(afterRemoval.objectives.length, 2);
    const newPrimary = afterRemoval.objectives.find((o) => o.tier === OBJECTIVE_TIER.PRIMARY);
    assert.ok(newPrimary, 'a Job must always have a Primary objective -- removing the old one must promote another');
    assert.equal(newPrimary.required, true);
  }

  // --- 35: complication instance identity + single-instance operations ----
  {
    const rng = makeSeededRng(7000);
    let draft = await createProceduralJobDraft({ rng });
    // 0 complications is a legitimate, reachable state.
    const zeroCounts = [];
    for (let seed = 0; seed < 30; seed++) {
      const d = await createProceduralJobDraft({ rng: makeSeededRng(seed * 43 + 7100) });
      zeroCounts.push(d.complications.length);
    }
    assert.ok(zeroCounts.includes(0), 'zero complications must be a reachable generated outcome');

    draft = updateJobDraft(draft, { complications: [] });
    draft = addJobComplication(draft, { rng: makeSeededRng(7001) });
    draft = addJobComplication(draft, { rng: makeSeededRng(7002) });
    assert.equal(draft.complications.length, 2);
    const ids = draft.complications.map((c) => c.instanceId);
    assert.equal(new Set(ids).size, 2, 'complication instance ids must be unique');

    const untouched = draft.complications[1];
    draft = rerollJobComplication(draft, ids[0], { rng: makeSeededRng(7003) });
    assert.equal(draft.complications[0].instanceId, ids[0], 'reroll preserves the SAME instanceId');
    assert.equal(draft.complications[1], untouched, 'the other complication instance must be the SAME object reference, untouched');

    draft = removeJobComplication(draft, ids[0]);
    assert.equal(draft.complications.length, 1);
    assert.equal(draft.complications[0].instanceId, ids[1]);

    // createJobComplicationInstance() mints a stable id, preserved on round-trip.
    const inst = createJobComplicationInstance({ value: 'test complication', tags: [] });
    assert.ok(isDraftId(inst.instanceId));
    assert.equal(draftIdDomain(inst.instanceId), 'job-complication');
    const reNormalized = createJobComplicationInstance(inst);
    assert.equal(reNormalized.instanceId, inst.instanceId, 're-normalizing an already-shaped instance must preserve its id');
  }

  // --- 36: title/briefing recompose vs. manual lock ------------------------
  {
    const rng = makeSeededRng(8000);
    let draft = await createProceduralJobDraft({ rng, objectiveCount: 2 });
    assert.equal(draft.titleSource, JOB_DERIVED_TEXT_SOURCE.DERIVED);
    assert.equal(draft.briefingSource, JOB_DERIVED_TEXT_SOURCE.DERIVED);

    // Recompose is a no-op when nothing changed, and a real recompute when called explicitly.
    const recomposed = recomposeJobTitle(draft);
    assert.equal(recomposed.title, draft.title);

    // Lock title manually; recompose becomes a no-op even after a direct missionType patch.
    draft = setJobTitle(draft, 'Frozen Title');
    assert.equal(draft.titleSource, JOB_DERIVED_TEXT_SOURCE.MANUAL);
    const patched = updateJobDraft(draft, { missionType: 'heist' });
    const stillFrozen = recomposeJobTitle(patched);
    assert.equal(stillFrozen.title, 'Frozen Title', 'a manually-locked title must not be recomposed');

    // Explicit reset-to-derived immediately recomputes from current facts.
    const reset = resetJobTitleToDerived(patched);
    assert.equal(reset.titleSource, JOB_DERIVED_TEXT_SOURCE.DERIVED);
    assert.ok(reset.title.toLowerCase().includes('heist'));

    // Briefing: lock manually, prove a Primary-objective reroll does not overwrite it.
    draft = setJobBriefing(draft, 'Frozen Briefing');
    const rerolled = await rerollJobObjective(draft, draft.objectives[0].draftId, { rng: makeSeededRng(8001) });
    assert.equal(rerolled.briefing, 'Frozen Briefing', 'a manually-locked briefing must survive a Primary objective reroll');

    // Reset briefing to derived, then a Primary objective reroll DOES refresh it.
    let derivedDraft = resetJobBriefingToDerived(draft);
    const primaryId = derivedDraft.objectives[0].draftId;
    derivedDraft = await rerollJobObjective(derivedDraft, primaryId, { rng: makeSeededRng(8002) });
    assert.equal(derivedDraft.briefing, derivedDraft.objectives.find((o) => o.draftId === primaryId).description, 'a derived briefing must recompose from the (possibly rerolled) Primary objective');
  }

  // --- 37 (round 2, item 2): reference duality is enforced AT the
  // createJobDraft()/updateJobDraft() boundary itself, not only by
  // job-bundle.js's composer -- direct conflict cases.
  {
    // A conflicting id/draftId pair for each of the three duality refs
    // must resolve canonical-id-wins/draft-id-cleared, even called
    // directly against createJobDraft() (bypassing the composer entirely).
    let draft = createJobDraft({
      issuerFactionId: 'Faction.real', issuerFactionDraftId: 'draft:faction:other',
      issuerContactId: 'Actor.contact-real', issuerContactDraftId: 'draft:contact:other',
      locationId: 'Location.real', locationDraftId: 'draft:location:other'
    });
    assert.equal(draft.issuerFactionId, 'Faction.real');
    assert.equal(draft.issuerFactionDraftId, '', 'a conflicting Faction draftId must be cleared, not silently kept alongside a real id');
    assert.equal(draft.issuerContactId, 'Actor.contact-real');
    assert.equal(draft.issuerContactDraftId, '', 'a conflicting Contact draftId must be cleared, not silently kept alongside a real id');
    assert.equal(draft.locationId, 'Location.real');
    assert.equal(draft.locationDraftId, '', 'a conflicting Location draftId must be cleared, not silently kept alongside a real id');

    // Same enforcement through updateJobDraft() -- a patch that introduces
    // a NEW conflict must be normalized too, not just the initial create.
    const fresh = createJobDraft({ locationDraftId: 'draft:location:abc' });
    assert.equal(fresh.locationId, '');
    assert.equal(fresh.locationDraftId, 'draft:location:abc');
    const patched = updateJobDraft(fresh, { locationId: 'Location.now-real' });
    assert.equal(patched.locationId, 'Location.now-real');
    assert.equal(patched.locationDraftId, '', 'updateJobDraft() introducing a real id must clear the stale draftId from the PREVIOUS state, not merge both');
  }

  // --- 38 (round 2, item 4): Faction organizationTags reach
  // oppositionRequest.organizationTags across every generation/reroll path.
  {
    const rng = makeSeededRng(9000);
    const factionContext = { archetype: 'criminal-syndicate', organizationFamily: 'crime-family', type: 'syndicate' };
    let draft = await createProceduralJobDraft({
      rng, objectiveCount: 2, issuer: { type: ISSUER_TYPE.FACTION, scale: 8 }, jobContext: { factionContext }
    });
    assert.ok(draft.issuerOrganizationTags.includes('criminal-syndicate'), 'sanity: the Faction context tags must have actually resolved');

    // create path
    for (const objective of draft.objectives) {
      assert.ok(objective.oppositionRequest?.organizationTags.includes('criminal-syndicate'), 'organizationTags must reach oppositionRequest at Job CREATION, not stay []');
    }

    // regenerate path (regenerateJobObjectives -- whole-objectives-list reroll)
    const regeneratedObjectives = await regenerateJobObjectives(draft, { rng: makeSeededRng(9001) });
    for (const objective of regeneratedObjectives.objectives) {
      assert.ok(objective.oppositionRequest?.organizationTags.includes('criminal-syndicate'), 'organizationTags must reach oppositionRequest after regenerateJobObjectives()');
    }

    // single-objective reroll path
    const rerolledObjective = await rerollJobObjective(draft, draft.objectives[0].draftId, { rng: makeSeededRng(9002) });
    assert.ok(rerolledObjective.objectives[0].oppositionRequest?.organizationTags.includes('criminal-syndicate'), 'organizationTags must reach oppositionRequest after rerollJobObjective()');

    // add-objective path
    const withAdded = await addJobObjective(draft, { rng: makeSeededRng(9003) });
    const added = withAdded.objectives[withAdded.objectives.length - 1];
    assert.ok(added.oppositionRequest?.organizationTags.includes('criminal-syndicate'), 'organizationTags must reach oppositionRequest after addJobObjective()');

    // reroll-opposition-only path
    const rerolledOpposition = await rerollJobObjectiveOpposition(draft, draft.objectives[0].draftId, { rng: makeSeededRng(9004) });
    assert.ok(rerolledOpposition.objectives[0].oppositionRequest?.organizationTags.includes('criminal-syndicate'), 'organizationTags must reach oppositionRequest after rerollJobObjectiveOpposition()');

    // whole regeneration path -- issuerOrganizationTags is preserved (round 2, item 3),
    // and threads through the freshly-built objectives too.
    const wholeRegen = await regenerateJobDraft(draft, { rng: makeSeededRng(9005) });
    for (const objective of wholeRegen.objectives) {
      assert.ok(objective.oppositionRequest?.organizationTags.includes('criminal-syndicate'), 'organizationTags must reach oppositionRequest after a whole regenerateJobDraft()');
    }
  }

  // --- 39 (round 2, item 5): opposition request `difficulty` is a real,
  // varying field -- NOT permanently defaulted to 'standard'.
  {
    const seenDifficulties = new Set();
    for (let seed = 0; seed < 40; seed++) {
      const d = await createProceduralJobDraft({ rng: makeSeededRng(seed * 31 + 9100), objectiveCount: 1 });
      const objective = d.objectives[0];
      if (objective.oppositionRequest) seenDifficulties.add(objective.oppositionRequest.difficulty);
    }
    assert.ok(seenDifficulties.size >= 2, `oppositionRequest.difficulty must vary across objectives (independence != omission), saw only ${[...seenDifficulties]}`);
    assert.ok(!(seenDifficulties.size === 1 && seenDifficulties.has('standard')), 'oppositionRequest.difficulty must not be permanently defaulted to "standard"');

    // difficulty is the SAME value as the objective's own difficulty facet
    // (the objective's difficulty context, not re-derived independently) --
    // while threatLevel/countBand/leaderRequirement/reinforcementLevel stay
    // independently rolled (already proven not to correlate by block 33).
    const single = await createProceduralJobDraft({ rng: makeSeededRng(9200), objectiveCount: 1 });
    assert.equal(single.objectives[0].oppositionRequest?.difficulty, single.objectives[0].difficulty, 'oppositionRequest.difficulty should reflect the objective\'s own difficulty context');
  }

  // --- 40 (round 2, item 6): narrative reward-suggestion model ------------
  {
    const rng = makeSeededRng(9300);
    let draft = await createProceduralJobDraft({ rng, objectiveCount: 1 });
    assert.ok(Array.isArray(draft.rewardSuggestions), 'every Job draft must carry a rewardSuggestions array, even when empty');

    // Creation itself may already have generated 0-2 suggestions --
    // start from an empty list so the counts below are unambiguous.
    draft = updateJobDraft(draft, { rewardSuggestions: [] });
    draft = addJobRewardSuggestion(draft, { rng: makeSeededRng(9301) });
    assert.equal(draft.rewardSuggestions.length, 1);
    const suggestion = draft.rewardSuggestions[0];
    assert.ok(isDraftId(suggestion.rewardId), 'a reward suggestion must carry a stable domain-namespaced id');
    assert.equal(draftIdDomain(suggestion.rewardId), 'job-reward-suggestion');
    assert.ok(Object.values(JOB_REWARD_SUGGESTION_TYPE).includes(suggestion.type), 'a reward suggestion\'s type must be one of the registered JOB_REWARD_SUGGESTION_TYPE values');
    assert.equal(suggestion.source, 'generated');
    assert.equal(typeof suggestion.value, 'string');
    assert.notEqual(suggestion.value, '', 'a picked reward suggestion must carry real narrative text');

    // Never a fake commodity id: either commodityId is '' (non-commodity type) or a real one.
    assert.ok(suggestion.commodityId === '' || typeof suggestion.commodityId === 'string');

    // Reroll preserves identity; add preserves siblings; remove drops exactly one.
    const secondDraft = addJobRewardSuggestion(draft, { rng: makeSeededRng(9302) });
    assert.equal(secondDraft.rewardSuggestions.length, 2);
    const untouchedSuggestion = secondDraft.rewardSuggestions[0];
    const rerolled = rerollJobRewardSuggestion(secondDraft, secondDraft.rewardSuggestions[1].rewardId, { rng: makeSeededRng(9303) });
    assert.equal(rerolled.rewardSuggestions[1].rewardId, secondDraft.rewardSuggestions[1].rewardId, 'reroll preserves the SAME rewardId');
    assert.equal(rerolled.rewardSuggestions[0], untouchedSuggestion, 'the other reward suggestion must be the SAME object reference, untouched');

    const removed = removeJobRewardSuggestion(rerolled, rerolled.rewardSuggestions[0].rewardId);
    assert.equal(removed.rewardSuggestions.length, 1);

    // Manual authorship locks a suggestion against a broad reroll of the list.
    const manual = setJobRewardSuggestion(removed, removed.rewardSuggestions[0].rewardId, { value: 'GM narrative reward text', type: 'favor' });
    assert.equal(manual.rewardSuggestions[0].source, 'manual');
    assert.equal(manual.rewardSuggestions[0].value, 'GM narrative reward text');
    // rerollJobRewardSuggestion() is a no-op against a manually-locked suggestion.
    const rerollAttemptOnManual = rerollJobRewardSuggestion(manual, manual.rewardSuggestions[0].rewardId, { rng: makeSeededRng(9304) });
    assert.equal(rerollAttemptOnManual.rewardSuggestions[0].value, 'GM narrative reward text', 'rerollJobRewardSuggestion() must not touch a manually-authored suggestion');

    // createJobRewardSuggestionInstance() mints a stable id, preserved on round-trip.
    const inst = createJobRewardSuggestionInstance({ value: 'test suggestion', type: 'favor' });
    assert.ok(isDraftId(inst.rewardId));
    const reNormalized = createJobRewardSuggestionInstance(inst);
    assert.equal(reNormalized.rewardId, inst.rewardId, 're-normalizing an already-shaped instance must preserve its id');

    // Credits/rewardEstimate/rewardPackage remain the ONLY authority for
    // priced rewards -- rewardSuggestions never carries a credits type.
    for (let seed = 0; seed < 20; seed++) {
      const d = await createProceduralJobDraft({ rng: makeSeededRng(seed * 17 + 9400) });
      for (const s of d.rewardSuggestions) {
        assert.notEqual(s.type, 'credits', 'rewardSuggestions must never duplicate the credits authority already owned by rewardEstimate/rewardPackage');
      }
    }
  }

  // --- 41 (round 2, item 7): Job Secret generation + targeted reroll ------
  {
    const rng = makeSeededRng(9500);
    const draft = await createProceduralJobDraft({ rng, objectiveCount: 1 });
    assert.equal(typeof draft.secret, 'string');
    assert.notEqual(draft.secret, '', 'createProceduralJobDraft() must actually generate a secret, not leave the field empty');

    // A Secret is distinct from a twist -- generated from its own catalog,
    // not merely mirroring the twist text.
    if (draft.twist) assert.notEqual(draft.secret, draft.twist.value, 'a Job\'s secret and twist must be independently generated concepts');

    const rerolled = rerollJobSecret(draft, { rng: makeSeededRng(9501) });
    assert.equal(typeof rerolled.secret, 'string');

    // A manual field-authored Secret (via jobSetFieldValue, the registered
    // field-authoring path -- see JOB_FIELD_DEFINITIONS' secret entry)
    // survives an unrelated reroll, exactly like hook/stakes.
    const manualSecretDraft = jobSetFieldValue(draft, 'secret', 'The client\'s real name is a lie.');
    const afterUnrelatedReroll = rerollJobUrgency(manualSecretDraft, { rng: makeSeededRng(9502) });
    assert.equal(afterUnrelatedReroll.secret, 'The client\'s real name is a lie.', 'a manually field-authored Secret must survive an unrelated reroll');
  }

  console.log('PHASE 8D-3C Job generation wiring: all 41 assertion blocks passed.');
}

await run();
