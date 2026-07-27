/**
 * FollowerSpeciesStep
 *
 * Thin adapter over the mature SpeciesStep. Living followers use the exact
 * same species browser/details rail as normal chargen.
 *
 * PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step: this
 * step used to also carry a second, hand-rolled droid-chassis
 * configuration branch (hardcoded system ids disconnected from the real
 * droid-part catalog), reachable independently of the real, canonical
 * `FollowerDroidBuilderStep` ("Droid Chassis") whenever rail back-navigation
 * bypassed `FollowerShell._shouldSkipFollowerStep()` — see
 * docs/audits/follower-droid-chassis-step-consolidation-phase-6.md. That
 * branch is removed entirely, not merely hidden: FollowerShell now keeps
 * this step out of `this.steps` altogether for droid followers (see
 * FollowerShell#_recomputeFollowerSteps), so it is organic-species-only,
 * unconditionally.
 */

import { SpeciesStep } from '../species-step.js';

export class FollowerSpeciesStep extends SpeciesStep {
  async onStepEnter(shell) {
    await super.onStepEnter(shell);
    this._allSpecies = (this._allSpecies || []).filter(species => !this._isDroidSpeciesRecord(species));
    this._applyFilters?.();

    const draft = shell?.progressionSession?.draftSelections || {};
    const species = draft.species || null;
    if (species?.id || species?.name) {
      this._committedSpeciesId = species.id || species.speciesId || species.name;
      this._committedSpeciesName = species.name || species.speciesName || species.id;
      this._saveFollowerChoice(shell, 'speciesName', this._committedSpeciesName);
      this._saveFollowerChoice(shell, 'speciesId', this._committedSpeciesId);
    }
  }

  async onItemCommitted(id, shell) {
    await super.onItemCommitted(id, shell);
    const draftSpecies = shell?.progressionSession?.draftSelections?.species || null;
    if (draftSpecies) {
      this._saveFollowerChoice(shell, 'speciesName', draftSpecies.name || draftSpecies.speciesName || id);
      this._saveFollowerChoice(shell, 'speciesId', draftSpecies.id || draftSpecies.speciesId || id);
      this._saveFollowerChoice(shell, 'speciesSelection', draftSpecies);
      this._saveFollowerChoice(shell, 'droidConfig', null);
    }
  }

  _saveFollowerChoice(shell, choiceType, value) {
    if (!shell?.progressionSession) return;
    shell.progressionSession.draftSelections = shell.progressionSession.draftSelections || {};
    shell.progressionSession.draftSelections[choiceType] = value;
    shell.progressionSession.lastModifiedAt = Date.now();
  }

  _isDroidSpeciesRecord(species) {
    const name = String(species?.name || '').toLowerCase();
    const system = species?.system || species || {};
    return name === 'droid'
      || name.includes('droid')
      || system.speciesActsAsDroid === true
      || system.noConstitution === true
      || !!system.droidBuilder
      || (Array.isArray(system.tags) && system.tags.some(tag => String(tag).toLowerCase().includes('droid')));
  }
}
