import os
import json
from pathlib import Path

BASE = Path("./swse")

# -------------------------
# Utility helpers
# -------------------------

def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)

def write_file(path: Path, content: str):
    ensure_dir(path.parent)
    with open(path, "w", encoding="utf8") as f:
        f.write(content)

def banner(title):
    return f"/**\n * {title}\n * AUTO-GENERATED\n */\n\n"


# ============================================================
# 1. CORE
# ============================================================

notify_js = banner("SWSE Notify / Debug / Error Handling") + """export class SWSENotify {
  static info(msg, opts = {}) {
    ui.notifications.info(msg, opts);
  }

  static warn(msg, opts = {}) {
    ui.notifications.warn(msg, opts);
  }

  static error(msg, opts = {}) {
    ui.notifications.error(msg, opts);
  }

  static debug(...args) {
    if (game.settings.get("swse", "debugMode")) {
      console.log("%cSWSE DEBUG:", "color:#4af", ...args);
    }
  }

  static async safeAsync(fn, context = {}) {
    try {
      return await fn();
    } catch (err) {
      console.error("SWSE Error:", err, context);
      this.error("An SWSE error occurred. Check console for details.");
      throw err;
    }
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Notify = SWSENotify;

  game.swse = game.swse ?? {};
  game.swse.notify = SWSENotify;
});
"""

write_file(BASE / "core" / "swse-notify.js", notify_js)


# ============================================================
# 2. SETTINGS
# ============================================================

settings_js = banner("Centralized SWSE Settings Manager") + """export class SWSESettings {
  static register() {
    const defs = {
      showActionBrowser: { type: Boolean, default: true },
      grappleVariantRules: { type: Boolean, default: false },
      autofireRAW: { type: Boolean, default: false },
      vehicleCTUnified: { type: Boolean, default: true },
      actionEconomyVariant: { type: String, default: "RAW" },
      difficultyScaling: { type: Boolean, default: true },
      debugMode: { type: Boolean, default: false }
    };

    for (const [key, data] of Object.entries(defs)) {
      game.settings.register("swse", key, {
        name: key,
        scope: "world",
        config: true,
        type: data.type,
        default: data.default,
        onChange: value => this._notifySubscribers(key, value)
      });
    }
  }

  static get(key) {
    return game.settings.get("swse", key);
  }

  static set(key, value) {
    return game.settings.set("swse", key, value);
  }

  static _subscribers = new Map();

  static subscribe(key, fn) {
    if (!this._subscribers.has(key)) this._subscribers.set(key, []);
    this._subscribers.get(key).push(fn);
  }

  static _notifySubscribers(key, value) {
    const subs = this._subscribers.get(key);
    if (!subs) return;
    for (const fn of subs) fn(value);
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Settings = SWSESettings;

  SWSESettings.register();
});
"""

write_file(BASE / "settings" / "swse-settings.js", settings_js)


# ============================================================
# 3. ROLLS
# ============================================================

roll_js = banner("Modular Roll Engine with Middleware Pipeline") + """import { SWSENotify } from "../core/swse-notify.js";

export class SWSERoll {
  constructor(formula, context = {}) {
    this.formula = formula;
    this.context = context;
    this.modifiers = [];
  }

  addModifier(label, value) {
    this.modifiers.push({ label, value });
  }

  buildFormula() {
    const base = this.formula;
    const modSum = this.modifiers.reduce((t, m) => t + m.value, 0);
    if (modSum === 0) return base;
    return `(${base}) + ${modSum}`;
  }

  async evaluate() {
    Hooks.callAll("swse.preRoll", this);
    const rollFormula = this.buildFormula();
    const roll = await new Roll(rollFormula, this.context).evaluate();
    this.roll = roll;
    Hooks.callAll("swse.postRoll", this);
    return roll;
  }

  async reroll({ keepHigher = true } = {}) {
    Hooks.callAll("swse.preReroll", this);
    const newRoll = await new Roll(this.buildFormula(), this.context).evaluate();
    const final = keepHigher
      ? (newRoll.total >= this.roll.total ? newRoll : this.roll)
      : newRoll;
    this.roll = final;
    Hooks.callAll("swse.postReroll", this);
    return final;
  }

  static async quick(formula, context = {}) {
    const r = new SWSERoll(formula, context);
    return await r.evaluate();
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Roll = SWSERoll;
});
"""

