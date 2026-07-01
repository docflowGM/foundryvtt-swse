/**
 * CombatTargetEffectAdapter — Phase 10E
 *
 * Consumes targetEffectsOnHit / targetEffectsOnCritical payloads collected by
 * CombatOptionResolver and carried by attack results. This adapter is the
 * target-effect consumer boundary: it normalizes effect metadata, builds safe
 * target mutation plans, and applies only supported effects through ActorEngine.
 *
 * It intentionally does not duplicate attack math, damage math, or target
 * selection. Unsupported effects are surfaced as manual notes instead of being
 * silently dropped.
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeEffectType(effect = {}) {
  return normalizeToken(effect.type ?? effect.effectType ?? effect.kind ?? effect.mode ?? "manual-note");
}

function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getConditionCap() {
  try {
    return ConditionTrackRules.getConditionStepCap();
  } catch (_err) {
    return 5;
  }
}

function conditionDirection(effect = {}) {
  const direction = normalizeToken(effect.direction ?? effect.conditionDirection ?? effect.move ?? effect.shiftDirection ?? "down");
  if (["up", "improve", "improved", "recover", "recovery", "heal"].includes(direction)) return -1;
  return 1;
}

function conditionSteps(effect = {}) {
  const raw = effect.steps ?? effect.step ?? effect.value ?? effect.amount ?? effect.conditionSteps ?? effect.ctSteps ?? 1;
  return Math.max(0, Math.abs(numeric(raw, 1)));
}

function isConditionTrackEffect(effect = {}) {
  const type = normalizeEffectType(effect);
  return [
    "condition-track-shift",
    "condition-track-move",
    "condition-track-step",
    "target-condition-track-shift",
    "target-condition-track-move",
    "move-target-ct",
    "ct-shift",
    "ct-step",
    "move-condition-track",
    "move-target-condition-track"
  ].includes(type);
}

function sourceLabel(effect = {}, fallback = "Target Effect") {
  return String(effect.sourceName ?? effect.label ?? effect.name ?? effect.source ?? fallback ?? "Target Effect").trim() || "Target Effect";
}

function currentConditionStep(actor) {
  return numeric(actor?.system?.conditionTrack?.current, 0);
}

function clampConditionStep(step) {
  const cap = getConditionCap();
  return Math.max(0, Math.min(cap, numeric(step, 0)));
}

function resolveTargetActor(input = {}) {
  return input.targetActor
    ?? input.target
    ?? input.attackResult?.target
    ?? input.attackResult?.targetActor
    ?? input.context?.targetActor
    ?? input.context?.target
    ?? null;
}

function effectAppliesToAttack(effect = {}, attackResult = {}) {
  if (effect.requiresHit === true && attackResult.isHit !== true) return false;
  if (effect.requiresCritical === true && attackResult.isCritical !== true) return false;
  if (effect.oncePerTurn === true && attackResult.effectUsageBlocked === true) return false;
  return true;
}

export class CombatTargetEffectAdapter {
  static collectEffectsForAttack(attackResult = {}) {
    const effects = [];
    if (attackResult?.isHit === true) {
      effects.push(...asArray(attackResult.targetEffectsOnHit).map(effect => ({ ...effect, trigger: effect?.trigger ?? "hit" })));
    }
    if (attackResult?.isCritical === true) {
      effects.push(...asArray(attackResult.targetEffectsOnCritical).map(effect => ({ ...effect, trigger: effect?.trigger ?? "critical" })));
    }
    return effects.filter(effect => effect && typeof effect === "object" && effectAppliesToAttack(effect, attackResult));
  }

  static buildPlans(input = {}) {
    const attackResult = input.attackResult ?? input.context?.attackResult ?? {};
    const targetActor = resolveTargetActor(input);
    const attacker = input.attacker ?? input.actor ?? input.attackResult?.actor ?? input.context?.attacker ?? null;
    const effects = asArray(input.effects).length ? asArray(input.effects) : this.collectEffectsForAttack(attackResult);
    const plans = [];
    const manualNotes = [];

    for (const effect of effects) {
      if (!effect || typeof effect !== "object") continue;
      const label = sourceLabel(effect, input.sourceName);

      if (isConditionTrackEffect(effect)) {
        if (!targetActor) {
          manualNotes.push({
            type: "missing-target",
            sourceName: label,
            message: `${label}: target condition-track effect could not be applied because no target actor was available.`,
            effect
          });
          continue;
        }
        const current = currentConditionStep(targetActor);
        const delta = conditionDirection(effect) * conditionSteps(effect);
        const next = clampConditionStep(current + delta);
        plans.push({
          type: "conditionTrackShift",
          sourceName: label,
          sourceId: effect.sourceId ?? effect.sourceItemId ?? null,
          targetActor,
          targetActorId: targetActor.id ?? null,
          targetName: targetActor.name ?? "Target",
          attacker,
          attackerId: attacker?.id ?? null,
          currentStep: current,
          delta,
          nextStep: next,
          persistent: effect.persistent === true,
          effect,
          message: `${label}: ${targetActor.name ?? "target"} condition track ${delta >= 0 ? "worsens" : "improves"} by ${Math.abs(delta)} step${Math.abs(delta) === 1 ? "" : "s"}.`
        });
        continue;
      }

      manualNotes.push({
        type: "unsupported-target-effect",
        sourceName: label,
        message: `${label}: unsupported target effect type "${normalizeEffectType(effect)}". Resolve manually until a dedicated handler exists.`,
        effect
      });
    }

    return {
      attackResult,
      targetActor,
      attacker,
      plans,
      manualNotes,
      hasSupportedPlans: plans.length > 0,
      hasManualNotes: manualNotes.length > 0
    };
  }

  static async applyPlans(planResult = {}, options = {}) {
    const applied = [];
    const skipped = [];
    const plans = asArray(planResult.plans);

    for (const plan of plans) {
      if (plan.type !== "conditionTrackShift") {
        skipped.push({ ...plan, reason: "Unsupported plan type." });
        continue;
      }
      if (!plan.targetActor) {
        skipped.push({ ...plan, reason: "Missing target actor." });
        continue;
      }
      if (plan.nextStep === plan.currentStep) {
        skipped.push({ ...plan, reason: "Condition step already at requested value." });
        continue;
      }

      const result = await ActorEngine.setConditionStep(
        plan.targetActor,
        plan.nextStep,
        options.source ?? plan.sourceName ?? "target-effect"
      );

      if (plan.persistent === true) {
        await ActorEngine.setConditionPersistent(plan.targetActor, true, options.source ?? plan.sourceName ?? "target-effect");
      }

      applied.push({ ...plan, result });
    }

    return {
      success: applied.length > 0,
      applied,
      skipped,
      manualNotes: asArray(planResult.manualNotes)
    };
  }

  static async applyFromAttackResult(attackResult = {}, options = {}) {
    const planResult = this.buildPlans({
      attackResult,
      attacker: options.attacker ?? attackResult.actor ?? attackResult.attacker ?? null,
      targetActor: options.targetActor ?? attackResult.target ?? null,
      effects: options.effects ?? null,
      sourceName: options.sourceName ?? "Target Effect"
    });

    if (options.apply === false || options.preview === true) {
      return { ...planResult, applied: [], skipped: [] };
    }

    const application = await this.applyPlans(planResult, options);
    return { ...planResult, ...application };
  }
}

export default CombatTargetEffectAdapter;
