import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DamageEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-engine.js";

const TURN_TICK_HOOKS = ["combatTurn", "combatTurnChange"];
const FLAG_PATH = "flags.swse.pendingRecurringDamage";

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKey(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

function randomId(prefix = "rd") {
  const id = globalThis.foundry?.utils?.randomID?.(8) ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${id}`;
}

function actorFromCombatHook(...args) {
  const combat = args[0];
  const update = args[1] ?? {};
  const options = args[2] ?? {};
  const candidateCombatant = update?.combatant
    ?? options?.combatant
    ?? combat?.combatant
    ?? combat?.turns?.[combat?.turn ?? -1]
    ?? null;
  return candidateCombatant?.actor ?? combat?.combatant?.actor ?? null;
}

function getPending(actor = null) {
  return Array.isArray(actor?.flags?.swse?.pendingRecurringDamage)
    ? [...actor.flags.swse.pendingRecurringDamage]
    : [];
}

function getRuleData(packet = {}) {
  return packet?.workflowContext?.ruleData
    ?? packet?.options?.workflowContext?.ruleData
    ?? packet?.options?.combatContext?.ruleData
    ?? {};
}

function firstSpec(...values) {
  return values.find(value => value !== undefined && value !== null && value !== false && value !== "") ?? null;
}

function damageTypeOf(packet = {}, spec = {}) {
  return String(
    spec.damageType
      ?? spec.type
      ?? packet.type
      ?? packet.originalType
      ?? packet.options?.damageType
      ?? "untyped"
  ).trim() || "untyped";
}

function defaultRemovalCondition(type = "") {
  const key = normalizeKey(type);
  if (key === "fire") return "Extinguish the flames or receive GM adjudication.";
  if (key === "acid") return "Remove or neutralize the acid, or receive GM adjudication.";
  return "GM adjudication or source-specific cleanup.";
}

function sourceNameOf(packet = {}, spec = {}) {
  return String(
    spec.sourceName
      ?? packet.weaponName
      ?? packet.sourceActorName
      ?? packet.source
      ?? "Recurring Damage"
  ).trim() || "Recurring Damage";
}

function labelFor(type = "", spec = {}, packet = {}) {
  return String(
    spec.name
      ?? spec.label
      ?? (normalizeKey(type) === "fire" ? "Burning" : normalizeKey(type) === "acid" ? "Acid Exposure" : null)
      ?? packet.weaponName
      ?? "Recurring Damage"
  ).trim() || "Recurring Damage";
}

function formulaFromSpec(spec = {}, packet = {}) {
  const formula = firstSpec(
    spec.formula,
    spec.damageFormula,
    spec.damage,
    spec.amount,
    spec.value,
    getRuleData(packet)?.recurringFormula,
    getRuleData(packet)?.ongoingFormula
  );
  if (formula !== null) return String(formula).trim();

  const type = normalizeKey(damageTypeOf(packet, spec));
  if ((spec === true || spec.implicit === true) && (type === "fire" || type === "acid")) return "1d6";
  return "";
}

function specFromPacket(packet = {}, options = {}) {
  const ruleData = getRuleData(packet);
  return firstSpec(
    options.recurringDamage,
    options.ongoingDamage,
    packet.recurringDamage,
    packet.options?.recurringDamage,
    packet.options?.ongoingDamage,
    ruleData.recurringDamage,
    ruleData.ongoingDamage,
    ruleData.hazard?.recurringDamage,
    ruleData.hazard?.ongoingDamage
  );
}

export class RecurringDamageEngine {
  static initializeHooks() {
    if (globalThis.game?.swse?.recurringDamageEngineHooksRegistered) return false;
    if (globalThis.game?.swse) game.swse.recurringDamageEngine = this;
    globalThis.SWSE ??= {};
    globalThis.SWSE.RecurringDamageEngine = this;

    for (const hook of TURN_TICK_HOOKS) {
      Hooks.on(hook, async (...args) => {
        try {
          const actor = actorFromCombatHook(...args);
          if (actor) await this.tickRecurringDamage(actor, { trigger: "startOfTurn", hook });
        } catch (err) {
          console.warn("SWSE | RecurringDamageEngine turn tick failed", err);
        }
      });
    }

    if (globalThis.game?.swse) game.swse.recurringDamageEngineHooksRegistered = true;
    return true;
  }

  static normalizeRecurringDamageSpec(spec = null, { packet = {}, sourceActor = null, sourceItem = null } = {}) {
    if (!spec || spec === false) return null;
    const raw = spec === true ? { implicit: true } : (typeof spec === "object" ? spec : { formula: spec });
    const damageType = damageTypeOf(packet, raw);
    const formula = formulaFromSpec(raw, packet);
    if (!formula) return null;

    const ruleData = getRuleData(packet);
    const trigger = String(raw.trigger ?? raw.timing ?? ruleData.recurringTrigger ?? "startOfTurn").trim() || "startOfTurn";
    const remainingRaw = raw.remainingTriggers ?? raw.triggers ?? raw.rounds ?? raw.durationRounds ?? ruleData.recurringRounds ?? null;
    const remainingTriggers = remainingRaw === null || remainingRaw === undefined || remainingRaw === "untilRemoved"
      ? null
      : Math.max(1, Math.floor(asNumber(remainingRaw, 1)));

    return {
      id: raw.id ?? raw.instanceId ?? randomId(normalizeKey(raw.key ?? damageType ?? "recurring")),
      key: normalizeKey(raw.key ?? raw.id ?? `${damageType}-recurring-damage`) || "recurring-damage",
      name: labelFor(damageType, raw, packet),
      formula,
      damageType,
      trigger,
      remainingTriggers,
      duration: raw.duration ?? (remainingTriggers ? `${remainingTriggers} trigger${remainingTriggers === 1 ? "" : "s"}` : "until removed"),
      sourceName: sourceNameOf(packet, raw),
      sourceActorId: raw.sourceActorId ?? sourceActor?.id ?? packet.sourceActorId ?? null,
      sourceActorUuid: raw.sourceActorUuid ?? sourceActor?.uuid ?? packet.sourceActorUuid ?? null,
      sourceItemId: raw.sourceItemId ?? sourceItem?.id ?? packet.weaponId ?? null,
      sourceItemUuid: raw.sourceItemUuid ?? sourceItem?.uuid ?? packet.weaponUuid ?? null,
      sourceWorkflowId: raw.workflowId ?? packet.workflowContext?.workflowId ?? null,
      removalCondition: raw.removalCondition ?? raw.endsWhen ?? defaultRemovalCondition(damageType),
      save: raw.save ?? raw.endSave ?? null,
      createdAt: raw.createdAt ?? Date.now(),
      tags: [...new Set(["recurring", "damage", damageType, ...asArray(raw.tags)].map(String).filter(Boolean))]
    };
  }

  static recurringDamageSpecFromPacket(packet = {}, options = {}) {
    return this.normalizeRecurringDamageSpec(specFromPacket(packet, options), {
      packet,
      sourceActor: packet.sourceActor ?? packet.options?.sourceActor ?? null,
      sourceItem: packet.options?.weapon ?? null
    });
  }

  static async queueRecurringDamage(actor, spec, { packet = {}, sourceActor = null, sourceItem = null, notify = true } = {}) {
    if (!actor || !spec) return { success: false, reason: "Missing target or recurring damage spec." };
    const instance = this.normalizeRecurringDamageSpec(spec, { packet, sourceActor, sourceItem });
    if (!instance) return { success: false, reason: "Recurring damage spec did not include a formula." };

    const current = getPending(actor);
    current.push(instance);
    await ActorEngine.updateActor(actor, { [FLAG_PATH]: current });

    if (notify !== false) {
      ui?.notifications?.info?.(`${actor.name}: ${instance.name} queued (${instance.formula} ${instance.damageType}).`);
      await this._postRecurringChat(actor, instance, "queued");
    }
    return { success: true, instance, pending: current };
  }

  static async queueFromDamagePacket(actor, packet = {}, options = {}) {
    const spec = this.recurringDamageSpecFromPacket(packet, options);
    if (!spec) return { success: false, reason: "No recurring damage metadata on packet." };
    return this.queueRecurringDamage(actor, spec, {
      packet,
      sourceActor: packet.sourceActor ?? packet.options?.sourceActor ?? null,
      sourceItem: packet.options?.weapon ?? null,
      notify: options.notify
    });
  }

  static async removeRecurringDamage(actor, instanceId = null, { reason = "removed" } = {}) {
    if (!actor) return { success: false, reason: "Missing actor." };
    const pending = getPending(actor);
    if (!pending.length) return { success: true, removed: [], pending: [] };
    const id = String(instanceId ?? "");
    const removed = [];
    const remaining = pending.filter(instance => {
      const match = !id || [instance.id, instance._id, instance.instanceId, instance.key].map(v => String(v ?? "")).includes(id);
      if (match) removed.push(instance);
      return !match;
    });
    await ActorEngine.updateActor(actor, { [FLAG_PATH]: remaining });
    if (removed.length) {
      ui?.notifications?.info?.(`${actor.name}: recurring damage ${reason}.`);
    }
    return { success: true, removed, pending: remaining };
  }

  static async tickRecurringDamage(actor, { trigger = "startOfTurn", instanceId = null, hook = null } = {}) {
    if (!actor) return [];
    const pending = getPending(actor);
    if (!pending.length) return [];

    const results = [];
    const remaining = [];
    const wantedId = instanceId ? String(instanceId) : "";

    for (const instance of pending) {
      const matchesTrigger = String(instance.trigger || "startOfTurn") === trigger;
      const matchesId = !wantedId || [instance.id, instance._id, instance.instanceId, instance.key].map(v => String(v ?? "")).includes(wantedId);
      if (!matchesTrigger || !matchesId) {
        remaining.push(instance);
        continue;
      }

      const roll = await this._rollDamage(instance.formula || "1d4");
      const result = await DamageEngine.applyDamage(actor, Math.max(0, Number(roll?.total ?? 0) || 0), {
        damageType: instance.damageType || "untyped",
        source: instance.name || "recurring-damage",
        recurringDamage: true,
        recurringDamageInstance: instance,
        hook,
        targetTempHP: true,
        skipDamageTimingRiders: true
      });
      await this._postRecurringChat(actor, instance, "ticked", roll);

      const leftRaw = instance.remainingTriggers;
      const left = leftRaw === null || leftRaw === undefined
        ? null
        : Math.max(0, Math.floor(asNumber(leftRaw, 1)) - 1);
      if (left === null || left > 0) {
        remaining.push({ ...instance, remainingTriggers: left, lastTriggeredAt: Date.now() });
      }
      results.push({ instance, roll, result });
    }

    await ActorEngine.updateActor(actor, { [FLAG_PATH]: remaining });
    return results;
  }

  static async _rollDamage(formula = "1d4") {
    if (globalThis.SWSE?.RollEngine?.safeRoll) return globalThis.SWSE.RollEngine.safeRoll(formula);
    return new Roll(formula).evaluate({ async: true });
  }

  static async _postRecurringChat(actor, instance, mode = "queued", roll = null) {
    if (typeof ChatMessage === "undefined") return null;
    const title = mode === "ticked" ? `${instance.name || "Recurring Damage"} Triggers` : `${instance.name || "Recurring Damage"} Queued`;
    const amount = roll ? `<p><strong>${escapeHtml(actor?.name || "Target")}</strong> takes <strong>${escapeHtml(roll.total)}</strong> ${escapeHtml(instance.damageType || "damage")} damage.</p>` : "";
    const remaining = instance.remainingTriggers === null || instance.remainingTriggers === undefined
      ? "until removed"
      : `${instance.remainingTriggers} trigger${Number(instance.remainingTriggers) === 1 ? "" : "s"}`;
    const content = [
      `<h2>${escapeHtml(title)}</h2>`,
      `<p><strong>Formula:</strong> ${escapeHtml(instance.formula || "?")} ${escapeHtml(instance.damageType || "")}</p>`,
      `<p><strong>Timing:</strong> ${escapeHtml(instance.trigger || "startOfTurn")} · ${escapeHtml(remaining)}</p>`,
      instance.removalCondition ? `<p><strong>Ends:</strong> ${escapeHtml(instance.removalCondition)}</p>` : "",
      amount
    ].filter(Boolean).join("");
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
  }
}

export default RecurringDamageEngine;