write_file(BASE / "rolls" / "swse-roll.js", roll_js)


# ============================================================
# 4. EFFECTS
# ============================================================

status_icons_js = banner("Status Icon Registry") + """export class SWSEStatusIcons {
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
"""

write_file(BASE / "effects" / "status-icons.js", status_icons_js)


condition_js = banner("Condition Application System") + """import { SWSEStatusIcons } from "./status-icons.js";

export class SWSECondition {
  static async apply(actor, condition, { changes = [], duration = null } = {}) {
    const existing = actor.effects.find(e => e.label === condition);
    if (existing) await existing.delete();
    const effect = {
      label: condition,
      icon: SWSEStatusIcons.get(condition),
      changes,
      flags: { swse: { condition } }
    };
    if (duration) {
      effect.duration = { rounds: duration };
    }
    return await actor.createEmbeddedDocuments("ActiveEffect", [effect]);
  }

  static async remove(actor, condition) {
    const effects = actor.effects.filter(e => e.label === condition);
    if (!effects.length) return;
    return await actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
  }

  static has(actor, condition) {
    return actor.effects.some(e => e.label === condition);
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Condition = SWSECondition;

  game.swse = game.swse ?? {};
  game.swse.condition = SWSECondition;
});
"""

write_file(BASE / "effects" / "apply-condition.js", condition_js)


# ============================================================
# 5. COMBAT
# ============================================================

hit_js = banner("SWSE Modular Hit Resolution Engine") + """import { SWSENotify } from "../core/swse-notify.js";
import { SWSERoll } from "../rolls/swse-roll.js";

export class SWSEHit {
  static async resolve({
    attacker,
    target,
    attackBonus = 0,
    roll = null,
    defenseType = "reflex",
    context = {}
  }) {
    if (!attacker || !target) {
      SWSENotify.error("Hit resolution missing attacker or target.");
      return null;
    }

    Hooks.callAll("swse.preHitResolution", { attacker, target, context });

    if (!roll) {
      const r = new SWSERoll("1d20", { attacker, target, context });
      r.addModifier("Attack Bonus", attackBonus);
      roll = await r.evaluate();
    }

    const total = roll.total;
    const defense = this.resolveDefense(target, defenseType, context);
    const margin = total - defense;
    const hit = margin >= 0;
    const isThreat = roll.terms[0].results?.[0]?.result === 20;

    const result = {
      hit,
      margin,
      total,
      defense,
      isThreat,
      attacker,
      target,
      roll,
      context
    };

    Hooks.callAll("swse.postHitResolution", result);
    return result;
  }

  static resolveDefense(target, type, context = {}) {
    const base =
      target.system?.defenses?.[type]?.value ??
      target.system?.attributes?.[type] ??
      10;

    let defense = base;

    if (game.settings.get("swse", "vehicleCTUnified") && target.system?.conditionTrack) {
      const ctPenalty = target.system.conditionTrack.value ?? 0;
      defense -= ctPenalty;
    }

    if (context.cover) defense += context.cover;

    Hooks.callAll("swse.modifyDefense", { target, type, context, defenseRef: { value: defense } });

    return defense;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Hit = SWSEHit;
});
"""

write_file(BASE / "combat" / "hit-resolution.js", hit_js)


