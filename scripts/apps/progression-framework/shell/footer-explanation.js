/**
 * FooterExplanation
 *
 * Builds a compact, reusable explanation payload for the progression footer
 * status counter. The shell renders this as a hover/focus popover so players
 * can see both:
 * - why the current step is present/unlocked
 * - how the current selection budget was calculated
 *
 * This module deliberately reads the already-hydrated step plugin state instead
 * of recalculating rules from a parallel source. Step-specific private fields are
 * used only as a display readout of the values the step already computed.
 */

const NUMBER_CLASS = Object.freeze({
  positive: 'prog-explain-number--positive',
  neutral: 'prog-explain-number--neutral',
  negative: 'prog-explain-number--negative',
});

const STEP_UNLOCK_COPY = Object.freeze({
  intro: 'Unlocked by starting character registration.',
  species: 'Unlocked at character start. Species establishes automatic languages, ability modifiers, size, speed, and native traits.',
  attribute: 'Unlocked after identity setup. Attributes drive derived modifiers such as Intelligence for languages and skills.',
  class: 'Unlocked after attributes. Class determines trained skill allowance, starting feats, defenses, hit points, and many future entitlements.',
  'l1-survey': 'Unlocked during level 1 setup. The survey helps the mentor and suggestion systems understand build intent.',
  background: 'Unlocked after class selection. Backgrounds provide narrative identity and can grant class skill access or language context.',
  skills: 'Unlocked when the character has skill training slots to resolve. Class, Intelligence, species traits, backgrounds, and Skill Training entitlements can all affect this step.',
  'general-feat': 'Unlocked by the heroic feat cadence. At level 1 and later feat levels, the character chooses a general feat from legal options.',
  'class-feat': 'Unlocked when the current class progression grants a class feat choice. Only feats valid for that class slot are considered.',
  'general-talent': 'Unlocked when heroic progression grants a talent slot outside the class-only talent lane.',
  'class-talent': 'Unlocked when class progression grants a class talent slot. Available trees and talents are filtered through current class and legality rules.',
  languages: 'Unlocked after species, background, class, and feat context are known so native languages and bonus language picks can be calculated.',
  'force-powers': 'Unlocked by Force Training or another force-power entitlement. Only selectable powers count against this budget.',
  'force-secrets': 'Unlocked by a class or prestige-class grant that awards a Force Secret choice.',
  'force-techniques': 'Unlocked by a class or prestige-class grant that awards a Force Technique choice.',
  'starship-maneuvers': 'Unlocked by a maneuver-granting entitlement. Maneuver capacity comes from the starship maneuver authority engine.',
  'final-droid-configuration': 'Unlocked when a deferred droid build still needs final configuration before completion.',
  summary: 'Unlocked after required registration steps are complete. Summary reviews the mutation plan before final confirmation.',
});

