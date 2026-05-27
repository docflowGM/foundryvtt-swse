/** GM settings shell surface adapter. */

import { SettingsSurfaceService } from '/systems/foundryvtt-swse/scripts/ui/shell/SettingsSurfaceService.js';
import { getGameSettingsSnapshot } from '/systems/foundryvtt-swse/scripts/games/game-settings.js';

function boolField(key, label, description, value) {
  return { key, label, description, type: 'checkbox', checked: Boolean(value), value: Boolean(value) };
}

function numberField(key, label, description, value, options = {}) {
  return { key, label, description, type: 'number', value: Number(value || 0), min: options.min ?? 0, max: options.max ?? 1000000, step: options.step ?? 1 };
}

function selectField(key, label, description, value, choices = []) {
  return { key, label, description, type: 'select', value: String(value ?? ''), choices: choices.map(choice => ({ ...choice, selected: String(choice.value) === String(value) })) };
}

function buildGamePolicyVm() {
  const settings = getGameSettingsSnapshot();
  return {
    title: 'Holopad Games Policy',
    description: 'GM-facing campaign controls for player tables, wagers, AI/house payouts, and settlement approval.',
    groups: [
      {
        id: 'access',
        label: 'Access & Tables',
        fields: [
          boolField('gamesEnabled', 'Enable Games App', 'Show the Games app in player holopads.', settings.enabled),
          boolField('gamesAllowDuringCombat', 'Allow During Combat', 'Allow players to open side games while combat is active.', settings.allowDuringCombat),
          boolField('gamesAllowPlayerCreatedTables', 'Player-Created Tables', 'Let players start their own game sessions.', settings.allowPlayerCreatedTables),
          boolField('gamesAllowPvP', 'Player-vs-Player', 'Allow player invites through Holonet/Messenger.', settings.allowPvP),
          boolField('gamesAllowAI', 'AI Opponents', 'Allow deterministic AI/dealer droid opponents.', settings.allowAI),
          boolField('gamesAllowNPCs', 'NPC Opponents', 'Allow actor-backed NPC seats.', settings.allowNPCs)
        ]
      },
      {
        id: 'wagers',
        label: 'Wagers & Approvals',
        fields: [
          boolField('gamesAllowWagers', 'Allow Wagers', 'Enable campaign-consequence game stakes.', settings.allowWagers),
          boolField('gamesAllowCreditWagers', 'Credit Wagers', 'Allow buy-ins, antes, pots, and credit payouts through TransactionEngine.', settings.allowCreditWagers),
          boolField('gamesAllowItemWagers', 'Item Wagers', 'Allow item stakes. Item transfer must stay ActorEngine-governed.', settings.allowItemWagers),
          boolField('gamesAllowAssetWagers', 'Ship/Droid Wagers', 'Allow actor-backed asset stakes.', settings.allowAssetWagers),
          boolField('gamesRequireGmApprovalForWagers', 'GM Approves Wagers', 'Require GM approval before wagered sessions begin.', settings.requireGmApprovalForWagers),
          boolField('gamesRequireGmApprovalForAssetWagers', 'GM Approves Ship/Droid Wagers', 'Keep actor-backed asset wagers GM-gated by default.', settings.requireGmApprovalForAssetWagers),
          numberField('gamesMaxCreditWager', 'Max Credit Wager', 'Maximum credits a non-GM player may stake in one game.', settings.maxCreditWager, { min: 0, step: 50 })
        ]
      },
      {
        id: 'ai-payouts',
        label: 'AI / House Payouts',
        fields: [
          boolField('gamesAllowAiCampaignPayouts', 'Allow AI Campaign Payouts', 'Let AI/house games create campaign wealth subject to policy.', settings.allowAiCampaignPayouts),
          selectField('gamesAiPayoutAuthority', 'AI Payout Authority', 'How automated AI/house payouts are handled.', settings.aiPayoutAuthority, [
            { value: 'automatic', label: 'Automatic under caps' },
            { value: 'capped', label: 'Always cap automated payout' },
            { value: 'gmApproval', label: 'Require GM approval' },
            { value: 'gmAdjust', label: 'Require GM adjustment' },
            { value: 'none', label: 'No campaign payout; refund buy-in only' }
          ]),
          selectField('gamesAiOverCapBehavior', 'Over-Cap Behavior', 'What happens when an AI/house payout exceeds cap.', settings.aiOverCapBehavior, [
            { value: 'block', label: 'Block payout' },
            { value: 'refund', label: 'Refund buy-in only' },
            { value: 'cap', label: 'Pay up to cap' },
            { value: 'gmApproval', label: 'Ask GM to approve' },
            { value: 'gmAdjust', label: 'Ask GM to adjust payout' }
          ]),
          numberField('gamesAiMaxAutomatedPayoutPerMatch', 'Max Automated Payout', 'Credits that may be paid automatically from one AI/house match.', settings.aiMaxAutomatedPayoutPerMatch, { min: 0, step: 50 }),
          numberField('gamesAiMaxNetWinningsPerActorPerSession', 'Max Net Winnings / Actor', 'Per-table net winnings cap scaffold.', settings.aiMaxNetWinningsPerActorPerSession, { min: 0, step: 50 })
        ]
      }
    ]
  };
}

export class GMSettingsSurfaceService {
  static async buildViewModel() {
    return {
      pageTitle: 'GM Holopad Settings',
      pageDescription: 'Shared datapad theme, motion, shell color, language controls, and GM game policy gates',
      settingsVm: await SettingsSurfaceService.buildViewModel(null, { gm: true, preferActor: false }),
      gamePolicyVm: buildGamePolicyVm()
    };
  }
}
