/**
 * Force prestige-class action controls for the v13 ActorSheetV2 header.
 *
 * Serenity and Temptation are not talent Items, so there is no natural
 * talent-card activation affordance. Route visible controls to the existing
 * classFeatures API without cloning any action, roll, or effect logic.
 *
 * This uses the same getHeaderControlsApplicationV2 contract as the
 * existing level-up/mentor/store sheet hooks; no render DOM mutation.
 */
import { HooksRegistry } from '/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js';
import { apexClassFeatureAccess } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/apex-class-feature-access.js';
import { currentTemptationEvents } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/sith-lord-temptation-state.js';
import { forceDiscipleClassLevel } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-disciple-features.js';

const ACTIONS = Object.freeze({
  serenity: 'swse-force-class-serenity',
  temptation: 'swse-force-class-temptation',
  resolve: 'swse-force-class-resolve-temptation',
  prophetVision: 'swse-force-class-review-prophet-vision',
});

function usableActor(app) {
  const actor=app?.actor??app?.document??null;
  if(actor?.documentName!=='Actor')return null;
  if(actor.type!=='character'&&actor.type!=='npc')return null;
  return actor;
}
function isOwner(actor){
  return globalThis.game?.user?.isGM===true ||
    actor?.testUserPermission?.(globalThis.game?.user,'OWNER')===true;
}
function hasActiveFeature(actor,classId) {
  return apexClassFeatureAccess(actor,classId).allowed===true;
}
function pendingChoiceCount(actor) {
  return currentTemptationEvents(actor)
    .filter(entry=>entry.state==='pending-target-choice').length;
}
function hasPendingProphetVision(actor) {
  const awards=actor?.flags?.swse?.forceDiscipleProphetAwards;
  return forceDiscipleClassLevel(actor)>0
    && awards && typeof awards==='object' && !Array.isArray(awards)
    && Object.values(awards).some(row=>row?.visionRequested===true && row?.pendingGmVision===true);
}
function actionControl({action,label,icon,visible,handler}) {
  return {action,label,icon,ownership:CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER??3,visible,handler};
}
async function runAction(actor,feature,method='open'){
  try {
    const fn=globalThis.game?.swse?.classFeatures?.[feature]?.[method];
    if(typeof fn!=='function')throw new Error('Class feature action is not registered');
    return await fn(actor);
  } catch(error) {
    globalThis.ui?.notifications?.error?.(error?.message??String(error));
    return null;
  }
}

let registered=false;
export function registerForceClassFeatureSheetHooks(){
  if(registered)return;
  registered=true;
  HooksRegistry.register('getHeaderControlsApplicationV2',(app,controls)=>{
    const actor=usableActor(app);
    if(!actor||!Array.isArray(controls))return;

    const entries=[
      actionControl({
        action:ACTIONS.serenity,
        label:'Serenity',
        icon:'fa-solid fa-spa',
        visible:()=>isOwner(actor)&&hasActiveFeature(actor,'jedi_master'),
        handler:()=>runAction(actor,'jediMasterSerenity')
      }),
      actionControl({
        action:ACTIONS.temptation,
        label:'Temptation',
        icon:'fa-solid fa-hand-sparkles',
        visible:()=>globalThis.game?.user?.isGM===true
          &&hasActiveFeature(actor,'sith_lord'),
        handler:()=>runAction(actor,'sithLordTemptation')
      }),
      actionControl({
        action:ACTIONS.resolve,
        label:'Temptation — Resolve',
        icon:'fa-solid fa-list-check',
        visible:()=>isOwner(actor)&&pendingChoiceCount(actor)>0,
        handler:()=>runAction(actor,'sithLordTemptation','reviewConsequences')
      }),
      actionControl({
        action:ACTIONS.prophetVision,
        label:'Prophet — Review Vision',
        icon:'fa-solid fa-eye',
        visible:()=>globalThis.game?.user?.isGM===true && hasPendingProphetVision(actor),
        handler:()=>runAction(actor,'forceDiscipleProphet','review')
      }),
    ];

    const existing=new Set(controls.map(control=>control?.action));
    for(const entry of entries){
      if(!existing.has(entry.action)){
        controls.push(entry);
        existing.add(entry.action);
      }
    }
  },{
    id:'swse-force-class-feature-actions',
    priority:5,
    category:'ui',
    description:'Expose Serenity, Temptation and pending GM Prophet vision review',
  });
}

export const FORCE_CLASS_SHEET_ACTIONS=ACTIONS;
