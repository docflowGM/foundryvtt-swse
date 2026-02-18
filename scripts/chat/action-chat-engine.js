/**
 * ActionChatEngine
 * Single authority for supplemental narration messages.
 * Must never replace existing roll cards; supplements only.
 */
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

    const name = actor?.name ?? "Someone";
    const content = `<p>[${name}] ${this._escape(text)}!</p>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.EMOTE,
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

    const aName = actor?.name ?? "Someone";
    const targetClause = opts?.targetName ? ` [${this._escape(opts.targetName)}]` : "";
    const totalStr = Math.trunc(total).toString();

    let tail = "";
    if (opts?.success === true) tail = " which succeeds!";
    else if (opts?.success === false) tail = " which fails!";

    const extra = opts?.extra ? ` ${this._escape(opts.extra)}` : "";
    const content = `<p>[${aName}] does [${this._escape(actionName)}]${targetClause} and rolls a [${totalStr}]${tail}.${extra}</p>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    });
  }

  /**
   * Attack + damage narration.
   */
  static async narrationAttack(actor, weaponName, attackTotal, damageTotal, opts = {}) {
    if (!this.settingEnabled()) return;
    if (!actor || !weaponName) return;
    if (typeof attackTotal !== "number" || typeof damageTotal !== "number") return;

    const aName = actor?.name ?? "Someone";
    const target = opts?.targetName ? ` [${this._escape(opts.targetName)}]` : "";
    const content = `<p>[${aName}] attacks${target} with [${this._escape(weaponName)}] and rolls [${Math.trunc(
      attackTotal
    )}]! It does [${Math.trunc(damageTotal)}].</p>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    });
  }

  /**
   * Force power narration.
   */
  static async narrationForcePower(actor, powerName, total, opts = {}) {
    if (!this.settingEnabled()) return;
    if (!actor || !powerName || typeof total !== "number") return;

    const aName = actor?.name ?? "Someone";
    const extra = opts?.extra ? ` ${this._escape(opts.extra)}` : "";
    const content = `<p>[${aName}] uses the Force and casts [${this._escape(powerName)}], rolling [${Math.trunc(total)}]!${extra}</p>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    });
  }

  static _escape(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
}
