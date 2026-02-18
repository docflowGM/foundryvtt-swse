/**
 * AbilityRegistry
 * Minimal registry (migration seed). Expanded via adapters over time.
 *
 * TODO: SpeciesAbilityAdapter will register activated species abilities here.
 */

// eslint-disable-next-line
import registryData from '../../../data/ability-registry.json' with { type: 'json' };

function _norm(s) {
  return String(s ?? '').trim().toLowerCase();
}

export class AbilityRegistry {
  static #byTypeAndName = new Map();

  static initialize() {
    this.#byTypeAndName.clear();
    const abilities = registryData?.abilities || [];
    for (const a of abilities) {
      const key = `${_norm(a.sourceType)}::${_norm(a.sourceId || a.name)}`;
      this.#byTypeAndName.set(key, a);
    }
  }

  static find(sourceType, sourceIdOrName) {
    return this.#byTypeAndName.get(`${_norm(sourceType)}::${_norm(sourceIdOrName)}`) || null;
  }
}

AbilityRegistry.initialize();
