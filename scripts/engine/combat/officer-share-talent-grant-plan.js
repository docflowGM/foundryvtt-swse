/** Foundry-independent talent Item provenance and shared-Item construction. */
import { isPermanentOfficerTalentItem } from '../progression/utils/officer-owned-talent-identity.js';
export const asItems=v=>Array.from(v?.contents||v||[]);
const provenance=item=>item?.flags?.swse?.officerSharedTalent || null;
const dayFromClock=time=>Number.isFinite(Number(time))?Math.floor(Number(time)/86400):null;
const sourceId=item=>String(item?.flags?.core?.sourceId||item?.system?.sourceId||'');
/**
 * Recognize only a complete canonical, temporary Officer Share Talent grant.
 * The grant's prerequisite waiver is published RAW; normal talents continue
 * through the existing prerequisite integrity evaluator unchanged.
 */
export function isOfficerSharedTalentPrerequisiteWaived(item) {
  const sys=item?.system,proof=item?.flags?.swse?.officerSharedTalent;
  if(item?.type!=='talent' || sys?.sourceType!=='officer-share-talent'
    || sys?.prerequisiteWaivedBy!=='officer.shareTalent'
    || sys?.autoGranted!==true || sys?.temporary!==true
    || proof?.temporary!==true || proof?.expires!=='end-of-encounter') return false;
  for(const value of [proof.sourceOfficerId,proof.talentId,proof.encounterId]) {
    if(typeof value!=='string' || !value.trim())return false;
  }
  return sys.talentSourceId===proof.talentId
    && Number.isInteger(proof.officerLevel) && proof.officerLevel>=2
    && Number.isInteger(proof.day);
}

const copied=x=>JSON.parse(JSON.stringify(x));
const uniqueActors=(actors)=>Array.from(new Map(actors.map(a=>[a.id,a])).values());

export function ownOfficerTalentItem(officer,talentId) {
  const suffix=`.${talentId}`;
  const matches=asItems(officer?.items).filter(item=>isPermanentOfficerTalentItem(item) && (
    item.system?.canonicalId===talentId || item.system?.talentSourceId===talentId
    || sourceId(item).endsWith(suffix)));
  if(matches.length!==1)throw new Error('The selected canonical Talent Item is not uniquely owned by the Officer');
  return matches[0];
}
function recipientHasTalent(recipient,talentId) {
  const suffix=`.${talentId}`;
  return asItems(recipient?.items).some(item=>item.type==='talent' &&
    (item.system?.canonicalId===talentId || item.system?.talentSourceId===talentId
      || sourceId(item).endsWith(suffix)));
}

export function buildOfficerShareTalentGrant({officer,recipient,talent,selection,encounterId,day}={}) {
  if(!officer?.id||!recipient?.id||!talent||!selection?.talentId||!encounterId||!Number.isInteger(day))
    throw new Error('Incomplete Officer Share Talent provenance');
  if(recipientHasTalent(recipient,selection.talentId))return null;
  const raw=typeof talent.toObject==='function'?talent.toObject():copied(talent);
  if(raw.type!=='talent')throw new Error('Only an owned canonical Talent Item can be shared');
  delete raw._id;delete raw.id;
  delete raw._stats;
  const proof={
    sourceOfficerId:officer.id,talentId:selection.talentId,
    officerLevel:selection.officerLevel,encounterId,day,
    expires:'end-of-encounter',temporary:true,
  };
  return {
    ...raw,
    flags:{...(raw.flags||{}),swse:{...(raw.flags?.swse||{}),officerSharedTalent:proof}},
    system:{...(raw.system||{}),autoGranted:true,sourceType:'officer-share-talent',
      talentSourceId:selection.talentId,temporary:true,
      prerequisiteWaivedBy:'officer.shareTalent'},
  };
}

