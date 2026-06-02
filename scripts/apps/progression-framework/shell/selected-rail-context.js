/**
 * SelectedRailContext
 *
 * Canonical context builder for the left-side selected rail (build snapshot panel).
 *
 * Purpose:
 * - Isolate all source-resolution logic for selected rail data
 * - Provide normalized, projection-backed snapshot of in-progress build state
 * - Support path-aware, step-aware, and refresh-aware rendering
 * - Ensure left rail reads from authoritative progression state, not stale actor data
 *
 * Architecture:
 * - Sources data from: ProjectionEngine, progressionSession.draftSelections, actor immutables
 * - Never reads mutable build fields directly from actor.system
 * - Returns normalized snapshot context ready for template rendering
 * - Responsible for path-specific composition (chargen/levelup/beast/nonheroic/follower/droid)
 *
 * Usage:
 *   const context = SelectedRailContext.buildSnapshot(shell, currentStepId);
 *   // → { actorIdentity, pathType, currentStepId, snapshotSections: [...] }
 */

import { ProjectionEngine } from './projection-engine.js';
import { swseLogger } from '../../../utils/logger.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';
import { buildClassSkillKeySet, buildSkillDisplay, getSkillLabel, normalizeSkillKey } from '../utils/skill-display.js';

export class SelectedRailContext {
  /**
   * Build the canonical snapshot context for the selected rail.
   * ASYNC: Awaits projection build to include subtype adapter contributions.
   *
   * @param {ProgressionShell} shell - The progression shell
   * @param {string} currentStepId - Current step identifier
   * @returns {Promise<Object>} Normalized snapshot context
   */
  static async buildSnapshot(shell, currentStepId) {
    try {
      if (!shell || !shell.actor || !shell.progressionSession) {
        return this._buildEmptySnapshot();
      }

      const actor = shell.actor;
      const session = shell.progressionSession;
      const mode = shell.mode; // 'chargen' | 'levelup'
      const subtype = session.subtype ?? this._detectSubtype(actor, session);

      // Build projection (authoritative in-progress state)
      // Always rebuild to ensure freshness after selections change
      // FIXED: Now properly awaits async projection build
      const projection = await ProjectionEngine.buildProjection(session, actor);

      // Cache for next render
      session.currentProjection = projection;

      if (!projection) {
        return this._buildEmptySnapshot();
      }

      // Actor identity with chargen-friendly portrait fallback. If the player has not
      // chosen a custom image yet, show the selected species image in the rail.
      const actorIdentity = {
        name: actor.name ?? 'Unnamed',
        portrait: this._resolveActorPortrait(actor, session, projection),
      };

      // Path/mode awareness
      const pathType = this._determinePathType(mode, subtype);

      // Build snapshot sections based on path and current step
      const snapshotSections = this._buildSnapshotSections(
        projection,
        session,
        pathType,
        currentStepId,
        actor
      );

      return {
        actorIdentity,
        pathType,
        mode,
        subtype,
        currentStepId,
        snapshotSections,
        projection,
        metadata: {
          builtAt: Date.now(),
          isProjectionBacked: true,
        },
      };
    } catch (err) {
      swseLogger.error('[SelectedRailContext] Error building snapshot:', err);
      return this._buildEmptySnapshot();
    }
  }

  /**
   * Determine path type from mode and subtype.
   * @private
   */
  static _determinePathType(mode, subtype) {
    if (mode === 'levelup') return `levelup-${subtype}`;
    return `chargen-${subtype}`;
  }

  /**
   * Detect subtype if not already set.
   * @private
   */
  static _detectSubtype(actor, session) {
    // If session already has subtype, use it
    if (session.subtype) return session.subtype;

    // Check for droid
    if (actor.flags?.swse?.droidData || session.droidContext?.isDroid) {
      return 'droid';
    }

    // Check for beast
    if (actor.flags?.swse?.beastData || session.beastContext?.isBeast) {
      return 'beast';
    }

    // Check for nonheroic
    const hasNonheroicClass = actor.items?.some(
      item => item.type === 'class' && item.system?.isNonheroic === true
    );
    if (hasNonheroicClass) {
      return 'nonheroic';
    }

    // Check for follower
    if (session.followerContext?.isFollower) {
      return 'follower';
    }

    return 'actor'; // Standard character
  }

