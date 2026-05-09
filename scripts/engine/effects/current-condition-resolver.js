/**
 * CurrentConditionResolver
 *
 * Normalizes transient actor states, condition-track status, ActiveEffects, and
 * display-only feat/species rule notes into one sheet-friendly collection.
 * This is a display bridge only: it does not enforce GM-judgment restrictions.
 */

import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function actorEffects(actor) {
  try { return Array.from(actor?.effects ?? []); }
  catch (_err) { return []; }
}

function systemActiveEffects(actor) {
  return Array.isArray(actor?.system?.activeEffects) ? actor.system.activeEffects : [];
}

function getConditionStep(actor) {
  const candidates = [
    actor?.system?.conditionTrack?.current,
    actor?.system?.derived?.damage?.conditionStep,
    actor?.system?.condition?.step
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.max(0, Math.min(5, numeric));
  }
  return 0;
}

function isPersistentCondition(actor) {
  return actor?.system?.conditionTrack?.persistent === true
    || actor?.flags?.swse?.rageAftereffectActive === true
    || actor?.system?.derived?.damage?.conditionPersistent === true;
}

function conditionPenaltyForStep(step) {
  switch (Number(step) || 0) {
    case 1: return "-1";
    case 2: return "-2";
    case 3: return "-5";
    case 4: return "-10";
    case 5: return "Helpless";
    default: return "Normal";
  }
}

function severityForStep(step) {
  if (step >= 5) return "danger";
  if (step >= 3) return "danger";
  if (step >= 1) return "warning";
  return "info";
}

function effectDurationText(effect) {
  const duration = effect?.duration ?? {};
  if (Number.isFinite(Number(duration.rounds)) && Number(duration.rounds) > 0) {
    return `${Number(duration.rounds)} round${Number(duration.rounds) === 1 ? "" : "s"}`;
  }
  if (Number.isFinite(Number(duration.seconds)) && Number(duration.seconds) > 0) {
    return `${Number(duration.seconds)} second${Number(duration.seconds) === 1 ? "" : "s"}`;
  }
  if (duration.type) return String(duration.type);
  return "Active";
}

function summarizeEffectChanges(effect) {
  const changes = Array.isArray(effect?.changes) ? effect.changes : [];
  return changes.slice(0, 3).map(change => {
    const key = String(change?.key ?? "").replace(/^system\./, "");
    const value = change?.value ?? "";
    return key ? `${key}: ${value}` : String(value || "Effect change");
  }).filter(Boolean);
}

function buildRuleNote(item, rule, index) {
  const id = rule.id ?? `${item.id ?? normalizeName(item.name)}-${index}`;
  const label = rule.label ?? item.name ?? "Rule Note";
  const text = rule.note ?? rule.description ?? rule.text ?? item?.system?.description?.value ?? "GM-enforced rule hook.";
  return {
    id: `rule-${normalizeName(id)}`,
    label,
    type: rule.conditionType ?? rule.type ?? "rule",
    severity: rule.severity ?? "info",
    source: item.name ?? "Rule",
    text,
    details: Array.isArray(rule.details) ? rule.details : [],
    gmEnforced: rule.gmEnforced !== false,
    mechanical: rule.mechanical === true,
    icon: rule.icon ?? null,
    tags: Array.isArray(rule.tags) ? rule.tags : []
  };
}

export class CurrentConditionResolver {
  static build(actor, { includeInactiveEffects = false } = {}) {
    const entries = [];
    entries.push(...this.getConditionTrackEntries(actor));
    entries.push(...this.getRageEntries(actor));
    entries.push(...this.getActiveEffectEntries(actor, { includeInactiveEffects }));
    entries.push(...this.getSystemActiveEffectEntries(actor));
    entries.push(...this.getRuleNoteEntries(actor));
    entries.push(...this.getResourceRuleNoteEntries(actor));
    entries.push(...this.getAvailableResourceActionEntries(actor));

    const byId = new Map();
    for (const entry of entries.filter(Boolean)) {
      const id = entry.id ?? normalizeName(`${entry.type}-${entry.label}-${entry.text}`);
      if (!byId.has(id)) byId.set(id, { ...entry, id });
    }

    const cards = Array.from(byId.values()).sort((a, b) => {
      const rank = { danger: 0, warning: 1, info: 2, positive: 3 };
      return (rank[a.severity] ?? 2) - (rank[b.severity] ?? 2) || String(a.label).localeCompare(String(b.label));
    });

    return {
      cards,
      notes: cards,
      hasCards: cards.length > 0,
      hasWarnings: cards.some(card => card.severity === "warning" || card.severity === "danger"),
      activeEffectCount: cards.filter(card => card.type === "activeEffect").length
    };
  }

  static getConditionTrackEntries(actor) {
    const step = getConditionStep(actor);
    const persistent = isPersistentCondition(actor);
    if (step <= 0 && !persistent) return [];

    const label = step > 0 ? `Condition Track ${conditionPenaltyForStep(step)}` : "Persistent Condition";
    const details = [];
    if (step > 0) details.push(`Current condition step: ${conditionPenaltyForStep(step)}`);
    if (persistent) details.push("Persistent until recovered or removed by the GM/system.");

    return [{
      id: "condition-track-current",
      label,
      type: "conditionTrack",
      severity: severityForStep(step),
      source: "Condition Track",
      text: details.join(" "),
      details,
      gmEnforced: false,
      mechanical: true
    }];
  }

