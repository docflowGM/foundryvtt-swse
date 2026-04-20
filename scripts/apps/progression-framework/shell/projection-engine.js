/**
 * ProjectionEngine
 */

import { swseLogger } from '../../../utils/logger.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';

export class ProjectionEngine {
  static async buildProjection(progressionSession, actor) {
    try {
      if (!progressionSession || !progressionSession.draftSelections) {
        swseLogger.warn('[ProjectionEngine] No draft selections available');
        return this._buildEmptyProjection();
      }

      await ProgressionContentAuthority.initialize();
      const draftSelections = progressionSession.draftSelections;

      const projection = {
        identity: await this._projectIdentity(draftSelections),
        attributes: this._projectAttributes(draftSelections, actor),
        skills: await this._projectSkills(draftSelections),
        abilities: this._projectAbilities(draftSelections),
        languages: await this._projectLanguages(draftSelections),
        droid: this._projectDroid(draftSelections),
        beast: this._projectBeast(draftSelections),
        nonheroic: this._projectNonheroic(draftSelections),
        derived: await this._projectDerived(draftSelections, progressionSession, actor),
      };

      projection.metadata = {
        projectedAt: Date.now(),
        fromSession: !!progressionSession,
        actorId: actor?.id || null,
        mode: progressionSession.mode || 'chargen',
      };

      const adapter = progressionSession.subtypeAdapter;
      const finalProjection = adapter ? await adapter.contributeProjection(projection, progressionSession, actor) : projection;

      swseLogger.debug('[ProjectionEngine] Projection built', {
        identity: finalProjection.identity,
        skillsCount: finalProjection.skills?.trained?.length || 0,
        featsCount: finalProjection.abilities?.feats?.length || 0,
        adapterContributed: !!adapter,
      });

      return finalProjection;
    } catch (err) {
      swseLogger.error('[ProjectionEngine] Error building projection:', err);
      return this._buildEmptyProjection();
    }
  }

  static async _projectIdentity(draftSelections) {
    const species = ProgressionContentAuthority.resolveSpecies(draftSelections.species);
    const classModel = ProgressionContentAuthority.resolveClass(draftSelections.class);
    const background = await ProgressionContentAuthority.resolveBackground(draftSelections.background);
    return {
      species: species?.name || draftSelections.species?.name || draftSelections.species?.id || null,
      class: classModel?.name || draftSelections.class?.name || draftSelections.class?.id || null,
      background: background?.name || draftSelections.background?.name || draftSelections.background?.id || null,
    };
  }

  static _projectAttributes(draftSelections, actor) {
    const attrSelection = draftSelections.attributes;
    const scores = {
      str: Number(attrSelection?.values?.str ?? actor?.system?.abilities?.str?.value ?? actor?.system?.attributes?.str?.value ?? 10),
      dex: Number(attrSelection?.values?.dex ?? actor?.system?.abilities?.dex?.value ?? actor?.system?.attributes?.dex?.value ?? 10),
      con: Number(attrSelection?.values?.con ?? actor?.system?.abilities?.con?.value ?? actor?.system?.attributes?.con?.value ?? 10),
      int: Number(attrSelection?.values?.int ?? actor?.system?.abilities?.int?.value ?? actor?.system?.attributes?.int?.value ?? 10),
      wis: Number(attrSelection?.values?.wis ?? actor?.system?.abilities?.wis?.value ?? actor?.system?.attributes?.wis?.value ?? 10),
      cha: Number(attrSelection?.values?.cha ?? actor?.system?.abilities?.cha?.value ?? actor?.system?.attributes?.cha?.value ?? 10),
    };

    const species = ProgressionContentAuthority.resolveSpecies(draftSelections.species);
    if (species?.abilityScores) {
      for (const [ability, mod] of Object.entries(species.abilityScores)) {
        if (ability in scores) scores[ability] += Number(mod || 0);
      }
    }

    const normalized = {};
    for (const [key, score] of Object.entries(scores)) {
      normalized[key] = { score, modifier: Math.floor((score - 10) / 2) };
    }
    return normalized;
  }

  static async _projectSkills(draftSelections) {
    const trained = ProgressionContentAuthority.normalizeSkillSelection(draftSelections.skills);
    const granted = await ProgressionContentAuthority.getGrantedSkillEntries({ classSelection: draftSelections.class, backgroundSelection: draftSelections.background });
    const grantedNormalized = granted.map((entry) => ({ id: entry.id || entry._id || entry.key || entry.name, key: entry.key || entry.id || entry.name, name: entry.name, ability: entry.ability || entry.system?.ability || null, source: 'grant' }));
    const total = {};
    for (const entry of [...trained, ...grantedNormalized]) {
      total[entry.key || entry.id || entry.name] = entry;
    }
    return { trained, granted: grantedNormalized, total };
  }

