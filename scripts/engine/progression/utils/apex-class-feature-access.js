/**
 * Phase 6H — authoritative class-owned feature access for Core apex classes.
 *
 * Rules: Core Rulebook pp. 219-220 (Jedi Master) and 223-224 (Sith Lord).
 * This module reads actual owned class Items, DSPEngine and SchemaAdapters.
 * Merely having a feat/talent named "Fearless" or a themed sheet label is
 * NOT evidence of an apex class level. It never mutates the actor.
 *
 * IMPORTANT: GM-configured Sith *entry* thresholds do not override the
 * printed *ongoing class-feature suspension* rule (DSP < Wisdom).
 */
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

const CLASS_KEYS = Object.freeze({
  jedimaster: 'jedi_master',
  sithlord: 'sith_lord',
  sithapprentice: 'sith_apprentice',
  // ProgressionFinalizer stores clazz.id as an owned Class Item's classId;
  // these 16-hex keys are the preserved _ids in packs/classes.db.
  '07a64453f95e04f2': 'jedi_master',
  '2f7cfdc115c640a5': 'sith_lord',
  '1ba03b2d00245906': 'sith_apprentice',
});
const SITH_CLASSES = new Set(['sith_lord', 'sith_apprentice']);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function classKey(value) {
  return CLASS_KEYS[normalize(value)] ?? null;
}

function ownedClassItems(actor) {
  const items = actor?.items?.contents ?? actor?.items ?? [];
  try { return Array.from(items).filter(item => item?.type === 'class' && item?.system?.disabled !== true); }
  catch { return []; }
}

function identityOf(item) {
  // An explicit classId is authoritative. A class display name is a
  // fallback ONLY when the data lacks a stable identifier.
  return classKey(item?.system?.classId
    ?? item?.system?.class_id
    ?? item?.system?.class_name
    ?? item?.system?.className
    ?? item?.name);
}

export function apexClassLevel(actor, classId) {
  const key = classKey(classId);
  if (!key) return 0;
  return ownedClassItems(actor).filter(item => identityOf(item) === key)
    .reduce((highest, item) => {
      const n = Number(item?.system?.level);
      return Number.isSafeInteger(n) && n > 0 ? Math.max(highest, n) : highest;
    }, 0);
}

function hasCanonicalWisdom(actor) {
  const sys = actor?.system;
  return !!sys && (
    Number.isFinite(Number(sys?.derived?.attributes?.wis?.total))
    || sys?.attributes?.wis != null
    || sys?.abilities?.wis != null
  );
}

/**
 * Reports *current* feature permission, not initial prestige entry legality.
 * Absent/invalid underlying Wisdom data fails closed for Sith class features.
 * It does not revoke levels or delete earned choices.
 */
export function apexClassFeatureAccess(actor, classId) {
  const key = classKey(classId);
  const level = apexClassLevel(actor, key);
  if (!key || level < 1) {
    return { classId: key, classLevel: level, owned: false, allowed: false, reason: 'class-not-owned' };
  }
  if (!SITH_CLASSES.has(key)) {
    return { classId: key, classLevel: level, owned: true, allowed: true, reason: 'active' };
  }
  if (!hasCanonicalWisdom(actor)) {
    return { classId: key, classLevel: level, owned: true, allowed: false, reason: 'wisdom-unverified' };
  }
  const wisdom = Number(SchemaAdapters.getAbilityScore(actor, 'wis'));
  const darkSideScore = Number(DSPEngine.getValue(actor));
  if (!Number.isFinite(wisdom) || wisdom < 1 || !Number.isFinite(darkSideScore)) {
    return { classId: key, classLevel: level, owned: true, allowed: false, reason: 'score-invalid', wisdom, darkSideScore };
  }
  return {
    classId: key, classLevel: level, owned: true,
    allowed: darkSideScore >= wisdom,
    reason: darkSideScore >= wisdom ? 'active' : 'dark-side-below-wisdom',
    wisdom, darkSideScore,
  };
}

/**
 * A true Fearless entitlement belongs to an active Jedi Master or Sith Lord.
 * Sith Apprentice alone grants no Fearless immunity. Other independent fear
 * immunities, if any, must be handled by their own rule authority.
 */
export function apexFearlessSource(actor) {
  const jedi = apexClassFeatureAccess(actor, 'jedi_master');
  if (jedi.allowed) return { immune: true, classId: 'jedi_master', access: jedi };
  const sith = apexClassFeatureAccess(actor, 'sith_lord');
  if (sith.allowed) return { immune: true, classId: 'sith_lord', access: sith };
  return { immune: false, classId: null, access: sith.owned ? sith : jedi };
}

/**
 * Evidence must explicitly identify a fear effect. Do not block generic
 * Persuasion checks, hostile emotions, or arbitrary names containing 'fear'.
 */
export function isExplicitFearEffect(context = {}) {
  if (context?.fearEffect === true || context?.isFear === true) return true;
  const source = context?.sourceItem ?? context?.powerItem ?? context?.item ?? null;
  if (normalize(source?.name) === 'fear') return true;
  const fields = [
    context?.effectType, context?.descriptor,
    context?.tags, context?.effectTags, context?.traits, context?.descriptors,
    source?.system?.descriptor, source?.system?.descriptors, source?.system?.tags,
  ];
  for (const field of fields.flatMap(value => Array.isArray(value) ? value : [value])) {
    const key = normalize(field);
    if (key === 'fear' || key === 'feareffect') return true;
  }
  return false;
}

export function resolveApexFearImmunity(actor, context = {}) {
  if (!isExplicitFearEffect(context)) return { immune: false, reason: 'not-explicit-fear' };
  const source = apexFearlessSource(actor);
  return source.immune
    ? { immune: true, reason: 'fearless-class-feature', classId: source.classId }
    : { immune: false, reason: source.access.reason };
}
