import { POISON_DEFINITIONS } from './poison-definitions.js';

export class PoisonRegistry {
  static get(keyOrName) {
    const key = normalizePoisonKey(keyOrName);
    return POISON_DEFINITIONS[key] ? foundry.utils.deepClone(POISON_DEFINITIONS[key]) : null;
  }

  static all() {
    return Object.values(POISON_DEFINITIONS).map(def => foundry.utils.deepClone(def));
  }

  static has(keyOrName) {
    return !!this.get(keyOrName);
  }

  static byDelivery(delivery) {
    const wanted = normalizePoisonKey(delivery);
    return this.all().filter(def => (def.delivery || []).map(normalizePoisonKey).includes(wanted));
  }
}

export function normalizePoisonKey(value) {
  return String(value || '').toLowerCase().trim().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
