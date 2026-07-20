import { LanguageStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/language-step.js';
import { FollowerLanguageStep } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/follower-steps/follower-language-step.js';
import { FollowerStepBase } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/follower-steps/follower-step-base.js';
import { LanguageRegistry } from '/systems/foundryvtt-swse/scripts/registries/language-registry.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.progressionChoiceLanguageHotfix.v1');
const LANGUAGE_PATCHED = Symbol.for('swse.progressionChoiceLanguageHotfix.languages.v1');
const FOLLOWER_LANGUAGE_PATCHED = Symbol.for('swse.progressionChoiceLanguageHotfix.followerLanguages.v1');
const FOLLOWER_BASE_PATCHED = Symbol.for('swse.progressionChoiceLanguageHotfix.followerBase.v1');
const SKILL_FOCUS_GUARD_FLAG = 'resolvedSkillFocusChoiceGuard';
const MASKED_SKILL_FOCUS_NAME = '__SWSE_RESOLVED_SKILL_FOCUS__';

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function hasResolvedChoice(item) {
  const choice = item?.system?.selectedChoice ?? item?.system?.selectedChoices;
  const hasChoice = Array.isArray(choice)
    ? choice.length > 0
    : (choice && typeof choice === 'object' ? Object.keys(choice).length > 0 : String(choice || '').trim().length > 0);
  return hasChoice && (item?.system?.choiceResolved === true || choice !== undefined);
}

function readChoiceCandidates(choice) {
  const entry = Array.isArray(choice) ? choice[0] : choice;
  if (!entry) return [];
  if (typeof entry === 'string') return [entry];
  return [
    entry.id,
    entry.value,
    entry.key,
    entry.slug,
    entry.skill,
    entry.skillKey,
    entry.skillId,
    entry.name,
    entry.label,
    entry.displayName,
  ].filter(Boolean);
}

function resolveActorSkill(actor, choice) {
  const candidateTokens = new Set(readChoiceCandidates(choice).map(normalizeToken).filter(Boolean));
  if (!candidateTokens.size) return null;

  for (const [key, skill] of Object.entries(actor?.system?.skills || {})) {
    const values = [
      key,
      skill?.key,
      skill?.id,
      skill?.slug,
      skill?.name,
      skill?.label,
      skill?.system?.key,
      skill?.system?.name,
    ];
    if (values.some(value => candidateTokens.has(normalizeToken(value)))) {
      return {
        key,
        name: String(skill?.name || skill?.label || readChoiceCandidates(choice).find(Boolean) || key),
      };
    }
  }
  return null;
}

function patchLanguageSelectionDeduplication() {
  const proto = LanguageStep?.prototype;
  if (!proto || proto[LANGUAGE_PATCHED]) return;

  const originalRestore = proto._restoreSelectedBonusLanguagesFromSession;
  proto._restoreSelectedBonusLanguagesFromSession = function patchedRestoreSelectedBonusLanguages(shell) {
    originalRestore?.call(this, shell);
    const granted = new Set((this._knownLanguageGrants || [])
      .map(grant => normalizeToken(grant?.name || grant))
      .filter(Boolean));
    this._selectedBonusLanguages = (this._selectedBonusLanguages || [])
      .filter(name => !granted.has(normalizeToken(name)));
  };

  proto._getAvailableLanguages = function patchedGetAvailableLanguages() {
    const knownSet = new Set((this._knownLanguageGrants || [])
      .map(grant => normalizeToken(grant?.name || grant))
      .filter(Boolean));
    const selectedSet = new Set((this._selectedBonusLanguages || []).map(normalizeToken));
    return (this._allLanguages || []).filter(language => {
      const token = normalizeToken(language?.name || language?.label || language?.id);
      return token && !knownSet.has(token) && !selectedSet.has(token);
    });
  };

  Object.defineProperty(proto, LANGUAGE_PATCHED, { value: true });
}

function patchFollowerLanguageRestoration() {
  const proto = FollowerLanguageStep?.prototype;
  if (!proto || proto[FOLLOWER_LANGUAGE_PATCHED]) return;

  const originalRestore = proto._restoreFollowerSelectedLanguages;
  proto._restoreFollowerSelectedLanguages = function patchedFollowerLanguageRestore(shell) {
    originalRestore?.call(this, shell);
    const granted = new Set((this._knownLanguageGrants || [])
      .map(grant => normalizeToken(grant?.name || grant))
      .filter(Boolean));
    this._selectedBonusLanguages = (this._selectedBonusLanguages || [])
      .filter(name => !granted.has(normalizeToken(name)));
  };

  Object.defineProperty(proto, FOLLOWER_LANGUAGE_PATCHED, { value: true });
}

