/**
 * Force Disciple Prophet GM vision completion, Core p.215.
 * Usage: game.swse.classFeatures.forceDiscipleProphet.review(actor).
 */
import { planProphetVisionReview } from
  '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-disciple-prophet-gm-review.js';

function escapeHtml(value) {
 return String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 })[c]);
}
export async function openProphetGmVisionReview(actor) {
 if(globalThis.game?.user?.isGM!==true)
  throw new Error('Only the GM can record a Prophet vision');
 if(!actor?.id)throw new Error('Prophet review requires an Actor');
 const awards=actor?.flags?.swse?.forceDiscipleProphetAwards??{};
 const pending=Object.entries(awards).filter(([level,row])=>
  row?.visionRequested===true&&row?.pendingGmVision===true);
 if(!pending.length) {
  globalThis.ui?.notifications?.info?.('No pending Prophet visions for this character.');
  return [];
 }
 const Dialog=(await import(
  '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js'
 )).SWSEDialogV2;
 const {ActorEngine}=await import(
  '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js'
 );
 const completed=[];
 for(const [level,award] of pending) {
  const narrative=await Dialog.wait({
   title:'Prophet — GM Vision, Force Disciple '+level,
   content:`<p>The player exchanged the extra Destiny Point at Force Disciple level
     <strong>${escapeHtml(level)}</strong> for a prophetic vision.</p>
     <p>Describe the vision actually revealed by the GM. The character may then
     pursue a new vision-related Destiny, subject to GM approval. This record
     does <strong>not</strong> change the Destiny or re-award points.</p>
     <form><label>Vision narrative<textarea name="prophetVision" maxlength="4000" rows="5"
       style="width:100%;resize:vertical"></textarea></label></form>`,
   buttons:{
     save:{label:'Record GM Vision',callback:html=>{
       const root=html?.[0]??html;
       return root?.querySelector?.('[name="prophetVision"]')?.value?.trim()??null;
     }},
     defer:{label:'Decide Later',callback:()=>null}
   },default:'defer',
  },{width:540,classes:['swse-prophet-gm-vision-dialog']});
  if(!narrative)continue;
  const plan=planProphetVisionReview(actor,Number(level),narrative);
  if(!plan.allowed)throw new Error('Prophet review refused: '+plan.reason);
  await ActorEngine.applyMutationPlan(actor,{set:plan.updates},{
   source:'ForceDiscipleProphet.GmVision',transactional:true
  });
  completed.push({classLevel:Number(level),visionNarrated:true,
   destinyReview:'GM_ADJUDICATED_SEPARATELY'});
 }
 return completed;
}
