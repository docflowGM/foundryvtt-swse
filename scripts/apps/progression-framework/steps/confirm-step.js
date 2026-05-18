/**
 * confirm-step.js
 *
 * Confirm step — Final review and readiness surface before finalization.
 *
 * Responsibilities:
 * - Display comprehensive build summary
 * - Show starting credits status (chargen) or HP gain (level-up)
 * - Handle starting credits roll/generation (chargen)
 * - Handle HP gain roll/max (level-up)
 * - Support optional store access
 * - Track store visit state
 * - Validate build is complete and legal
 * - Gate final progression
 *
 * This step is the player's last chance to review before commitment.
 * It must feel calm, authoritative, and complete.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { EquipmentEngine } from '../../../engine/progression/engine/equipment-engine.js';
import { HPGeneratorEngine } from '../../../engine/HP/HPGeneratorEngine.js';
import { SettingsHelper } from '../../../utils/settings-helper.js';
import { ProgressionRules } from '../../../engine/progression/ProgressionRules.js';
import { AurebeshTranslator } from '../../../ui/dialogue/aurebesh-translator.js';
import { getStepGuidance, handleAskMentor } from './mentor-step-integration.js';
import { swseLogger } from '../../../utils/logger.js';

export class ConfirmStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);

    // State tracking
    this._creditsState = {
      rolled: false,
      amount: 0,
      formula: '',
    };
    this._hpGainState = {
      resolved: false,
      gain: 0,
      method: null,
      formula: '',
    };
    this._storeVisited = false;
    this._readinessCache = null;
  }

  get descriptor() { return this._descriptor; }

  /**
   * On step enter: compute starting credits (chargen) or HP gain (level-up) and build summary
   */
  async onStepEnter(shell) {
    try {
      const mode = this.descriptor?.mode || 'chargen';

      // Chargen: Compute starting credits if not already done
      if (mode === 'chargen' && !this._creditsState.rolled) {
        await this._computeStartingCredits(shell.actor);
      }

      // Level-up: Check HP gain resolution (if level > maxHPLevels)
      if (mode === 'levelup') {
        await this._checkHPGainResolution(shell);
      }

      // Build readiness assessment
      this._readinessCache = await this._assessReadiness(shell);

      shell.mentor.askMentorEnabled = true;

      swseLogger.debug('[ConfirmStep] Entered. Mode: ' + mode);
    } catch (e) {
      swseLogger.error('[ConfirmStep.onStepEnter]', e);
    }
  }

  async onStepExit(shell) {
    // No cleanup needed
  }

  /**
   * Apply Aurebesh translation effects to datapad headers (chargen only).
   * Called after rendering to wire up header animations.
   */
  async afterRender(shell, workSurfaceEl) {
    if (!workSurfaceEl || this.descriptor?.mode !== 'chargen') return;

    try {
      // Apply translation effect to headers marked with data-translate-header
      const headers = workSurfaceEl.querySelectorAll('[data-translate-header]');

      for (const header of headers) {
        const text = header.textContent?.trim();
        if (!text || header.classList.contains('prog-confirm-datapad__translated')) continue;

        // Mark as processed to avoid duplicate animations
        header.classList.add('prog-confirm-datapad__translated');

        // Store original text and clear display
        const originalText = text;
        header.textContent = '';

        // Apply Aurebesh-first translation animation
        await AurebeshTranslator.render({
          text: originalText,
          container: header,
          preset: 'mentor',
          enableSkip: true,
          onComplete: () => {
            // Animation complete - text remains readable
          },
        });
      }
    } catch (e) {
      swseLogger.warn('[ConfirmStep.afterRender] Translation effect error:', e);
      // Gracefully degrade if translation fails
    }
  }

  async onDataReady(shell) {
    // No utility bar listeners needed
  }

  /**
   * Provide step data to templates.
   * Note: context comes from shell's _prepareContext, which includes the actor
   * Mode is stored in this.descriptor (set during initialization)
   */
  async getStepData(context) {
    const summary = await this._buildSummaryData(context.actor);
    const mode = this.descriptor?.mode || 'chargen';

    // Datapad presentation mapping (chargen only)
    const datapadPresentation = mode === 'chargen'
      ? this._buildDatapadPresentation(summary)
      : {};

    return {
      summary,
      creditsState: { ...this._creditsState },
      hpGainState: { ...this._hpGainState },
      storeVisited: this._storeVisited,
      readiness: this._readinessCache || {},
      mode,
      datapadPresentation,
    };
  }

  /**
   * Build datapad-style presentation labels and deployment status.
   */
  _buildDatapadPresentation(summary) {
    const sections = {
      identity: { label: 'IDENTITY RECORD', icon: 'fa-user' },
      attributes: { label: 'BIOMETRIC READOUT', icon: 'fa-chart-bar' },
      background: { label: 'PROFILE MATRIX', icon: 'fa-book' },
      languages: { label: 'LANGUAGE MATRIX', icon: 'fa-comments' },
      feats: { label: 'COMBAT DOCTRINE', icon: 'fa-star' },
      talents: { label: 'TACTICAL SPECIALIZATION', icon: 'fa-lightbulb' },
      conditionalSteps: { label: 'FORCE REGISTRY', icon: 'fa-infinity' },
      credits: { label: 'RESOURCE LEDGER', icon: 'fa-coins' },
      store: { label: 'EQUIPMENT ACCESS', icon: 'fa-shopping-bag' },
    };

    // Build deployment status
    const deploymentStatus = this._computeDeploymentStatus();

    return {
      title: 'PROFILE FINALIZATION',
      subtitle: 'Your datapad profile has been compiled. Review all records, resolve resources, and confirm deployment.',
      sections,
      deploymentStatus,
      creditsStatus: this._creditsState.rolled ? 'VERIFIED' : 'UNRESOLVED',
      storeStatus: this._storeVisited ? 'COMPLETE' : 'OPTIONAL',
      overallReady: !this.getBlockingIssues().length,
    };
  }

  /**
   * Compute overall deployment status based on readiness.
   */
  _computeDeploymentStatus() {
    const issues = this.getBlockingIssues();
    if (issues.length > 0) {
      return {
        state: 'INCOMPLETE',
        message: `DEPLOYMENT STATUS — ${issues[0].toUpperCase()}`,
        color: 'blocking',
      };
    }

    if (!this._creditsState.rolled) {
      return {
        state: 'PENDING',
        message: 'DEPLOYMENT STATUS — RESOURCE LEDGER UNRESOLVED',
        color: 'warning',
      };
    }

    if (!this._storeVisited) {
      return {
        state: 'READY',
        message: 'DEPLOYMENT STATUS — EQUIPMENT ACCESS OPTIONAL',
        color: 'neutral',
      };
    }

    return {
      state: 'READY',
      message: 'DEPLOYMENT STATUS — READY FOR FINAL CONFIRMATION',
      color: 'success',
    };
  }

  getSelection() {
    // Confirm step doesn't have a typical selection
    return {
      selected: [],
      count: 0,
      isComplete: this._creditsState.rolled,
    };
  }

  async onItemFocused(summaryId, shell) {
    // Focus on a summary section (e.g. "feats", "languages")
    // This can update details panel to show more about that section
    shell.focusedItem = { sectionId: summaryId, type: 'summary-section' };
    shell.render();
  }

  async onItemHovered(summaryId, shell) {
    // Lightweight hover
  }

  async onItemCommitted(actionId, shell) {
    // Not used in confirm step
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/confirm-work-surface.hbs',
      data: stepData,
    };
  }

  renderDetailsPanel(focusedItem) {
    if (!focusedItem || focusedItem.type !== 'summary-section') {
      return this.renderDetailsPanelEmptyState();
    }

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/confirm-details.hbs',
      data: {
        focusedSection: focusedItem.sectionId,
        creditsState: { ...this._creditsState },
        storeVisited: this._storeVisited,
      },
    };
  }

  renderDetailsPanelEmptyState() {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
      data: {
        icon: 'fa-check-circle',
        message: 'Review your build above. Click a section for details.',
      },
    };
  }

  validate() {
    const errors = [];
    const mode = this.descriptor?.mode || 'chargen';

    // Check: credits resolved (chargen only)
    if (mode !== 'levelup' && !this._creditsState.rolled) {
      errors.push('Starting credits must be rolled/generated');
    }

    // Check: HP gain resolved (level-up only, if required)
    if (mode === 'levelup' && this._hpGainState.needsResolution && !this._hpGainState.resolved) {
      errors.push('HP gain must be resolved before finalizing level-up');
    }

    // Check: all required choices complete (delegated to prior steps)
    // This is already validated by each step plugin
    // Confirm just checks that the build state is valid

    const isValid = errors.length === 0;
    return { isValid, errors, warnings: [] };
  }

  getBlockingIssues() {
    const issues = [];
    const mode = this.descriptor?.mode || 'chargen';

    // Chargen: credits required
    if (mode !== 'levelup' && !this._creditsState.rolled) {
      issues.push('Starting credits not yet resolved');
    }

    // Level-up: HP gain required (if applicable)
    if (mode === 'levelup' && this._hpGainState.needsResolution && !this._hpGainState.resolved) {
      issues.push('HP gain not yet resolved');
    }

    return issues;
  }

  getWarnings() {
    return [];
  }

  getRemainingPicks() {
    const picks = [];
    const mode = this.descriptor?.mode || 'chargen';

    // Chargen: credits status
    if (mode !== 'levelup') {
      if (!this._creditsState.rolled) {
        picks.push({ label: 'Credits: Not Yet Rolled', isWarning: true });
      } else {
        picks.push({ label: `Credits: ${this._creditsState.amount}`, isWarning: false });
      }
      picks.push({ label: this._storeVisited ? '✓ Store Visited' : 'Store Optional', isWarning: false });
    }

    // Level-up: HP status
    if (mode === 'levelup') {
      if (this._hpGainState.needsResolution) {
        if (!this._hpGainState.resolved) {
          picks.push({ label: 'HP Gain: Unresolved', isWarning: true });
        } else {
          picks.push({ label: `HP Gain: +${this._hpGainState.gain}`, isWarning: false });
        }
      } else {
        // HP auto-resolved by settings
        picks.push({ label: `HP Gain: +${this._hpGainState.gain} (${this._hpGainState.method})`, isWarning: false });
      }
    }

    return picks;
  }

  getUtilityBarConfig() {
    return {
      mode: 'summary',
      summaryChips: [
        `${this._creditsState.rolled ? '✓' : '○'} Credits: ${this._creditsState.amount}`,
        this._storeVisited ? '✓ Store Visited' : 'Store Available',
      ],
    };
  }

  getUtilityBarMode() {
    return 'summary';
  }

  getMentorContext(shell) {
    return getStepGuidance(shell.actor, 'confirm', shell)
      || 'Your path is clear. Stand ready for deployment.';
  }

  async onAskMentor(shell) {
    // Mentor provides summary guidance
    const text = this.getMentorContext(shell);
    await shell.mentorRail.speak(text, 'encouraging');
  }

  getMentorMode() {
    return 'context-only';
  }

  // =========================================================================
  // Confirm-specific action handlers (called from shell)
  // =========================================================================

  /**
   * Roll/generate starting credits.
   * Call this from footer "Roll Credits" button.
   */
  async rollCredits(actor) {
    try {
      await this._computeStartingCredits(actor);
      return { success: true, amount: this._creditsState.amount };
    } catch (e) {
      swseLogger.error('[ConfirmStep.rollCredits]', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Use maximum starting credits instead of rolling.
   * Call this from "Use Maximum Credits" button.
   */
  async useMaximumCredits(actor) {
    try {
      // Get the base credits from equipment engine (what rolling would produce)
      const credits = await EquipmentEngine.getStartingCredits(actor);
      // Maximum credits is typically the base credits amount (no reduction)
      // If the system has a maximum override, use it; otherwise use base
      const maxCredits = credits; // Can be enhanced if system defines a max-multiplier
      this._creditsState = {
        rolled: true,
        amount: maxCredits,
        formula: `Maximum Credits (${maxCredits})`,
      };
      swseLogger.debug(`[ConfirmStep] Maximum credits set: ${maxCredits}`);
      return { success: true, amount: this._creditsState.amount };
    } catch (e) {
      swseLogger.error('[ConfirmStep.useMaximumCredits]', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Check if HP gain resolution is required for level-up.
   * Determines if player must roll or if it's auto-resolved by settings.
   */
  async _checkHPGainResolution(shell) {
    try {
      const actor = shell.actor;
      const newLevel = (actor.system.details?.level || 1) + 1;

      // Get HP generation settings
      const hpGeneration = ProgressionRules.getHPGeneration();
      const maxHPLevels = ProgressionRules.getMaxHPLevels();

      // Get class for hit die
      const classData = actor.system.class?.primary;
      if (!classData) {
        swseLogger.warn('[ConfirmStep._checkHPGainResolution] No class found');
        return;
      }

      // Calculate HP using existing authority
      const { calculateHPGain } = await import('../../../apps/levelup/levelup-shared.js');
      const hitDie = this._extractHitDie(classData);
      const hpGain = calculateHPGain(classData, actor, newLevel);

      // Determine if player must manually resolve or if it's auto-resolved
      const needsResolution = newLevel > maxHPLevels && hpGeneration === 'roll';

      this._hpGainState = {
        resolved: !needsResolution,  // Auto-resolved if not needing manual roll
        gain: hpGain,
        method: hpGeneration,
        formula: `d${hitDie} ${actor.system.attributes.con?.mod >= 0 ? '+' : ''}${actor.system.attributes.con?.mod || 0}`,
        needsResolution,
        hitDie,
      };

      swseLogger.debug(
        `[ConfirmStep._checkHPGainResolution] Level ${newLevel}, HP: ${hpGain}, ` +
        `Method: ${hpGeneration}, NeedsResolution: ${needsResolution}`
      );
    } catch (e) {
      swseLogger.error('[ConfirmStep._checkHPGainResolution]', e);
      // Set safe default
      this._hpGainState.resolved = true;
    }
  }

  /**
   * Roll for HP gain (level-up only).
   */
  async rollHPGain(actor) {
    try {
      const newLevel = (actor.system.details?.level || 1) + 1;
      const classData = actor.system.class?.primary;

      // Roll d{hitDie}
      const { calculateHPGain } = await import('../../../apps/levelup/levelup-shared.js');
      const hitDie = this._extractHitDie(classData);
      const hpGain = calculateHPGain(classData, actor, newLevel);

      this._hpGainState.resolved = true;
      this._hpGainState.gain = hpGain;
      this._hpGainState.method = 'rolled';

      swseLogger.debug(`[ConfirmStep.rollHPGain] Rolled HP: ${hpGain}`);
      return { success: true, gain: hpGain };
    } catch (e) {
      swseLogger.error('[ConfirmStep.rollHPGain]', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Use maximum HP gain (level-up only).
   */
  async useMaximumHPGain(actor) {
    try {
      const newLevel = (actor.system.details?.level || 1) + 1;
      const classData = actor.system.class?.primary;
      const hitDie = this._extractHitDie(classData);
      const conMod = actor.system.attributes.con?.mod || 0;

      // Maximum: hitDie + CON mod
      const maxHPGain = Math.max(1, hitDie + conMod);

      this._hpGainState.resolved = true;
      this._hpGainState.gain = maxHPGain;
      this._hpGainState.method = 'maximum';

      swseLogger.debug(`[ConfirmStep.useMaximumHPGain] Max HP: ${maxHPGain}`);
      return { success: true, gain: maxHPGain };
    } catch (e) {
      swseLogger.error('[ConfirmStep.useMaximumHPGain]', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Extract hit die from class data.
   */
  _extractHitDie(classData) {
    if (!classData) return 6; // Default to d6

    // Try system.hitDie field first
    if (classData.system?.hitDie) {
      const match = classData.system.hitDie.match(/d(\d+)/);
      if (match) return parseInt(match[1], 10);
    }

    // Fallback to standard mapping by class name (from levelup-shared.js)
    const classHitDice = {
      'Elite Trooper': 12, 'Independent Droid': 12,
      'Assassin': 10, 'Bounty Hunter': 10, 'Droid Commander': 10, 'Gladiator': 10,
      'Imperial Knight': 10, 'Jedi': 10, 'Jedi Knight': 10, 'Jedi Master': 10,
      'Master Privateer': 10, 'Martial Arts Master': 10, 'Pathfinder': 10,
      'Sith Apprentice': 10, 'Sith Lord': 10, 'Soldier': 10, 'Vanguard': 10,
      'Ace Pilot': 8, 'Beast Rider': 8, 'Charlatan': 8, 'Corporate Agent': 8,
      'Crime Lord': 8, 'Enforcer': 8, 'Force Adept': 8, 'Force Disciple': 8,
      'Gunslinger': 8, 'Improviser': 8, 'Infiltrator': 8, 'Medic': 8,
      'Melee Duelist': 8, 'Military Engineer': 8, 'Officer': 8, 'Outlaw': 8,
      'Saboteur': 8, 'Scout': 8, 'Shaper': 8,
      'Noble': 6, 'Scoundrel': 6, 'Slicer': 6
    };

    return classHitDice[classData.name] || 6;
  }

  /**
   * Enter store.
   * Returns a promise that resolves when store is closed.
   */
  async enterStore(actor, shell = null) {
    const { SWSEStore } = await import('../../../apps/store/store-main.js');
    this._storeVisited = true;

    return new Promise(resolve => {
      let settled = false;
      const settle = async () => {
        if (settled) return;
        settled = true;
        if (shell?.render) {
          shell.render();
        }
        resolve();
      };

      SWSEStore.open(actor, {
        closeAfterCheckout: true,
        onCheckoutComplete: async ({ actor: updatedActor }) => {
          if (updatedActor) {
            actor = updatedActor;
          }
        },
        onClose: async ({ actor: updatedActor, checkoutCompleted }) => {
          this._storeVisited = true;
          if (updatedActor) {
            actor = updatedActor;
          }
          await settle();
        }
      }).catch(err => {
        swseLogger.error('[ConfirmStep.enterStore] Failed to open store', err);
        settle();
      });
    });
  }

  /**
   * Skip store and proceed to final confirmation.
   */
  skipStore() {
    // Store remains unvisited; that's fine — it's optional
    this._storeVisited = false;
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Compute starting credits from class and background.
   * Uses EquipmentEngine's logic.
   */
  async _computeStartingCredits(actor) {
    try {
      const credits = await EquipmentEngine.getStartingCredits(actor);
      this._creditsState = {
        rolled: true,
        amount: credits,
        formula: `Class + Background (${credits} credits)`,
      };

      swseLogger.debug(`[ConfirmStep] Starting credits: ${credits}`);
    } catch (e) {
      swseLogger.error('[ConfirmStep._computeStartingCredits]', e);
      this._creditsState = {
        rolled: false,
        amount: 0,
        formula: '',
      };
    }
  }

  /**
   * Build human-readable summary of the entire build.
   */
  async _buildSummaryData(actor) {
    const systemData = actor.system || {};
    const progression = systemData.progression || {};

    return {
      identity: {
        name: actor.name,
        species: systemData.species?.name || 'Unknown',
        class: systemData.class?.primary?.name || 'Unknown',
        mentor: this._getMentorName(systemData),
      },
      attributes: {
        strength: systemData.abilities?.str?.value ?? '—',
        dexterity: systemData.abilities?.dex?.value ?? '—',
        constitution: systemData.abilities?.con?.value ?? '—',
        intelligence: systemData.abilities?.int?.value ?? '—',
        wisdom: systemData.abilities?.wis?.value ?? '—',
        charisma: systemData.abilities?.cha?.value ?? '—',
      },
      background: {
        name: systemData.background?.name || 'None',
      },
      languages: {
        known: (progression.languages || []).length,
        bonus: (progression.bonusLanguages || []).length,
        total: ((progression.languages || []).concat(progression.bonusLanguages || [])).length,
      },
      feats: {
        general: (progression.generalFeats || []).length,
        class: (progression.classFeats || []).length,
        total: ((progression.generalFeats || []).concat(progression.classFeats || [])).length,
      },
      talents: {
        heroic: (progression.generalTalents || []).length,
        class: (progression.classTalents || []).length,
        total: ((progression.generalTalents || []).concat(progression.classTalents || [])).length,
      },
      conditionalSteps: {
        forcePowers: (progression.forcePowers || []).length,
        forceSecrets: (progression.forceSecrets || []).length,
        forceTechniques: (progression.forceTechniques || []).length,
        starshipManeuvers: (progression.starshipManeuvers || []).length,
      },
      credits: {
        ...this._creditsState,
        current: Number(systemData.credits ?? 0) || 0,
        spent: Math.max(0, (Number(this._creditsState.amount) || 0) - (Number(systemData.credits ?? 0) || 0)),
      },
      recentPurchases: this._getRecentPurchases(actor),
      store: this._storeVisited,
    };
  }

  /**
   * Assess readiness for final confirmation.
   */
  async _assessReadiness(shell) {
    const issues = this.getBlockingIssues();
    const warnings = this.getWarnings();

    return {
      isReady: issues.length === 0,
      blockingIssues: issues,
      warnings,
      completionPercent: 95, // Visual indicator
    };
  }

  /**
   * Get mentor name for build.
   */
  _getMentorName(systemData) {
    // planned: get mentor from mentor-dialogues based on class
    return systemData.mentor || 'Mentor Unknown';
  }
}
