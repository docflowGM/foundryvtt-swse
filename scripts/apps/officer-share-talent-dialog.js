/**
 * GM-reviewed Officer Share Talent combat action.
 * game.swse.classFeatures.officerShareTalent.open(officerActor)
 */
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { OfficerShareTalentService } from '/systems/foundryvtt-swse/scripts/engine/combat/officer-share-talent-service.js';
import { persistedOfficerShareTalents } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/officer-share-talent-authority.js';
import { officerShareTalentDistanceSquares } from '/systems/foundryvtt-swse/scripts/engine/combat/officer-share-talent-scene.js';

const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
})[c]);
const tokenId=t=>String(t?.id||t?.document?.id||'');
const formOf=root=>(root?.[0]??root)?.querySelector?.('form');
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
  const source=owners[0];
  const candidates=tokens
    // Disposition is not proof of alliance. The GM explicitly confirms
    // which selected tokens are allies before activation.
    .filter(t=>t!==source && t.actor?.id && t.actor.id!==officer.id)
    .map(t=>({...{
      token:t,tokenId:tokenId(t),actorId:t.actor.id,
      name:t.actor.name||t.name, distanceSquares:officerShareTalentDistanceSquares(scene,canvas.grid,source,t),
    }}))
    .filter(x=>x.distanceSquares!==null && x.distanceSquares>=0 && x.distanceSquares<=10);
  if(!candidates.length)throw new Error('No scene targets within 10 squares; verify placement');
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
    <div style="max-height:280px;overflow:auto"><h4>Select allies in range (GM verified)</h4>${people}</div>
    <label style="display:flex;gap:6px"><input type="checkbox" name="confirmedSenses" value="yes" required />
       As GM, I confirm each selected recipient can see and hear the Officer.</label>
    <label style="display:flex;gap:6px"><input type="checkbox" name="confirmedAllies" value="yes" required />
       As GM, I confirm each selected recipient is an ally.</label>
  </form>`;
  const chosen=await SWSEDialogV2.wait({
    title:`Share Talent — ${officer.name}`,content,
    buttons:{
      activate:{icon:'<i class="fas fa-users"></i>',label:'Share Talent (Standard Action)',callback:root=>{
        const form=formOf(root);if(!form)throw new Error('Share Talent form unavailable');
        const data=new FormData(form);
        if(data.get('confirmedSenses')!=='yes'||data.get('confirmedAllies')!=='yes')
          throw new Error('GM must explicitly verify sight, hearing and allied status');
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
    recipientTokenIds:chosen.tokenIds,confirmedSenses:true,confirmedAllies:true,
  });
  globalThis.ui?.notifications?.info?.(`Shared talent with ${result.recipientActorIds.length} allies until encounter end.`);
  return result;
}
