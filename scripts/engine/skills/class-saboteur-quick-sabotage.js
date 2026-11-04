/**
 * Saboteur — Quick Sabotage (Force Unleashed Campaign Guide, p. 48).
 *
 * Uses the existing Disable Device Mechanics action. At Saboteur 4+, a
 * security kit can be replaced by improvised tools; simple devices take
 * one swift action. At level 6+, tricky devices take one swift action.
 * At level 8+, complex devices take TWO swift actions.
 *
 * This is a pure declared action requirement; the calling combat/action
 * owner must actually spend the indicated actions before applying effects.
 * Do not silently award extra swift actions or spend only one for complex.
 */
const key=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const itemsOf=actor=>Array.from(actor?.items?.contents??actor?.items??[]);

export function quickSabotageClassLevel(actor) {
  return itemsOf(actor).filter(item=>item?.type==='class'
    && key(item?.system?.className||item?.system?.class_name||item?.name)==='saboteur')
    .reduce((max,item)=>{
      const n=Number(item?.system?.level);
      return Number.isSafeInteger(n)&&n>0?Math.max(max,n):max;
    },0);
}

export function planQuickSabotage({actor,complexity,hasSecurityKit=null}={}) {
  const device=key(complexity);
  if(!['simple','tricky','complex'].includes(device)) {
    return {allowed:false,reason:'Unknown device complexity; GM adjudication required'};
  }
  const level=quickSabotageClassLevel(actor);
  const unlocked=level>=4;
  let actionType='full-round',swiftActions=0;
  if(level>=4 && device==='simple') {actionType='swift';swiftActions=1;}
  if(level>=6 && device==='tricky') {actionType='swift';swiftActions=1;}
  if(level>=8 && device==='complex') {actionType='two-swift-actions';swiftActions=2;}
  // A caller must explicitly report absence of a kit to assert use of
  // improvised tools. Unknown availability cannot prove kit ownership.
  const kitVerified=hasSecurityKit===true;
  const kitAbsent=hasSecurityKit===false;
  const usesImprovisedTools=kitAbsent&&unlocked;
  const allowed=!(kitAbsent&&!unlocked);
  return {
    allowed,actionType,swiftActions,saboteurLevel:level,complexity:device,
    kitVerified,kitAvailabilityKnown:kitVerified||kitAbsent,
    usesImprovisedTools,improvisedToolsAllowed:unlocked,
    required:usesImprovisedTools?'Improvised tools':kitVerified?'Security Kit':'Security Kit (GM verify)',
    ...(allowed?{}:{reason:'Security Kit required without Quick Sabotage'}),
    source:unlocked?'Saboteur — Quick Sabotage':null,
  };
}