multi_js = banner("SWSE Multi-Attack Engine (Modular)") + """export class SWSEMultiAttack {
  static build(attacker, weapon, { mode = "single", baseBonus = 0 } = {}) {
    let iterations = [];

    switch (mode) {
      case "single":
        iterations.push({ penalty: 0 });
        break;
      case "dual":
        iterations = [{ penalty: -5 }, { penalty: -10 }];
        break;
      case "double":
        iterations = [{ penalty: -5 }, { penalty: -5 }];
        break;
      case "triple":
        iterations = [{ penalty: -10 }, { penalty: -10 }, { penalty: -10 }];
        break;
      case "autofire":
        iterations.push({ penalty: -5, autofire: true });
        break;
      default:
        iterations.push({ penalty: 0 });
    }

    Hooks.callAll("swse.modifyMultiAttack", { attacker, weapon, iterations });

    return iterations.map(entry => ({
      ...entry,
      finalBonus: baseBonus + entry.penalty
    }));
  }

  static async execute(attacker, target, weapon, opts = {}) {
    const baseBonus = opts.baseBonus ?? 0;
    const mode = opts.mode ?? "single";

    const sequence = this.build(attacker, weapon, { mode, baseBonus });
    const results = [];

    for (const iter of sequence) {
      const result = await CONFIG.SWSE.Hit.resolve({
        attacker,
        target,
        attackBonus: iter.finalBonus,
        defenseType: weapon?.system?.defenseType ?? "reflex",
        context: { multi: true, ...opts }
      });

      results.push(result);
    }

    return results;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.MultiAttack = SWSEMultiAttack;
});
"""

write_file(BASE / "combat" / "multi-attack.js", multi_js)


grapple_fsm_js = banner("Grapple FSM – state transitions only") + """export const GrappleStates = {
  NONE: "none",
  GRABBED: "grabbed",
  GRAPPLED: "grappled",
  PINNED: "pinned"
};

export class GrappleFSM {
  static transitions = {
    none: { attemptGrab: "grabbed" },
    grabbed: { succeedOpposed: "grappled", failOpposed: "none" },
    grappled: { pin: "pinned", escape: "none" },
    pinned: { escape: "grappled" }
  };

  static next(state, action) {
    return this.transitions[state]?.[action] ?? state;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.GrappleFSM = GrappleFSM;
  CONFIG.SWSE.GrappleStates = GrappleStates;
});
"""

write_file(BASE / "combat" / "grapple-fsm.js", grapple_fsm_js)


grapple_actions_js = banner("Modular Grapple Action Engine") + """import { SWSECondition } from "../effects/apply-condition.js";
import { SWSERoll } from "../rolls/swse-roll.js";

export class SWSEGrapple {
  static async attemptGrab(attacker, target, opts = {}) {
    const result = await CONFIG.SWSE.Hit.resolve({
      attacker,
      target,
      attackBonus: opts.attackBonus ?? 0,
      defenseType: "reflex",
      context: { grapple: true }
    });

    if (!result.hit) return result;

    const newState = CONFIG.SWSE.GrappleFSM.next("none", "attemptGrab");
    await SWSECondition.apply(target, newState);

    return result;
  }

  static async opposedCheck(attacker, target, opts = {}) {
    const atkRoll = await SWSERoll.quick("1d20 + @strMod", attacker.getRollData());
    const defRoll = await SWSERoll.quick("1d20 + @strMod", target.getRollData());

    const attackerWins = atkRoll.total >= defRoll.total;
    const action = attackerWins ? "succeedOpposed" : "failOpposed";

    const oldState = this.getState(target);
    const newState = CONFIG.SWSE.GrappleFSM.next(oldState, action);

    await SWSECondition.apply(target, newState);

    return { attackerWins, atkRoll, defRoll, newState };
  }

  static async pin(attacker, target) {
    const oldState = this.getState(target);
    const newState = CONFIG.SWSE.GrappleFSM.next(oldState, "pin");

    await SWSECondition.apply(target, newState);
    return { oldState, newState };
  }

  static async escape(attacker, target) {
    const rollA = await SWSERoll.quick("1d20 + @strMod", attacker.getRollData());
    const rollT = await SWSERoll.quick("1d20 + @strMod", target.getRollData());

    const success = rollA.total >= rollT.total;
    const oldState = this.getState(target);
    const newState = success ? CONFIG.SWSE.GrappleFSM.next(oldState, "escape") : oldState;

    if (success) await SWSECondition.apply(target, newState);

    return { success, oldState, newState };
  }

  static async damage(attacker, target, formula = null) {
    const dmgRoll = await SWSERoll.quick(formula ?? attacker.system?.damageFormula ?? "1d6");
    return { dmgRoll };
  }

  static getState(actor) {
    return actor.effects.find(e => CONFIG.SWSE.GrappleStates[e.label])?.label ?? "none";
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Grapple = SWSEGrapple;
});
"""

