import { buildChatSvgContext, buildChatStateContext } from "/systems/foundryvtt-swse/scripts/chat/chat-svg-assets.js";
import { WeaponVisualProfileResolver } from "/systems/foundryvtt-swse/scripts/engine/visuals/weapon-visual-profile-resolver.js";


function swseChatLabel(value = '') {
  return String(value ?? '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function swseChatForceDescriptorKey(value = '') {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('dark')) return 'dark';
  if (text.includes('tele') || text === 'tk' || text.includes('move')) return 'tk';
  if (text.includes('mind') || text.includes('affect')) return 'mind';
  if (text.includes('form') || text.includes('lightsaber')) return 'form';
  if (text.includes('light')) return 'light';
  return text ? text.replace(/[^a-z0-9]+/g, '-') : 'light';
}

function swseChatForceDescriptorGlyph(key = '') {
  const map = { dark: '◆', light: '◇', tk: '◆', mind: '◇', form: '◆' };
  return map[key] ?? '◇';
}

function swseChatBuildForceDescriptors(context = {}, primaryDescriptor = '') {
  const raw = [];
  const add = value => {
    if (Array.isArray(value)) value.forEach(add);
    else if (value != null && String(value).trim()) raw.push(String(value).trim());
  };
  add(context.descriptor);
  add(context.forceDescriptor);
  add(context.powerDescriptor);
  add(context.descriptors);
  add(context.forceDescriptors);
  add(context.powerDescriptors);
  add(context.tags);
  if (!raw.length && primaryDescriptor) raw.push(primaryDescriptor);

  const byKey = new Map();
  for (const value of raw) {
    const key = swseChatForceDescriptorKey(value);
    if (!key || byKey.has(key)) continue;
    const labelMap = { tk: 'Telekinetic', mind: 'Mind-Affecting', dark: 'Dark Side', light: 'Light Side', form: 'Form' };
    byKey.set(key, { key, label: labelMap[key] ?? swseChatLabel(value), glyph: swseChatForceDescriptorGlyph(key) });
  }
  return [...byKey.values()];
}

function swseChatBuildForceTierGauge(total, context = {}) {
  const raw = context.dcChart ?? context.dcTiers ?? context.forceTiers ?? context.tiers ?? context.powerDcChart ?? [];
  if (!Array.isArray(raw) || !raw.length) return [];
  const numericTotal = Number(total);
  const rows = raw
    .map(entry => ({
      dc: Number(entry?.dc ?? entry?.DC ?? entry?.target ?? entry?.threshold),
      effect: String(entry?.effect ?? entry?.description ?? entry?.text ?? entry?.label ?? '').trim()
    }))
    .filter(entry => Number.isFinite(entry.dc) && entry.effect)
    .sort((a, b) => a.dc - b.dc)
    .slice(0, 6);
  let topIndex = -1;
  if (Number.isFinite(numericTotal)) {
    rows.forEach((entry, index) => { if (numericTotal >= entry.dc) topIndex = index; });
  }
  return rows.map((entry, index) => ({
    dc: entry.dc,
    effect: entry.effect,
    hit: index <= topIndex,
    top: index === topIndex
  }));
}

function swseChatReactionGlyph(key = '') {
  const map = {
    block: '◐',
    deflect: '↗',
    counterattack: '↩',
    forceReflection: '◆',
    force_reflection: '◆',
    evasion: '⟿',
    unarmedParry: 'U',
    unarmed_parry: 'U',
    unarmedCounterstrike: 'U',
    unarmed_counterstrike: 'U',
    retaliationJab: 'R',
    retaliation_jab: 'R',
    forcePoint: '✦',
    force_point: '✦',
    destinyPoint: '⬢',
    destiny_point: '⬢'
  };
  return map[key] ?? '↩';
}

function swseChatActorOwnerUserId(actor = null) {
  if (!actor?.ownership) return '';
  const activeUsers = globalThis.game?.users?.contents ?? [];
  const owner = activeUsers.find(user => !user.isGM && user.active && Number(actor.ownership[user.id] ?? 0) >= 3)
    ?? activeUsers.find(user => !user.isGM && Number(actor.ownership[user.id] ?? 0) >= 3)
    ?? null;
  return owner?.id ?? '';
}

function swseChatBuildReactionContext(actor, context = {}) {
  const source = context.reactionContext ?? {};
  const reactionsRaw = source.reactions ?? context.availableReactions ?? context.reactions ?? context.chatReactions ?? [];
  const reactions = Array.isArray(reactionsRaw) ? reactionsRaw : [];
  if (!reactions.length) return { reactions: [] };

  const defender = source.defender ?? context.defender ?? context.target ?? null;
  const attacker = source.attacker ?? context.attacker ?? actor ?? null;
  const defenderId = source.defenderId ?? defender?.id ?? context.defenderId ?? context.targetId ?? '';
  const attackerId = source.attackerId ?? attacker?.id ?? context.attackerId ?? actor?.id ?? '';
  const ownerUserId = source.ownerUserId ?? swseChatActorOwnerUserId(defender) ?? '';

  return {
    reactions: reactions.map(entry => {
      const key = String(entry?.key ?? entry?.id ?? entry?.reactionKey ?? '').trim();
      return {
        key,
        label: entry?.label ?? entry?.name ?? swseChatLabel(key || 'Reaction'),
        glyph: entry?.glyph ?? swseChatReactionGlyph(key),
        trigger: entry?.trigger ?? context.trigger ?? 'ON_ATTACK_DECLARED',
        available: entry?.available ?? entry?.allowed ?? entry?.isAvailable ?? true,
        sublabel: entry?.sublabel ?? entry?.subtitle ?? entry?.short ?? entry?.costLabel ?? '',
        dc: entry?.dc ?? entry?.attackTotal ?? context.dc ?? '',
        attackTotal: entry?.attackTotal ?? entry?.dc ?? context.dc ?? '',
        reason: entry?.reason ?? entry?.description ?? ''
      };
    }).filter(entry => entry.key),
    defenderId,
    attackerId,
    ownerUserId,
    defenderName: source.defenderName ?? defender?.name ?? context.targetName ?? '',
    timerLabel: source.timerLabel ?? context.reactionTimerLabel ?? '',
    reason: source.reason ?? context.reactionReason ?? ''
  };
}

function swseChatBuildEventContext(context = {}, category = 'roll', reactionContext = null) {
  const eventId = context.eventId ?? context.attackEventId ?? (reactionContext?.reactions?.length ? `swse-${globalThis.foundry?.utils?.randomID?.() ?? Date.now()}` : '');
  const hasReactionWindow = Boolean(reactionContext?.reactions?.length);
  return {
    eventId,
    messageId: context.messageId ?? '',
    eventState: context.eventState ?? (hasReactionWindow ? 'pending' : 'standard'),
    resolutionLabel: context.resolutionLabel ?? (hasReactionWindow ? 'Provisional Result' : category === 'damage' ? 'Damage Resolved' : 'Resolved'),
    reactionLabel: context.reactionLabel ?? (hasReactionWindow ? 'Reaction Window Open' : ''),
    showProvisionalBadge: hasReactionWindow || context.showProvisionalBadge === true,
    showFinalBadge: context.showFinalBadge === true
  };
}


function swseChatBuildAttackDamage(context = {}) {
  const damage = context.attackDamage ?? null;
  if (!damage || !Number.isFinite(Number(damage.total))) return null;
  return {
    total: Number(damage.total),
    formula: String(damage.formula ?? '').trim(),
    damageType: String(damage.damageType ?? '').trim(),
    actorId: String(damage.actorId ?? context.actorId ?? context.attackerId ?? '').trim(),
    targetId: String(damage.targetId ?? context.targetId ?? '').trim(),
    weaponId: String(damage.weaponId ?? context.weaponId ?? context.itemId ?? '').trim(),
    isCritical: damage.isCritical === true,
    critMultiplier: Number(damage.critMultiplier ?? context.critMultiplier ?? 2) || 2,
    label: String(damage.label ?? 'Damage').trim() || 'Damage'
  };
}

function swseChatBuildDamageAction(context = {}, weapon = null, isCritical = false, actor = null) {
  if (context.showDamageAction === false) return null;
  const weaponId = context.weaponId ?? context.itemId ?? weapon?.id ?? '';
  if (!weaponId || context.disableDamageAction === true) return null;
  const critMultiplier = Number(context.critMultiplier ?? weapon?.system?.criticalMultiplier ?? weapon?.system?.critMultiplier ?? 2) || 2;
  return {
    actorId: context.actorId ?? context.attackerId ?? actor?.id ?? '',
    weaponId,
    isCritical: context.isCritical === true || isCritical === true,
    critMultiplier,
    twoHanded: context.twoHanded === true,
    label: context.damageActionLabel ?? `Roll Damage${(context.isCritical === true || isCritical === true) ? ` ×${critMultiplier}` : ''}`
  };
}
/**
 * SWSERollEngine
 *
 * Service layer for structured roll output.
 * Produces roll result objects that can be rendered via holo-roll.hbs
 *
 * Governance:
 * - No direct ChatMessage.create()
 * - No direct roll.toMessage()
 * - All output routes through SWSEChat.postRoll() with holo template
 */

export class SWSERollEngine {
  /**
   * Build structured roll result for holo rendering
   * @param {Roll} roll - Foundry Roll object
   * @param {Actor} actor - Rolling actor
   * @param {string} flavor - Roll flavor/label
   * @param {Object} context - Additional context
   * @returns {Object} Structured roll data
   */
  static buildHoloRollData({
    roll,
    actor = null,
    flavor = '',
    context = {}
  } = {}) {
    if (!roll) {
      throw new Error('SWSERollEngine.buildHoloRollData requires a Roll object');
    }

    if (roll.total === undefined || roll.total === null) {
      throw new Error('SWSERollEngine: Roll must be evaluated before rendering');
    }

    const safeContext = context ?? {};
    const breakdown = this._buildBreakdown(roll);
    const category = this._categorizeResult(roll, safeContext);
    const actorName = actor?.name ?? safeContext?.actorName ?? 'Unknown';
    const label = this._resolveLabel(safeContext, flavor);
    const actionTitle = this._stripHtml(flavor || label || `${actorName} rolled`);
    const weapon = this._resolveContextWeapon(actor, safeContext);
    const weaponVisual = weapon
      ? WeaponVisualProfileResolver.toChatView(WeaponVisualProfileResolver.resolve(weapon, { actor }))
      : null;
    const d20 = this._getD20Result(roll);
    const abilityKey = this._resolveAbilityKey(category, safeContext);
    const forceDescriptor = this._resolveForceDescriptor(category, safeContext);
    const damageType = this._resolveDamageType(weapon, safeContext, category);
    const parts = this._buildParts({ roll, context: safeContext, breakdown, d20, category });
    const outcome = this._buildOutcome({ roll, context: safeContext, category, d20 });
    const isCritical = d20?.result === 20 && (category === 'attack' || category === 'crit' || safeContext?.isCritical === true);
    const isFumble = d20?.result === 1;
    const totalLabel = this._resolveTotalLabel(category, safeContext);
    const typeChipLabel = this._resolveTypeChipLabel(category, safeContext, label, weapon);
    const abilityBadge = abilityKey ? abilityKey.toUpperCase().slice(0, 3) : '';
    const railColor = weaponVisual?.colorHex || this._resolveContextRailColor(safeContext);
    const railStyle = railColor ? `--rail: ${railColor}; --swse-weapon-visual-color: ${railColor};` : '';
    const forceDescriptors = category === 'force' ? swseChatBuildForceDescriptors(safeContext, forceDescriptor) : [];
    const forceTierGauge = category === 'force' ? swseChatBuildForceTierGauge(roll.total, safeContext) : [];
    const reactionContext = swseChatBuildReactionContext(actor, safeContext);
    const eventContext = swseChatBuildEventContext(safeContext, category, reactionContext);
    const attackDamage = category === 'attack' ? swseChatBuildAttackDamage(safeContext) : null;
    const damageAction = category === 'attack' && !attackDamage ? swseChatBuildDamageAction(safeContext, weapon, isCritical, actor) : null;

    return {
      chatSvg: buildChatSvgContext(),
      chatState: buildChatStateContext({
        state: outcome?.state === 'success' || isCritical ? 'success' : outcome?.state === 'failure' || isFumble ? 'failure' : 'default',
        statusLabel: label || typeChipLabel || 'Roll Result',
        statusSubLabel: `Total ${roll.total}`,
        showStatusRail: true,
        showHeaderDivider: true,
        showBadge: true
      }),
      roll,
      formula: roll.formula,
      total: roll.total,
      dice: roll.dice,
      breakdown,
      flavor,
      title: actionTitle,
      actionTitle,
      subtitle: safeContext?.trained === true ? 'Trained' : '',
      category,
      actor,
      actorName,
      timestamp: new Date().toISOString(),
      timeLabel: this._formatTimeLabel(new Date()),
      context: safeContext,
      weaponVisual,
      abilityKey,
      abilityBadge,
      forceDescriptor,
      railStyle,
      hasWeaponRail: Boolean(railColor),
      typeChipLabel,
      totalLabel,
      parts,
      outcome,
      damageType,
      hasDamageType: Boolean(damageType),
      isCritical,
      isFumble,
      isForceCard: category === 'force',
      forceDescriptors,
      forceTierGauge,
      reactionContext,
      eventContext,
      attackDamage,
      damageAction
    };
  }


  /**
   * Resolve a weapon-like item from roll context without performing any roll
   * math or mutation. Chat visuals remain consumers of engine roll context.
   * @private
   */
  static _resolveContextWeapon(actor, context = {}) {
    const candidate = context?.weapon ?? context?.item ?? context?.sourceItem ?? null;
    if (candidate?.type) return candidate;

    const itemId = context?.weaponId ?? context?.itemId ?? context?.sourceItemId ?? null;
    if (!itemId || !actor?.items?.get) return null;
    return actor.items.get(itemId) ?? null;
  }

  /**
   * Extract dice breakdown from roll
   * @private
   */
  static _buildBreakdown(roll) {
    const breakdown = [];

    for (const term of roll.terms ?? []) {
      if (term.results) {
        breakdown.push({
          type: 'dice',
          faces: term.faces,
          results: term.results.map(r => ({
            result: r.result,
            active: r.active !== false
          }))
        });
      } else if (term.operator) {
        breakdown.push({
          type: 'operator',
          operator: term.operator
        });
      } else if (typeof term.number === 'number') {
        breakdown.push({
          type: 'modifier',
          value: term.number
        });
      }
    }

    return breakdown;
  }

  /**
   * Categorize roll result. Category controls the chat shell only; it never
   * changes roll math.
   * @private
   */
  static _categorizeResult(roll, context = {}) {
    const explicit = String(context?.category ?? context?.type ?? context?.rollType ?? '').trim().toLowerCase();
    const map = {
      skill: 'skill',
      skills: 'skill',
      ability: 'ability',
      attack: 'attack',
      damage: 'damage',
      save: 'save',
      defense: 'save',
      initiative: 'initiative',
      force: 'force',
      'force-power': 'force',
      forcepower: 'force',
      power: 'force',
      utility: 'roll',
      roll: 'roll',
      neutral: 'roll',
      crit: 'attack',
      fail: 'roll'
    };
    if (map[explicit]) return map[explicit];

    const label = String(context?.label ?? context?.skillLabel ?? context?.rollLabel ?? '').toLowerCase();
    if (label.includes('initiative')) return 'initiative';
    if (label.includes('force')) return 'force';
    if (label.includes('damage')) return 'damage';
    if (label.includes('attack')) return 'attack';
    if (context?.skillKey) return 'skill';
    if (context?.abilityKey) return 'ability';

    return 'roll';
  }

  static _resolveLabel(context = {}, flavor = '') {
    return context?.label
      ?? context?.skillLabel
      ?? context?.rollLabel
      ?? context?.itemName
      ?? this._stripHtml(flavor || '');
  }

  static _stripHtml(value) {
    return String(value ?? '')
      .replace(/<br\s*\/?>/gi, ' — ')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static _formatSigned(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value ?? '');
    return number >= 0 ? `+${number}` : `${number}`;
  }

  static _formatTimeLabel(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  static _getD20Result(roll) {
    const d20 = roll?.dice?.find?.(d => Number(d.faces) === 20);
    const result = d20?.results?.find?.(r => r.active !== false) ?? d20?.results?.[0] ?? null;
    if (!result) return null;
    return {
      result: result.result,
      isNat20: Number(result.result) === 20,
      isNat1: Number(result.result) === 1
    };
  }

  static _resolveAbilityKey(category, context = {}) {
    const explicit = String(context?.abilityKey ?? context?.ability ?? '').trim().toLowerCase();
    const normalized = this._normalizeAbilityKey(explicit);
    if (normalized) return normalized;

    if (category !== 'skill') return '';
    return this._skillAbilityMap()[String(context?.skillKey ?? '').trim().toLowerCase()] ?? '';
  }

  static _normalizeAbilityKey(value) {
    const map = {
      str: 'str', strength: 'str',
      dex: 'dex', dexterity: 'dex',
      con: 'con', constitution: 'con',
      int: 'int', intelligence: 'int',
      wis: 'wis', wisdom: 'wis',
      cha: 'cha', charisma: 'cha'
    };
    return map[String(value ?? '').toLowerCase()] ?? '';
  }

  static _skillAbilityMap() {
    return {
      acrobatics: 'dex', climb: 'str', deception: 'cha', endurance: 'con', gatherinformation: 'cha',
      gather_information: 'cha', initiative: 'dex', jump: 'str', knowledge: 'int', mechanics: 'int',
      perception: 'wis', persuasion: 'cha', pilot: 'dex', ride: 'dex', stealth: 'dex', survival: 'wis',
      swim: 'str', treatinjury: 'wis', treat_injury: 'wis', usecomputer: 'int', use_computer: 'int',
      usetheforce: 'cha', use_the_force: 'cha', utf: 'cha'
    };
  }

  static _resolveForceDescriptor(category, context = {}) {
    if (category !== 'force') return '';
    const descriptor = String(context?.descriptor ?? context?.forceDescriptor ?? context?.powerDescriptor ?? '').toLowerCase();
    if (descriptor.includes('dark')) return 'dark';
    if (descriptor.includes('tele') || descriptor === 'tk') return 'tk';
    if (descriptor.includes('mind')) return 'mind';
    if (descriptor.includes('form')) return 'form';
    if (descriptor.includes('light')) return 'light';
    return 'light';
  }

  static _resolveContextRailColor(context = {}) {
    return context?.railColor
      ?? context?.colorHex
      ?? context?.weaponVisual?.colorHex
      ?? context?.visual?.colorHex
      ?? '';
  }

  static _resolveDamageType(weapon, context = {}, category = '') {
    if (category !== 'damage' && category !== 'attack') return '';
    const value = context?.damageType
      ?? context?.damageTypes
      ?? weapon?.system?.damageType
      ?? weapon?.system?.damage?.type
      ?? weapon?.system?.damageTypes
      ?? '';
    if (Array.isArray(value)) return value.filter(Boolean).join(' / ');
    return String(value || '').trim();
  }

  static _resolveTotalLabel(category, context = {}) {
    if (context?.totalLabel) return context.totalLabel;
    if (category === 'attack') return context?.targetDefense ? `vs ${context.targetDefense}` : 'vs Defense';
    if (category === 'damage') return 'Damage';
    if (category === 'initiative') return 'Init';
    if (category === 'force') return 'UTF';
    if (category === 'save') return context?.defenseName ?? 'Defense';
    if (category === 'skill') return 'Total';
    if (category === 'ability') return 'Total';
    return 'Total';
  }

  static _resolveTypeChipLabel(category, context = {}, label = '', weapon = null) {
    if (context?.typeChipLabel) return context.typeChipLabel;
    if (category === 'skill') return `${label || 'Skill'}${context?.trained ? ' · Trained' : ''}`;
    if (category === 'ability') return label || 'Ability Check';
    if (category === 'attack') return weapon?.name ? `${weapon.name} · Attack` : 'Attack';
    if (category === 'damage') return weapon?.name ? `${weapon.name} · Damage` : 'Damage';
    if (category === 'initiative') return 'Initiative';
    if (category === 'force') return 'Force Power · UTF';
    if (category === 'save') return label || 'Defense / Save';
    return label || 'Roll';
  }

  static _buildParts({ roll, context = {}, breakdown = [], d20 = null, category = 'roll' } = {}) {
    const parts = [];
    if (d20) {
      parts.push({
        kind: 'd20',
        label: 'd20 →',
        value: String(d20.result),
        note: d20.isNat20 ? 'NAT 20' : d20.isNat1 ? 'NAT 1' : '',
        isNat20: d20.isNat20,
        isNat1: d20.isNat1
      });
    }

    const diceGroups = breakdown.filter(part => part.type === 'dice' && Number(part.faces) !== 20);
    for (const group of diceGroups) {
      const active = group.results?.filter?.(r => r.active !== false).map(r => r.result) ?? [];
      if (!active.length) continue;
      parts.push({ kind: 'dice', label: `d${group.faces} →`, value: active.join(' · ') });
    }

    if (Number.isFinite(Number(context?.baseBonus))) {
      parts.push({ kind: 'bonus', label: category === 'attack' ? 'Attack Bonus' : 'Base', value: this._formatSigned(context.baseBonus) });
    }
    if (context?.trained === true && category === 'skill') {
      parts.push({ kind: 'trained', label: 'Trained', value: '' });
    }
    if (Number.isFinite(Number(context?.situationalMods)) && Number(context.situationalMods) !== 0) {
      parts.push({ kind: 'bonus', label: 'Situational', value: this._formatSigned(context.situationalMods) });
    }
    if (Number.isFinite(Number(context?.customModifier)) && Number(context.customModifier) !== 0) {
      parts.push({ kind: 'bonus', label: 'Modifier', value: this._formatSigned(context.customModifier) });
    }
    if (Number.isFinite(Number(context?.forcePointBonus)) && Number(context.forcePointBonus) > 0) {
      parts.push({ kind: 'bonus', label: 'Force Point', value: this._formatSigned(context.forcePointBonus) });
    }
    if (Number.isFinite(Number(context?.featSkillBonus)) && Number(context.featSkillBonus) !== 0) {
      parts.push({ kind: 'bonus', label: 'Feat Bonus', value: this._formatSigned(context.featSkillBonus) });
    }
    if (Array.isArray(context?.featSkillBonuses)) {
      for (const bonus of context.featSkillBonuses) {
        const value = Number(bonus?.value ?? bonus?.bonus ?? 0);
        if (!Number.isFinite(value) || value === 0) continue;
        parts.push({ kind: 'bonus', label: this._stripHtml(bonus?.sourceName ?? bonus?.name ?? 'Feat'), value: this._formatSigned(value) });
      }
    }

    const staticBonus = this._rollStaticBonus(roll, d20);
    if (!parts.some(part => part.kind === 'bonus') && Number.isFinite(staticBonus) && staticBonus !== 0) {
      parts.push({ kind: 'bonus', label: category === 'damage' ? 'Bonus' : 'Modifier', value: this._formatSigned(staticBonus) });
    }

    return parts;
  }

  static _rollStaticBonus(roll, d20 = null) {
    const total = Number(roll?.total);
    if (!Number.isFinite(total)) return 0;
    if (d20) return total - Number(d20.result || 0);

    let diceTotal = 0;
    for (const die of roll?.dice ?? []) {
      for (const result of die.results ?? []) {
        if (result.active === false) continue;
        diceTotal += Number(result.result || 0);
      }
    }
    return total - diceTotal;
  }

  static _buildOutcome({ roll, context = {}, category = 'roll', d20 = null } = {}) {
    const meta = [];
    const total = Number(roll?.total);
    const dcRaw = context?.dc ?? context?.targetDc ?? context?.targetDC ?? context?.defenseDc ?? null;
    const dc = Number(dcRaw);

    if (Number.isFinite(dc)) {
      const passed = context?.passed ?? context?.success ?? (Number.isFinite(total) ? total >= dc : null);
      meta.push({ key: category === 'attack' ? 'Target' : 'DC', value: String(dcRaw) });
      if (Number.isFinite(total)) meta.push({ key: 'Margin', value: this._formatSigned(total - dc) });
      if (category === 'force') {
        if (context?.forceResolvedTier) meta.push({ key: 'Tier', value: String(context.forceResolvedTier) });
        if (context?.forceResolvedEffect) meta.push({ key: 'Effect', value: this._stripHtml(context.forceResolvedEffect) });
      }
      return {
        state: passed ? 'success' : 'failure',
        label: context?.outcomeLabel ?? (passed ? (category === 'attack' ? 'Hit' : 'Success') : (category === 'attack' ? 'Miss' : 'Failure')),
        meta
      };
    }

    if (d20?.isNat20 && category === 'attack') {
      return { state: 'crit', label: 'Critical Hit', meta };
    }
    if (d20?.isNat1 && (category === 'attack' || category === 'skill' || category === 'ability')) {
      return { state: 'failure', label: category === 'attack' ? 'Miss' : 'Complication', meta };
    }
    if (context?.outcomeLabel) {
      return { state: context?.success === false ? 'failure' : context?.success === true ? 'success' : 'success', label: context.outcomeLabel, meta };
    }
    return null;
  }
}


/* ============================================================
   PHASE 3: CHAT STATE CONTEXT HELPERS
============================================================ */

function swseDeriveChatStateContext(payload = {}) {
  const type = String(payload.type ?? payload.rollType ?? payload.eventType ?? "roll").toLowerCase();
  const tags = Array.isArray(payload.tags) ? payload.tags : [];
  const result = String(payload.result ?? payload.outcome ?? "").toLowerCase();
  const total = Number(payload.total ?? payload.rollTotal ?? 0);

  let state = "default";
  let statusLabel = "Roll Result";
  let statusSubLabel = "";

  if (payload.awaitingReaction || payload.pendingReaction || tags.includes("reaction-window")) {
    state = "pending";
    statusLabel = "Reaction Window";
    statusSubLabel = "Awaiting response";
  } else if (result.includes("success") || payload.success === true) {
    state = "success";
    statusLabel = type === "reaction" ? "Reaction Succeeded" : "Success";
  } else if (result.includes("fail") || payload.success === false) {
    state = "failure";
    statusLabel = type === "reaction" ? "Reaction Failed" : "Failure";
  } else if (payload.finalized || payload.isFinal) {
    state = "final";
    statusLabel = "Final Result";
  } else if (type === "attack") {
    statusLabel = "Attack Result";
  } else if (type === "damage") {
    statusLabel = "Damage Result";
  } else if (type === "skill") {
    statusLabel = "Skill Check";
  } else if (type === "initiative") {
    statusLabel = "Initiative";
  } else if (type === "reaction") {
    statusLabel = "Reaction";
  }

  if (!statusSubLabel) {
    if (type === "attack" && Number.isFinite(total)) {
      statusSubLabel = `Attack ${total >= 0 ? "+" : ""}${total}`;
    } else if (type === "damage" && Number.isFinite(total)) {
      statusSubLabel = `Damage ${total}`;
    } else if (type === "skill" && Number.isFinite(total)) {
      statusSubLabel = `Check ${total >= 0 ? "+" : ""}${total}`;
    }
  }

  return buildChatStateContext({
    state,
    statusLabel,
    statusSubLabel,
    showStatusRail: true,
    showHeaderDivider: true,
    showBadge: true
  });
}

/* ============================================================
   PHASE 4: PROVISIONAL VS FINAL ATTACK/DAMAGE STATE HELPERS
============================================================ */

function swseDeriveResolutionState(payload = {}) {
  const type = String(payload.type ?? payload.rollType ?? payload.eventType ?? "").toLowerCase();
  const tags = Array.isArray(payload.tags) ? payload.tags : [];
  const hasReactionWindow =
    payload.awaitingReaction === true ||
    payload.pendingReaction === true ||
    tags.includes("reaction-window") ||
    tags.includes("awaiting-reaction");

  const isAttackLike = type === "attack" || tags.includes("attack");
  const isDamageLike = type === "damage" || tags.includes("damage");

  const resolutionState = hasReactionWindow
    ? "provisional"
    : (payload.finalized || payload.isFinal || payload.resolved === true)
    ? "final"
    : "standard";

  const resolutionLabel =
    resolutionState === "provisional" ? "Provisional Result" :
    resolutionState === "final" ? "Final Result" :
    isDamageLike ? "Damage Applied" :
    isAttackLike ? "Attack Resolved" :
    "Resolved";

  const reactionLabel =
    hasReactionWindow ? (payload.reactionLabel ?? "Reaction Window Open") : "";

  return {
    resolutionState,
    resolutionLabel,
    reactionLabel,
    showReactionStrip: hasReactionWindow,
    showFinalBadge: resolutionState === "final",
    showProvisionalBadge: resolutionState === "provisional"
  };
}

function swseDeriveChatCardContext(payload = {}) {
  const type = String(payload.type ?? payload.rollType ?? payload.eventType ?? "roll").toLowerCase();

  const family =
    type === "attack" || type === "damage" ? "attack" :
    type === "reaction" ? "reaction" :
    "check";

  const primaryValue =
    payload.total ??
    payload.rollTotal ??
    payload.resultTotal ??
    payload.attackTotal ??
    payload.damageTotal ??
    "";

  const primaryLabel =
    type === "attack" ? "Attack Total" :
    type === "damage" ? "Damage Total" :
    type === "initiative" ? "Initiative" :
    type === "reaction" ? "Reaction Result" :
    "Check Total";

  return {
    family,
    primaryValue,
    primaryLabel
  };
}

/* ============================================================
   PHASE 5/6/7: CHAT REACTION NORMALIZATION + FIRST-WAVE HELPERS
============================================================ */

function swseNormalizeReactionEntry(entry = {}, payload = {}) {
  const key = String(entry.key ?? entry.id ?? entry.reactionKey ?? "").trim();
  const label =
    entry.label ??
    entry.name ??
    (key ? key.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Reaction");

  const available = entry.available ?? entry.isAvailable ?? entry.allowed ?? true;
  const owner =
    entry.owner ??
    entry.ownerId ??
    entry.actorId ??
    payload.defenderId ??
    payload.targetId ??
    null;

  const reasonBlocked =
    entry.reasonBlocked ??
    entry.blockedReason ??
    entry.reason ??
    "";

  const state =
    entry.state ??
    (available ? "available" : "blocked");

  const cssClass =
    entry.cssClass ??
    (available ? "swse-chat-reaction-pill--available" : "swse-chat-reaction-pill--blocked");

  const icon =
    entry.icon ??
    (
      key === "block" ? "🛡" :
      key === "deflect" ? "↗" :
      key === "redirect-shot" ? "➶" :
      key === "force-point" ? "✦" :
      key === "destiny-point" ? "⬢" :
      "↩"
    );

  return {
    key,
    label,
    icon,
    available,
    owner,
    reasonBlocked,
    state,
    cssClass
  };
}

function swseDeriveChatReactions(payload = {}) {
  const raw =
    payload.chatReactions ??
    payload.reactions ??
    payload.availableReactions ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map(entry => swseNormalizeReactionEntry(entry, payload))
    .filter(entry => entry.key);
}

/* ============================================================
   PHASE 8/9/10: ATTACK EVENT BINDING + CARD UPDATE HELPERS
============================================================ */

function swseEnsureEventId(payload = {}) {
  return (
    payload.eventId ??
    payload.attackEventId ??
    payload.messageId ??
    payload.uuid ??
    globalThis.foundry?.utils?.randomID?.() ??
    `swse-event-${Date.now()}`
  );
}

function swseBuildAttackEventContext(payload = {}) {
  const eventId = swseEnsureEventId(payload);
  const type = String(payload.type ?? payload.rollType ?? payload.eventType ?? "roll").toLowerCase();

  const attackerId =
    payload.attackerId ??
    payload.actorId ??
    payload.actor?.id ??
    payload.speaker?.actor ??
    "";

  const defenderId =
    payload.defenderId ??
    payload.targetId ??
    payload.defender?.id ??
    "";

  const itemId =
    payload.itemId ??
    payload.weaponId ??
    payload.sourceItemId ??
    "";

  const eventState =
    payload.eventState ??
    payload.resolutionState ??
    (payload.awaitingReaction || payload.pendingReaction ? "pending" :
     payload.finalized || payload.isFinal ? "final" :
     "standard");

  return {
    eventId,
    eventType: type,
    attackerId,
    defenderId,
    itemId,
    eventState,
    eventVersion: Number(payload.eventVersion ?? 1)
  };
}

/* ============================================================
   PHASE 11: CHAT HARDENING FALLBACKS
============================================================ */

function swseNormalizeRendererPayload(payload = {}) {
  const normalized = { ...(payload ?? {}) };

  normalized.type = normalized.type ?? normalized.rollType ?? normalized.eventType ?? "roll";
  normalized.tags = Array.isArray(normalized.tags) ? normalized.tags : [];
  normalized.reactions = Array.isArray(normalized.reactions)
    ? normalized.reactions
    : Array.isArray(normalized.chatReactions)
    ? normalized.chatReactions
    : [];

  normalized.total =
    normalized.total ??
    normalized.rollTotal ??
    normalized.resultTotal ??
    normalized.attackTotal ??
    normalized.damageTotal ??
    0;

  normalized.statusLabel =
    normalized.statusLabel ??
    normalized.title ??
    normalized.label ??
    "Roll Result";

  normalized.statusSubLabel =
    normalized.statusSubLabel ??
    normalized.subtitle ??
    "";

  return normalized;
}
