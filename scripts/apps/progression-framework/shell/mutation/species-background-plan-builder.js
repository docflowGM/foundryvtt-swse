/**
 * SpeciesBackgroundPlanBuilder
 *
 * Domain compiler for chargen species/background materialization.
 *
 * This module is side-effect free except for calling the existing canonical
 * materialization helpers. It returns mutation-plan fragments for the finalizer
 * to merge and apply through ActorEngine.
 */

import { applyCanonicalSpeciesToActor } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-species-to-actor.js';
import { applyCanonicalBackgroundsToActor } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-backgrounds-to-actor.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';

function resolveSpeciesPortrait(speciesSelection, pendingSpeciesContext = null) {
  const species = ProgressionContentAuthority.resolveSpecies(speciesSelection)
    || pendingSpeciesContext?.identity
    || speciesSelection
    || {};
  return species.img
    || species.image
    || species.portrait
    || species.system?.img
    || species.system?.image
    || null;
}

function actorNeedsPortrait(actor) {
  const img = String(actor?.img || '').toLowerCase();
  return !img || img.includes('mystery-man') || img.includes('icons/svg') || img.endsWith('/token.svg');
}

function backgroundIdentitySet(background) {
  const set = {};
  if (!background) return set;
  if (typeof background === 'string') {
    set['system.background'] = background;
    return set;
  }
  set['system.background'] = background.name || background.label || background.id || '';
  if (background.category === 'occupation' && background.name) set['system.profession'] = background.name;
  if (background.category === 'planet' && background.name) set['system.planetOfOrigin'] = background.name;
  if (background.category === 'event' && background.name) set['system.event'] = background.name;
  return set;
}

function mergeMaterializationMutations(targetSet, mutations = {}) {
  const itemsToCreate = [];
  const itemsToDelete = [];
  for (const [key, value] of Object.entries(mutations || {})) {
    if (key.startsWith('system.') || key.startsWith('flags.')) targetSet[key] = value;
  }
  if (Array.isArray(mutations.itemsToCreate) && mutations.itemsToCreate.length) itemsToCreate.push(...mutations.itemsToCreate);
  if (Array.isArray(mutations.itemsToDelete) && mutations.itemsToDelete.length) itemsToDelete.push(...mutations.itemsToDelete);
  return { itemsToCreate, itemsToDelete };
}

export class SpeciesBackgroundPlanBuilder {
  static resolveSpeciesPortrait(speciesSelection, pendingSpeciesContext = null) {
    return resolveSpeciesPortrait(speciesSelection, pendingSpeciesContext);
  }

  static actorNeedsPortrait(actor) {
    return actorNeedsPortrait(actor);
  }

  static async build({ actor, sessionState = {}, selections = {}, isDroidProgression = false, backgroundsEnabled = true } = {}) {
    const set = {};
    const add = { items: [] };
    const deletePlan = { items: [] };
    if (sessionState.mode !== 'chargen') return { set, add, delete: deletePlan };

    const species = selections.species || null;
    const pendingSpeciesContext = selections.pendingSpeciesContext || species?.pendingContext || null;
    const background = backgroundsEnabled ? (selections.background || null) : null;
    const pendingBackgroundContext = backgroundsEnabled ? (selections.pendingBackgroundContext || background?.pendingContext || null) : null;

    if (isDroidProgression) {
      set['system.species'] = '';
      set['system.race'] = '';
      set['flags.swse.progression.speciesSkippedForDroid'] = true;
    } else if (pendingSpeciesContext) {
      const materialization = await applyCanonicalSpeciesToActor(actor, pendingSpeciesContext);
      if (materialization.success) {
        const merged = mergeMaterializationMutations(set, materialization.mutations || {});
        for (const item of merged.itemsToCreate) {
          add.items.push({
            name: item.name,
            type: item.type,
            system: item.system,
            flags: item.flags,
            img: item.img,
          });
        }
        deletePlan.items.push(...merged.itemsToDelete);
      }
    } else if (species) {
      set['system.species'] = species;
      set['system.race'] = species;
    }

    if (pendingBackgroundContext) {
      const materialization = await applyCanonicalBackgroundsToActor(actor, pendingBackgroundContext);
      if (materialization.success) {
        mergeMaterializationMutations(set, materialization.mutations || {});
      }
    } else if (background) {
      Object.assign(set, backgroundIdentitySet(background));
    }

    const speciesPortrait = resolveSpeciesPortrait(species, pendingSpeciesContext);
    if (actorNeedsPortrait(actor) && speciesPortrait) set.img = speciesPortrait;

    return { set, add, delete: deletePlan };
  }
}
