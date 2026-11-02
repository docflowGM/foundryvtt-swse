/**
 * Core Rulebook p.222 — Officer Share Talent activation.
 *
 * Recipients receive a temporary clone of the Officer's actual canonical
 * Talent Item, so existing actor-owned talent rules and passive effects can
 * evaluate the shared benefit without a second talent-rules engine.
 *
 * Every actor leg uses transactional ActorEngine with pre-captured snapshots;
 * multi-actor rollback is certified through restoreSnapshotVerified. Cross-
 * actor operations are serialized here, but not assumed globally atomic.
 * Permission: GM executes; user must affirm sight/hearing in encounter UI.
 */
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { TalentDB } from '/systems/foundryvtt-swse/scripts/data/talent-db.js';
import { TalentTreeDB } from '/systems/foundryvtt-swse/scripts/data/talent-tree-db.js';
import { eligibleOfficerShareTalents, persistedOfficerShareTalents } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/officer-share-talent-authority.js';
import { planOfficerShareTalentAction } from '/systems/foundryvtt-swse/scripts/engine/combat/officer-share-talent-action-rules.js';

const locks=new Set();
const asItems=v=>Array.from(v?.contents||v||[]);
const provenance=item=>item?.flags?.swse?.officerSharedTalent || null;
const dayFromClock=time=>Number.isFinite(Number(time))?Math.floor(Number(time)/86400):null;
const sourceId=item=>String(item?.flags?.core?.sourceId||item?.system?.sourceId||'');
const copied=x=>JSON.parse(JSON.stringify(x));
const uniqueActors=(actors)=>Array.from(new Map(actors.map(a=>[a.id,a])).values());

