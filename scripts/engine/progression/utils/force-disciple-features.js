/**
 * Force Disciple class features (Core Rulebook, printed pp. 214-215).
 *
 * Pure, read-only feature eligibility and level-up planning. The progression
 * finalizer owns application through ActorEngine. No direct actor mutations,
 * no text-derived class ownership, no inferred mind-affecting descriptors.
 */

const normalize = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g,'');
const DISCIPLE_ID = 'forcedisciple';

function ownedClassItems(actor) {
  const items = actor?.items?.contents ?? actor?.items ?? [];
  try { return Array.from(items).filter(i => i?.type === 'class' && i?.system?.disabled !== true); }
  catch { return []; }
}

/** Explicit stable class IDs are authoritative over conflicting display names. */
function isDisciple(item) {
  const key = item?.system?.classId ?? item?.system?.class_id
    ?? item?.system?.class_name ?? item?.system?.className ?? item?.name;
  return normalize(key) === DISCIPLE_ID;
}

export function forceDiscipleClassLevel(actor) {
  return ownedClassItems(actor).filter(isDisciple).reduce((level,item)=>{
    const value=Number(item?.system?.level ?? item?.system?.levels);
    return Number.isSafeInteger(value) && value > 0 ? Math.max(level,value) : level;
  },0);
}

/** A descriptor must explicitly be Mind-Affecting, not generic 'mind'. */
export function isExplicitMindAffecting(context = {}) {
  if (context?.mindAffecting === true) return true;
  const source = context?.sourceItem ?? context?.powerItem ?? context?.item ?? null;
  const fields = [
    context?.descriptor, context?.descriptors, context?.tags,
    context?.effectTags, context?.traits, context?.effectType,
    source?.system?.descriptor, source?.system?.descriptors,
    source?.system?.tags,
  ];
  for (const raw of fields.flatMap(v=>Array.isArray(v)?v:[v])) {
    if (normalize(raw) === 'mindaffecting') return true;
  }
  return false;
}

export function resolveForceDiscipleIndomitable(actor, context = {}) {
  if (!isExplicitMindAffecting(context)) return { immune:false, reason:'not-explicit-mind-affecting' };
  if (forceDiscipleClassLevel(actor) < 1) return { immune:false, reason:'force-disciple-not-owned' };
  return { immune:true, reason:'force-disciple-indomitable', classFeature:'Indomitable' };
}

function strictPoolValue(raw) {
  return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
}

function readPool(actor) {
  const rawValue = actor?.system?.destinyPoints?.value;
  const rawMax = actor?.system?.destinyPoints?.max;
  const value = strictPoolValue(rawValue);
  const max = strictPoolValue(rawMax);
  if (value === null || max === null) return null;
  return { value, max };
}

function recordedAward(actor, nextLevel) {
  return !!actor?.flags?.swse?.forceDiscipleProphetAwards?.[String(nextLevel)];
}

/**
 * Grants the TWO Destiny Points owed for a Force Disciple advancement, not
 * two on top of the normal one. Existing level-up economy currently has no
 * generic Destiny grant, so the Force Disciple total is self-contained here.
 *
 * The optional immediate vision exchanges ONLY the extra Destiny Point:
 * 2 awarded normally; 1 awarded when explicitly chosen, with GM vision
 * adjudication recorded as pending. The caller must expose that choice
 * before finalization; an omitted choice defaults to keeping both points.
 *
 * Requires the canonical level-up manifest. Duplicate/post-advancement
 * attempts fail closed. Ledger and resources are applied atomically by the
 * finalizer, not by this pure function.
 */
export function planForceDiscipleProphetAward({ actor, manifest, visionRequested = false } = {}) {
  const no = reason => ({ allowed:false, reason, updates:{} });
  if (manifest?.kind !== 'swse-level-up-entitlement-manifest'
    || normalize(manifest?.className) !== DISCIPLE_ID) return no('not-force-disciple-level-up');
  const classLevel = Number(manifest?.classLevel);
  const characterLevel = Number(manifest?.characterLevel);
  if (!Number.isSafeInteger(classLevel) || classLevel < 1 || classLevel > 5
    || !Number.isSafeInteger(characterLevel) || characterLevel < 1
    || Number(manifest?.context?.selectedClassNextLevel) !== classLevel
    || Number(manifest?.context?.enteringLevel) !== characterLevel)
    return no('manifest-unverified');
  if (manifest?.context?.mode !== 'levelup' || manifest?.context?.eventType !== 'advanceOneLevel')
    return no('not-levelup-event');
  if (forceDiscipleClassLevel(actor) !== classLevel - 1) return no('class-level-not-pending');
  if (recordedAward(actor,classLevel)) return no('already-awarded');
  if (actor?.system?.destiny?.hasDestiny !== true) return no('actor-has-no-destiny');
  const pool=readPool(actor);
  if (!pool) return no('destiny-pool-unverified');

  const grant=visionRequested===true?1:2;
  const awards={...(actor?.flags?.swse?.forceDiscipleProphetAwards??{})};
  awards[String(classLevel)]={
    classLevel, characterLevel, granted:grant,
    visionRequested:visionRequested===true, pendingGmVision:visionRequested===true,
    source:'Force Disciple — Prophet', sourcePage:'Core 215',
  };
  return {
    allowed:true, reason:'prophet-level-up-grant', grant,
    visionPendingGm:visionRequested===true,
    updates:{
      'system.destinyPoints.value':pool.value+grant,
      'system.destinyPoints.max':Math.max(pool.max,pool.value)+grant,
      'flags.swse.forceDiscipleProphetAwards':awards,
    },
  };
}
