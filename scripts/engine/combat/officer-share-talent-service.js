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
import { resolveOfficerShareTalentScene } from '/systems/foundryvtt-swse/scripts/engine/combat/officer-share-talent-scene.js';

const locks=new Set();
import {
  asItems, ownOfficerTalentItem, buildOfficerShareTalentGrant
} from '/systems/foundryvtt-swse/scripts/engine/combat/officer-share-talent-grant-plan.js';
export {ownOfficerTalentItem, buildOfficerShareTalentGrant};

const provenance=item=>item?.flags?.swse?.officerSharedTalent || null;
const dayFromClock=time=>Number.isFinite(Number(time))?Math.floor(Number(time)/86400):null;
const uniqueActors=(actors)=>Array.from(new Map(actors.map(a=>[a.id,a])).values());

/** Strict GM runtime service. Returns successful delivery only after all legs commit. */
export class OfficerShareTalentService {
  static async activate({officer,talentId,combat,recipientTokenIds,confirmedSenses=false,confirmedAllies=false}={}) {
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
      if(!combatant||combat.combatant?.id!==combatant.id||combatant.canAct!==true
        ||combatant.hasAction?.('standard')!==true) {
        throw new Error('Officer is not able to spend a standard action on the current turn');
      }
      const day=dayFromClock(globalThis.game?.time?.worldTime);
      if(day===null)throw new Error('Current campaign day is unavailable');
      const previous=officer.flags?.swse?.classFeatures?.officer?.dailyShares||[];
      if(!Array.isArray(previous))throw new Error('Malformed Officer daily Share Talent usage');
      const {recipientActors:recipients,recipientProofs}=resolveOfficerShareTalentScene({
        officer,combat,recipientTokenIds,confirmedSenses,confirmedAllies,
      });
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
      // Track a leg BEFORE entering ActorEngine. A failed transactional call
      // can still have made a partial mutation (or had an indeterminate inner
      // rollback); omitting that actor from outer verification is unsafe.
      const touched=[];
      try {
        for(const entry of additions){
          if(!entry.item)continue; // already owns this talent; no duplicate
          touched.push(entry.actor);
          await ActorEngine.applyMutationPlan(entry.actor,{
            add:{items:[entry.item]},
          },{source:'OfficerShareTalentService.activate.grant',transactional:true});
        }
        touched.push(officer);
        await ActorEngine.applyMutationPlan(officer,{
          set:{'flags.swse.classFeatures.officer.dailyShares':[
            ...previous.filter(p=>p.day===day),
            {talentId,day,encounterId:combat.id,recipientActorIds:recipients.map(a=>a.id)},
          ]},
        },{source:'OfficerShareTalentService.activate.usage',transactional:true});
        await combatant.useAction('standard');
      }catch(error){
        const recovery=await Promise.allSettled([...touched].reverse().map(async actor=>{
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
  // A GM can reconnect after a combat ended while offline. Clean up only
  // grants whose encounter no longer exists as an active combat.
  globalThis.Hooks.once?.('ready',async ()=>{
    if(globalThis.game?.user?.isGM!==true)return;
    const current=new Set(Array.from(globalThis.game?.combats||[])
      .filter(combat=>combat?.started===true).map(combat=>combat.id));
    const actors=uniqueActors([
      ...Array.from(globalThis.game?.actors||[]),
      ...Array.from(globalThis.canvas?.tokens?.placeables||[])
        .map(token=>token.actor).filter(Boolean),
      ...Array.from(globalThis.game?.combats||[]).flatMap(combat=>
        Array.from(combat.combatants||[]).map(c=>c.actor).filter(Boolean)),
    ]);
    const stale=new Set(actors.flatMap(actor=>asItems(actor.items)
      .map(item=>provenance(item)?.encounterId).filter(id=>id&&!current.has(id))));
    for(const id of stale){
      try{await OfficerShareTalentService.expireEncounter(id,{actors});}
      catch(error){globalThis.ui?.notifications?.error?.(
        `Stale Officer Share Talent cleanup failed: ${error.message}`);}
    }
  });
  globalThis.Hooks.on('deleteCombat',async combat=>{
    const actors=uniqueActors([...Array.from(globalThis.game?.actors||[]),
      ...Array.from(combat?.combatants||[]).map(c=>c.actor).filter(Boolean)]);
    try{await OfficerShareTalentService.expireEncounter(combat?.id,{actors});}
    catch(error){globalThis.ui?.notifications?.error?.(`Share Talent cleanup failed: ${error.message}`);}
  });
  globalThis.Hooks.on('updateCombat',async (combat,changes)=>{
    if(changes?.started!==false)return;
    const actors=uniqueActors([...Array.from(globalThis.game?.actors||[]),
      ...Array.from(combat?.combatants||[]).map(c=>c.actor).filter(Boolean)]);
    try{await OfficerShareTalentService.expireEncounter(combat?.id,{actors});}
    catch(error){globalThis.ui?.notifications?.error?.(`Share Talent cleanup failed: ${error.message}`);}
  });
}
