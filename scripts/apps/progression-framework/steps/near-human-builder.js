/**
 * NearHumanBuilder — standalone state management for Near-Human trait selection
 */

export class NearHumanBuilder {
  constructor() {
    this._state = {
      traitId: null,
      sacrifice: null,
      variants: [],
      abilityAdjustments: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    };
    this._traitsData = null;
    this._handlers = [];
    this._isWired = false;
  }

  async loadData() {
    // Load traits and variants from JSON
    const traitsPath = 'data/near-human-traits.json';
    const variantsPath = 'data/near-human-houserules.json';
    try {
      const traits = await fetch(`systems/foundryvtt-swse/${traitsPath}`).then(r => r.json());
      const houserules = await fetch(`systems/foundryvtt-swse/${variantsPath}`).then(r => r.json());
      this._traitsData = {
        traits: traits.traits || [],
        variants: (houserules.variants || []).filter(v => v.enabled !== false),
      };
    } catch (e) {
      console.warn('[NearHumanBuilder] Failed to load data:', e);
      this._traitsData = { traits: [], variants: [] };
    }
  }

  reset() {
    this._state = {
      traitId: null,
      sacrifice: null,
      variants: [],
      abilityAdjustments: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    };
  }

  validate() {
    const hasTrait = this._state.traitId !== null;
    const hasSacrifice = this._state.sacrifice !== null;

    let abilityAdjValid = true;
    if (this._state.traitId === 'abilityAdjustment') {
      const adj = this._state.abilityAdjustments;
      const plusTwo = Object.entries(adj).filter(([, v]) => v === 2).map(([k]) => k);
      const minusTwo = Object.entries(adj).filter(([, v]) => v === -2).map(([k]) => k);
      abilityAdjValid = plusTwo.length === 1 && minusTwo.length === 1 && plusTwo[0] !== minusTwo[0];
    }

    return {
      hasTrait,
      hasSacrifice,
      abilityAdjValid,
      isValid: hasTrait && hasSacrifice && abilityAdjValid,
    };
  }

  getBuilderData() {
    return {
      traitsData: this._traitsData,
      state: { ...this._state },
      validation: this.validate(),
      selectedTrait: this._traitsData?.traits.find(t => t.id === this._state.traitId) ?? null,
      selectedVariants: this._state.variants
        .map(id => this._traitsData?.variants.find(v => v.id === id))
        .filter(Boolean),
      builderSummary: {
        abilityAdjustments: this._formatAbilityAdjustments(),
        retainedBenefit: this._formatRetainedBenefit(),
        replacedBenefit: this._formatReplacedBenefit(),
      },
    };
  }

  buildNearHumanPackage() {
    const trait = this._traitsData?.traits.find(t => t.id === this._state.traitId);
    return {
      speciesName: 'Near-Human',
      trait: {
        id: trait?.id,
        name: trait?.name,
        description: trait?.description,
        type: this._state.traitId,
      },
      sacrifice: this._state.sacrifice,
      variants: this._state.variants.map(id =>
        this._traitsData?.variants.find(v => v.id === id)
      ).filter(Boolean),
      customAbilityChoices:
        this._state.traitId === 'abilityAdjustment' ? { ...this._state.abilityAdjustments } : null,
    };
  }

  wireDOM(workSurfaceEl, shell) {
    if (!workSurfaceEl || this._isWired) return;
    this._isWired = true;

    // Sacrifice radio buttons
    workSurfaceEl.querySelectorAll('.nh-sacrifice-radio').forEach(radio => {
      const fn = (e) => {
        this._state.sacrifice = e.target.value;
        shell.render();
      };
      radio.addEventListener('change', fn);
      this._handlers.push({ el: radio, event: 'change', fn });
    });

    // Trait buttons
    workSurfaceEl.querySelectorAll('.nh-trait-btn').forEach(btn => {
      const fn = (e) => {
        e.preventDefault();
        const id = btn.dataset.traitId;
        this._state.traitId = this._state.traitId === id ? null : id;
        shell.render();
      };
      btn.addEventListener('click', fn);
      this._handlers.push({ el: btn, event: 'click', fn });
    });

    // Variant chips
    workSurfaceEl.querySelectorAll('.nh-variant-chip').forEach(chip => {
      const fn = (e) => {
        e.preventDefault();
        const id = chip.dataset.variantId;
        if (this._state.variants.includes(id)) {
          this._state.variants = this._state.variants.filter(v => v !== id);
        } else if (this._state.variants.length < 3) {
          this._state.variants.push(id);
        }
        shell.render();
      };
      chip.addEventListener('click', fn);
      this._handlers.push({ el: chip, event: 'click', fn });
    });

    // Ability buttons (only if Ability Adjustment trait selected)
    if (this._state.traitId === 'abilityAdjustment') {
      workSurfaceEl.querySelectorAll('.nh-ability-btn').forEach(btn => {
        const fn = (e) => {
          e.preventDefault();
          const ability = btn.dataset.ability;
          const delta = parseInt(btn.dataset.delta, 10);
          const current = this._state.abilityAdjustments[ability] ?? 0;
          const newVal = Math.max(-2, Math.min(2, current + delta));

          // Clear conflicting adjustments
          if (newVal === 2) {
            Object.keys(this._state.abilityAdjustments).forEach(k => {
              if (k !== ability && this._state.abilityAdjustments[k] === 2) {
                this._state.abilityAdjustments[k] = 0;
              }
            });
          }
          if (newVal === -2) {
            Object.keys(this._state.abilityAdjustments).forEach(k => {
              if (k !== ability && this._state.abilityAdjustments[k] === -2) {
                this._state.abilityAdjustments[k] = 0;
              }
            });
          }

          this._state.abilityAdjustments[ability] = newVal;
          shell.render();
        };
        btn.addEventListener('click', fn);
        this._handlers.push({ el: btn, event: 'click', fn });
      });
    }
  }

  exitBuilderMode(resetState = true) {
    this._cleanupHandlers();
    if (resetState) this.reset();
  }

  _cleanupHandlers() {
    this._handlers.forEach(({ el, event, fn }) => {
      el.removeEventListener(event, fn);
    });
    this._handlers = [];
    this._isWired = false;
  }

  _formatAbilityAdjustments() {
    return Object.entries(this._state.abilityAdjustments).map(([key, value]) => ({
      key,
      label: this._abilityLabel(key),
      value,
      cssClass: value > 0 ? 'prog-num--pos' : value < 0 ? 'prog-num--neg' : 'prog-num--zero',
    }));
  }

  _formatRetainedBenefit() {
    if (!this._state.sacrifice) return null;
    return this._state.sacrifice === 'feat'
      ? '+1 Bonus Skill Training'
      : '+1 Starting General Feat';
  }

  _formatReplacedBenefit() {
    if (!this._state.sacrifice) return null;
    return this._state.sacrifice === 'feat'
      ? '+1 Starting General Feat (Sacrificed)'
      : '+1 Bonus Skill Training (Sacrificed)';
  }

  _abilityLabel(key) {
    const map = {
      str: 'Strength',
      dex: 'Dexterity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma',
    };
    return map[key] ?? key;
  }
}
