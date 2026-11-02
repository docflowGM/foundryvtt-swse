/**
 * Master Privateer — Piracy, The Force Unleashed Campaign Guide p. 52.
 *
 * After falling to the dark side, an EXISTING Master Privateer cannot gain
 * further levels in that class. The feature does not revoke owned levels,
 * and does not itself prohibit entering Master Privateer for the first time.
 *
 * Pure and conservative: the dark-side authority supplies the canonical
 * current/max score, and an actually owned class Item proves prior levels.
 * Callers must pass the original Actor, not untrusted picker display text.
 */
const normalized = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const actorItems = actor => Array.from(actor?.items?.contents || actor?.items || []);

export const MASTER_PRIVATEER_PIRACY_REASON =
  'Piracy: a Master Privateer lost to the dark side cannot take further levels in Master Privateer';

export function evaluateMasterPrivateerPiracy({actor,className,darkSideScore,darkSideMax}={}) {
  if(normalized(className)!=='master privateer')return {blocked:false,applies:false};
  const owned = actorItems(actor).filter(item =>
    item?.type==='class' && normalized(item?.name || item?.system?.className)==='master privateer');
  const priorLevel = owned.reduce((max,item)=>{
    const level=Number(item?.system?.level);
    return Number.isInteger(level) && level>0 ? Math.max(max,level) : max;
  },0);
  if(priorLevel<1)return {blocked:false,applies:true,priorLevel:0};
  const score=Number(darkSideScore),max=Number(darkSideMax);
  if(!Number.isFinite(score) || !Number.isFinite(max) || max<=0){
    return {blocked:true,applies:true,priorLevel,indeterminate:true,
      reason:'Piracy: dark-side status cannot be verified for continuing Master Privateer'};
  }
  const blocked=score>=max;
  return {blocked,applies:true,priorLevel,darkSideScore:score,darkSideMax:max,
    ...(blocked?{reason:MASTER_PRIVATEER_PIRACY_REASON}:{})};
}
