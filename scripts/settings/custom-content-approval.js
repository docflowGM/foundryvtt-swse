export const CUSTOM_CONTENT_APPROVAL_POLICY_SETTING = 'customContentApprovalPolicy';

export const CUSTOM_CONTENT_APPROVAL_POLICIES = Object.freeze({
  GM_REVIEW: 'gm-review',
  AUTO_ACCEPT: 'auto-accept',
  AUTO_DECLINE: 'auto-decline'
});

export function registerCustomContentApprovalSettings() {
  const key = `foundryvtt-swse.${CUSTOM_CONTENT_APPROVAL_POLICY_SETTING}`;
  if (game.settings.settings.has(key)) return;

  game.settings.register('foundryvtt-swse', CUSTOM_CONTENT_APPROVAL_POLICY_SETTING, {
    name: 'Custom Content Approval Policy',
    hint: 'Controls player-created custom Force traditions, custom talent trees, and custom talents. GM Review is the default; Auto Accept immediately approves; Auto Decline records/blocks approval as declined where supported.',
    scope: 'world',
    config: true,
    restricted: true,
    type: String,
    choices: {
      [CUSTOM_CONTENT_APPROVAL_POLICIES.GM_REVIEW]: 'GM Review Required',
      [CUSTOM_CONTENT_APPROVAL_POLICIES.AUTO_ACCEPT]: 'Auto Accept Player Custom Content',
      [CUSTOM_CONTENT_APPROVAL_POLICIES.AUTO_DECLINE]: 'Auto Decline Player Custom Content'
    },
    default: CUSTOM_CONTENT_APPROVAL_POLICIES.GM_REVIEW
  });
}

export function getCustomContentApprovalPolicy() {
  try {
    return game?.settings?.get?.('foundryvtt-swse', CUSTOM_CONTENT_APPROVAL_POLICY_SETTING) || CUSTOM_CONTENT_APPROVAL_POLICIES.GM_REVIEW;
  } catch (_err) {
    return CUSTOM_CONTENT_APPROVAL_POLICIES.GM_REVIEW;
  }
}

export function getCustomContentApprovalState(kind = 'custom-content', existing = null) {
  const previousStatus = existing?.approvalStatus || existing?.system?.approvalStatus || '';
  const previousApproved = existing?.gmApproved ?? existing?.system?.gmApproved;
  const previousActive = existing?.active ?? existing?.system?.active;

  if (game?.user?.isGM) {
    return {
      approvalStatus: 'approved',
      approvalPolicy: 'gm-created',
      approvalKind: kind,
      gmApproved: true,
      active: true,
      approvalReviewedAt: Date.now(),
      approvalReviewedBy: game.user.id,
      approvalRequestedAt: existing?.approvalRequestedAt || existing?.system?.approvalRequestedAt || Date.now(),
      approvalRequestedBy: existing?.approvalRequestedBy || existing?.system?.approvalRequestedBy || game.user.id
    };
  }

  const policy = getCustomContentApprovalPolicy();
  if (policy === CUSTOM_CONTENT_APPROVAL_POLICIES.AUTO_ACCEPT) {
    return {
      approvalStatus: 'approved',
      approvalPolicy: policy,
      approvalKind: kind,
      gmApproved: true,
      active: true,
      approvalReviewedAt: Date.now(),
      approvalReviewedBy: 'auto-accept',
      approvalRequestedAt: existing?.approvalRequestedAt || existing?.system?.approvalRequestedAt || Date.now(),
      approvalRequestedBy: existing?.approvalRequestedBy || existing?.system?.approvalRequestedBy || game?.user?.id || null
    };
  }

  if (policy === CUSTOM_CONTENT_APPROVAL_POLICIES.AUTO_DECLINE) {
    return {
      approvalStatus: 'declined',
      approvalPolicy: policy,
      approvalKind: kind,
      gmApproved: false,
      active: false,
      approvalReviewedAt: Date.now(),
      approvalReviewedBy: 'auto-decline',
      approvalRequestedAt: existing?.approvalRequestedAt || existing?.system?.approvalRequestedAt || Date.now(),
      approvalRequestedBy: existing?.approvalRequestedBy || existing?.system?.approvalRequestedBy || game?.user?.id || null
    };
  }

  if (previousStatus === 'approved' || previousApproved === true) {
    return {
      approvalStatus: 'approved',
      approvalPolicy: previousStatus ? 'preserved' : policy,
      approvalKind: kind,
      gmApproved: true,
      active: previousActive !== false,
      approvalRequestedAt: existing?.approvalRequestedAt || existing?.system?.approvalRequestedAt || Date.now(),
      approvalRequestedBy: existing?.approvalRequestedBy || existing?.system?.approvalRequestedBy || game?.user?.id || null
    };
  }

  return {
    approvalStatus: 'pending',
    approvalPolicy: policy,
    approvalKind: kind,
    gmApproved: false,
    active: false,
    approvalRequestedAt: existing?.approvalRequestedAt || existing?.system?.approvalRequestedAt || Date.now(),
    approvalRequestedBy: existing?.approvalRequestedBy || existing?.system?.approvalRequestedBy || game?.user?.id || null
  };
}

export function customContentApprovalNotice(state = {}) {
  if (state.approvalStatus === 'approved') return 'approved';
  if (state.approvalStatus === 'declined') return 'declined by custom-content policy';
  return 'pending GM approval';
}