  static _resolveActorPortrait(actor, session, projection) {
    const actorImg = String(actor?.img || '').trim();
    if (actorImg && !this._isDefaultPortrait(actorImg)) return actorImg;

    const speciesSelection = session?.draftSelections?.species || projection?.identity?.species;
    const species = ProgressionContentAuthority.resolveSpecies(speciesSelection) || speciesSelection || {};
    return species.img
      || species.image
      || species.portrait
      || species.system?.img
      || species.system?.image
      || actorImg
      || null;
  }

  static _isDefaultPortrait(imgPath) {
    const normalized = String(imgPath || '').toLowerCase();
    return !normalized
      || normalized.includes('mystery-man')
      || normalized.includes('icons/svg')
      || normalized.endsWith('/token.svg');
  }

  /**
   * Build snapshot sections based on path type and current step.
   * @private
   */
  static _buildSnapshotSections(projection, session, pathType, currentStepId, actor) {
    const sections = [];

    // Always include identity (species, class, background)
    sections.push(this._buildIdentitySection(projection, currentStepId));

    // Include attributes for chargen; optional for levelup
    if (pathType.includes('chargen')) {
      sections.push(this._buildAttributesSection(projection, currentStepId));
    }

    const classSkillSection = this._buildClassSkillsSection(projection, session, currentStepId);
    if (classSkillSection) sections.push(classSkillSection);

    // Always include skills
    sections.push(this._buildSkillsSection(projection, currentStepId));

    // Always include feats
    sections.push(this._buildFeatsSection(projection, currentStepId));

    // Always include talents
    sections.push(this._buildTalentsSection(projection, currentStepId));

    // Always include languages
    sections.push(this._buildLanguagesSection(projection, currentStepId));

    // Credits: include only for chargen, not levelup
    if (pathType.includes('chargen')) {
      const creditsSection = this._buildCreditsSection(projection, currentStepId);
      if (creditsSection) {
        sections.push(creditsSection);
      }
    }

    // Path-specific sections
    if (pathType.includes('droid')) {
      const droidSection = this._buildDroidSection(projection, session, currentStepId);
      if (droidSection) sections.push(droidSection);
    }

    if (pathType.includes('beast')) {
      sections.push(this._buildBeastSection(projection, currentStepId));
    }

    if (pathType.includes('nonheroic')) {
      sections.push(this._buildNonheroicSection(projection, currentStepId));
    }

    if (pathType.includes('follower')) {
      const followerSection = this._buildFollowerSection(projection, session, currentStepId);
      if (followerSection) sections.unshift(followerSection);
    }

    // Filter out empty sections and return
    return sections.filter(s => s && s.items && s.items.length > 0);
  }


  static _buildFollowerSection(projection, session, currentStepId) {
    const draft = session?.draftSelections || {};
    const items = [];
    const add = (label, value, stepId = null) => {
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return;
      items.push({
        label,
        value: Array.isArray(value) ? value.join(', ') : String(value),
        isCurrent: stepId ? currentStepId === stepId : false,
      });
    };

    add('Kind', draft.followerKind ? String(draft.followerKind).charAt(0).toUpperCase() + String(draft.followerKind).slice(1) : null, 'follower-origin');
    add('Species', draft.speciesName || draft.species?.name, 'species');
    add('Template', draft.templateType ? String(draft.templateType).charAt(0).toUpperCase() + String(draft.templateType).slice(1) : null, 'follower-template');
    add('Template Ability', draft.abilityChoice ? `+2 ${String(draft.abilityChoice).toUpperCase()}` : null, 'follower-template');
    add('Droid Ability', draft.droidConfig?.abilityChoice ? `+2 ${String(draft.droidConfig.abilityChoice).toUpperCase()}` : null, 'follower-template');
    add('Background', draft.backgroundChoice || draft.background?.name || draft.background?.id, 'background');
    add('Skills', draft.skillChoices || draft.followerSkills, 'skills');
    add('Languages', draft.languageChoices || draft.followerLanguages, 'languages');
    add('Credits', draft.startingCredits !== undefined && draft.startingCredits !== null ? `${draft.startingCredits} cr` : null, 'summary');

    return items.length ? {
      id: 'follower-build',
      label: 'Follower Build',
      items,
      isCurrent: ['follower-origin', 'species', 'follower-template', 'background', 'skills', 'languages', 'summary'].includes(currentStepId),
    } : null;
  }

