/**
 * Typed ActiveEffect admission policy for Force prestige-class immunities.
 *
 * The authoritative ActorEngine effect writers invoke this BEFORE creating
 * embedded documents. This is a last-resort defense in depth, not an alternate
 * effect engine: typed consumers should still check immunity before their
 * other actor mutations (e.g. Condition Track shifts).
 *
 * Core Rulebook p.215: Force Disciple Indomitable, p.220/p.224: Fearless.
 * Never infer types from effect name, prose, caster identity, or emotion.
 */
import { resolveForceDiscipleIndomitable } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-disciple-features.js';
import { resolveApexFearImmunity } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/apex-class-feature-access.js';

const normalize=x=>String(x??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const asArray=v=>Array.isArray(v)?v:(v==null?[]:[v]);

/** Only explicit boolean fields and exact descriptor tokens qualify. */
export function typedActiveEffectDescriptors(effect){
  const flags=effect?.flags??{};
  // A direct caller may pass typed condition metadata rather than an ActiveEffect.
  // Include only explicit descriptor fields: never classify by name or prose.
  const sources=[effect,flags.swse,flags['foundryvtt-swse'],effect?.system].filter(x=>x&&typeof x==='object');
  const tokens=sources.flatMap(source=>[
    ...asArray(source.descriptor),
    ...asArray(source.descriptors),
    ...asArray(source.effectTags),
    ...asArray(source.tags),
  ]).flatMap(value=>typeof value==='string'?value.split(','):[value])
    .map(normalize);
  return {
    mindAffecting:sources.some(s=>s.mindAffecting===true||s.isMindAffecting===true)
      ||tokens.includes('mindaffecting'),
    fear:sources.some(s=>s.fearEffect===true||s.isFear===true||s.fear===true)
      ||tokens.includes('fear')||tokens.includes('feareffect'),
  };
}

export function admitClassImmuneActiveEffects(actor,effects=[]){
  const permitted=[],suppressed=[];
  for(const effect of effects){
    const typed=typedActiveEffectDescriptors(effect);
    if(typed.mindAffecting){
      const immunity=resolveForceDiscipleIndomitable(actor,{mindAffecting:true});
      if(immunity.immune){
        suppressed.push({name:String(effect?.name??''),reason:'Force Disciple — Indomitable',descriptor:'Mind-Affecting'});
        continue;
      }
    }
    if(typed.fear){
      const immunity=resolveApexFearImmunity(actor,{fearEffect:true});
      if(immunity.immune){
        suppressed.push({name:String(effect?.name??''),reason:'Fearless',descriptor:'Fear'});
        continue;
      }
    }
    permitted.push(effect);
  }
  return {permitted,suppressed};
}
