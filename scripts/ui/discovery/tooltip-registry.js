/**
 * Tooltip Registry & Renderer
 *
 * Maps string IDs (data-swse-tooltip) to localization keys.
 * Attaches hover/focus listeners to render positioned tooltips.
 */

const ATTR = 'data-swse-tooltip';
const TOOLTIP_CLASS = 'swse-discovery-tooltip';
const SYSTEM_ID = 'foundryvtt-swse';

let _activeTooltip = null;

/**
 * Registry of all tooltip definitions.
 * Keys match data-swse-tooltip attribute values.
 * Values are i18n key prefixes; the system appends .Title and .Body.
 */
const TOOLTIP_DEFS = {
  // Character Sheet - Core Stats
  'HitPoints':        'SWSE.Discovery.Tooltip.HitPoints',
  'DamageThreshold':  'SWSE.Discovery.Tooltip.DamageThreshold',
  'ForcePoints':      'SWSE.Discovery.Tooltip.ForcePoints',
  'DestinyPoints':    'SWSE.Discovery.Tooltip.DestinyPoints',
  'ConditionTrack':   'SWSE.Discovery.Tooltip.ConditionTrack',
  'BaseAttackBonus':  'SWSE.Discovery.Tooltip.BaseAttackBonus',
  'Grapple':          'SWSE.Discovery.Tooltip.Grapple',
  'Initiative':       'SWSE.Discovery.Tooltip.Initiative',

  // Defenses
  'ReflexDefense':    'SWSE.Discovery.Tooltip.ReflexDefense',
  'FortitudeDefense': 'SWSE.Discovery.Tooltip.FortitudeDefense',
  'WillDefense':      'SWSE.Discovery.Tooltip.WillDefense',
  'FlatFooted':       'SWSE.Discovery.Tooltip.FlatFooted',

  // Ability Scores
  'AbilityScore':     'SWSE.Discovery.Tooltip.AbilityScore',
  'AbilityModifier':  'SWSE.Discovery.Tooltip.AbilityModifier',

  // Skills
  'SkillTrained':     'SWSE.Discovery.Tooltip.SkillTrained',
  'SkillRoll':        'SWSE.Discovery.Tooltip.SkillRoll',

  // Feats & Talents
  'PassiveTalent':    'SWSE.Discovery.Tooltip.PassiveTalent',
  'ActiveTalent':     'SWSE.Discovery.Tooltip.ActiveTalent',
  'UsageLimit':       'SWSE.Discovery.Tooltip.UsageLimit',

  // Equipment
  'WeaponAttack':     'SWSE.Discovery.Tooltip.WeaponAttack',
  'WeaponDamage':     'SWSE.Discovery.Tooltip.WeaponDamage',
  'ArmorPenalty':      'SWSE.Discovery.Tooltip.ArmorPenalty',

  // Action Palette
  'ActionPalette':    'SWSE.Discovery.Tooltip.ActionPalette',
  'PaletteMode':      'SWSE.Discovery.Tooltip.PaletteMode',
  'ActionDisabled':   'SWSE.Discovery.Tooltip.ActionDisabled',

  // Chargen
  'ChargenNarrative': 'SWSE.Discovery.Tooltip.ChargenNarrative',
  'ChargenMentor':    'SWSE.Discovery.Tooltip.ChargenMentor',
  'ChargenRollMethod':'SWSE.Discovery.Tooltip.ChargenRollMethod',
  'ChargenSpecies':   'SWSE.Discovery.Tooltip.ChargenSpecies',
  'ChargenClass':     'SWSE.Discovery.Tooltip.ChargenClass',
  'ChargenLockin':    'SWSE.Discovery.Tooltip.ChargenLockin',

  // Mentor / Dialogue
  'MentorDialogue':   'SWSE.Discovery.Tooltip.MentorDialogue',
  'AurebeshTranslation': 'SWSE.Discovery.Tooltip.AurebeshTranslation',

  // GM Tools
  'TacticalOverlay':  'SWSE.Discovery.Tooltip.TacticalOverlay',
  'GMSuggestion':     'SWSE.Discovery.Tooltip.GMSuggestion',
  'GMPaletteMode':    'SWSE.Discovery.Tooltip.GMPaletteMode'
};

/**
 * Resolve a tooltip definition to localized title + body.
 * @param {string} id - tooltip key
 * @returns {{title: string, body: string} | null}
 */
function resolve(id) {
  const prefix = TOOLTIP_DEFS[id];
  if (!prefix) return null;
  return {
    title: game.i18n.localize(`${prefix}.Title`),
    body: game.i18n.localize(`${prefix}.Body`)
  };
}

/** Remove any active tooltip from the DOM. */
function hideTooltip() {
  if (_activeTooltip) {
    _activeTooltip.remove();
    _activeTooltip = null;
  }
}

/**
 * Create and position a tooltip element near the anchor.
 * @param {HTMLElement} anchor
 * @param {{title: string, body: string}} content
 */
function showTooltip(anchor, content) {
  hideTooltip();

  const el = document.createElement('div');
  el.classList.add(TOOLTIP_CLASS);
  el.setAttribute('role', 'tooltip');

  const titleEl = document.createElement('div');
  titleEl.classList.add(`${TOOLTIP_CLASS}__title`);
  titleEl.textContent = content.title;
  el.appendChild(titleEl);

  const bodyEl = document.createElement('div');
  bodyEl.classList.add(`${TOOLTIP_CLASS}__body`);
  bodyEl.textContent = content.body;
  el.appendChild(bodyEl);

  document.body.appendChild(el);
  _activeTooltip = el;

  // Position
  const rect = anchor.getBoundingClientRect();
  const tipRect = el.getBoundingClientRect();
  let top = rect.top - tipRect.height - 8;
  let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

  // Flip below if no room above
  if (top < 4) {
    top = rect.bottom + 8;
    el.classList.add(`${TOOLTIP_CLASS}--below`);
  }
  // Clamp horizontally
  left = Math.max(4, Math.min(left, window.innerWidth - tipRect.width - 4));

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

export const TooltipRegistry = {

  /** All registered tooltip IDs (for debugging / enumeration) */
  get ids() { return Object.keys(TOOLTIP_DEFS); },

  /**
   * Scan a root element for [data-swse-tooltip] and attach listeners.
   * Safe to call multiple times on re-render (idempotent via marker).
   * @param {HTMLElement} root
   */
  bind(root) {
    if (!(root instanceof HTMLElement)) return;
    const els = root.querySelectorAll(`[${ATTR}]`);
    for (const el of els) {
      if (el._swseTooltipBound) continue;
      el._swseTooltipBound = true;

      // Ensure keyboard focusable
      if (!el.getAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }

      el.addEventListener('mouseenter', _onEnter);
      el.addEventListener('mouseleave', hideTooltip);
      el.addEventListener('focus', _onEnter);
      el.addEventListener('blur', hideTooltip);
    }
  },

  /** Remove all tooltips (cleanup). */
  hide: hideTooltip,

  /**
   * Register a custom tooltip at runtime.
   * @param {string} id
   * @param {string} i18nPrefix - e.g. 'SWSE.Discovery.Tooltip.MyThing'
   */
  register(id, i18nPrefix) {
    TOOLTIP_DEFS[id] = i18nPrefix;
  }
};

function _onEnter(ev) {
  const id = ev.currentTarget.getAttribute(ATTR);
  if (!id) return;
  const content = resolve(id);
  if (!content) return;
  showTooltip(ev.currentTarget, content);
}