const STEP_LABELS = Object.freeze({
  'general-feat': 'General Feat',
  'class-feat': 'Class Feat',
  'general-talent': 'Heroic Talent',
  'class-talent': 'Class Talent',
  'force-powers': 'Force Powers',
  'force-secrets': 'Force Secrets',
  'force-techniques': 'Force Techniques',
  'starship-maneuvers': 'Starship Maneuvers',
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function classNameToken(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'generic';
}

function numberToken(value, { forceSign = false, zeroClass = 'neutral' } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return escapeHtml(value);
  const polarity = number > 0 ? 'positive' : number < 0 ? 'negative' : zeroClass;
  const prefix = forceSign && number > 0 ? '+' : '';
  return `<span class="prog-explain-number ${NUMBER_CLASS[polarity]}">${prefix}${number}</span>`;
}

function termToken(label, type = 'generic', extraClass = '') {
  const safeType = classNameToken(type);
  const safeExtra = extraClass ? ` ${escapeHtml(extraClass)}` : '';
  return `<span class="prog-explain-term prog-explain-term--${safeType}${safeExtra}">${escapeHtml(label)}</span>`;
}

function abilityToken(label, abilityKey = '') {
  const key = classNameToken(abilityKey || label).slice(0, 3);
  return `<span class="prog-skill-token prog-skill-token--${key}" data-ability="${escapeHtml(key)}">${escapeHtml(label)}</span>`;
}

function sourceToken(label, source = '') {
  return `<span class="prog-explain-source prog-explain-source--${classNameToken(source || label)}">${escapeHtml(label)}</span>`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatInlineText(value) {
  const raw = String(value ?? '');
  const abilityEntries = [
    ['Strength', 'str'], ['Dexterity', 'dex'], ['Constitution', 'con'],
    ['Intelligence', 'int'], ['Wisdom', 'wis'], ['Charisma', 'cha'],
  ];
  const termEntries = [
    ['Force Training', 'feat'], ['Skill Training', 'feat'], ['Force Power', 'force'],
    ['Force Secret', 'force'], ['Force Technique', 'force'], ['General Feat', 'feat'],
    ['Class Feat', 'feat'], ['Heroic Talent', 'talent'], ['Class Talent', 'talent'],
    ['Linguist', 'feat'], ['Background', 'background'], ['background', 'background'],
    ['Species', 'species'], ['species', 'species'], ['Class', 'class'], ['class', 'class'],
    ['Feat', 'feat'], ['feat', 'feat'], ['Talent', 'talent'], ['talent', 'talent'],
    ['Language', 'language'], ['language', 'language'], ['Skill', 'skill'], ['skill', 'skill'],
  ];

  const abilityMap = new Map(abilityEntries.map(([label, key]) => [label.toLowerCase(), { label, key }]));
  const termMap = new Map(termEntries.map(([label, type]) => [label.toLowerCase(), { label, type }]));
  const words = [...abilityEntries.map(([label]) => label), ...termEntries.map(([label]) => label)]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  const regex = new RegExp(`([+-]?\\d+)|\\b(${words})\\b`, 'gi');

  let html = '';
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    html += escapeHtml(raw.slice(lastIndex, match.index));
    const numberMatch = match[1];
    const wordMatch = match[2];
    if (numberMatch !== undefined) {
      html += numberToken(Number(numberMatch), { forceSign: numberMatch.startsWith('+') });
    } else if (wordMatch) {
      const lower = wordMatch.toLowerCase();
      const ability = abilityMap.get(lower);
      if (ability) html += abilityToken(ability.label, ability.key);
      else {
        const term = termMap.get(lower);
        html += term ? termToken(term.label, term.type) : escapeHtml(wordMatch);
      }
    }
    lastIndex = regex.lastIndex;
  }
  html += escapeHtml(raw.slice(lastIndex));
  return html;
}

function line(label, valueHtml, { muted = false } = {}) {
  return `<div class="prog-footer-explain__line${muted ? ' prog-footer-explain__line--muted' : ''}">`
    + `<span class="prog-footer-explain__line-label">${escapeHtml(label)}</span>`
    + `<span class="prog-footer-explain__line-value">${valueHtml}</span>`
    + '</div>';
}

function section(title, linesHtml) {
  if (!linesHtml) return '';
  return '<section class="prog-footer-explain__section">'
    + `<div class="prog-footer-explain__section-title">${escapeHtml(title)}</div>`
    + linesHtml
    + '</section>';
}

function abilityModFromShell(shell, abilityKey) {
  const key = String(abilityKey || '').toLowerCase();
  const scores = shell?._resolveAbilityScores?.() || null;
  const value = Number(scores?.[key]);
  if (Number.isFinite(value)) return Math.floor((value - 10) / 2);

  const actorAbility = shell?.actor?.system?.abilities?.[key] || {};
  const score = Number(actorAbility.base ?? actorAbility.value ?? actorAbility.total ?? 10);
  return Number.isFinite(score) ? Math.floor((score - 10) / 2) : 0;
}

function countMapValues(mapLike) {
  if (!mapLike) return 0;
  if (mapLike instanceof Map) {
    return Array.from(mapLike.values()).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  }
  if (typeof mapLike === 'object') {
    return Object.values(mapLike).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  }
  return 0;
}

function buildUnlockHtml(descriptor, shell, mode) {
  const stepId = descriptor?.stepId || '';
  const label = descriptor?.label || STEP_LABELS[stepId] || stepId || 'Current Step';
  const pieces = [];
  const isConditional = !!descriptor?.isConditional || !!descriptor?.unlockReason;

  if (descriptor?.unlockReason) {
    pieces.push(line('Unlocked by', formatInlineText(descriptor.unlockReason)));
  } else {
    pieces.push(line('Unlocked by', formatInlineText(STEP_UNLOCK_COPY[stepId] || 'This step is part of the current progression route.')));
  }

  pieces.push(line('Step type', `${termToken(label, descriptor?.type || 'step')}${isConditional ? ` ${sourceToken('Engine-unlocked', 'conditional')}` : ` ${sourceToken(mode === 'levelup' ? 'Level-up route' : 'Chargen route', mode || 'default')}`}`));

  const index = Number(shell?.currentStepIndex ?? -1);
  const total = Number(shell?.steps?.length ?? 0);
  if (index >= 0 && total > 0) {
    pieces.push(line('Position', `${numberToken(index + 1, { forceSign: false })} of ${numberToken(total, { forceSign: false })}`));
  }

  return section('Why this step is here', pieces.join(''));
}

function buildLanguageMath(plugin, shell) {
  const total = Math.max(0, Number(plugin?._bonusLanguagesAvailable || 0));
  const selected = Math.max(0, Number(plugin?._selectedBonusLanguages?.length || 0));
  const remaining = Math.max(0, total - selected);
  const intMod = abilityModFromShell(shell, 'int');
  let rules = null;
  try { rules = plugin?._buildLanguageRuleBreakdown?.(shell) || null; } catch (_err) { rules = null; }
  const intPicks = Math.max(0, Number(rules?.intModPicks ?? intMod ?? 0));
  const linguistPicks = Math.max(0, Number(rules?.linguistPicks || 0));

  const summary = total > 0
    ? `Derived from ${numberToken(intMod, { forceSign: true })} ${abilityToken('Intelligence', 'int')} modifier${linguistPicks > 0 ? ` and ${termToken('Linguist', 'feat')} language grants` : ''}.`
    : `No bonus language picks are available because the effective ${abilityToken('Intelligence', 'int')} language modifier and language grants provide ${numberToken(0)} picks.`;

  const lines = [
    line('Total available', numberToken(total)),
    line('Intelligence modifier', `${numberToken(intMod, { forceSign: true })} ${abilityToken('Intelligence', 'int')} -> ${numberToken(intPicks)} pick${intPicks === 1 ? '' : 's'}`),
  ];
  if (linguistPicks > 0) lines.push(line('Linguist grants', `${numberToken(linguistPicks, { forceSign: true })} ${termToken('Language', 'language')} pick${linguistPicks === 1 ? '' : 's'}`));
  lines.push(line('Already selected', numberToken(selected)));
  lines.push(line('Remaining', numberToken(remaining)));

  return { summaryHtml: summary, mathHtml: section('Selection formula', lines.join('')) };
}

function buildSkillsMath(plugin, shell) {
  const total = Math.max(0, Number(plugin?._allowedCount || 0));
  const selected = Math.max(0, Number(plugin?._trainedCount || 0));
  const remaining = Math.max(0, total - selected);
  const intMod = abilityModFromShell(shell, 'int');
  const pendingSlots = Number(plugin?._resolvePendingSkillTrainingSlots?.(shell) || 0);

  const summary = pendingSlots > 0
    ? `This budget comes from pending ${termToken('Skill Training', 'feat')} slots that must be resolved now.`
    : `Skill trainings are derived from class allowance, ${abilityToken('Intelligence', 'int')} modifier, and applicable species/background bonuses.`;

  const lines = [
    line('Total available', numberToken(total)),
    line('Intelligence signal', `${numberToken(intMod, { forceSign: true })} ${abilityToken('Intelligence', 'int')} modifier`),
  ];
  if (pendingSlots > 0) lines.push(line('Pending entitlement', `${numberToken(pendingSlots, { forceSign: true })} ${termToken('Skill Training', 'feat')} slot${pendingSlots === 1 ? '' : 's'}`));
  lines.push(line('Already trained here', numberToken(selected)));
  lines.push(line('Remaining', numberToken(remaining)));

  return { summaryHtml: summary, mathHtml: section('Selection formula', lines.join('')) };
}

function buildBackgroundMath(plugin) {
  const total = Math.max(1, Number(plugin?._maxBackgrounds || 1));
  const selected = Math.max(0, Number(plugin?._committedBackgroundIds?.length || 0));
  const remaining = Math.max(0, total - selected);
  const summary = `${termToken('Background', 'background')} choice represents the character's history and can unlock class skills, languages, or narrative hooks.`;
  const lines = [
    line('Total background slots', numberToken(total)),
    line('Selected', numberToken(selected)),
    line('Remaining', numberToken(remaining)),
  ];
  return { summaryHtml: summary, mathHtml: section('Selection formula', lines.join('')) };
}

function buildClassMath(plugin) {
  const selected = plugin?._committedClassId ? 1 : 0;
  const summary = `${termToken('Class', 'class')} determines starting feats, defenses, trained skills, talent access, and future progression grants.`;
  const lines = [
    line('Class slots', numberToken(1)),
    line('Selected', numberToken(selected)),
    line('Remaining', numberToken(Math.max(0, 1 - selected))),
  ];
  return { summaryHtml: summary, mathHtml: section('Selection formula', lines.join('')) };
}

function buildFeatMath(plugin) {
  const selected = plugin?._selectedFeatId ? 1 : 0;
  const noChoices = !!plugin?._noChoicesAvailable;
  const slot = plugin?._slotType === 'class' ? 'Class Feat' : 'General Feat';
  const summary = noChoices
    ? `${termToken(slot, 'feat')} is present, but no legal feat options are available, so the step can be safely skipped.`
    : `${termToken(slot, 'feat')} slots are filled from legal/selectable feats only; locked or already-owned feats do not count as recommendations.`;
  const total = noChoices ? 0 : 1;
  const lines = [
    line('Feat slots', numberToken(total)),
    line('Selected', numberToken(selected)),
    line('Remaining', numberToken(Math.max(0, total - selected))),
  ];
  return { summaryHtml: summary, mathHtml: section('Selection formula', lines.join('')) };
}

function buildTalentMath(plugin) {
  const selected = plugin?._selectedTalentId ? 1 : 0;
  const slot = plugin?._slotType === 'class' ? 'Class Talent' : 'Heroic Talent';
  const tree = plugin?._selectedTreeId && plugin?._getTree ? plugin._getTree(plugin._selectedTreeId) : null;
  const summary = `${termToken(slot, 'talent')} slots are filled from legal/selectable talents only. ${tree ? `Currently viewing ${termToken(tree.name || 'selected tree', 'talent')}.` : 'Choose a talent tree first, then pick a legal talent inside it.'}`;
  const lines = [
    line('Talent slots', numberToken(1)),
    line('Selected', numberToken(selected)),
    line('Remaining', numberToken(Math.max(0, 1 - selected))),
  ];
  return { summaryHtml: summary, mathHtml: section('Selection formula', lines.join('')) };
}

function buildForceMath(plugin, stepId) {
  const label = STEP_LABELS[stepId] || 'Force Choice';
  const total = Math.max(0, Number(plugin?._remainingPicks || 0));
  const selected = stepId === 'force-secrets'
    ? countMapValues(plugin?._committedSecretCounts)
    : stepId === 'force-techniques'
      ? countMapValues(plugin?._committedTechniqueCounts)
      : countMapValues(plugin?._committedPowerCounts);
  const remaining = Math.max(0, total - selected);
  const source = stepId === 'force-powers'
    ? `${termToken('Force Training', 'feat')} or another Force power entitlement`
    : stepId === 'force-secrets'
      ? 'a class or prestige-class Force Secret grant'
      : 'a class or prestige-class Force Technique grant';
  const summary = `${termToken(label, 'force')} are available because ${source} produced selectable slots.`;
  const lines = [
    line('Total granted', numberToken(total)),
    line('Selected', numberToken(selected)),
    line('Remaining', numberToken(remaining)),
  ];
  return { summaryHtml: summary, mathHtml: section('Selection formula', lines.join('')) };
}

function buildGenericMath(plugin, footerOverride, remainingPicks) {
  const primary = (remainingPicks || []).find(pick => Number.isFinite(Number(pick?.count))) || null;
  const status = footerOverride?.statusText || primary?.label || 'Ready';
  const count = Number(primary?.count ?? 0);
  const total = Number(primary?.total ?? 0);
  const selected = Number(primary?.selected ?? (total > 0 ? Math.max(0, total - count) : 0));
  const lines = [];
  if (primary) {
    if (Number.isFinite(total) && total > 0) lines.push(line('Total available', numberToken(total)));
    lines.push(line('Selected', numberToken(selected)));
    lines.push(line('Remaining', numberToken(count)));
  }
  const summary = formatInlineText(status);
  return { summaryHtml: summary, mathHtml: lines.length ? section('Selection formula', lines.join('')) : '' };
}

function buildMathForStep(stepId, plugin, shell, footerOverride, remainingPicks) {
  switch (stepId) {
    case 'languages': return buildLanguageMath(plugin, shell);
    case 'skills': return buildSkillsMath(plugin, shell);
    case 'background': return buildBackgroundMath(plugin);
    case 'class': return buildClassMath(plugin);
    case 'general-feat':
    case 'class-feat': return buildFeatMath(plugin);
    case 'general-talent':
    case 'class-talent': return buildTalentMath(plugin);
    case 'force-powers':
    case 'force-secrets':
    case 'force-techniques': return buildForceMath(plugin, stepId);
    default: return buildGenericMath(plugin, footerOverride, remainingPicks);
  }
}

export class FooterExplanation {
  static build({ shell, currentPlugin, descriptor, remainingPicks = [], footerOverride = {}, blockingIssues = [], mode = 'chargen' } = {}) {
    try {
      const stepId = descriptor?.stepId || '';
      const label = descriptor?.label || STEP_LABELS[stepId] || 'Progression Step';
      const math = buildMathForStep(stepId, currentPlugin, shell, footerOverride, remainingPicks);
      const unlockHtml = buildUnlockHtml(descriptor, shell, mode);
      const blockerHtml = blockingIssues?.length
        ? section('Blocking issue', blockingIssues.map(issue => line('Needs attention', formatInlineText(issue))).join(''))
        : '';

      return {
        title: `${label} explanation`,
        summaryHtml: math.summaryHtml || formatInlineText(footerOverride?.statusText || 'Ready'),
        bodyHtml: `${math.mathHtml || ''}${unlockHtml}${blockerHtml}`,
      };
    } catch (error) {
      return {
        title: 'Progression explanation',
        summaryHtml: 'This counter explains why the current step is available and how its choices are calculated.',
        bodyHtml: section('Unavailable', line('Reason', escapeHtml(error?.message || 'Explanation could not be built.'))),
      };
    }
  }

  static formatInlineText(value) { return formatInlineText(value); }
  static numberToken(value, options) { return numberToken(value, options); }
  static termToken(label, type, extraClass) { return termToken(label, type, extraClass); }
  static sourceToken(label, source) { return sourceToken(label, source); }
}
