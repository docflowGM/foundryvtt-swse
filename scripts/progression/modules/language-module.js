/**
 * SWSE Language Progression Module
 * Option A: Classic SWSE rules integrated with the Progression Engine.
 *
 * (module contents omitted here for brevity - the assistant will write full content)
 */
export class SWSELanguageModule {
  static NAME = "swse-language-module";
  static init(progressEngine) {
    if (this._initialized) return;
    this._initialized = true;
    this.engine = progressEngine;
    console.log("SWSE | Language Module initializing…");
    if (progressEngine && typeof progressEngine.on === "function") {
      progressEngine.on("chargen", async (payload) => {
        try { await SWSELanguageModule.handleChargen(payload); } catch (e) { console.warn(e); }
      });
      progressEngine.on("level-up", async (payload) => {
        try { await SWSELanguageModule.handleLevelUp(payload); } catch (e) { console.warn(e); }
      });
    } else {
      Hooks.on("swse:chargen", async (payload) => {
        try { await SWSELanguageModule.handleChargen(payload); } catch (e) { console.warn(e); }
      });
      Hooks.on("swse:levelup", async (payload) => {
        try { await SWSELanguageModule.handleLevelUp(payload); } catch (e) { console.warn(e); }
      });
    }
    Hooks.on("updateActor", async (actor, diff) => {
      try { await SWSELanguageModule.onActorUpdate(actor, diff); } catch (e) { /* swallow */ }
    });
    console.log("SWSE | Language Module initialized");
  }
  static async handleChargen(payload) {
    const actor = payload?.actor ?? payload;
    if (!actor || !actor.isOwner) return;
    const speciesLangs = SWSELanguageModule._getSpeciesLanguages(actor);
    const intMod = SWSELanguageModule._getIntMod(actor);
    const bonusCount = Math.max(0, intMod);
    const bonusSlots = Array.from({ length: bonusCount }).map(() => SWSELanguageModule.CHOICE_TOKEN);
    const starting = SWSELanguageModule._normalizeLanguages(speciesLangs);
    const merged = SWSELanguageModule._dedupe([...starting, ...bonusSlots]);
    await actor.update({ "system.languages": merged }).catch(e => {
      console.warn("SWSE | Language module: failed to write languages at chargen", e);
    });
  }
  static async handleLevelUp(payload) {
    const actor = payload?.actor ?? payload;
    const level = payload?.level ?? (payload?.actor?.system?.details?.level) ?? undefined;
    if (!actor) return;
    const intMod = SWSELanguageModule._getIntMod(actor);
    const actorLevel = typeof level === "number" ? level : actor.system?.details?.level ?? 0;
    if (actorLevel > 0 && actorLevel % 5 === 0 && intMod > 0) {
      const langs = SWSELanguageModule._normalizeLanguages(actor.system.languages || []);
      langs.push(SWSELanguageModule.CHOICE_TOKEN);
      const deduped = SWSELanguageModule._dedupe(langs);
      await actor.update({ "system.languages": deduped }).catch(e => {
        console.warn("SWSE | Language module: failed to apply level-up language.", e);
      });
    }
  }
  static async onActorUpdate(actor, diff) {
    if (!actor || !actor.isOwner) return;
    if (!diff || (!diff.items && !diff.system && !diff.system?.abilities)) return;
    let current = SWSELanguageModule._normalizeLanguages(actor.system.languages || []);
    const hasLinguist = actor.items?.some(i => (i.type || i.system?.type) && (i.name === "Linguist" || i.slug === "linguist"));
    if (hasLinguist) {
      const existingFeatPlaceholders = current.filter(l => l === SWSELanguageModule.LINGUIST_TOKEN).length;
      for (let i = existingFeatPlaceholders; i < 3; i++) current.push(SWSELanguageModule.LINGUIST_TOKEN);
    } else {
      current = current.filter(l => l !== SWSELanguageModule.LINGUIST_TOKEN);
    }
    const speak = actor.items?.find(it => it.name === "Speak Language" || it.slug === "speak-language" || it.type === "skill" && (it.name || "").toLowerCase().includes("speak"));
    if (speak) {
      const ranks = Number(foundry.utils.getProperty(speak, "system.rank") || 0);
      const existingSkillPlaceholders = current.filter(l => l === SWSELanguageModule.SPEAK_TOKEN).length;
      for (let i = existingSkillPlaceholders; i < ranks; i++) current.push(SWSELanguageModule.SPEAK_TOKEN);
    } else {
      current = current.filter(l => l !== SWSELanguageModule.SPEAK_TOKEN);
    }
    const speciesBase = SWSELanguageModule._normalizeLanguages(SWSELanguageModule._getSpeciesLanguages(actor));
    current = [...speciesBase, ...current.filter(x => !speciesBase.includes(x))];
    current = SWSELanguageModule._dedupe(current);
    await actor.update({ "system.languages": current }).catch(e => {
      console.warn("SWSE | Language module: failed to update actor languages on actor update", e);
    });
  }
  static CHOICE_TOKEN = "CHOOSE_LANGUAGE";
  static LINGUIST_TOKEN = "FEAT_LINGUIST";
  static SPEAK_TOKEN = "SKILL_SPEAK_LANGUAGE";
  static _getSpeciesLanguages(actor) {
    const species = actor.system?.species ?? actor.system?.details?.species ?? undefined;
    if (!species) return [];
    if (Array.isArray(species.languages)) return species.languages;
    return actor.system?.languages ?? [];
  }
  static _getIntMod(actor) {
    const int = foundry.utils.getProperty(actor, "system.abilities.int") || {};
    const mod = Number(int?.mod ?? int?.value ?? 0);
    if (Math.abs(mod) > 10) return Math.floor((mod - 10) / 2);
    return Math.floor(mod);
  }
  static _normalizeLanguages(list) {
    if (!Array.isArray(list)) return [];
    return list.map(l => (typeof l === "string" ? l.trim() : (l?.name ?? String(l))).trim()).filter(Boolean);
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
