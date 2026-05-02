/**
 * Mentor Suggestion Picker Dialog
 *
 * Presents the mentor's top suggestion picks in a modal. Selecting a pick resolves
 * the dialog with that suggestion so the active step can apply it immediately.
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";

function normalizeReasons(entry = {}) {
  const bullets = Array.isArray(entry.reasonBullets) ? entry.reasonBullets.filter(Boolean) : [];
  const cautions = Array.isArray(entry.cautionReasons) ? entry.cautionReasons.filter(Boolean) : [];
  const forecast = Array.isArray(entry.forecastReasons) ? entry.forecastReasons.filter(Boolean) : [];
  const fallbackReasons = Array.isArray(entry.reasons)
    ? entry.reasons.map(r => (typeof r === 'string' ? r : r?.label || r?.text || r?.reason || null)).filter(Boolean)
    : [];

  return {
    bullets: bullets.length ? bullets : fallbackReasons.slice(0, 3),
    cautions,
    forecast,
  };
}

export class MentorSuggestionPickerDialog extends BaseSWSEAppV2 {
  static DEFAULT_OPTIONS = {
    classes: ['swse', 'swse-inwindow-modal', 'mentor-suggestion-picker-dialog'],
    id: 'mentor-suggestion-picker-dialog',
    tag: 'div',
    window: {
      icon: 'fa-solid fa-brain',
      title: 'Ask Mentor',
      frame: false,
      resizable: false,
      draggable: false,
    },
    position: { width: 720, height: 'auto' },
  };

  static PARTS = {
    content: { template: 'systems/foundryvtt-swse/templates/apps/mentor-suggestion-picker-dialog.hbs' }
  };

  constructor({ mentor, advisory, suggestions, stepLabel } = {}, options = {}) {
    super(options);
    this.mentor = mentor ?? {};
    this.advisory = advisory ?? null;
    this.suggestions = Array.isArray(suggestions) ? suggestions : [];
    this.stepLabel = stepLabel ?? 'this step';
    this._resolveDialog = null;
  }

  static async show({ mentor, advisory, suggestions, stepLabel, title } = {}) {
    return new Promise((resolve) => {
      const dialog = new MentorSuggestionPickerDialog(
        { mentor, advisory, suggestions, stepLabel },
        { window: { title: title || `${mentor?.name || 'Mentor'}'s Top Picks` } }
      );

      dialog._resolveDialog = resolve;
      const originalClose = dialog.close.bind(dialog);
      dialog.close = function(...args) {
        if (dialog._resolveDialog) {
          dialog._resolveDialog(null);
          dialog._resolveDialog = null;
        }
        return originalClose(...args);
      };

      dialog.render(true);
    });
  }

  _prepareContext() {
    const suggestions = this.suggestions.map((entry, index) => {
      const reasons = normalizeReasons(entry);
      const suggestionMeta = entry?.suggestion ?? {};
      return {
        index,
        rank: index + 1,
        id: entry?.id || entry?._id || entry?.abbrev || entry?.name || `suggestion-${index}`,
        name: entry?.name || entry?.label || entry?.ability || entry?.abbrev || `Option ${index + 1}`,
        tier: suggestionMeta?.tier ?? entry?.tier ?? 0,
        tierLabel: suggestionMeta?.label || entry?.tierLabel || null,
        confidence: suggestionMeta?.confidence ?? entry?.confidence ?? null,
        reasonSummary: entry?.reasonSummary || suggestionMeta?.reasonSummary || suggestionMeta?.reason || entry?.reason || null,
        reasonText: entry?.reasonText || suggestionMeta?.reasonText || null,
        bullets: reasons.bullets,
        cautions: reasons.cautions,
        forecast: reasons.forecast,
      };
    });

    return {
      mentor: this.mentor,
      advisory: this.advisory,
      stepLabel: this.stepLabel,
      suggestions,
      hasSuggestions: suggestions.length > 0,
    };
  }

  wireEvents() {
    this.onRoot('click', '[data-action="choose-suggestion"]', (event, target) => {
      const idx = Number(target?.dataset?.index ?? target?.closest?.('[data-index]')?.dataset?.index ?? -1);
      const suggestion = Number.isInteger(idx) && idx >= 0 ? this.suggestions[idx] : null;
      if (this._resolveDialog) {
        this._resolveDialog(suggestion ?? null);
        this._resolveDialog = null;
      }
      this.close();
    });

    this.onRoot('click', '[data-action="dismiss"]', () => {
      if (this._resolveDialog) {
        this._resolveDialog(null);
        this._resolveDialog = null;
      }
      this.close();
    });
  }
}
