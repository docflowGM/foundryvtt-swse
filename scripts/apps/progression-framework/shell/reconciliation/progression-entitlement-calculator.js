/**
 * Progression Entitlement Calculator
 *
 * Determines the progression choices an actor should have and projects the
 * derived-stat audit from the same canonical class-level authority.
 */

function normalizeKey(value) {
  return String(value?.classId || value?.system?.classId || value?.system?.sourceId || value?.id || value?.name || value?.className || value || '')
    .trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '');
}

function normalizeLevel(value) {
  const n = Number(value?.system?.level ?? value?.system?.levels ?? value?.system?.rank ?? value?.level ?? value?.levels ?? value?.rank ?? value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function toEntries(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'object') return [];
  return Object.entries(value).map(([key, entry]) => ({
    classId: key,
    className: key,
    ...(entry && typeof entry === 'object' ? entry : { level: entry }),
  }));
}

function readActorItems(actor) {
  try { return Array.from(actor?.items || []); } catch (_err) { return []; }
}

function canonicalClassSummaries(actor, raw = []) {
  const progression = toEntries(actor?.system?.progression?.classLevels);
  const items = readActorItems(actor).filter(item => item?.type === 'class');
  const legacy = toEntries(actor?.system?.classes);
  const entries = progression.length ? progression : items.length ? items : legacy.length ? legacy : raw;
  const source = progression.length ? 'system.progression.classLevels' : items.length ? 'owned class item' : legacy.length ? 'system.classes' : 'reconciler fallback';
  const byClass = new Map();

  for (const entry of entries) {
    const key = normalizeKey(entry);
    const level = normalizeLevel(entry);
    if (!key || !level) continue;
    const matched = raw.find(row => normalizeKey(row) === key) || {};
    const summary = {
      ...matched,
      classId: matched.classId || entry.classId || entry.system?.classId || key,
      className: matched.className || entry.className || entry.name || entry.system?.className || key,
      level,
      model: matched.model || entry,
      item: matched.item || (entry.type === 'class' ? entry : null),
      itemId: matched.itemId || entry.id || entry._id || null,
      sources: Array.from(new Set([...(matched.sources || []), source])),
    };
    const prior = byClass.get(key);
    if (!prior || level > prior.level) byClass.set(key, summary);
  }
  return Array.from(byClass.values());
}

function finite(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isNonheroic(summary = {}) {
  return normalizeKey(summary.className || summary.classId) === 'nonheroic'
    || summary.isNonheroic === true
    || summary.model?.isNonheroic === true
    || summary.model?.system?.isNonheroic === true
    || summary.item?.system?.isNonheroic === true;
}

function conModifier(actor) {
  if (actor?.type === 'droid' || actor?.system?.isDroid) return 0;
  for (const ability of [actor?.system?.derived?.attributes?.con, actor?.system?.attributes?.con, actor?.system?.abilities?.con]) {
    const mod = Number(ability?.mod);
    if (Number.isFinite(mod)) return mod;
    const score = Number(ability?.total ?? ability?.value ?? ability?.score ?? ability?.base);
    if (Number.isFinite(score)) return Math.floor((score - 10) / 2);
  }
  return 0;
}

function classBaseHp(summary = {}) {
  const model = summary.model || {};
  const item = summary.item || {};
  return finite(model.system?.base_hp, model.system?.baseHp, model.base_hp, model.baseHp, item.system?.base_hp, item.system?.baseHp, item.system?.baseHP);
}

function classHitDie(summary = {}) {
  const model = summary.model || {};
  const item = summary.item || {};
  const direct = finite(model.system?.hitDie, model.system?.hit_die, model.hitDie, model.hit_die, item.system?.hitDie, item.system?.hit_die);
  if ([4, 6, 8, 10, 12].includes(direct)) return direct;
  const key = normalizeKey(summary);
  if (['elitetrooper', 'independentdroid'].includes(key)) return 12;
  if (['noble', 'scoundrel', 'slicer'].includes(key)) return 6;
  if (['acepilot', 'beastrider', 'charlatan', 'corporateagent', 'crimelord', 'enforcer', 'forceadept', 'forcedisciple', 'gunslinger', 'improviser', 'infiltrator', 'medic', 'meleeduelist', 'militaryengineer', 'officer', 'outlaw', 'saboteur', 'scout', 'shaper'].includes(key)) return 8;
  return 10;
}

function hpRecords(actor) {
  const records = [];
  const append = value => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(append);
    const amount = Math.max(0, Number(value.amount ?? value.hpGain ?? value.gain ?? 0) || 0);
    if (!amount) return;
    const level = normalizeLevel(value.characterLevel ?? value.level ?? value.newLevel ?? value.targetLevel);
    records.push({ ...value, amount, level });
  };
  append(actor?.system?.progression?.hpGainHistory);
  append(actor?.system?.progression?.lastHpGain);
  const unique = new Map();
  records.forEach((record, index) => unique.set(record.level ? `level:${record.level}` : record.timestamp ? `time:${record.timestamp}` : `legacy:${record.amount}:${index}`, record));
  return Array.from(unique.values());
}

function buildHpAudit(actor, summaries, heroicLevel) {
  const heroic = summaries.filter(summary => !isNonheroic(summary));
  const firstIdentity = normalizeKey(actor?.system?.class);
  const first = heroic.find(summary => normalizeKey(summary) === firstIdentity) || heroic[0] || null;
  const base = first ? classBaseHp(first) : null;
  const con = conModifier(actor);
  const starting = Number.isFinite(base) ? Math.max(1, base + con) : null;
  const expectedRecords = Math.max(0, heroicLevel - 1);
  const records = hpRecords(actor).slice(0, expectedRecords);
  const missing = Math.max(0, expectedRecords - records.length);
  const recorded = records.reduce((sum, record) => sum + record.amount, 0);
  const current = finite(actor?.system?.hp?.max, actor?.system?.derived?.hp?.max, actor?.system?.hitPoints?.max);

  if (starting === null) {
    return { status: 'unavailable', current, lower: null, upper: null, exact: null, label: 'Unavailable', issue: 'No heroic starting-class HP value could be resolved.', detail: 'HP reconciliation requires a heroic starting class with base HP data.' };
  }

  const maximumGain = heroic.reduce((max, summary) => Math.max(max, Math.max(1, classHitDie(summary) + con)), Math.max(1, 6 + con));
  const lower = starting + recorded + missing;
  const upper = starting + recorded + (missing * maximumGain);
  const exact = missing === 0 ? starting + recorded : null;
  let status = missing ? 'warning' : 'ok';
  let issue = missing ? `${missing} of ${expectedRecords} post-1st-level HP gain records are missing.` : '';
  if (Number.isFinite(current) && current < lower) { status = 'issue'; issue = `Current HP ${current} is below the supported minimum ${lower}.`; }
  else if (Number.isFinite(current) && current > upper) { status = 'issue'; issue = `Current HP ${current} exceeds the supported maximum ${upper}.`; }

  return {
    status, current, lower, upper, exact, expectedRecords, recordCount: records.length, missing,
    label: exact !== null ? String(exact) : `${lower}-${upper} plausible; ${missing} record${missing === 1 ? '' : 's'} missing`,
    issue,
    detail: exact !== null
      ? 'Exact total reconstructed from starting HP and durable level-up records.'
      : 'This legacy actor lacks complete HP history. The audit shows a safe range and does not rewrite HP; future level-ups now append durable records.',
  };
}

function applyHpAudit(derivedStats, hp) {
  const rows = Array.isArray(derivedStats?.rows) ? [...derivedStats.rows] : [];
  const index = rows.findIndex(row => row?.id === 'hp-max' || row?.type === 'hp');
  const row = {
    ...(index >= 0 ? rows[index] : {}),
    id: 'hp-max', label: 'Hit Points', type: 'hp',
    expected: hp.exact ?? hp.lower,
    expectedValue: hp.exact ?? hp.lower,
    expectedLabel: hp.label,
    current: hp.current,
    currentValue: hp.current,
    currentLabel: Number.isFinite(hp.current) ? String(hp.current) : 'Unknown',
    status: hp.status,
    issue: hp.issue,
    detail: hp.detail,
    needsAttention: ['issue', 'warning', 'unavailable'].includes(hp.status),
    targetTab: 'abilities',
    sheetAnchor: 'derived-class-stats',
  };
  if (index >= 0) rows[index] = row; else rows.unshift(row);
  const issueCount = rows.filter(item => item?.needsAttention || ['issue', 'warning', 'unavailable'].includes(item?.status)).length;
  return {
    ...derivedStats,
    rows,
    hpAudit: hp,
    issueCount,
    hasIssues: issueCount > 0,
    status: rows.some(item => item?.status === 'issue') ? 'needs-attention' : rows.some(item => ['warning', 'unavailable'].includes(item?.status)) ? 'review' : 'ok',
    expected: { ...(derivedStats?.expected || {}), hpMaxKnownMinimum: hp.lower, hpMaxKnownMaximum: hp.upper, hpMaxExact: hp.exact },
    current: { ...(derivedStats?.current || {}), hpMax: hp.current },
    warnings: rows.filter(item => item?.needsAttention && item?.issue).map(item => `${item.label}: ${item.issue}`),
  };
}

export class ProgressionEntitlementCalculator {
  constructor({ helpers = {} } = {}) {
    this.helpers = helpers;
  }

  calculate(actor, options = {}) {
    const rawSummaries = typeof this.helpers.buildClassSummaries === 'function' ? this.helpers.buildClassSummaries(actor) : [];
    const internalClassSummaries = canonicalClassSummaries(actor, rawSummaries);
    const summedLevel = internalClassSummaries.reduce((sum, summary) => sum + normalizeLevel(summary.level), 0);
    const explicitLevel = normalizeLevel(actor?.system?.level ?? actor?.system?.details?.level ?? actor?.system?.progression?.level);
    const totalLevel = summedLevel || explicitLevel;
    const totalHeroicLevel = internalClassSummaries.filter(summary => !isNonheroic(summary)).reduce((sum, summary) => sum + normalizeLevel(summary.level), 0) || totalLevel;

    const abilityIncreases = typeof this.helpers.buildAbilityIncreaseSlots === 'function' ? this.helpers.buildAbilityIncreaseSlots(actor, totalLevel) : [];
    const generalFeats = typeof this.helpers.buildGeneralFeatSlots === 'function' ? this.helpers.buildGeneralFeatSlots(actor, totalHeroicLevel) : [];
    const classChoices = typeof this.helpers.buildClassChoiceSlots === 'function' ? this.helpers.buildClassChoiceSlots(actor, internalClassSummaries) : [];
    const classFeats = classChoices.filter(slot => slot?.type === 'class-feat');
    const classTalents = classChoices.filter(slot => slot?.type === 'class-talent');
    const heroicTalents = classTalents.length > 0 ? [] : (typeof this.helpers.buildHeroicTalentSlots === 'function' ? this.helpers.buildHeroicTalentSlots(actor, totalHeroicLevel) : []);
    const baseDerivedStats = typeof this.helpers.buildDerivedStatsAudit === 'function'
      ? this.helpers.buildDerivedStatsAudit(actor, internalClassSummaries, { totalLevel, totalHeroicLevel })
      : { status: 'unavailable', rows: [], hasIssues: false, issueCount: 0 };
    const derivedStats = applyHpAudit(baseDerivedStats, buildHpAudit(actor, internalClassSummaries, totalHeroicLevel));

    return {
      kind: 'swse-progression-entitlement-plan',
      version: 4,
      actorId: actor?.id || null,
      actorName: actor?.name || 'Actor',
      totalLevel,
      totalHeroicLevel,
      mode: options.mode || 'actor-audit',
      internalClassSummaries,
      classSummaries: internalClassSummaries.map(summary => (
        typeof this.helpers.toPublicClassSummary === 'function'
          ? this.helpers.toPublicClassSummary(summary)
          : { itemId: summary.itemId || null, classId: summary.classId || '', className: summary.className || summary.classId || 'Unknown', level: Number(summary.level || 0) || 0 }
      )),
      slots: { abilityIncreases, generalFeats, heroicTalents, classChoices, classFeats, classTalents, derivedStats },
      derivedStats,
      diagnostics: {
        layer: 'entitlement-calculator',
        delegated: true,
        phase: 7,
        classLevelSources: internalClassSummaries.map(summary => ({
          classId: summary.classId || '',
          className: summary.className || '',
          level: Number(summary.level || 0) || 0,
          sources: Array.from(new Set(Array.isArray(summary.sources) ? summary.sources : [])),
          classProgressionSource: 'canonical-deduplicated-actor-ledger',
          cadenceFallback: false,
        })),
        derivedStats: {
          status: derivedStats?.status || 'unavailable',
          rowCount: Array.isArray(derivedStats?.rows) ? derivedStats.rows.length : 0,
          issueCount: Number(derivedStats?.issueCount || 0) || 0,
          source: 'class-compendium-ssot-plus-hp-ledger',
        },
      },
    };
  }
}

export default ProgressionEntitlementCalculator;
