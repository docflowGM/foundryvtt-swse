/**
 * GM Suggestion Panel
 *
 * ApplicationV2 for displaying GM insights.
 * GM-only, non-modal, read-only suggestions with optional lever tracking.
 */

import { InsightBus } from "/systems/foundryvtt-swse/scripts/engine/suggestion/gm/insight-bus.js";
import { INSIGHT_TYPES } from "/systems/foundryvtt-swse/scripts/engine/suggestion/gm/insight-types.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class GMSuggestionPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'swse-gm-suggestion-panel',
    tag: 'div',
    window: {
      icon: 'fa-solid fa-lightbulb',
      title: 'GM Suggestion Panel',
      frame: true,
      resizable: true,
      minimizable: true,
      positioned: true
    },
    position: {
      width: 400,
      height: 600,
      left: 100,
      top: 100
    },
    classes: ['swse-gm-panel']
  };

  static PARTS = {
    header: {
      template: 'systems/foundryvtt-swse/templates/gm/suggestion-panel-header.hbs'
    },
    content: {
      template: 'systems/foundryvtt-swse/templates/gm/suggestion-panel-content.hbs'
    },
    footer: {
      template: 'systems/foundryvtt-swse/templates/gm/suggestion-panel-footer.hbs'
    }
  };

  /**
   * Initialize the panel
   */
  async _onRender(context, options) {
    super._onRender(context, options);

    // Update on insights change
    Hooks.on('swse:gm-insights-updated', () => {
      this.render(false);
    });
  }

  /**
   * Prepare context for rendering
   */
  async _prepareContext(options) {
    const insights = InsightBus.getActiveInsights();
    const summary = InsightBus.getSummary();

    return {
      insights: insights.map(i => this._formatInsightForDisplay(i)),
      summary,
      isEmpty: insights.length === 0
    };
  }

  /**
   * Format insight for template display
   * @private
   */
  _formatInsightForDisplay(insight) {
    return {
      id: `insight-${insight.type}-${insight.emittedAt}`,
      type: insight.type,
      severity: insight.severity,
      title: this._getInsightTitle(insight),
      summary: insight.summary,
      evidence: insight.evidence || [],
      levers: insight.suggestedLevers || insight.suggestedAdjustments || [],
      isAdjustment: insight.type === INSIGHT_TYPES.TUNING_ADVICE,
      additionalData: {
        state: insight.state,
        confidence: insight.confidence
      }
    };
  }

  /**
   * Get display title based on insight type
   * @private
   */
  _getInsightTitle(insight) {
    const titles = {
      [INSIGHT_TYPES.PRESSURE_WARNING]: '⚠️ Pressure Warning',
      [INSIGHT_TYPES.SPOTLIGHT_IMBALANCE]: '🎯 Spotlight Imbalance',
      [INSIGHT_TYPES.PACING_SIGNAL]: '⏱️ Pacing Alert',
      [INSIGHT_TYPES.TUNING_ADVICE]: '🔧 Tuning Advice'
    };
    return titles[insight.type] || insight.type;
  }

  /**
   * Handle lever checkbox (player just marking what they tried)
   */
  _onLeverCheck(event) {
    const leverText = event.currentTarget.dataset.lever;
    const isChecked = event.currentTarget.checked;

    if (isChecked) {
      console.log(`[GM Panel] Applied lever: "${leverText}"`);
    }
  }

  /**
   * Clear insights
   */
  _onClear(event) {
    event.preventDefault();
    InsightBus.clear();
  }

  /**
   * Register this as singleton GM panel
   */
  static register() {
    Hooks.once('ready', () => {
      if (game.user.isGM) {
        console.log('[GMSuggestionPanel] Registered for GM user');
      }
    });
  }

  /**
   * Open the panel (singleton)
   */
  static open() {
    let panel = Object.values(ui.windows).find(w => w instanceof GMSuggestionPanel);
    if (!panel) {
      panel = new GMSuggestionPanel();
    }
    panel.render(true);
    return panel;
  }
}
