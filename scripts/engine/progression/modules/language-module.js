/**
 * SWSE Language Progression Module
 * Option A: Classic SWSE rules integrated with the Progression Engine.
 * PHASE 10: All mutations route through ActorEngine with recursive guards.
 */
export class SWSELanguageModule {
  static NAME = 'swse-language-module';
  static init() {
    if (this._initialized) {return;}
    this._initialized = true;
    console.log('SWSE | Language Module initializing…');

    // Listen for progression completion events
    Hooks.on('swse:progression:completed', async (payload) => {
      try {
        const { actor, mode, level } = payload || {};
        if (!actor) {return;}

        if (mode === 'chargen') {
          await SWSELanguageModule.handleChargen(payload);
        } else if (mode === 'levelup') {
          await SWSELanguageModule.handleLevelUp(payload);
        }
      } catch (e) {
        console.warn('SWSE | Language Module progression handler error:', e);
      }
    });

    // Listen for actor updates to handle feat/skill changes
    // PHASE 10: Pass options parameter to access metadata for guard keys
    Hooks.on('updateActor', async (actor, diff, options) => {
      try { await SWSELanguageModule.onActorUpdate(actor, diff, options); } catch (e) { /* swallow */ }
    });

    console.log('SWSE | Language Module initialized');
  }
  static async handleChargen(payload) {
    const actor = payload?.actor ?? payload;
    if (!actor || !actor.isOwner) {return;}
    const speciesLangs = SWSELanguageModule._getSpeciesLanguages(actor);
    const intMod = SWSELanguageModule._getIntMod(actor);
    const bonusCount = Math.max(0, intMod);
    const bonusSlots = Array.from({ length: bonusCount }).map(() => SWSELanguageModule.CHOICE_TOKEN);
    const starting = SWSELanguageModule._normalizeLanguages(speciesLangs);
    const merged = SWSELanguageModule._dedupe([...starting, ...bonusSlots]);
    // PHASE 10: Route through ActorEngine with guard key to prevent infinite loops
    if (globalThis.SWSE?.ActorEngine?.updateActor) {
      await globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.languages': merged }, {
        meta: { guardKey: 'language-chargen' }
      }).catch(e => {
        console.warn('SWSE | Language module: failed to write languages at chargen', e);
      });
    } else {
      throw new Error('ActorEngine.updateActor is required for language synchronization at chargen');
    }
  }
  static async handleLevelUp(payload) {
    // Note: Languages on level-up are granted through AttributeIncreaseHandler
    // when Intelligence modifier increases (levels 4, 8, 12, 16, 20 typically).
    // This method is kept for future extensions or to sync language state.
    const actor = payload?.actor ?? payload;
    if (!actor) {return;}

    // Ensure actor's language list is properly formatted and deduplicated
    const langs = SWSELanguageModule._normalizeLanguages(actor.system.languages || []);
    const deduped = SWSELanguageModule._dedupe(langs);

    // Only update if there are differences
    if (JSON.stringify(langs) !== JSON.stringify(deduped)) {
      // PHASE 10: Route through ActorEngine with guard key to prevent infinite loops
      if (globalThis.SWSE?.ActorEngine?.updateActor) {
        await globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.languages': deduped }, {
          meta: { guardKey: 'language-levelup' }
        }).catch(e => {
          console.warn('SWSE | Language module: failed to sync languages on level-up.', e);
        });
      } else {
        throw new Error('ActorEngine.updateActor is required for language synchronization on level-up');
      }
    }
  }
  static async onActorUpdate(actor, diff, options) {
    if (!actor || !actor.isOwner) {return;}
    // PHASE 10: Guard against re-entrant language sync
    if (options?.meta?.guardKey === 'language-sync') {return;}
    if (!diff || (!diff.items && !diff.system && !diff.system?.abilities)) {return;}
    let current = SWSELanguageModule._normalizeLanguages(actor.system.languages || []);
    const hasLinguist = actor.items?.some(i => (i.type || i.system?.type) && (i.name === 'Linguist' || i.slug === 'linguist'));
    if (hasLinguist) {
      const existingFeatPlaceholders = current.filter(l => l === SWSELanguageModule.LINGUIST_TOKEN).length;
      for (let i = existingFeatPlaceholders; i < 3; i++) {current.push(SWSELanguageModule.LINGUIST_TOKEN);}
    } else {
      current = current.filter(l => l !== SWSELanguageModule.LINGUIST_TOKEN);
    }
    const speak = actor.items?.find(it => it.name === 'Speak Language' || it.slug === 'speak-language' || it.type === 'skill' && (it.name || '').toLowerCase().includes('speak'));
    if (speak) {
      const ranks = Number(foundry.utils.getProperty(speak, 'system.rank') || 0);
      const existingSkillPlaceholders = current.filter(l => l === SWSELanguageModule.SPEAK_TOKEN).length;
      for (let i = existingSkillPlaceholders; i < ranks; i++) {current.push(SWSELanguageModule.SPEAK_TOKEN);}
    } else {
      current = current.filter(l => l !== SWSELanguageModule.SPEAK_TOKEN);
    }
    const speciesBase = SWSELanguageModule._normalizeLanguages(SWSELanguageModule._getSpeciesLanguages(actor));
    current = [...speciesBase, ...current.filter(x => !speciesBase.includes(x))];
    current = SWSELanguageModule._dedupe(current);
    // PHASE 10: Route through ActorEngine with guard key to prevent infinite loops
    if (globalThis.SWSE?.ActorEngine?.updateActor) {
      await globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.languages': current }, {
        meta: { guardKey: 'language-sync' }
      }).catch(e => {
        console.warn('SWSE | Language module: failed to update actor languages on actor update', e);
      });
    } else {
      throw new Error('ActorEngine.updateActor is required for language synchronization on actor update');
    }
  }
  static CHOICE_TOKEN = 'CHOOSE_LANGUAGE';
  static LINGUIST_TOKEN = 'FEAT_LINGUIST';
  static SPEAK_TOKEN = 'SKILL_SPEAK_LANGUAGE';
  static _getSpeciesLanguages(actor) {
    const species = actor.system?.species ?? actor.system?.details?.species ?? undefined;
    if (!species) {return [];}
    if (Array.isArray(species.languages)) {return species.languages;}
    return actor.system?.languages ?? [];
  }
  static _getIntMod(actor) {
    const int = foundry.utils.getProperty(actor, 'system.attributes.int') || {};
    const mod = Number(int?.mod ?? int?.value ?? 0);
    if (Math.abs(mod) > 10) {return Math.floor((mod - 10) / 2);}
    return Math.floor(mod);
  }
  static _normalizeLanguages(list) {
    if (!Array.isArray(list)) {return [];}
    return list.map(l => (typeof l === 'string' ? l.trim() : (l?.name ?? String(l))).trim()).filter(Boolean);
  }
  static _dedupe(list) {
    const seen = new Set();
    const out = [];
    for (const l of list) {
      if (!seen.has(l)) {
        seen.add(l);
        out.push(l);
      }
    }
    return out;
  }
}