write_file(BASE / "combat" / "grapple-actions.js", grapple_actions_js)


# ============================================================
# 6. VEHICLE
# ============================================================

vehicle_ct_js = banner("Unified Condition Track Engine for Characters + Vehicles") + """export class SWSEConditionTrack {
  static getValue(actor) {
    return actor.system?.conditionTrack?.value ?? 0;
  }

  static async applyStep(actor, steps = 1) {
    const ct = actor.system?.conditionTrack;
    if (!ct) return null;

    const newValue = Math.clamped(ct.value + steps, 0, ct.max ?? 5);

    await actor.update({
      "system.conditionTrack.value": newValue
    });

    Hooks.callAll("swse.ctChanged", { actor, old: ct.value, new: newValue });

    return newValue;
  }

  static async checkDamageThreshold(actor, dmg) {
    const threshold = actor.system?.threshold;
    if (!threshold) return false;

    if (dmg >= threshold) {
      await this.applyStep(actor, 1);
      return true;
    }
    return false;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.ConditionTrack = SWSEConditionTrack;
});
"""

write_file(BASE / "vehicle" / "vehicle-ct.js", vehicle_ct_js)


vehicle_actions_js = banner("Vehicle Action Economy Schema") + """export class SWSEVehicleActions {
  static base = {
    pilot: true,
    gunner: true,
    engineer: true,
    shields: true,
    command: true
  };

  static reset(actor) {
    return actor.update({ "system.vehicle.actions": foundry.utils.deepClone(this.base) });
  }

  static consume(actor, role) {
    const path = `system.vehicle.actions.${role}`;
    if (!actor.system.vehicle?.actions?.[role]) return false;

    return actor.update({ [path]: false });
  }

  static has(actor, role) {
    return !!actor.system.vehicle?.actions?.[role];
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.VehicleActions = SWSEVehicleActions;
});
"""

write_file(BASE / "vehicle" / "vehicle-actions.js", vehicle_actions_js)


vehicle_hit_js = banner("Vehicle Hit Resolution (Shields, DR, Threshold)") + """import { SWSERoll } from "../rolls/swse-roll.js";
import { SWSEConditionTrack } from "./vehicle-ct.js";

export class SWSEVehicleHit {
  static async resolve({
    attacker,
    target,
    weapon,
    attackBonus = 0,
    roll = null,
    context = {}
  }) {
    if (!attacker || !target) return null;

    Hooks.callAll("swse.preVehicleHit", { attacker, target, weapon, context });

    if (!roll) {
      const r = new SWSERoll("1d20", { attacker, target, weapon });
      r.addModifier("Attack Bonus", attackBonus);
      roll = await r.evaluate();
    }

    const total = roll.total;
    const defense = target.system?.defenses?.reflex?.value ?? 10;

    const hit = total >= defense;
    const isThreat = roll.terms[0].results?.[0]?.result === 20;

    const result = {
      hit,
      margin: total - defense,
      total,
      defense,
      roll,
      isThreat,
      attacker,
      target,
      weapon,
      context
    };

    if (!hit) {
      Hooks.callAll("swse.postVehicleHit", result);
      return result;
    }

    const sr = target.system?.shields?.value ?? 0;
    if (sr > 0) {
      result.shieldAbsorbed = sr;
    }

    const dmgFormula = weapon?.system?.damage ?? "1d6";
    const dmgRoll = await SWSERoll.quick(dmgFormula);
    let dmg = dmgRoll.total;

    if (sr > 0) dmg = Math.max(0, dmg - sr);

    const dr = target.system?.dr ?? 0;
    if (dr > 0) dmg = Math.max(0, dmg - dr);

    result.damage = dmg;
    result.damageRoll = dmgRoll;

    const thresholdTriggered = await SWSEConditionTrack.checkDamageThreshold(target, dmg);
    result.threshold = thresholdTriggered;

    Hooks.callAll("swse.postVehicleHit", result);
    return result;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE.VehicleHit = SWSEVehicleHit;
});
"""

