# Phase 11-2B — runtime consumers of the removed / renamed Reconsider tags

Method: (1) executable-equivalence probes on the real runtime functions across all 1,187 talents (identical for the droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting and lightsaber-form lookup); (2) a literal scan of every tag-reading script for the removed or renamed strings, triaged by hand.

**No executable rules consumer depends on a removed or renamed tag.** All literal dependents are suggestion scoring / explanation / mentor code, or read tags of other item types:

| Removed tag | Dependents (all non-executable) | Effect |
|---|---|---|
| `force_execution` | `ForceOptionSuggestionEngine:407`, `SuggestionReasonEngine:275,510`, `SuggestionScorer:346`, `tag-signal-engine:277` | the tag no longer boosts/explains Force-execution suggestions for talents; the sibling tags `use_the_force`, `force_power_check` still do |
| `leader`, `duelist`, `sniping`, `skill_stealth` | `SuggestionReasonEngine:182,272,281,496,502,503,536`, `SuggestionScorer:831` | explanation/route heuristics lose the legacy label; `leadership`, `lightsaber`, `rifle`, `melee` etc. remain as alternatives (`sniping`→`sniper`, `skill_stealth`→`stealth` are renamed, so their readers need the new spelling in the suggestion-integration phase) |
| `controller`, `scout`, `scoundrel`, `soldier`, `utility` | `force-power-role-metadata:328,335` (force powers), `gear-suggestions` / `asset-suggestions` (equipment `primaryRole`, not talent tags) | none for talents |
| `combat` | `SuggestionScorer:359` (one of several alternatives) | negligible |
| hyphen spellings (`light-side`, `dark-side`, …) | `force-power-step` already accepts both spellings | none |

Prerequisite tree credit: 101 talents change credit — 69 polluting credits (tags spelled like a tree, e.g. `mystic`, `duelist`, `opportunist`, `light-side`) disappear, and 45 credits that mirrored real multi-tree membership disappear (the compatibility decision recorded in the Phase 3H audit: stop reading tags in `getCanonicalTalentTreeIds` and read tree membership instead). Not restored, per the owner's rule.

Tests that asserted a rejected legacy tag and were updated: `elite-droid-talent-tree-hydration` (`elite-droid`), `krath-talent-tree-hydration` (`krath`), `superior-skills-talent-hydration` (`superior-skills`). (The two tree hydration tests were already adjusted in Phase 11-2A for `tree_<id>`.)
