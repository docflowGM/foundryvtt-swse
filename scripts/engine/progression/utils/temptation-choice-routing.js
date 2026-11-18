/**
 * Sith Lord Temptation's consequence belongs to the affected actor.
 *
 * A Force/Destiny spend may be executed by a GM on a player's behalf.
 * The committed local receipt is still recorded on the affected Actor, but
 * its dialog must not automatically open on the GM's client while an
 * eligible player-owner is connected. Such cases remain pending on the
 * owned Actor's sheet for the player (or manual GM adjudication).
 *
 * This is local UI routing, not cross-client event transport or a
 * new gameplay authority. It does not fabricate spend receipts.
 */
export function shouldAutoPromptTemptationChoice(target,{user,users}={}){
  if(!target||!user)return false;
  const owner=who=>{
    if(!who||typeof target.testUserPermission!=='function')return false;
    return target.testUserPermission(who,'OWNER')===true;
  };
  if(user.isGM!==true){
    try{return owner(user);}catch{return false;}
  }
  // For a connected owner, avoid having the GM choose for the player
  // merely because the GM happened to perform the resource deduction.
  const roster=Array.isArray(users?.contents)?users.contents:
    Array.isArray(users)?users:
    users&&typeof users[Symbol.iterator]==='function'?Array.from(users):[];
  for(const candidate of roster){
    if(!candidate||candidate.isGM===true||candidate.active!==true)continue;
    try{
      if(owner(candidate))return false;
    }catch{
      // Unverified owner permissions are not authority for an automatic GM
      // choice; the persistent event remains available for manual review.
      return false;
    }
  }
  return true;
}
