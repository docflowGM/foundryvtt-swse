import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import { SkillsLanguagesPlanBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/skills-languages-plan-builder.js';

const PATCH_ID = 'progression-finalizer-skills-languages-plan-builder-v1';

function shouldCompileSkillsLanguages(sessionState = {}) {
  const selections = sessionState?.progressionSession?.draftSelections || {};
  return sessionState.mode === 'chargen'
    || (Array.isArray(selections.skills) && selections.skills.length > 0)
    || (Array.isArray(selections.languages) && selections.languages.length > 0)
    || (sessionState.mode === 'levelup' && Array.isArray(sessionState?.progressionSession?.classSkills) && sessionState.progressionSession.classSkills.length > 0);
}

function removeInlineSkillLanguageKeys(set = {}) {
  for (const key of Object.keys(set || {})) {
    if (key.startsWith('system.skills.')) delete set[key];
  }
  delete set['system.languages'];
  delete set['system.languageIds'];
  delete set['system.progression.classSkillSources'];
}

function levelUpManifestFromPlan(plan = {}) {
  return plan?.set?.['flags.swse.levelUpEntitlementManifest'] || null;
}

function assertNonEmptySingleStepSet(set = {}, domain) {
  if (Object.keys(set || {}).length > 0) return;
  if (domain === 'skills') throw new Error('Choose at least one skill before confirming.');
  if (domain === 'languages') throw new Error('Choose at least one language before confirming.');
}

export function registerSkillsLanguagesFinalizerPatch() {
  if (!ProgressionFinalizer || ProgressionFinalizer.__swseSkillsLanguagesPlanBuilderPatch === PATCH_ID) return;

  const originalCompileMutationPlan = ProgressionFinalizer._compileMutationPlan;
  if (typeof originalCompileMutationPlan === 'function') {
    ProgressionFinalizer._compileMutationPlan = async function compileMutationPlanWithSkillsLanguagesBuilder(sessionState, actor, options = {}) {
      const plan = await originalCompileMutationPlan.call(this, sessionState, actor, options);
      if (!plan?.set || !shouldCompileSkillsLanguages(sessionState)) return plan;

      const selections = sessionState?.progressionSession?.draftSelections || {};
      const builderSet = await SkillsLanguagesPlanBuilder.buildSet({
        actor,
        selections,
        sessionState,
        levelUpManifest: levelUpManifestFromPlan(plan),
      });
      removeInlineSkillLanguageKeys(plan.set);
      Object.assign(plan.set, builderSet);
      return plan;
    };
  }

  ProgressionFinalizer._compileSingleStepSkillSet = function compileSingleStepSkillSetWithBuilder(skills = []) {
    const set = SkillsLanguagesPlanBuilder.buildSkillsSet({
      actor: null,
      selections: { skills },
      sessionState: { mode: 'single-step' },
      levelUpManifest: null,
    });
    assertNonEmptySingleStepSet(set, 'skills');
    return set;
  };

  ProgressionFinalizer._compileSingleStepLanguageSet = function compileSingleStepLanguageSetWithBuilder(actor, languages = []) {
    const entries = Array.isArray(languages) ? languages : [];
    const languageNames = entries.map(l => typeof l === 'string' ? l : l?.name || l?.label || l?.language || l?.value || l?.id || l?._id || l?.internalId || l?.slug).filter(Boolean);
    const languageIds = entries.map(l => typeof l === 'string' ? l : l?.internalId || l?._id || l?.id || l?.slug || l?.name).filter(Boolean);
    const existingLanguageNames = SkillsLanguagesPlanBuilder.extractActorLanguageNames(actor);
    const existingLanguageIds = SkillsLanguagesPlanBuilder.extractActorLanguageIds(actor);
    const set = {
      'system.languages': Array.from(new Set([...existingLanguageNames, ...languageNames])),
      'system.languageIds': Array.from(new Set([...existingLanguageIds, ...languageIds])),
    };
    assertNonEmptySingleStepSet(entries.length ? set : {}, 'languages');
    return set;
  };

  ProgressionFinalizer._canonicalSkillKey = function canonicalSkillKeyViaBuilder(value) {
    return SkillsLanguagesPlanBuilder.canonicalSkillKey(value);
  };
  ProgressionFinalizer._normalizeSkillSelectionEntries = function normalizeSkillSelectionEntriesViaBuilder(skills) {
    return SkillsLanguagesPlanBuilder.normalizeSkillSelectionEntries(skills);
  };
  ProgressionFinalizer._extractSkillFocusKeysFromSelections = function extractSkillFocusKeysFromSelectionsViaBuilder(selections = {}) {
    return SkillsLanguagesPlanBuilder.extractSkillFocusKeysFromSelections(selections);
  };
  ProgressionFinalizer._extractActorLanguageNames = function extractActorLanguageNamesViaBuilder(actor) {
    return SkillsLanguagesPlanBuilder.extractActorLanguageNames(actor);
  };
  ProgressionFinalizer._extractActorLanguageIds = function extractActorLanguageIdsViaBuilder(actor) {
    return SkillsLanguagesPlanBuilder.extractActorLanguageIds(actor);
  };

  ProgressionFinalizer.__swseSkillsLanguagesPlanBuilderPatch = PATCH_ID;
}

registerSkillsLanguagesFinalizerPatch();

export default registerSkillsLanguagesFinalizerPatch;