write_file(BASE / "vehicle" / "vehicle-hit-resolution.js", vehicle_hit_js)


dogfighting_js = banner("Dogfighting Engine (Tailing, Breaking Tail, Maneuvers)") + """import { SWSERoll } from "../rolls/swse-roll.js";

export class SWSEDogfighting {
  static getState(actor) {
    return actor.flags.swse?.dogfight ?? "none";
  }

  static async setState(actor, state, target = null) {
    await actor.setFlag("swse", "dogfight", state);
    await actor.setFlag("swse", "dogfightTarget", target?.id ?? null);
    return state;
  }

  static async attemptTail(attacker, target) {
    const atk = await SWSERoll.quick("1d20 + @piloting", attacker.getRollData());
    const def = await SWSERoll.quick("1d20 + @piloting", target.getRollData());

    const success = atk.total >= def.total;

    if (success) {
      await this.setState(attacker, "tailing", target);
      await this.setState(target, "tailed", attacker);
    }

    return { success, atk, def };
  }

  static async breakTail(actor, pursuer) {
    const atk = await SWSERoll.quick("1d20 + @piloting", actor.getRollData());
    const def = await SWSERoll.quick("1d20 + @piloting", pursuer.getRollData());

    const success = atk.total >= def.total;

    if (success) {
      await this.setState(actor, "none");
      await this.setState(pursuer, "none");
    }

    return { success, atk, def };
  }

  static async maintain(attacker, target) {
    const atk = await SWSERoll.quick("1d20 + @piloting", attacker.getRollData());
    const dc = target.system?.dodgeDC ?? 10;

    const success = atk.total >= dc;

    if (!success) {
      await this.setState(attacker, "none");
      await this.setState(target, "none");
    }

    return { success, atk, dc };
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Dogfighting = SWSEDogfighting;
});
"""

write_file(BASE / "vehicle" / "vehicle-dogfighting.js", dogfighting_js)


# ============================================================
# 7. UI
# ============================================================

