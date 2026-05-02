import SWSEApplicationV2 from '/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js';

export class AttributeMentorDialog extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = {
    ...SWSEApplicationV2.DEFAULT_OPTIONS,
    id: 'swse-attribute-mentor-dialog',
    classes: [
      ...(SWSEApplicationV2.DEFAULT_OPTIONS?.classes || []),
      'swse',
      'swse-attribute-mentor-dialog'
    ],
    position: {
      width: 900,
      height: 'auto'
    },
    window: {
      title: 'Ask Mentor: Attribute Builds',
      resizable: true,
      draggable: true,
      frame: true
    }
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/dialogs/attribute-mentor-dialog.hbs'
    }
  };

  constructor({ builds = [], method = 'point-buy', pointBuyPool = null, intro = '', onApply = null } = {}) {
    super({});
    this.builds = Array.isArray(builds) ? builds : [];
    this.method = method;
    this.pointBuyPool = pointBuyPool;
    this.intro = intro;
    this.onApply = typeof onApply === 'function' ? onApply : null;
  }

  async _prepareContext() {
    return {
      intro: this.intro,
      methodLabel: this.#methodLabel(this.method),
      pointBuyPool: this.pointBuyPool,
      isPointBuy: this.method === 'point-buy',
      builds: this.builds.map((build) => ({
        ...build,
        reasons: Array.isArray(build.reasons) ? build.reasons.map((reason) => reason?.text || reason).filter(Boolean) : [],
        cautions: Array.isArray(build.cautions) ? build.cautions.map((reason) => reason?.text || reason).filter(Boolean) : [],
        forecasts: Array.isArray(build.forecasts) ? build.forecasts.map((reason) => reason?.text || reason).filter(Boolean) : []
      }))
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    root.querySelectorAll('[data-build-apply]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const buildId = event.currentTarget?.dataset?.buildApply;
        const build = this.builds.find((entry) => entry.id === buildId);
        if (!build) return;
        if (this.onApply) {
          await this.onApply(build);
        }
        await this.close();
      });
    });

    root.querySelectorAll('[data-action="close-dialog"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.close();
      });
    });
  }

  #methodLabel(method) {
    switch (method) {
      case 'point-buy': return 'Point Buy';
      case 'array': return 'Array Placement';
      case 'standard': return 'Rolled Scores';
      case 'organic': return 'Organic Dice';
      default: return 'Attributes';
    }
  }
}
