/**
 * P6B launcher groundwork: STANDARD ammunition capacity of starship launchers, as printed in Starships of the Galaxy
 * (weapon descriptions, pp. 45-46; owner-cited and matching the clean OCR text in reference/sourcebooks).
 *
 *   Concussion missile launchers: light 6, medium 16, heavy 30 (more: +20% cost per missile, up to double).
 *   Proton torpedo launcher: 3 (more: +25% cost per torpedo, up to 16).
 *   Shieldbuster torpedo launcher: 4 (more: +25% cost per torpedo, up to 8).
 *   All mine launchers: 6 (more: +25% cost per mine, up to 12).
 *
 * Optional capacity EXPANSION is recorded but not usable: whether added capacity costs emplacement points, and which
 * cost the percentage applies to, is unresolved (V-P6A-03). Launchers without a printed capacity (discord missile,
 * proton grenade, defoliator, heavy ordnance) are unknown, never 0. Nothing here loads or expends
 * ammunition: those authorities do not exist yet. Pure data; no Foundry globals.
 */
const SRC = Object.freeze({ book: 'Starships of the Galaxy', printedPageRange: [45, 46] });
const entry = (standard, extraCostPercentPerUnit, maximum, section) =>
  Object.freeze({ standard, expansion: Object.freeze({ status: 'DEFERRED_RULES_REVIEW', decision: 'V-P6A-03', extraCostPercentPerUnit, maximum }), source: Object.freeze({ ...SRC, section }) });

export const LAUNCHER_CAPACITY = Object.freeze({
  'concussion-missile-launcher-light': entry(6, 20, 12, 'Concussion Missiles: Launchers'),
  'concussion-missile-launcher-medium': entry(16, 20, 32, 'Concussion Missiles: Launchers'),
  'concussion-missile-launcher-heavy': entry(30, 20, 60, 'Concussion Missiles: Launchers'),
  'proton-torpedo-launcher': entry(3, 25, 16, 'Proton Torpedoes: Launchers'),
  'shieldbuster-torpedo-launcher': entry(4, 25, 8, 'Shieldbuster Torpedoes: Launchers'),
  'space-mine-launcher': entry(6, 25, 12, 'Space Mines: Mine Launcher ("All mine launchers hold six mines")'),
  'space-mine-launcher-heavy': entry(6, 25, 12, 'Space Mines: Mine Launcher ("All mine launchers hold six mines")'),
  // "Ion bomb racks can hold up to four ion bombs" (SotG, Ion Bombs): four is also the maximum; no expansion is printed
  'ion-bomb-rack': Object.freeze({ standard: 4, expansion: Object.freeze({ status: 'NOT_PRINTED', maximum: 4 }), source: Object.freeze({ ...SRC, section: 'Ion Bombs ("Ion bomb racks can hold up to four ion bombs")' }) }),
  'gravity-mine-launcher': entry(6, 25, 12, 'Space Mines: Mine Launcher ("All mine launchers hold six mines")')
});

/** @returns {{known:true, standard:number, expansion:object, source:object}|{known:false, reason:string}} */
export function launcherStandardCapacity(launcherId) {
  const c = LAUNCHER_CAPACITY[launcherId];
  return c ? { known: true, standard: c.standard, expansion: c.expansion, source: c.source } : { known: false, reason: 'LAUNCHER_CAPACITY_NOT_PRINTED' };
}

/**
 * Ammunition a launcher accepts: only the catalog's explicit launcher -> ammunition link. Any other pairing is
 * unruled (null), not refused as incompatible and not allowed.
 * @returns {true|false|null}
 */
export function launcherAcceptsAmmunition(launcherEntry, ammunitionId) {
  if (!launcherEntry?.ammunition || !ammunitionId) return null;
  return launcherEntry.ammunition === ammunitionId ? true : null;
}
