/**
 * Card gesture resolution.
 *
 * Extracted from ProgressionShell._wireDoubleClickSelection() so the shell and
 * its tests run the same code. The previous version of this logic lived only in
 * the shell, and the test kept a hand-copied "faithful" duplicate — which
 * promptly drifted, and encoded a defect the shell no longer had.
 *
 * The rules are small and worth stating exactly:
 *
 * - A card's marked action (`[data-card-action="true"]`) is the source of truth
 *   for what double-clicking that card does.
 * - A *disabled* marked action means the option cannot be taken. Double-click
 *   must do nothing at all — it must NOT fall through to the generic commit
 *   path, which is how a locked card could still be selected.
 * - The generic fallback exists only for legacy rows that have no marked action.
 * - One physical double-click is one action: the browser emits both a second
 *   `click` and a `dblclick`, so gestures are deduplicated per row.
 */

/** How long two events are treated as the same physical gesture. */
export const GESTURE_WINDOW_MS = 400;

const DISABLED_SELECTOR = '[data-card-action="true"]';

/**
 * The card's marked primary action, whether or not it is usable.
 * @param {Element} row
 * @returns {Element|null}
 */
export function findCardAction(row) {
  return row?.querySelector?.(DISABLED_SELECTOR) ?? null;
}

/**
 * Is this control unusable?
 * @param {Element|null} el
 * @returns {boolean}
 */
export function isDisabledControl(el) {
  if (!el) return false;
  if (el.disabled === true) return true;
  const aria = el.getAttribute?.('aria-disabled');
  return aria === 'true';
}

/**
 * Stable per-row gesture identity.
 *
 * Rows without an identity attribute get their own sticky marker: collapsing
 * them all to one empty key let two unrelated cards suppress each other.
 *
 * @param {Element} row
 * @param {{next: () => number}} sequence
 * @returns {string}
 */
export function rowGestureKey(row, sequence) {
  const data = row?.dataset ?? {};
  const identity = data.itemId || data.featId || data.treeId || data.nodeId
    || data.powerId || data.maneuverId || data.secretId || data.techniqueId;
  if (identity) return identity;
  if (row && !data.gestureKey) data.gestureKey = `row-${sequence.next()}`;
  return data.gestureKey || 'unknown';
}

/**
 * Decide what a card gesture should do.
 *
 * @param {Object} options
 * @param {Element} options.row - The resolved candidate row.
 * @param {Element} options.target - The element the event landed on.
 * @param {number} options.timeStamp
 * @param {Object} options.state - Mutable `{ key, at, seq }` carried by the caller.
 * @returns {{outcome: string, action: Element|null}}
 *   outcome: 'card-action' | 'blocked-disabled' | 'fallback-commit'
 *          | 'ignored-control' | 'deduplicated' | 'ignored'
 */
export function resolveCardGesture({ row, target, timeStamp, state }) {
  if (!row) return { outcome: 'ignored', action: null };

  // A click on a card's own control is already one deliberate action.
  if (target?.closest?.('[data-card-action="true"], .prog-quantity-btn')) {
    return { outcome: 'ignored-control', action: null };
  }

  const sequence = { next: () => (state.seq = (state.seq ?? 0) + 1) };
  const key = rowGestureKey(row, sequence);
  const now = Number(timeStamp) || Date.now();
  if (state.key === key && now - state.at < GESTURE_WINDOW_MS) {
    return { outcome: 'deduplicated', action: null };
  }
  state.key = key;
  state.at = now;

  const action = findCardAction(row);
  if (action) {
    // A disabled action is a decision, not an absence. Falling through to the
    // generic commit here is what let a locked card be selected by double-click.
    if (isDisabledControl(action)) return { outcome: 'blocked-disabled', action };
    return { outcome: 'card-action', action };
  }

  return { outcome: 'fallback-commit', action: null };
}
