/**
 * Sith Lord Temptation — Core Rulebook p.224.
 *
 * Pure target-owned temporal ledger. A successful Persuasion vs Will check
 * installs a pending link, NOT a condition/DSP penalty. The consequence is
 * chosen by the affected actor only after a committed FP/DP spend, and
 * expires when the source Sith Lord next begins a turn.
 */
export const TEMPTATION_PATH='flags.swse.classFeatures.sithLord.temptation';
export const TEMPTATION_EVENTS_PATH='flags.swse.classFeatures.sithLord.temptationEvents';

export const actorIdentity = actor => String(actor?.uuid||actor?.id||'');
export const hasCurrentCombat = combat =>
  Boolean(combat?.id&&combat.started===true&&Number.isSafeInteger(combat.round)&&combat.round>=0);

export function currentTemptations(actor) {
  const rows=actor?.flags?.swse?.classFeatures?.sithLord?.temptation;
  return Array.isArray(rows)?rows:[];
}
export function currentTemptationEvents(actor) {
  const rows=actor?.flags?.swse?.classFeatures?.sithLord?.temptationEvents;
  return Array.isArray(rows)?rows:[];
}
export function planTemptationMark({caster,target,combat,checkTotal,willDefense,confirmedLineOfSight=false}={}){
  const no=reason=>({allowed:false,reason});
  if(!hasCurrentCombat(combat))return no('encounter-required');
  if(!actorIdentity(caster)||!actorIdentity(target)||actorIdentity(caster)===actorIdentity(target))
    return no('distinct-actor-required');
  if(confirmedLineOfSight!==true)return no('GM-line-of-sight-not-confirmed');
  if(!Number.isFinite(checkTotal)||!Number.isFinite(willDefense))
    return no('unverified-persuasion-or-defense');
  if(checkTotal<willDefense)return {allowed:false,reason:'persuasion-failed',checkTotal,willDefense};
  if(!combat.combatant?.id)return no('current-combatant-unverified');
  const entry={
    id:actorIdentity(caster)+':'+String(combat.id)+':'+String(combat.round)+':'+String(combat.turn),
    sourceActorId:actorIdentity(caster),
    sourceCombatantId:String(combat.combatant.id),
    targetActorId:actorIdentity(target),
    encounterId:String(combat.id),
    createdRound:Number(combat.round),
    createdTurn:Number(combat.turn),
    checkTotal,willDefense,
    state:'active',
  };
  const existing=currentTemptations(target).filter(x=>x.id!==entry.id&&x.state==='active');
  return {allowed:true,reason:'temptation-active',entry,updates:{
    [TEMPTATION_PATH]:[...existing,entry],
  }};
}

/**
 * A confirmed spend event is mandatory. It cannot be inferred from edited
 * pool values. Every event has a unique receipt ID for replay deduplication.
 */
export function planTemptationSpend({target,combat,event}={}){
  if(!hasCurrentCombat(combat)||event?.committed!==true
     ||!['force','destiny'].includes(event?.resource)
     ||!actorIdentity(target)||event?.actorId!==actorIdentity(target)
     ||!event?.receiptId||!Number.isSafeInteger(event?.spent)||event.spent<1)
    return {eligible:false,reason:'invalid-spend-receipt'};
  const entries=currentTemptations(target).filter(x=>
    x.state==='active'&&x.targetActorId===actorIdentity(target)
    &&x.encounterId===combat.id
    // Even if the GM's cleanup hook has not run yet, the pending effect
    // cannot extend past the source Sith Lord's NEXT turn.
    && combat.round>=x.createdRound && combat.round<=x.createdRound+1
    && !(combat.round===x.createdRound+1
      && combat.turn>=x.createdTurn));
  if(!entries.length)return {eligible:false,reason:'no-active-temptation'};
  const events=currentTemptationEvents(target);
  if(events.some(x=>x.receiptId===event.receiptId))
    return {eligible:false,reason:'duplicate-spend-receipt'};
  // One resource-spend transaction triggers one target choice per active
  // Temptation source. No mutation occurs until target confirms a choice.
  const consequences=entries.map(entry=>({
    id:entry.id,receiptId:event.receiptId,resource:event.resource,
    steps:event.resource==='destiny'?2:1,
    sourceActorId:entry.sourceActorId,
    encounterId:entry.encounterId,
  }));
  return {eligible:true,consequences};
}
export function expireTemptationEntries(actor,combat,{nextTurn=false,encounterEnd=false}={}){
  const current=currentTemptations(actor);
  if(!current.length)return {changed:false,entries:current};
  const updated=current.map(e=>{
    if(e.state!=='active')return e;
    const stale=encounterEnd || e.encounterId!==combat?.id
      || (nextTurn && e.sourceCombatantId===String(combat?.combatant?.id||'')
        && (Number(combat?.round)>Number(e.createdRound)
          || Number(combat?.turn)!==Number(e.createdTurn)));
    return stale?{...e,state:'expired',expiredRound:combat?.round??null}:e;
  });
  return {changed:updated.some((x,i)=>x!==current[i]),entries:updated};
}