  static getRageEntries(actor) {
    return RageEngine.getCurrentRageConditionNotes(actor).map(note => ({
      ...note,
      source: note.source ?? "Rage",
      details: Array.isArray(note.details) ? note.details : [],
      gmEnforced: /GM-enforced/i.test(note.text ?? ""),
      mechanical: true
    }));
  }

  static getActiveEffectEntries(actor, { includeInactiveEffects = false } = {}) {
    return actorEffects(actor)
      .filter(effect => includeInactiveEffects || effect?.disabled !== true)
      .map(effect => {
        const details = summarizeEffectChanges(effect);
        const duration = effectDurationText(effect);
        return {
          id: `effect-${effect.id ?? normalizeName(effect.name)}`,
          label: effect.name ?? effect.label ?? "Active Effect",
          type: "activeEffect",
          severity: effect?.flags?.swse?.severity ?? "info",
          source: effect?.origin ?? effect?.flags?.swse?.sourceName ?? "Active Effect",
          text: details.length ? details.join("; ") : duration,
          details: duration ? [`Duration: ${duration}`, ...details] : details,
          gmEnforced: false,
          mechanical: true,
          icon: effect.icon ?? effect.img ?? null
        };
      });
  }



  static getAvailableResourceActionEntries(actor) {
    const rules = MetaResourceFeatResolver.getTemporaryDefenseRules(actor);
    return rules.map(rule => ({
      id: `available-${rule.id}`,
      label: rule.sourceName,
      type: 'resourceAction',
      severity: 'info',
      source: rule.sourceName,
      text: rule.description || `Spend a Force Point to gain +${rule.value} to defenses for 1 round.`,
      details: [
        rule.cost === 'forcePoint' ? 'Cost: 1 Force Point' : null,
        `Effect: +${rule.value} to defenses`,
        'Duration: 1 round'
      ].filter(Boolean),
      gmEnforced: false,
      mechanical: true,
      action: {
        type: 'temporaryDefense',
        label: `Use ${rule.sourceName}`,
        ruleId: rule.id,
        actorId: actor?.id ?? ''
      }
    }));
  }

  static getSystemActiveEffectEntries(actor) {
    return systemActiveEffects(actor)
      .filter(effect => effect?.enabled !== false)
      .map(effect => ({
        id: `system-effect-${effect.id ?? normalizeName(effect.name)}`,
        label: effect.name ?? effect.sourceName ?? 'Temporary Effect',
        type: 'systemActiveEffect',
        severity: effect.severity ?? 'positive',
        source: effect.sourceName ?? 'Temporary Effect',
        text: effect.description ?? `${effect.target ?? 'Effect'}: ${Number(effect.value ?? 0) >= 0 ? '+' : ''}${Number(effect.value ?? 0)}`,
        details: [
          effect.target ? `${effect.target}: ${Number(effect.value ?? 0) >= 0 ? '+' : ''}${Number(effect.value ?? 0)}` : null,
          Number.isFinite(Number(effect.roundsRemaining)) ? `Duration: ${Number(effect.roundsRemaining)} round${Number(effect.roundsRemaining) === 1 ? '' : 's'}` : null
        ].filter(Boolean),
        gmEnforced: false,
        mechanical: true
      }));
  }

  static getResourceRuleNoteEntries(actor) {
    const entries = [];
    for (const item of actorItems(actor)) {
      if (!item || item.system?.disabled === true) continue;
      const resourceRules = item.system?.abilityMeta?.resourceRules;
      if (!resourceRules || typeof resourceRules !== "object") continue;
      for (const [resource, rules] of Object.entries(resourceRules)) {
        if (!Array.isArray(rules)) continue;
        rules
          .filter(rule => rule?.displayAsCondition === true || rule?.displayNote || rule?.type === "DISPLAY_NOTE")
          .forEach((rule, index) => entries.push(buildRuleNote(item, {
            ...rule,
            id: rule.id ?? `${resource}-${rule.type ?? index}`,
            label: rule.displayLabel ?? rule.label ?? item.name,
            note: rule.displayNote ?? rule.note ?? rule.description,
            conditionType: resource,
            gmEnforced: rule.gmEnforced !== false
          }, index)));
      }
    }
    return entries;
  }

  static getRuleNoteEntries(actor) {
    const entries = [];
    for (const item of actorItems(actor)) {
      if (!item || item.system?.disabled === true) continue;
      const meta = item.system?.abilityMeta ?? {};
      const notes = Array.isArray(meta.conditionNotes) ? meta.conditionNotes : [];
      notes.forEach((note, index) => entries.push(buildRuleNote(item, note, index)));

      const rules = Array.isArray(meta.rules) ? meta.rules : [];
      rules
        .filter(rule => rule?.displayAsCondition === true || rule?.displayNote)
        .forEach((rule, index) => entries.push(buildRuleNote(item, {
          ...rule,
          note: rule.displayNote ?? rule.note ?? rule.description,
          label: rule.displayLabel ?? rule.label ?? item.name,
          gmEnforced: rule.gmEnforced !== false
        }, index)));
    }
    return entries;
  }
}

export default CurrentConditionResolver;
