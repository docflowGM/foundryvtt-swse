/**
 * Prophet vision — Core Rulebook p.215.
 * Pure GM adjudication ledger: records narrated vision; never invents a
 * Destiny, silently replaces a Destiny, or adjusts already-awarded points.
 */
export const PROPHET_AWARDS_PATH='flags.swse.forceDiscipleProphetAwards';
export function planProphetVisionReview(actor,classLevel,narrative) {
 const no=reason=>({allowed:false,reason});
 if(!Number.isSafeInteger(classLevel)||classLevel<1||classLevel>5)
  return no('invalid-force-disciple-level');
 const awards=actor?.flags?.swse?.forceDiscipleProphetAwards;
 if(!awards||typeof awards!=='object'||Array.isArray(awards))
  return no('no-prophet-award-ledger');
 const current=awards[String(classLevel)];
 if(!current||current.visionRequested!==true)
  return no('no-prophetic-vision-requested');
 if(current.pendingGmVision!==true)
  return no('vision-already-reviewed');
 const text=String(narrative??'').trim();
 if(!text||text.length>4000)return no('gm-vision-narrative-required');
 return {
  allowed:true,classLevel,
  updates:{[PROPHET_AWARDS_PATH]:{
    ...awards,[String(classLevel)]:{
      ...current,pendingGmVision:false,
      visionNarrated:true,gmVisionNarrative:text,
      destinyReview:'GM_ADJUDICATED_SEPARATELY',
    }
  }}
 };
}
