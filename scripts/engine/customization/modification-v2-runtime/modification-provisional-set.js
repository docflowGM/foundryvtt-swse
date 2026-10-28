/**
 * The first, deliberately small set of Modification V2 typed definitions the GM-adjudicated provisional workflow offers (Scum and Villainy
 * weapon/armor upgrades with 0- and 1-point Table 2-2 rows and plain credit prices). Expanded explicitly, never by default.
 * Kept in its own module: these are definition ids, not weapon operation keys, and must not be read as weapon-runtime consumption.
 */
export const PROVISIONAL_SET = Object.freeze([
  'sv-targeting-scope-standard::weapon', 'sv-rangefinder::weapon', 'sv-ion-charger::weapon',
  'sv-vacuum-seals::armor', 'sv-climbing-claws::armor', 'sv-diagnostics-system::armor',
]);

export default PROVISIONAL_SET;