browser_js = banner("Combat Action Browser — Modular, Compendium-Driven") + """export class SWSECombatActionBrowser extends Application {
  constructor(actor) {
    super();
    this.actor = actor;
    this.filterText = "";
    this.actions = [];
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: "swse-combat-action-browser",
      title: "Combat Action Browser",
      template: "modules/swse/ui/templates/combat-action-browser.html",
      width: 600,
      height: "auto",
      resizable: true
    };
  }

  async loadActions() {
    const PACKS = ["swse.actions", "swse.vehicleActions"];

    let entries = [];

    for (const packId of PACKS) {
      const pack = game.packs.get(packId);
      if (!pack) continue;

      const index = await pack.getIndex({ fields: ["img", "type", "system"] });
      const docs = await pack.getDocuments();

      entries.push(...docs.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        img: d.img ?? "icons/svg/sword.svg",
        system: d.system ?? {},
        packId
      })));
    }

    Hooks.callAll("swse.modifyActionList", entries);
    this.actions = entries;
  }

  _filterAction(a) {
    if (!this.filterText) return true;
    const t = this.filterText.toLowerCase();
    return (
      a.name.toLowerCase().includes(t) ||
      (a.system?.tags ?? []).some(tag => tag.toLowerCase().includes(t))
    );
  }

  meetsRequirements(a) {
    const req = a.system?.requirements;
    if (!req) return true;

    const actor = this.actor;

    if (req.skills) {
      for (const s of req.skills) {
        if (!actor.system?.skills?.[s]?.trained) return false;
      }
    }

    if (req.feats) {
      for (const f of req.feats) {
        if (!actor.items.some(i => i.type === "feat" && i.name === f)) return false;
      }
    }

    if (req.talents) {
      for (const t of req.talents) {
        if (!actor.items.some(i => i.type === "talent" && i.name === t)) return false;
      }
    }

    return true;
  }

  async getData() {
    if (!this.actions.length) await this.loadActions();

    const grouped = {
      melee: [],
      ranged: [],
      skills: [],
      vehicle: [],
      other: []
    };

    for (const a of this.actions) {
      if (!this._filterAction(a)) continue;

      const cat = a.system?.category ?? "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        ...a,
        available: this.meetsRequirements(a)
      });
    }

    return {
      actor: this.actor,
      grouped,
      filterText: this.filterText
    };
  }

  activateListeners(html) {
    html.find("[data-action='filter']").on("input", ev => {
      this.filterText = ev.target.value;
      this.render();
    });

    html.find(".action-entry").on("click", ev => {
      const id = ev.currentTarget.dataset.id;
      const pack = ev.currentTarget.dataset.pack;
      this._executeAction(id, pack);
    });

    html.find(".action-entry").on("dragstart", ev => {
      const id = ev.currentTarget.dataset.id;
      const pack = ev.currentTarget.dataset.pack;
      this._dragAction(ev, id, pack);
    });

    html.find(".section-header").on("click", ev => {
      const sec = ev.currentTarget.dataset.section;
      html.find(`[data-section="${sec}"].action-row`).toggle();
    });
  }

  _dragAction(ev, id, pack) {
    const payload = {
      type: "swse-action",
      pack,
      id
    };
    ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(payload));
  }

  async _executeAction(id, packId) {
    const pack = game.packs.get(packId);
    if (!pack) return ui.notifications.warn("Missing compendium.");

    const doc = await pack.getDocument(id);
    if (!doc) return;

    const action = doc.system ?? {};

    if (CONFIG.SWSE.Action && CONFIG.SWSE.Action.execute) {
      return CONFIG.SWSE.Action.execute(this.actor, action);
    }

    ui.notifications.warn("Action subsystem not implemented.");
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.ActionBrowser = SWSECombatActionBrowser;

  game.swse = game.swse ?? {};
  game.swse.browser = SWSECombatActionBrowser;
});
"""

write_file(BASE / "ui" / "combat-action-browser.js", browser_js)


hotkeys_js = banner("SWSE Hotkey Bindings") + """import { SWSECombatActionBrowser } from "./combat-action-browser.js";

Hooks.on("init", () => {
  game.keybindings.register("swse", "openCombatBrowser", {
    name: "Open Combat Action Browser",
    editable: [{ key: "KeyC" }],
    onDown: () => {
      const actor = canvas.tokens.controlled[0]?.actor;
      if (!actor) return ui.notifications.warn("Select a token first.");
      new SWSECombatActionBrowser(actor).render(true);
    }
  });

  game.keybindings.register("swse", "attemptGrapple", {
    name: "Attempt Grapple",
    editable: [{ key: "KeyG" }],
    onDown: async () => {
      const actor = canvas.tokens.controlled[0]?.actor;
      const target = Array.from(game.user.targets)[0]?.actor;

      if (!actor || !target) {
        return ui.notifications.warn("Select a target and token first.");
      }

      if (!CONFIG.SWSE.Grapple) {
        return ui.notifications.warn("Grapple subsystem not loaded.");
      }

      await CONFIG.SWSE.Grapple.attemptGrab(actor, target);
    }
  });
});
"""

write_file(BASE / "ui" / "hotkeys.js", hotkeys_js)


