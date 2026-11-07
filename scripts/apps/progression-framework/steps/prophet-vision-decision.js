/**
 * Core Rulebook p.215 — Prophet's immediate destiny-point exchange.
 *
 * GM owns the content of the vision and suitability of later destiny choices.
 * The player must choose between retaining both awarded points or sacrificing
 * the EXTRA point immediately at this Force Disciple level-up. The dialog is
 * deliberately before ProgressionFinalizer compiles/commits the plan.
 */
// Lazy-load the Foundry V13 application only when the player is prompted.
// Pure eligibility/testing and ProgressionFinalizer module imports must run
// under the headless Node shim without Foundry ApplicationV2 APIs.

const classKey = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g,'');

export function prophetChoiceEligibility({actor,manifest,mode}={}) {
  if(mode!=='levelup' || manifest?.kind!=='swse-level-up-entitlement-manifest'
    || classKey(manifest.className)!=='forcedisciple') {
    return {applicable:false,reason:'not-force-disciple-advancement'};
  }
  const level=Number(manifest.classLevel);
  if(!Number.isSafeInteger(level)||level<1||level>5
    || Number(manifest.context?.selectedClassNextLevel)!==level) {
    return {applicable:false,reason:'manifest-unverified'};
  }
  if(actor?.system?.destiny?.hasDestiny!==true) {
    return {applicable:false,reason:'no-destiny'};
  }
  const pool=actor?.system?.destinyPoints;
  if(!Number.isSafeInteger(pool?.value)||pool.value<0
    || !Number.isSafeInteger(pool?.max)||pool.max<0) {
    return {applicable:true,valid:false,reason:'destiny-pool-unverified'};
  }
  return {applicable:true,valid:true,classLevel:level};
}

/**
 * Returns {visionRequested:boolean} or throws. A cancelled/closed dialog
 * never silently chooses the default two points.
 */
export async function promptProphetVisionDecision({actor,manifest,mode,existing=null,dialog=null}={}) {
  const status=prophetChoiceEligibility({actor,manifest,mode});
  if(!status.applicable)return null;
  if(!status.valid)throw new Error('Prophet choice blocked: '+status.reason);
  if(existing?.visionRequested===true||existing?.visionRequested===false) {
    if(existing.classLevel===status.classLevel) return {visionRequested:existing.visionRequested,classLevel:status.classLevel};
    // Any prior decision for another level must be re-confirmed.
  }
  const Dialog = dialog ?? (await import(
    '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js'
  )).SWSEDialogV2;
  const result=await Dialog.wait({
    title:'Force Disciple — Prophet (Level '+status.classLevel+')',
    content:`<div class="swse-prophet-decision">
      <p>At each Force Disciple level, you receive <strong>two Destiny Points</strong> instead of one.</p>
      <p>You may immediately sacrifice the extra point for a prophetic vision determined by the GM. After the vision, the GM may approve a new vision-related destiny.</p>
      <p><strong>This choice is made now, before level-up finalization.</strong></p>
    </div>`,
    buttons:{
      keep:{icon:'<i class="fas fa-check"></i>',label:'Keep both Destiny Points',callback:()=>({visionRequested:false,classLevel:status.classLevel})},
      vision:{icon:'<i class="fas fa-eye"></i>',label:'Sacrifice extra point for GM vision',callback:()=>({visionRequested:true,classLevel:status.classLevel})},
      cancel:{icon:'<i class="fas fa-times"></i>',label:'Cancel Level-Up',callback:()=>null},
    },default:'cancel',
  },{width:520,classes:['swse-prophet-vision-dialog']});
  if(result?.classLevel!==status.classLevel||typeof result?.visionRequested!=='boolean')
    throw new Error('Prophet level-up choice cancelled; no resources have been changed');
  return {visionRequested:result.visionRequested,classLevel:status.classLevel};
}
