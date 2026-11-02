/**
 * Core Rulebook p.222: Share Talent is a once/day STANDARD ACTION for EACH
 * permanently selected talent, granting that talent's benefits until encounter
 * end to up to floor(Officer class level / 2) allies within 10 squares that
 * can see and hear the Officer. Target prerequisites are waived.
 *
 * Pure preflight only: callers must verify target identity, range and senses
 * using the current scene/GM adjudication, then route the temporary benefit
 * through the existing talent rule owner. A plan is NOT a completed activation.
 */
const nonblank = v => typeof v === 'string' && v.trim() ? v.trim() : null;
export function planOfficerShareTalentAction({
  selections, usesToday, talentId, officerLevel, encounterId, recipients,
}={}) {
  const errors=[];
  const id=nonblank(talentId), encounter=nonblank(encounterId);
  const level=Number(officerLevel);
  const limit=Number.isInteger(level)&&level>=2?Math.floor(level/2):0;
  if(!limit)errors.push('Officer class level is insufficient for Share Talent');
  if(!encounter)errors.push('A current encounter is required for Share Talent duration');
  const chosen=Array.isArray(selections)?selections.filter(x=>x.talentId===id):[];
  if(!id||chosen.length!==1)errors.push('Selected talent must be an immutable Officer Share Talent choice');
  if(Array.isArray(usesToday)&&usesToday.some(x=>x.talentId===id)){
    errors.push('This selected talent has already been shared today');
  }
  if(!Array.isArray(recipients)||recipients.length<1||recipients.length>limit) {
    errors.push(`Share Talent must target between 1 and ${limit} allies`);
  }
  const seen=new Set();
  for(const recipient of (Array.isArray(recipients)?recipients:[])){
    const rid=nonblank(recipient?.actorId);
    if(!rid||seen.has(rid))errors.push('Targets must have unique canonical actor identities');
    if(rid)seen.add(rid);
    if(recipient?.isAlly!==true)errors.push('Share Talent target must be an ally');
    if(!Number.isFinite(recipient?.distanceSquares)||recipient.distanceSquares<0||recipient.distanceSquares>10){
      errors.push('Each Share Talent target must be within 10 squares');
    }
    if(recipient?.canSeeOfficer!==true || recipient?.canHearOfficer!==true){
      errors.push('Each Share Talent target must be able to see and hear the Officer');
    }
  }
  if(errors.length)return {ok:false,errors,plan:null};
  return {ok:true,errors:[],plan:{
    actionType:'standard',source:'officer.shareTalent',
    talentId:id,officerLevel:level,
    recipientActorIds:recipients.map(x=>x.actorId),
    encounterId:encounter,duration:'end-of-encounter',
    waiveRecipientTalentPrerequisites:true,
    dailyUseKey:`officer.shareTalent:${id}`,
  }};
}
