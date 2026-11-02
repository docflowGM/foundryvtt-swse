/**
 * Master Privateer — Piracy (The Force Unleashed Campaign Guide p. 52).
 *
 * GM ADJUDICATION POLICY: "fallen to the dark side" is a narrative state,
 * NOT equivalent to a Dark Side Points threshold. DSP can surface a caution,
 * but neither automatic eligibility nor finalization is allowed to deny the
 * class level on that basis. The GM determines whether the printed restriction
 * applies and how to handle the advancement.
 */
const normalized=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const itemsOf=actor=>Array.from(actor?.items?.contents||actor?.items||[]);

export const MASTER_PRIVATEER_PIRACY_REASON =
  'Piracy (Force Unleashed p. 52): a Master Privateer who has fallen to the dark side cannot advance further in this class under the printed rule. The GM determines whether the character has fallen and adjudicates this restriction.';

export function evaluateMasterPrivateerPiracy({actor,className,darkSideScore,darkSideMax}={}) {
  if(normalized(className)!=='master privateer')
    return {applies:false,advisory:false,blocked:false};
  const owned=itemsOf(actor).filter(item=>item?.type==='class'
    && normalized(item?.name||item?.system?.className)==='master privateer');
  const priorLevel=owned.reduce((max,item)=>{
    const n=Number(item?.system?.level);
    return Number.isInteger(n)&&n>0?Math.max(max,n):max;
  },0);
  if(priorLevel<1) return {applies:false,advisory:false,blocked:false,priorLevel:0};
  // An observed threshold is a prompt for a GM discussion, never a verdict.
  const validScore=typeof darkSideScore==='number'&&Number.isFinite(darkSideScore);
  const validMax=typeof darkSideMax==='number'&&Number.isFinite(darkSideMax)&&darkSideMax>0;
  const thresholdReached=validScore&&validMax ? darkSideScore>=darkSideMax : null;
  return {applies:true,advisory:true,blocked:false,requiresGMAdjudication:true,
    priorLevel,thresholdReached,reason:MASTER_PRIVATEER_PIRACY_REASON};
}