export function ownOfficerTalentItem(officer,talentId) {
  const suffix=`.${talentId}`;
  const matches=asItems(officer?.items).filter(item=>item.type==='talent' && (
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

/** Strict GM runtime service. Returns successful delivery only after all legs commit. */
export class OfficerShareTalentService {
  static async activate({officer,talentId,combat,recipientActors,recipientProofs}={}) {
    if(globalThis.game?.user?.isGM!==true)throw new Error('GM authorization is required to apply shared talent benefits');
    if(!officer?.id||!combat?.id||combat.started!==true)throw new Error('Share Talent requires an active encounter and Officer');
    if(locks.has(officer.id))throw new Error('Officer Share Talent already in progress');
    locks.add(officer.id);
    try {
      if(!TalentTreeDB.isBuilt && !(await TalentTreeDB.build()))throw new Error('Talent tree registry unavailable');
      if(!TalentDB.isBuilt && !(await TalentDB.build(TalentTreeDB)))throw new Error('Canonical talent registry unavailable');
      const legal=eligibleOfficerShareTalents(officer,TalentDB,TalentTreeDB).find(x=>x.talentId===talentId);
      if(!legal)throw new Error('The Officer does not own this published eligible talent');
      const selection=persistedOfficerShareTalents(officer).find(x=>x.talentId===talentId);
      if(!selection)throw new Error('The talent was never permanently selected for Share Talent');
      const classes=asItems(officer.items).filter(x=>x.type==='class'&&x.name==='Officer');
      if(classes.length!==1)throw new Error('Unique Officer class level unavailable');
      const level=Number(classes[0].system?.level);
      const combatant=Array.from(combat.combatants||[]).find(c=>c.actor?.id===officer.id);
      if(!combatant||combatant.hasAction?.('standard')!==true) {
        throw new Error('Officer has no available standard action in the encounter');
      }
      const day=dayFromClock(globalThis.game?.time?.worldTime);
      if(day===null)throw new Error('Current campaign day is unavailable');
      const previous=officer.flags?.swse?.classFeatures?.officer?.dailyShares||[];
      if(!Array.isArray(previous))throw new Error('Malformed Officer daily Share Talent usage');
      const recipients=uniqueActors(Array.isArray(recipientActors)?recipientActors:[]);
      if(recipients.length!==(recipientActors?.length||0))throw new Error('Duplicate recipient identities');
      const plan=planOfficerShareTalentAction({
        selections:persistedOfficerShareTalents(officer),
        usesToday:previous.filter(u=>u.day===day),talentId,officerLevel:level,
        encounterId:combat.id,recipients:recipientProofs,
      });
      if(!plan.ok)throw new Error(plan.errors.join('; '));
      if(plan.plan.recipientActorIds.length!==recipients.length ||
        !plan.plan.recipientActorIds.every(id=>recipients.some(r=>r?.id===id))){
        throw new Error('Recipient proof identities do not match chosen actors');
      }
      const owned=ownOfficerTalentItem(officer,talentId);
      const additions=recipients.map(recipient=>({
        actor:recipient,item:buildOfficerShareTalentGrant({
          officer,recipient,talent:owned,selection,encounterId:combat.id,day,
        }),
      }));
      // Capture ALL actor states before any mutation; recover every affected
      // actor if a later leg throws. No direct Item.create() outside ActorEngine.
      const actors=uniqueActors([officer,...recipients]);
      const snapshots=new Map();
      for(const actor of actors)snapshots.set(actor.id,await ActorEngine.captureRecoverySnapshot(actor));
      const changed=[];
      try {
        for(const entry of additions){
          if(!entry.item)continue; // already owns this talent; no duplicate
          await ActorEngine.applyMutationPlan(entry.actor,{
            add:{items:[entry.item]},
          },{source:'OfficerShareTalentService.activate.grant',transactional:true});
          changed.push(entry.actor);
        }
        await ActorEngine.applyMutationPlan(officer,{
          set:{'flags.swse.classFeatures.officer.dailyShares':[
            ...previous.filter(p=>p.day===day),
            {talentId,day,encounterId:combat.id,recipientActorIds:recipients.map(a=>a.id)},
          ]},
        },{source:'OfficerShareTalentService.activate.usage',transactional:true});
        changed.push(officer);
        await combatant.useAction('standard');
      }catch(error){
        const recovery=await Promise.allSettled([...changed].reverse().map(async actor=>{
          const result=await ActorEngine.restoreSnapshotVerified(actor,snapshots.get(actor.id),'OfficerShareTalentService.rollback');
          return {actorId:actor.id,verdict:result.verdict};
        }));
        if(recovery.some(r=>r.status!=='fulfilled'||r.value.verdict!=='EXACT')){
          throw new Error(`Share Talent mutation INDETERMINATE; GM review required: ${error?.message||error}`);
        }
        throw error;
      }
      return {success:true,talentId,recipientActorIds:recipients.map(a=>a.id),
        encounterId:combat.id,day,temporaryUntil:'end-of-encounter'};
    }finally{locks.delete(officer.id);}
  }

  static async expireEncounter(combatId,{actors=null}={}) {
    if(globalThis.game?.user?.isGM!==true)return {skipped:'GM required'};
    const all=actors||Array.from(globalThis.game?.actors||[]);
    const outcome=[];
    for(const actor of all){
      const expired=asItems(actor.items).filter(item=>provenance(item)?.encounterId===combatId);
      if(!expired.length)continue;
      await ActorEngine.applyMutationPlan(actor,{
        delete:{items:expired.map(x=>x.id||x._id)},
      },{source:'OfficerShareTalentService.expireEncounter',transactional:true});
      outcome.push({actorId:actor.id,removed:expired.length});
    }
    return {expired:outcome};
  }
}

export function registerOfficerShareTalentCleanup() {
  if(!globalThis.Hooks?.on)return;
  globalThis.Hooks.on('deleteCombat',async combat=>{
    try{await OfficerShareTalentService.expireEncounter(combat?.id);}
    catch(error){globalThis.ui?.notifications?.error?.(`Share Talent cleanup failed: ${error.message}`);}
  });
  globalThis.Hooks.on('updateCombat',async (combat,changes)=>{
    if(changes?.started!==false)return;
    try{await OfficerShareTalentService.expireEncounter(combat?.id);}
    catch(error){globalThis.ui?.notifications?.error?.(`Share Talent cleanup failed: ${error.message}`);}
  });
}
