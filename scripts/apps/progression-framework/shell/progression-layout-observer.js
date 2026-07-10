/**
 * Progression Layout Observer
 *
 * Applies responsive classes from the actual progression shell size, not just
 * the browser viewport. This covers resized Foundry windows, sidebar-open
 * layouts, browser zoom, and low-height 16:9 laptop screens.
 */

const OBSERVER_KEY = Symbol.for('swse.progression.layoutObserver');

function shellFor(target) {
  return target?.closest?.('.progression-shell') || target?.querySelector?.('.progression-shell') || null;
}

function classify(shell, rect) {
  const width = Number(rect?.width || shell?.clientWidth || 0);
  const height = Number(rect?.height || shell?.clientHeight || 0);

  const compact = width < 1180 || height < 760 || (width < 1380 && height < 820);
  const narrow = width < 900;
  const tiny = width < 700;
  const short = height < 700;
  const laptopWideShort = width < 1380 && height < 820 && width >= 1180;

  shell.classList.toggle('is-prog-compact', compact);
  shell.classList.toggle('is-prog-narrow', narrow);
  shell.classList.toggle('is-prog-tiny', tiny);
  shell.classList.toggle('is-prog-short', short);
  shell.classList.toggle('is-prog-laptop-short', laptopWideShort);

  shell.dataset.progLayoutWidth = String(Math.round(width));
  shell.dataset.progLayoutHeight = String(Math.round(height));
  shell.dataset.progLayoutMode = tiny ? 'tiny' : narrow ? 'narrow' : compact ? 'compact' : 'desktop';
}

export function observeProgressionLayout(root) {
  const shell = shellFor(root);
  if (!shell || typeof ResizeObserver === 'undefined') return;

  if (shell[OBSERVER_KEY]?.observer) {
    classify(shell, shell.getBoundingClientRect());
    return;
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries?.[0];
    classify(shell, entry?.contentRect || shell.getBoundingClientRect());
  });

  observer.observe(shell);
  shell[OBSERVER_KEY] = { observer };
  classify(shell, shell.getBoundingClientRect());
}

export function disconnectProgressionLayoutObserver(root) {
  const shell = shellFor(root);
  const observer = shell?.[OBSERVER_KEY]?.observer;
  if (observer) observer.disconnect();
  if (shell) delete shell[OBSERVER_KEY];
}

if (typeof window !== 'undefined') {
  window.swseProgressionLayoutObserver = {
    observe: observeProgressionLayout,
    disconnect: disconnectProgressionLayoutObserver,
  };
}
