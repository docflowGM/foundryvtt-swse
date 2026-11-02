/**
 * SWSE Core: Crime Lord / Officer Command Cover.
 *
 * A +1 COVER bonus to Reflex per adjacent ally, capped by half the relevant
 * prestige class level (maximum +5). Cover bonuses do not stack.
 *
 * Scene geometry is read on demand. Never persist a dynamic adjacency-based
 * bonus to derived defenses; fail closed if the token context is ambiguous.
 */
const arrayOf = collection => {
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection?.contents)) return collection.contents;
  return collection && typeof collection[Symbol.iterator] === 'function'
    ? Array.from(collection) : [];
};
const isClass = (item, name) => item?.type === 'class'
  && (String(item?.name || '').toLowerCase() === name
    || String(item?.system?.classId || '').toLowerCase() === name.replace(/ /g,'-'));
function classLevel(actor, name) {
  const candidates = arrayOf(actor?.items).filter(item => isClass(item,name.toLowerCase()));
  if (candidates.length !== 1) return 0;
  const n = Number(candidates[0].system?.level);
  return Number.isInteger(n) && n > 0 ? n : 0;
}
function ownsFeature(actor, featureKey) {
  return arrayOf(actor?.items).some(item => item?.type === 'feat'
    && item?.system?.sourceType === 'class-feature'
    && item?.system?.featureKey === featureKey);
}
export function commandCoverLimit(actor) {
  const candidates = [
    ['Officer','officer.commandCover'],
    ['Crime Lord','crimeLord.commandCover'],
  ];
  return candidates.reduce((best,[name,key]) => {
    if (!ownsFeature(actor,key)) return best;
    const level = classLevel(actor,name);
    return Math.max(best,Math.min(5,Math.floor(level/2)));
  },0);
}
function footprint(token, size) {
  const d=token?.document || token;
  const x=Number(d?.x),y=Number(d?.y),w=Number(d?.width),h=Number(d?.height);
  if (![x,y,w,h].every(Number.isFinite) || w<=0 || h<=0) return null;
  return {left:x,right:x+w*size,top:y,bottom:y+h*size};
}
function adjacent(a,b,size) {
  const A=footprint(a,size),B=footprint(b,size);
  if (!A||!B) return false;
  const dx=Math.max(A.left-B.right,B.left-A.right,0);
  const dy=Math.max(A.top-B.bottom,B.top-A.bottom,0);
  // Touching edges/corners counts; overlapping token footprints do not.
  const overlapX=A.left < B.right && B.left < A.right;
  const overlapY=A.top < B.bottom && B.top < A.bottom;
  return dx===0 && dy===0 && !(overlapX&&overlapY);
}
function tokenActorId(token) {return String(token?.actor?.id || token?.document?.actorId || '');}
function tokenElevation(token) {return Number(token?.document?.elevation ?? token?.elevation ?? 0);}
function disposition(token) {return Number(token?.document?.disposition ?? token?.disposition);}
export function evaluateCommandCover({defender,defenderToken,tokens,gridSize,gridType=1}={}) {
  const cap=commandCoverLimit(defender);
  if (!cap) return {bonus:0,adjacentAllies:0,cap};
  if (gridType!==1 || !Number.isFinite(gridSize) || gridSize<=0
    || !defenderToken || !defender || tokenActorId(defenderToken)!==String(defender.id))
    return {bonus:0,adjacentAllies:0,cap,unresolved:true};
  const allegiance=disposition(defenderToken);
  if (![1,-1].includes(allegiance))return {bonus:0,adjacentAllies:0,cap,unresolved:true};
  const neighbors=arrayOf(tokens).filter(t=>t
    && t!==defenderToken
    && String(t.id || t.document?.id)!==String(defenderToken.id || defenderToken.document?.id)
    && t.actor && tokenActorId(t)!==String(defender.id)
    && disposition(t)===allegiance
    && tokenElevation(t)===tokenElevation(defenderToken)
    && adjacent(defenderToken,t,gridSize));
  return {bonus:Math.min(cap,neighbors.length),adjacentAllies:neighbors.length,cap};
}
/** Return 0 on no scene, ambiguous duplicate tokens, or missing published feature. */
export function sceneCommandCoverBonus(defender,{tokenId=null,canvasRef=globalThis.canvas}={}) {
  const placeables=arrayOf(canvasRef?.tokens?.placeables);
  const scene=canvasRef?.scene;
  if (!scene || !defender || !placeables.length) return 0;
  const tokenCandidates=placeables.filter(t=>tokenActorId(t)===String(defender.id));
  const selected=tokenId
    ? tokenCandidates.filter(t=>String(t.id||t.document?.id)===String(tokenId))
    : tokenCandidates;
  if (selected.length!==1)return 0;
  const result=evaluateCommandCover({
    defender,defenderToken:selected[0],tokens:placeables,
    gridSize:Number(scene?.grid?.size),
    gridType:Number(scene?.grid?.type),
  });
  return result.bonus;
}
