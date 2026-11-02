/**
 * GM-facing Enforcer Resources equipment delivery / deferral.
 * Open from the SWSE class feature API:
 *    game.swse.classFeatures.enforcerResources.open(actor)
 * Only the GM may approve and finalize equipment deliveries.
 */
import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { EnforcerEquipmentDelivery, enforcerEligibleInventory } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/enforcer-equipment-delivery.js';
import { pendingEnforcerResources } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/enforcer-resources-entitlement.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
})[c]);
const formOf = root => (root?.[0] ?? root)?.querySelector?.('form') || null;

export async function openEnforcerResourceDelivery(actor) {
  if(globalThis.game?.user?.isGM!==true)throw new Error('A GM must approve Enforcer Resources deliveries');
  if(!actor?.id)throw new Error('Choose the actor receiving Enforcer Resources');
  const entries=pendingEnforcerResources(actor).filter(x=>x.status==='awaiting-equipment-selection');
  if(!entries.length)throw new Error('No unspent Enforcer Resources entitlements are available');
  const index=await EnforcerEquipmentDelivery.getEligibleInventory();
  const eligible=enforcerEligibleInventory(index).sort((a,b)=>a.name.localeCompare(b.name));
  if(!eligible.length)throw new Error('No canonical restricted/military equipment listings are available');

  const classOptions=entries.map(entry=>
    `<option value="${escape(entry.enforcerClassLevel)}">Enforcer ${escape(entry.enforcerClassLevel)} — ${escape(entry.amountCredits)} credits equipment value</option>`).join('');
  const options=['<option value="">Choose equipment…</option>',...eligible.map(item=>
    `<option value="${escape(item.id)}">${escape(item.name)} — ${escape(item.cost)} cr (${escape(item.availability)})</option>`)].join('');
  const rows=Array.from({length:8},(_,i)=>
    `<tr><td><label for="enforcer-item-${i}">Equipment ${i+1}</label></td>
       <td><select id="enforcer-item-${i}" name="id-${i}">${options}</select></td>
       <td><input type="number" min="1" max="100" step="1" name="quantity-${i}" value="1" /></td></tr>`).join('');
  const html=`<form class="swse-enforcer-resources">
    <p>Restricted or military equipment (including vehicles), provided by the Enforcer's organization. This is NOT character currency. A GM confirms the accessible civilized delivery location and canonical item selection. Unused balance is forfeited on delivery; choosing Defer carries the FULL allowance into the next Enforcer level.</p>
    <label>Unspent Enforcer level <select name="classLevel">${classOptions}</select></label>
    <label>Accessible civilized delivery location <input type="text" name="deliveryLocation" required maxlength="180" placeholder="e.g. Coruscant Security Office" /></label>
    <div style="max-height:340px;overflow:auto"><table><thead><tr><th>Slot</th><th>Canonical compendium item</th><th>Qty</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p>Deliver commits the equipment and permanently closes this level's allowance. Defer saves it for the next Enforcer class level. Cancel makes no changes.</p>
  </form>`;
  const decision=await SWSEDialogV2.wait({
    title:`Enforcer Resources — ${actor.name}`,content:html,
    buttons:{
      deliver:{icon:'<i class="fas fa-check"></i>',label:'Deliver Equipment',callback:root=>{
        const form=formOf(root);if(!form)throw new Error('Equipment delivery form missing');
        const d=new FormData(form),selected=[];
        for(let i=0;i<8;i++){
          const id=String(d.get(`id-${i}`)||'');
          if(id)selected.push({id,quantity:Number(d.get(`quantity-${i}`))});
        }
        return {action:'deliver',selected,classLevel:Number(d.get('classLevel')),
          location:String(d.get('deliveryLocation')||'').trim()};
      }},
      defer:{icon:'<i class="fas fa-forward"></i>',label:'Defer to Next Enforcer Level',callback:root=>{
        const form=formOf(root);if(!form)throw new Error('Equipment deferral form missing');
        return {action:'defer',classLevel:Number(new FormData(form).get('classLevel'))};
      }},
      cancel:{icon:'<i class="fas fa-times"></i>',label:'Cancel',callback:()=>null},
    },default:'cancel',
  },{width:850,classes:['swse-enforcer-resources-dialog']});
  if(!decision)return null;
  const result=decision.action==='defer'
    ? await EnforcerEquipmentDelivery.defer({actor,classLevel:decision.classLevel})
    : await EnforcerEquipmentDelivery.deliver({
      actor,classLevel:decision.classLevel,selected:decision.selected,location:decision.location,
    });
  globalThis.ui?.notifications?.info?.('Enforcer Resources decision saved.');
  return result;
}
