/**
 * GMHealingSurfaceController
 *
 * Owns DOM wiring for the GM Combat & Recovery surface. Recovery mechanics stay
 * on the GM Datapad host and GMHealingTrigger so droid/rest rules remain in one
 * canonical path.
 */

export class GMHealingSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-healing');
    if (!pageElement) return;

    const triggerButton = pageElement.querySelector('[data-action="trigger-healing"]');
    if (triggerButton) {
      triggerButton.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.host._triggerNaturalHealing();
      }, { signal });
    }
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }
}
