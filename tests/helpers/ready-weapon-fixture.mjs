// Shared fixtures for tests that need a weapon the READINESS authority (combat-readiness.js) treats as READY (E4-C1 WP5).
// A weapon is ready only with a canonical identity, a valid READIED record on certified appendages, a grip, species evidence and no unresolved
// transaction. These helpers build exactly that -- nothing is faked at the consumer: the production chain runs unchanged.
import { installSpeciesRegistryFixture } from './species-registry-fixture.mjs';
const { readActorEquipmentState } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-reader.js');
const { resolveActorSpeciesProfile } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/species-evidence-adapter.js');

export const REC = (posture, purpose, appendageIds) => ({ weaponPosture: posture, weaponOccupancy: { schemaVersion: 1, purpose, appendageIds } });
export const PISTOL_KEY = 'weapon-blaster-pistol';
export const SABER_KEY = 'lightsaber-chassis-archaic-lightsaber';

/** Installs the canonical weapon registry and the real species records. Call once, after the Foundry shim globals are installed. */
export async function installReadinessEnvironment(names) {
  const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
  const { registry } = await import('./weapon-runtime-fixture.mjs');
  rt.setSharedWeaponAuthorityRegistry(registry);
  return installSpeciesRegistryFixture(names);
}

/** A weapon Item-like with a canonical identity and an explicit declared record. */
export function weaponItem(id, { key = PISTOL_KEY, posture = 'STOWED', purpose = null, appendageIds = [], wielded = null, system = {}, flags = {}, name = 'Renamed Thing' } = {}) {
  return {
    id, name, type: 'weapon',
    flags: { swse: { canonicalWeapon: { identityKey: key }, ...(wielded ? { fireState: { v: 1, wielded } } : {}), ...(flags.swse ?? {}) }, ...Object.fromEntries(Object.entries(flags).filter(([k]) => k !== 'swse')) },
    system: { ...REC(posture, purpose, appendageIds), ...system },
  };
}
/** READIED on explicit appendages with an explicit one-handed grip. */
export const readiedWeapon = (id, opts = {}) => weaponItem(id, { posture: 'READIED', purpose: 'wield', appendageIds: ['natural-arm-1'], wielded: 'one-handed', ...opts });
export const equippedWeapon = (id, opts = {}) => weaponItem(id, { posture: 'EQUIPPED', purpose: 'hold', appendageIds: ['natural-arm-2'], ...opts });

/** An Actor-like with an items collection whose entries point back at it. */
export function actorOf(items, extra = {}) {
  items.get = (id) => items.find((i) => i.id === id);
  const a = { id: 'a1', type: 'character', name: 'Tester', items, system: { species: 'Human', size: 'Medium' }, flags: {}, ...extra };
  for (const i of items) if (!i.actor) i.actor = a;
  return a;
}

/**
 * Migration helper for fixtures that used to say `system.equipped: true`: gives each such weapon the first VALID READIED configuration the REAL
 * resolvers establish (one-handed on a free arm, else two-handed on both), in item order. Weapons without the directive are left STOWED-less
 * (no record) untouched. Nothing is faked at the consumer; if no configuration is established the weapon simply stays not ready.
 */
export function readyAllDirected(actor) {
  const species = resolveActorSpeciesProfile(actor);
  const profile = species.status === 'resolved' ? species.profile : undefined;
  const items = Array.from(actor.items);
  const configs = [[['natural-arm-1'], 'one-handed'], [['natural-arm-2'], 'one-handed'], [['natural-arm-1', 'natural-arm-2'], 'two-handed']];
  for (const w of items.filter((i) => i.type === 'weapon' && i.system?.equipped === true)) {
    delete w.system.equipped;
    for (const [ids, grip] of configs) {
      Object.assign(w.system, REC('READIED', 'wield', ids));
      w.flags = { ...(w.flags ?? {}), swse: { ...(w.flags?.swse ?? {}), fireState: { v: 1, wielded: grip } } };
      const st = readActorEquipmentState(actor, { resolveSpeciesProfile: () => profile });
      const e = st.weapons.find((x) => x.itemId === w.id);
      if (e?.effectivePosture === 'READIED' && !e.pending && !e.gates.length && !st.conflicts.length) break;
      Object.assign(w.system, REC('STOWED', null, []));
    }
  }
  return actor;
}