  /**
   * Build identity section (species, class, background).
   * @private
   */
  static _buildIdentitySection(projection, currentStepId) {
    const items = [];

    if (projection.identity?.species) {
      items.push({
        label: 'Species',
        value: this._cleanIdentityValue(projection.identity.species),
        isCurrent: currentStepId === 'species',
      });
    }

    if (projection.identity?.class) {
      items.push({
        label: 'Class',
        value: this._cleanIdentityValue(projection.identity.class),
        isCurrent: currentStepId === 'class',
      });
    }

    if (projection.identity?.background) {
      items.push({
        label: 'Background',
        value: this._cleanIdentityValue(projection.identity.background),
        isCurrent: currentStepId === 'background',
      });
    }

    return items.length > 0
      ? {
          id: 'identity',
          label: 'Identity',
          items,
        }
      : null;
  }

  /**
   * Build attributes section (compact summary).
   * @private
   */
  static _buildAttributesSection(projection, currentStepId) {
    if (!projection.attributes) return null;

    const attrs = projection.attributes;
    const items = [];

    // Show compact: STR 14, DEX 12, CON 13, INT 10, WIS 15, CHA 11
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const abilityLabels = {
      str: 'STR',
      dex: 'DEX',
      con: 'CON',
      int: 'INT',
      wis: 'WIS',
      cha: 'CHA',
    };

    abilityKeys.forEach(key => {
      if (attrs[key]?.score !== undefined) {
        items.push({
          label: abilityLabels[key],
          ability: key,
          abilityClass: `swse-ability-label swse-ability-label--${key}`,
          value: attrs[key].score,
          modifier: Number(attrs[key].modifier || 0),
          modifierDisplay: `${Number(attrs[key].modifier || 0) >= 0 ? '+' : ''}${Number(attrs[key].modifier || 0)}`,
          hasModifier: true,
          isCurrentFocus: currentStepId === 'attribute',
        });
      }
    });

    return items.length > 0
      ? {
          id: 'attributes',
          label: 'Attributes',
          items,
          isCompact: true, // render in compact grid, not rows
        }
      : null;
  }


