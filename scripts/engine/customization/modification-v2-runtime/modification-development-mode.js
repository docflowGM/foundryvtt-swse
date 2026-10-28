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
export const DEVELOPMENT_SET = Object.freeze(['kotor-accessory-improved-energy-cell::weapon']);
export const DEVELOPMENT_POLICY = 'D-013 pending: Scum and Villainy Table 2-2 applied by upgrade points as a GM development policy (not a published cross-reference)';

export function isDevelopmentModeEnabled() {
  try { return globalThis.game?.settings?.get?.('foundryvtt-swse', DEVELOPMENT_SETTING) === true; } catch { return false; }
}
export default { DEVELOPMENT_SETTING, DEVELOPMENT_BASIS, DEVELOPMENT_SET, DEVELOPMENT_POLICY, isDevelopmentModeEnabled };
