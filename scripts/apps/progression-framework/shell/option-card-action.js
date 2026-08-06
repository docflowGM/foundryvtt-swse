/**
 * Option-card action presentation.
 *
 * One source for what a candidate card's SELECT control says — both the visible
 * label and the text a screen reader announces.
 *
 * The two used to be computed separately: the Handlebars partial derived its
 * visible label from `state`, while `aria-label` was built from an unrelated
 * `verb` + `name` pair. A card rendering LOCKED, OWNED, GRANTED or MAXIMUM
 * therefore announced "Select <name>" — the control told sighted and non-sighted
 * players two different things, and the one it told non-sighted players was
 * wrong. Both now come from `resolveOptionCardAction()`.
 *
 * Labels are localized. The English strings below are the fallbacks, so a
 * missing translation degrades to the text that shipped rather than to a raw
 * key.
 *
 * This module decides NOTHING about legality. `state`, `disabled` and `deselect`
 * are supplied by the owning step, which is where the rules live. A card that
 * decided its own legality would be a second, silently diverging copy of them.
 */

/**
 * Canonical card-action states. `null`/absent means an ordinary selectable card.
 * @type {ReadonlyArray<string>}
 */
export const OPTION_CARD_STATES = Object.freeze([
  'owned', 'granted', 'locked', 'unavailable', 'maximum', 'again',
]);

/**
 * Label + accessible-name definitions per resolved presentation state.
 *
 * `label` is the button face. `announce` is the sentence form; `{name}` is
 * substituted with the candidate name when one is supplied.
 */
const PRESENTATION = Object.freeze({
  select:      { key: 'SWSE.Progression.CardAction.Select',      label: 'SELECT',       announce: 'Select {name}' },
  selected:    { key: 'SWSE.Progression.CardAction.Selected',    label: 'SELECTED',     announce: '{name} is selected' },
  deselect:    { key: 'SWSE.Progression.CardAction.Deselect',    label: 'DESELECT',     announce: 'Remove {name}' },
  again:       { key: 'SWSE.Progression.CardAction.Again',       label: 'SELECT AGAIN', announce: 'Select {name} again' },
  owned:       { key: 'SWSE.Progression.CardAction.Owned',       label: 'OWNED',        announce: '{name} is already known' },
  granted:     { key: 'SWSE.Progression.CardAction.Granted',     label: 'GRANTED',      announce: '{name} is granted by another source' },
  locked:      { key: 'SWSE.Progression.CardAction.Locked',      label: 'LOCKED',       announce: '{name} is locked' },
  unavailable: { key: 'SWSE.Progression.CardAction.Unavailable', label: 'UNAVAILABLE',  announce: '{name} is unavailable' },
  maximum:     { key: 'SWSE.Progression.CardAction.Maximum',     label: 'MAXIMUM',      announce: '{name} is at its maximum' },
});

/**
 * Localize with the shipped English string as the fallback.
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function localize(key, fallback) {
  try {
    const translated = globalThis.game?.i18n?.localize?.(key);
    // Foundry returns the key itself when there is no translation.
    if (typeof translated === 'string' && translated && translated !== key) return translated;
  } catch (_err) {
    // No game object (tests, early init). Fall through to the English string.
  }
  return fallback;
}

/**
 * Reduce the card's flags to a single presentation state.
 *
 * Order matters: an explicit `state` from the owning step wins over the generic
 * selected/deselect flags, because the step is the only thing that knows why a
 * card cannot be taken.
 *
 * @param {Object} params
 * @returns {string} key into PRESENTATION
 */
export function resolveOptionCardState({ state = null, selected = false, deselect = false } = {}) {
  const normalized = typeof state === 'string' ? state.trim().toLowerCase() : '';
  if (normalized && Object.prototype.hasOwnProperty.call(PRESENTATION, normalized)) return normalized;
  if (deselect) return 'deselect';
  if (selected) return 'selected';
  return 'select';
}

/**
 * Resolve the label and accessible name for a card action.
 *
 * @param {Object} params
 * @param {string|null} [params.state]
 * @param {boolean} [params.selected]
 * @param {boolean} [params.deselect]
 * @param {string} [params.name] - Candidate name, used in the announced text.
 * @param {string} [params.label] - Explicit visible-label override.
 * @param {string} [params.verb] - Legacy verb override for the announced text.
 *   Only honoured for the plain selectable state; a locked card announcing
 *   "Add <name>" would be the same lie as before.
 * @returns {{state: string, label: string, ariaLabel: string}}
 */
export function resolveOptionCardAction({
  state = null,
  selected = false,
  deselect = false,
  name = '',
  label = null,
  verb = null,
} = {}) {
  const resolved = resolveOptionCardState({ state, selected, deselect });
  const definition = PRESENTATION[resolved];
  const candidateName = String(name ?? '').trim();

  const visible = label != null && String(label).length
    ? String(label)
    : localize(definition.key, definition.label);

  let announce;
  if (resolved === 'select' && verb) {
    // Steps whose commit verb is genuinely different ("Add" a language, "Add" a
    // Force Power copy) keep their wording while the card is actionable.
    announce = candidateName ? `${verb} ${candidateName}` : String(verb);
  } else {
    const template = localize(`${definition.key}.Announce`, definition.announce);
    announce = candidateName
      ? template.replace('{name}', candidateName)
      : template.replace('{name}', '').replace(/\s+/g, ' ').trim();
  }

  return { state: resolved, label: visible, ariaLabel: announce };
}

/**
 * Build the per-card action DTO a step attaches to each candidate.
 *
 * Steps used to hand the partial a `canAddMore` flag reached through Handlebars
 * parent paths (`../canAddMore`, `../../canAddMore`, `../../../committedId`).
 * The depth depended on how many `{{#each}}` blocks the surface happened to
 * nest, so re-grouping a list — adding a category band, splitting search results
 * — silently resolved the flag to `undefined` and every card in that list
 * rendered as freely selectable. The flag now travels on the candidate itself,
 * where nesting cannot reach past it.
 *
 * @param {Object} params
 * @param {boolean} [params.canSelect] - Step-level budget/legality for this card.
 * @param {boolean} [params.selected]
 * @param {boolean} [params.deselect]
 * @param {string|null} [params.state]
 * @param {boolean} [params.disabled] - Explicit disable, independent of budget.
 * @param {string} [params.title]
 * @param {string} [params.name]
 * @param {string|null} [params.verb]
 * @returns {{state: string|null, disabled: boolean, deselect: boolean, selected: boolean,
 *           title: string, label: string, ariaLabel: string}}
 */
export function buildOptionCardAction({
  canSelect = true,
  selected = false,
  deselect = false,
  state = null,
  disabled = false,
  title = '',
  name = '',
  verb = null,
} = {}) {
  const blocked = disabled === true || canSelect === false;
  const presentation = resolveOptionCardAction({ state, selected, deselect, name, verb });

  return {
    state: state ?? null,
    // A selected card stays actionable when the step offers removal through the
    // same control, even once the budget is spent.
    disabled: blocked && !deselect,
    deselect: !!deselect,
    selected: !!selected,
    title: title || presentation.ariaLabel,
    label: presentation.label,
    ariaLabel: presentation.ariaLabel,
  };
}
