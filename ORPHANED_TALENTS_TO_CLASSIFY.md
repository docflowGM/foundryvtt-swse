# 64 Orphaned Talents Requiring Classification

These talents exist in the system but are not assigned to any talent tree. They have `system.talent_tree` set in the raw data, but those trees don't exist in the compendium (mapped as "unknown" tree).

**Action Required:** Assign each talent to the correct talent tree ID, or delete if duplicate/obsolete.

---

## Alphabetical List (64 talents)

1. Battle Analysis
2. Better Lucky than Dead
3. Burning Assault
4. Combined Fire (Naval)
5. Commanding Officer
6. Commanding Presence
7. Comrades in Arms
8. Coordinated Tactics
9. Cortosis Gauntlet Block
10. Cover Fire
11. Cramped Quarters Fighting
12. Crushing Assault
13. Dampen Presence
14. Dark Retaliation
15. Demolitionist
16. Devastating Attack
17. Dirty Fighting
18. Disarming Attack
19. Draw Fire
20. Entreat Aid
21. Escort
22. Exposing Strike
23. Feared Warrior
24. Fire at Will
25. Focused Targeting
26. Focused Warrior
27. Force of Will
28. Forceful Warrior
29. Gradual Resistance
30. Guiding Strikes
31. Hard Target
32. Harm's Way
33. Immovable
34. Impaling Assault
35. Improved Consular's Vitality
36. Improved Suppression Fire
37. Improved Trajectory
38. Indomitable
39. Jet Pack Training
40. Jet Pack Withdraw
41. Keep Them at Bay
42. Master of the Great Hunt
43. Mobile Combatant
44. Penetrating Attack
45. Phalanx
46. Reap Retribution
47. Recall
48. Renew Vision
49. Resilience
50. Sentinel Strike
51. Sentinel's Gambit
52. Sentinel's Observation
53. Shoto Pin Block
54. Skilled Advisor
55. Squad Actions
56. Stay in the Fight (Recruit)
57. Steel Resolve
58. Stick Together
59. Stinging Assault
60. Tough as Nails
61. Visionary Attack
62. Visionary Defense
63. Watch Your Back
64. WatchCircle Initiate

---

## Analysis by Keyword

### Combat/Attack Talents (likely belong to combat trees)
- Battle Analysis
- Burning Assault
- Crushing Assault
- Devastating Attack
- Dirty Fighting
- Disarming Attack
- Exposing Strike
- Focused Warrior
- Guiding Strikes
- Hard Target
- Impaling Assault
- Penetrating Attack
- Reap Retribution
- Sentinel Strike
- Stinging Assault
- Visionary Attack

### Defense/Protection Talents (likely belong to defense/protection trees)
- Commanding Presence
- Cordosis Gauntlet Block
- Cramped Quarters Fighting
- Gradual Resistance
- Immovable
- Indomitable
- Shoto Pin Block
- Steel Resolve
- Tough as Nails
- Visionary Defense
- Watch Your Back

### Force-Related Talents
- Dampen Presence
- Dark Retaliation
- Force of Will
- Renew Vision
- Sentinel's Observation

### Leadership/Morale Talents
- Commanding Officer
- Comrades in Arms
- Coordinated Tactics
- Entreat Aid
- Escort
- Feared Warrior
- Forceful Warrior
- Keep Them at Bay
- Master of the Great Hunt
- Skilled Advisor
- Squad Actions

### Survival/Utility Talents
- Better Lucky than Dead
- Cover Fire
- Draw Fire
- Fire at Will
- Focused Targeting
- Harm's Way
- Jet Pack Training
- Jet Pack Withdraw
- Mobile Combatant
- Recall
- Resilience
- Stay in the Fight (Recruit)
- Stick Together

### Special/Unclear Talents
- Combined Fire (Naval) - Likely Naval Officer or Squadron Leader tree
- Demolitionist - Likely Sabotage or Military Engineer tree
- Improved Consular's Vitality - Likely Jedi Consular tree
- Improved Suppression Fire - Likely commando or ranged tree
- Improved Trajectory - Likely ranged weapon tree
- Phalanx - Likely protection or military tactics tree
- Sentinel's Gambit - Likely Jedi Sentinel or stealth tree
- WatchCircle Initiate - Unknown, possibly faction-specific

---

## Suggested Actions

### Option A: Classify into Existing Trees
1. Audit each talent's description
2. Assign to semantically matching tree (use tree names from `talent-trees.registry.json`)
3. Update `talents.db` with correct `system.talent_tree` value
4. Regenerate talent-trees.registry.json

### Option B: Create New Trees (if needed)
If talents don't fit existing trees:
1. Create new talent trees in compendium
2. Assign talents to new trees
3. Map to appropriate classes

### Option C: Delete Duplicates
If these are duplicates of existing talents:
1. Identify source talent
2. Delete orphaned duplicate
3. Verify no missing references

---

## Next Steps

1. **Investigate Raw Data**: Check `talents.db` to see what `system.talent_tree` value each orphan has
2. **Cross-reference**: Match against `talent_trees.db` to find discrepancies
3. **Classify or Delete**: Either move each to correct tree or remove if redundant
4. **Regenerate**: Run talent tree indexing to verify all talents are accounted for

**Estimated Effort:** 30-60 minutes for classification, depending on tree structure complexity
