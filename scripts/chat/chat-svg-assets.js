export const CHAT_SVG_ASSETS = {
  cornerTL: "systems/foundryvtt-swse/assets/ui/chat/corner-top-left.svg",
  cornerTR: "systems/foundryvtt-swse/assets/ui/chat/corner-top-right.svg",
  cornerBL: "systems/foundryvtt-swse/assets/ui/chat/corner-bottom-left.svg",
  cornerBR: "systems/foundryvtt-swse/assets/ui/chat/corner-bottom-right.svg",
  headerDivider: "systems/foundryvtt-swse/assets/ui/chat/divider-header.svg",
  resultRail: "systems/foundryvtt-swse/assets/ui/chat/result-rail.svg",
  accentBadge: "systems/foundryvtt-swse/assets/ui/chat/accent-badge.svg",
  frameOverlay: "systems/foundryvtt-swse/assets/ui/chat/frame-overlay.svg"
};

export function buildChatSvgContext(overrides = {}) {
  return {
    ...CHAT_SVG_ASSETS,
    ...overrides
  };
}

export function buildChatStateContext(input = {}) {
  const state = String(input.state ?? input.stateClass ?? input.status ?? "default").toLowerCase().trim();

  const normalized =
    state.includes("pending") ? "pending" :
    state.includes("success") ? "success" :
    state.includes("fail") ? "failure" :
    state.includes("final") ? "final" :
    "default";

  return {
    stateClass: normalized,
    statusLabel: input.statusLabel ?? (
      normalized === "pending" ? game.i18n.localize("SWSE.Chat.Roll.PendingResolution") :
      normalized === "success" ? game.i18n.localize("SWSE.Chat.Roll.Resolved") :
      normalized === "failure" ? game.i18n.localize("SWSE.Chat.Roll.Failed") :
      normalized === "final" ? game.i18n.localize("SWSE.Chat.Roll.FinalResult") :
      game.i18n.localize("SWSE.Chat.Roll.RollResult")
    ),
    statusSubLabel: input.statusSubLabel ?? "",
    showStatusRail: input.showStatusRail ?? false,
    showHeaderDivider: input.showHeaderDivider ?? true,
    showBadge: input.showBadge ?? true
  };
}
