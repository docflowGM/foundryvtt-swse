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
  ['gamesAllowAiCampaignPayouts', {
    name: 'Holopad Games: Allow AI/House Campaign Payouts',
    hint: 'When disabled, AI/house tables cannot create campaign wealth; winners can be refunded up to their own buy-in only.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  }],

  ['gamesDefaultAiDifficulty', {
    name: 'Holopad Games: Default AI Difficulty',
    hint: 'Controls how intelligently deterministic game AI uses legal choices. Grandmaster is fair by default unless fairness settings allow cheating/house edge.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      pro: 'Pro',
      grandmaster: 'Grandmaster'
    },
    default: 'medium'
  }],
  ['gamesDefaultAiFairness', {
    name: 'Holopad Games: Default AI Fairness',
    hint: 'Controls whether AI uses only legal information, gets a cinematic/house edge, cheats, or is controlled manually by the GM.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      fair: 'Fair: legal information only',
      cinematic: 'Cinematic: personality-weighted, no hidden knowledge',
      houseEdge: 'House Edge: mild table advantage',
      cheating: 'Cheating: hidden knowledge/manipulation hooks',
      gmControlled: 'GM Controlled: GM drives the seat'
    },
    default: 'fair'
  }],

  ['gamesDefaultAiPersonality', {
    name: 'Holopad Games: Default AI Personality',
    hint: 'Default personality style for generated AI opponents. Random lets each NPC draw a distinct table persona.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      random: 'Random',
      cautious: 'Cautious',
      aggressive: 'Aggressive',
      reckless: 'Reckless',
      methodical: 'Methodical',
      opportunist: 'Opportunist',
      showboat: 'Showboat',
      grinder: 'Grinder',
      desperate: 'Desperate',
      deceptive: 'Deceptive',
      forceTouched: 'Force-Touched'
    },
    default: 'random'
  }],
  ['gamesAllowAiForceSensitive', {
    name: 'Holopad Games: Allow Rare Force-Sensitive AI Opponents',
    hint: 'When enabled, newly generated AI/NPC opponents have a small random chance to be Force-sensitive.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesAiForceSensitiveChance', {
    name: 'Holopad Games: AI Force-Sensitive Opponent Chance',
    hint: 'Chance that a newly generated AI/NPC opponent is Force-sensitive. Default is 2%.',
    scope: 'world',
    config: true,
    type: Number,
    range: { min: 0, max: 1, step: 0.01 },
    default: 0.02
  }],
  ['gamesAiForceIntuitionChance', {
    name: 'Holopad Games: AI Force Intuition Trigger Chance',
    hint: 'Chance that a Force-sensitive AI receives a vague feeling about the next main-deck draw when deciding whether to continue. Default is 5%.',
    scope: 'world',
    config: true,
    type: Number,
    range: { min: 0, max: 1, step: 0.01 },
    default: 0.05
  }],
  ['gamesAllowHouseEdgeAi', {
    name: 'Holopad Games: Allow House Edge AI',
    hint: 'Allows house/dealer AI fairness profiles that are openly labeled as having a mild house edge.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesAllowCheatingAi', {
    name: 'Holopad Games: Allow Cheating AI',
    hint: 'Allows explicitly cheating AI fairness profiles. This should be a story/GM tool, not a hidden difficulty setting.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  }],
  ['gamesRequireGmApprovalForCheatingAi', {
    name: 'Holopad Games: GM Approves Cheating AI',
    hint: 'Requires GM involvement before cheating AI fairness can be used at a table.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  }],
  ['gamesAiPayoutAuthority', {
    name: 'Holopad Games: AI/House Payout Authority',
    hint: 'Controls how automated AI/house payouts are handled when a player beats an AI, dealer droid, NPC house, or house-backed table.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      automatic: 'Automatic payout if under caps',
      capped: 'Always cap automated payout',
      gmApproval: 'Require GM approval',
      gmAdjust: 'Require GM adjustment',
      none: 'No campaign payout; refund buy-in only'
    },
    default: 'gmAdjust'
  }],
  ['gamesAiOverCapBehavior', {
    name: 'Holopad Games: AI/House Over-Cap Behavior',
    hint: 'What happens when an AI/house payout exceeds the GM configured automated payout cap.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      block: 'Block payout',
      refund: 'Refund winner buy-in only',
      cap: 'Pay up to cap',
      gmApproval: 'Ask GM to approve',
      gmAdjust: 'Ask GM to adjust payout'
    },
    default: 'gmAdjust'
  }],
  ['gamesAiMaxAutomatedPayoutPerMatch', {
    name: 'Holopad Games: AI/House Max Automated Payout Per Match',
    hint: 'Maximum credits that may be paid automatically from AI/house games before the configured over-cap behavior applies. Set 0 for no automated cap.',
    scope: 'world',
    config: true,
    type: Number,
    range: { min: 0, max: 1000000, step: 50 },
    default: 500
  }],
  ['gamesAiMaxNetWinningsPerActorPerSession', {
    name: 'Holopad Games: AI/House Max Net Winnings Per Actor Per Session',
    hint: 'Campaign-safe net winnings cap for automated AI/house gambling. The first implementation applies this as a per-table cap scaffold.',
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
    allowAiCampaignPayouts: Boolean(get('gamesAllowAiCampaignPayouts')),
    defaultAiDifficulty: get('gamesDefaultAiDifficulty') || 'medium',
    defaultAiFairness: get('gamesDefaultAiFairness') || 'fair',
    defaultAiPersonality: get('gamesDefaultAiPersonality') || 'random',
    allowAiForceSensitive: Boolean(get('gamesAllowAiForceSensitive')),
    aiForceSensitiveChance: Number(get('gamesAiForceSensitiveChance') ?? 0.02),
    aiForceIntuitionChance: Number(get('gamesAiForceIntuitionChance') ?? 0.05),
    allowHouseEdgeAi: Boolean(get('gamesAllowHouseEdgeAi')),
    allowCheatingAi: Boolean(get('gamesAllowCheatingAi')),
    requireGmApprovalForCheatingAi: Boolean(get('gamesRequireGmApprovalForCheatingAi')),
    aiPayoutAuthority: get('gamesAiPayoutAuthority') || 'gmAdjust',
    aiOverCapBehavior: get('gamesAiOverCapBehavior') || 'gmAdjust',
    aiMaxAutomatedPayoutPerMatch: Number(get('gamesAiMaxAutomatedPayoutPerMatch') || 0),
    aiMaxNetWinningsPerActorPerSession: Number(get('gamesAiMaxNetWinningsPerActorPerSession') || 0),
    defaultRulesMode: get('gamesDefaultRulesMode') || 'republic-senate',
    allowSpectators: Boolean(get('gamesAllowSpectators')),
    allowDuringCombat: Boolean(get('gamesAllowDuringCombat')),
    useMessengerInvites: Boolean(get('gamesUseMessengerInvites'))
  };
}
