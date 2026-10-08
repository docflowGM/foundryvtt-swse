// Phase 5D-I-B -- structured ACTIVATION REQUIREMENTS of the selected attack profile (pure).
// A profile exists in the registry; it only EXECUTES when the facts it requires hold. Each requirement is a structured object
// ({type, ...}); nothing here parses prose, reads a weapon name or matches a display name. Result per requirement:
//   true   the fact holds        false  the fact is known not to hold -> the attack is illegal (refused before any cost)
//   null   the fact is not observed -> the caller asks ONCE (stored); an unanswered fact is surfaced, never guessed
// Handled elsewhere (not repeated here): `target` / `target-rule` (5D-I-A resolveTargetRequirements), `configuration` (profile availability
// by configuration, 5D-B), `action` and `usage-limit` (owned-state step of FireStateStore.previewReadiness: costs / ledger).
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** Canonical ability slug of a certified feat identity key ('feat::...::p23::long-haft-strike' -> 'long-haft-strike'). */
export const slugOfIdentity = (key) => String(key ?? '').split('::').pop() || null;

/**
 * @param {Array} requirements  the selected profile's activationRequirements
 * @param {{hands?:1|2, aoo?:boolean, proficient?:boolean, abilityKeys?:string[], operators?:number, answers?:object}} ctx
 * @returns {{legal:boolean, evaluated:Array<{type:string, key:string, result:boolean|null, prompt?:string, question?:string, detail?:string}>}}
 */
export function evaluateProfileRequirements(requirements, ctx = {}) {
  const evaluated = [];
  const answers = ctx.answers ?? {};
  const add = (type, key, result, extra = {}) => evaluated.push({ type, key, result, ...extra });
  const asked = (prompt) => (typeof answers[prompt] === 'boolean' ? answers[prompt] : null);
  for (const r of asArray(requirements)) {
    switch (r?.type) {
      case 'feat': {
        const slug = slugOfIdentity(r.identityKey);
        // a feat requirement with no canonical identity cannot be decided (never matched by its printed name): surfaced as unresolved
        if (!slug) { add('feat', String(r.id ?? ''), null, { detail: 'feat-requirement-has-no-canonical-identity' }); break; }
        add('feat', slug, asArray(ctx.abilityKeys).includes(slug));
        break;
      }
      case 'proficiency':
        add('proficiency', String(r.condition ?? ''), r.condition === 'proficient-wielder' ? ctx.proficient === true : null, r.condition === 'proficient-wielder' ? {} : { detail: 'unsupported-proficiency-condition' });
        break;
      case 'wielding': {
        const want = r.condition === 'two-handed' ? 2 : r.condition === 'one-handed' ? 1 : null;
        if (want === null) { add('wielding', String(r.condition ?? ''), null, { detail: 'unsupported-wielding-condition' }); break; }
        const prompt = `requirement:wielding:${r.condition}`;
        const res = ctx.hands === undefined ? asked(prompt) : ctx.hands === want;
        add('wielding', String(r.condition), res, res === null ? { prompt, question: `Is the weapon wielded ${r.condition.replace('-', ' ')} for this attack?` } : {});
        break;
      }
      case 'choice':
        // an attack-of-opportunity choice is legal only for an attack of opportunity; any other choice is made BY selecting this profile
        if (r.trigger === 'attack-of-opportunity') add('choice', String(r.choice ?? ''), ctx.aoo === true);
        else add('choice', String(r.condition ?? r.choice ?? ''), true);
        break;
      case 'operators': {
        const need = Number.isFinite(Number(r.minimum)) ? Number(r.minimum) : 1;
        const prompt = 'requirement:operators';
        const res = Number.isFinite(Number(ctx.operators)) ? Number(ctx.operators) >= need : asked(prompt);
        add('operators', String(asArray(r.roles).join('+')), res, res === null ? { prompt, question: `Are the ${need} required operators (${asArray(r.roles).join(', ').replace(/-/g, ' ')}) in position?` } : {});
        break;
      }
      default: break; // target, target-rule, configuration, action, usage-limit: see the header
    }
  }
  return { legal: !evaluated.some((e) => e.result === false), evaluated };
}

/** True when the selected profile embodies the "forgo doubling the Strength bonus" choice (Long-Handle Lightsaber's 2d10 base). */
export const forgoesDoubleStrength = (requirements) => asArray(requirements).some((r) => r?.type === 'choice' && r.condition === 'forgo-double-strength-bonus-to-damage');
