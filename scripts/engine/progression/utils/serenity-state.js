/**
 * Jedi Master Serenity — pure temporal policy (Core Rulebook p. 220).
 *
 * No actor mutations, dice, or gameplay hooks in this module. The runtime
 * service owns action receipts and ActorEngine writes; RollCore is the
 * existing authority for the actual natural-20 d20 evaluation.
 */
export const SERENITY_PATH='flags.swse.classFeatures.jediMaster.serenity';

export function readSerenityState(actor){
  const state=actor?.flags?.swse?.classFeatures?.jediMaster?.serenity??null;
  return state&&typeof state==='object'?state:null;
}
export function validSerenityCombat(combat) {
  return Boolean(combat?.id && combat?.started===true
    && Number.isSafeInteger(combat.round) && combat.round>=0);
}
export function serenityTranceActive(actor,combat) {
  const s=readSerenityState(actor);
  return validSerenityCombat(combat)&&s?.encounterId===combat.id&&s.phase==='trance';
}

export function planSerenityTransition(actor,combat,action) {
  const fail=reason=>({allowed:false,reason});
  if(!validSerenityCombat(combat))return fail('encounter-required');
  const prior=readSerenityState(actor);
  const state=prior?.encounterId===combat.id?prior:null;
  if(action==='enter'){
    if(state?.phase==='trance')return fail('already-in-trance');
    if(state?.phase==='prepared'&&combat.round<=state.eligibleRound)
      return fail('natural-20-pending');
    return {
      allowed:true,actionType:'full-round',
      next:{phase:'trance',encounterId:combat.id,entryRound:combat.round}
    };
  }
  if(action==='exit'){
    if(state?.phase!=='trance')return fail('not-in-trance');
    return {
      allowed:true,actionType:'swift',
      next:{phase:'prepared',encounterId:combat.id,
        exitRound:combat.round,eligibleRound:combat.round+1,
        consumed:false}
    };
  }
  return fail('unknown-action');
}

/** "Following round" is exactly combat.round + 1, not exit turn. */
export function serenityNatural20Eligible(actor,combat,domain,formula) {
  if(!validSerenityCombat(combat))return false;
  const s=readSerenityState(actor);
  if(s?.phase!=='prepared'||s.encounterId!==combat.id
    ||s.consumed===true||s.eligibleRound!==combat.round)return false;
  const rollDomain=String(domain??'').toLowerCase().replace(/[\s_-]+/g,'');
  const qualifies=rollDomain==='combat.attack'||rollDomain==='skill.usetheforce'
    ||rollDomain==='forcepower.activation'||rollDomain==='forceregimen.activation';
  if(!qualifies)return false;
  // Never maximize attack damage or bonus dice; Serenity applies to exactly
  // one d20 in a check, with numeric modifiers. An unfamiliar formula gets
  // normal dice and remains available for an eligible later roll.
  const dice=String(formula??'').toLowerCase().match(/\b\d+d\d+\b/g)??[];
  return dice.length===1&&dice[0]==='1d20';
}
export function serenityConsumedState(state,round) {
  return {...state,phase:'consumed',consumed:true,consumedRound:round};
}
