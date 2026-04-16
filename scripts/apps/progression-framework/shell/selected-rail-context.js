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

      // Actor immutables (never change during progression)
      const actorIdentity = {
        name: actor.name ?? 'Unnamed',
        portrait: actor.img ?? null,
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
      sections.push(this._buildDroidSection(projection, currentStepId));
    }

    if (pathType.includes('beast')) {
      sections.push(this._buildBeastSection(projection, currentStepId));
    }

    if (pathType.includes('nonheroic')) {
      sections.push(this._buildNonheroicSection(projection, currentStepId));
    }

    // Filter out empty sections and return
    return sections.filter(s => s && s.items && s.items.length > 0);
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
          value: attrs[key].score,
          modifier: attrs[key].modifier,
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
      items: projection.skills.trained.map(skill => ({
        label: 'Trained',
        value: this._formatSkillSummaryValue(skill),
        isCurrent: currentStepId === 'skills',
      })),
      isCurrent: currentStepId === 'skills',
    };
  }

  /**
   * Build feats section (count and category breakdown).
   * @private
   */
  static _buildFeatsSection(projection, currentStepId) {
    if (!projection.abilities?.feats || projection.abilities.feats.length === 0) {
      return null;
    }

    const featList = projection.abilities.feats;
    const generalFeats = featList.filter(f => !f.isClassSpecific).length;
    const classFeats = featList.filter(f => f.isClassSpecific).length;

    const items = [];
    if (generalFeats > 0) {
      items.push({
        label: 'General',
        value: `${generalFeats}`,
        isCurrent: currentStepId === 'general-feat',
      });
    }
    if (classFeats > 0) {
      items.push({
        label: 'Class',
        value: `${classFeats}`,
        isCurrent: currentStepId === 'class-feat',
      });
    }

    return items.length > 0
      ? {
          id: 'feats',
          label: `Feats (${featList.length})`,
          items,
          isCurrent: currentStepId === 'general-feat' || currentStepId === 'class-feat',
        }
      : null;
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
  static _buildDroidSection(projection, currentStepId) {
    if (!projection.droid) return null;

    const items = [];

    if (projection.droid.systems && projection.droid.systems.length > 0) {
      items.push({
        label: 'Systems',
        value: `${projection.droid.systems.length}`,
        isCurrent: currentStepId === 'droid-builder' || currentStepId === 'final-droid-configuration',
      });
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
    if (skill === null || skill === undefined) return '';
    if (typeof skill === 'string' || typeof skill === 'number') return String(skill).trim();
    if (typeof skill === 'object') {
      const candidate = skill.name || skill.label || skill.id;
      if (candidate !== null && candidate !== undefined) return String(candidate).trim();
    }
    return String(skill).trim();
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