function patchFollowerLanguageCatalogAccess() {
  const proto = FollowerStepBase?.prototype;
  if (!proto || proto[FOLLOWER_BASE_PATCHED]) return;

  proto.getAllLanguages = async function patchedGetAllFollowerLanguages() {
    try {
      await LanguageRegistry.ensureLoaded();
      const all = await LanguageRegistry.all();
      const names = all.map(language => language?.name || language?.label || language?.id).filter(Boolean);
      if (names.length) return this._uniqueStrings(names);
    } catch (error) {
      swseLogger.warn('[FollowerStepBase] Full language catalog unavailable; using core fallback.', error);
    }
    return [
      'Basic', 'Binary', 'Bocce', 'Bothese', 'Dosh', 'Durese', 'Ewokese', 'Gamorrean',
      'Gunganese', 'High Galactic', 'Huttese', 'Ithorese', 'Jawa Trade Language',
      'Kel Dor', 'Mon Calamarian', 'Quarrenese', 'Rodese', 'Shyriiwook', 'Sith',
      'Sullustese', 'Togruti', "Twi'leki", 'Ubese', 'Zabrak',
    ];
  };

  Object.defineProperty(proto, FOLLOWER_BASE_PATCHED, { value: true });
}

function registerResolvedSkillFocusGuard() {
  Hooks.on('preCreateItem', (item, data, options, userId) => {
    if (game?.user?.id !== userId) return;
    if (item?.type !== 'feat') return;
    const originalName = String(item?.name || data?.name || '');
    if (!originalName.toLowerCase().includes('skill focus')) return;
    if (!hasResolvedChoice(item)) return;

    const guard = {
      originalName,
      choice: item.system?.selectedChoice ?? item.system?.selectedChoices,
      description: item.system?.description || '',
    };

    try {
      item.updateSource({
        name: MASKED_SKILL_FOCUS_NAME,
        [`flags.swse.${SKILL_FOCUS_GUARD_FLAG}`]: guard,
      });
    } catch (_error) {
      data.name = MASKED_SKILL_FOCUS_NAME;
      data.flags ??= {};
      data.flags.swse ??= {};
      data.flags.swse[SKILL_FOCUS_GUARD_FLAG] = guard;
    }
  });

  Hooks.on('createItem', (item, options, userId) => {
    if (game?.user?.id !== userId) return;
    const guard = item?.flags?.swse?.[SKILL_FOCUS_GUARD_FLAG];
    if (!guard || item?.type !== 'feat') return;

    globalThis.setTimeout?.(async () => {
      const actor = item.parent;
      if (!actor) return;

      const selected = resolveActorSkill(actor, guard.choice);
      const updates = {
        _id: item.id,
        name: guard.originalName || 'Skill Focus',
      };

      if (selected) {
        const marker = `<strong>Focused Skill:</strong> ${selected.name}`;
        const description = String(guard.description || item.system?.description || '');
        updates['system.description'] = description.includes('<strong>Focused Skill:</strong>')
          ? description
          : `${description}${description ? '\n\n' : ''}${marker}`;
      }

      try {
        if (selected) {
          await ActorEngine.updateActor(actor, {
            [`system.skills.${selected.key}.focused`]: true,
          }, {
            meta: { guardKey: 'resolved-skill-focus-choice' },
          });
        }

        await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [updates], {
          meta: { guardKey: 'resolved-skill-focus-choice' },
        });
        swseLogger.debug('[Skill Focus] Reused progression-selected skill without opening the legacy dialog.', {
          actor: actor.name,
          feat: updates.name,
          skill: selected?.name || null,
        });
      } catch (error) {
        swseLogger.error('[Skill Focus] Failed to materialize progression-selected skill choice.', error);
      }
    }, 0);
  });
}

export function registerProgressionChoiceLanguageHotfix() {
  if (globalThis[REGISTERED]) return;
  globalThis[REGISTERED] = true;

  patchLanguageSelectionDeduplication();
  patchFollowerLanguageRestoration();
  patchFollowerLanguageCatalogAccess();
  registerResolvedSkillFocusGuard();
}