  static _projectAbilities(draftSelections) {
    return {
      feats: ProgressionContentAuthority.normalizeSelectionList('feat', draftSelections.feats),
      talents: ProgressionContentAuthority.normalizeSelectionList('talent', draftSelections.talents),
      forcePowers: ProgressionContentAuthority.normalizeSelectionList('forcePower', draftSelections.forcePowers),
      forceTechniques: ProgressionContentAuthority.normalizeSelectionList('forceTechnique', draftSelections.forceTechniques),
      forceSecrets: ProgressionContentAuthority.normalizeSelectionList('forceSecret', draftSelections.forceSecrets),
      starshipManeuvers: Array.isArray(draftSelections.starshipManeuvers) ? draftSelections.starshipManeuvers.map((m) => typeof m === 'string' ? { id: m, name: m, source: 'selection' } : { id: m.id || m.name, name: m.name || m.id, source: m.source || 'selection' }) : [],
    };
  }

  static async _projectLanguages(draftSelections) {
    const selected = await ProgressionContentAuthority.normalizeLanguageSelection(draftSelections.languages);
    const granted = await ProgressionContentAuthority.getGrantedLanguageEntries({ speciesSelection: draftSelections.species, backgroundSelection: draftSelections.background });
    const grantedNormalized = granted.map((entry) => ({ id: entry.id || entry._id || entry.internalId || entry.slug || entry.name, name: entry.name, source: 'grant' }));
    const deduped = new Map();
    for (const entry of [...grantedNormalized, ...selected]) {
      deduped.set(String(entry.name || entry.id).toLowerCase(), entry);
    }
    return Array.from(deduped.values());
  }

  static _projectDroid(draftSelections) {
    const droidSelection = draftSelections.droid;
    if (!droidSelection) return null;
    return {
      credits: droidSelection.droidCredits?.total || 0,
      remaining: droidSelection.droidCredits?.remaining || 0,
      systems: droidSelection.systems || [],
      buildState: droidSelection.buildState || {},
    };
  }

  static _projectBeast(draftSelections) {
    const beastSelection = draftSelections.beast;
    if (!beastSelection) return null;
    return { type: beastSelection.type || null, buildState: beastSelection.buildState || {} };
  }

  static _projectNonheroic(draftSelections) {
    const nonheroicSelection = draftSelections.nonheroic;
    if (!nonheroicSelection) return null;
    return { profession: nonheroicSelection.profession || null, buildState: nonheroicSelection.buildState || {} };
  }

  static async _projectDerived(draftSelections, session, actor) {
    const warnings = await this._computeProjectionWarnings(draftSelections, session);
    const grantedSkills = await ProgressionContentAuthority.getGrantedSkillEntries({ classSelection: draftSelections.class, backgroundSelection: draftSelections.background });
    const grantedLanguages = await ProgressionContentAuthority.getGrantedLanguageEntries({ speciesSelection: draftSelections.species, backgroundSelection: draftSelections.background });
    return {
      warnings,
      grants: {
        skills: grantedSkills.map((entry) => entry.name),
        languages: grantedLanguages.map((entry) => entry.name),
      },
      credits: ProgressionContentAuthority.getStartingCredits({ classSelection: draftSelections.class, backgroundSelection: draftSelections.background }),
      projectStatus: warnings.length === 0 ? 'complete' : 'incomplete',
    };
  }

  static async _computeProjectionWarnings(draftSelections, session) {
    const warnings = [];
    if (session.mode === 'chargen') {
      if (!draftSelections.species && !draftSelections.droid) warnings.push('Missing species selection');
      if (!draftSelections.class) warnings.push('Missing class selection');
      if (!draftSelections.attributes) warnings.push('Missing attribute assignment');
    }
    if (session.dirtyNodes && session.dirtyNodes.size > 0) warnings.push(`${session.dirtyNodes.size} node(s) require re-validation`);

    const background = draftSelections.background ? await ProgressionContentAuthority.resolveBackground(draftSelections.background) : null;
    if (draftSelections.background && !background) warnings.push('Selected background could not be resolved from BackgroundRegistry');
    return warnings;
  }

  static _buildEmptyProjection() {
    return {
      identity: { species: null, class: null, background: null },
      attributes: {
        str: { score: 10, modifier: 0 },
        dex: { score: 10, modifier: 0 },
        con: { score: 10, modifier: 0 },
        int: { score: 10, modifier: 0 },
        wis: { score: 10, modifier: 0 },
        cha: { score: 10, modifier: 0 },
      },
      skills: { trained: [], granted: [], total: {} },
      abilities: { feats: [], talents: [], forcePowers: [], forceTechniques: [], forceSecrets: [], starshipManeuvers: [] },
      languages: [],
      droid: null,
      derived: { warnings: ['No selections yet'], grants: {}, projectStatus: 'incomplete' },
      metadata: { projectedAt: Date.now(), fromSession: false, actorId: null, mode: 'chargen' },
    };
  }
}
