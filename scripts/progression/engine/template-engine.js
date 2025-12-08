import { PROGRESSION_RULES } from "../data/progression-data.js";
import { ForcePowerEngine } from "../engine/force-power-engine.js";

/**
 * TemplateEngine.applyTemplate(actor, templateId, options)
 *
 * Behavior:
 *  - If template.class exists and PROGRESSION_RULES.classes contains it -> treat as class-level build.
 *  - Else treat template as a 'package' (feats/talents/items/flags) and apply those to progression, without creating classLevels.
 *  - Always write canonical object under system.progression.
 *  - Record applied template packages under flags.swse.appliedTemplatePackages for audit.
 */
export class TemplateEngine {
  static async applyTemplate(actor, templateId, options = {}) {
    const templates = PROGRESSION_RULES.templates || {};
    const tpl = templates[templateId];
    if (!tpl) throw new Error(`Unknown template: ${templateId}`);

    // Base canonical progression object
    const base = {
      species: tpl.species ?? actor.system?.progression?.species ?? null,
      background: tpl.background ?? actor.system?.progression?.background ?? null,
      abilities: tpl.abilities ?? actor.system?.progression?.abilities ?? {},
      classLevels: [],
      feats: Array.isArray(tpl.feats) ? tpl.feats.slice() : [],
      talents: Array.isArray(tpl.talents) ? tpl.talents.slice() : [],
      skills: Array.isArray(tpl.skills) ? tpl.skills.slice() : []
    };

    // Decide how to apply "tpl.class" if present
    const classId = tpl.class ?? null;
    if (classId) {
      const classes = PROGRESSION_RULES.classes || {};
      if (classes[classId]) {
        // core class exists: apply as classLevels (level = tpl.level || 1)
        base.classLevels.push({ class: classId, level: tpl.level || 1, choices: tpl.choices || {} });
      } else {
        // classId not in core rules -> treat as a package / prestige
        // Strategy: do not create a class level. Instead:
        //  - merge any tpl.providedClassFeatures into feats/talents/items
        //  - record package name for audit so level-up or GM can convert later
        base.feats = Array.from(new Set([...(base.feats||[]), ...(tpl.feats||[]), ...(tpl.providedFeats||[] || [])]));
        base.talents = Array.from(new Set([...(base.talents||[]), ...(tpl.talents||[]), ...(tpl.providedTalents||[] || [])]));
        // copy any explicit item grants
        base.items = (tpl.items || []).slice();
        // record as a template package rather than a class
        const pkgs = actor.getFlag("swse", "appliedTemplatePackages") || [];
        pkgs.push({ templateId, classRef: classId, appliedAt: (new Date()).toISOString() });
        await actor.setFlag("swse", "appliedTemplatePackages", pkgs);
      }
    }

    // If template includes explicit classLevels array, prefer that (over tpl.class)
    if (Array.isArray(tpl.classLevels) && tpl.classLevels.length) {
      base.classLevels = base.classLevels.concat(tpl.classLevels.map(c => ({...c})));
    }

    // If options.background override provided by caller, respect it
    if (options.background) base.background = options.background;

    // Persist canonical progression object
    await actor.update({ "system.progression": base });
    try {
      // If template grants force powers, open selector (template id known as templateId)
      if (typeof ForcePowerEngine !== 'undefined') {
        // caller may provide templateId in scope; attempt to use tpl.id or templateId variable
        const suggestId = typeof templateId !== 'undefined' ? templateId : (tpl?.id || null);
        if (suggestId) {
          await ForcePowerEngine.handleForcePowerTriggers(actor, { templateApplied: suggestId });
        }
      }
    } catch(e) { console.warn('ForcePowerEngine template trigger failed', e); }


    // Hook for additional system-specific behavior (optional)
    try {
      Hooks.callAll("swse.templateApplied", actor, templateId, tpl, options);
    } catch (e) {
      console.warn("TemplateEngine: hook swse.templateApplied threw:", e);
    }
  }
}
