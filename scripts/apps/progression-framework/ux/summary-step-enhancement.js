/**
 * Summary Step Enhancement — Phase 7 Step 5
 *
 * Transforms the summary step from a data dump into a trustworthy checkout experience.
 * Goals:
 * - Clear "what you are getting"
 * - Transparent about what was auto-resolved
 * - Explicit about risks and warnings
 * - Actionable next steps
 * - Natural decision checkpoint before creation
 *
 * Works with: scripts/apps/progression-framework/steps/summary-step.js
 */

import { UserExplainability } from './user-explainability.js';
import { ExplanationDisplay } from './explanation-display.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class SummaryStepEnhancement {
  /**
   * Organize summary data into checkout sections.
   * Called by SummaryStep to restructure display.
   *
   * @param {Object} aggregatedSummary - From SummaryStep._summary
   * @param {ProgressionSession} session - Current session
   * @returns {Object} Organized checkout data
   */
  static organizeForCheckout(aggregatedSummary, session) {
    const checkout = {
      // What you're getting
      foundations: {
        name: aggregatedSummary.name,
        species: aggregatedSummary.species,
        class: aggregatedSummary.class,
        level: aggregatedSummary.level,
      },

      // Build decisions
      keyDecisions: this._extractKeyDecisions(aggregatedSummary),

      // What was auto-resolved
      autoResolved: this._extractAutoResolvedItems(aggregatedSummary, session),

      // Validation issues
      issues: this._extractIssues(aggregatedSummary, session),

      // Warnings and cautions
      warnings: this._extractWarnings(aggregatedSummary, session),

      // Template context
      templateContext: this._extractTemplateContext(aggregatedSummary, session),

      // Resources
      resources: this._extractResources(aggregatedSummary),

      // Readiness
      readiness: this._assessReadiness(aggregatedSummary, session),
    };

    return checkout;
  }

  /**
   * Create checkout section for "what you're getting".
   * @private
   */
  static _extractKeyDecisions(summary) {
    const decisions = [];

    if (summary.class) {
      decisions.push({
        type: 'class',
        label: 'Class',
        value: summary.class,
        impact: 'Defines abilities, bonus feats, skill points, and character progression.',
      });
    }

    if (summary.species) {
      decisions.push({
        type: 'species',
        label: 'Species',
        value: summary.species,
        impact: 'Affects ability scores, size, special traits, and abilities.',
      });
    }

    if (summary.background) {
      decisions.push({
        type: 'background',
        label: 'Background',
        value: summary.background,
        impact: 'Provides starting equipment, wealth, and some skill training.',
      });
    }

    // Top abilities
    if (summary.attributes) {
      const topAbilities = Object.entries(summary.attributes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2);

      topAbilities.forEach(([ability, score]) => {
        decisions.push({
          type: 'ability',
          label: `${ability.toUpperCase()}`,
          value: score,
          impact: 'See character sheet for effects',
        });
      });
    }

    // Key feats
    if (summary.feats && summary.feats.length > 0) {
      const topFeats = summary.feats.slice(0, 2);
      topFeats.forEach(feat => {
        decisions.push({
          type: 'feat',
          label: 'Feat',
          value: feat.name || feat,
          impact: 'See feat description for effects',
        });
      });

      if (summary.feats.length > 2) {
        decisions.push({
          type: 'more-feats',
          label: 'More Feats',
          value: `+${summary.feats.length - 2}`,
          impact: 'See character sheet for full list',
        });
      }
    }

    return decisions;
  }

  /**
   * Extract items that were auto-resolved (no player choice).
   * @private
   */
  static _extractAutoResolvedItems(summary, session) {
    const autoResolved = [];

    // Items determined by class/species
    if (summary.skills && Array.isArray(summary.skills)) {
      const countAutoResolved = summary.skills.length || 0;
      if (countAutoResolved > 0) {
        autoResolved.push({
          type: 'skills',
          label: 'Skills',
          count: countAutoResolved,
          reason: 'Class and background determine these based on game rules',
        });
      }
    }

    // Attributes determined by species
    if (summary.species && summary.attributes) {
      autoResolved.push({
        type: 'ability-modifiers',
        label: 'Ability Modifiers',
        value: `Applied from ${summary.species}`,
        reason: 'Species automatically modifies base ability scores',
      });
    }

    // Equipment/money from background
    if (summary.background && summary.money) {
      autoResolved.push({
        type: 'starting-money',
        label: 'Starting Credits',
        value: `${summary.money.total} cr`,
        reason: `Determined by ${summary.background} background`,
      });
    }

    // HP calculation
    if (summary.hpCalculation) {
      autoResolved.push({
        type: 'hit-points',
        label: 'Hit Points',
        value: `${summary.hpCalculation.total} (${summary.hpCalculation.base} base + ${summary.hpCalculation.modifiers} modifiers)`,
        reason: 'Calculated automatically from class and Constitution',
      });
    }

    return autoResolved;
  }

  /**
   * Extract validation issues that block creation.
   * @private
   */
  static _extractIssues(summary, session) {
    const issues = [];

    // Missing required name
    if (!summary.name || summary.name.trim() === '') {
      issues.push({
        severity: 'blocking',
        type: 'missing-name',
        message: 'Character must have a name',
        hint: 'Enter a name above before confirming',
      });
    }

    // Template validation failures
    if (session.templateValidationReport && !session.templateValidationReport.valid) {
      const templateIssues = UserExplainability.explainTemplateIssues(session.templateValidationReport);
      issues.push(
        ...templateIssues.map(i => ({
          ...i,
          source: 'template',
        }))
      );
    }

    // Unmet prerequisites
    if (session.unmetPrerequisites && session.unmetPrerequisites.length > 0) {
      issues.push({
        severity: 'blocking',
        type: 'prerequisites',
        message: `${session.unmetPrerequisites.length} choice(s) don't meet requirements`,
        hint: 'Go back and review your choices',
      });
    }

    return issues;
  }

  /**
   * Extract warnings (not blocking, but worth noting).
   * @private
   */
  static _extractWarnings(summary, session) {
    const warnings = [];

    // Unoptimal ability spread
    if (summary.attributes) {
      const scores = Object.values(summary.attributes);
      const lowest = Math.min(...scores);
      const highest = Math.max(...scores);

      if (lowest < 8 || highest < 12) {
        warnings.push({
          severity: 'caution',
          type: 'ability-spread',
          message: 'Ability scores are quite spread out',
          hint: 'Your character may have weak areas. Consider reviewing attribute distribution.',
        });
      }
    }

    // Multiclass warning
    if (summary.class && session.multiclassPath) {
      warnings.push({
        severity: 'info',
        type: 'multiclass',
        message: 'You are building a multiclass character',
        hint: 'Multiclass requires careful leveling. See documentation for guidance.',
      });
    }

    // Prestige class warning
    if (summary.class && session.prestigeClass) {
      warnings.push({
        severity: 'info',
        type: 'prestige-class',
        message: 'You are on a prestige class path',
        hint: 'Prestige classes have specific requirements. You may lock yourself into this path.',
      });
    }

    // Missing feat selections
    if (session.dirtyNodes && session.dirtyNodes.size > 0) {
      warnings.push({
        severity: 'caution',
        type: 'unresolved-choices',
        message: `${session.dirtyNodes.size} choice(s) need review`,
        hint: 'Some of your previous selections may need adjustment. Please review.',
      });
    }

    return warnings;
  }

  /**
   * Extract template context (if using template).
   * @private
   */
  static _extractTemplateContext(summary, session) {
    if (!session.templateId) {
      return null;
    }

    return {
      templateId: session.templateId,
      templateName: session.templateName,
      message: `This character is built from the "${session.templateName}" template.`,
      choices: this._countTemplateChoices(summary),
      locked: this._countLockedChoices(session),
      custom: this._countCustomChoices(summary, session),
    };
  }

  /**
   * Count how many choices came from template.
   * @private
   */
  static _countTemplateChoices(summary) {
    let count = 0;
    if (summary.class) count++;
    if (summary.species) count++;
    if (summary.background) count++;
    if (summary.feats) count += summary.feats.length;
    if (summary.talents) count += summary.talents.length;
    return count;
  }

  /**
   * Count locked template choices.
   * @private
   */
  static _countLockedChoices(session) {
    let count = 0;
    if (session.draftSelections) {
      Object.entries(session.draftSelections).forEach(([, selection]) => {
        if (selection?.templateSource === 'TEMPLATE_LOCKED') {
          count++;
        }
      });
    }
    return count;
  }

  /**
   * Count customizations to template.
   * @private
   */
  static _countCustomChoices(summary, session) {
    let count = 0;
    if (session.draftSelections) {
      Object.entries(session.draftSelections).forEach(([, selection]) => {
        if (selection?.overridden) {
          count++;
        }
      });
    }
    return count;
  }

  /**
   * Extract resources (equipment, money, etc.).
   * @private
   */
  static _extractResources(summary) {
    const resources = [];

    if (summary.money) {
      resources.push({
        type: 'credits',
        label: 'Starting Credits',
        value: `${summary.money.total} cr`,
        details: summary.money.sources ? summary.money.sources.join(', ') : '',
      });
    }

    if (summary.languages && summary.languages.length > 0) {
      resources.push({
        type: 'languages',
        label: 'Languages',
        value: summary.languages.join(', '),
      });
    }

    return resources;
  }

  /**
   * Assess overall readiness for creation.
   * @private
   */
  static _assessReadiness(summary, session) {
    const readiness = {
      canCreate: true,
      blockers: [],
      warnings: [],
      score: 100,
    };

    // Check blockers
    if (!summary.name || summary.name.trim() === '') {
      readiness.canCreate = false;
      readiness.blockers.push('Missing character name');
      readiness.score -= 100;
    }

    if (session.unmetPrerequisites && session.unmetPrerequisites.length > 0) {
      readiness.canCreate = false;
      readiness.blockers.push(`${session.unmetPrerequisites.length} unmet prerequisite(s)`);
      readiness.score -= 50;
    }

    // Check warnings
    if (session.dirtyNodes && session.dirtyNodes.size > 0) {
      readiness.warnings.push(`${session.dirtyNodes.size} choice(s) flagged for review`);
      readiness.score -= 10;
    }

    if (session.templateValidationReport && !session.templateValidationReport.valid) {
      readiness.warnings.push('Template has issues (but may still apply)');
      readiness.score -= 20;
    }

    readiness.score = Math.max(0, readiness.score);

    return readiness;
  }

  /**
   * Render summary checkout as HTML.
   * @param {Object} checkout - From organizeForCheckout()
   * @returns {HTMLElement}
   */
  static renderCheckoutUI(checkout) {
    const container = document.createElement('div');
    container.className = 'summary-checkout-ui';

    // Header
    const header = document.createElement('div');
    header.className = 'checkout-header';
    header.innerHTML = `
      <h2>Review Your Character</h2>
      <p class="header-hint">Everything looks correct? Click Confirm to create your character.</p>
    `;
    container.appendChild(header);

    // Readiness status
    if (checkout.readiness.blockers.length > 0) {
      const blockers = document.createElement('div');
      blockers.className = 'readiness-blockers';
      blockers.innerHTML = `
        <div class="blocker-title">⛔ Cannot create character:</div>
        <ul class="blocker-list">
          ${checkout.readiness.blockers.map(b => `<li>${b}</li>`).join('')}
        </ul>
      `;
      container.appendChild(blockers);
    }

    // Foundations
    const foundations = document.createElement('div');
    foundations.className = 'checkout-section foundations';
    foundations.innerHTML = `
      <h3>Your Character</h3>
      <div class="foundation-grid">
        <div class="foundation-item">
          <div class="label">Name</div>
          <div class="value">${this._escapeHtml(checkout.foundations.name || '(unnamed)')}</div>
        </div>
        <div class="foundation-item">
          <div class="label">Species</div>
          <div class="value">${this._escapeHtml(checkout.foundations.species || '—')}</div>
        </div>
        <div class="foundation-item">
          <div class="label">Class</div>
          <div class="value">${this._escapeHtml(checkout.foundations.class || '—')}</div>
        </div>
        <div class="foundation-item">
          <div class="label">Level</div>
          <div class="value">${checkout.foundations.level}</div>
        </div>
      </div>
    `;
    container.appendChild(foundations);

    // Key Decisions
    if (checkout.keyDecisions && checkout.keyDecisions.length > 0) {
      const decisions = document.createElement('div');
      decisions.className = 'checkout-section key-decisions';
      decisions.innerHTML = `<h3>Key Decisions</h3>`;
      const list = document.createElement('ul');
      list.className = 'decisions-list';
      checkout.keyDecisions.forEach(decision => {
        const item = document.createElement('li');
        item.className = 'decision-item';
        item.innerHTML = `
          <div class="decision-label">${this._escapeHtml(decision.label)}</div>
          <div class="decision-value">${this._escapeHtml(decision.value)}</div>
          <div class="decision-impact">${this._escapeHtml(decision.impact)}</div>
        `;
        list.appendChild(item);
      });
      decisions.appendChild(list);
      container.appendChild(decisions);
    }

    // Auto-Resolved Items
    if (checkout.autoResolved && checkout.autoResolved.length > 0) {
      const autoResolved = document.createElement('div');
      autoResolved.className = 'checkout-section auto-resolved';
      autoResolved.innerHTML = `
        <h3>Auto-Determined</h3>
        <p class="hint">These were determined automatically based on your choices:</p>
      `;
      const list = document.createElement('ul');
      list.className = 'auto-resolved-list';
      checkout.autoResolved.forEach(item => {
        const li = document.createElement('li');
        li.className = 'auto-item';
        li.innerHTML = `
          <div class="auto-label">${this._escapeHtml(item.label)}</div>
          <div class="auto-value">${this._escapeHtml(item.value || item.count)}</div>
          <div class="auto-reason">${this._escapeHtml(item.reason)}</div>
        `;
        list.appendChild(li);
      });
      autoResolved.appendChild(list);
      container.appendChild(autoResolved);
    }

    // Issues
    if (checkout.issues && checkout.issues.length > 0) {
      const issuesPanel = ExplanationDisplay.renderTemplateIssuesPanel(checkout.issues);
      if (issuesPanel) {
        container.appendChild(issuesPanel);
      }
    }

    // Warnings
    if (checkout.warnings && checkout.warnings.length > 0) {
      const warningsDiv = document.createElement('div');
      warningsDiv.className = 'checkout-section warnings';
      warningsDiv.innerHTML = `<h3>⚠️ Worth Noting</h3>`;
      checkout.warnings.forEach(warning => {
        const item = document.createElement('div');
        item.className = `warning-item ${warning.severity}`;
        item.innerHTML = `
          <div class="warning-title">${this._escapeHtml(warning.message)}</div>
          <div class="warning-hint">${this._escapeHtml(warning.hint)}</div>
        `;
        warningsDiv.appendChild(item);
      });
      container.appendChild(warningsDiv);
    }

    // Resources
    if (checkout.resources && checkout.resources.length > 0) {
      const resources = document.createElement('div');
      resources.className = 'checkout-section resources';
      resources.innerHTML = `<h3>Resources</h3>`;
      checkout.resources.forEach(resource => {
        const item = document.createElement('div');
        item.className = 'resource-item';
        item.innerHTML = `
          <div class="resource-label">${this._escapeHtml(resource.label)}</div>
          <div class="resource-value">${this._escapeHtml(resource.value)}</div>
          ${resource.details ? `<div class="resource-details">${this._escapeHtml(resource.details)}</div>` : ''}
        `;
        resources.appendChild(item);
      });
      container.appendChild(resources);
    }

    // Template context
    if (checkout.templateContext) {
      const template = document.createElement('div');
      template.className = 'checkout-section template-context';
      template.innerHTML = `
        <h3>📦 Using Template</h3>
        <div class="template-info">
          <p>${this._escapeHtml(checkout.templateContext.message)}</p>
          <ul class="template-stats">
            <li><strong>${checkout.templateContext.choices}</strong> choices from template</li>
            <li><strong>${checkout.templateContext.locked}</strong> locked by template</li>
            <li><strong>${checkout.templateContext.custom}</strong> customized by you</li>
          </ul>
        </div>
      `;
      container.appendChild(template);
    }

    return container;
  }

  // -----------------------------------------------------------------------
  // CSS
  // -----------------------------------------------------------------------

  static injectCheckoutStyles() {
    if (document.getElementById('summary-checkout-styles')) return;

    const style = document.createElement('style');
    style.id = 'summary-checkout-styles';
    style.textContent = `
      .summary-checkout-ui {
        padding: 16px;
        max-width: 800px;
      }

      .checkout-header {
        margin-bottom: 24px;
        text-align: center;
      }

      .checkout-header h2 {
        margin: 0 0 8px 0;
        font-size: 24px;
      }

      .header-hint {
        margin: 0;
        color: #666;
        font-size: 14px;
      }

      .readiness-blockers {
        padding: 12px;
        margin-bottom: 16px;
        background: #ffebee;
        border: 1px solid #ef5350;
        border-radius: 4px;
      }

      .blocker-title {
        font-weight: bold;
        color: #c62828;
        margin-bottom: 8px;
      }

      .blocker-list {
        margin: 0;
        padding-left: 16px;
        list-style: disc;
      }

      .checkout-section {
        margin-bottom: 24px;
        padding: 16px;
        background: #f9f9f9;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
      }

      .checkout-section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
      }

      .checkout-section .hint {
        font-size: 13px;
        color: #666;
        margin: 0 0 8px 0;
      }

      .foundation-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .foundation-item {
        padding: 8px;
        background: white;
        border-radius: 3px;
      }

      .foundation-item .label {
        font-size: 11px;
        font-weight: bold;
        color: #999;
        text-transform: uppercase;
      }

      .foundation-item .value {
        font-size: 16px;
        font-weight: bold;
        color: #333;
        margin-top: 4px;
      }

      .decisions-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .decision-item {
        padding: 12px;
        margin-bottom: 8px;
        background: white;
        border-radius: 3px;
        border-left: 3px solid #2196f3;
      }

      .decision-label {
        font-size: 12px;
        font-weight: bold;
        color: #999;
        text-transform: uppercase;
      }

      .decision-value {
        font-size: 14px;
        font-weight: bold;
        color: #333;
        margin: 4px 0;
      }

      .decision-impact {
        font-size: 12px;
        color: #666;
      }

      .auto-resolved-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .auto-item {
        padding: 12px;
        margin-bottom: 8px;
        background: white;
        border-radius: 3px;
        border-left: 3px solid #4caf50;
      }

      .auto-label {
        font-size: 12px;
        font-weight: bold;
        color: #999;
      }

      .auto-value {
        font-size: 14px;
        font-weight: bold;
        color: #333;
        margin: 4px 0;
      }

      .auto-reason {
        font-size: 12px;
        color: #666;
      }

      .warning-item {
        padding: 12px;
        margin-bottom: 8px;
        background: white;
        border-radius: 3px;
        border-left: 3px solid #ff9800;
      }

      .warning-item.caution {
        border-left-color: #ff9800;
      }

      .warning-item.info {
        border-left-color: #2196f3;
      }

      .warning-title {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .warning-hint {
        font-size: 12px;
        color: #666;
      }

      .resource-item {
        padding: 12px;
        margin-bottom: 8px;
        background: white;
        border-radius: 3px;
      }

      .resource-label {
        font-size: 12px;
        font-weight: bold;
        color: #999;
      }

      .resource-value {
        font-size: 14px;
        font-weight: bold;
        color: #333;
        margin: 4px 0;
      }

      .resource-details {
        font-size: 12px;
        color: #666;
      }

      .template-info {
        padding: 12px;
        background: white;
        border-radius: 3px;
      }

      .template-info p {
        margin: 0 0 8px 0;
      }

      .template-stats {
        margin: 0;
        padding-left: 16px;
        list-style: disc;
        font-size: 13px;
      }

      .template-stats li {
        margin: 4px 0;
      }
    `;

    document.head.appendChild(style);
  }

  static _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Auto-inject styles on module load
SummaryStepEnhancement.injectCheckoutStyles();
