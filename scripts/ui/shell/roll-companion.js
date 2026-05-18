/**
 * Holopad-wide roll companion.
 * Displays a stylized in-holopad visual modal for any roll initiated from
 * inside the SWSE shell/holopad/datapad. Chat cards remain authoritative.
 *
 * Usage:
 *   import { showHolopadRollCompanion } from '.../roll-companion.js';
 *   showHolopadRollCompanion(source, result, { kind: 'force', title: 'Battle Strike' });
 *
 * Source may be:
 *   - An HTMLElement (e.g., the button that was clicked)
 *   - A FoundryVTT ApplicationV2 instance (sheet) — reads .element
 *
 * Design constraints:
 *   - NEVER calls new Roll(), Roll.create(), or .roll()
 *   - NEVER replaces or modifies chat cards
 *   - Exactly one companion element per sheet — replaced on each new roll
 */

const COMPANION_CLASS = 'swse-holopad-roll-companion';
const AUTO_DISMISS_MS = 4500;

/**
 * The ordered list of selectors tried when walking up from the source element
 * to find the holopad screen root for the companion overlay.
 *
 * Priority:
 *   1. .swse-v2-screen--concept  — character sheet/holopad screen (has position:absolute + isolate)
 *   2. .swse-ui-shell             — NPC sheet root
 *   3. .swse-character-sheet-wrapper — legacy character sheet fallback
 *   4. [data-appid]               — FoundryVTT v13 ApplicationV2 root
 */
const HOLOPAD_ROOT_SELECTORS = [
  '.swse-v2-screen--concept',
  '.swse-ui-shell',
  '.swse-character-sheet-wrapper',
  '[data-appid]',
];

/**
 * Show the holopad roll companion modal inside the sheet that originated the roll.
 *
 * @param {HTMLElement|Application} source - Button element or sheet Application instance
 * @param {object} rollResult - Result object returned by the roll engine
 * @param {object} [options] - Display options
 * @param {string} [options.kind]      - 'force'|'attack'|'damage'|'skill'|'ability'|'initiative'
 * @param {string} [options.title]     - Label for the roll (e.g., power/weapon/skill name)
 * @param {string} [options.subtitle]  - Secondary label
 * @param {string} [options.actorName] - Name of the rolling actor
 * @param {string} [options.itemName]  - Name of the item/power/weapon used
 * @param {number} [options.dc]        - DC for the roll, if applicable
 * @returns {boolean} true if companion was displayed, false if no root found
 */
