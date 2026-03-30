/**
 * Mobile Mode Detection
 *
 * Pure function to detect if the current environment is mobile-like.
 * No side effects — used by prompt system to decide whether to show opt-in dialog.
 */

/**
 * Detect if device is a mobile candidate.
 * Returns true if:
 * - Device has touch capability OR coarse pointer
 * - AND smallest dimension (width or height) is < 900px
 *
 * @returns {boolean}
 */
export function isMobileCandidate() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Touch capability (modern browsers)
  const isTouch = navigator.maxTouchPoints > 0;

  // Coarse pointer (touch-like input, catches hybrids)
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;

  // Small screen (use minimum dimension to catch portrait tablets too)
  const isSmall = Math.min(width, height) < 900;

  return (isTouch || isCoarse) && isSmall;
}
