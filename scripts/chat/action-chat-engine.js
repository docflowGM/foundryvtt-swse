/**
 * ActionChatEngine
 * Single authority for supplemental narration messages.
 * Must never replace existing roll cards; supplements only.
 */
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

export class ActionChatEngine {
  static settingEnabled() {
    try {
      return game?.settings?.get?.("foundryvtt-swse", "enableChatNarrationForRolls") ?? true;
    } catch {
      return true;
    }
  }

  static async emote(actor, text) {
    if (!this.settingEnabled()) return;
    if (!actor || !text) return;

    const content = `${this._escape(text)}!`;
    await SWSEChat.postNarration({
      body: content,
      actor,
      style: CONST.CHAT_MESSAGE_STYLES.EMOTE
    });
  }

  /**
   * @param {Actor} actor
   * @param {string} actionName
   * @param {number} total
   * @param {{success?: boolean|null, targetName?: string|null, extra?: string|null}} opts
   */
  static async narrationRoll(actor, actionName, total, opts = {}) {
    if (!this.settingEnabled()) return;
    if (!actor || !actionName || typeof total !== "number") return;

    const targetClause = opts?.targetName ? ` [${this._escape(opts.targetName)}]` : "";
    const totalStr = Math.trunc(total).toString();

    let tail = "";
    if (opts?.success === true) tail = " which succeeds!";
    else if (opts?.success === false) tail = " which fails!";

    const extra = opts?.extra ? ` ${this._escape(opts.extra)}` : "";
    const content = `<span>does <b>[${this._escape(actionName)}]</b>${targetClause} and rolls a <b>[${totalStr}]</b>${tail}${extra}</span>`;

    await SWSEChat.postNarration({
      body: content,
      actor,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  /**
   * Attack + damage narration.
   */
  static async narrationAttack(actor, weaponName, attackTotal, damageTotal, opts = {}) {
    if (!this.settingEnabled()) return;
    if (!actor || !weaponName) return;
    if (typeof attackTotal !== "number" || typeof damageTotal !== "number") return;

    const target = opts?.targetName ? ` [${this._escape(opts.targetName)}]` : "";
    const content = `<span>attacks${target} with <b>[${this._escape(weaponName)}]</b> and rolls <b>[${Math.trunc(
      attackTotal
    )}]</b>. It does <b>[${Math.trunc(damageTotal)}]</b>.</span>`;

    await SWSEChat.postNarration({
      body: content,
      actor,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  /**
   * Force power narration.
   */
  static async narrationForcePower(actor, powerName, total, opts = {}) {
    if (!this.settingEnabled()) return;
    if (!actor || !powerName || typeof total !== "number") return;

    const extra = opts?.extra ? ` ${this._escape(opts.extra)}` : "";
    const content = `<span>uses the Force and casts <b>[${this._escape(powerName)}]</b>, rolling <b>[${Math.trunc(total)}]</b>!${extra}</span>`;

    await SWSEChat.postNarration({
      body: content,
      actor,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER
    });
  }

  static _escape(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}
