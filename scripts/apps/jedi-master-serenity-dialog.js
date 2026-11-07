/**
 * Player-facing Serenity control (Core p.220).
 * Usage: game.swse.classFeatures.jediMasterSerenity.open(jediMasterActor).
 * No new scene/map automation is necessary.
 */
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { JediMasterSerenityService } from '/systems/foundryvtt-swse/scripts/engine/combat/jedi-master-serenity-service.js';
import { readSerenityState,serenityTranceActive } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/serenity-state.js';

export async function openJediMasterSerenity(actor){
  const combat=globalThis.game?.combat;
  if(!combat?.started||!actor?.id)throw new Error('Serenity requires a Jedi Master in an active encounter');
  const previous=readSerenityState(actor);
  const trance=serenityTranceActive(actor,combat);
  const prepared=previous?.encounterId===combat.id&&previous.phase==='prepared'
    &&Number(combat.round)<=Number(previous.eligibleRound);
  if(prepared){
    globalThis.ui?.notifications?.info?.('Serenity prepared: the first attack or Use the Force check in round '+previous.eligibleRound+' is treated as a natural 20.');
    return {success:true,phase:'prepared',eligibleRound:previous.eligibleRound};
  }
  const action=trance?'exit':'enter';
  const content=trance
    ? '<p>Leave your Serenity trance as a <strong>swift action</strong>. Your first attack roll or Use the Force check in the <strong>following round</strong> is treated as a natural 20.</p>'
    : '<p>Enter Serenity as a <strong>full-round action</strong>. You remain aware, but lose your positive Dexterity bonus to Reflex Defense until you emerge.</p>';
  const selection=await SWSEDialogV2.wait({
    title:'Jedi Master — Serenity',
    content,
    buttons:{
      use:{label:trance?'Emerge (Swift Action)':'Enter Trance (Full-Round Action)',
        callback:()=>action},
      cancel:{label:'Cancel',callback:()=>null},
    },default:'cancel',
  },{width:500,classes:['swse-serenity-dialog']});
  if(selection!==action)return null;
  const result=await JediMasterSerenityService.act(actor,action,{combat});
  globalThis.ui?.notifications?.info?.(
    result.phase==='prepared'
      ? 'Serenity: the first qualifying roll next round ('+result.eligibleRound+') will be a natural 20.'
      : 'Serenity trance active: Dexterity bonus to Reflex Defense is suspended.'
  );
  return result;
}
