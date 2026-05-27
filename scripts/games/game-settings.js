/**
 * Holopad Games settings registration.
 *
 * These settings are deliberately infrastructure-only. Later playable phases
 * should consume them to hide unavailable player options and to choose the
 * correct GM/host authority mode.
 */

const SETTING_DEFINITIONS = [
  ['gamesSessions', {
    name: 'Holopad Games Sessions (internal)',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  }],
  ['gamesEnabled', {
    name: 'Holopad Games: Enable Game Center',
    hint: 'Adds the Games app to actor holopads for Pazaak, Sabacc, Dejarik, and future side games.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesAllowPlayerCreatedTables', {
    name: 'Holopad Games: Allow Player-Created Tables',
    hint: 'When disabled, only GMs can create game sessions. Existing sessions can still be completed or refunded by a GM.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesAllowPvP', {
    name: 'Holopad Games: Allow Player-vs-Player Games',
    hint: 'Controls whether players can invite other players to games through Holonet/Messenger.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesAllowAI', {
    name: 'Holopad Games: Allow AI Opponents',
    hint: 'Controls whether player tables can include deterministic dealer droid or AI opponents.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesAllowNPCs', {
    name: 'Holopad Games: Allow NPC Opponents',
    hint: 'Controls whether game sessions can include actor-backed NPC seats using deterministic AI profiles.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesAllowWagers', {
    name: 'Holopad Games: Allow Wagers',
    hint: 'When disabled, games use Republic Senate Rules only and no betting controls are shown to players.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  }],
  ['gamesAllowCreditWagers', {
    name: 'Holopad Games: Allow Credit Wagers',
    hint: 'Allows game buy-ins, antes, pots, and payouts. Credit movement must use TransactionEngine.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  }],
  ['gamesAllowItemWagers', {
    name: 'Holopad Games: Allow Item Wagers',
    hint: 'Allows gear, weapons, armor, and other owned embedded items to be wagered. Item movement must use ActorEngine.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  }],
  ['gamesAllowAssetWagers', {
    name: 'Holopad Games: Allow Ship/Droid Wagers',
    hint: 'Allows actor-backed assets such as ships and droids to be wagered. Asset transfer should require GM approval by default.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  }],
  ['gamesRequireGmApprovalForWagers', {
    name: 'Holopad Games: GM Approves Wagers',
    hint: 'Requires GM approval before wagered game sessions begin. Recommended for all campaign-consequence games.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesRequireGmApprovalForAssetWagers', {
    name: 'Holopad Games: GM Approves Ship/Droid Wagers',
    hint: 'Ship and droid wagers are actor ownership transfers and should remain GM-gated unless a GM intentionally disables this.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesMaxCreditWager', {
    name: 'Holopad Games: Maximum Player Credit Wager',
    hint: 'Maximum credits a non-GM player can stake in one game session before GM tooling overrides it. Set 0 for no player wagering.',
    scope: 'world',
    config: true,
    type: Number,
    range: { min: 0, max: 1000000, step: 50 },
    default: 1000
  }],
  ['gamesDefaultRulesMode', {
    name: 'Holopad Games: Default Rules Mode',
    hint: 'Default new-table mode shown in the Games app.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'republic-senate': 'Republic Senate Rules (No Betting)',
      wagered: 'Wagered Table'
    },
    default: 'republic-senate'
  }],
  ['gamesAllowSpectators', {
    name: 'Holopad Games: Allow Spectators',
    hint: 'Allows non-participants to open supported game tables as viewers once game-specific renderers exist.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesAllowDuringCombat', {
    name: 'Holopad Games: Allow During Combat',
    hint: 'When disabled, player side-game entry points should hide while combat is active.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesUseMessengerInvites', {
    name: 'Holopad Games: Use Messenger Invites',
    hint: 'Routes game requests through Holonet/Messenger so recipients can accept or decline from their datapad.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }]
];

export function registerGameSettings() {
  for (const [key, definition] of SETTING_DEFINITIONS) {
    const fullKey = `foundryvtt-swse.${key}`;
    if (game.settings.settings.has(fullKey)) continue;
    game.settings.register('foundryvtt-swse', key, definition);
  }
}

export function getGameSettingsSnapshot() {
  const get = key => {
    try { return game.settings.get('foundryvtt-swse', key); }
    catch (_err) { return SETTING_DEFINITIONS.find(([settingKey]) => settingKey === key)?.[1]?.default; }
  };

  return {
    enabled: Boolean(get('gamesEnabled')),
    allowPlayerCreatedTables: Boolean(get('gamesAllowPlayerCreatedTables')),
    allowPvP: Boolean(get('gamesAllowPvP')),
    allowAI: Boolean(get('gamesAllowAI')),
    allowNPCs: Boolean(get('gamesAllowNPCs')),
    allowWagers: Boolean(get('gamesAllowWagers')),
    allowCreditWagers: Boolean(get('gamesAllowCreditWagers')),
    allowItemWagers: Boolean(get('gamesAllowItemWagers')),
    allowAssetWagers: Boolean(get('gamesAllowAssetWagers')),
    requireGmApprovalForWagers: Boolean(get('gamesRequireGmApprovalForWagers')),
    requireGmApprovalForAssetWagers: Boolean(get('gamesRequireGmApprovalForAssetWagers')),
    maxCreditWager: Number(get('gamesMaxCreditWager') || 0),
    defaultRulesMode: get('gamesDefaultRulesMode') || 'republic-senate',
    allowSpectators: Boolean(get('gamesAllowSpectators')),
    allowDuringCombat: Boolean(get('gamesAllowDuringCombat')),
    useMessengerInvites: Boolean(get('gamesUseMessengerInvites'))
  };
}
