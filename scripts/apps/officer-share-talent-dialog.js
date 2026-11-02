/**
 * GM-reviewed Officer Share Talent combat action.
 * game.swse.classFeatures.officerShareTalent.open(officerActor)
 */
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { OfficerShareTalentService } from '/systems/foundryvtt-swse/scripts/engine/combat/officer-share-talent-service.js';
import { persistedOfficerShareTalents } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/officer-share-talent-authority.js';

const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
})[c]);
const tokenId=t=>String(t?.id||t?.document?.id||'');
const faction=t=>Number(t?.document?.disposition??t?.disposition);
const formOf=root=>(root?.[0]??root)?.querySelector?.('form');
function distanceSquares(scene,grid,officer,other) {
  if(!grid?.measurePath||!officer?.center||!other?.center)return null;
  const m=grid.measurePath([officer.center,other.center]);
  const units=Number(scene?.grid?.distance),distance=Number(m?.distance);
  if(!Number.isFinite(units)||units<=0||!Number.isFinite(distance))return null;
  return distance/units;
}

export async function openOfficerShareTalentAction(officer) {
  const game=globalThis.game;
  if(game?.user?.isGM!==true)throw new Error('GM authorization required for Share Talent');
  const combat=game.combat;
  if(!officer?.id||!combat?.started||!combat.id)throw new Error('Share Talent requires an active encounter');
  const canvas=globalThis.canvas,scene=canvas?.scene;
  if(!scene||!canvas?.grid)throw new Error('Scene distance authority unavailable');
  const tokens=Array.from(canvas.tokens?.placeables||[]);
  const owners=tokens.filter(t=>t?.actor?.id===officer.id);
  if(owners.length!==1)throw new Error('Officer must have exactly one unambiguous token in the current scene');
  const source=owners[0],sourceFaction=faction(source);
  const combatTokenIds=new Set(Array.from(combat.combatants||[]).map(c=>c.tokenId));
  const candidates=tokens
    .filter(t=>t!==source && t.actor?.id && t.actor.id!==officer.id
      && faction(t)===sourceFaction && sourceFaction!==0 && combatTokenIds.has(tokenId(t)))
    .map(t=>({...{
      token:t,tokenId:tokenId(t),actorId:t.actor.id,
      name:t.actor.name||t.name, distanceSquares:distanceSquares(scene,canvas.grid,source,t),
    }}))
    .filter(x=>x.distanceSquares!==null && x.distanceSquares>=0 && x.distanceSquares<=10);
  if(!candidates.length)throw new Error('No measured allied encounter tokens within 10 squares');
  const selections=persistedOfficerShareTalents(officer);
  if(!selections.length)throw new Error('Officer has no permanent Share Talent selection');
  const day=Math.floor(Number(game.time?.worldTime)/86400);
  if(!Number.isInteger(day))throw new Error('Campaign day unavailable');
  const spent=new Set((officer.flags?.swse?.classFeatures?.officer?.dailyShares||[])
    .filter(x=>x.day===day).map(x=>x.talentId));
  const choices=selections.filter(x=>!spent.has(x.talentId));
  if(!choices.length)throw new Error('All selected Officer talents have already been shared today');
  const officerOptions=choices.map(x=>`<option value="${esc(x.talentId)}">${esc(x.talentName)}</option>`).join('');
  const people=candidates.map(x=>`<label style="display:flex;gap:8px;align-items:center;margin:5px 0">
    <input type="checkbox" name="recipient" value="${esc(x.tokenId)}" />
    ${esc(x.name)} — ${esc(x.distanceSquares.toFixed(1))} squares
    </label>`).join('');
  const content=`<form class="swse-officer-share-talent">
    <p>Once per day, use a <strong>standard action</strong> to share one permanently selected talent with up to half your Officer class level allies. The talent lasts until the encounter ends.</p>
    <label>Owned selected talent <select name="talentId">${officerOptions}</select></label>
    <div style="max-height:280px;overflow:auto"><h4>Allies in range</h4>${people}</div>
    <label style="display:flex;gap:6px"><input type="checkbox" name="confirmedSenses" value="yes" required />
       As GM, I confirm that each selected ally can see and hear the Officer.</label>
  </form>`;
  const chosen=await SWSEDialogV2.wait({
    title:`Share Talent — ${officer.name}`,content,
    buttons:{
      activate:{icon:'<i class="fas fa-users"></i>',label:'Share Talent (Standard Action)',callback:root=>{
        const form=formOf(root);if(!form)throw new Error('Share Talent form unavailable');
        const data=new FormData(form);
        if(data.get('confirmedSenses')!=='yes')throw new Error('GM must explicitly verify sight and hearing');
        return {talentId:String(data.get('talentId')||''),tokenIds:data.getAll('recipient').map(String)};
      }},
      cancel:{icon:'<i class="fas fa-times"></i>',label:'Cancel',callback:()=>null},
    },default:'cancel',
  },{width:620,classes:['swse-officer-share-talent-dialog']});
  if(!chosen)return null;
  const tokenSelections=chosen.tokenIds.map(id=>candidates.find(c=>c.tokenId===id));
  if(tokenSelections.some(t=>!t)||new Set(chosen.tokenIds).size!==chosen.tokenIds.length){
    throw new Error('Share Talent target selection contains invalid or duplicate token IDs');
  }
  const result=await OfficerShareTalentService.activate({
    officer,combat,talentId:chosen.talentId,
    recipientActors:tokenSelections.map(x=>x.token.actor),
    recipientProofs:tokenSelections.map(x=>({
      actorId:x.actorId,isAlly:true,distanceSquares:x.distanceSquares,
      canSeeOfficer:true,canHearOfficer:true,
    })),
  });
  globalThis.ui?.notifications?.info?.(`Shared talent with ${result.recipientActorIds.length} allies until encounter end.`);
  return result;
}
