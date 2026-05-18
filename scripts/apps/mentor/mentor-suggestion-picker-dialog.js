/**
 * Mentor Suggestion Picker Dialog
 *
 * Presents the mentor's top suggestion picks in a modal. Selecting a pick resolves
 * the dialog with that suggestion so the active step can apply it immediately.
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";

const GENERIC_REASON_PATTERNS = [
  /fits your current (build|direction)/i,
  /strong fit for your build/i,
  /legal option/i,
  /valid option/i,
  /reasonable option/i,
  /available option/i,
];

const ABILITY_LABELS = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
};

const ABILITY_LOOKUP = Object.entries(ABILITY_LABELS).flatMap(([key, label]) => [
  [key, key],
  [label.toLowerCase(), key],
  [label.slice(0, 3).toLowerCase(), key],
]);

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text || text === '[object Object]') return null;
  return text;
}

function isGenericReason(value) {
  const text = cleanText(value);
  if (!text) return true;
  return GENERIC_REASON_PATTERNS.some(pattern => pattern.test(text));
}

function flattenReasonValues(value, out = []) {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string' || typeof value === 'number') {
    const text = cleanText(value);
    if (text) out.push(text);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach(item => flattenReasonValues(item, out));
    return out;
  }
  if (typeof value === 'object') {
    const preferred = [
      value.text, value.label, value.reason, value.reasonText,
      value.reasonSummary, value.summary, value.message,
      value.description, value.display, value.name
    ];
    for (const candidate of preferred) {
      if (candidate !== undefined && candidate !== null) flattenReasonValues(candidate, out);
    }
    if (out.length === 0) {
      for (const candidate of Object.values(value)) {
        if (typeof candidate === 'string' || Array.isArray(candidate)) flattenReasonValues(candidate, out);
      }
    }
  }
  return out;
}

function uniqTexts(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = cleanText(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function decorateText(text) {
  const raw = cleanText(text) || '';
  if (!raw) return { text: '', segments: [] };

  const pattern = /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|STR|DEX|CON|INT|WIS|CHA)\b/gi;
  const segments = [];
  let last = 0;
  raw.replace(pattern, (match, _word, offset) => {
    if (offset > last) segments.push({ text: raw.slice(last, offset) });
    const ability = ABILITY_LOOKUP.find(([token]) => token === match.toLowerCase())?.[1] || null;
    segments.push({ text: match, ability });
    last = offset + match.length;
    return match;
  });
  if (last < raw.length) segments.push({ text: raw.slice(last) });
  return { text: raw, segments };
}

function collectReasons(entry = {}, keys = []) {
  const values = [];
  for (const key of keys) {
    const path = key.split('.');
    let cursor = entry;
    for (const part of path) cursor = cursor?.[part];
    flattenReasonValues(cursor, values);
  }
  return uniqTexts(values).filter(text => !isGenericReason(text));
}

function normalizeReasons(entry = {}) {
  const preferredBullets = collectReasons(entry, [
    'suggestion.reasons',
    'suggestion.reasonBullets',
    'suggestion.reasonText',
    'suggestion.reason',
    'explanation.bullets',
    'reasonBullets',
    'reasons',
  ]);
  const fallbackBullets = uniqTexts(flattenReasonValues(entry.reasonBullets || entry.reasons || entry.reasonText || entry.reason || []))
    .filter(text => !isGenericReason(text));
  const bullets = (preferredBullets.length ? preferredBullets : fallbackBullets).slice(0, 5).map(decorateText);

  const cautions = collectReasons(entry, ['suggestion.cautions', 'cautionReasons', 'cautions'])
    .slice(0, 3).map(decorateText);
  const forecast = collectReasons(entry, ['suggestion.forecast', 'forecastReasons', 'forecast'])
    .slice(0, 3).map(decorateText);

  return { bullets, cautions, forecast };
}

function pickReasonSummary(entry = {}) {
  const candidates = [
    entry?.suggestion?.reasonSummary,
    entry?.suggestion?.reason,
    entry?.suggestion?.reasonText,
    entry?.reasonSummary,
    entry?.reason,
    entry?.reasonText,
    entry?.explanation?.short,
    entry?.explanation?.full,
  ];
  for (const candidate of candidates) {
    const text = uniqTexts(flattenReasonValues(candidate || [])).find(Boolean);
    if (text && !isGenericReason(text)) return text;
  }
  const reasons = normalizeReasons(entry);
  return reasons.bullets[0]?.text || null;
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
        reasonSummary: pickReasonSummary(entry),
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
