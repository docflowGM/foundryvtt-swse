/**
 * Elite Trooper — Damage Reduction (SWSE Core Rulebook, p. 217).
 *
 * Printed schedule: DR 1 at class level 2, +1 every two class levels
 * thereafter, to DR 5 at level 10.
 *
 * This is one ordinary DR source. The canonical mitigation resolver owns
 * highest-applicable DR selection, damage-type exceptions, and lightsaber
 * bypass. Do not independently subtract HP damage or stack other DR sources.
 */
const normalize=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,'');

export function eliteTrooperClassLevel(actor) {
  const items=Array.from(actor?.items?.contents || actor?.items || []);
  return items.filter(item=>item?.type==='class'
    && normalize(item?.system?.className || item?.system?.class_name || item?.name)==='elitetrooper')
    .reduce((max,item)=>{
      const level=Number(item?.system?.level);
      return Number.isSafeInteger(level)&&level>0?Math.max(max,level):max;
    },0);
}

export function eliteTrooperDamageReduction(actor) {
  const level=eliteTrooperClassLevel(actor);
  return Math.min(5,Math.floor(level/2));
}

export function eliteTrooperDamageReductionEntry(actor) {
  const value=eliteTrooperDamageReduction(actor);
  return value>0?{value,exceptions:[],source:'Elite Trooper — Damage Reduction'}:null;
}