export function showHolopadRollCompanion(source, rollResult, options = {}) {
  const root = _findHolopadRoot(source);
  if (!root) return false;

  const model = _normalizeRollResult(rollResult, options);
  const host = _ensureCompanionHost(root);
  _renderCompanion(host, model);
  return true;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function _findHolopadRoot(source) {
  let el = null;

  if (source instanceof HTMLElement) {
    el = source;
  } else if (source?.element instanceof HTMLElement) {
    // FoundryVTT v13 ApplicationV2
    el = source.element;
  } else if (source?.element?.[0] instanceof HTMLElement) {
    // jQuery fallback (v1 sheets)
    el = source.element[0];
  }

  if (!el) return null;

  for (const sel of HOLOPAD_ROOT_SELECTORS) {
    const match = el.matches?.(sel) ? el : el.closest?.(sel);
    if (match) return match;
  }

  return null;
}

function _normalizeRollResult(result, options = {}) {
  // result may be a FoundryVTT Roll object (has .total, .dice, .formula)
  // or one of the structured engine result objects
  const rawRoll = result?.roll ?? (result?.total != null && result?.dice ? result : null);
  const dice = _extractDiceResults(rawRoll);
  const d20 = dice.find(d => d.faces === 20);

  // Prefer result.d20 (pre-computed from engine) over extracting from dice
  const d20Result = result?.d20 ?? d20?.result ?? null;
  const total = rawRoll?.total ?? result?.total ?? null;

  return {
    kind:       options.kind      ?? result?.kind      ?? 'generic',
    title:      options.title     ?? result?.title     ?? result?.label     ?? 'Roll',
    subtitle:   options.subtitle  ?? result?.subtitle  ?? null,
    actorName:  options.actorName ?? result?.actorName ?? null,
    itemName:   options.itemName  ?? result?.itemName  ?? result?.powerName ?? result?.power ?? null,

    formula:  rawRoll?.formula ?? result?.formula ?? null,
    die:      d20Result,
    dice,
    modifier: result?.modifier ?? null,
    total,

    dc:         options.dc ?? result?.dc      ?? null,
    success:    result?.success               ?? null,
    isHit:      result?.isHit                 ?? null,
    degree:     result?.degree                ?? null,
    tierLabel:  result?.tierLabel ?? result?.tier ?? null,
    effectText: result?.effectText ?? result?.effect ?? null,

    isCritical:   result?.critConfirmed ?? result?.isCritical ?? (d20Result === 20) ?? false,
    isFumble:     result?.isFumble                            ?? (d20Result === 1)  ?? false,
    isNatural20:  result?.isNat20 ?? (d20Result === 20),
    isNatural1:   d20Result === 1,

    damageType:    result?.damageType ?? null,
    tags:          Array.isArray(result?.tags) ? result.tags : [],

    chatMessageId: result?.chatMessageId ?? result?.messageId ?? result?.message?.id ?? null,
    rawRoll,
  };
}

function _extractDiceResults(roll) {
  if (!roll) return [];
  try {
    const termSource = roll.dice ?? roll.terms?.filter(t => Array.isArray(t.results)) ?? [];
    return termSource.flatMap(die => {
      const faces = die.faces ?? die.sides ?? 20;
      return (die.results ?? []).map(r => ({
        faces,
        result:    r.result,
        discarded: r.discarded  ?? false,
        exploded:  r.exploded   ?? false,
      }));
    });
  } catch {
    return [];
  }
}

function _ensureCompanionHost(root) {
  let host = root.querySelector(`:scope > .${COMPANION_CLASS}`);
  if (!host) {
    host = document.createElement('div');
    host.className = COMPANION_CLASS;
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-atomic', 'true');
    root.appendChild(host);
  }
  return host;
}

let _dismissTimer = null;

function _renderCompanion(host, model) {
  clearTimeout(_dismissTimer);

  const kindClass    = `kind-${model.kind}`;
  const critClass    = model.isCritical    ? 'is-critical' : '';
  const fumbleClass  = model.isFumble      ? 'is-fumble'   : '';
  const successState = model.success === true  ? 'is-success'
                     : model.success === false ? 'is-failure'
                     : model.isHit === true    ? 'is-success'
                     : model.isHit === false   ? 'is-failure'
                     : '';

  host.className = [COMPANION_CLASS, kindClass, critClass, fumbleClass, successState, 'is-visible']
    .filter(Boolean).join(' ');
  host.dataset.kind = model.kind;

  const dieDisplay = model.die !== null
    ? String(model.die)
    : (model.total !== null ? String(model.total) : '—');

  const callout = model.isNatural20 ? 'NATURAL 20'
                : model.isNatural1  ? 'FUMBLE'
                : model.isCritical  ? 'CRITICAL'
                : '';

  // Determine hit/miss label
  const hitLabel = model.isHit === true  ? 'HIT'
                 : model.isHit === false ? 'MISS'
                 : model.success === true  ? 'SUCCESS'
                 : model.success === false ? 'FAILURE'
                 : '';

  host.innerHTML = `
    <div class="hrc-inner">
      <button type="button" class="hrc-close" aria-label="Dismiss">✕</button>
      ${model.title    ? `<div class="hrc-title">${_esc(model.title)}</div>`    : ''}
      ${model.actorName ? `<div class="hrc-actor">${_esc(model.actorName)}</div>` : ''}
      ${model.itemName  ? `<div class="hrc-item">${_esc(model.itemName)}</div>`   : ''}
      <div class="hrc-die-zone" aria-label="Die result: ${dieDisplay}">
        <div class="hrc-die${callout ? ' hrc-die--callout' : ''}">${_esc(dieDisplay)}</div>
      </div>
      ${model.formula  ? `<div class="hrc-formula">${_esc(model.formula)}</div>` : ''}
      ${model.total !== null ? `<div class="hrc-total">Total: <strong>${model.total}</strong></div>` : ''}
      ${model.dc !== null  ? `<div class="hrc-dc">DC ${model.dc}</div>` : ''}
      ${hitLabel           ? `<div class="hrc-outcome ${hitLabel.toLowerCase()}">${hitLabel}</div>` : ''}
      ${model.tierLabel    ? `<div class="hrc-tier">${_esc(model.tierLabel)}</div>`   : ''}
      ${model.effectText   ? `<div class="hrc-effect">${_esc(model.effectText)}</div>` : ''}
      ${callout            ? `<div class="hrc-callout">${callout}</div>` : ''}
      ${model.damageType   ? `<div class="hrc-dmgtype">${_esc(model.damageType)}</div>` : ''}
      ${model.chatMessageId ? `<div class="hrc-chat-cue">↗ Chat</div>` : ''}
    </div>
  `.trim();

  host.querySelector('.hrc-close')?.addEventListener('click', () => _dismissCompanion(host), { once: true });
  _dismissTimer = setTimeout(() => _dismissCompanion(host), AUTO_DISMISS_MS);
}

function _dismissCompanion(host) {
  clearTimeout(_dismissTimer);
  host.classList.remove('is-visible');
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
