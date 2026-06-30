# Clone Wars + Galaxy at War Feat Implementation Fit

Phase 7B groups Clone Wars Campaign Guide and Galaxy at War feats by implementation home so later automation can be added without polluting static sheet math.

## Main implementation homes

### Area attack options

Examples include Autofire, Burst, Splash, and grenade-area feats. These belong in attack option metadata and the combat/attack workflow, not in passive attack bonuses.

### Combat riders

Examples include charge, melee hit, prone, push, and condition-track rider feats. These need runtime trigger context and GM/player confirmation where the target state is not machine-obvious.

### Contextual defenses

Defense feats that apply against specific abilities, target types, or timing windows must remain contextual. They should be displayed as available reactions or defense context bonuses, not unconditional defense increases.

### Skill/healing/repair context

Treat Injury, Mechanics, Repair Droid, and skill rerolls belong in skill-use/action metadata. They should not become broad skill bonuses unless the source rule is truly passive.

### Vehicle and gunnery context

Vehicle/gunnery feats should wait for the vehicle/starship roll pipeline. Do not implement them through character static attack math unless the rule explicitly applies to personal-scale attacks.

### Force-adjacent resource context

Some feats mention Force powers, Force Points, Jedi, or the dark side without being Force feats. Their taxonomy should be based on prerequisites and mechanics, not the presence of the word Force.

Reviewed examples:

- `Destructive Force`: vehicle/context feat, not Force taxonomy.
- `Force of Personality`: ability/defense-context feat, not Force taxonomy.
- `Pall of the Dark Side`: dark-side/Use the Force context, general feat taxonomy.
- `Jedi Familiarity`: Force-adjacent temporary Force Point/resource hook, general feat taxonomy.

## Recommended implementation order

1. Convert obvious attack options into explicit combat workflow flags.
2. Add condition-track rider hooks that already have clear once-per-encounter metadata.
3. Add skill reroll and skill-use context hooks.
4. Defer vehicle/gunnery feats until the vehicle/starship roll flow can consume them.
5. Keep Force-adjacent resource feats contextual and source-reviewed.