  static _buildClassSkillsSection(projection, session, currentStepId) {
    const draft = session?.draftSelections || {};
    const classSkillValues = [];

    const addAll = (values) => {
      if (!Array.isArray(values)) return;
      for (const value of values) {
        if (value) classSkillValues.push(value);
      }
    };

    addAll(ProgressionContentAuthority.getClassSkillNames(draft.class));
    addAll(draft.pendingBackgroundContext?.classSkills);
    addAll(draft.pendingBackgroundContext?.ledger?.classSkills?.granted);
    addAll(draft.pendingSpeciesContext?.classSkills);
    addAll(draft.pendingSpeciesContext?.ledger?.classSkills?.granted);
    addAll(draft.species?.classSkills);
    addAll(draft.species?.system?.classSkills);

    if (this._hasForceSensitivity(draft, projection)) classSkillValues.push('Use the Force');

    const classSkillKeys = buildClassSkillKeySet(classSkillValues);
    if (!classSkillKeys.size) return null;

    const trainedKeys = this._collectTrainedSkillKeys(projection, draft);
    const focusedKeys = this._collectFocusedSkillKeys(draft, projection);
    const items = Array.from(classSkillKeys)
      .map((key) => {
        const display = buildSkillDisplay(key);
        const label = display.label || getSkillLabel(key) || key;
        if (!label) return null;
        const isFocused = focusedKeys.has(display.key);
        const isTrained = trainedKeys.has(display.key) || isFocused;
        return {
          label: 'Class Skill',
          value: isFocused ? 'F' : isTrained ? 'T' : 'CS',
          skillLabel: label,
          skillAbility: display.ability,
          skillAbilityLabel: display.abilityLabel,
          skillAbilityClass: display.abilityClass,
          skillLedger: true,
          skillMarker: isFocused ? 'F' : isTrained ? 'T' : '',
          skillStatusTitle: isFocused ? `${label}: focused` : isTrained ? `${label}: trained` : `${label}: class skill`,
          isCurrent: currentStepId === 'skills' || currentStepId === 'background' || currentStepId === 'species' || currentStepId === 'general-feat',
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(a.skillLabel || a.label).localeCompare(String(b.skillLabel || b.label)));

    return items.length ? {
      id: 'class-skills-ledger',
      label: `Class Skills (${items.length})`,
      items,
      isCurrent: currentStepId === 'skills',
    } : null;
  }

  static _collectTrainedSkillKeys(projection, draft) {
    const values = [];
    const add = (entry) => {
      const key = normalizeSkillKey(entry);
      if (key) values.push(key);
    };
    (projection?.skills?.trained || []).forEach(add);
    const skills = draft?.skills;
    if (Array.isArray(skills)) skills.forEach(add);
    if (Array.isArray(skills?.trained)) skills.trained.forEach(add);
    if (skills && typeof skills === 'object' && !Array.isArray(skills)) {
      for (const [key, value] of Object.entries(skills)) {
        if (value?.trained === true) add(value.key || value.name || key);
      }
    }
    return new Set(values);
  }

  static _collectFocusedSkillKeys(draft, projection) {
    const focused = new Set();
    const inspect = (entry) => {
      if (!entry || typeof entry !== 'object') return;
      const name = String(entry.name || entry.label || entry.id || '').toLowerCase();
      const isSkillFocus = name.includes('skill focus') || String(entry.featName || '').toLowerCase().includes('skill focus');
      const candidates = [
        entry.skill,
        entry.skillKey,
        entry.targetSkill,
        entry.selectedSkill,
        entry.choice,
        entry.selectedChoice,
        entry.choiceValue,
        entry.selection,
        entry.system?.selectedSkill,
        entry.system?.choice,
        entry.system?.selectedChoice,
      ];
      if (isSkillFocus) {
        for (const candidate of candidates) {
          const key = normalizeSkillKey(candidate);
          if (key) focused.add(key);
        }
      }
      for (const value of Object.values(entry)) {
        if (value && typeof value === 'object') inspect(value);
      }
    };
    [draft?.feats, draft?.generalFeat, draft?.classFeat, projection?.abilities?.feats].forEach((list) => {
      if (Array.isArray(list)) list.forEach(inspect);
      else inspect(list);
    });
    return focused;
  }

  static _hasForceSensitivity(draft, projection) {
    const haystack = [];
    const collect = (value) => {
      if (!value) return;
      if (typeof value === 'string') haystack.push(value);
      else if (typeof value === 'object') {
        haystack.push(value.name, value.label, value.id, value.featName);
        Object.values(value).forEach(collect);
      }
    };
    [draft?.feats, draft?.class, draft?.generalFeat, projection?.abilities?.feats].forEach(collect);
    return haystack.some((value) => String(value || '').toLowerCase().includes('force sensitivity'));
  }

  /**
   * Build skills section (trained skills only).
   * @private
   */
  static _buildSkillsSection(projection, currentStepId) {
    if (!projection.skills?.trained || projection.skills.trained.length === 0) {
      return null;
    }

    return {
      id: 'skills',
      label: `Skills (${projection.skills.trained.length})`,
      items: projection.skills.trained.map(skill => {
        const display = buildSkillDisplay(skill);
        return {
          label: 'Trained',
          value: display.label || this._formatSkillSummaryValue(skill),
          skillLabel: display.label || this._formatSkillSummaryValue(skill),
          skillAbility: display.ability,
          skillAbilityLabel: display.abilityLabel,
          skillAbilityClass: display.abilityClass,
          isCurrent: currentStepId === 'skills',
        };
      }),
      isCurrent: currentStepId === 'skills',
    };
  }

  /**
   * Build feats section with concrete feat names.
   * @private
   */
  static _buildFeatsSection(projection, currentStepId) {
    if (!projection.abilities?.feats || projection.abilities.feats.length === 0) {
      return null;
    }

    const featList = projection.abilities.feats;
    const items = featList
      .map(feat => {
        const label = this._getFeatSourceLabel(feat);
        const value = this._formatFeatSummaryValue(feat);
        if (!value) return null;
        return {
          label,
          value,
          isCurrent: label === 'Class' ? currentStepId === 'class-feat' : currentStepId === 'general-feat',
        };
      })
      .filter(Boolean);

    return items.length > 0
      ? {
          id: 'feats',
          label: `Feats (${featList.length})`,
          items,
          isCurrent: currentStepId === 'general-feat' || currentStepId === 'class-feat',
        }
      : null;
  }

  static _formatFeatSummaryValue(feat) {
    if (typeof feat === 'string') return feat.trim();
    const value = feat?.displayName
      || feat?.name
      || feat?.label
      || feat?.featName
      || feat?.system?.name
      || feat?.system?.title
      || feat?.id
      || feat?.slug
      || '';
    const text = String(value || '').trim();
    return text && text !== '[object Object]' ? text : '';
  }

  static _getFeatSourceLabel(feat) {
    const source = String(feat?.slotType || feat?.sourceType || feat?.system?.sourceType || feat?.source || '').toLowerCase();
    if (feat?.isClassSpecific || source.includes('class') || source.includes('multiclass')) return 'Class';
    if (source.includes('grant') || source.includes('species')) return 'Granted';
    return 'General';
  }

  /**
   * Build talents section (count).
   * @private
   */
  static _buildTalentsSection(projection, currentStepId) {
    if (!projection.abilities?.talents || projection.abilities.talents.length === 0) {
      return null;
    }

    const talentList = projection.abilities.talents;

    return {
      id: 'talents',
      label: `Talents (${talentList.length})`,
      items: [
        {
          label: 'Selected',
          value: `${talentList.length}`,
          isCurrent: currentStepId === 'general-talent' || currentStepId === 'class-talent',
        },
      ],
      isCurrent: currentStepId === 'general-talent' || currentStepId === 'class-talent',
    };
  }

  /**
   * Build languages section (count and list).
   * Handles both string and { id, name } object formats from projection.
   * @private
   */
  static _buildLanguagesSection(projection, currentStepId) {
    if (!projection.languages || projection.languages.length === 0) {
      return null;
    }

    return {
      id: 'languages',
      label: `Languages (${projection.languages.length})`,
      items: projection.languages.map(lang => ({
        // Extract name from object or use string directly
        label: typeof lang === 'string' ? lang : (lang.name || lang.id || lang),
        isCurrent: currentStepId === 'languages',
      })),
      isCurrent: currentStepId === 'languages',
    };
  }

  /**
   * Build credits section (only if chargen and credits exist).
   * @private
   */
  static _buildCreditsSection(projection, currentStepId) {
    if (projection.derived?.credits === undefined || projection.derived.credits === null) {
      return null;
    }

    return {
      id: 'credits',
      label: 'Credits',
      items: [
        {
          label: 'Available',
          value: `${projection.derived.credits}`,
        },
      ],
    };
  }

  /**
   * Build droid-specific section.
   * @private
   */
  static _buildDroidSection(projection, session, currentStepId) {
    const draftDroid = session?.draftSelections?.droid || null;
    const droid = projection?.droid || null;
    const systems = draftDroid?.droidSystems || droid?.droidSystems || null;
    const items = [];

    const add = (label, value) => {
      if (value === undefined || value === null || value === '') return;
      items.push({
        label,
        value: String(value),
        isCurrent: currentStepId === 'droid-builder' || currentStepId === 'final-droid-configuration',
      });
    };

    add('Degree', draftDroid?.droidDegree || droid?.degree);
    add('Size', draftDroid?.droidSize || droid?.size);
    add('Locomotion', systems?.locomotion?.name || systems?.locomotion?.id);
    add('Processor', systems?.processor?.name || systems?.processor?.id);

    (systems?.appendages || []).forEach((system, index) => add(`Appendage ${index + 1}`, system?.name || system?.id));
    (systems?.accessories || []).forEach((system, index) => add(`Accessory ${index + 1}`, system?.name || system?.id));
    (systems?.locomotionEnhancements || []).forEach((system, index) => add(`Locomotion Mod ${index + 1}`, system?.name || system?.id));
    (systems?.appendageEnhancements || []).forEach((system, index) => add(`Appendage Mod ${index + 1}`, system?.name || system?.id));

    if (!items.length && Array.isArray(droid?.systems)) {
      droid.systems.forEach((system, index) => add(`System ${index + 1}`, system?.name || system?.id || system));
    }

    return items.length > 0
      ? {
          id: 'droid',
          label: 'Droid Build',
          items,
          isCurrent: currentStepId === 'droid-builder' || currentStepId === 'final-droid-configuration',
        }
      : null;
  }

  /**
   * Build beast-specific section.
   * @private
   */
  static _buildBeastSection(projection, currentStepId) {
    if (!projection.beast) return null;

    const items = [];

    if (projection.beast.type) {
      items.push({
        label: 'Type',
        value: projection.beast.type,
      });
    }

    return items.length > 0
      ? {
          id: 'beast',
          label: 'Beast Profile',
          items,
        }
      : null;
  }

  /**
   * Build nonheroic-specific section.
   * @private
   */
  static _buildNonheroicSection(projection, currentStepId) {
    if (!projection.nonheroic) return null;

    const items = [];

    if (projection.nonheroic.profession) {
      items.push({
        label: 'Profession',
        value: projection.nonheroic.profession,
      });
    }

    return items.length > 0
      ? {
          id: 'nonheroic',
          label: 'Profession',
          items,
        }
      : null;
  }


  /**
   * Normalize identity values so the summary rail always renders stable text.
   * @private
   */
  static _cleanIdentityValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    if (typeof value === 'object') {
      const candidate = value.displayName || value.name || value.label || value.title || value.id;
      if (candidate !== null && candidate !== undefined) return String(candidate).trim();
    }
    return String(value).trim();
  }

  /**
   * Normalize skill values for compact left-rail display.
   * @private
   */
  static _formatSkillSummaryValue(skill) {
    const coerce = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') {
        return coerce(value.displayName || value.name || value.label || value.title || value.key || value.slug || value.id || value._id || value.skill);
      }
      const text = String(value).trim();
      return text && text !== '[object Object]' ? text : '';
    };
    return coerce(skill);
  }

  /**
   * Build empty snapshot (fallback).
   * @private
   */
  static _buildEmptySnapshot() {
    return {
      actorIdentity: {
        name: 'Unknown',
        portrait: null,
      },
      pathType: 'chargen-actor',
      mode: 'chargen',
      subtype: 'actor',
      currentStepId: null,
      snapshotSections: [],
      metadata: {
        builtAt: Date.now(),
        isEmpty: true,
      },
    };
  }
}
