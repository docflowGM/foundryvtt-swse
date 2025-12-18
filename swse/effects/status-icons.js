/**
 * Status Icon Registry
 * AUTO-GENERATED
 */

export class SWSEStatusIcons {
  static registry = {
    stunned: "icons/svg/daze.svg",
    dazed: "icons/svg/daze.svg",
    blind: "icons/svg/blind.svg",
    cover: "icons/svg/shield.svg",
    concealed: "icons/svg/fog.svg",
    grappled: "icons/svg/net.svg",
    pinned: "icons/svg/cage.svg",
    flanked: "icons/svg/sword.svg"
  };

  static register(condition, iconPath) {
    this.registry[condition] = iconPath;
  }

  static get(condition) {
    return this.registry[condition] ?? "icons/svg/aura.svg";
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.StatusIcons = SWSEStatusIcons;
});
