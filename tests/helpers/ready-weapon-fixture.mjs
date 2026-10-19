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

/**
 * WP5-C1 migration helper for tests that call rollAttack with a weapon they never "drew": makes the weapon an Item the actor OWNS and gives it the
 * first valid READIED configuration the REAL resolvers establish alongside whatever the actor already holds; only if no free configuration works are
 * the actor's other drawn weapons stowed (the player drawing this one). Nothing is faked: a weapon the resolvers cannot establish (homebrew without
 * canonical identity, worn, no wielding class) stays not ready and the attack is correctly refused.
 */
export function ownAndReady(actor, weapon) {
  if (!actor || !weapon || weapon.type !== 'weapon' || !Array.isArray(actor.items)) return weapon;
  if (weapon.flags?.swse?.virtual === true && weapon.flags?.swse?.unarmed === true) return weapon; // the virtual unarmed source is never an owned Item
  if (!actor.items.includes(weapon)) {
    const dup = actor.items.findIndex((i) => i?.id === weapon.id);   // a different object with the same id: this attack source supersedes it
    if (dup >= 0) actor.items.splice(dup, 1, weapon); else actor.items.push(weapon);
  }
  actor.system ??= {};
  if (!actor.system.species) actor.system.species = 'Human';
  if (!actor.system.size) actor.system.size = 'medium';
  const species = resolveActorSpeciesProfile(actor);
  const profile = species.status === 'resolved' ? species.profile : undefined;
  delete weapon.system?.equipped;
  const already = () => { const st = readActorEquipmentState(actor, { resolveSpeciesProfile: () => profile }); const e = st.weapons.find((x) => x.itemId === weapon.id); return e?.effectivePosture === 'READIED' && !e.pending && !e.gates.length && !st.conflicts.length; };
  if (weapon.system?.weaponPosture === 'READIED' && already()) return weapon;   // an established configuration (e.g. a coordinator re-grip) is never overwritten
  const configs = [[['natural-arm-1'], 'one-handed'], [['natural-arm-2'], 'one-handed'], [['natural-arm-1', 'natural-arm-2'], 'two-handed']];
  const snapshot = { system: weapon.system, flags: weapon.flags };
  const explicitMounted = weapon.flags?.swse?.fireState?.mounted;   // an explicit owned tripod statement (true OR false) is never overridden by the fixture
  const explicitlyUnmounted = explicitMounted === false;
  const attempt = (mounted = false) => {
    if (mounted && explicitMounted !== undefined) return false;
    for (const [ids, grip] of configs) {
      weapon.system = { ...(weapon.system ?? {}), ...REC('READIED', 'wield', ids) };
      const fire = { ...(weapon.flags?.swse?.fireState ?? {}), v: 1, wielded: grip };
      if (mounted) fire.mounted = true; else if (explicitMounted === undefined) delete fire.mounted;
      weapon.flags = { ...(weapon.flags ?? {}), swse: { ...(weapon.flags?.swse ?? {}), fireState: fire } };
      const st = readActorEquipmentState(actor, { resolveSpeciesProfile: () => profile });
      const e = st.weapons.find((x) => x.itemId === weapon.id);
      if (e?.effectivePosture === 'READIED' && !e.pending && !e.gates.length && !st.conflicts.length) return true;
    }
    weapon.system = { ...weapon.system, ...REC('STOWED', null, []) };
    return false;
  };
  if (attempt() || attempt(true)) return weapon;   // else the verified tripod configuration (owned `mounted` state, two hands) for heavy weapons
  for (const other of actor.items) {
    if (other !== weapon && other.type === 'weapon' && ['READIED', 'EQUIPPED'].includes(other.system?.weaponPosture)) other.system = { ...other.system, ...REC('STOWED', null, []) };
  }
  if (!attempt() && !attempt(true)) { weapon.system = snapshot.system; weapon.flags = snapshot.flags; }   // nothing was established: leave the Item exactly as found
  return weapon;
}
