/**
 * Core pp. 215, 220, 224 — Indomitable and Fearless typed-effect ingress.
 *
 * Normalize only EXPLICIT metadata on a proposed ActiveEffect or typed
 * condition shift, never guess descriptor from generic prose or a loosely
 * related effect title. Return pure decisions to existing mutation owners.
 */
import { resolveApexFearImmunity } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/apex-class-feature-access.js';
import { resolveForceDiscipleIndomitable } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-disciple-features.js';

const array = value=>Array.isArray(value)?value:value==null?[]:[value];
export function typedEffectContext(effect={}) {
  const swse=effect?.flags?.swse??{};
  const system=effect?.flags?.['foundryvtt-swse']??{};
  const direct=effect?.system??{};
  const descriptors=[
    ...array(effect?.descriptor),...array(effect?.descriptors),
    ...array(effect?.tags),...array(effect?.effectTags),
    ...array(swse.descriptor),...array(swse.descriptors),...array(swse.effectTags),...array(swse.tags),
    ...array(system.descriptor),...array(system.descriptors),...array(system.effectTags),...array(system.tags),
    ...array(direct.descriptor),...array(direct.descriptors),...array(direct.tags),
  ];
  return {
    effectTags:descriptors,
    fearEffect: swse.fearEffect===true||system.fearEffect===true||effect?.fearEffect===true,
    mindAffecting: swse.mindAffecting===true||system.mindAffecting===true||effect?.mindAffecting===true,
    sourceItem: effect?.sourceItem??null,
  };
}
export function resolveForceClassTypedEffectImmunity(target,effect={}) {
  const context=typedEffectContext(effect);
  const fearless=resolveApexFearImmunity(target,context);
  if(fearless.immune)return {immune:true,reason:'fearless-class-feature',classId:fearless.classId};
  const indomitable=resolveForceDiscipleIndomitable(target,context);
  if(indomitable.immune)return {immune:true,reason:'indomitable-class-feature',classId:'force_disciple'};
  return {immune:false,reason:'not-explicit-immune-effect'};
}
export function filterForceClassImmuneActiveEffects(target,effects=[]) {
  if(!Array.isArray(effects))throw new TypeError('ActiveEffects must be an array');
  const accepted=[],suppressed=[];
  for(const effect of effects) {
    const decision=resolveForceClassTypedEffectImmunity(target,effect);
    if(decision.immune)suppressed.push({effect,decision});
    else accepted.push(effect);
  }
  return {accepted,suppressed};
}
