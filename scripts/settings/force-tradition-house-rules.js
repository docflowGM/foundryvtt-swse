export const FORCE_TRADITION_ACCESS_MODE_SETTING = 'forceTraditionPrestigeAccessMode';

export const FORCE_TRADITION_ACCESS_MODES = Object.freeze({
  RAW_ALL: 'raw-all',
  MEMBERSHIP_ONLY: 'membership-only'
});

export function registerForceTraditionHouseRuleSettings() {
  if (game.settings.settings.has(`foundryvtt-swse.${FORCE_TRADITION_ACCESS_MODE_SETTING}`)) return;

  game.settings.register('foundryvtt-swse', FORCE_TRADITION_ACCESS_MODE_SETTING, {
    name: 'Force Traditions: Prestige Class Access',
    hint: 'RAW lets Jedi Masters, Sith Lords, and Force Disciples access every Force tradition talent tree. Membership Only restricts tradition trees to the actor\'s primary, adopted, or custom Force tradition memberships.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      [FORCE_TRADITION_ACCESS_MODES.RAW_ALL]: 'RAW: prestige classes access every Force tradition tree',
      [FORCE_TRADITION_ACCESS_MODES.MEMBERSHIP_ONLY]: 'House Rule: restrict tradition trees to memberships'
    },
    default: FORCE_TRADITION_ACCESS_MODES.RAW_ALL
  });
}

export function getForceTraditionPrestigeAccessMode() {
  try {
    return game?.settings?.get?.('foundryvtt-swse', FORCE_TRADITION_ACCESS_MODE_SETTING) || FORCE_TRADITION_ACCESS_MODES.RAW_ALL;
  } catch (_err) {
    return FORCE_TRADITION_ACCESS_MODES.RAW_ALL;
  }
}

export function restrictPrestigeForceTraditionsToMembership() {
  return getForceTraditionPrestigeAccessMode() === FORCE_TRADITION_ACCESS_MODES.MEMBERSHIP_ONLY;
}
