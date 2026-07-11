import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import { SpeciesBackgroundPlanBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mutation/species-background-plan-builder.js';
import { ChargenRules } from '/systems/foundryvtt-swse/scripts/engine/chargen/ChargenRules.js';
import { isDroidProgressionActor } from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-progression-guards.js';

const PATCH_ID = 'progression-finalizer-species-background-plan-builder-v1';

const SPECIES_BACKGROUND_SET_KEYS = new Set([
  'system.species',
  'system.race',
  'system.background',
  'system.profession',
  'system.planetOfOrigin',
  'system.event',
  'flags.swse.progression.speciesSkippedForDroid',
  'img',
]);

function shouldCompile(sessionState = {}) {
  return sessionState.mode === 'chargen';
}

function removeInlineSpeciesBackgroundSetKeys(set = {}) {
  for (const key of Object.keys(set || {})) {
    if (SPECIES_BACKGROUND_SET_KEYS.has(key)) delete set[key];
  }
}

function removeMatchingNaturalWeaponItems(plan = {}, builderItems = []) {
  if (!builderItems.length || !Array.isArray(plan?.add?.items)) return;
  const builderKeys = new Set(builderItems.map(item => `${String(item?.type || '').toLowerCase()}::${String(item?.name || '').toLowerCase()}`));
  plan.add.items = plan.add.items.filter((item) => {
    const key = `${String(item?.type || '').toLowerCase()}::${String(item?.name || '').toLowerCase()}`;
    const speciesGranted = item?.flags?.swse?.speciesGranted === true
      || item?.flags?.swse?.progression?.selectionKey === 'species-auto-grants'
      || item?.flags?.swse?.progression?.source === 'species';
    return !(builderKeys.has(key) && speciesGranted);
  });
}

function mergeDeleteItems(plan = {}, builderDelete = {}) {
  const existing = Array.isArray(plan?.delete?.items) ? plan.delete.items : [];
  const incoming = Array.isArray(builderDelete?.items) ? builderDelete.items : [];
  const seen = new Set(existing.map(value => String(value)));
  const merged = [...existing];
  for (const item of incoming) {
    const key = String(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  if (!plan.delete) plan.delete = {};
  if (merged.length) plan.delete.items = merged;
}

export function registerSpeciesBackgroundFinalizerPatch() {
  if (!ProgressionFinalizer || ProgressionFinalizer.__swseSpeciesBackgroundPlanBuilderPatch === PATCH_ID) return;

  const originalCompileMutationPlan = ProgressionFinalizer._compileMutationPlan;
  if (typeof originalCompileMutationPlan === 'function') {
    ProgressionFinalizer._compileMutationPlan = async function compileMutationPlanWithSpeciesBackgroundBuilder(sessionState, actor, options = {}) {
      const plan = await originalCompileMutationPlan.call(this, sessionState, actor, options);
      if (!plan?.set || !shouldCompile(sessionState)) return plan;

      const selections = sessionState?.progressionSession?.draftSelections || {};
      const backgroundsEnabled = sessionState.mode !== 'chargen' || ChargenRules.backgroundsEnabled();
      const isDroidProgression = isDroidProgressionActor(actor, {
        subtype: sessionState.progressionSession?.subtype,
        droidContext: sessionState.progressionSession?.droidContext,
        droid: selections.droid,
      });
      const fragment = await SpeciesBackgroundPlanBuilder.build({
        actor,
        sessionState,
        selections,
        isDroidProgression,
        backgroundsEnabled,
      });

      removeInlineSpeciesBackgroundSetKeys(plan.set);
      Object.assign(plan.set, fragment.set || {});
      removeMatchingNaturalWeaponItems(plan, fragment.add?.items || []);
      if (Array.isArray(fragment.add?.items) && fragment.add.items.length) {
        plan.add = plan.add || { items: [] };
        plan.add.items = [...fragment.add.items, ...(Array.isArray(plan.add.items) ? plan.add.items : [])];
      }
      mergeDeleteItems(plan, fragment.delete || {});
      return plan;
    };
  }

  ProgressionFinalizer._resolveSpeciesPortrait = function resolveSpeciesPortraitViaBuilder(speciesSelection, pendingSpeciesContext = null) {
    return SpeciesBackgroundPlanBuilder.resolveSpeciesPortrait(speciesSelection, pendingSpeciesContext);
  };
  ProgressionFinalizer._actorNeedsPortrait = function actorNeedsPortraitViaBuilder(actor) {
    return SpeciesBackgroundPlanBuilder.actorNeedsPortrait(actor);
  };

  ProgressionFinalizer.__swseSpeciesBackgroundPlanBuilderPatch = PATCH_ID;
}

registerSpeciesBackgroundFinalizerPatch();

export default registerSpeciesBackgroundFinalizerPatch;
