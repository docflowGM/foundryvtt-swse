/**
 * Modification V2 DEVELOPMENT workflow switch (world setting `modificationV2DevelopmentMode`, GM-configured, default OFF).
 *
 * When on, a GM may install the small DEVELOPMENT_SET -- definitions whose effects are source-certified but whose installation procedure is
 * still an open rules question (D-013) -- under an explicitly labeled GM development policy, and those installs apply their source-certified
 * effects. It is never canonical: nothing is made runtime-selectable, every instance records its basis, and turning the setting off removes
 * the effects again (they are derived, never written into the Item).
 */
export const DEVELOPMENT_SETTING = 'modificationV2DevelopmentMode';
export const DEVELOPMENT_BASIS = 'DEVELOPMENT_GM_POLICY';
// Armor Reinforcement's "DR 2 against piercing" matches only the physical subtype the attack recorded (D-016: the selected form's canonical
// damage type, "and" = all, "or" = the chosen one), carried from rollDamage to the mitigation authority; never all kinetic damage.
export const DEVELOPMENT_SET = Object.freeze(['kotor-accessory-improved-energy-cell::weapon', 'kotor-accessory-mesh-underlay::armor', 'kotor-accessory-armor-reinforcement::armor']);
// Gear (equipment domain): the Scum and Villainy Table 2-3 universal upgrades (D-005 host scope). Their price and slot cost are
// table-verified; which hosts they attach to is open (D-005), so each install needs an explicit GM host ruling. Their effects are not
// certified, so nothing is automated -- the instance is a GM-adjudicated record. The legacy gear list (GEAR_MODS) stays alongside.
export const DEVELOPMENT_EQUIPMENT_SET = Object.freeze(['sv-cheater', 'sv-cloaked', 'sv-dual-gear', 'sv-electrograpple-handle', 'sv-environmental-sealing', 'sv-extra-power-source', 'sv-memory-upgrade', 'sv-memory-upgrade-advanced', 'sv-miniaturized', 'sv-recognition-system', 'sv-remote-activation', 'sv-secret-compartment', 'sv-silverplate', 'sv-spring-loaded', 'sv-storage-capacity'].map((id) => `${id}::equipment`));
export const DEVELOPMENT_EQUIPMENT_POLICY = 'D-005 pending: universal upgrade on this gear item by explicit GM host ruling (GM development policy); published Table 2-3 price and slots; no automated effects';
export const DEVELOPMENT_POLICY = 'D-013 pending: Scum and Villainy Table 2-2 applied by upgrade points as a GM development policy (not a published cross-reference)';

export function isDevelopmentModeEnabled() {
  try { return globalThis.game?.settings?.get?.('foundryvtt-swse', DEVELOPMENT_SETTING) === true; } catch { return false; }
}
export default { DEVELOPMENT_SETTING, DEVELOPMENT_BASIS, DEVELOPMENT_SET, DEVELOPMENT_POLICY, DEVELOPMENT_EQUIPMENT_SET, DEVELOPMENT_EQUIPMENT_POLICY, isDevelopmentModeEnabled };
