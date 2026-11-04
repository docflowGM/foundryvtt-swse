/**
 * Saboteur — Quick Sabotage (Force Unleashed Campaign Guide, p. 49).
 * Printed progression: improvised tools may substitute for a Security Kit;
 * at level 4 disable simple devices as one swift action; at 6 tricky
 * devices as one swift; at 8 complex devices as TWO swift actions.
 *
 * This source-scoped planner is pure. The V2 action-economy owner performs
 * any cost spending; the Mechanics use owns skill checks and their effects.
 */
const key=v=>String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const itemsOf=a=>Array.from(a?.items?.contents??a?.items??[]);
const types=new Set(['simple','tricky','complex']);

export function saboteurLevel(actor) {
  return itemsOf(actor).filter(item=>item?.type==='class'
    && key(item?.system?.className||item?.system?.class_name||item?.name)==='saboteur')
    .reduce((max,item)=>{
      const n=Number(item?.system?.level);
      return Number.isSafeInteger(n)&&n>0?Math.max(max,n):max;
    },0);
}

export function planQuickSabotage(actor,complexity) {
  const level=saboteurLevel(actor);
  const type=key(complexity);
  if(!types.has(type))throw new Error('Quick Sabotage requires a known device complexity');
  const quick=level>=4&&(type==='simple'||level>=6&&type==='tricky'||level>=8&&type==='complex');
  const swiftActions=quick?(type==='complex'?2:1):0;
  return {
    level,complexity:type,quick,swiftActions,
    actionLabel:swiftActions===2?'Two Swift Actions':swiftActions===1?'Swift Action':'Full-Round Action',
    // Quick Sabotage is first acquired at level 4. Ordinary Saboteurs
    // cannot invoke its improvised-security-kit substitution.
    improvisedSecurityKitAllowed:level>=4,
  };
}

/**
 * Reserve swift action(s) before rolling. A rejected cost must not trigger
 * a Mechanics check. If a later leg fails, rollback all committed spends.
 * Out-of-combat is the canonical ActionEconomyConsumption no-op case.
 */
export async function executeQuickSabotage({actor,plan,spend,perform}={}) {
  if(!plan || typeof perform!=='function' || typeof spend!=='function')
    throw new Error('Quick Sabotage requires plan, action spender and Mechanics executor');
  const handles=[];
  try {
    for(let i=0;i<plan.swiftActions;i++){
      const receipt=await spend(actor,'swift',{
        source:'Saboteur Quick Sabotage',
        actionName:plan.actionLabel,
        swiftIndex:i+1,swiftTotal:plan.swiftActions,
      });
      if(receipt?.committed!==true && !(receipt?.noOp===true&&receipt?.reason==='out-of-combat'))
        throw new Error('Quick Sabotage swift action expenditure was not committed');
      if(receipt?.committed===true) handles.push(receipt);
    }
    return await perform();
  }catch(error){
    const failed=[];
    for(const receipt of handles.reverse()){
      try{
        const status=await receipt.rollback?.();
        if(status===false)failed.push('refused');
      }catch(err){failed.push(err?.message??'unknown');}
    }
    if(failed.length)throw new Error('Quick Sabotage action rollback INDETERMINATE; GM review required',{cause:error});
    throw error;
  }
}