browser_template = """<div class="swse-action-browser">

  <div class="filter-bar">
    <input type="text" data-action="filter" value="{{filterText}}" placeholder="Search actions..." />
  </div>

  {{#each grouped as |actions category|}}
    <div class="section">

      <div class="section-header" data-section="{{category}}">
        <h3>{{capitalize category}}</h3>
      </div>

      {{#each actions}}
        <div class="action-row" data-section="{{category}}">
          <div class="action-entry {{#unless available}}unavailable{{/unless}}" draggable="true"
               data-id="{{id}}" data-pack="{{packId}}">

            <img src="{{img}}" class="icon" />

            <div class="info">
              <div class="name">{{name}}</div>
              <div class="tags">
                {{#each system.tags}}
                  <span class="tag">{{this}}</span>
                {{/each}}
              </div>
            </div>

            {{#unless available}}
              <div class="req-warning">Requires prerequisites</div>
            {{/unless}}

          </div>
        </div>
      {{/each}}

    </div>
  {{/each}}

</div>
"""

write_file(BASE / "ui" / "templates" / "combat-action-browser.html", browser_template)


# ============================================================
# 8. ACTIONS
# ============================================================

action_executor_js = banner("SWSE Action Execution Engine") + """import { SWSERoll } from "../rolls/swse-roll.js";

export class SWSEActionExecutor {
  static async execute(actor, action) {
    if (!actor) return ui.notifications.warn("No actor provided.");

    Hooks.callAll("swse.preExecuteAction", { actor, action });

    const type = action?.type ?? action?.system?.type;
    let result;

    switch (type) {
      case "melee":
        result = await this._executeMelee(actor, action);
        break;
      case "ranged":
        result = await this._executeRanged(actor, action);
        break;
      case "skill":
        result = await this._executeSkill(actor, action);
        break;
      case "vehicle":
        result = await this._executeVehicle(actor, action);
        break;
      case "grapple":
        result = await this._executeGrapple(actor, action);
        break;
      case "script":
        result = await this._executeScript(actor, action);
        break;
      default:
        ui.notifications.warn(`Unknown action type: ${type}`);
        return;
    }

    Hooks.callAll("swse.postExecuteAction", { actor, action, result });

    return result;
  }

  static async _executeMelee(actor, action) {
    const target = game.user.targets.first()?.actor;
    if (!target) return ui.notifications.warn("Select a target.");

    const bonus = action.system?.attackBonus ?? 0;

    const result = await CONFIG.SWSE.Hit.resolve({
      attacker: actor,
      target,
      attackBonus: bonus,
      defenseType: "reflex",
      context: { action }
    });

    this._postHitToChat(actor, target, action, result);
    return result;
  }

  static async _executeRanged(actor, action) {
    const target = game.user.targets.first()?.actor;
    if (!target) return ui.notifications.warn("Select a target.");

    const bonus = action.system?.attackBonus ?? 0;

    const result = await CONFIG.SWSE.Hit.resolve({
      attacker: actor,
      target,
      attackBonus: bonus,
      defenseType: "reflex",
      context: { action }
    });

    this._postHitToChat(actor, target, action, result);
    return result;
  }

  static async _executeSkill(actor, action) {
    const skillId = action.system?.skill;
    if (!skillId) return ui.notifications.warn("No skill specified.");

    const roll = await SWSERoll.quick(`1d20 + @skills.${skillId}.mod`, actor.getRollData());

    const html = `
      <h2>${action.name}</h2>
      <p><b>Skill:</b> ${skillId}</p>
      <p><b>Total:</b> ${roll.total}</p>
    `;

    CONFIG.SWSE.Utils.postChat(actor.name, html);
    return roll;
  }

  static async _executeVehicle(actor, action) {
    const target = game.user.targets.first()?.actor;

    const result = await CONFIG.SWSE.VehicleHit.resolve({
      attacker: actor,
      target,
      weapon: action.system,
      attackBonus: action.system?.attackBonus ?? 0,
      context: { action }
    });

    this._postVehicleHit(actor, target, action, result);
    return result;
  }

  static async _executeGrapple(actor, action) {
    const target = game.user.targets.first()?.actor;
    if (!target) return ui.notifications.warn("Select a target.");

    const mode = action.system?.mode;

    switch (mode) {
      case "attemptGrab":
        return CONFIG.SWSE.Grapple.attemptGrab(actor, target);
      case "opposed":
        return CONFIG.SWSE.Grapple.opposedCheck(actor, target);
      case "pin":
        return CONFIG.SWSE.Grapple.pin(actor, target);
      case "escape":
        return CONFIG.SWSE.Grapple.escape(actor, target);
      case "damage":
        return CONFIG.SWSE.Grapple.damage(actor, target);
      default:
        ui.notifications.warn("Unknown grapple action mode.");
    }
  }

  static async _executeScript(actor, action) {
    const script = action.system?.script;
    if (!script) return ui.notifications.warn("No script found.");

    // eslint-disable-next-line no-eval
    return eval(script);
  }

  static _postHitToChat(attacker, target, action, result) {
    const html = `
      <h2>${action.name}</h2>
      <p><b>${attacker.name}</b> attacks <b>${target.name}</b></p>
      <p><b>Attack Roll:</b> ${result.roll.total} vs ${result.defense}</p>
      <p><b>Hit:</b> ${result.hit ? "Yes" : "No"}</p>
    `;
    CONFIG.SWSE.Utils.postChat(attacker.name, html);
  }

  static _postVehicleHit(attacker, target, action, result) {
    const html = `
      <h2>${action.name}</h2>
      <p><b>${attacker.name}</b> fires at <b>${target.name}</b></p>
      <p>Attack: ${result.roll.total} vs ${result.defense}</p>
      <p>Hit: ${result.hit ? "Yes" : "No"}</p>
      <p>Damage: ${result.damage ?? 0}</p>
      <p>Threshold: ${result.threshold ? "Exceeded" : "No"}</p>
    `;
    CONFIG.SWSE.Utils.postChat(attacker.name, html);
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Action = SWSEActionExecutor;
});
"""

