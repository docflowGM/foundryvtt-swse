/**
 * Sith Lord Temptation UI. GM confirms enemy and line of sight.
 * Usage: game.swse.classFeatures.sithLordTemptation.open(sithLordActor)
 */
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { SithLordTemptationService } from '/systems/foundryvtt-swse/scripts/engine/combat/sith-lord-temptation-service.js';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
export async function openSithLordTemptation(sith) {
  if(globalThis.game?.user?.isGM!==true)
    throw new Error('GM approval is required for Temptation line of sight and opponent selection');
  const combat=globalThis.game?.combat;
  if(!combat?.started)throw new Error('Temptation requires an active encounter');
  const tokens=Array.from(globalThis.game?.user?.targets??[]);
  const distinct=[...new Map(tokens.filter(t=>t.actor?.id)
    .map(t=>[String(t.actor.uuid||t.actor.id),t.actor])).values()];
  if(distinct.length!==1)throw new Error('Target exactly one opposing Actor');
  const target=distinct[0];
  if(target.id===sith?.id)throw new Error('Temptation cannot target yourself');
  const answer=await SWSEDialogV2.wait({
    title:'Sith Lord — Temptation',
    content:`<p>Make a <strong>standard-action Persuasion check</strong> against the Will Defense of <strong>${escape(target.name)}</strong>.</p>
      <p>The target must be a single opponent in line of sight. If you succeed, a subsequent Force/Destiny Point spend before your next turn triggers a choice made by the target.</p>
      <p>As GM, confirm the target is an opponent and is within line of sight. This interface does not infer GM allegiance or visibility.</p>`,
    buttons:{
      confirm:{label:'Confirm target and line of sight (Standard Action)',callback:()=>true},
      cancel:{label:'Cancel',callback:()=>null}
    },default:'cancel'
  },{width:560,classes:['swse-sith-lord-temptation']});
  if(answer!==true)return null;
  return SithLordTemptationService.activate({sith,target,confirmedLineOfSight:true,combat});
}
export async function reviewSithLordTemptationConsequences(target) {
  return SithLordTemptationService.resolvePending(target);
}
