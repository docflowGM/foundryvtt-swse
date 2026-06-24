/**
 * Lightweight in-app modal helpers for GM Datapad surfaces.
 *
 * Foundry Dialog windows can render behind the oversized holopad shell in the GM
 * command surface. These helpers mount confirmations inside the datapad screen so
 * destructive / branching decisions stay visible and keyboard-accessible.
 */

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function findModalMount(anchor) {
  return anchor?.closest?.('.gm-command-screen-v2--phase2')
    || anchor?.closest?.('.gm-command-screen-v2')
    || anchor?.closest?.('.gm-datapad-page')
    || document.body;
}

function removeModal(layer) {
  try { layer?.remove?.(); } catch (_err) { /* best effort */ }
}

/**
 * Render a visible confirmation modal inside the GM Datapad shell.
 *
 * @param {HTMLElement} anchor - A clicked button or current surface element.
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.detail]
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {'danger'|'warning'|'info'|'success'} [options.tone]
 * @returns {Promise<boolean>}
 */
export function confirmGmDatapadModal(anchor, options = {}) {
  const mount = findModalMount(anchor);
  const title = escapeHtml(options.title || 'Confirm Action');
  const message = escapeHtml(options.message || 'Proceed with this GM Datapad action?');
  const detail = String(options.detail ?? '').trim();
  const confirmLabel = escapeHtml(options.confirmLabel || 'Confirm');
  const cancelLabel = escapeHtml(options.cancelLabel || 'Cancel');
  const tone = ['danger', 'warning', 'info', 'success'].includes(options.tone) ? options.tone : 'info';

  return new Promise((resolve) => {
    const layer = document.createElement('div');
    layer.className = `gm-datapad-modal-layer gm-datapad-modal-layer--${tone}`;
    layer.setAttribute('role', 'presentation');
    layer.innerHTML = `
      <section class="gm-datapad-modal gm-datapad-modal--${tone}" role="dialog" aria-modal="true" aria-label="${title}">
        <header class="gm-datapad-modal__head">
          <span class="gm-command-eyebrow">GM CONFIRMATION</span>
          <h3>${title}</h3>
          <button type="button" class="gm-datapad-modal__close" data-modal-answer="cancel" aria-label="Close">×</button>
        </header>
        <div class="gm-datapad-modal__body">
          <p>${message}</p>
          ${detail ? `<div class="gm-datapad-modal__detail">${escapeHtml(detail)}</div>` : ''}
        </div>
        <footer class="gm-datapad-modal__foot">
          <button type="button" class="gm-datapad-modal__button" data-modal-answer="cancel">${cancelLabel}</button>
          <button type="button" class="gm-datapad-modal__button gm-datapad-modal__button--confirm" data-modal-answer="confirm">${confirmLabel}</button>
        </footer>
      </section>
    `;

    const cleanup = (answer) => {
      document.removeEventListener('keydown', onKeyDown, true);
      removeModal(layer);
      resolve(answer === true);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cleanup(false);
      }
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        cleanup(true);
      }
    };

    layer.addEventListener('click', (event) => {
      const target = event.target;
      if (target === layer) {
        cleanup(false);
        return;
      }
      const answerButton = target?.closest?.('[data-modal-answer]');
      if (!answerButton) return;
      event.preventDefault();
      cleanup(answerButton.dataset.modalAnswer === 'confirm');
    });

    mount.appendChild(layer);
    document.addEventListener('keydown', onKeyDown, true);
    window.setTimeout(() => {
      layer.querySelector('[data-modal-answer="cancel"]')?.focus?.();
    }, 0);
  });
}