write_file(BASE / "action" / "action-executor.js", action_executor_js)


macro_gen_js = banner("SWSE Hotbar Macro Generator") + """export class SWSEMacroGenerator {
  static async createMacro({ id, packId, actorId }) {
    const name = `SWSE: ${id}`;
    const command = `
      const actor = game.actors.get("${actorId}");
      const pack = game.packs.get("${packId}");
      const doc = await pack.getDocument("${id}");
      CONFIG.SWSE.Action.execute(actor, doc.system);
    `;

    let macro = game.macros.find(m => m.name === name);
    if (!macro) {
      macro = await Macro.create({
        name,
        type: "script",
        scope: "global",
        command,
        img: "icons/svg/combat.svg"
      });
    }

    return macro;
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.MacroGenerator = SWSEMacroGenerator;
});
"""

write_file(BASE / "action" / "macro-generator.js", macro_gen_js)


# ============================================================
# 9. DATA
# ============================================================

status_model_js = banner("Extended Actor Status Flags") + """export const SWSEStatusModel = {
  grappled: false,
  pinned: false,
  tailed: false
};
"""

write_file(BASE / "data" / "status-flags.js", status_model_js)


# ============================================================
# 10. UTILS
# ============================================================

utils_js = banner("Shared Utility Helpers") + """export class SWSEUtils {
  static getSelectedActor() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }

  static getTargetActor() {
    return game.user.targets.first()?.actor ?? null;
  }

  static async rollSkill(actor, skillId) {
    return await CONFIG.SWSE.Roll.quick(`1d20 + @skills.${skillId}.mod`, actor.getRollData());
  }

  static postChat(title, html) {
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: game.swse?.actor ?? null }),
      flavor: title,
      content: html
    });
  }

  static assertActor(actor) {
    if (!actor) throw new Error("Actor is required.");
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Utils = SWSEUtils;

  game.swse = game.swse ?? {};
  game.swse.utils = SWSEUtils;
});
"""

write_file(BASE / "utils" / "swse-utils.js", utils_js)


# ============================================================
# DONE
# ============================================================

print("✅ SWSE Production Build Complete!")
print("Generated 19 production modules with full implementations")
