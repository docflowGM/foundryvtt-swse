# SWSE Canonical Talent Production Reference

> **Purpose:** Human-readable bridge from the source-certified Phase 2 talent audit to later production implementation work.
>
> **Authority rule:** The canonical rules material in this file comes from the Phase 2 certified datasets. Production observations are evidence only and do not override the certified canon.
>
> **Identity rule:** A talent is identified by `canonicalTreeKey + talent name`, never by talent name alone.
>
> **Workflow:** Append one certified sourcebook at a time. Do not silently rewrite previously certified book sections. If later audit work changes a conclusion, record the correction explicitly.
>
> **Important:** A Phase 2 record with no correct-tree repository mapping is **not automatically a CREATE instruction**. Phase 3 must first check aliases, wrong-tree records, and legitimate same-name identities.

## Book 1 — Saga Edition Core Rulebook

**Phase 2 source authority:** `data/audits/talent-phase-2-core-rulebook-content.json`  
**Phase 2 source SHA:** `da53cd949ddee89c3cee4542bfad8ec54319eb25`  
**Certified publication claims:** 198

### Jedi Consular

**Canonical tree key:** `Saga Edition Core Rulebook|Jedi Consular`

#### Adept Negotiator

- **Page:** 39
- **Prerequisites:** —
- **Quick summary:** Standard action Persuasion vs. Will to move an intelligent enemy -1 condition step; reaching the end prevents it from attacking you or your allies unless provoked.
- **Phase 2 repository evidence:** Mapped repository record: `7acc479dee2d3b10` (Adept Negotiator)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a standard action, you can weaken the resolve of one enemy with your words. The target must have an Intelligence of 3 or higher and must be able to see, hear, and understand you. Make a Persuasion check; if the result equals or exceeds the target's Will Defense, it moves -1 step along the condition track. The target gets a +5 bonus to its Will Defense if it is higher level than you. If the target reaches the end of the track, it does not fall unconscious; instead, it cannot attack you or your allies for the remainder of the encounter unless you or one of your allies attacks it or one of its allies first. This is a mind-affecting effect.

#### Force Persuasion

- **Page:** 40
- **Prerequisites:** Adept Negotiator.
- **Quick summary:** You can use your Use the Force modifier instead of your Persuasion check modifier when making a Persuasion check.
- **Phase 2 repository evidence:** Mapped repository record: `d1fd547124c1901c` (Force Persuasion)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can use your Use the Force modifier instead of your Persuasion check modifier when making a Persuasion check. You are considered Trained in the Persuasion skill. If you are entitled to a Persuasion check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations).

#### Master Negotiator

- **Page:** 40
- **Prerequisites:** Adept Negotiator.
- **Quick summary:** If you successfully use the Adept Negotiator Talent, your target moves an additional -1 step along the Condition Track.
- **Phase 2 repository evidence:** Mapped repository record: `9dc39670f94a6ef2` (Master Negotiator)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

If you successfully use the Adept Negotiator Talent, your target moves an additional -1 step along the Condition Track. This is a Mind-Affecting effect.

#### Skilled Advisor

- **Page:** 40
- **Prerequisites:** —
- **Quick summary:** You can spend a Full-Round Action advising an ally, thereby granting them a +5 bonus on their next Skill Check.
- **Phase 2 repository evidence:** Mapped repository record: `35cbdbe9c91ba1d0` (Skilled Advisor)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

You can spend a Full-Round Action advising an ally, thereby granting them a +5 bonus on their next Skill Check. If you spend a Force Point, the bonus increases to +10. The target must be able to (and willing) to hear and understand your voice. You cannot advise yourself. This is a Mind-Affecting effect.

### Jedi Guardian

**Canonical tree key:** `Saga Edition Core Rulebook|Jedi Guardian`

#### Acrobatic Recovery

- **Page:** 40
- **Prerequisites:** —
- **Quick summary:** If any effect causes you to fall Prone, you can make a DC 20 Acrobatics check to remain on your feet.
- **Phase 2 repository evidence:** Mapped repository record: `5d4a63123e5a5eb4` (Acrobatic Recovery)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

If any effect causes you to fall Prone, you can make a DC 20 Acrobatics check to remain on your feet.

#### Battle Meditation

- **Page:** 40
- **Prerequisites:** —
- **Quick summary:** As a Full-Round Action, you can spend a Force Point to give you and all allies within 6 squares of you a +1 insight bonus on attack rolls that lasts until the end of the encounter.
- **Phase 2 repository evidence:** Mapped repository record: `9461c7aa79dd07c6` (Battle Meditation)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Full-Round Action, you can spend a Force Point to give you and all allies within 6 squares of you a +1 insight bonus on attack rolls that lasts until the end of the encounter. This bonus does not extend to allies outside the range of the effect, even if they move within 6 squares of you later on. Allies who benefit from Battle Meditation must remain within 6 squares of you to retain the insight bonus, and they lose it if you are knocked unconscious or killed. This is a Mind-Affecting effect.

#### Elusive Target

- **Page:** 40
- **Prerequisites:** —
- **Quick summary:** When fighting an opponent or multiple opponents in melee, other opponents attempting to target you with ranged attacks take a -5 penalty.
- **Phase 2 repository evidence:** Mapped repository record: `a0ace6dcc1c67d48` (Elusive Target)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When fighting an opponent or multiple opponents in melee, other opponents attempting to target you with ranged attacks take a -5 penalty. This penalty is in addition to the normal -5 penalty for firing into melee, making the penalty to target you -10.

#### Force Intuition

- **Page:** 40
- **Prerequisites:** —
- **Quick summary:** You can use your Use the Force check modifier instead of your Initiative modifier when making Initiative checks.
- **Phase 2 repository evidence:** Mapped repository record: `00deb8b4cce303b6` (Force Intuition)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can use your Use the Force check modifier instead of your Initiative modifier when making Initiative checks. You are considered Trained in the Initiative skill. If you are entitled to an Initiative check reroll, you may reroll your Use the Force check instead, subject to the same circumstances and limitations. You may use this Talent to determine the Initiative of a Starship if you are the Pilot.

#### Resilience

- **Page:** 40
- **Prerequisites:** —
- **Quick summary:** Spend a Force Point as a swift action to move +2 steps up the condition track.
- **Phase 2 repository evidence:** Mapped repository record: `0dde210ea6d197ef` (Resilience)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can spend a Force Point as a swift action to move +2 steps along the condition track.

### Jedi Sentinel

**Canonical tree key:** `Saga Edition Core Rulebook|Jedi Sentinel`

#### Clear Mind

- **Page:** 40
- **Prerequisites:** —
- **Quick summary:** You may reroll any opposed Use the Force check made to oppose Sense Force checks. You must take the result of the reroll, even if it is worse.
- **Phase 2 repository evidence:** Mapped repository record: `8bd201bb22c8da3a` (Clear Mind)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may reroll any opposed Use the Force check made to oppose Sense Force checks. You must take the result of the reroll, even if it is worse.

#### Dark Side Sense

- **Page:** 40
- **Prerequisites:** —
- **Quick summary:** Jedi following the path of the Sentinel become exceptionally talented at rooting out evil.
- **Phase 2 repository evidence:** Mapped repository record: `e885f64758f5e2bd` (Dark Side Sense)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Jedi following the path of the Sentinel become exceptionally talented at rooting out evil. You may reroll any Use the Force check made to sense the presence and relative location of characters with a Dark Side Score of 1 or higher. You must take the result of the reroll, even if it is worse.

#### Dark Side Scourge

- **Page:** 40
- **Prerequisites:** Dark Side Sense.
- **Quick summary:** Against creatures with a Dark Side Score of 1 or higher, you deal extra damage on melee attacks equal to your Charisma bonus (minimum +1).
- **Phase 2 repository evidence:** Mapped repository record: `2e96f06be6b9def8` (Dark Side Scourge)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Against creatures with a Dark Side Score of 1 or higher, you deal extra damage on melee attacks equal to your Charisma bonus (minimum +1).

#### Force Haze

- **Page:** 41
- **Prerequisites:** —
- **Quick summary:** You can spend a Force Point as a Standard Action to create a "Haze" that hides you and your allies from the perception of others.
- **Phase 2 repository evidence:** Mapped repository record: `f098749cb8767a5f` (Force Haze)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can spend a Force Point as a Standard Action to create a "Haze" that hides you and your allies from the perception of others. You can hide a number of creatures in line of sight equal to your Class Level. Make a Use the Force check and compare the result to the Will Defense of any opponent that moves into line of sight of any creature hidden by your Force Haze. If your check result equals or exceeds the opponent's Will Defense, all hidden creatures are treated as if they had Total Concealment against the opponent. The Force Haze lasts for up to 1 minute but is dismissed instantly if anyone hidden by the Force Haze makes an attack.

#### Resist the Dark Side

- **Page:** 41
- **Prerequisites:** Dark Side Sense
- **Quick summary:** Gain +5 Force to all defenses against dark-side powers and powers from fully dark Force-users.
- **Phase 2 repository evidence:** Mapped repository record: `3331d4b2b88e446f` (Resist the Dark Side)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR

**Canonical rules text**

You gain a +5 Force bonus to all Defense scores against Force powers with the [dark side] descriptor and Force powers originating from any dark Force-user whose Dark Side Score equals their Wisdom score.

### Lightsaber Combat

**Canonical tree key:** `Saga Edition Core Rulebook|Lightsaber Combat`

#### Block

- **Page:** 41
- **Prerequisites:** —
- **Quick summary:** React with Use the Force to negate a melee attack; repeated Block/Deflect attempts take cumulative penalties.
- **Phase 2 repository evidence:** Mapped repository record: `9379daa94a228c04` (Block)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a reaction, you may negate a melee attack by making a successful Use the Force check. The DC equals the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force check for every time you have used Block or Deflect since the beginning of your last turn. You must have a lightsaber drawn and ignited, be aware of the attack, and not be flat-footed.

#### Deflect

- **Page:** 41
- **Prerequisites:** —
- **Quick summary:** React with Use the Force to negate a ranged attack; it has special limits for autofire, area attacks, and very large vehicle weapons.
- **Phase 2 repository evidence:** Mapped repository record: `72c644f7a09b1186` (Deflect)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a reaction, you may negate a ranged attack by making a successful Use the Force check. The DC equals the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force check for every time you have used Block or Deflect since the beginning of your last turn. You must have a lightsaber drawn and ignited, be aware of the attack, and not be flat-footed. Against an autofire attack, a successful check makes you take half damage if the attack hits and no damage if it misses. Deflect has no effect on other area attacks such as grenades, missiles, and flamethrowers, and cannot negate attacks from Colossal (frigate) or larger vehicles unless made with a point-defense weapon.

#### Lightsaber Defense

- **Page:** 41
- **Prerequisites:** —
- **Quick summary:** As a swift action, you can use your lightsaber to parry your opponents' attacks, gaining a +1 deflection bonus to your Reflex Defense until the start of your next turn.
- **Phase 2 repository evidence:** Mapped repository record: `e8bf1222fd6289e4` (Lightsaber Defense)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a swift action, you can use your lightsaber to parry your opponents' attacks, gaining a +1 deflection bonus to your Reflex Defense until the start of your next turn. You must have a lightsaber drawn and ignited to use this talent, and you don't gain the deflection bonus if you are flat-footed or otherwise unaware of the incoming attack.

You can take this talent multiple times; each time you take this talent, the deflection bonus increases by +1 (maximum +3).

#### Lightsaber Throw

- **Page:** 41
- **Prerequisites:** —
- **Quick summary:** You can hurl a lightsaber as a standard action, treating it as a thrown weapon.
- **Phase 2 repository evidence:** Mapped repository record: `e54ecc0ff06e61f3` (Lightsaber Throw)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can hurl a lightsaber as a standard action, treating it as a thrown weapon. You are considered proficient with the thrown lightsaber, and you apply the normal range penalties to the attack roll (see Table 8-5: Range Penalties). The thrown lightsaber deals normal weapon damage if it hits.

If your target is no more than 6 squares away, you can pull your lightsaber back to your hand as a swift action by making a DC 20 Use the Force check,

#### Redirect Shot

- **Page:** 41
- **Prerequisites:** Deflect, base attack bonus +5.
- **Quick summary:** This talent allows you to redirect a deflected blaster bolt along a specific trajectory so that it damages another creature or object in its path, Once per round when you successfully deflect a blaster bolt, you can make an...
- **Phase 2 repository evidence:** Mapped repository record: `941c1dfd00e697da` (Redirect Shot)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

This talent allows you to redirect a deflected blaster bolt along a specific trajectory so that it damages another creature or object in its path, Once per round when you successfully deflect a blaster bolt, you can make an immediate ranged attack against another target with which you have line of sight. Apply the normal range penalties to the attack roll (see Table 8-5: Range Penalties}, not counting the distance the bolt traveled to reach you. If the attack succeeds, it deals norma! weapon damage to the target.

Only single blaster bolts can be redirected in this manner. Barrages from autofire weapons and other types of projectiles can't be redirected.

#### Weapon Specialization (Lightsabers)

- **Page:** 41
- **Prerequisites:** Weapon Focus (lightsabers) feat (see page 89).
- **Quick summary:** You gain a +2 bonus on melee damage rolls with Lightsabers.
- **Phase 2 repository evidence:** Mapped repository record: `bcd9981b3c6a46dc` (Weapon Specialization (Lightsabers))
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You gain a +2 bonus on melee damage rolls with Lightsabers.

### Influence

**Canonical tree key:** `Saga Edition Core Rulebook|Influence`

#### Presence

- **Page:** 43
- **Prerequisites:** —
- **Quick summary:** Intimidate with Persuasion as a standard action instead of a full-round action.
- **Phase 2 repository evidence:** Mapped repository record: `ec8f2ba706cc2c05` (Presence)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can make a Persuasion check to intimidate a creature as a standard action instead of a full-round action.

#### Demand Surrender

- **Page:** 43
- **Prerequisites:** Presence
- **Quick summary:** Once per encounter, use Persuasion against a wounded target's Will Defense to force its surrender.
- **Phase 2 repository evidence:** Mapped repository record: `871638a983029bc4` (Demand Surrender)
- **Phase 2 discrepancy flags:** TREE_ERROR, CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

Once per encounter, you can make a Persuasion check as a standard action to demand surrender from an opponent reduced to one-half or less of its hit points. If your check equals or exceeds the target's Will Defense, it surrenders, drops held weapons, and takes no hostile actions. A higher-level target gains +5 Will Defense. If you or an ally attacks it, it can act normally again. You can use this talent against a particular target only once per encounter. This is a mind-affecting effect.

#### Improved Weaken Resolve

- **Page:** 43
- **Prerequisites:** Presence; Weaken Resolve
- **Quick summary:** Weaken Resolve no longer ends when the fleeing target is wounded.
- **Phase 2 repository evidence:** Mapped repository record: `f3ac8054a0c60760` (Improved Weaken Resolve)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As Weaken Resolve, except that the target does not stop fleeing from you if it is wounded.

#### Weaken Resolve

- **Page:** 43
- **Prerequisites:** Presence
- **Quick summary:** After exceeding a target's damage threshold, Persuasion vs. Will can force a lower-level target to flee.
- **Phase 2 repository evidence:** Mapped repository record: `28c306c37ccb9fcf` (Weaken Resolve)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED, CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

Once per round, when you deal damage equal to or greater than the target's damage threshold, make a Persuasion check as a free action. If the result equals or exceeds the target's Will Defense, the target flees from you at top speed for 1 minute. It cannot take standard, swift, or full-round actions while fleeing, but normally stops fleeing if wounded. As a free action or reaction, the target can spend a Force Point, if it has not already spent one earlier in the round, to negate the effect. The effect is automatically negated if the target's level is equal to or higher than your character level. This is a mind-affecting fear effect.

### Inspiration

**Canonical tree key:** `Saga Edition Core Rulebook|Inspiration`

#### Bolster Ally

- **Page:** 44
- **Prerequisites:** —
- **Quick summary:** As a Standard Action, you can bolster an ally within line of sight, moving them +1 step along the Condition Track, and giving them a number of Bonus Hit Points equal to their Character Level, if they're at one-half their maximum...
- **Phase 2 repository evidence:** Mapped repository record: `d6e7f7178e643717` (Bolster Ally)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Standard Action, you can bolster an ally within line of sight, moving them +1 step along the Condition Track, and giving them a number of Bonus Hit Points equal to their Character Level, if they're at one-half their maximum Hit Points or less. Damage is subtracted from the Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away.

You can't Bolster the same ally more than once in a single encounter, and you can't Bolster yourself.

#### Ignite Fervor

- **Page:** 43
- **Prerequisites:** Bolster Ally; Inspire Confidence
- **Quick summary:** After you hit, give one visible ally a one-attack damage bonus equal to that ally's character level.
- **Phase 2 repository evidence:** Mapped repository record: `0703de963a247170` (Ignite Fervor)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you hit an opponent with a melee or ranged attack, you can, as a free action, choose to give one ally within your line of sight a bonus to damage on the ally's next attack equal to the ally's character level. Once ignited, the ally need not remain within your line of sight; if the next attack misses, the bonus is lost. You cannot ignite fervor in yourself.

#### Inspire Confidence

- **Page:** 44
- **Prerequisites:** —
- **Quick summary:** As a Standard Action, you can inspire confidence in all allies in your line of sight, granting them a +1 morale bonus on attack rolls, and a +1 morale bonus on Skill Checks for the rest of the encounter, or until you're unconscious...
- **Phase 2 repository evidence:** Mapped repository record: `4d8882a28da30454` (Inspire Confidence)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Standard Action, you can inspire confidence in all allies in your line of sight, granting them a +1 morale bonus on attack rolls, and a +1 morale bonus on Skill Checks for the rest of the encounter, or until you're unconscious or dead. Once Inspired, your allies don't need to remain within line of sight of you. You can't Inspire Confidence in yourself.

#### Inspire Haste

- **Page:** 44
- **Prerequisites:** —
- **Quick summary:** As a Swift Action, you can encourage one of your allies within line of sight to make haste with a Skill Check.
- **Phase 2 repository evidence:** Mapped repository record: `c5f8d32dbc5afcc4` (Inspire Haste)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Swift Action, you can encourage one of your allies within line of sight to make haste with a Skill Check. On that ally's next turn, that ally can make a Skill Check that normally requires a Standard Action, as a Move Action instead.

#### Inspire Zeal

- **Page:** 44
- **Prerequisites:** Bolster Ally, Inspire Confidence, Ignite Fervor.
- **Quick summary:** Whenever an ally within line of sight of you makes an attack that moves an opponent down the Condition Track (such as dealing damage that equals of exceeds the target's Damage Threshold), that ally moves the target an additional -1...
- **Phase 2 repository evidence:** Mapped repository record: `40508f87f3a8f33f` (Inspire Zeal)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever an ally within line of sight of you makes an attack that moves an opponent down the Condition Track (such as dealing damage that equals of exceeds the target's Damage Threshold), that ally moves the target an additional -1 step down the Condition Track.

### Leadership

**Canonical tree key:** `Saga Edition Core Rulebook|Leadership`

#### Born Leader

- **Page:** 44
- **Prerequisites:** —
- **Quick summary:** Once per encounter, as a Swift Action, you grant all allies within your line of sight a +1 insight bonus on attack rolls.
- **Phase 2 repository evidence:** Mapped repository record: `6a66ba6e0834dd6f` (Born Leader)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

Once per encounter, as a Swift Action, you grant all allies within your line of sight a +1 insight bonus on attack rolls. This effect lasts for as long as they remain within line of sight of you. An ally loses this bonus immediately if line of sight is broken or you are unconscious or dead.

#### Coordinate

- **Page:** 44
- **Prerequisites:** —
- **Quick summary:** A Noble with this talent has a knack for getting people to work together.
- **Phase 2 repository evidence:** Mapped repository record: `a52044feeab3fe05` (Coordinate)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

A Noble with this talent has a knack for getting people to work together. When you use this Talent as a Standard Action, all allies within your line of sight grant an additional +1 bonus when they use the Aid Another Action until the start of your next turn. You may select this Talent multiple times; each time you do, the bonus granted by the coordinate ability increases by 1 (to a maximum of +5).

#### Distant Command

- **Page:** 44
- **Prerequisites:** Born Leader.
- **Quick summary:** Any ally who gains the benefit of your Born Leader Talent does not lose the benefit if their line of sight to you is broken.
- **Phase 2 repository evidence:** Mapped repository record: `64fa257cd511314d` (Distant Command)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Any ally who gains the benefit of your Born Leader Talent does not lose the benefit if their line of sight to you is broken.

#### Fearless Leader

- **Page:** 44
- **Prerequisites:** Born Leader.
- **Quick summary:** As a Swift Action, you can provide a courageous example for your allies. For the remainder of the encounter, your allies receive a +5 morale bonus to their Will Defense against any Fear effect.
- **Phase 2 repository evidence:** Mapped repository record: `226e4f61e29df36f` (Fearless Leader)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Swift Action, you can provide a courageous example for your allies. For the remainder of the encounter, your allies receive a +5 morale bonus to their Will Defense against any Fear effect. Your allies lose this benefit if they lose line of sight to you, or you are killed or knocked unconscious.

#### Rally

- **Page:** 44
- **Prerequisites:** Born Leader, Distant Command.
- **Quick summary:** Once per encounter, you can rally your allies and bring them back from the edge of defeat.
- **Phase 2 repository evidence:** Mapped repository record: `962c8a24f9caaba0` (Rally)
- **Phase 2 discrepancy flags:** CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

Once per encounter, you can rally your allies and bring them back from the edge of defeat. As a Swift Action, any allies within your line of sight who have less than half their total hit points remaining gain a +2 morale bonus to their Reflex Defense and Will Defense, and a +2 bonus to all damage rolls for the remainder of the encounter.

#### Trust

- **Page:** 44
- **Prerequisites:** Born Leader, Coordinate.
- **Quick summary:** You can give up your Standard Action to give one ally within your line of sight an extra Standard Action or Move Action on their next turn, to do with as they please.
- **Phase 2 repository evidence:** Mapped repository record: `5e1065e8f4ab39b2` (Trust)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can give up your Standard Action to give one ally within your line of sight an extra Standard Action or Move Action on their next turn, to do with as they please. The ally does not lose the Action if line of sight is later broken.

### Lineage

**Canonical tree key:** `Saga Edition Core Rulebook|Lineage`

#### Connections

- **Page:** 44
- **Prerequisites:** —
- **Quick summary:** You are able to obtain licensed, restricted, military, or illegal equipment without having to pay a licensing fee or endure a background check, provided the total cost of the desired equipment is equal to or less" than your...
- **Phase 2 repository evidence:** Mapped repository record: `e58a8ad63c1d8771` (Connections)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You are able to obtain licensed, restricted, military, or illegal equipment without having to pay a licensing fee or endure a background check, provided the total cost of the desired equipment is equal to or less" than your character level x 1,000 credits. In addition, when obtaining equip~ ment or services through the black market, you reduce the black market cost multiplier by 1. See Restricted Items (page 118) for details.

#### Educated

- **Page:** 44
- **Prerequisites:** —
- **Quick summary:** Make any Knowledge check untrained.
- **Phase 2 repository evidence:** Mapped repository record: `3e98c9f5a4f450ff` (Educated)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, HOMEBREW_CONTAMINATION, CONCATENATED_IDENTITY_TEXT

**Canonical rules text**

Thanks to your well-rounded education, you may make any Knowledge check untrained.

#### Spontaneous Skill

- **Page:** 44
- **Prerequisites:** Educated.
- **Quick summary:** Sometimes you surprise others with your skill. Once per day, you may make an Untrained skill check as though you were Trained in the Skill.
- **Phase 2 repository evidence:** Mapped repository record: `85fddc83428358ae` (Spontaneous Skill)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Sometimes you surprise others with your skill. Once per day, you may make an Untrained skill check as though you were Trained in the Skill. Exception: you cannot use this Talent to make an Untrained Use the Force check as though you were Trained in the skill, unless you have the Force Sensitivity feat. You can select this Talent multiple times; each time you do, you can use it one additional time per day.

#### Wealth

- **Page:** 44
- **Prerequisites:** —
- **Quick summary:** Gain 5,000 credits per noble level each time you gain a level.
- **Phase 2 repository evidence:** Mapped repository record: `37bf53b4b2c0e539` (Wealth)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Each time you gain a level, including the level at which you select this talent, you receive an amount of credits equal to 5,000 x your noble level. You can spend these credits as you see fit. The credits appear in a civilized, accessible location of your choice or in your private bank account.

### Fortune

**Canonical tree key:** `Saga Edition Core Rulebook|Fortune`

#### Fool's Luck

- **Page:** 46
- **Prerequisites:** —
- **Quick summary:** Spend a Force Point for an encounter-long luck bonus to attacks, skills, or defenses.
- **Phase 2 repository evidence:** Mapped repository record: `5319a796f2c4ff64` (Fool's Luck)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a standard action, you can spend a Force Point to gain one of the following benefits for the rest of the encounter: a +1 luck bonus on attack rolls, a +5 luck bonus on skill checks, or a +1 luck bonus to all your defenses.

#### Fortune's Favor

- **Page:** 46
- **Prerequisites:** —
- **Quick summary:** Whenever you score a Critical Hit with a melee or ranged attack, you gain a free Standard Action. You must take the extra Standard Action before the end of your turn, or else it is lost.
- **Phase 2 repository evidence:** Mapped repository record: `aacde500ec811cd4` (Fortune's Favor)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you score a Critical Hit with a melee or ranged attack, you gain a free Standard Action. You must take the extra Standard Action before the end of your turn, or else it is lost.

#### Gambler

- **Page:** 46
- **Prerequisites:** —
- **Quick summary:** You gain a +2 competence bonus on Wisdom checks when you Gamble. You can select this Talent multiple times; each time you take this Talent, the competence bonus increases by +2.
- **Phase 2 repository evidence:** Mapped repository record: `8e4475b0f99633f3` (Gambler)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You gain a +2 competence bonus on Wisdom checks when you Gamble. You can select this Talent multiple times; each time you take this Talent, the competence bonus increases by +2.

#### Knack

- **Page:** 46
- **Prerequisites:** —
- **Quick summary:** Once per day, you can reroll a Skill Check and take the better result. You can select this Talent multiple times; each time you select this Talent, you can use it one additional time per day.
- **Phase 2 repository evidence:** Mapped repository record: `ac6baadb9d65ff7f` (Knack)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Once per day, you can reroll a Skill Check and take the better result. You can select this Talent multiple times; each time you select this Talent, you can use it one additional time per day.

#### Lucky Shot

- **Page:** 46
- **Prerequisites:** Knack
- **Quick summary:** Once per day, you can reroll an attack roll and take the better result. You can select this Talent multiple times; each time you select this Talent, you can use it one additional time per day.
- **Phase 2 repository evidence:** Mapped repository record: `5fbf1a3504865fba` (Lucky Shot)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Once per day, you can reroll an attack roll and take the better result. You can select this Talent multiple times; each time you select this Talent, you can use it one additional time per day.

### Misfortune

**Canonical tree key:** `Saga Edition Core Rulebook|Misfortune`

#### Dastardly Strike

- **Page:** 46
- **Prerequisites:** —
- **Quick summary:** Whenever you make a successful attack against an opponent that is denied its Dexterity bonus to Reflex Defense, the target moves -1 step along the Condition Track.
- **Phase 2 repository evidence:** Mapped repository record: `9e4345faaaa94dd8` (Dastardly Strike)
- **Phase 2 discrepancy flags:** CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

Whenever you make a successful attack against an opponent that is denied its Dexterity bonus to Reflex Defense, the target moves -1 step along the Condition Track.

#### Disruptive

- **Page:** 46
- **Prerequisites:** —
- **Quick summary:** By spending two Swift Actions, you can use your knack for causing trouble and instigating chaos to disrupt your enemies.
- **Phase 2 repository evidence:** Mapped repository record: `91b335f8565b90ef` (Disruptive)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

By spending two Swift Actions, you can use your knack for causing trouble and instigating chaos to disrupt your enemies. Until the start of your next turn, you suppress all morale and insight bonuses applied to enemies in your line of sight.

#### Skirmisher

- **Page:** 46
- **Prerequisites:** —
- **Quick summary:** If you move at least 2 squares before you attack and end your move in a different square from where you started, you gain a +1 bonus on attack rolls until the start of your next turn.
- **Phase 2 repository evidence:** Mapped repository record: `7b23e0812d6a8985` (Skirmisher)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

If you move at least 2 squares before you attack and end your move in a different square from where you started, you gain a +1 bonus on attack rolls until the start of your next turn.

#### Sneak Attack

- **Page:** 46
- **Prerequisites:** —
- **Quick summary:** Any time your opponent is Flat-Footed or otherwise denied its Dexterity bonus to Reflex Defense, you deal an additional 1d6 points of damage with a successful melee or ranged attack.
- **Phase 2 repository evidence:** Mapped repository record: `1505abc8babeeb84` (Sneak Attack)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Any time your opponent is Flat-Footed or otherwise denied its Dexterity bonus to Reflex Defense, you deal an additional 1d6 points of damage with a successful melee or ranged attack. You must be within 6 squares of the target to make a Sneak Attack with a ranged weapon. You may select this Talent multiple times. Each time you select it, your Sneak Attack damage increases by +1d6 (Maximum +10d6).

#### Walk the Line

- **Page:** 46
- **Prerequisites:** Disruptive.
- **Quick summary:** As a Standard Action, you can do or say something that catches your enemies off guard.
- **Phase 2 repository evidence:** Mapped repository record: `3f8f5305eabc525e` (Walk the Line)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Standard Action, you can do or say something that catches your enemies off guard. All opponents within 6 squares of you, and within your line of sight take a -2 penalty to their Defenses until the start of your next turn. The penalty is negated if line of sight is broken.

### Slicer

**Canonical tree key:** `Saga Edition Core Rulebook|Slicer`

#### Gimmick

- **Page:** 47
- **Prerequisites:** —
- **Quick summary:** Issue a routine computer command as a swift action.
- **Phase 2 repository evidence:** Mapped repository record: `8d8937a416fc0d81` (Gimmick)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR

**Canonical rules text**

You can issue a routine command to a computer as a swift action.

#### Master Slicer

- **Page:** 47
- **Prerequisites:** Gimmick
- **Quick summary:** You may choose to reroll any Use Computer check made to Improve Access on a computer, keeping the better of the two results.
- **Phase 2 repository evidence:** Mapped repository record: `bae4b0a8a3554cca` (Master Slicer)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may choose to reroll any Use Computer check made to Improve Access on a computer, keeping the better of the two results.

#### Trace

- **Page:** 47
- **Prerequisites:** —
- **Quick summary:** You can substitute your Use Computer Skill for any Gather Information check as long as you have access to a computer network.
- **Phase 2 repository evidence:** Mapped repository record: `54065380bb20e8d8` (Trace)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can substitute your Use Computer Skill for any Gather Information check as long as you have access to a computer network.

### Spacer

**Canonical tree key:** `Saga Edition Core Rulebook|Spacer`

#### Hyperdriven

- **Page:** 47
- **Prerequisites:** —
- **Quick summary:** Once per day while aboard a Starship, you can add your Class Level as a bonus on a single attack roll, Skill Check, or Ability Check.
- **Phase 2 repository evidence:** Mapped repository record: `29f73c36cabdeaf5` (Hyperdriven)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Once per day while aboard a Starship, you can add your Class Level as a bonus on a single attack roll, Skill Check, or Ability Check. The decision to add this bonus can be made after the result of the check is known.

#### Spacehound

- **Page:** 47
- **Prerequisites:** —
- **Quick summary:** Ignore low/zero-gravity attack penalties and space sickness, and count as proficient with starship weapons.
- **Phase 2 repository evidence:** Mapped repository record: `fe0c3a64ca460542` (Spacehound)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED, PREREQUISITE_ERROR

**Canonical rules text**

You take no penalty on attack rolls in low-gravity or zero-gravity environments, and you ignore the debilitating effects of space sickness. In addition, you are considered proficient with any starship weapon.

#### Starship Raider

- **Page:** 47
- **Prerequisites:** —
- **Quick summary:** You gain a +1 bonus on attack rolls made while aboard a Starship. This bonus applies to attacks made with Starship Weapons, as well as personal weapons used aboard a Starship.
- **Phase 2 repository evidence:** Mapped repository record: `224906e573330bf2` (Starship Raider)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You gain a +1 bonus on attack rolls made while aboard a Starship. This bonus applies to attacks made with Starship Weapons, as well as personal weapons used aboard a Starship.

#### Stellar Warrior

- **Page:** 47
- **Prerequisites:** Spacehound
- **Quick summary:** Whenever you roll a Natural 20 on an attack roll made aboard a Starship, you gain one temporary Force Point.
- **Phase 2 repository evidence:** Mapped repository record: `f92583cf04620d84` (Stellar Warrior)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED, CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

Whenever you roll a Natural 20 on an attack roll made aboard a Starship, you gain one temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost. This Talent works with both Weapon Systems and personal weapons used aboard a Starship.

### Awareness

**Canonical tree key:** `Saga Edition Core Rulebook|Awareness`

#### Acute Senses

- **Page:** 49
- **Prerequisites:** —
- **Quick summary:** Reroll any Perception check, keeping the second result.
- **Phase 2 repository evidence:** Mapped repository record: `f0166d26d9f6252a` (Acute Senses)
- **Phase 2 discrepancy flags:** TREE_ERROR, CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

You may choose to reroll any Perception check, but the result of the reroll must be accepted even if it is worse.

#### Expert Tracker

- **Page:** 49
- **Prerequisites:** Acute Senses
- **Quick summary:** Track at normal speed without the usual -5 Survival penalty.
- **Phase 2 repository evidence:** Mapped repository record: `16e18057bc92365c` (Expert Tracker)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You take no penalty on Survival checks made to follow tracks while moving your normal speed. Without this talent, you take a -5 penalty on Survival checks made to follow tracks while moving your normal speed.

#### Improved Initiative

- **Page:** 49
- **Prerequisites:** Acute Senses
- **Quick summary:** Reroll any Initiative check, keeping the second result.
- **Phase 2 repository evidence:** Mapped repository record: `9840f0e8b8f53bb5` (Improved Initiative)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may choose to reroll any Initiative check, but the result of the reroll must be accepted even if it is worse.

#### Keen Shot

- **Page:** 49
- **Prerequisites:** Acute Senses
- **Quick summary:** Ignore the attack penalty for ordinary concealment.
- **Phase 2 repository evidence:** Mapped repository record: `aca0598e9b0eb935` (Keen Shot)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You take no penalty on your attack roll when attacking a target with concealment, but not total concealment.

#### Uncanny Dodge I

- **Page:** 49
- **Prerequisites:** Acute Senses; Improved Initiative
- **Quick summary:** Keep your Dexterity bonus to Reflex Defense while flat-footed or attacked from hiding, unless immobilized.
- **Phase 2 repository evidence:** Mapped repository record: `df9c364e91826cbf` (Uncanny Dodge I)
- **Phase 2 discrepancy flags:** CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

You retain your Dexterity bonus to Reflex Defense regardless of being caught flat-footed or struck by a hidden attacker. You still lose your Dexterity bonus to Reflex Defense if you are immobilized.

#### Uncanny Dodge II

- **Page:** 49
- **Prerequisites:** Acute Senses; Improved Initiative; Uncanny Dodge I
- **Quick summary:** You cannot be flanked.
- **Phase 2 repository evidence:** Mapped repository record: `c7f46a5c92d7dd5e` (Uncanny Dodge II)
- **Phase 2 discrepancy flags:** CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

You cannot be flanked. You can react to opponents on opposite sides of you as easily as you can react to a single attacker.

### Camouflage

**Canonical tree key:** `Saga Edition Core Rulebook|Camouflage`

#### Hidden Movement

- **Page:** 49
- **Prerequisites:** Improved Stealth.
- **Quick summary:** You're very good at hiding when mobile. You take no penalty on your Stealth check when moving your normal Speed.
- **Phase 2 repository evidence:** Mapped repository record: `d0dad96e182d63d4` (Hidden Movement)
- **Phase 2 discrepancy flags:** CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

You're very good at hiding when mobile. You take no penalty on your Stealth check when moving your normal Speed.

#### Improved Stealth

- **Page:** 49
- **Prerequisites:** —
- **Quick summary:** You may choose to reroll any Stealth check, but the result of the reroll must be accepted, even if it is worse.
- **Phase 2 repository evidence:** Mapped repository record: `073115894cad8cf9` (Improved Stealth)
- **Phase 2 discrepancy flags:** CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

You may choose to reroll any Stealth check, but the result of the reroll must be accepted, even if it is worse.

#### Total Concealment

- **Page:** 49
- **Prerequisites:** Hidden Movement, Improved Stealth.
- **Quick summary:** Any situation that would give you Concealment grants you Total Concealment instead.
- **Phase 2 repository evidence:** Mapped repository record: `9d183b40a16b1376` (Total Concealment)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Any situation that would give you Concealment grants you Total Concealment instead.

### Fringer

**Canonical tree key:** `Saga Edition Core Rulebook|Fringer`

#### Barter

- **Page:** 49
- **Prerequisites:** —
- **Quick summary:** Reroll Persuasion checks to haggle, keeping the reroll.
- **Phase 2 repository evidence:** Mapped repository record: `6408bc9e8f582f5d` (Barter)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may reroll any Persuasion check made to haggle, but you must accept the result of the reroll even if it is worse.

#### Fringe Savant

- **Page:** 50
- **Prerequisites:** —
- **Quick summary:** Whenever you roll a Natural 20 on a Skill Check during an encounter, you gain one temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost.
- **Phase 2 repository evidence:** Mapped repository record: `d4a9f83d180934b5` (Fringe Savant)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you roll a Natural 20 on a Skill Check during an encounter, you gain one temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost.

#### Jury-Rigger

- **Page:** 50
- **Prerequisites:** —
- **Quick summary:** Reroll Mechanics checks for jury-rigged repairs, keeping the reroll.
- **Phase 2 repository evidence:** Mapped repository record: `e15a3408b9474354` (Jury-Rigger)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

You may reroll any Mechanics check made to accomplish a jury-rigged repair, but you must accept the result of the reroll even if it is worse.

#### Long Stride

- **Page:** 50
- **Prerequisites:** —
- **Quick summary:** Your Speed increases by 2 squares if you are wearing Light Armor or no Armor. If you have a natural Fly, Climb, or Swim Speed, it increases by 2 squares as well.
- **Phase 2 repository evidence:** Mapped repository record: `618472c99f355949` (Long Stride)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

Your Speed increases by 2 squares if you are wearing Light Armor or no Armor. If you have a natural Fly, Climb, or Swim Speed, it increases by 2 squares as well. You cannot use this Talent if you are wearing Medium Armor or Heavy Armor.

### Survivor

**Canonical tree key:** `Saga Edition Core Rulebook|Survivor`

#### Evasion

- **Page:** 50
- **Prerequisites:** —
- **Quick summary:** If you are hit by an Area Attack, you take half damage if the attack hits you. If the area attack misses you, you take no damage.
- **Phase 2 repository evidence:** Mapped repository record: `5400bc8cb1200624` (Evasion)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

If you are hit by an Area Attack, you take half damage if the attack hits you. If the area attack misses you, you take no damage.

#### Extreme Effort

- **Page:** 50
- **Prerequisites:** —
- **Quick summary:** You can spend two Swift Actions to gain a +5 bonus on a single Strength check or Strength-based Skill Check made during the same round.
- **Phase 2 repository evidence:** Mapped repository record: `c7c5ac9608d29c5b` (Extreme Effort)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can spend two Swift Actions to gain a +5 bonus on a single Strength check or Strength-based Skill Check made during the same round.

#### Sprint

- **Page:** 50
- **Prerequisites:** —
- **Quick summary:** When you use the Run action, you can move up to five times your Speed (instead of up to four times).
- **Phase 2 repository evidence:** Mapped repository record: `ca79321246ae6986` (Sprint)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When you use the Run action, you can move up to five times your Speed (instead of up to four times).

#### Surefooted

- **Page:** 50
- **Prerequisites:** —
- **Quick summary:** Difficult terrain does not reduce your speed.
- **Phase 2 repository evidence:** Mapped repository record: `f87bd82a892f69ea` (Surefooted)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Your speed is not reduced by difficult terrain.

### Armor Specialist

**Canonical tree key:** `Saga Edition Core Rulebook|Armor Specialist`

#### Armor Mastery

- **Page:** 51
- **Prerequisites:** Armored Defense.
- **Quick summary:** The maximum Dexterity bonus of your Armor improves by +1. You must be proficient with the Armor you are wearing to gain this benefit.
- **Phase 2 repository evidence:** Mapped repository record: `4fc3fe4c1e7f9ba0` (Armor Mastery)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

The maximum Dexterity bonus of your Armor improves by +1. You must be proficient with the Armor you are wearing to gain this benefit.

#### Armored Defense

- **Page:** 51
- **Prerequisites:** —
- **Quick summary:** When calculating your Reflex Defense, you may add either your Heroic Level or your Armor bonus, whichever is higher.
- **Phase 2 repository evidence:** Mapped repository record: `4c236343b01ea763` (Armored Defense)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When calculating your Reflex Defense, you may add either your Heroic Level or your Armor bonus, whichever is higher. You must be proficient with the Armor you are wearing to gain this benefit.

#### Improved Armored Defense

- **Page:** 52
- **Prerequisites:** Armored Defense.
- **Quick summary:** When calculating your Reflex Defense, you may add your Heroic Level plus one-half your Armor bonus (rounded down), or your Armor bonus, whichever is higher.
- **Phase 2 repository evidence:** Mapped repository record: `394809ed8baff1b9` (Improved Armored Defense)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When calculating your Reflex Defense, you may add your Heroic Level plus one-half your Armor bonus (rounded down), or your Armor bonus, whichever is higher. You must be proficient with the Armor you are wearing to gain this benefit.

#### Juggernaut

- **Page:** 52
- **Prerequisites:** Armored Defense.
- **Quick summary:** Your Armor does not reduce your Speed or the distance you can move while Running. You must be proficient with the Armor you are wearing to gain this benefit.
- **Phase 2 repository evidence:** Mapped repository record: `55f4a04087dacddc` (Juggernaut)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Your Armor does not reduce your Speed or the distance you can move while Running. You must be proficient with the Armor you are wearing to gain this benefit.

#### Second Skin

- **Page:** 52
- **Prerequisites:** Armored Defense.
- **Quick summary:** When wearing Armor with which you are proficient, your Armor bonus to your Reflex Defense and Equipment bonus to your Fortitude Defense each increases by +1.
- **Phase 2 repository evidence:** Mapped repository record: `eafb1ee6cacedd20` (Second Skin)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When wearing Armor with which you are proficient, your Armor bonus to your Reflex Defense and Equipment bonus to your Fortitude Defense each increases by +1.

### Brawler

**Canonical tree key:** `Saga Edition Core Rulebook|Brawler`

#### Expert Grappler

- **Page:** 52
- **Prerequisites:** —
- **Quick summary:** You gain a +2 competence bonus on Grapple attacks.
- **Phase 2 repository evidence:** Mapped repository record: `916a526d8c166005` (Expert Grappler)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You gain a +2 competence bonus on Grapple attacks.

#### Gun Club

- **Page:** 52
- **Prerequisites:** —
- **Quick summary:** You can use a ranged weapon as a melee weapon without taking a penalty on your attack roll. The weapon is otherwise treated as a Club in all respects.
- **Phase 2 repository evidence:** Mapped repository record: `bff3997bbdecc98a` (Gun Club)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

You can use a ranged weapon as a melee weapon without taking a penalty on your attack roll. The weapon is otherwise treated as a Club in all respects. If you are using a Rifle with a mounted Bayonet or Vibrobayonet, you may wield that weapon as a Double Weapon. The Bayonet or Vibrobayonet end is treated normally, and the other end is treated as a Club.

#### Melee Smash

- **Page:** 52
- **Prerequisites:** —
- **Quick summary:** You deal +1 point of damage with melee attacks.
- **Phase 2 repository evidence:** Mapped repository record: `e0ee525f4109cfde` (Melee Smash)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

You deal +1 point of damage with melee attacks.

#### Stunning Strike

- **Page:** 52
- **Prerequisites:** Melee Smash.
- **Quick summary:** When you damage an opponent with a melee attack, your opponents move an additional -1 step along the Condition Track if your damage roll result equals or exceeds the target's Damage Threshold.
- **Phase 2 repository evidence:** Mapped repository record: `9292819462b46074` (Stunning Strike)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

When you damage an opponent with a melee attack, your opponents move an additional -1 step along the Condition Track if your damage roll result equals or exceeds the target's Damage Threshold.

#### Unbalance Opponent

- **Page:** 52
- **Prerequisites:** Expert Grappler.
- **Quick summary:** Designate an opponent within one size category; it cannot add its Strength bonus to attack rolls against you until you select a new opponent.
- **Phase 2 repository evidence:** No correct-tree repository record certified in Phase 2
- **Phase 2 discrepancy flags:** MISSING_CONTENT
- **Correction note:** Phase 3B PDF review removed an intervening page-design quotation that had contaminated the original OCR capture.

**Canonical rules text**

You are skilled at keeping your opponents off balance in melee combat. During your action, you designate an opponent no more than one size category larger or smaller than you. That opponent doesn't get to add his Strength bonus on attack rolls when targeting you. (If the opponent has a Strength penalty, he still suffers that penalty.) The opponent's Strength modifier applies to damage, as usual. You can select a new opponent on your next turn.

### Commando

**Canonical tree key:** `Saga Edition Core Rulebook|Commando`

#### Battle Analysis

- **Page:** 52
- **Prerequisites:** —
- **Quick summary:** As a Swift Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you know which allies and opponents in your line of sight are reduced to at least half of their maximum total Hit Points.
- **Phase 2 repository evidence:** Mapped repository record: `7df2e8e4f18dc909` (Battle Analysis)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Swift Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you know which allies and opponents in your line of sight are reduced to at least half of their maximum total Hit Points.

#### Cover Fire

- **Page:** 52
- **Prerequisites:** Battie Analysis.
- **Quick summary:** When you make a ranged attack with a Pistol or Rifle, all allies within 6 squares of you when you made the attack gain a +1 bonus to Reflex Defense until the start of your next turn.
- **Phase 2 repository evidence:** Mapped repository record: `049820827d7ef32b` (Cover Fire)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When you make a ranged attack with a Pistol or Rifle, all allies within 6 squares of you when you made the attack gain a +1 bonus to Reflex Defense until the start of your next turn. Allies within range don't need to be within your line of sight to gain the bonus.

#### Demolitionist

- **Page:** 52
- **Prerequisites:** —
- **Quick summary:** When you use the Mechanics skill to Handle Explosives, the explosion deals +2 dice of damage. You may take this Talent multiple times; its effects stack.
- **Phase 2 repository evidence:** Mapped repository record: `8aedbfb39b9f3b52` (Demolitionist)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When you use the Mechanics skill to Handle Explosives, the explosion deals +2 dice of damage. You may take this Talent multiple times; its effects stack.

#### Draw Fire

- **Page:** 52
- **Prerequisites:** —
- **Quick summary:** You can distract opponents and convince them that you are the most tempting (or most dangerous) target in the area.
- **Phase 2 repository evidence:** Mapped repository record: `f29d5c0628459c94` (Draw Fire)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

You can distract opponents and convince them that you are the most tempting (or most dangerous) target in the area. As a Swift Action, make a Persuasion check and compare the result to the Will Defense of all opponents within line of sight. If the check result exceeds an opponent's Will Defense, that opponent cannot attack any character within 6 squares of you until the start of your next turn as long as you do not have Cover against that opponent. (The affected opponent may still attack you, however.)

#### Harm's Way

- **Page:** 52
- **Prerequisites:** Trained in the Initiative skill.
- **Quick summary:** Once per round, you may spend a Swift Action to shield a single adjacent ally from attacks, taking the damage and suffering the ill effects in your ally's stead.
- **Phase 2 repository evidence:** Mapped repository record: `fde8157b6d097e12` (Harm's Way)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

Once per round, you may spend a Swift Action to shield a single adjacent ally from attacks, taking the damage and suffering the ill effects in your ally's stead. Until the start of your next turn, any attack made against the protected ally targets you instead. You may elect not to shield your protected ally against a given attack, provided the decision is made before the attack roll is made.

#### Indomitable

- **Page:** 52
- **Prerequisites:** —
- **Quick summary:** Once per day as a swift action, move +5 steps up the condition track without removing persistent conditions.
- **Phase 2 repository evidence:** Mapped repository record: `b8aaf500d3069938` (Indomitable)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED, CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

Once per day as a swift action, you can move +5 steps along the condition track. This does not remove any persistent conditions affecting you. You can select this talent multiple times; each time, you can use it one additional time per day.

#### Tough as Nails

- **Page:** 53
- **Prerequisites:** —
- **Quick summary:** You can catch a Second Wind one extra time per day. If you have this Talent and the Extra Second Wind feat, you can catch your Second Wind a total of three times per day.
- **Phase 2 repository evidence:** Mapped repository record: `916b0a6197bf85a6` (Tough as Nails)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can catch a Second Wind one extra time per day. If you have this Talent and the Extra Second Wind feat, you can catch your Second Wind a total of three times per day.

### Weapon Specialist

**Canonical tree key:** `Saga Edition Core Rulebook|Weapon Specialist`

#### Devastating Attack

- **Page:** 53
- **Prerequisites:** —
- **Quick summary:** Choose a single Exotic Weapon or weapon group with which you are proficient.
- **Phase 2 repository evidence:** Mapped repository record: `383915a7d11e1225` (Devastating Attack)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

Choose a single Exotic Weapon or weapon group with which you are proficient. Whenever you make a successful attack against a target using such a weapon, you treat your target's Damage Threshold as if it were 5 points lower when determining the result of your attack. If you select Heavy Weapons as the weapon group this Talent applies to, you may also use the Talent with Vehicle Weapon attacks. You may select this Talent multiple times. Each time you select this Talent, it applies to a different Exotic Weapon or weapon group.

#### Penetrating Attack

- **Page:** 53
- **Prerequisites:** Weapon Focus with chosen exotic weapon or weapon group.
- **Quick summary:** Choose a single Exotic Weapon or weapon group with which you are proficient.
- **Phase 2 repository evidence:** Mapped repository record: `7d547902b8d9109e` (Penetrating Attack)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

Choose a single Exotic Weapon or weapon group with which you are proficient. Whenever you make a successful attack against a target with such a weapon, you treat your target's Damage Reduction as if it were 5 points lower when determining the result of your attack. If you select Heavy Weapons as the weapon group this Talent applies to, you may also use the Talent with Vehicle Weapon attacks. You may select this Talent multiple times. Each time you select this Talent, it applies to a different Exotic Weapon or weapon group.

#### Weapon Specialization

- **Page:** 53
- **Prerequisites:** Weapon Focus with chosen exotic weapon or weapon
- **Quick summary:** Choose a single Exotic Weapon or weapon group with which you are proficient. You gain a +2 bonus on damage rolls with such weapons.
- **Phase 2 repository evidence:** Mapped repository record: `869168cd679ee5d1` (Weapon Specialization)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Choose a single Exotic Weapon or weapon group with which you are proficient. You gain a +2 bonus on damage rolls with such weapons. You may select this Talent multiple times. Each time you select this Talent, it applies to a different Exotic Weapon or weapon group.

### Alter

**Canonical tree key:** `Saga Edition Core Rulebook|Alter`

#### Disciplined Strike

- **Page:** 100
- **Prerequisites:** —
- **Quick summary:** Whenever you use a Force power that hs effect (such as Force siam), you may exclude a certain number OF from the effects of that power.
- **Phase 2 repository evidence:** Mapped repository record: `0fc08fad3a87a830` (Disciplined Strike)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you use a Force power that hs effect (such as Force siam), you may exclude a certain number OF from the effects of that power. The number of targets that you in this manner is equal to your Wisdom modifier [minimum of 1). _

#### Telekinetic Power

- **Page:** 100
- **Prerequisites:** —
- **Quick summary:** On a natural 20 with a listed telekinetic power, immediately use that power again as a free action.
- **Phase 2 repository evidence:** Mapped repository record: `11cae48e1213c407` (Telekinetic Power)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, CONCATENATED_IDENTITY_TEXT

**Canonical rules text**

Whenever you roll a natural 20 on your Use the Force check to activate Force disarm, Force grip, Force slam, Force thrust, or move object, you may choose to use that Force power again immediately as a free action. You may direct the second use of the Force power against any eligible target.

#### Telekinetic Savant

- **Page:** 100
- **Prerequisites:** —
- **Quick summary:** Once per encounter, recover a listed telekinetic Force power to your suite as a swift action without spending a Force Point.
- **Phase 2 repository evidence:** Mapped repository record: `ddacb8e4517da6b5` (Telekinetic Savant)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, CONCATENATED_IDENTITY_TEXT

**Canonical rules text**

Once per encounter as a swift action, you may return one of the following Force powers to your suite without spending a Force Point: Force disarm, Force grip, Force slam, Force thrust, or move object. You may select this talent multiple times; each time you select it, you may use it one additional time per encounter.

### Control

**Canonical tree key:** `Saga Edition Core Rulebook|Control`

#### Damage Reduction 10

- **Page:** 101
- **Prerequisites:** —
- **Quick summary:** Spend a Force Point as a standard action to gain DR 10 for 1 minute.
- **Phase 2 repository evidence:** Mapped repository record: `35b42e14e3ef7d0d` (Damage Reduction 10)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can spend a Force Point as a standard action to gain damage reduction 10 for 1 minute.

#### Equilibrium

- **Page:** 101
- **Prerequisites:** —
- **Quick summary:** Spend a Force Point as a swift action to remove debilitating conditions affecting you.
- **Phase 2 repository evidence:** Mapped repository record: `328a880e60f2320f` (Equilibrium)
- **Phase 2 discrepancy flags:** TREE_ERROR, DESCRIPTION_ERROR, CONCATENATED_IDENTITY_TEXT

**Canonical rules text**

As a swift action, you can spend a Force Point to remove all debilitating conditions affecting you and return to a normal state.

#### Force Focus

- **Page:** 101
- **Prerequisites:** —
- **Quick summary:** Full-round DC 15 Use the Force to recover one spent Force power.
- **Phase 2 repository evidence:** Mapped repository record: `af51d4e76675b183` (Force Focus)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a full-round action, you may make a DC 15 Use the Force check. If the check succeeds, you regain one spent Force power of your choice.

#### Force Recovery

- **Page:** 101
- **Prerequisites:** Equilibrium
- **Quick summary:** Your second wind restores an extra 1d6 hit points per Force Point you possess, up to 10d6.
- **Phase 2 repository evidence:** Mapped repository record: `a691cc0212b6176c` (Force Recovery)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED, PREREQUISITE_ERROR

**Canonical rules text**

Whenever you use your second wind, you regain additional hit points equal to 1d6 per Force Point you possess, to a maximum of 10d6.

### Dark Side

**Canonical tree key:** `Saga Edition Core Rulebook|Dark Side`

#### Power of the Dark Side

- **Page:** 101
- **Prerequisites:** —
- **Quick summary:** When spending a Force Point on an attack roll, roll one extra bonus die and keep the best; doing so increases your Dark Side Score by 1.
- **Phase 2 repository evidence:** Mapped repository record: `627bd3abd30b973f` (Power of the Dark Side)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, HOMEBREW_CONTAMINATION, CONCATENATED_IDENTITY_TEXT

**Canonical rules text**

You allow your hatred to fuel your attacks. Whenever you spend a Force Point to modify an attack roll, you may choose to roll an additional bonus die and take the best result. However, doing so increases your Dark Side Score by 1.

#### Dark Presence

- **Page:** 101
- **Prerequisites:** Charisma 13; Power of the Dark Side
- **Quick summary:** Standard action: you and nearby allies gain +1 Force to all defenses for the encounter while you remain conscious and in range.
- **Phase 2 repository evidence:** Mapped repository record: `606e14c428f1d159` (Dark Presence)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a standard action, you grant yourself and all allies within 6 squares a +1 Force bonus to all defenses until the end of the encounter. The bonuses are lost if you fall unconscious or die. Affected allies who move out of range lose the benefits for as long as they remain out of range.

#### Revenge

- **Page:** 101
- **Prerequisites:** Dark Presence; Power of the Dark Side
- **Quick summary:** When an equal-or-higher-level ally falls in sight, gain +2 Force to attacks and damage for the encounter.
- **Phase 2 repository evidence:** Mapped repository record: `c83f18465c3b9d91` (Revenge)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever an ally of equal or higher level than you is killed or reduced to 0 hit points within your line of sight, you gain a +2 Force bonus on attack rolls and damage rolls until the end of the encounter. Force bonuses do not stack, so multiple fallen allies do not increase the bonus.

#### Swift Power

- **Page:** 101
- **Prerequisites:** —
- **Quick summary:** Once per day, you can use 3 Force power that normally takes a standard action or move action as a swift action.
- **Phase 2 repository evidence:** Mapped repository record: `09609e71ba6cd4aa` (Swift Power)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Once per day, you can use 3 Force power that normally takes a standard action or move action as a swift action.

### Sense

**Canonical tree key:** `Saga Edition Core Rulebook|Sense`

#### Force Perception

- **Page:** 101
- **Prerequisites:** —
- **Quick summary:** Use Use the Force instead of Perception for the listed perception uses and count as trained.
- **Phase 2 repository evidence:** Mapped repository record: `a358402a9fc26c02` (Force Perception)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, HOMEBREW_CONTAMINATION, CONCATENATED_IDENTITY_TEXT

**Canonical rules text**

You can make a Use the Force check instead of a Perception check to avoid surprise, notice enemies, sense deception, or sense influence. You are considered trained in Perception for purposes of using this talent. If you are entitled to a Perception check reroll, you may reroll your Use the Force check instead, subject to the same circumstances and limitations.

#### Force Pilot

- **Page:** 101
- **Prerequisites:** —
- **Quick summary:** Use Use the Force instead of Pilot and count as trained in Pilot.
- **Phase 2 repository evidence:** Mapped repository record: `443373859f1ecca3` (Force Pilot)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, HOMEBREW_CONTAMINATION, CONCATENATED_IDENTITY_TEXT, PREREQUISITE_ERROR

**Canonical rules text**

You can use your Use the Force check modifier instead of your Pilot check modifier when making Pilot checks. You are considered trained in Pilot for purposes of using this talent. If you are entitled to a Pilot check reroll, you may reroll your Use the Force check instead, subject to the same circumstances and limitations.

#### Foresight

- **Page:** 101
- **Prerequisites:** Force Perception.
- **Quick summary:** You may spend a Force Point to reroll an Initiative check, keeping the better of the two rolls.
- **Phase 2 repository evidence:** Mapped repository record: `d10cdcba4faae7bb` (Foresight)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may spend a Force Point to reroll an Initiative check, keeping the better of the two rolls. Additionally, if you roll a natural 20 on the Initiative check reroll, you immediately regain the Force Point spent to activate this talent.

#### Gauge Force Potential

- **Page:** 101
- **Prerequisites:** Force Perception.
- **Quick summary:** By focusing on a specific creature in your line of sight, you can gauge how strong in the Force itis. This takes a standard action and requires a Use the Force check.
- **Phase 2 repository evidence:** Mapped repository record: `fdc4061afb97e87f` (Gauge Force Potential)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

By focusing on a specific creature in your line of sight, you can gauge how strong in the Force itis. This takes a standard action and requires a Use the Force check. If your check result meets or beats the target's Will Defense, you know whether or not it has the Force Sensitivity feat, you know how many Force powers it knows (but not which ones, specifically), and you know how many Force Points it has currently.

#### Visions

- **Page:** 101
- **Prerequisites:** Force Perception; farseeing
- **Quick summary:** Spend a Force Point while using farseeing to look into the target's past or future.
- **Phase 2 repository evidence:** Mapped repository record: `da12fc505efc5eea` (Visions)
- **Phase 2 discrepancy flags:** TREE_ERROR, DESCRIPTION_ERROR

**Canonical rules text**

Whenever you use the farseeing Force power, you can spend a Force Point as a swift action to see into the target's past or future instead of glimpsing the target in the present. You declare how far into the target's past or future you wish to look, up to a maximum of 1 year per your character level. Any information gained about a target's future is subject to change, depending on whether steps are taken to alter that future.

### Jensaarai Defender

**Canonical tree key:** `Saga Edition Core Rulebook|Jensaarai Defender`

#### Attune Armor

- **Page:** 107
- **Prerequisites:** —
- **Quick summary:** Spend a Force Point to permanently improve a suit of armor for your own use.
- **Phase 2 repository evidence:** No correct-tree repository record certified in Phase 2
- **Phase 2 discrepancy flags:** MISSING_CONTENT

**Canonical rules text**

As a full-round action, you may spend a Force Point to attune a suit of armor to the Force, permanently increasing its armor bonus by +2. In addition, the maximum Dexterity bonus of the attuned armor permanently improves by +1. Only you can benefit from wearing the attuned armor; these benefits do not apply if someone else dons it.

#### Force Cloak

- **Page:** 107
- **Prerequisites:** —
- **Quick summary:** Create a Force bubble that blocks electronic surveillance, sensors, and communications.
- **Phase 2 repository evidence:** Mapped repository record: `2c18952e0c014127` (Force Cloak)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR

**Canonical rules text**

As a swift action, you can surround yourself with an invisible bubble of Force power that shields you and anything you're carrying from electronic surveillance. The bubble also blocks all electronic sensors and communications. The Force cloak lasts for as long as you concentrate or until the start of your next turn.

#### Force Cloak Mastery

- **Page:** 107
- **Prerequisites:** Force Cloak
- **Quick summary:** Expand Force Cloak to protect a number of creatures equal to your character level.
- **Phase 2 repository evidence:** No correct-tree repository record certified in Phase 2
- **Phase 2 discrepancy flags:** MISSING_CONTENT

**Canonical rules text**

As the Force Cloak talent, except that you can expand the bubble to envelop a number of creatures, including yourself, equal to your character level.

#### Linked Defense

- **Page:** 107
- **Prerequisites:** —
- **Quick summary:** Trade up to -5 attack for an equal Force bonus to a visible ally's Reflex Defense until your next turn.
- **Phase 2 repository evidence:** No correct-tree repository record certified in Phase 2
- **Phase 2 discrepancy flags:** MISSING_CONTENT

**Canonical rules text**

As a swift action, you can take a penalty of up to -5 on your attack roll and add the same number, up to +5, as a Force bonus to an ally's Reflex Defense, provided the ally is within your line of sight when you activate this talent. The bonus cannot exceed your base attack bonus. The changes to your attack rolls and your ally's Reflex Defense last until the start of your next turn.

### Dathomiri Witch

**Canonical tree key:** `Saga Edition Core Rulebook|Dathomiri Witch`

#### Adept Spellcaster

- **Page:** 107
- **Prerequisites:** —
- **Quick summary:** Use a normally faster Force power as a full-round action to reroll its activation check, accepting the reroll.
- **Phase 2 repository evidence:** Mapped repository record: `12b7eb5d32bd440e` (Adept Spellcaster)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, HOMEBREW_CONTAMINATION, CONCATENATED_IDENTITY_TEXT, PREREQUISITE_ERROR

**Canonical rules text**

You may use any Force power that normally requires a swift action, move action, or standard action as a full-round action instead. If you choose to do so, you may reroll your Use the Force check to activate that power, but you must accept the result of the reroll, even if it is worse.

#### Charm Beast

- **Page:** 107
- **Prerequisites:** —
- **Quick summary:** You can make a Use the Force check in place of a Persuasion check when attempting to change the Attitude of an undomesticated creature with an Intelligence score of 2 or less.
- **Phase 2 repository evidence:** Mapped repository record: `bab9a1ce285f98b9` (Charm Beast)
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

You can make a Use the Force check in place of a Persuasion check when attempting to change the Attitude of an undomesticated creature with an Intelligence score of 2 or less. Additionally, you do not take the normal -5 penalty on the check if the creature can't speak or understand your language.

#### Command Beast

- **Page:** 107
- **Prerequisites:** Charm Beast
- **Quick summary:** After improving a beast's attitude, treat it as domesticated for you and potentially use it as a mount.
- **Phase 2 repository evidence:** No correct-tree repository record certified in Phase 2
- **Phase 2 discrepancy flags:** MISSING_CONTENT

**Canonical rules text**

Whenever you manage to shift the attitude of a beast to indifferent or friendly, you may treat that creature as a domesticated animal, but for you only. Additionally, you may use this beast as a mount, provided it is at least one size category larger than you and has a comfortable place for you to sit.

#### Flight

- **Page:** 107
- **Prerequisites:** Adept Spellcaster
- **Quick summary:** Spend a Force Point as a swift action to fly at your land speed until the start of your next turn.
- **Phase 2 repository evidence:** No correct-tree repository record certified in Phase 2
- **Phase 2 discrepancy flags:** MISSING_CONTENT

**Canonical rules text**

As a swift action, you can spend a Force Point to fly. You gain a fly speed equal to your land speed, and you can ascend at half speed or descend at double speed. The flight lasts until the start of your next turn; if you're still airborne at that time, you fall.

### Expert Pilot

**Canonical tree key:** `Saga Edition Core Rulebook|Expert Pilot`

#### Elusive Dogfighter

- **Page:** 207
- **Prerequisites:** —
- **Quick summary:** When engaged in a Dogfight, any enemy pilot engaged in the same Dogfight takes a -10 penalty on attack rolls when you succeed on the opposed Pilot check.
- **Phase 2 repository evidence:** Mapped repository record: `fead6e3522fd458a` (Elusive Dogfighter)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When engaged in a Dogfight, any enemy pilot engaged in the same Dogfight takes a -10 penalty on attack rolls when you succeed on the opposed Pilot check.

#### Full Throttle

- **Page:** 207
- **Prerequisites:** —
- **Quick summary:** Take 10 when increasing vehicle speed and move up to 5x speed with all-out movement.
- **Phase 2 repository evidence:** Mapped repository record: `34ff9dc64050028d` (Full Throttle)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can take 10 on Pilot checks made to increase your vehicle's speed. In addition, when you use the all-out movement action while piloting a vehicle, your vehicle moves up to five times its normal speed instead of four times.

#### Juke

- **Page:** 207
- **Prerequisites:** Vehicular Evasion
- **Quick summary:** When flying defensively, your vehicle keeps a +5 Reflex dodge bonus even if you attack.
- **Phase 2 repository evidence:** Mapped repository record: `d001094556c97a92` (Juke)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR

**Canonical rules text**

When you fight defensively as the pilot of a vehicle, the dodge bonus to your vehicle's Reflex Defense increases to +5 even if you make an attack.

#### Keep It Together

- **Page:** 207
- **Prerequisites:** —
- **Quick summary:** Once per encounter, prevent your piloted vehicle from moving down the condition track from threshold damage.
- **Phase 2 repository evidence:** Mapped repository record: `b7d5a1bc3d40b964` (Keep It Together)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Once per encounter, when a vehicle you're piloting takes damage that equals or exceeds its damage threshold, your vehicle avoids moving down the condition track.

#### Relentless Pursuit

- **Page:** 207
- **Prerequisites:** —
- **Quick summary:** Roll twice and keep the better result when initiating a dogfight.
- **Phase 2 repository evidence:** Mapped repository record: `b7caecab09bb3f77` (Relentless Pursuit)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may roll twice for any opposed Pilot check made to initiate a dogfight, keeping the better result.

#### Vehicular Evasion

- **Page:** 207
- **Prerequisites:** —
- **Quick summary:** Your moving, functioning vehicle takes half damage from a hit area attack and none on a miss.
- **Phase 2 repository evidence:** Mapped repository record: `f0cf0ad742a5e014` (Vehicular Evasion)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED, PREREQUISITE_ERROR

**Canonical rules text**

If the vehicle you are piloting is hit by an area attack, it takes half damage if the attack hits. If the area attack misses your vehicle, it takes no damage. You cannot use this talent when your vehicle is stationary or disabled.

### Gunner

**Canonical tree key:** `Saga Edition Core Rulebook|Gunner`

#### Dogfight Gunner

- **Page:** 207
- **Prerequisites:** Expert Gunner.
- **Quick summary:** While your Vehicle is engaged in a Dogfight, you take no penalty on your attack rolls with Vehicle Weapons, even if you are not the Pilot.
- **Phase 2 repository evidence:** Mapped repository record: `f52cadb1ae252d0c` (Dogfight Gunner)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

While your Vehicle is engaged in a Dogfight, you take no penalty on your attack rolls with Vehicle Weapons, even if you are not the Pilot.

#### Expert Gunner

- **Page:** 207
- **Prerequisites:** —
- **Quick summary:** You gain a +1 bonus on attack rolls made using Vehicle Weapons.
- **Phase 2 repository evidence:** Mapped repository record: `befaa195df06b274` (Expert Gunner)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You gain a +1 bonus on attack rolls made using Vehicle Weapons.

#### Quick Trigger

- **Page:** 207
- **Prerequisites:** Expert Gunner.
- **Quick summary:** Whenever an enemy Vehicle moves out of your square, or an adjacent square, you may make a single attack against that Vehicle as an Attack of Opportunity.
- **Phase 2 repository evidence:** Mapped repository record: `12ffb24378b60c13` (Quick Trigger)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever an enemy Vehicle moves out of your square, or an adjacent square, you may make a single attack against that Vehicle as an Attack of Opportunity.

#### System Hit

- **Page:** 207
- **Prerequisites:** Expert Gunner.
- **Quick summary:** Whenever you deal damage to a Vehicle that equals or exceeds its Damage Threshold, you move that Vehicle an additional -1 step on the Condition Track.
- **Phase 2 repository evidence:** Mapped repository record: `da9e6511f3ae8435` (System Hit)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you deal damage to a Vehicle that equals or exceeds its Damage Threshold, you move that Vehicle an additional -1 step on the Condition Track.

### Bounty Hunter

**Canonical tree key:** `Saga Edition Core Rulebook|Bounty Hunter`

#### Hunter's Mark

- **Page:** 208
- **Prerequisites:** —
- **Quick summary:** If you aim before making ranged attack , you 4 target -1 step along the condition track if the ateam hits .
- **Phase 2 repository evidence:** Mapped repository record: `74fb6b37af983a4c` (Hunter's Mark)
- **Phase 2 discrepancy flags:** CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

If you aim before making ranged attack (see Aim, page 154), you 4 target -1 step along the condition track if the ateam hits (see Conditions, page 148).

#### Hunter's Target

- **Page:** 208
- **Prerequisites:** Hunter's Mark.
- **Quick summary:** Once per encounter as a Free Action, you may designate an opponent. For the rest of the encounter, when you succeed on a melee or ranged attack against that opponent, you gain a bonus on damage equal to your Class Level.
- **Phase 2 repository evidence:** Mapped repository record: `907906934ba3c563` (Hunter's Target)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Once per encounter as a Free Action, you may designate an opponent. For the rest of the encounter, when you succeed on a melee or ranged attack against that opponent, you gain a bonus on damage equal to your Class Level.

#### Notorious

- **Page:** 209
- **Prerequisites:** —
- **Quick summary:** When not disguised, reroll Persuasion checks to intimidate and keep the better result.
- **Phase 2 repository evidence:** No correct-tree repository record certified in Phase 2
- **Phase 2 discrepancy flags:** MISSING_DISTINCT_IDENTITY, IDENTITY_ERROR

**Canonical rules text**

Your skill as a bounty hunter is known throughout the galaxy, even on fringe worlds. When you are not disguised, you may reroll any Persuasion checks made to intimidate others, keeping the better result.

#### Nowhere to Hide

- **Page:** 208
- **Prerequisites:** —
- **Quick summary:** Reroll Gather Information checks to locate a specific individual, keeping the reroll.
- **Phase 2 repository evidence:** Mapped repository record: `b19ce52b1c965015` (Nowhere to Hide)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may choose to reroll any Gather Information check made to locate a specific individual, but you must accept the result of the reroll even if it is worse.

#### Relentless

- **Page:** 208
- **Prerequisites:** Hunter's Mark, Hunter's Target. P
- **Quick summary:** This Talent applies only to an opponent you've designated as your Hunter's Target.
- **Phase 2 repository evidence:** Mapped repository record: `7bc10cb88a6a0c92` (Relentless)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

This Talent applies only to an opponent you've designated as your Hunter's Target. Any attack or effect originating from the target that would normally move you along the Condition Track does not, in fact, move you along the Condition Track.

#### Ruthless Negotiator

- **Page:** 208
- **Prerequisites:** Notorious.
- **Quick summary:** When haggling over te price @ bounty , you can reroll Persuasion check and keep the better result.
- **Phase 2 repository evidence:** Mapped repository record: `8298e12805291c78` (Ruthless Negotiator)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When haggling over te price @ bounty (see the Persuasion skill, page 71), you can reroll Persuasion check and keep the better result.

### Infamy

**Canonical tree key:** `Saga Edition Core Rulebook|Infamy`

#### Inspire Fear I

- **Page:** 210
- **Prerequisites:** —
- **Quick summary:** Equal-or-lower-level opponents take -1 on attacks, opposed skills, and Force-power activation checks against you.
- **Phase 2 repository evidence:** Mapped repository record: `cf4b1e5b126a2a7e` (Inspire Fear I)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR

**Canonical rules text**

Any opponent whose level is equal to or less than your character level takes a -1 penalty on attack rolls and opposed skill checks made against you, as well as Use the Force checks made to activate Force powers that target you. This is a mind-affecting fear effect.

#### Inspire Fear II

- **Page:** 210
- **Prerequisites:** Inspire Fear I
- **Quick summary:** Increase Inspire Fear's penalty to -2.
- **Phase 2 repository evidence:** Mapped repository record: `71bc6b43ab504b90` (Inspire Fear II)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As Inspire Fear I, except that the penalty increases to -2.

#### Inspire Fear III

- **Page:** 210
- **Prerequisites:** Inspire Fear I; Inspire Fear II
- **Quick summary:** Increase Inspire Fear's penalty to -5.
- **Phase 2 repository evidence:** Mapped repository record: `bd11bfb793096483` (Inspire Fear III)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED, PREREQUISITE_ERROR

**Canonical rules text**

As Inspire Fear I, except that the penalty increases to -5.

#### Notorious

- **Page:** 210
- **Prerequisites:** —
- **Quick summary:** When not disguised, reroll Persuasion checks to intimidate and keep the better result.
- **Phase 2 repository evidence:** Mapped repository record: `09744041cdcc9e22` (Notorious (Infamy))
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR

**Canonical rules text**

Your reputation as a crime lord is known throughout the galaxy, even on fringe worlds. When you are not disguised, you may reroll any Persuasion checks made to intimidate others, keeping the better result.

#### Shared Notoriety

- **Page:** 210
- **Prerequisites:** Notorious
- **Quick summary:** Your minions may reroll Persuasion checks to intimidate when invoking your name, keeping the reroll.
- **Phase 2 repository evidence:** Mapped repository record: `9491f34aad83dfb1` (Shared Notoriety)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When your minions invoke your name, others take note. If you have minions, they may reroll any Persuasion checks made to intimidate people, but the result of the reroll must be accepted even if it is worse.

### Mastermind

**Canonical tree key:** `Saga Edition Core Rulebook|Mastermind`

#### Attract Minion

- **Page:** 210
- **Prerequisites:** —
- **Quick summary:** You attract a loyal Minion. The Minion is a Nonheroic character with a Class Level equal to your heroic level - 2 (minimum 1).
- **Phase 2 repository evidence:** Mapped repository record: `2b31cb2ea7ad64b9` (Attract Minion)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You attract a loyal Minion. The Minion is a Nonheroic character with a Class Level equal to your heroic level - 2 (minimum 1). You may select this Talent multiple times; each time you select this Talent, you gain another Minion. Normally, you can have only one Minion with you at a time. Any other Minions you have are assumed to be looking after your various interests. If you lose a Minion, you can send for another Minion if you have one (although normal Travel Time still applies). Each Minion that accompanies you on an adventure is entitled to an equal share of the total Experience Points earned for that adventure. For example, a Minion that accompanies a party of five heroes on an adventure receives one-sixth of the XP that the group earns.

#### Impel Ally I

- **Page:** 210
- **Prerequisites:** |mpel Ally |
- **Quick summary:** You can spend a Swift Action to grant one ally the ability to move its normal speed. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted.
- **Phase 2 repository evidence:** Mapped repository record: `aa32a31a179fe5c1` (Impel Ally I)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can spend a Swift Action to grant one ally the ability to move its normal speed. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted.

#### Impel Ally II

- **Page:** 210
- **Prerequisites:** |mpel Ally |
- **Quick summary:** You can spend two Swift Actions to grant one ally the ability to take a Standard Action or Move Action. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted.
- **Phase 2 repository evidence:** Mapped repository record: `b11a87e70f957ed2` (Impel Ally II)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can spend two Swift Actions to grant one ally the ability to take a Standard Action or Move Action. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted.

### Weapon Master

**Canonical tree key:** `Saga Edition Core Rulebook|Weapon Master`

#### Controlled Burst

- **Page:** 212
- **Prerequisites:** —
- **Quick summary:** Reduce autofire/Burst Fire penalties; braced autofire-only weapons have no attack penalty.
- **Phase 2 repository evidence:** Mapped repository record: `3e35df4fce7082a3` (Controlled Burst)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Your penalty when making an autofire attack or using the Burst Fire feat is reduced to -2. In addition, if you brace an autofire-only weapon, you have no penalty on your attack roll.

#### Exotic Weapon Mastery

- **Page:** 212
- **Prerequisites:** —
- **Quick summary:** You are considered profi- stacks with the bonus granted by the Weapon Specialization talent fp; cient with any exotic weapon, even if you don't possess the 53).
- **Phase 2 repository evidence:** Mapped repository record: `fb103ac0e4501e95` (Exotic Weapon Mastery)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You are considered profi- stacks with the bonus granted by the Weapon Specialization talent fp; cient with any exotic weapon, even if you don't possess the 53). You must be proficient with the weapon to gain this benefit appropriate Exotic Weapon Proficiency feat. You may select this talent multiple times. Each time you select this tat

#### Greater Devastating Attack

- **Page:** 212
- **Prerequisites:** Greater Weapon Focus; Devastating Attack; Weapon Focus with the chosen weapon
- **Quick summary:** Treat a target's damage threshold as 10 lower with the chosen weapon, replacing Devastating Attack's effect.
- **Phase 2 repository evidence:** Mapped repository record: `d3b19d5e369f579d` (Greater Devastating Attack)
- **Phase 2 discrepancy flags:** CORE_TEXT_WITH_LATER_EXTENSION, PREREQUISITE_ERROR

**Canonical rules text**

Choose one exotic weapon or weapon group with which you are proficient. When you make a successful attack with the chosen weapon, treat the target's damage threshold as 10 points lower when determining the result of your attack. This replaces the effect of Devastating Attack for that weapon.

#### Greater Penetrating Attack

- **Page:** 212
- **Prerequisites:** Greater Weapon Focus; Penetrating Attack; Weapon Focus with the chosen weapon
- **Quick summary:** Treat a target's damage reduction as 10 lower with the chosen weapon, replacing Penetrating Attack's effect.
- **Phase 2 repository evidence:** Mapped repository record: `1718ec6cdf765a57` (Greater Penetrating Attack)
- **Phase 2 discrepancy flags:** PREREQUISITE_ERROR

**Canonical rules text**

Choose one exotic weapon or weapon group with which you are proficient. When you make a successful attack with the chosen weapon, treat the target's damage reduction as 10 points lower when determining the result of your attack. This replaces the effect of Penetrating Attack for that weapon.

#### Greater Weapon Focus

- **Page:** 212
- **Prerequisites:** Weapon Focus with the chosen weapon
- **Quick summary:** Gain another +1 attack with a chosen weapon, stacking with Weapon Focus.
- **Phase 2 repository evidence:** Mapped repository record: `642c6c8643db7470` (Greater Weapon Focus)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Choose one exotic weapon or weapon group with which you are proficient. You gain a +1 bonus on attack rolls with the chosen weapon. This bonus stacks with Weapon Focus. You may select this talent multiple times, applying it to a different weapon each time.

#### Greater Weapon Specialization

- **Page:** 212
- **Prerequisites:** Greater Weapon Focus; Weapon Focus with the chosen weapon; Weapon Specialization with the chosen weapon
- **Quick summary:** Gain another +2 damage with a chosen weapon, stacking with Weapon Specialization.
- **Phase 2 repository evidence:** Mapped repository record: `e9820b341bf94de1` (Greater Weapon Specialization)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED, PREREQUISITE_ERROR

**Canonical rules text**

Choose one exotic weapon or one of the following weapon groups: advanced melee weapons, heavy weapons, pistols, rifles, or simple weapons. You gain a +2 bonus on damage rolls with the chosen weapon. This stacks with Weapon Specialization. You may select this talent multiple times for different weapons.

#### Multiattack Proficiency (heavy weapons)

- **Page:** 212
- **Prerequisites:** —
- **Quick summary:** Reduce full-attack penalties with heavy weapons by 2; stacks with repeated selections.
- **Phase 2 repository evidence:** No correct-tree repository record certified in Phase 2
- **Phase 2 discrepancy flags:** MISSING_CONTENT

**Canonical rules text**

Whenever you make multiple attacks with any type of heavy weapon as a full attack action, you reduce the penalty on your attack rolls by 2. You can take this talent multiple times; each time, reduce the penalty by an additional 2.

#### Multiattack Proficiency (rifles)

- **Page:** 212
- **Prerequisites:** —
- **Quick summary:** Reduce full-attack penalties with rifles by 2; stacks with repeated selections.
- **Phase 2 repository evidence:** Mapped repository record: `5ec84c7e500601e4` (Multiattack Proficiency (rifles))
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you make multiple attacks with any type of rifle as a full attack action, you reduce the penalty on your attack rolls by 2. You can take this talent multiple times; each time, reduce the penalty by an additional 2.

### Dark Side Devotee

**Canonical tree key:** `Saga Edition Core Rulebook|Dark Side Devotee`

#### Channel Aggression

- **Page:** 213
- **Prerequisites:** —
- **Quick summary:** If you succeed on an attack against a Flanked opponent, or any target that is denied its Dexterity bonus to Reflex Defense, you may spend a Force Point as a Free Action to deal additional damage to the target equal to 1d6 per Class...
- **Phase 2 repository evidence:** Mapped repository record: `ef3ec55015c60bda` (Channel Aggression)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

If you succeed on an attack against a Flanked opponent, or any target that is denied its Dexterity bonus to Reflex Defense, you may spend a Force Point as a Free Action to deal additional damage to the target equal to 1d6 per Class Level (maximum 10d6).

#### Channel Anger

- **Page:** 213
- **Prerequisites:** Channel Aggression.
- **Quick summary:** You let your anger swell into a Rage. As a Swift Action, you may spend a Force Point to gain a +2 Rage bonus on melee attack rolls and melee damage rolls for a number of rounds equal to 5 + your Constitution modifier.
- **Phase 2 repository evidence:** Mapped repository record: `37ee909a7de54768` (Channel Anger)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You let your anger swell into a Rage. As a Swift Action, you may spend a Force Point to gain a +2 Rage bonus on melee attack rolls and melee damage rolls for a number of rounds equal to 5 + your Constitution modifier. At the end of this duration, you move -1 step along the Condition Track. While Raging, you cannot use Skills that require patience and concentration, such as Mechanics, Stealth, or Use the Force.

#### Crippling Strike

- **Page:** 213
- **Prerequisites:** Channel Aggression.
- **Quick summary:** Whenever you score a Critical Hit, you may spend a Force Point to also reduce the target's Speed by half until they are fully healed (that is, restored to maximum Hit Points).
- **Phase 2 repository evidence:** Mapped repository record: `8b3cb561c294fa11` (Crippling Strike)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you score a Critical Hit, you may spend a Force Point to also reduce the target's Speed by half until they are fully healed (that is, restored to maximum Hit Points).

#### Embrace the Dark Side

- **Page:** 213
- **Prerequisites:** Channel Aggression, Channel Anger.
- **Quick summary:** Whenever you use a Force Power with the [Dark Side] descriptor, you may reroll your Use the Force check, but you must accept the result of the reroll, even if it is worse.
- **Phase 2 repository evidence:** Mapped repository record: `8e1ee6d1c756450f96d4d5eaa9657e47` (Embrace the Dark Side)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you use a Force Power with the [Dark Side] descriptor, you may reroll your Use the Force check, but you must accept the result of the reroll, even if it is worse. Upon choosing this Talent, you can no longer use Force Powers with the [Light Side] descriptor.

### Force Adept

**Canonical tree key:** `Saga Edition Core Rulebook|Force Adept`

#### Force Power Adept

- **Page:** 214
- **Prerequisites:** —
- **Quick summary:** <p>You are skilled at using a particular Force Power. Select one Force Power you know.
- **Phase 2 repository evidence:** Mapped repository record: `90d9a2e7dbc160d1` (Force Power Adept)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

<p>You are skilled at using a particular Force Power. Select one Force Power you know. When using that Force Power, you have the option of spending a Force Point to make two Use the Force checks, keeping the better result.</p>
<p>This Talent may be selected multiple times. Its effects do not stack. Each time you select this Talent, you must choose a different Force Power.</p>

#### Force Treatment

- **Page:** 214
- **Prerequisites:** —
- **Quick summary:** <p>You can make a Use the Force check in place of a Treat Injury check. You are considered Trained in the Treat Injury Skill.
- **Phase 2 repository evidence:** Mapped repository record: `181da7f36b9fba9d` (Force Treatment)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

<p>You can make a Use the Force check in place of a Treat Injury check. You are considered Trained in the Treat Injury Skill. If you are entitled to a Treat Injury check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations).</p>
<p>In addition, you can administer First Aid, Treat Disease, Treat Poison, and Treat Radiation without the requisite Medical Kit or Medpac.</p>

#### Fortified Body

- **Page:** 214
- **Prerequisites:** Equilibrium (see page 101).
- **Quick summary:** <p>The Force shields you against ailments, toxins, and radiation poisoning, making you immune to Disease, Poison, and Radiation.</p>
- **Phase 2 repository evidence:** Mapped repository record: `6714ab8e28708f50` (Fortified Body)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

<p>The Force shields you against ailments, toxins, and radiation poisoning, making you immune to Disease, Poison, and Radiation.</p>

### Force Item

**Canonical tree key:** `Saga Edition Core Rulebook|Force Item`

#### Attune Weapon

- **Page:** 214
- **Prerequisites:** —
- **Quick summary:** <p>You may spend a Force Point to attune a melee weapon. Attuning the weapon takes a Full-Round Action.
- **Phase 2 repository evidence:** Mapped repository record: `aa9b67c6737c2549` (Attune Weapon)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

<p>You may spend a Force Point to attune a melee weapon. Attuning the weapon takes a Full-Round Action. From that point forward, whenever you wield the attuned weapon, you gain a +1 Force bonus on attack rolls.</p>
<p>The weapon is attuned to you alone; others who wield the weapon do not gain the Force bonus.</p>

#### Empower Weapon

- **Page:** 214
- **Prerequisites:** —
- **Quick summary:** <p>You may spend a Force Point to empower a melee weapon. Empowering the weapon takes a Full-Round Action.
- **Phase 2 repository evidence:** Mapped repository record: `5218d5971b78119b` (Empower Weapon)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

<p>You may spend a Force Point to empower a melee weapon. Empowering the weapon takes a Full-Round Action. From that point forward, the Empowered Weapon deals an additional die of damage, but only when wielded by you.</p>
<p>For example, an empowered Lightsaber deals 3d8 points of damage, instead of 2d8 points of damage. Others who wield the weapon do not gain the bonus damage die.</p>

#### Force Talisman

- **Page:** 214
- **Prerequisites:** —
- **Quick summary:** <p>You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you.
- **Phase 2 repository evidence:** Mapped repository record: `66b23ee79bd33bf1` (Force Talisman)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

<p>You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action.</p>
<p>While you wear or carry the Talisman on your person, you gain a +1 Force bonus to one of your Defenses (Reflex Defense, Fortitude Defense, or Will Defense).</p>
<p>You may only have one Force Talisman active at a given time, and if your Force Talisman is destroyed, you may not create another Force Talisman for 24 hours.</p>

#### Greater Force Talisman

- **Page:** 214
- **Prerequisites:** Force Talisman
- **Quick summary:** <p>You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you.
- **Phase 2 repository evidence:** Mapped repository record: `0c636cdbb63cdba3` (Greater Force Talisman)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

<p>You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action.</p>
<p>While you wear or carry the Talisman on your person, you gain a +1 Force bonus to all of your Defenses (Reflex Defense, Fortitude Defense, and Will Defense).</p>
<p>You may only have one Greater Force Talisman active at a given time, and if your Greater Force Talisman is destroyed, you may not create another Greater Force Talisman (or regular Force Talisman) for 24 hours.</p>

### Gunslinger

**Canonical tree key:** `Saga Edition Core Rulebook|Gunslinger`

#### Debilitating Shot

- **Page:** 216
- **Prerequisites:** —
- **Quick summary:** After aiming, a successful ranged hit also moves the target -1 condition step.
- **Phase 2 repository evidence:** Mapped repository record: `52f51a77fd60f56f` (Debilitating Shot)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR

**Canonical rules text**

If you aim before making a ranged attack and the attack hits, move the target -1 step along the condition track in addition to dealing damage.

#### Deceptive Shot

- **Page:** 216
- **Prerequisites:** —
- **Quick summary:** Select one target in line of sight within 6 squares.
- **Phase 2 repository evidence:** Mapped repository record: `b1afecfea833a2a5` (Deceptive Shot)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Select one target in line of sight within 6 squares. You can spend two Swift Actions on the same turn to make a Deception check; if the check result equals or exceeds the target's Will Defense, the target is denied its Dexterity bonus to Reflex Defense against your attacks until the beginning of your next turn.

#### Improved Quick Draw

- **Page:** 216
- **Prerequisites:** —
- **Quick summary:** If you are carrying a Pistol (either in your hand or in a holster), you may draw the Pistol and make a single attack during a Surprise Round, even if you are Surprised.
- **Phase 2 repository evidence:** Mapped repository record: `a1e013f8cfc15a86` (Improved Quick Draw)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

If you are carrying a Pistol (either in your hand or in a holster), you may draw the Pistol and make a single attack during a Surprise Round, even if you are Surprised. If you are not Surprised, you may take any single Action of your choice, as normal.

#### Knockdown Shot

- **Page:** 216
- **Prerequisites:** —
- **Quick summary:** If you Aim before making a ranged attack, and the attack hits, you knock the target Prone in addition to dealing damage.
- **Phase 2 repository evidence:** Mapped repository record: `92a32b96dacae82d` (Knockdown Shot)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

If you Aim before making a ranged attack, and the attack hits, you knock the target Prone in addition to dealing damage. You can't use this Talent to knock down targets two or more size categories bigger than you.

#### Multiattack Proficiency (pistols)

- **Page:** 216
- **Prerequisites:** —
- **Quick summary:** Reduce full-attack penalties with pistols by 2; stacks with repeated selections.
- **Phase 2 repository evidence:** Mapped repository record: `b812c197daea93fd` (Multiattack Proficiency (pistols))
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you make multiple attacks with any type of pistol as a full attack action, you reduce the penalty on your attack rolls by 2. You can take this talent multiple times; each time, reduce the penalty by an additional 2.

### Duelist

**Canonical tree key:** `Saga Edition Core Rulebook|Duelist`

#### Force Fortification

- **Page:** 218
- **Prerequisites:** —
- **Quick summary:** As a Reaction, you can spend a Force Point to negate a Critical Hit scored against you, taking normal damage instead.
- **Phase 2 repository evidence:** Mapped repository record: `be932caff635f8bc` (Force Fortification)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Reaction, you can spend a Force Point to negate a Critical Hit scored against you, taking normal damage instead. You can spend this Force Point even if you have already spent a Force Point earlier in the round.

#### Greater Weapon Focus (Lightsabers)

- **Page:** 218
- **Prerequisites:** Weapon Focus (lightsabers) feat (see page 89),
- **Quick summary:** You gain a +1 bonus on melee attack rolls with Lightsabers. This bonus stacks with the bonus granted by the Weapon Focus (Lightsabers) feat.
- **Phase 2 repository evidence:** Mapped repository record: `3038f4c26de19e39` (Greater Weapon Focus (Lightsabers))
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You gain a +1 bonus on melee attack rolls with Lightsabers. This bonus stacks with the bonus granted by the Weapon Focus (Lightsabers) feat.

#### Greater Weapon Specialization (Lightsabers)

- **Page:** 218
- **Prerequisites:** Greater Weapon Focus (lightsabers); Weapon Focus (lightsabers); Weapon Specialization (lightsabers)
- **Quick summary:** Gain another +2 lightsaber melee damage, stacking with Weapon Specialization.
- **Phase 2 repository evidence:** Mapped repository record: `9cda854b5448414f` (Greater Weapon Specialization (Lightsabers))
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR

**Canonical rules text**

You gain a +2 bonus on melee damage rolls with lightsabers. This bonus stacks with Weapon Specialization (lightsabers).

#### Multiattack Proficiency (lightsabers)

- **Page:** 218
- **Prerequisites:** —
- **Quick summary:** Whenever you make multiple attacks with any type of Lightsaber as part of a Full Attack, you reduce the penalty on your attack rolls by 2.
- **Phase 2 repository evidence:** Mapped repository record: `317400e9ea2b66c7` (Multiattack Proficiency (Lightsabers))
- **Phase 2 discrepancy flags:** TREE_ERROR

**Canonical rules text**

Whenever you make multiple attacks with any type of Lightsaber as part of a Full Attack, you reduce the penalty on your attack rolls by 2. You can take this Talent multiple times; each time you take this Talent, you reduce the penalty on your attack rolls by an additional 2.

#### Severing Strike

- **Page:** 218
- **Prerequisites:** —
- **Quick summary:** When a lightsaber hit would kill, you can instead maim the target: half damage, -1 condition step, and sever an arm or leg with lasting penalties.
- **Phase 2 repository evidence:** Mapped repository record: `efd3308a8ccc22c6` (Severing Strike)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When lightsaber damage equals or exceeds both the target's current hit points and damage threshold, you may deal half damage instead, move the target -1 step on the condition track, and sever one arm or leg. A severed arm prevents use of that hand and imposes -5 on Strength- and Dexterity-based checks and skills. A severed leg knocks the target prone, halves speed and carrying capacity, and imposes the same -5 penalty. The injury is a persistent condition that can be removed by successful surgery; a cybernetic replacement negates these reductions and penalties.

### Lightsaber Forms

**Canonical tree key:** `Saga Edition Core Rulebook|Lightsaber Forms`

#### Ataru

- **Page:** 218
- **Prerequisites:** —
- **Quick summary:** Use Dexterity instead of Strength for lightsaber damage, including doubled Dexterity when wielded two-handed.
- **Phase 2 repository evidence:** Mapped repository record: `0b3f4075ed84aee0` (Ataru)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

You may add your Dexterity bonus instead of your Strength bonus on damage rolls when wielding a lightsaber. When you wield a lightsaber two-handed, you may apply double your Dexterity bonus instead of double your Strength bonus to the damage.

#### Djem So

- **Page:** 218
- **Prerequisites:** —
- **Quick summary:** Once per round after a melee hit, spend a Force Point to immediately attack that opponent.
- **Phase 2 repository evidence:** Mapped repository record: `9dfce712a60a097f` (Djem So)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

Once per round when an opponent hits you with a melee attack, you may spend a Force Point as a reaction to make an immediate attack against that opponent.

#### Jar'Kai

- **Page:** 218
- **Prerequisites:** Lightsaber Defense; Niman
- **Quick summary:** Double Lightsaber Defense's deflection bonus while wielding two lightsabers.
- **Phase 2 repository evidence:** Mapped repository record: `4552785ad56d90d4` (Jar'Kai)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

When you use the Lightsaber Defense talent, you gain twice the normal deflection bonus to your Reflex Defense when you are wielding two lightsabers.

#### Juyo

- **Page:** 218
- **Prerequisites:** Weapon Focus (lightsabers); Weapon Specialization (lightsabers); base attack bonus +10
- **Quick summary:** Spend a Force Point to mark one enemy and reroll your first attack against it each round for the encounter.
- **Phase 2 repository evidence:** Mapped repository record: `5fd19be0deca1115` (Juyo)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

Once per encounter, you may spend a Force Point as a swift action to designate a single enemy in your line of sight. For the remainder of the encounter, you may reroll your first attack roll each round against that opponent, keeping the better result.

#### Makashi

- **Page:** 218
- **Prerequisites:** Lightsaber Defense
- **Quick summary:** With one one-handed lightsaber, increase Lightsaber Defense's deflection bonus by 2, up to +5.
- **Phase 2 repository evidence:** Mapped repository record: `8ddbb7f6d4a11725` (Makashi)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

When wielding a single lightsaber in one hand, the deflection bonus you gain from Lightsaber Defense increases by 2, to a maximum of +5.

#### Niman

- **Page:** 218
- **Prerequisites:** —
- **Quick summary:** Gain +1 Reflex and Will Defense while wielding a lightsaber.
- **Phase 2 repository evidence:** Mapped repository record: `7842befd5a8713c5` (Niman)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

When wielding a lightsaber, you gain a +1 bonus to your Reflex Defense and Will Defense.

#### Shien

- **Page:** 218
- **Prerequisites:** Deflect; Redirect Shot
- **Quick summary:** Gain +5 on Redirect Shot attacks.
- **Phase 2 repository evidence:** Mapped repository record: `e0223a2b572f2ef5` (Shien)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

Whenever you redirect a deflected blaster bolt with Redirect Shot, you gain a +5 bonus on your ranged attack roll.

#### Shii-Cho

- **Page:** 219
- **Prerequisites:** Block; Deflect
- **Quick summary:** Repeated Block/Deflect attempts impose -2 each instead of -5.
- **Phase 2 repository evidence:** Mapped repository record: `c116f6249f4f47c9` (Shii-Cho)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

When using the Block or Deflect talents, you only take a -2 penalty on your Use the Force check for every previous Block or Deflect attempt since your last turn.

#### Sokan

- **Page:** 219
- **Prerequisites:** Acrobatic Recovery
- **Quick summary:** Take 10 when tumbling under pressure, and threatened/occupied squares cost only 1 square of movement.
- **Phase 2 repository evidence:** Mapped repository record: `c95b1077ab31f9b0` (Sokan)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

You may take 10 on Acrobatics checks to tumble even when distracted or threatened. Additionally, each threatened or occupied square that you tumble through only counts as 1 square of movement.

#### Soresu

- **Page:** 219
- **Prerequisites:** Block; Deflect
- **Quick summary:** Reroll a failed Use the Force check for Block or Deflect.
- **Phase 2 repository evidence:** Mapped repository record: `af8c6f9b6c06b448` (Soresu)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

You may reroll a failed Use the Force check when using the Block or Deflect talents.

#### Trakata

- **Page:** 219
- **Prerequisites:** Weapon Focus (lightsabers); Weapon Specialization (lightsabers); base attack bonus +12
- **Quick summary:** Spend two swift actions to feint with a lightsaber using Deception.
- **Phase 2 repository evidence:** Mapped repository record: `629a0efa292511b7` (Trakata)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

When wielding a lightsaber, you may spend two swift actions to make a Deception check to feint in combat by quickly shutting off and reigniting the blade.

#### Vaapad

- **Page:** 219
- **Prerequisites:** Juyo; Weapon Focus (lightsabers); Weapon Specialization (lightsabers); base attack bonus +12
- **Quick summary:** Lightsaber attacks threaten critical hits on natural 19-20, though 19 is not an automatic hit.
- **Phase 2 repository evidence:** Mapped repository record: `87c0a929a04eb870` (Vaapad)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR, NONCANONICAL_ACTIVE_FORM_RESTRICTION

**Canonical rules text**

When attacking with a lightsaber, you score a critical hit on a natural roll of 19 or 20. A natural 19 is not an automatic hit; if a natural 19 still misses, you do not score a critical hit.

### Military Tactics

**Canonical tree key:** `Saga Edition Core Rulebook|Military Tactics`

#### Assault Tactics

- **Page:** 222
- **Prerequisites:** —
- **Quick summary:** Move action and DC 15 Tactics: you and allies deal +1d6 damage to one designated target until your next turn.
- **Phase 2 repository evidence:** Mapped repository record: `d9fe8a0c76d845d4` (Assault Tactics)
- **Phase 2 discrepancy flags:** DESCRIPTION_ERROR

**Canonical rules text**

As a move action, you may designate a single creature or object in line of sight as the target of an assault. If you succeed on a DC 15 Knowledge (tactics) check, you and all allies able to hear and understand you deal +1d6 damage to that target with each successful melee or ranged attack until the start of your next turn. This is a mind-affecting effect.

#### Deployment Tactics

- **Page:** 221
- **Prerequisites:** —
- **Quick summary:** You can use your tactical knowledge to direct allies in battle. As a Move Action, you can make a DC 15 Knowledge (Tactics) check.
- **Phase 2 repository evidence:** Mapped repository record: `8a5f8b5c9b9fabaf` (Deployment Tactics)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can use your tactical knowledge to direct allies in battle. As a Move Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you and any allies that can see, hear, and understand you gain a +1 competence bonus on attack rolls against Flanked opponents, or a +1 dodge bonus to Reflex Defense against Attacks of Opportunity (character's choice). The bonus lasts until the start of your next turn. This is a Mind-Affecting effect. If you have the Born Leader Talent or the Battle Analysis Talent, the bonus granted by this Talent increases to +2.

#### Field Tactics

- **Page:** 222
- **Prerequisites:** Deployment Tactics.
- **Quick summary:** You know how to use existing terrain to your best advantage. By using a Move Action, you can make a DC 15 Knowledge (Tactics) check.
- **Phase 2 repository evidence:** Mapped repository record: `5bdbf0148a6eb7b0` (Field Tactics)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You know how to use existing terrain to your best advantage. By using a Move Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, you and all allies within 10 squares of you can use whatever Cover is available to gain a +10 Cover bonus to Reflex Defense (instead of the normal +5 Cover bonus). Allies must be able to hear and understand you to gain this benefit, and the bonus lasts until the start of your next turn. This Talent provides no benefit to anyone who doesn't have Cover. This is a Mind-Affecting effect.

#### One for the Team

- **Page:** 221
- **Prerequisites:** Deployment Tactics.
- **Quick summary:** As a Reaction, you can choose to take one-half or all of the damage dealt to an adjacent ally by a single attack.
- **Phase 2 repository evidence:** Mapped repository record: `f7ddece8fd2141f5` (One for the Team)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Reaction, you can choose to take one-half or all of the damage dealt to an adjacent ally by a single attack. Similarly, as a Reaction, an adjacent ally can choose to take one-half or all of the damage dealt to you by a single attack (even if they don't have this Talent).

#### Outmaneuver

- **Page:** 222
- **Prerequisites:** Deployment Tactics, Field Tactics.
- **Quick summary:** An Officer learns to counter the tactics of their enemies. As a Standard Action, you can make a DC 15 Knowledge (Tactics) check.
- **Phase 2 repository evidence:** Mapped repository record: `95697c5a4459d7e4` (Outmaneuver)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

An Officer learns to counter the tactics of their enemies. As a Standard Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, opponents in your line of sight lose all competence, insight, and morale bonuses on attack rolls, as well as any dodge bonuses to Reflex Defense, until the start of your next turn. If one or more enemy Officers are within your line of sight, the highest level Officer among them can attempt to Oppose your Knowledge (Tactics) check as a Reaction. If their Skill Check result is higher than yours, your attempt to Outmaneuver your opponents fails.

#### Shift Defense I

- **Page:** 222
- **Prerequisites:** Shift Defense 1, Shift Defense Il
- **Quick summary:** As a Swift Action, you can take a -2 penalty to one Defense (Reflex, Fortitude, or Will) to gain a +1 competence bonus to another Defense until the start of your next turn.
- **Phase 2 repository evidence:** Mapped repository record: `cb981391d4d16c59` (Shift Defense I)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a Swift Action, you can take a -2 penalty to one Defense (Reflex, Fortitude, or Will) to gain a +1 competence bonus to another Defense until the start of your next turn.

#### Shift Defense II

- **Page:** 222
- **Prerequisites:** Shift Defense I
- **Quick summary:** Trade -5 to one defense for +2 competence to another defense until your next turn.
- **Phase 2 repository evidence:** Mapped repository record: `c6739fcf6d2107d6` (Shift Defense II)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a swift action, you can take a -5 penalty to one defense (Reflex, Fortitude, or Will) to gain a +2 competence bonus to another defense until the start of your next turn.

#### Shift Defense III

- **Page:** 222
- **Prerequisites:** Shift Defense I; Shift Defense II
- **Quick summary:** Gain +5 competence to one defense by taking -5 to the other two.
- **Phase 2 repository evidence:** Mapped repository record: `6996c6ba09d63ab7` (Shift Defense III)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

As a swift action, you can gain a +5 competence bonus to one defense (Reflex, Fortitude, or Will) by taking a -5 penalty to your other two defenses.

#### Tactical Edge

- **Page:** 222
- **Prerequisites:** —
- **Quick summary:** Use Assault, Deployment, or Field Tactics as a swift action instead of a move action.
- **Phase 2 repository evidence:** Mapped repository record: `b6287de11cbb4bef` (Tactical Edge)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can use the Assault Tactics, Deployment Tactics, or Field Tactics talent as a swift action instead of a move action, provided you have the talent in question.

### Sith

**Canonical tree key:** `Saga Edition Core Rulebook|Sith`

#### Dark Healing

- **Page:** 223
- **Prerequisites:** —
- **Quick summary:** You can spend a Force Point to heal wounds by drawing life energy from another creature within 6 squares of you.
- **Phase 2 repository evidence:** Mapped repository record: `008b28849b74234d` (Dark Healing)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can spend a Force Point to heal wounds by drawing life energy from another creature within 6 squares of you. Using this ability is a Standard Action, and you must succeed on a ranged attack roll. If the attack equals or exceeds the target's Fortitude Defense, you deal 1d6 points of damage per Class Level to the target, and you heal an equal amount of damage. If the attack fails, there is no effect.

#### Dark Scourge

- **Page:** 223
- **Prerequisites:** —
- **Quick summary:** You have dedicated your life to wiping out the Jedi, and your hatred of them knows no bounds. Against Jedi characters (that is, characters belonging to The Jedi), you gain a +1 Dark Side bonus on attack rolls.
- **Phase 2 repository evidence:** Mapped repository record: `08fc3247755c5ebe` (Dark Scourge)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You have dedicated your life to wiping out the Jedi, and your hatred of them knows no bounds. Against Jedi characters (that is, characters belonging to The Jedi), you gain a +1 Dark Side bonus on attack rolls.

#### Dark Side Adept

- **Page:** 223
- **Prerequisites:** —
- **Quick summary:** Force Powers that are strongly tied to The Dark Side flow through you more easily.
- **Phase 2 repository evidence:** Mapped repository record: `cfdd73f3d939799d` (Dark Side Adept)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Force Powers that are strongly tied to The Dark Side flow through you more easily. You can reroll any Use the Force check made when activating Force Powers with the [Dark Side] descriptor, but you must keep the result of the reroll, even if it is worse.

#### Dark Side Master

- **Page:** 223
- **Prerequisites:** Dark Side Adept.
- **Quick summary:** As Dark Side Adept (see above), except that you can spend a Force Point and keep the better of the two Use the Force checks,
- **Phase 2 repository evidence:** Mapped repository record: `d4fe49ef1701891e` (Dark Side Master)
- **Phase 2 discrepancy flags:** CORE_TEXT_WITH_LATER_EXTENSION

**Canonical rules text**

As Dark Side Adept (see above), except that you can spend a Force Point and keep the better of the two Use the Force checks,

#### Force Deception

- **Page:** 223
- **Prerequisites:** —
- **Quick summary:** Use Use the Force instead of Deception and count as trained in Deception.
- **Phase 2 repository evidence:** Mapped repository record: `a40e25585a6f8c2b` (Force Deception)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can use your Use the Force check modifier instead of your Deception check modifier when making Deception checks. You are considered trained in Deception for purposes of using this talent. If you are entitled to a Deception check reroll, you may reroll your Use the Force check instead, subject to the same circumstances and limitations.

#### Improved Dark Healing

- **Page:** 224
- **Prerequisites:** Dark Healing.
- **Quick summary:** Your Dark Healing Talent improves. The range of this ability increases to 12 squares, and even if that attack fails, the target takes half damage, while you heal an equal amount of damage.
- **Phase 2 repository evidence:** Mapped repository record: `b03db168b3f23da0` (Improved Dark Healing)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Your Dark Healing Talent improves. The range of this ability increases to 12 squares, and even if that attack fails, the target takes half damage, while you heal an equal amount of damage.

#### Wicked Strike

- **Page:** 224
- **Prerequisites:** Weapon Focus (lightsabers) feat (see page 89), Weapon Specialization (lightsabers) (see page 41).
- **Quick summary:** When you score a critical hit with a Lightsaber, you may spend a Force Point to move the target -2 steps along the Condition Track.
- **Phase 2 repository evidence:** Mapped repository record: `d350b28e72652d29` (Wicked Strike)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

When you score a critical hit with a Lightsaber, you may spend a Force Point to move the target -2 steps along the Condition Track.

---




## Book 3 — Rebellion Era Campaign Guide

**Phase 3B status:** COMPLETE — 64 owned canonical identities; 21 UPDATE_CONTENT; 37 UPDATE_METADATA; 3 REMOVE_CONTAMINATION; 2 CREATE; 1 IDENTITY_SPLIT.

### Jedi Consular

#### Guiding Strikes

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** When you deal damage to a target by making a Lightsaber attack on your turn, you can use a Swift Action before the end of your turn to activate this Talent.
- **Production record:** `e797ad357746be9f`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you deal damage to a target by making a Lightsaber attack on your turn, you can use a Swift Action before the end of your turn to activate this Talent. If you do so, allies adjacent to the target at the time you make the attack gain a +2 circumstance bonus to melee attack rolls against the target until the start of your next turn.

#### Recall

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** Whenever you spend a Force Point to return a Force Power to your Force Power Suite, you regain two Force Powers instead of one.
- **Production record:** `0890f9e1c0858993`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you spend a Force Point to return a Force Power to your Force Power Suite, you regain two Force Powers instead of one.

### Jedi Guardian

#### Close Maneuvering

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** Once per turn, you can use a Swift Action to designate a target.
- **Production record:** `7355c8afe9509dad`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per turn, you can use a Swift Action to designate a target. Until the start of your next turn, your movement does not provoke Attacks of Opportunity from that target, provided that you end your movement adjacent to that target.

#### Immovable

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** You can activate this Talent as a Swift Action.
- **Production record:** `14306c13238ccb83`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You can activate this Talent as a Swift Action. Until the start of your next turn, anyone attempting to move you involuntarily, such as with a Bantha Rush or the Move Object Force Power, takes a -5 penalty to attack rolls or Skill Checks made to use that effect that would move you. An enemy can only take the penalty from this Talent once per attempt, regardless of how many targets have used this Talent.

### Jedi Sentinel

#### Gradual Resistance

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** If you take damage from the use of a Force Power, until the end of the encounter you gain a +2 Force bonus to all Defenses against that Force Power.
- **Production record:** `291937f2d45a01bc`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you take damage from the use of a Force Power, until the end of the encounter you gain a +2 Force bonus to all Defenses against that Force Power.

#### Reap Retribution

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** If you take damage from the use of a Force Power, until the end of the encounter you deal an extra 2 points of damage against the creature that used the Force Power against you.
- **Production record:** `902c2cef66cf4df6`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you take damage from the use of a Force Power, until the end of the encounter you deal an extra 2 points of damage against the creature that used the Force Power against you.

### Leadership

#### Unwavering Ally

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Once per turn, as a Swift Action, you can designate one ally within your line of sight who can hear and understand you.
- **Production record:** `5ea6368fd61de9f1`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per turn, as a Swift Action, you can designate one ally within your line of sight who can hear and understand you. Until the start of your next turn, that ally becomes immune to all effects that render the ally Flat-Footed or that deny the ally a Dexterity bonus to his or her Reflex Defense.

### Lightsaber Combat

#### Precise Redirect

- **Page:** 24
- **Prerequisites:** Redirect Shot
- **Quick summary:** Whenever you successfully Redirect a blaster bolt and hit your target, the redirected attack deals +1 die of damage.
- **Production record:** `515d69c71897e431`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully redirect a blaster bolt and hit your target, the redirected attack deals +1 die of damage.

### Ambusher

#### Ambush Specialist

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** If you are not Surprised on the first round of combat in an encounter, you can treat the first round of combat as if it were the Surprise Round for the purposes of Talents and Feats that trigger only during the...
- **Production record:** `e835b21a01ae2ee7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you are not Surprised on the first round of combat in an encounter, you can treat the first round of combat as if it were the Surprise Round for the purposes of Talents and Feats that trigger only during the Surprise Round.

Additionally, during the Surprise Round as a Free Action you can designate a target as your Prime Target. You gain a +2 morale bonus to attack rolls against your Prime Target until the end of the encounter.

#### Destructive Ambusher

- **Page:** 28
- **Prerequisites:** Ambush Specialist
- **Quick summary:** After choosing your prime target, attacks against it deal +1 damage die for the rest of the encounter.
- **Production record:** `5d608b1083cfc31d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

After you designate a prime target, you deal +1 die of damage on attacks against the prime target until the end of the encounter.

#### Keep It Going

- **Page:** 28
- **Prerequisites:** Ambush Specialist
- **Quick summary:** If you reduce your Prime Target to 0 Hit Points, as a Free Action you can designate another target within your line of sight as your new Prime Target.
- **Production record:** `34f21902e365a861`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you reduce your Prime Target to 0 Hit Points, as a Free Action you can designate another target within your line of sight as your new Prime Target. This new target remains your Prime Target until the end of the encounter.

#### Keep Them Reeling

- **Page:** 28
- **Prerequisites:** Ambush Specialist
- **Quick summary:** Swift action: beat your prime target's Initiative to make it flat-footed against your attacks this turn.
- **Production record:** `24bf81bc6d74fafd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn as a swift action, you can make an Initiative check, opposed by the Initiative check of your prime target. If your check result equals or exceeds your prime target's check result, your target is flat-footed against all attacks you make before the end of your turn.

#### Perceptive Ambusher

- **Page:** 28
- **Prerequisites:** Ambush Specialist
- **Quick summary:** You gain a +5 circumstance bonus to Perception checks against your Prime Target until the end of the encounter.
- **Production record:** `f4c2b1e5cdf5551a`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You gain a +5 circumstance bonus to Perception checks against your Prime Target until the end of the encounter.

#### Spring the Trap

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** If you and all your allies roll higher Initiative checks to start combat than do all your opponents, you automatically gain a Surprise Round, even if the opponents are aware of you when combat begins.
- **Production record:** `c2b0b6dcba513cca`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you and all your allies roll higher Initiative checks to start combat than do all your opponents, you automatically gain a Surprise Round, even if the opponents are aware of you when combat begins.

### Gambling Leader

#### Assault Gambit

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** Once per turn, as a Standard Action, you can designate one ally and one enemy that have line of effect to each other.
- **Production record:** `ea9a4f110f5d2d8d`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per turn, as a Standard Action, you can designate one ally and one enemy that have line of effect to each other. The ally and the enemy make opposed Initiative checks, and the winner can make a single immediate melee or ranged attack against the loser. No character can benefit from this Talent more than once per round.

#### Direct Fire

- **Page:** 24
- **Prerequisites:** Assault Gambit
- **Quick summary:** Once per turn, designate an ally to ignore one uncovered target's cover bonus to Reflex Defense until your next turn.
- **Production record:** `c64393b9304034ab`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn, as a swift action, you can designate one ally and one target that does not have cover from you. Until the start of your next turn, the ally you designate ignores that target's cover bonuses to Reflex Defense.

#### Face the Foe

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** If you do not have Cover from a target, you gain a +1 morale bonus to attack rolls against that target.
- **Production record:** `cbdedc32ac362634`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you do not have Cover from a target, you gain a +1 morale bonus to attack rolls against that target.

#### Lead From the Front

- **Page:** 24
- **Prerequisites:** Face the Foe
- **Quick summary:** If you do not have Cover from a target that you damaged with a ranged attack, all your allies gain a +2 morale bonus to attack rolls against that target and a +5 circumstance bonus to opposed Initiative checks...
- **Production record:** `a67a1a657fe5665c`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you do not have Cover from a target that you damaged with a ranged attack, all your allies gain a +2 morale bonus to attack rolls against that target and a +5 circumstance bonus to opposed Initiative checks against that target until the start of your next turn.

#### Luck Favors the Bold

- **Page:** 24
- **Prerequisites:** Face the Foe
- **Quick summary:** If at least one enemy within your line of sight is aware of you and you do not have Cover against that enemy, at the start of your turn if you are conscious you gain a number of Bonus Hit Points equal to 5 + one-half...
- **Production record:** `c2447676a43a70a2`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If at least one enemy within your line of sight is aware of you and you do not have Cover against that enemy, at the start of your turn if you are conscious you gain a number of Bonus Hit Points equal to 5 + one-half your Heroic Level. Damage is subtracted from Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter are lost. Bonus Hit Points do not stack.

### Improviser

#### Bigger Bang

- **Page:** 43
- **Prerequisites:** Improvised Device
- **Quick summary:** Grenades made with Improvised Device deal +1 damage die.
- **Production record:** `dc61d67946b1c1d6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you create a grenade with the Improvised Device talent, the grenade deals an additional die of damage when used.

#### Capture Droid

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, you can use this Talent on an adjacent enemy Droid that has been reduced to 0 Hit Points or moved to the bottom of the Condition Track, but not destroyed.
- **Production record:** `9ae263137f27e220`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can use this Talent on an adjacent enemy Droid that has been reduced to 0 Hit Points or moved to the bottom of the Condition Track, but not destroyed.

As a Standard Action, make a Mechanics check against the Droid's Will Defense. If your result equals or exceeds the Droid's Will Defense, the Droid moves +2 steps on the Condition Track, regains 1d8 Hit Points, becomes your ally, and it's Attitude toward you immediately shifts to Friendly.

The Droid fights on your side until the end of the encounter, at which point it is destroyed.

#### Custom Model

- **Page:** 43
- **Prerequisites:** Improvised Device, Tech Specialist
- **Quick summary:** Whenever you create a device with the Improvised Device Talent, you can apply one modification granted by the Tech Specialist Feat to the device. This customization does not affect the value of the item being created.
- **Production record:** `b8472ec0498d2c20`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you create a device with the Improvised Device Talent, you can apply one modification granted by the Tech Specialist Feat to the device. This customization does not affect the value of the item being created.

#### Improved Jury-Rig

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** You can use the Jury-Rig application of the Mechanics Skill as a Standard Action instead of as a Full-Round Action.
- **Production record:** `6e3c1c77acfb0141`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You can use the Jury-Rig application of the Mechanics Skill as a Standard Action instead of as a Full-Round Action. Additionally, you are not required to make a Skill Check to successfully Jury-Rig a device or Vehicle, and the device or Vehicle moves +3 steps on the Condition Track instead of +2.

#### Improvised Device

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** You can create a temporary piece of almost any type of Equipment from the spare parts you have around.
- **Production record:** `84d4e92693185028`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can create a temporary piece of almost any type of Equipment from the spare parts you have around. To do so, you must make a DC 25 Mechanics check and spend one hour building the device. The object can have a maximum value of 200 credits x your Class Level, it cannot have an availability of Rare or Illegal, and it cannot be unique.

The device you create must be something that you would be reasonably familiar with, and after 24 hours the object is destroyed. You can use this Talent once per day.

### Pathfinder

#### Bunker Blaster

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** If adjacent cover can protect you from a target, you can Aim at that target as a move action.
- **Production record:** `cc96a480b69ddc59`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you are adjacent to an object that can provide you with cover from a target, you can aim at that target as a move action.

#### Defensive Measures

- **Page:** 45
- **Prerequisites:** Safe Zone
- **Quick summary:** All enemies treat your Safe Zone as difficult terrain.
- **Production record:** `67186d921e94d636`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

All enemies treat your Safe Zone as difficult terrain.

#### Enhance Cover

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** As a Swift Action, you can designate a single ally within your line of sight who has Cover from one or more enemies.
- **Production record:** `1d50b01d5151c3eb`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Swift Action, you can designate a single ally within your line of sight who has Cover from one or more enemies. That ally is considered instead to have Improved Cover against those enemies until the start of your next turn as long as the ally still has Cover.

#### Escort Fighter

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** You can spend a Swift Action to designate one adjacent ally.
- **Production record:** `0991f4321b429bf5`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You can spend a Swift Action to designate one adjacent ally. Until the start of your next turn, if you move, that ally can also move the same number of squares, provided that the ally ends its movement adjacent to you. You cannot move a distance greater than the ally's speed.

#### Launch Point

- **Page:** 45
- **Prerequisites:** Safe Zone
- **Quick summary:** Any ally who starts his or her turn within your Safe Zone and then exits the Safe Zone gains a +2 bonus to attack rolls before the end of that ally's turn, provided that the ally is not within your Safe Zone when the...
- **Production record:** `9aa564522f427214`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Any ally who starts his or her turn within your Safe Zone and then exits the Safe Zone gains a +2 bonus to attack rolls before the end of that ally's turn, provided that the ally is not within your Safe Zone when the attack is made.

#### Obscuring Defenses

- **Page:** 45
- **Prerequisites:** Safe Zone
- **Quick summary:** Enemies firing into your Safe Zone take a -2 penalty to attack rolls.
- **Production record:** `07174b444852424c`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Enemies firing into your Safe Zone take a -2 penalty to attack rolls.

#### Relocate

- **Page:** 45
- **Prerequisites:** Safe Zone
- **Quick summary:** You can dismiss your Safe Zone as a Swift Action, ending its current effects.
- **Production record:** `68e476fdeb434b01`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You can dismiss your Safe Zone as a Swift Action, ending its current effects. Any allies in the space your Safe Zone was occupying gain a +2 bonus to their Speed until the start of your next turn. When you use this Talent, you cannot create a new Safe Zone until the start of your next turn.

#### Safe Passage

- **Page:** 45
- **Prerequisites:** Escort Fighter
- **Quick summary:** Once per turn, you can spend a Move Action to allow one ally within line of sight to move up to its speed as a Reaction.
- **Production record:** `e857b1e13073b0a9`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per turn, you can spend a Move Action to allow one ally within line of sight to move up to its speed as a Reaction. If a target makes an Attack of Opportunity against the ally during its movement, you can make an Attack of Opportunity against that target.

#### Safe Zone

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** As a Standard Action, you can identify a Safe Zone, within which your allies gain certain advantages.
- **Production record:** `5989079457c8a3cf`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a Standard Action, you can identify a Safe Zone, within which your allies gain certain advantages. You designate a 4-by-4 square area of the combat area as a Safe Zone; at least 1 square of the Safe Zone must be the square you currently occupy. Each ally who starts his or her turn within the Safe Zone gains a +2 circumstance bonus to his or her Fortitude Defense and Will Defense until the start of the ally's next turn. The Safe Zone lasts until the end of the encounter, and you can have only one Safe Zone in effect at a time.

You can create a new Safe Zone as a Standard Action, dismissing the old Safe Zone and replacing it with the new one, but no square of the old Safe Zone can overlap with any square of the new Safe Zone. You cannot create a Safe Zone in a space that overlaps another Pathfinder's Safe Zone.

#### Zone of Recuperation

- **Page:** 45
- **Prerequisites:** Safe Zone
- **Quick summary:** Any ally who catches a Second Wind while within your Safe Zone regains a number of additional Hit Points equal to your Class Level.
- **Production record:** `a68be9fa4ffe98af`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Any ally who catches a Second Wind while within your Safe Zone regains a number of additional Hit Points equal to your Class Level.

### Procurement

#### Black Market Buyer

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** When seeking an item from the Black Market, you do not need to make a Gather Information check to locate a Black Market merchant; you automatically succeed.
- **Production record:** `c006a4be6de26139`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When seeking an item from the Black Market, you do not need to make a Gather Information check to locate a Black Market merchant; you automatically succeed.

#### Excellent Kit

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** You always make sure that your allies have the best gear available.
- **Production record:** `85318987b48d5caa`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You always make sure that your allies have the best gear available. Whenever you purchase Weapons, Armor, or other Equipment (either legally or through the Black Market), all gear you purchase has 50% more Hit Points than normal and has 5 more DR than normal.

In addition, whenever one of your allies makes a Mechanics check on an object that you purchased, that ally gains a +2 Equipment bonus to the check.

#### Just What Is Needed

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** You have a knack for finding the best quality replacement parts for broken Equipment.
- **Production record:** `5cd160036d6bba05`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have a knack for finding the best quality replacement parts for broken Equipment. Whenever you use the Repair application of the Mechanics skill, you restore an extra 1d8 Hit Points with a successful Mechanics check, in addition to what you would normally restore.

If you use the Aid Another Action to assist an ally with Repairs, that ally also Repairs an extra 1d8 Hit Points with a successful Mechanics check. Any ally can only benefit from this Talent once per Mechanics check, regardless of how many allies with this Talent aid on the check.

#### Only the Finest

- **Page:** 43
- **Prerequisites:** Black Market Buyer
- **Quick summary:** Whenever you purchase goods through the Black Market, you can obtain items that have been modified with the Tech Specialist feat without increasing the base value of the items.
- **Production record:** `b5eba49d8305b689`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you purchase goods through the Black Market, you can obtain items that have been modified with the Tech Specialist feat without increasing the base value of the items.

#### Right Gear for the Job

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** Once per day when an ally makes an Untrained skill check, as a Reaction you can grant that ally a +5 Equipment bonus to the check, and the ally is considered Trained in that Skill for the purpose of using...
- **Production record:** `f09f37cda0fc10e1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per day when an ally makes an Untrained skill check, as a Reaction you can grant that ally a +5 Equipment bonus to the check, and the ally is considered Trained in that Skill for the purpose of using Trained-only applications of the Skill.

You cannot use this Talent to allow an ally to make an Untrained Use the Force check.

### Rebel Recruiter

#### Bolstered Numbers

- **Page:** 40
- **Prerequisites:** Recruit Enemy
- **Quick summary:** Whenever you successfully use Recruit Enemy on a target, you and all allies within line of sight gain a +2 morale bonus to attack rolls until the end of the encounter.
- **Production record:** `4348c2bca983e4a9`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you successfully use Recruit Enemy on a target, you and all allies within line of sight gain a +2 morale bonus to attack rolls until the end of the encounter.

#### Noble Sacrifice

- **Page:** 40
- **Prerequisites:** Recruit Enemy
- **Quick summary:** Whenever you successfully use Recruit Enemy on a target, if that target is reduced to 0 Hit Points or moved to the bottom of the Condition Track, as a Reaction you can grant yourself and all allies within line of...
- **Production record:** `1fc568c1bbdd94e0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully use Recruit Enemy on a target, if that target is reduced to 0 Hit Points or moved to the bottom of the Condition Track, as a Reaction you can grant yourself and all allies within line of sight a number of Bonus Hit Points equal to 10 + your Class Level.

Damage is subtracted from Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter are lost. Bonus Hit Points do not stack. No Bonus Hit Points may be granted if you or an ally reduce the target to 0 Hit Points or move it to the bottom of the Condition Track.

#### Recruit Enemy

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** Once per encounter when you deal damage to a living creature that is equal to or greater than the target's current Hit Points and the target's Damage Threshold (that is, when you deal enough damage to kill the...
- **Production record:** `43ac0c4b1759507a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter when you deal damage to a living creature that is equal to or greater than the target's current Hit Points and the target's Damage Threshold (that is, when you deal enough damage to kill the target), you can use this Talent. Make a Persuasion check against the target's Will Defense; if your result equals or exceeds the target's Will Defense, instead of dealing full damage, you deal half damage to the target and move it -1 step on the Condition Track.

In addition, the target becomes your ally, and its Attitude toward you immediately shifts to Friendly. The target fights on your side until the end of the encounter, at which point it departs (or, if the GM wishes, the target might become your ally permanently and join your party). Anyone Hostile to you becomes Hostile to the target.

This is a Mind-Affecting effect. If the target is a higher level than you, it gains a +5 bonus to its Will Defense. Enemies that cannot be bribed, blackmailed, or seduced (such as Stormtroopers) are immune to this effect.

#### Stay in the Fight

- **Page:** 41
- **Prerequisites:** Recruit Enemy
- **Quick summary:** A target you successfully Recruit Enemy can immediately catch a second wind as a reaction if able.
- **Production target:** CREATE `6cf364c5b9556770`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

If you successfully use Recruit Enemy on a target and that target can catch a second wind, the target can do so immediately as a reaction.

#### Team Recruiting

- **Page:** 41
- **Prerequisites:** Recruit Enemy
- **Quick summary:** You can use your Recruit Enemy Talent whenever you or an ally would deal enough damage to kill a target, instead of only when you do.
- **Production record:** `a3f4bc7671830701`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You can use your Recruit Enemy Talent whenever you or an ally would deal enough damage to kill a target, instead of only when you do.

### Recklessness

#### Find Openings

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** When an attack misses you, gain +2 morale on your next attack before the end of your next turn.
- **Production record:** `ad418fa7b1716364`
- **Phase 3B disposition:** `REMOVE_CONTAMINATION`

**Canonical rules text**

Whenever you are missed by an attack, you gain a +2 morale bonus to your next attack roll before the end of your next turn.

#### Hit the Deck

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Whenever you make an Area Attack, each ally in the area takes no damage if your attack roll fails to overcome his or her Reflex Defense, and takes half damage if the attack hits.
- **Production record:** `a3d0ac66cac192ec`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you make an Area Attack, each ally in the area takes no damage if your attack roll fails to overcome his or her Reflex Defense, and takes half damage if the attack hits.

#### Lure Closer

- **Page:** 25
- **Prerequisites:** Trick Step
- **Quick summary:** Once per turn, as a Move Action, you can make a Deception check against the Will Defense of one enemy within 12 squares and within your line of sight.
- **Production record:** `c2d2d55ee60f886f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn, as a Move Action, you can make a Deception check against the Will Defense of one enemy within 12 squares and within your line of sight. If you check results equals or exceeds the target's Will Defense, the target must move a number of squares equal to half its speed, and each square of movement must bring the target closer to you (though the target does avoid Hazards and obstacles).

If the target cannot avoid a Hazard (such as a pit), it stops moving in the nearest safe square. This movement is considered involuntary and does not provoke Attacks of Opportunity. This is a Mind-Affecting effect.

#### Risk for Reward

- **Page:** 25
- **Prerequisites:** Find Openings
- **Quick summary:** Once per turn, when an enemy damages you with an Attack of Opportunity, you can make a single melee or ranged attack against a target in range as a Reaction.
- **Production record:** `04b9cb3683c6e485`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per turn, when an enemy damages you with an Attack of Opportunity, you can make a single melee or ranged attack against a target in range as a Reaction.

#### Trick Step

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** As a Swift Action, make an Initiative check, opposed by the Initiative check of an enemy within your line of sight.
- **Production record:** `4c689ac688e80c9e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a Swift Action, make an Initiative check, opposed by the Initiative check of an enemy within your line of sight.

If your check result equals or exceeds the target's check, the target is considered Flat-Footed against the next attack you make before the end of your turn. If the target's check result is higher, you are considered Flat-Footed against the next attack made by the target before the start of your next turn.

### Unpredictable

#### Aggressive Surge

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** Once per encounter when you catch a Second Wind, you can make a Charge attack as a Free Action, provided that you can make a charge attack against a legal target at the time you catch a Second Wind.
- **Production record:** `147f70a2b815f34e`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per encounter when you catch a Second Wind, you can make a Charge attack as a Free Action, provided that you can make a charge attack against a legal target at the time you catch a Second Wind.

#### Blast Back

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** Once per round when you are damaged by an enemy's Area Attack, as a Reaction you can make an immediate melee or ranged attack against the source of the Area Attack, provided that you have line of sight to the...
- **Production record:** `2d486ece7350cedf`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per round when you are damaged by an enemy's Area Attack, as a Reaction you can make an immediate melee or ranged attack against the source of the Area Attack, provided that you have line of sight to the attacker and the target is within your melee or ranged reach.

#### Fade Away

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** Once per turn when you are damaged by an enemy's attack, as a Reaction you can move up to half your speed. This movement does not provoke Attacks of Opportunity.
- **Production record:** `cb4b14a242fbee71`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per turn when you are damaged by an enemy's attack, as a Reaction you can move up to half your speed. This movement does not provoke Attacks of Opportunity.

#### Second Strike

- **Page:** 26
- **Prerequisites:** Blast Back
- **Quick summary:** Once per encounter when you miss a target with a single melee or ranged attack, as a Free Action you can move up to half your speed and make a second attack of the same type against a different target.
- **Production record:** `55b2475e42ce79f2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter when you miss a target with a single melee or ranged attack, as a Free Action you can move up to half your speed and make a second attack of the same type against a different target. This movement doesn't provoke Attacks of Opportunity.

If you have the Combat Reflexes feat, you may use this Talent a number of times per encounter equal to your Dexterity bonus (minimum 1). You may still only use this Talent once per round.

#### Swerve

- **Page:** 26
- **Prerequisites:** Fade Away
- **Quick summary:** Once per encounter, negate an opportunity attack against you and move up to half speed without provoking; Combat Reflexes can grant extra uses.
- **Production record:** `99c685b0631a5601`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter when an enemy makes an attack of opportunity against you, as a reaction you can automatically negate the attack and immediately move up to half your speed. This movement does not provoke attacks of opportunity. If you have the Combat Reflexes feat, you can use this talent a number of times per encounter equal to your Dexterity bonus (minimum 1). You may still only use this talent once per round.

### Wingman

#### Concentrate All Fire

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** When your Aid Another helps an ally's vehicle-weapon attack hit, that attack deals +1 damage die; only one such bonus applies.
- **Production record:** `6f6cd1c453dc1828`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use the aid another action to aid an ally's attack roll with a vehicle weapon, if the attack hits, it deals +1 die of damage. Any ally can only benefit from this talent once per attack roll regardless of how many allies with this talent aid on the attack.

#### Escort Pilot

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** When a Vehicle that you are Piloting is adjacent to a Vehicle of Colossal size or smaller that is Piloted by an ally, both Vehicles gain a +10 bonus to their Damage Thresholds.
- **Production record:** `7aa3eec9b7f748ef`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When a Vehicle that you are Piloting is adjacent to a Vehicle of Colossal size or smaller that is Piloted by an ally, both Vehicles gain a +10 bonus to their Damage Thresholds.

#### Lose Pursuit

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** When a Vehicle that you are Piloting is adjacent to a Vehicle of Colossal size or smaller that is Piloted by an ally, both you and your ally gain a +5 circumstance bonus to Pilot checks to avoid being pulled into a...
- **Production record:** `b1bfca51996bb303`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When a Vehicle that you are Piloting is adjacent to a Vehicle of Colossal size or smaller that is Piloted by an ally, both you and your ally gain a +5 circumstance bonus to Pilot checks to avoid being pulled into a Dogfight as an Attack of Opportunity.

#### Run Interference

- **Page:** 40
- **Prerequisites:** Escort Pilot Talent
- **Quick summary:** As a Reaction, you can use your Vehicular Combat Feat to negate an attack against an adjacent Vehicle of Colossal size or smaller that is Piloted by an ally.
- **Production record:** `9fd409d9ceaf6733`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Reaction, you can use your Vehicular Combat Feat to negate an attack against an adjacent Vehicle of Colossal size or smaller that is Piloted by an ally. If you can use Vehicular Combat more than once per round, each use to negate an attack counts toward your limit of uses per round.

#### Wingman Retribution

- **Page:** 40
- **Prerequisites:** Escort Pilot Talent
- **Quick summary:** When a Vehicle of Colossal size or smaller that is Piloted by an ally is damaged by an attack, once per round as a Reaction you can make a Vehicle Weapon attack with a -5 penalty against your ally's attacker.
- **Production record:** `3c4c26a54de7c1c1`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When a Vehicle of Colossal size or smaller that is Piloted by an ally is damaged by an attack, once per round as a Reaction you can make a Vehicle Weapon attack with a -5 penalty against your ally's attacker.

### Kilian Ranger

#### Empower Siang Lance

- **Page:** 37
- **Prerequisites:** Siang Lance Mastery, base attack bonus +7
- **Quick summary:** Spend a Force Point and a full-round action to empower your siang lance; it deals +1 damage die when you wield it.
- **Production target:** CREATE `2bae1dc009d4f2d2`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can spend a Force Point to empower a siang lance, which takes a full-round action. After the siang lance is empowered, it deals an additional die of damage when you wield it. Others who wield the weapon do not gain the bonus damage die.

#### Shield Gauntlet Defense

- **Page:** 37
- **Prerequisites:** None.
- **Quick summary:** Once per turn, react for +2 deflection Reflex against one ranged attack while using an active shield gauntlet.
- **Production record:** `852bca9332684a2b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn as a reaction, you can gain a +2 deflection bonus to your Reflex Defense against any one ranged attack. To use this talent, you must be wearing an active shield gauntlet, you must be aware of the attack, and you must not be flat-footed.

#### Shield Gauntlet Deflect

- **Page:** 37
- **Prerequisites:** Shield Gauntlet Defense
- **Quick summary:** React once per round with Use the Force to negate a ranged attack; can protect an adjacent ally with a Force Point and partially deflect autofire.
- **Production record:** `da5096b45d174f36`
- **Phase 3B disposition:** `REMOVE_CONTAMINATION`

**Canonical rules text**

Once per round as a reaction, you can negate a ranged attack by making a successful Use the Force check. The DC of the skill check is equal to the result of the attack roll you wish to negate. To use this talent, you must be wearing an active shield gauntlet, you must be aware of the attack, and you must not be flat-footed. You can spend a Force Point to use this talent to negate a ranged attack against an adjacent character. You can use Shield Gauntlet Deflect to deflect some of the barrage of shots fired from a ranged weapon set on autofire. If your Use the Force check succeeds, you take half damage if the attack hits and no damage if the attack misses.

#### Shield Gauntlet Redirect

- **Page:** 37
- **Prerequisites:** Shield Gauntlet Defense, Shield Gauntlet Deflect, base attack bonus +5
- **Quick summary:** After deflecting a blaster bolt, make an immediate ranged attack against another target within 6 squares.
- **Production target:** CREATE `2fe6d21e112e43cd`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

This talent allows you to redirect a deflected blaster bolt along a specific trajectory so that it damages another creature or object in its path. When you successfully deflect a blaster bolt, you can make an immediate ranged attack against another target within 6 squares of you to which you have line of sight. If the attack succeeds, it deals normal weapon damage to the target. Only single blaster bolts can be redirected in this manner. You cannot use this talent to redirect barrages from autofire weapons and other types of projectiles. To use this talent, you must be wearing an active shield gauntlet, you must be aware of the attack, and you must not be flat-footed.

#### Siang Lance Mastery

- **Page:** 37
- **Prerequisites:** None.
- **Quick summary:** Treat a siang lance as a rifle and gain +1 attack with it; counts as Weapon Focus (siang lance) for prerequisites.
- **Production record:** `0bbfcac85b09416a`
- **Phase 3B disposition:** `REMOVE_CONTAMINATION`

**Canonical rules text**

You treat a siang lance as a rifle instead of as an exotic weapon. Additionally, you gain a +1 bonus to attack rolls with a siang lance. This talent counts as the Weapon Focus (siang lance) feat for the purpose of satisfying prerequisites. If you also have the Weapon Focus (rifles) feat, the attack bonus provided by this talent does not stack with the attack bonus provided by Weapon Focus (rifles).

---

## Book 4 — Galaxy at War

**Phase 3B status:** COMPLETE — 56 owned canonical identities; 13 UPDATE_CONTENT; 1 UPDATE_METADATA; 39 CREATE; 3 IDENTITY_SPLIT.

### Jedi Guardian

#### Cover Escape

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** After spending a Force Point to negate a melee attack against an adjacent ally with Block or Deflect, let that ally move 2 squares without provoking.
- **Production record:** `fcd7c1e0bd15df71`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you successfully spend a Force Point to negate a melee attack against an adjacent ally with the Block or Deflect talents, that ally can move up to 2 squares as a free action. This movement does not provoke an attack of opportunity.

### Jedi Sentinel

#### Prime Targets

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** Deal +1 die of Lightsaber damage to a target that has not been attacked since the end of your last turn.
- **Production record:** `ce151ce88fd55934`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you hit a target with a Lightsaber attack, if the target has not been attacked since the end of your last turn, you deal +1 die of damage.

### Leadership

#### Commanding Presence

- **Page:** 19
- **Prerequisites:** Born Leader, Tactical Savvy
- **Quick summary:** Once each per encounter, attack to grant nearby allies +2 defenses, +2 attacks/damage, or immediate half-speed movement.
- **Production target:** CREATE `d442508aa9d9bdf6`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

You excel at leading others into battle, issuing quick commands, demonstrating a gift for strategy, decimating your enemies, and impressing your peers. You can use each of the following actions once per encounter as a standard action:

Hold the Line!: Make a single melee or ranged attack against any target within your range. If your attack hits, all allies within 6 squares of you and within your line of sight gain a +2 morale bonus to their Defense scores until the end of your next turn.

Lead the Assault: Make a single melee or ranged attack against any target within your range. If your attack hits, all allies within 6 squares of you and within your line of sight gain a +2 morale bonus to their attack rolls and damage rolls until the end of your next turn.

Turn the Tide: Make a single melee or ranged attack against any target within your range. If you successfully damage the target, a number of allies equal to your Charisma modifier (minimum 1) can immediately move up to half their speed as a free action.

#### Tactical Savvy

- **Page:** 19
- **Prerequisites:** Born Leader
- **Quick summary:** Allies you can see add your Intelligence modifier to Force Point rolls used to enhance attack rolls.
- **Production target:** CREATE `913424086fa8f374`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When an ally whom you can see spends a Force Point to enhance an attack roll, the ally gains a bonus to the Force Point roll equal to your Intelligence modifier.

### Misfortune

#### Backstabber

- **Page:** 20
- **Prerequisites:** Sneak Attack
- **Quick summary:** Once per turn while flanking, treat the target as flat-footed for one of your attacks.
- **Production target:** CREATE `367b23802f5f4d8b`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can take advantage of your adversary's distractions, no matter how momentary or fleeting. Once per turn, when you flank a target, you can treat him or her as flat-footed for one of your attacks.

#### Improved Sneak Attack

- **Page:** 20
- **Prerequisites:** Point Blank Shot feat, Sneak Attack
- **Quick summary:** Extend Sneak Attack range from 6 squares to 12 squares.
- **Production target:** CREATE `edd7a0b36b9e727b`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use the Sneak Attack talent against a target within 12 squares, instead of within 6 squares.

### Camouflage

#### Dig In

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** While prone, spend a swift action to gain concealment until your next turn unless you move or stand.
- **Production target:** CREATE `af5f776f895e6caf`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When prone, you can spend a swift action to gain concealment until the start of your next turn. If you stand up or move, you lose this benefit.

#### Ghost Assailant

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** From total concealment or cover, win Stealth vs. Perception as a swift action to make that target flat-footed against you for the turn.
- **Production target:** CREATE `6908d612b77c6f92`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

If you start your turn with total concealment or total cover from a target, during that turn you can make a Stealth check as a swift action, opposed by the target's Perception check. If you succeed, the target is considered flat-footed against you until the end of your turn.

#### Slip By

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** When movement would provoke, use a higher Stealth check result in place of Reflex Defense against the attack of opportunity.
- **Production target:** CREATE `b1f19c1c86bdcae9`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

When you would normally provoke an attack of opportunity by moving out of a threatened space, you can roll a Stealth check, replacing your Reflex Defense with the results of your Stealth check if it is higher.

### Commando

#### Defensive Position

- **Page:** 21
- **Prerequisites:** Battle Analysis
- **Quick summary:** Spend two swift actions while in cover to treat it as improved cover until your next turn.
- **Production target:** CREATE `f9f3530a9e88a530`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you have the benefit of cover, you can spend two swift actions to treat it as improved cover until the start of your next turn.

### Weapon Specialist

#### Autofire Assault

- **Page:** 22
- **Prerequisites:** Weapon Proficiency (heavy weapons)
- **Quick summary:** You may brace a proficient weapon for autofire even if it is not autofire-only.
- **Production target:** CREATE `48024c68e89b1f5b`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When making an autofire attack, you can brace a weapon that is not restricted to autofire only. You must be proficient with the weapon being used.

### Weapon Master

#### Ferocious Assault

- **Page:** 30
- **Prerequisites:** Base attack bonus +12, Controlled Burst
- **Quick summary:** Once per encounter, turn an autofire attack into a 6-square cone at a cost of 20 shots.
- **Production target:** CREATE `cebb24b483fb5365`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, when making an autofire attack, you can treat the attack as a 6 square cone. Making this attack consumes 20 shots from the weapon's power pack.

### Gunslinger

#### Keep Them Honest

- **Page:** 31
- **Prerequisites:** Careful Shot feat
- **Quick summary:** Suppressing an enemy with Aid Another imposes -5 to all its attacks until the end of your next turn.
- **Production target:** CREATE `fe96e6ee2657d14e`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When using the aid another action to suppress an enemy, the enemy instead takes a -5 penalty to all attack rolls until the end of your next turn.

### Anticipation

#### Anticipate Movement

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** Once per round when a visible enemy moves, let one visible ally move up to their speed as a free action.
- **Production target:** CREATE `64b2d76b27852887`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per round, as a reaction to an enemy in your line of sight moving, you can enable one ally within your line of sight to move up to his or her speed as a free action.

#### Forewarn Allies

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** Allies within 12 squares gain +2 insight to attack and damage rolls for attacks of opportunity.
- **Production record:** `a9d5820271b1488b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

All allies within 12 squares of you gain a +2 insight bonus on attack rolls and damage rolls for attacks of opportunity.

#### Get Down

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** As a reaction to a ranged attack against an ally, let the ally drop prone before the attack resolves.
- **Production record:** `616bc0afc5c847ea`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a reaction, when an ally is targeted by a ranged attack, you can enable that ally to drop prone immediately, imposing the normal -2 penalty for a ranged attack against a prone target to the triggering attack roll, as a free action.

#### Heavy Fire Zone

- **Page:** 18
- **Prerequisites:** Forewarn Allies
- **Quick summary:** Designate a 3x3 zone; when a target enters it, let one visible ally make an attack of opportunity.
- **Production target:** CREATE `9f46358606d3f8fb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per turn, as a swift action, designate a 3x3 square area within your line of sight. Until the end of your next turn, if a target moves into that area you can enable one ally within your line of sight to make an attack of opportunity against that target. The ally you choose must be armed with a weapon capable of making attacks of opportunity, and this counts toward the ally's normal limitations for attacks of opportunity made in a round.

#### Summon Aid

- **Page:** 19
- **Prerequisites:** Get Down
- **Quick summary:** Once per round when an enemy moves adjacent to you, let one visible ally immediately charge it.
- **Production target:** CREATE `107b66a6cc86e6d6`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per round, as a reaction, when an enemy moves adjacent to you, you can enable one ally within your line of sight to immediately make a charge attack against the triggering enemy. The ally you choose must be able to charge the enemy from his or her current square under normal charge rules.

### Brigand

#### Cheap Trick

- **Page:** 19
- **Prerequisites:** Trained in Deception
- **Quick summary:** Roll twice and keep the better result when feinting with Deception against an enemy within 6 squares.
- **Production record:** `b3634baba7004d27`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you make a Deception check to feint against an enemy within 6 squares of you, you can roll twice, keeping the better of the two results.

#### Easy Prey

- **Page:** 19
- **Prerequisites:** Cheap Trick
- **Quick summary:** Halve the damage of a successful standard-action attack to deny that target Dexterity to Reflex Defense against your attacks until your next turn.
- **Production target:** CREATE `d7e9ee3d29107c62`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you make an attack as a standard action and successfully hit an enemy, you can choose to reduce the damage you deal by half. That target is then denied its Dexterity bonus to Reflex Defense against your attacks until the end of your next turn.

#### Quick Strike

- **Page:** 19
- **Prerequisites:** Cheap Trick
- **Quick summary:** In the first combat round, damaging an enemy that has not acted lets you immediately attack a different nearby target.
- **Production target:** CREATE `d1eab380f7ec9b29`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

During the initial round of combat, if you successfully damage an enemy who has not yet acted in the combat, you can make an immediate attack as a free action against a different target within 6 squares of the first target.

#### Sly Combatant

- **Page:** 19
- **Prerequisites:** Cheap Trick, Easy Prey
- **Quick summary:** Once each per encounter, attack to impose lasting attack/damage penalties, inflict a persistent condition, or gain damage from adjacent allies.
- **Production target:** CREATE `ad4d87fb9aebe330`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You quickly move about the battlefield, taking advantage of the chaos of battle to gain advantage. You can use each of the following actions once per encounter as a standard action:

Distracting Injury: Make a single melee or ranged attack against any enemy within your range. If the attack successfully hits, that enemy takes a -2 penalty to his or her attack rolls and damage rolls until the end of the encounter.

Make Them Bleed: Make a single melee or ranged attack against any living creature within your range. If you successfully deal damage as a result of the attack, that enemy gains a persistent condition that can be removed only with a successful DC 25 Treat Injury check to perform surgery.

Strength in Numbers: Make a single melee or ranged attack against an enemy who is adjacent to one or more of your allies. If you successfully hit that enemy, you gain a +2 bonus to damage for each ally that is adjacent to the target.

### Advance Patrol

#### Forward Patrol

- **Page:** 20
- **Prerequisites:** Watchful Step
- **Quick summary:** At the start of a surprise round, let one nearby ally retain Dexterity to Reflex Defense if you are not surprised.
- **Production record:** `2b44b253e4174300`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

At the start of a surprise round in which you are not caught by surprise, you can designate one ally within 6 squares of you as able to retain his or her Dexterity bonus to Reflex Defense during the surprise round.

#### Mobile Combatant

- **Page:** 20
- **Prerequisites:** Forward Patrol, Watchful Step
- **Quick summary:** Once each per encounter, attack for +5 Reflex, attack then move half speed safely, or react to damage by moving half speed safely and gaining an attack advantage next turn.
- **Production target:** CREATE `ee184e210f8c8935`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

You know that the key to winning a fight is keeping your enemies from pinning you down. You can use each of the following actions once per encounter:

Evasive Assault: As a standard action, make a single melee or ranged attack. If the attack successfully deals damage, you gain a +5 dodge bonus to your Reflex Defense until the end of your next turn.

Expeditious Attack: As a standard action, make a single melee or ranged attack, then move up to half your speed as a free action. This movement does not provoke an attack of opportunity.

Yielding Assault: When you are damaged by an enemy's melee or ranged attack, you can move up to one-half your speed as a reaction. This movement does not provoke an attack of opportunity. On your next turn, you gain a favorable circumstance to your first attack roll against the same enemy that damaged you.

#### Trailblazer

- **Page:** 20
- **Prerequisites:** Trained in Survival
- **Quick summary:** Spend a swift action so nearby visible allies ignore the first square of difficult terrain each time they move.
- **Production target:** CREATE `2d70ebe43ad9c7b0`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

During your turn, you can spend a swift action to allow all allies within 6 squares of you and within your line of sight to count the first square of difficult terrain as normal terrain each time they move.

#### Watchful Step

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** Use Perception instead of Initiative for Initiative checks and related rerolls; you count as trained in Initiative.
- **Production record:** `fc4dd5a981974626`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use your Perception check modifier instead of your Initiative modifier when making Initiative checks. If you are entitled to an Initiative check reroll, you can reroll your Perception check instead, subject to the same circumstances and limitations. You are considered to be trained in Initiative.

### Shockboxer

#### Defensive Jab

- **Page:** 21
- **Prerequisites:** Retaliation Jab
- **Quick summary:** While unarmed, fighting defensively lets you make one free unarmed attack against an adjacent target.
- **Production target:** CREATE `4161fc38ed0d7c9a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you are unarmed and take the fight defensively action, you can make a single unarmed attack as a free action against an adjacent target.

#### Nimble Dodge

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** When a melee attack misses you, react by moving up to 2 squares while ending adjacent to the attacker.
- **Production target:** CREATE `913a0ca43e032caa`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

If an enemy misses you with a melee attack, as a reaction you can move up to 2 squares, but you must end your movement adjacent to your attacker.

#### Retaliation Jab

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** When a melee attack misses you, react to deal your Strength modifier in damage to the attacker if it is within reach.
- **Production record:** `f18fba568e414141`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If an enemy misses you with a melee attack, as a reaction you can automatically deal damage equal to your Strength modifier, minimum 1 point of damage, to your attacker, if the attacker is within your reach.

#### Stinging Jab

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** Halve your unarmed hit's damage to make the target deal half melee damage until the end of your next turn.
- **Production record:** `79eee1486dc34af5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you hit a target with an unarmed attack, you can choose to deal half damage with your attack. If you do so, your enemy also deals half damage on all melee attacks he or she makes until the end of your next turn.

#### Stunning Shockboxer

- **Page:** 21
- **Prerequisites:** Stinging Jab
- **Quick summary:** After halving stun damage from an unarmed attack, add one extra damage die to the hit point damage.
- **Production target:** CREATE `bde10cfd33efc3d0`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you deal stun damage to a target with an unarmed attack, after the stun damage is halved, roll one extra die of damage and add that to the damage subtracted from the target's hit points.

### Veteran

#### Battlefield Remedy

- **Page:** 21
- **Prerequisites:** Trained in Treat Injury
- **Quick summary:** Successful First Aid also moves the patient +1 step on the condition track.
- **Production target:** CREATE `bc7647fb4684b80f`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You have learned a variety of different ways to treat combat injuries in the field. When you succeed on a Treat Injury check to administer First Aid, the tended creature also moves +1 step on the condition track.

#### Grizzled Warrior

- **Page:** 21
- **Prerequisites:** Seen It All, Tested in Battle
- **Quick summary:** Once each per encounter, attack for bonus hit points, improve an ally's aided attack with bonus damage, or attack for +2 Reflex.
- **Production target:** CREATE `0cd242fd0b3f8062`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can draw upon your extensive battlefield experience to encourage your comrades and drive your enemies before you. You can use each of the following actions once per encounter as a standard action:

Defy the Odds: Make a single melee or ranged attack. You immediately gain a number of bonus hit points equal to your Constitution score.

Double the Pain: When you use the Aid Another action to provide an ally within 6 squares of you a bonus to his or her attack roll, add one-half your character level to the ally's damage roll if the attack is successful.

Guarded Assault: Make a single melee or ranged attack. You gain a +2 dodge bonus to your Reflex Defense against all attacks until the start of your next turn.

#### Reckless

- **Page:** 22
- **Prerequisites:** Tested in Battle
- **Quick summary:** Add your Wisdom bonus, at least +1, to damage on a successful charge attack.
- **Production target:** CREATE `125c8b753d186f6d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You know from first-hand experience that victory goes to those willing to take a chance. You can add your Wisdom bonus, minimum +1, to the damage roll when you make a successful charge attack.

#### Seen It All

- **Page:** 22
- **Prerequisites:** Tested in Battle, trained in Initiative
- **Quick summary:** Anyone using a fear effect on you rolls attack and skill checks twice and keeps the lower result.
- **Production record:** `b3255436ba174a17`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have seen more action in more places than most people know exist, and little in the galaxy gets you rattled. Any character using a fear effect on you must roll twice, keeping the lower result on any skill checks and attack rolls.

#### Tested in Battle

- **Page:** 22
- **Prerequisites:** None.
- **Quick summary:** Catching a second wind also moves you +2 steps on the condition track.
- **Production record:** `cccea4e91352482a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you catch a second wind, you move +2 steps on the condition track in addition to regaining hit points.

### Sharpshooter

#### Bullseye

- **Page:** 31
- **Prerequisites:** Draw a Bead, Precision Shot, Sniper feat
- **Quick summary:** Once per encounter after aiming at a non-point-blank target, deny its Dexterity bonus to Reflex Defense for your ranged attack.
- **Production target:** CREATE `eeb5ebf5835734d2`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, you can designate a single target that you have aimed at and that is not within point-blank range. When making a ranged attack roll against that target, the target is denied its Dexterity bonus to Reflex Defense when determining the effect of your attack.

#### Draw a Bead

- **Page:** 31
- **Prerequisites:** Precision Shot, base attack bonus +10
- **Quick summary:** Once per round, designate a distant enemy; damaging it with a ranged attack adds your Dexterity bonus to damage until the designation ends.
- **Production record:** `45d8f7a583314692`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per round, you can spend a single swift action to designate a single enemy who is not within point-blank range. When you make a successful ranged attack roll that deals damage against the designated enemy, add your Dexterity bonus, minimum +1, to the damage roll. This effect lasts until the target is unconscious, dead, or leaves your line of sight. You can have only one enemy designated in this manner.

#### Pinning Shot

- **Page:** 31
- **Prerequisites:** Precision Shot
- **Quick summary:** Damaging an aimed-at enemy reduces its speed to 2 and prevents double moves or running until the end of your next turn.
- **Production record:** `aa39089c21cf488f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can keep your target worrying about where the next shot is coming from instead of trying to flee. When you deal damage to an enemy that you have aimed at, the target's speed is reduced to 2 squares, and the target cannot take either a double move action or use the run action until the end of your next turn. This is a stunning effect.

#### Harrying Shot

- **Page:** 31
- **Prerequisites:** Pinning Shot, Precision Shot
- **Quick summary:** A damaging ranged attack against an aimed-at enemy prevents it from using a standard action to attack on its next turn.
- **Production target:** CREATE `8306c13c16ae0af8`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you make a successful ranged attack against an enemy that you have aimed at and the attack deals damage, the target cannot use a standard action to make an attack roll on his or her next turn. This counts as a stunning effect.

#### Precision Shot

- **Page:** 31
- **Prerequisites:** Far Shot feat
- **Quick summary:** While aiming, gain Point Blank Shot's benefit against the target regardless of range.
- **Production record:** `604fde784454445d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When using the aim action, you gain the benefit of the Point Blank Shot feat against your target, regardless of range category.

### Squad Leader

#### Fall Back

- **Page:** 31
- **Prerequisites:** Charisma 13
- **Quick summary:** As a move action, let every squad member move 2 squares without provoking.
- **Production target:** CREATE `16b020752725d7a9`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a move action, you can enable each member of your squad to immediately move two squares. This movement does not provoke an attack of opportunity.

#### Form Up

- **Page:** 31
- **Prerequisites:** Charisma 13
- **Quick summary:** As a move action, give squad members +2 morale to Reflex while they remain within 6 squares of another squad member.
- **Production target:** CREATE `29e32c30fda1a234`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a move action, you give all squad members a +2 morale bonus to their Reflex Defense until the end of your next turn, as long as they are within 6 squares of another squad member.

#### Full Advance

- **Page:** 31
- **Prerequisites:** Charisma 13
- **Quick summary:** As a move action, give all squad members +2 morale to damage until the end of your next turn.
- **Production target:** CREATE `4f60988cc2260277`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a move action, you give all squad members a +2 morale bonus to damage rolls until the end of your next turn.

#### Hold Steady

- **Page:** 31
- **Prerequisites:** Charisma 13
- **Quick summary:** Once per encounter as a standard action, move every squad member +1 step on the condition track.
- **Production target:** CREATE `438abc85b1f7d25d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, as a standard action, you move all members of your squad +1 step on the condition track.

#### Search and Destroy

- **Page:** 31
- **Prerequisites:** Charisma 13
- **Quick summary:** As a move action, give all squad members +2 morale to Perception until the end of your next turn.
- **Production target:** CREATE `1907d80212a12c68`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a move action, you give all squad members a +2 morale bonus to Perception checks until the end of your next turn.

### Martial Arts Forms

#### Echani Expertise

- **Page:** 32
- **Prerequisites:** Base attack bonus +10
- **Quick summary:** Unarmed attacks threaten critical hits on one additional number, but only a natural 20 is an automatic hit.
- **Production target:** CREATE `88ca4add87c2a86a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When making an unarmed attack, you extend your critical threat range by 1, for example 19-20 instead of 20. However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

#### Hijkata Expertise

- **Page:** 32
- **Prerequisites:** None.
- **Quick summary:** A creature or droid you damage unarmed takes a penalty to its next attack equal to your Strength bonus.
- **Production target:** CREATE `6b55ee89c322b99d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you damage a creature or droid with an unarmed attack, the target takes a penalty to its next attack roll equal to your Strength bonus.

#### K'tara Expertise

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Once per turn after unarmed damage, disarm as a swift action without the normal -5 penalty against a two-handed weapon.
- **Production target:** CREATE `cafcd19016e17d00`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per turn, when you damage a creature or droid with an unarmed attack, you can make an attack to disarm as a swift action. Also, you do not take the -5 penalty to your attack roll if the target is wielding a weapon with more than one hand.

#### K'thri Expertise

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Adjacent enemies take your Strength modifier in damage at the start of their turns if you could make an attack of opportunity.
- **Production target:** CREATE `9f02751f14ad2de8`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Any enemy that begins its turn adjacent to you takes damage equal to your Strength modifier, minimum 1 point, if you are able to make an attack of opportunity against them. You can use this talent while wearing only light armor or no armor.

#### Stava Expertise

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Your grabs require an opposed grapple check to escape, and you may reroll grapple checks you initiate.
- **Production target:** CREATE `41d3f44653a1fe34`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you successfully grab an enemy, he or she must make an opposed grapple check to break free of your grab. If you are initiating a grapple, you can reroll your grapple check. However, you must accept the second result, even if it is worse. You can use this talent only while wearing light armor or no armor.

#### Tae-Jitsu Expertise

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Once per turn, unarmed damage can move the target -1 condition step when your attack roll meets its damage threshold.
- **Production target:** CREATE `6e638242c0af18df`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per turn, when you damage a creature or droid with an unarmed attack, compare your attack roll to the target's damage threshold. If your attack roll equals or exceeds the target's threshold, the target is moved -1 step on the condition track, regardless of the damage result of your attack.

#### Wrruushi Expertise

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Once per turn after unarmed damage, attack Fortitude to restrict the target to one swift action on its next turn.
- **Production target:** CREATE `75c0b084b706be38`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per turn, when you damage a creature or droid with an unarmed attack, you can make an attack against the target's Fortitude Defense as a free action. If that attack is successful, the target can take only a single swift action on their next turn. You can use this talent only while wearing light armor or no armor.

### Unarmed Mastery

#### Flurry of Blows

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Reduce full-attack penalties for multiple unarmed attacks by 2; repeat selections reduce them by another 2 each.
- **Production target:** CREATE `11b45afc4136594c`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you make multiple unarmed attacks as a full attack action, you reduce the penalty to your attack roll by 2.

You can take this talent multiple times. Each time you take this talent, you reduce the penalty to your attack rolls by an additional 2.

#### Hardened Strike

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Damaging a target unarmed reduces its Damage Reduction by 1 for the encounter; repeated hits do not stack.
- **Production target:** CREATE `a497a8c8c14acb9d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

If you damage with an unarmed attack a creature or droid that has Damage Reduction, you reduce the value of that Damage Reduction by one until the end of the encounter. Cumulative attacks against the same target do not stack.

#### Punishing Strike

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Once per turn, an unarmed critical hit grants an immediate extra unarmed attack against a target within reach.
- **Production target:** CREATE `8637ce4c8b274df4`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you score a critical hit on an unarmed attack, you can make an immediate unarmed attack, in addition to other effects of a critical hit, against a single target within reach. You can use this talent only once per turn and only while wearing light armor or no armor.

---

## Book 5 — Galaxy of Intrigue

**Phase 3B status:** COMPLETE — 43 identities; 12 UPDATE_CONTENT; 2 UPDATE_METADATA; 27 CREATE; 2 IDENTITY_SPLIT; 2 tree creates.

### Bounty Hunter

#### Detective

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** Locating an individual with Gather Information is DC -10 and takes half the time and bribery cost.
- **Production target:** `27dd504c877a4de5`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You are skilled in locating individuals and using research and surveillance to learn some of their most intimate secrets. When you make a Gather Information check to locate an individual, the DC is reduced by 10, and the time and bribery cost are reduced by half.

#### Electronic Trail

- **Page:** 24
- **Prerequisites:** Nowhere to Hide, trained in the Use Computer skill
- **Quick summary:** After locating a target, receive a daily catalog of its normal electronic trail while you have computer/network access.
- **Production target:** `d26506bfba104470`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once you have located a target using Gather Information, you can track its electronic presence. Once per day, you receive a catalog of the target's electronic trail, which includes the amount and location of credits spent, the routes of any public transportation taken, and the sites viewed on the HoloNet while the target was logged in using its primary identity. To receive this information, you must have access to a computer or datapad plus access to a network or the HoloNet. The electronic trail does not reveal bank balances or other secret information, which requires a separate Gather Information check.

#### Revealing Secrets

- **Page:** 25
- **Prerequisites:** Detective
- **Quick summary:** Gather Information checks for secret information are DC -10 and cost one-fifth the normal bribery amount.
- **Production target:** CREATE `71908efcdb7e6711`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Your investigations reveal information that your target thought was secret. When you make a Gather Information check to learn secret information, the DC is reduced by 10 and the bribery cost is reduced to one-fifth the original cost.

### Brawler

#### Crowd Control

- **Page:** 23
- **Prerequisites:** Entangler
- **Quick summary:** You can maintain grabs on two adjacent creatures at once.
- **Production target:** CREATE `8a412e9a700b06d5`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can grab two adjacent creatures at a time.

#### Disarm and Engage

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** After a successful disarm, immediately attack with the disarmed weapon at -5, plus nonproficiency if applicable.
- **Production target:** CREATE `f61d70448c4cd14e`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you successfully disarm an opponent, you can make an immediate free attack with the disarmed weapon at a -5 penalty. If you are not proficient with the weapon, you take the penalty for nonproficiency as well.

#### Entangler

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** Reduce your grab attack penalty to -2 and increase the grabbed target's attack penalty to -5.
- **Production target:** `6a52361527b64513`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When grabbing a target, you take a -2 penalty to your attack roll (instead of the normal -5 penalty). Until the target breaks the grab, it takes a -5 penalty to attack rolls, including those made with natural and light weapons (instead of the normal -2 penalty).

#### Reverse Strength

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** A successful grapple deals damage equal to the opponent's Strength modifier, minimum 1.
- **Production target:** CREATE `002c2d4fd8383a3e`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You know how to use an opponent's strength against it. Whenever you successfully grapple an opponent, you deal damage equal to the opponent's Strength modifier (minimum 1 point).

### Commando

#### Coordinated Effort

- **Page:** 23
- **Prerequisites:** Dedicated Protector
- **Quick summary:** When aiding your Dedicated Protector target's attack, also grant +2 damage on that attack.
- **Production target:** CREATE `527289442596a891`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you use the aid another action to grant a bonus on attack rolls, if you are aiding the target of your Dedicated Protector talent that ally also gains a +2 bonus to damage rolls on the attack you aided.

#### Dedicated Guardian

- **Page:** 24
- **Prerequisites:** Dedicated Protector, Harm's Way
- **Quick summary:** Once each per encounter, protect your Dedicated Protector target with Blast Shield, Take the Pain, or Team Effort.
- **Production target:** CREATE `562148487d7aa43c`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use each of the following actions once per encounter:

Blast Shield: Spend a swift action. Until the end of your next turn, the ally who is under the effects of your Dedicated Protector talent is treated as having the Evasion talent for the purposes of determining damage from an area attack. If the ally already has Evasion, the damage from a successful area attack is reduced by 1 die.

Take the Pain: Whenever your Dedicated Protector target would move down the condition track, you can, as a reaction, choose to move the same number of steps down the condition track instead (preventing the ally from moving down the track).

Team Effort: Spend a swift action. Until the end of your next turn, while you are adjacent to your Dedicated Protector target, any enemy that is adjacent to you and to that ally is considered flanked.

#### Dedicated Protector

- **Page:** 24
- **Prerequisites:** Harm's Way
- **Quick summary:** Once per encounter, designate a nearby ally to gain +1 morale Reflex while adjacent to you for the encounter.
- **Production target:** `f3a1542edd5f4259`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can designate one ally within 6 squares of you. Until the end of the encounter, that ally gains a +1 morale bonus to Reflex Defense as long as it remains adjacent to you. Any individual can only be the target of this talent once per encounter.

### Espionage

#### Fade Out

- **Page:** 22
- **Prerequisites:** Trained in Stealth
- **Quick summary:** Use Stealth instead of Deception to create a diversion to hide; trained Deception grants +5 to that check.
- **Production target:** CREATE `77293789b3e9e38a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You know how to make yourself scarce when dealing with suspicious or hostile beings. You can use your Stealth skill, not Deception, to create a diversion to hide (see page 73 of the Saga Edition core rulebook). If you are trained in the Deception skill, you gain a +5 bonus to your skill check for the purposes of creating a diversion.

#### Keep Together

- **Page:** 22
- **Prerequisites:** None.
- **Quick summary:** After any melee or ranged attack hits or misses you, react by moving your speed without provoking if you end adjacent to an ally.
- **Production target:** CREATE `de31c189f3416df7`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you are hit or missed by a melee or a ranged attack, you can move up to your speed as a reaction, provided that you end your movement adjacent to an ally. This movement does not provoke attacks of opportunity.

#### Prudent Escape

- **Page:** 22
- **Prerequisites:** None.
- **Quick summary:** When you drop or incapacitate a target, you and two nearby visible allies may immediately move your speeds without provoking.
- **Production target:** CREATE `70929db4d14b8ae8`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you reduce a target to 0 hit points or otherwise render a creature unconscious, you can choose two allies within 6 squares of you and within your line of sight. You and the allies you chose can immediately move up to your speeds as a reaction. This movement does not provoke opportunity attacks.

#### Reactive Stealth

- **Page:** 22
- **Prerequisites:** Trained in Stealth
- **Quick summary:** When a ranged attack misses you while you have cover or concealment, react by moving half speed and attempting to hide.
- **Production target:** CREATE `810160a476804e61`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you are missed by a ranged attack and have concealment or cover from the attacker, you can move up to half your speed as a reaction and make a Stealth check to become hidden from your attacker, provided you still have concealment or cover at the end of your movement.

#### Sizing Up

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, beat a nearby visible target's Will with Perception to gain +2 insight on attacks and skill checks against it for the encounter.
- **Production target:** CREATE `95579a44ff466f19`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, you can make a Perception check against the Will Defense of a single target that is within 6 squares of you and within your line of sight. If you succeed, you gain a +2 insight bonus to all skill checks and attack rolls against the target until the end of the encounter.

### Expert Pilot

#### Clip

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** When ramming, treat your ship as two size categories smaller for damage you take, while the target still takes damage from your actual size.
- **Production target:** CREATE `52bedcae0b3729de`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you use the ram action, you reduce the size of your ship by two categories for the purposes of taking collision damage. The rammed ship takes damage appropriate to the actual size of your ship.

#### Master Defender

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** Fight defensively to give your vehicle +5 Reflex for -2 attacks or +10 Reflex for -5 attacks for you and your gunners.
- **Production target:** CREATE `5ba7da84697a94dd`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you fight defensively, either your vehicle gains a +5 dodge bonus to Reflex Defense if you and your gunners take a -2 penalty to attack rolls, or it gains a +10 dodge bonus if you and your gunners take a -5 penalty to attack rolls.

#### Shunt Damage

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** Once per encounter when your ship takes damage, beat an adjacent ally ship's Reflex with Pilot to redirect the damage to it.
- **Production target:** CREATE `a12b5e12c3358182`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, if your ship takes damage, make a Pilot check and compare the result to the Reflex Defense of one adjacent allied ship. If your check result is higher, the allied ship takes the damage instead.

### Gunslinger

#### Damaging Disarm

- **Page:** 25
- **Prerequisites:** Ranged Disarm
- **Quick summary:** A successful ranged disarm also deals half the attack's damage to the target.
- **Production target:** CREATE `dceb4b975170edda`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

If you successfully disarm an opponent using a ranged attack, the target also takes half damage from the attack.

#### Pistol Duelist

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Once each per encounter as a standard action, use End Game, Snap Aiming, or Stand Steady with a pistol.
- **Production target:** `d4a94695e27f60a1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are a master of the elegant, if archaic, custom of dueling with pistols. You can use each of the following actions once per encounter as a standard action:

End Game: You make a single ranged attack with a pistol against an opponent within range. The opponent's damage threshold is halved (round down) for the purposes of this attack.

Snap Aiming: You make a single ranged attack with the benefits of aiming.

Stand Steady: You gain a +4 bonus to your Reflex Defense until the end of your next turn and make a single ranged attack.

### Master Of Intrigue

#### Advanced Planning

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** When combat initiative is rolled, swap Initiative results with one willing visible ally.
- **Production target:** `5bf2f1759ee54834`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you roll Initiative for combat, choose one willing ally within your line of sight. You and that ally swap Initiative results.

#### Blend In

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** As a swift action while adjacent to at least two creatures, gain total concealment against nonadjacent attackers.
- **Production target:** CREATE `4a6da8249db460f6`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

You know how to blend into a variety of cultures and groups with ease. As a swift action, you gain total concealment when adjacent to at least two other creatures. This benefit does not apply to attacks from adjacent creatures.

#### Done It All

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** Choose two qualifying nonprestige-class talents; spend a Force Point once per turn to gain one until the end of your next turn.
- **Production target:** CREATE `d376f165f1a47281`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you select this talent, choose two talents (from any nonprestige class) that you do not possess but for which you meet the prerequisites. Once per turn on your turn, you can spend a Force Point as a free action to gain the benefits of one of those talents until the end of your next turn.

#### Get into Position

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** Once per encounter at the start of your first turn, let two visible allies within 12 squares immediately move their speed.
- **Production target:** CREATE `bb7ee79cbdd2c018`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

Once per encounter, at the start of your first turn, choose two allies within 12 squares and in your line of sight. Each ally can immediately move up to his or her speed as a reaction.

#### Master Manipulator

- **Page:** 20
- **Prerequisites:** Advanced Planning, Get into Position
- **Quick summary:** Once each per encounter, use Demand Recovery, Exceptional Control, or Word of Warning as a swift action.
- **Production target:** CREATE `c5a043b596f544d0`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You are a master of making things happen the way you want them to. You can use each of the following actions once per encounter as a swift action on your turn:

Demand Recovery: Select one ally within 5 squares and in your line of sight. That ally moves +5 steps on the condition track and gains a +2 morale bonus to attack rolls and skill checks until the end of your next turn.

Exceptional Control: Roll a d20 and note the result. Once before the end of the encounter, as a reaction you can replace the result of any enemy's or ally's d20 roll with the result you rolled for this ability. The enemy or ally must be within your line of sight.

Word of Warning: Select one ally within 5 squares and in your line of sight. Once before the end of the encounter, as a reaction to that ally having any defense score targeted by a skill check or an attack, you can replace that ally's defense score with your same defense score until the attack or skill check is resolved.

#### Retaliation

- **Page:** 20
- **Prerequisites:** Advanced Planning
- **Quick summary:** After threshold damage moves you down the condition track, your next damaging hit before the end of your next turn also moves the target -1 step.
- **Production target:** CREATE `8ed2a9fd50053e3b`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you move down the condition track as a result of taking damage that equals or exceeds your damage threshold, the next time you hit and damage a creature or a droid with a melee or a ranged attack before the end of your next turn, you automatically move the target -1 step on the condition track.

### Mastermind

#### Attract Superior Minion

- **Page:** 25
- **Prerequisites:** Attract Minion, Impel Ally I, Impel Ally II
- **Quick summary:** Your Attract Minion follower becomes a nonheroic character with class level equal to your character level.
- **Production target:** CREATE `9ef268e31963cf70`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You attract a particularly skilled and powerful minion. The minion is a nonheroic character with a class level equal to your character level. This talent otherwise functions as the Attract Minion talent.

#### Contingency Plan

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Once per encounter after failing an attack, skill check, or opposed-check talent, move your speed as a reaction.
- **Production target:** CREATE `7a8b247639d32740`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, if you fail an attack roll, a skill check, or the use of a talent that requires an opposed check, you can move your speed as a reaction.

### Revolutionary

#### Bomb Thrower

- **Page:** 21
- **Prerequisites:** Trained in the Mechanics skill
- **Quick summary:** Gain +5 to Mechanics for explosives and craft an improvised frag grenade as a full-round action with suitable supplies.
- **Production target:** CREATE `959f16cb707d8360`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You are skilled in making and handling impromptu explosives. You gain a +5 bonus to Mechanics checks for the purposes of handling explosives. In addition, you can spend a full-round action to craft the equivalent of a frag grenade from spare parts you have on hand. You must have access to the appropriate supplies, such as an old blaster, a toolkit, or materials found inside a hangar bay.

#### For the Cause

- **Page:** 21
- **Prerequisites:** Make an Example
- **Quick summary:** When you or a nearby ally takes threshold-exceeding damage, nearby allies gain +2 attack and damage until the end of your next turn.
- **Production target:** CREATE `df8f36d21dc4d23c`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you or an ally within 6 squares of you takes damage that exceeds that character's damage threshold, you and all allies within 6 squares of you gain a +2 bonus to attack rolls and damage rolls until the end of your next turn.

#### Make an Example

- **Page:** 22
- **Prerequisites:** None.
- **Quick summary:** Exceed a target's damage threshold to give it -5 on attacks against you until the end of your next turn.
- **Production target:** `603e7e5d628a435d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you hit with an attack and deal enough damage to exceed a target's damage threshold, that target takes a -5 penalty to attack rolls against you until the end of your next turn. This is a mind-affecting effect.

#### Revolutionary Rhetoric

- **Page:** 22
- **Prerequisites:** None.
- **Quick summary:** As a standard action, beat a nearby visible enemy's Will with Persuasion to restrict it to move and swift actions until your next turn unless you attack it.
- **Production target:** CREATE `46ebeef2d6de4837`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a standard action, you can do or say something that causes an enemy to doubt its motives. Choose one enemy within 12 squares and in your line of sight, and make a Persuasion check against the target's Will Defense. If you succeed, the target can take only move actions and swift actions until the end of your next turn. This effect ends if you attack the target. This is a mind-affecting effect.

### Skill Challenge

#### Guaranteed Boon

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** If a Force Point-boosted skill challenge check still fails, regain that Force Point.
- **Production target:** CREATE `669aae58e8d0d90f`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you spend a Force Point to add to a skill roll in a skill challenge and accrue a failure for that skill check, you regain that Force Point.

#### Leading Skill

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** After a skill challenge success, gain +2 insight on your next check using a different skill in that challenge.
- **Production target:** CREATE `efd54ffa36d5a2b4`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you earn a success in a skill challenge, you gain a +2 insight bonus to your next skill check made with a different skill in the same skill challenge.

#### Learn from Mistakes

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** After your skill challenge failure, the next ally gains +2 insight if using a different action and skill.
- **Production target:** CREATE `6dcf10db37160d23`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you accrue a failure in a skill challenge, you grant the next ally to take an action in the skill challenge a +2 insight bonus to a skill check, provided that ally takes a different action (and uses a different skill) than you did.

#### Try Your Luck

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** After your skill challenge failure, choose an ally; their next use of that same skill rolls twice and keeps the better result.
- **Production target:** CREATE `bf27fc2e540e2ed5`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you accrue a failure in a skill challenge, choose one ally. The next time that ally uses the same skill that you used to accrue a failure before the end of the skill challenge, that ally rolls two dice on the skill check and keeps the better result.

### Superior Skills

#### Assured Skill

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** For one chosen skill, forgo competence bonuses to roll twice and keep either result; may be selected for different skills.
- **Production target:** `b89d573dba9ddb20`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you select this talent, choose one skill. Whenever you roll a skill check with that skill, you can choose to lose any competence bonuses to that skill check and instead roll 2 dice, keeping either result.

You can select this talent multiple times. Each time you do so, you must choose a different skill to gain the benefits of this talent.

#### Critical Skill Success

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** After a natural 20 on a skill check, gain a one-use +5 competence bonus to another skill before the end of your next turn.
- **Production target:** `5242623648114830`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you roll a natural 20 on a skill check, choose one other skill. Once before the end of your next turn, you can choose to gain a +5 competence bonus to a check with that skill as a free action.

#### Exceptional Skill

- **Page:** 21
- **Prerequisites:** Trained in the chosen skill
- **Quick summary:** For a trained chosen skill, natural results 2-7 count as 8; may be selected for different skills.
- **Production target:** `36fbab1a05c08fdd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you select this talent, choose one skill. Whenever you roll a skill check with that skill, a result of 2-7 on the die is always treated as though you had rolled an 8.

You can select this talent multiple times. Each time you do so, you must choose a different skill to gain the benefits of this talent.

#### Reliable Boon

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** When adding a Force Point to a skill check, reroll Force Point dice showing 1 until they show 2 or higher.
- **Production target:** `f85bb79fe20de1ef`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you spend a Force Point to add to a skill check, you always reroll a result of 1 on any of your Force Point dice, and continue to reroll until you get a result of 2 or higher.

#### Skill Boon

- **Page:** 21
- **Prerequisites:** Trained in the chosen skill
- **Quick summary:** For a trained chosen skill, increase the Force Point die used on that skill by one step, maximum d12.
- **Production target:** `1cbf8a40f7972aa4`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you select this talent, choose one skill. Whenever you spend a Force Point to add to that skill, increase the die type of your Force Point by one step (i.e. from d6 to d8, d8 to d10, or d10 to d12), to a maximum of d12.

You can select this talent multiple times. Each time you do so, you must choose a different skill to gain the benefits of this talent.

#### Skill Confidence

- **Page:** 21
- **Prerequisites:** Critical Skill Success, trained in the chosen skill
- **Quick summary:** With a chosen trained skill, natural 19-20 triggers Critical Skill Success and grants bonus hit points equal to your Charisma modifier.
- **Production target:** `07cd591fb8dccb39`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you select this talent, choose one skill. Whenever you roll a natural 19 or a natural 20 on a skill check with that skill, you gain the benefits of the Critical Skill Success talent and also gain bonus hit points equal to your Charisma modifier.

You can select this talent multiple times. Each time you do so, you must choose a different skill to gain the benefits of this talent.

#### Skillful Recovery

- **Page:** 21
- **Prerequisites:** Trained in the chosen skill
- **Quick summary:** Failing a chosen trained skill check grants a temporary Force Point usable only on that skill during the encounter.
- **Production target:** `323cc243fef47675`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you select this talent, choose one skill. Whenever you fail a skill check with that skill, you gain one temporary Force Point. That Force Point can only be spent to add to a skill check with the skill you chose for this talent. If the Force Point is not spent by the end of the encounter, it is lost. For the purposes of this talent, failing a skill check means failing to get the minimum possible result from the skill check.

You can select this talent multiple times. Each time you do so, you must choose a different skill to gain the benefits of this talent.

---

## Book 6 — Starships of the Galaxy

**Phase 3B status:** COMPLETE — 23 owned canonical identities; 22 UPDATE_CONTENT; 1 CORRECT_TREE; 0 CREATE.

### Expert Pilot

#### Blind Spot

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** Enter and maintain the blind spot of an adjacent vehicle at least two sizes larger to gain +2 attacks against it while it takes -2 attacks against you.
- **Production record:** `0be2881047fe9919`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can fly a vehicle you pilot so close to a target at least two sizes larger than your vehicle that it is difficult for the target to avoid or attack you. You must be adjacent to the target (at starship scale) to use this talent. As a swift action, make an opposed Pilot check against the target. If you succeed, you move into the same space as your target. You move with your target if it moves (assuming your vehicle has sufficient speed to keep up), and you must make another opposed Pilot check each round as a swift action to stay in its blind spot.

As long as you stay in the target's blind spot, any attack you make against the target gains a +2 bonus, and the target takes a -2 penalty on attacks made against you.

#### Close Scrape

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** React to a critical hit while piloting Colossal-or-smaller craft; a Pilot check against the attack total converts it to a normal hit.
- **Production record:** `66ed448a3a2e82bc`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you are piloting a vehicle of Colossal size or smaller, you may make a Pilot check as a reaction to turn a critical hit into a normal hit. The DC for the Pilot check is equal to the attack roll total of the critical hit. If you are successful, the damage from the attack is not doubled (though it is still considered an automatic hit).

#### Improved Attack Run

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** Attack runs no longer require straight-line movement.
- **Production record:** `538d7499a66a3672`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You do not have to move in a straight line when using the attack run action.

#### Vehicle Focus

- **Page:** 17
- **Prerequisites:** Wisdom 13
- **Quick summary:** Choose a vehicle type; while piloting or gunning it, gain +2 vehicle-weapon attacks and may take 10 on Pilot checks.
- **Production record:** `4764dc69f0d11695`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Choose a single type of vehicle from the following list: airspeeder, capital ship, space transport, speeder, starfighter, or walker. When you are the pilot or gunner of that type of vehicle, you gain +2 to all attack rolls with a vehicle weapon, and may take 10 on any Pilot checks made while piloting that type of vehicle, even when you are otherwise unable to.

#### Wingman

- **Page:** 17
- **Prerequisites:** Wisdom 13
- **Quick summary:** Swift DC 15 Pilot check grants a nearby allied starfighter or airspeeder +5 on opposed dogfight Pilot checks until your next turn.
- **Production record:** `60b02b78caed8e16`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can make a DC 15 Pilot check to assist any allied starfighter or airspeeder within 2 squares at starship scale. If you succeed, the pilot of that vehicle gains a +5 bonus on all opposed Pilot checks relating to the dogfight action until the start of your next turn.

### Gunner

#### Crippling Hit

- **Page:** 17
- **Prerequisites:** Expert Gunner, System Hit
- **Quick summary:** When your attack moves a vehicle down the condition track, disable its hyperdrive, one weapon/battery, or communications until it fully recovers.
- **Production record:** `4a78bd6bfe03eb8c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you make an attack that causes a vehicle to move -1 or more steps down the condition track, you may also cause it to lose one of the following systems: hyperdrive, one weapon or weapon battery, or communications. The system remains inoperative until the target regains all steps on the condition track.

#### Great Shot

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** Treat vehicle-weapon targets as one range category closer for range bonuses and penalties.
- **Production record:** `221eb131fcb23585`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When firing a vehicle weapon, you treat the distance to the target as though it were one range category less than it actually is. For example, when targeting an enemy at short range, you treat it as though it were at point blank range for the purpose of determining bonuses or penalties.

#### Synchronized Fire

- **Page:** 17
- **Prerequisites:** Expert Gunner
- **Quick summary:** Once per encounter, coordinate one weapon with an ally so two successful hits combine before SR/DR and damage-threshold comparison.
- **Production record:** `388f30468a80f221`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you may ready to fire a single weapon at the same target as an ally, and you coordinate with a single weapon of your ally. If both attacks hit, you add the damage of the two weapons together before applying the target's SR or DR, and treat it as a single attack for purposes of exceeding the target's damage threshold.

### Lineage

#### Engineer

- **Page:** 16
- **Prerequisites:** Educated, trained in the Knowledge (technology) skill
- **Quick summary:** Become trained in Mechanics and reduce vehicle-system installation time by 25%.
- **Production record:** `c727d7a40330d10d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are trained in the Mechanics skill. Additionally, when installing new systems into a vehicle, the efficiency of your designs reduces the time it takes to install the system by 25%.

### Naval Officer

#### Combined Fire

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** Swiftly designate a visible target; batteries gain damage dice every 2 points over Reflex, and tactical fire may designate one weapon/battery to attack.
- **Production record:** `17518b7669101122`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you may designate a single creature, vehicle, or object within your line of sight as the target of combined fire. Any weapon batteries attacking that target deal an extra die of damage for every 2 points their attack roll exceeds the target's Reflex Defense (instead of every 3 points). In addition, when using the tactical fire option for a capital ship (see ship descriptions in Chapter 4), you may designate a weapon or weapon battery to make a single attack.

#### Fleet Deployment

- **Page:** 18
- **Prerequisites:** Charisma 13
- **Quick summary:** Full-round action lets visible vehicles up to your class level immediately move their speed.
- **Production record:** `d1c2e9bdbb58b715`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a full-round action, you can designate a number of vehicles equal to your class level and within your line of sight. Those vehicles may immediately move a number of squares equal to their speed.

#### Fleet Tactics

- **Page:** 18
- **Prerequisites:** Charisma 13, Fleet Deployment
- **Quick summary:** Standard action and DC 15 Knowledge (tactics) check grants visible allied gunners +1 damage die against one vehicle until your next turn.
- **Production record:** `d8d7218123a28f39`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you may designate a single vehicle as the target of a large-scale assault. If you succeed on a DC 15 Knowledge (tactics) check, all allied gunners within line of sight deal 1 additional die of damage to the target with each successful ranged attack until the start of your next turn. This is a mind-affecting effect.

#### It's a Trap!

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a reaction, grant the pilot of one visible vehicle an immediate move action.
- **Production record:** `8fe560a110d8f4ee`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are skilled at sensing the plans of enemy naval officers and counteracting them. Once per encounter as a reaction, you can grant the pilot of any single vehicle within line of sight (including a vehicle you are commanding) an immediate move action.

#### Legendary Commander

- **Page:** 18
- **Prerequisites:** Charisma 13, Intelligence 13, Born Leader
- **Quick summary:** As capital-ship commander, improve Reflex calculation, gunner damage scaling, and generic crew quality.
- **Production record:** `d1683318140f3906`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you are the commander of a capital ship, calculate its Reflex Defense using your heroic level plus one-half the ship's armor bonus (round down), the pilot's heroic level, or the ship's armor bonus, whichever is more. In addition, all gunners on your ship add one-half your heroic level or one-half their heroic level, whichever is more, to damage rolls with vehicle weapons. Finally, you treat any generic crew as being one quality level higher (maximum of ace).

### Outlaw Tech

#### Fast Repairs

- **Page:** 16
- **Prerequisites:** Trained in the Mechanics skill
- **Quick summary:** Jury-rigging grants temporary hit points equal to your Mechanics check result for the encounter.
- **Production record:** `36f8497081dce05a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you jury-rig an object or vehicle, the vehicle gains a number of temporary hit points equal to the result of your Mechanics check. Damage is subtracted from these temporary hit points first, and temporary hit points go away at the conclusion of the encounter.

#### Hot Wire

- **Page:** 16
- **Prerequisites:** Trained in the Mechanics skill
- **Quick summary:** Use Mechanics instead of Use Computer to improve computer access, including qualifying rerolls.
- **Production record:** `d2b9069670413a43`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use your Mechanics check modifier instead of your Use Computer check modifier when making Use Computer checks to improve access to a computer system. You are considered trained in the Use Computer skill for purposes of using this talent. If you are entitled to a Use Computer check reroll, you may reroll your Mechanics check instead (subject to the same circumstances and limitations).

#### Personalized Modifications

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** As a standard action, tune a powered weapon you wield for +1 attack and +2 damage for the encounter.
- **Production record:** `111b0a9d1f8d5111`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you may tweak the settings, grips, and moving parts of a powered weapon you wield, tailoring it to your needs. For the remainder of the encounter, you gain a +1 equipment bonus on attack rolls and a +2 equipment bonus on damage rolls with that weapon. You can use this talent only on powered weapons (those that require a power cell to operate), including weapons connected to a larger power source (such as vehicle and starship weapons).

#### Quick Fix

- **Page:** 17
- **Prerequisites:** Trained in the Mechanics skill
- **Quick summary:** Once per encounter, jury-rig an object or vehicle even if it is not disabled.
- **Production record:** `3e6f7edaeec04a06`
- **Phase 3B disposition:** `CORRECT_TREE`

**Canonical rules text**

Once per encounter, you may jury-rig an object or vehicle that is not disabled. All normal benefits and penalties for jury-rigging still apply.

### Sense

#### Force Reflexes

- **Page:** 16
- **Prerequisites:** Force Sensitivity, Starship Tactics, Force Pilot
- **Quick summary:** Spend a Force Point when activating a starship maneuver to reroll the Pilot check and keep the better result.
- **Production record:** `ece2612b7449f39a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When activating a starship maneuver, you may spend a Force Point to reroll your Pilot check, keeping the better result. See Chapter 2 for more information on starship maneuvers.

### Squadron Leader

#### Begin Attack Run

- **Page:** 17
- **Prerequisites:** Charisma 13
- **Quick summary:** Swiftly designate one target; squadron attack runs against it gain +5 instead of +2.
- **Production record:** `7e0b34a95b5f465d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you designate a single target. When using the attack run action against that target, vehicles in your squadron gain a +5 bonus on their attack rolls (instead of the normal +2). You may have only one target designated at a time.

#### Regroup

- **Page:** 18
- **Prerequisites:** Charisma 13
- **Quick summary:** Once per encounter, standard action moves every squadron vehicle +1 step on the condition track.
- **Production record:** `10a43f0f9d4b31f5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a standard action, you can move all vehicles in your squadron +1 step on their condition tracks.

#### Squadron Maneuvers

- **Page:** 18
- **Prerequisites:** Charisma 13, any other ace pilot talent
- **Quick summary:** Choose one Expert Pilot or Gunner talent you possess; once per encounter, grant its benefits to your whole squadron for the encounter.
- **Production record:** `991dbfc3a436b5a1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Choose one talent that you already possess. The talent you select must be from the Expert Pilot or Gunner talent trees. Once per encounter as a standard action, you can impart the benefits of the chosen talent to all members of your squadron. Once gained, its benefits last until the end of the encounter.

#### Squadron Tactics

- **Page:** 18
- **Prerequisites:** Charisma 13, Wisdom 13, any other ace pilot talent, Squadron Maneuvers, Starship Tactics
- **Quick summary:** Once per encounter when you use a starship maneuver, each squadron ship may independently use that maneuver once on its next turn.
- **Production record:** `ec12bc7f161a0893`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, when you use a starship maneuver, you grant all ships in your squadron the ability to use the same maneuver once on their next turn. The pilot of each ship that chooses to use the maneuver must make any Pilot checks or attack rolls the maneuver requires—your success or failure with the maneuver has no bearing on the success of other units of your squadron.

---

## Book 7 — Threats of the Galaxy

**Phase 3B status:** COMPLETE — 11 owned canonical identities; 11 UPDATE_CONTENT; 0 CREATE; 0 CORRECT_TREE.

### Dark Side

#### Drain Knowledge

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** Spend a Force Point to drain a touched enemy's skill knowledge or specific information, inflicting a persistent condition and increasing your Dark Side Score.
- **Production record:** `d46612d82307f0db`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can spend a Force Point to drain the knowledge of an enemy you touch; you must succeed on a Use the Force check (DC equal to the target's Will Defense) to activate this talent, and if you fail to activate this talent, you may not try again on the same target for one day. If successful, you immediately become trained in one skill that the target is trained in; if you are already trained in that skill, you instead gain Skill Focus in that skill. This training or focus lasts for one day. Additionally, your target moves -1 persistent step along the condition track, and the persistent condition can be removed only by resting for 8 hours.

Additionally, you can choose to instead sift through the mind of the target, looking for a specific piece of knowledge or information. Doing so requires you to make a Perception check against the target's Will Defense; success indicates that you pull the relevant information from the target's mind. When you do so, you do not gain the training or focus normally granted by this talent, but otherwise the talent functions as normal.

Using this talent increases your Dark Side Score by 1.

### Malkite Poisoner

#### Malkite Techniques

- **Page:** 13
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, coat a nonenergy slashing or piercing weapon with a toxin that repeatedly attacks Fortitude, deals damage, and moves the victim down the condition track.
- **Production record:** `744c2eaaa48e15af`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can apply a toxin to any nonenergy slashing or piercing weapon as a standard action. If an attack roll with that weapon also exceeds the target's Fortitude Defense, that target is poisoned. Each round on the creature's turn, the poison makes an attack roll (1d20 + your heroic level) against the target's Fortitude Defense. If the attack succeeds, the target takes damage equal to 1d6 + one-half your heroic level and moves -1 step along the condition track. A target moved to the end of the condition track by the poison is unconscious but continues to take damage as long as the poison continues to attack. The poison attacks each round until it misses or until the victim is cured with a Treat Injury check (DC 10 + your heroic level).

#### Modify Poison

- **Page:** 13
- **Prerequisites:** Malkite Techniques
- **Quick summary:** Change a poison's delivery method with Knowledge (life sciences) against its Treat Injury DC.
- **Production record:** `661899f73e20f2ce`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can modify the delivery method of a poison (contact, ingested, inhaled, injury) to another delivery method by succeeding on a Knowledge (life sciences) check (DC equal to the poison's Treat Injury DC). The poison's capabilities and specific effects are unchanged.

#### Numbing Poison

- **Page:** 13
- **Prerequisites:** Malkite Techniques
- **Quick summary:** Poisoned targets lose their Dexterity bonus to Reflex Defense while the poison remains active.
- **Production record:** `458647466717fcc2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Any target you poison is automatically denied its Dexterity bonus to its Reflex Defense for as long as it remains poisoned.

#### Undetectable Poison

- **Page:** 13
- **Prerequisites:** Malkite Techniques
- **Quick summary:** Increase by 5 the Treat Injury DC required to cure a poison you used.
- **Production record:** `c5726f0e65f643ab`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

The Treat Injury DC needed to cure a poison you have used against a target increases by 5.

#### Vicious Poison

- **Page:** 13
- **Prerequisites:** Malkite Techniques
- **Quick summary:** Your poisons gain +2 on attack rolls against the poisoned target's Fortitude Defense.
- **Production record:** `b9c850fce4aa9c55`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Any poisons you have used against a target gain a +2 bonus to their attack rolls made against that target's Fortitude Defense.

### Master of Teräs Käsi

#### Ignore Damage Reduction

- **Page:** 53
- **Prerequisites:** Teräs Käsi Basics, Martial Arts I
- **Quick summary:** If an unarmed attack's damage exceeds the target's DR, ignore that DR completely.
- **Production record:** `566e0020c5866222`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you make an unarmed attack against a target that has damage reduction, and you deal more damage than the target's DR, you ignore the target's DR completely.

#### Teräs Käsi Basics

- **Page:** 53
- **Prerequisites:** Martial Arts I
- **Quick summary:** Unarmed attacks deal one additional damage die.
- **Production record:** `67bddb17ae2770f3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You deal an additional die of damage with your unarmed attacks.

#### Teräs Käsi Mastery

- **Page:** 53
- **Prerequisites:** Teräs Käsi Basics, Martial Arts I, Martial Arts II, Martial Arts III
- **Quick summary:** A full attack made only with unarmed attacks can be taken as a standard action.
- **Production record:** `69da2f9701ef65b4`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you make only unarmed attacks during a full attack action, you can take the full attack action as a standard action instead of a full-round action.

#### Unarmed Counterstrike

- **Page:** 53
- **Prerequisites:** Teräs Käsi Basics, Unarmed Parry, Martial Arts I, Martial Arts II
- **Quick summary:** After successfully using Unarmed Parry, immediately make an unarmed reaction attack against that attacker.
- **Production record:** `3282f9b1d3769f9c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you successfully parry a melee attack with the Unarmed Parry talent, you can immediately make an unarmed attack as a reaction against that target.

#### Unarmed Parry

- **Page:** 53
- **Prerequisites:** Teräs Käsi Basics, Martial Arts I, Martial Arts II
- **Quick summary:** While fighting defensively, react with an unarmed attack roll to negate an incoming melee attack, with cumulative penalties for repeated rolls.
- **Production record:** `379019c29b37d717`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you fight defensively, as a reaction you can negate a melee attack by making a successful unarmed attack roll. If your attack roll equals or exceeds the attack roll of the incoming melee attack, the attack is negated. You must be aware of the attack and not flat-footed, and you take a cumulative -2 penalty to all attack rolls for each attack roll made since the beginning of your last turn.

---


## Book 9 — Unknown Regions

**Phase 3B status:** COMPLETE — 57 owned canonical identities; 11 UPDATE_CONTENT; 44 CREATE; 2 IDENTITY_SPLIT.

### Jedi Sentinel

#### Sense Primal Force

- **Page:** 19
- **Prerequisites:** None.
- **Quick summary:** When within a natural wilderness area, such as a jungle, forest, steppe, swamp, or plains, you tap into the vibrant living Force of the area and can use Sense Surroundings to detect targets out to a 30-square radius, regardless of line of sight.
- **Production record:** `a1355dcae60772f5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When within a natural wilderness area, such as a jungle, forest, steppe, swamp, or plains, you tap into the vibrant living Force of the area and can use Sense Surroundings to detect targets out to a 30-square radius, regardless of line of sight.

### Exile

#### Arrogant Bluster

- **Page:** 19
- **Prerequisites:** Trained in the Persuasion skill
- **Quick summary:** When you make a successful Persuasion check to change an enemy's attitude, the enemy takes a -5 penalty to its Will Defense until the end of your next turn.
- **Production target:** CREATE `16d615430294378b`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you make a successful Persuasion check to change an enemy's attitude, the enemy takes a -5 penalty to its Will Defense until the end of your next turn. If you spend a Force Point, the duration is extended to the end of the encounter. This is a mind-affecting effect.

#### Band Together

- **Page:** 19
- **Prerequisites:** Galactic Guidance, Self-Reliant, trained in the Persuasion and Knowledge (galactic lore) skills
- **Quick summary:** Once each per encounter, designate a target for +1d6 allied damage, grant nearby allies +5 Will, or temporarily turn an unfriendly/indifferent NPC into an ally.
- **Production target:** CREATE `03123bd5c86beaa0`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use each of the following actions once per encounter. Directed Attack: As a swift action, designate one enemy character or vehicle; until the end of your next turn, whenever an ally within 12 squares hits that target, add 1d6 damage to each hit. Strength in Numbers: As a swift action, grant all allies within 12 squares and line of sight a +5 bonus to Will Defense until the end of your next turn; you must have at least two allies to use this action. Temporary Allies: With a successful Persuasion check, turn a Gamemaster character whose attitude is unfriendly or indifferent into an ally willing to aid you and follow your direction for the remainder of the encounter; as a swift action you direct that character to attack, aid another, or use a skill to aid you or your allies. This is a mind-affecting effect.

#### Galactic Guidance

- **Page:** 20
- **Prerequisites:** Trained in the Knowledge (galactic lore) skill
- **Quick summary:** Once per encounter, as a reaction, if you succeed on a DC 25 Knowledge (galactic lore) check, you enable one ally within 6 squares and line of sight to reroll a failed Intelligence- or Wisdom-based skill check other than Perception.
- **Production record:** `b62303265cab4eeb`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction, if you succeed on a DC 25 Knowledge (galactic lore) check, you enable one ally within 6 squares and line of sight to reroll a failed Intelligence- or Wisdom-based skill check other than Perception.

#### Rant

- **Page:** 20
- **Prerequisites:** Trained in the Persuasion skill
- **Quick summary:** If you succeed on a Persuasion check to intimidate an enemy within 6 squares that can hear, see, and understand you, you deny that enemy the use of a move action on its next turn instead of gaining the normal intimidation result.
- **Production target:** CREATE `450d2fd8991be551`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

If you succeed on a Persuasion check to intimidate an enemy within 6 squares that can hear, see, and understand you, you deny that enemy the use of a move action on its next turn instead of gaining the normal intimidation result. You grant one ally a move action to use immediately as a reaction.

#### Self-Reliant

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, you can use one talent that you possess from the Inspiration talent tree on yourself, although you are not normally allowed to do so.
- **Production target:** CREATE `8e0f2208941073d9`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, you can use one talent that you possess from the Inspiration talent tree on yourself, although you are not normally allowed to do so.

### Leadership

#### Coordinated Leadership

- **Page:** 20
- **Prerequisites:** Born Leader, Coordinate
- **Quick summary:** Choose one talent you possess from the Leadership talent tree.
- **Production target:** CREATE `c349d17c69af3681`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Choose one talent you possess from the Leadership talent tree. The bonuses you provide with this talent are considered untyped bonuses, allowing them to stack with bonuses granted by your allies.

### Outsider

#### Oafish

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, when you fail either a Deception or Persuasion check, you can add a bonus equal to 1d6 + your Wisdom modifier to that check result.
- **Production target:** CREATE `6e57387d51372de7`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, when you fail either a Deception or Persuasion check, you can add a bonus equal to 1d6 + your Wisdom modifier to that check result.

#### Outsider's Eye

- **Page:** 20
- **Prerequisites:** Trained in the Perception skill
- **Quick summary:** Once per encounter, make a DC 20 Perception check as a standard action.
- **Production record:** `2e500e16dc0c4a73`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, make a DC 20 Perception check as a standard action. On success, choose one of the following pieces of information: one Defense score of one character or vehicle within line of sight, or the identity of the character or vehicle within line of sight with the lowest or highest current hit points or the lowest or highest position on the condition track.

#### Outsider's Query

- **Page:** 20
- **Prerequisites:** Trained in the Persuasion skill
- **Quick summary:** If you fail a Persuasion check to change a target's attitude, the target's attitude toward you does not change.
- **Production target:** CREATE `d554c045a75af1a3`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

If you fail a Persuasion check to change a target's attitude, the target's attitude toward you does not change. You can also attempt to change that target's attitude one additional time per encounter.

#### Wary

- **Page:** 20
- **Prerequisites:** Outsider's Eye, trained in the Perception skill
- **Quick summary:** If an enemy fails a Stealth or Deception check opposed by your Perception check, you can take one move action as a reaction.
- **Production target:** CREATE `5d9cd611ff499100`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

If an enemy fails a Stealth or Deception check opposed by your Perception check, you can take one move action as a reaction. If multiple enemies fail on the same turn, the number of move actions you take cannot exceed your Dexterity modifier.

### Spacer

#### Deep Space Raider

- **Page:** 21
- **Prerequisites:** Spacehound, Starship Raider
- **Quick summary:** Once each per encounter, force an enemy aside, fire while escaping at double movement, or temporarily disable a damaged vehicle system.
- **Production target:** CREATE `696f7eed2cc08299`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use each of the following actions once per encounter. Clear a Path: While fighting aboard a starship, as a standard action make a ranged attack; if it hits, on its next turn the target must move its speed to a square not adjacent to you, or if it is an enemy starfighter in a dogfight it must attempt to disengage. Covering Fire: As a full-round action while piloting a vehicle, move the vehicle up to twice its speed and make one ranged attack with a pilot-controlled weapon at any point during the movement; if you damage a vehicle, it takes -2 on attack rolls against your vehicle until the end of your next turn. Disabling Fire: Make a ranged attack with a vehicle weapon; if you damage a vehicle, choose until the end of your next turn to disable one weapon, reduce its SR to 0, disable its hyperdrive, or reduce its speed to 2 squares.

### Camouflage

#### Extended Ambush

- **Page:** 21
- **Prerequisites:** Improved Stealth
- **Quick summary:** During a surprise round, if you make a ranged attack against a target that is surprised, you can aim at that target as a free action.
- **Production target:** CREATE `62320a2cbed97211`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

During a surprise round, if you make a ranged attack against a target that is surprised, you can aim at that target as a free action.

### Hyperspace Explorer

#### Silent Movement

- **Page:** 21
- **Prerequisites:** Trained in the Stealth skill
- **Quick summary:** You never suffer unfavorable circumstances from environmental effects associated with noise when you sneak using Stealth.
- **Production target:** CREATE `084f71defa56162a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You never suffer unfavorable circumstances from environmental effects associated with noise when you sneak using Stealth. Once per round, when you make a Stealth check, you can automatically use the aid another action on one ally's Stealth check.

### Master Scout

#### Piercing Hit

- **Page:** 21
- **Prerequisites:** Acute Senses, Keen Shot
- **Quick summary:** Once each per encounter, damage a target to compromise its armor, impose -2 attacks plus concealment, or reduce its speed to 2.
- **Production target:** CREATE `c08976a5f4ab88d8`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use each of the following actions once per encounter. Binding Hit: Make a melee or ranged attack as a standard action; if you hit and damage the target, it loses its armor bonus to Reflex Defense and is flat-footed until it spends a standard action to adjust its armor. Blinding Fire: Make a melee or ranged attack as a standard action; if it hits and damages the target, the target takes -2 to all attacks and all other creatures, droids, and vehicles have concealment from it until the end of your next turn. Slowing Shot: Make a melee or ranged attack as a standard action; if you hit and damage the target, its speed is reduced to 2 squares until the end of your next turn.

#### Quicktrap

- **Page:** 21
- **Prerequisites:** Jury-Rigger, Tripwire, trained in the Mechanics skill
- **Quick summary:** You can use Tripwire as a move action instead of a standard action.
- **Production target:** CREATE `d620ea6e88436467`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use Tripwire as a move action instead of a standard action.

#### Speedclimber

- **Page:** 21
- **Prerequisites:** Long Stride, Surefooted, trained in the Climb skill
- **Quick summary:** You do not take the penalty when using the Accelerated Climbing application of the Climb skill.
- **Production target:** CREATE `bfb04c89df257f8b`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You do not take the penalty when using the Accelerated Climbing application of the Climb skill.

#### Surprisingly Quick

- **Page:** 21
- **Prerequisites:** Skill Focus (Initiative), trained in the Initiative skill
- **Quick summary:** In a surprise round, if you are not surprised, you can take a swift action in addition to the one other action normally allowed.
- **Production target:** CREATE `b65f65bc442fd695`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

In a surprise round, if you are not surprised, you can take a swift action in addition to the one other action normally allowed. If you are surprised, you can take a single swift action instead of no actions.

#### Tripwire

- **Page:** 21
- **Prerequisites:** Jury-Rigger, trained in the Mechanics skill
- **Quick summary:** Set a concealed clothesline, explosive electronic tripwire, or ankle tripwire across an opening with Mechanics and Deception.
- **Production record:** `9992fb4ee6ab40df`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, set a simple snare or trap across an opening up to 3 squares wide with the required item. Make a DC 20 Mechanics check to set the trap and a Deception check to conceal the wire; compare the Deception result to the next creature's Perception check, with -10 to the Perception check if it observed you setting the trap. If the creature succeeds, it can make a DC 10 Acrobatics check to avoid the wire. Choose one option: Clothesline requires thin wire at neck height and on success knocks the target prone, ends its actions for the turn, and deals 1d6 damage; Electronic tripwire causes mine damage treated as a frag grenade with a 2-square blast radius centered on one end of the wire, automatically hitting the target and attacking adjacent targets at 1d20+10 vs Reflex; Tripwire requires thin wire at ankle height, adds +2 to the Deception result, and on success knocks the target prone and ends its actions for the turn.

### Mobile Scout

#### Battle Mount

- **Page:** 22
- **Prerequisites:** Expert Rider, Terrain Guidance, trained in the Ride skill
- **Quick summary:** Once each per encounter, attack while using your mount as cover, improve mount-cover results, or let the mount attack as a swift action.
- **Production target:** CREATE `f557b3331b5158c8`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use each of the following actions once per encounter. Covered Attack: When using Use Mount as Cover, but not improved cover, you can make an attack as a standard action if you have a free hand. Reduce Profile: When you succeed at Use Mount as Cover, you gain improved cover; if you fail by less than 10, you still gain normal cover, and if you fail by 10 or more you gain no benefit. Swift Attack Mount: Once per encounter, the mount you are riding can make an attack as a swift action instead of a standard action.

#### Expert Rider

- **Page:** 22
- **Prerequisites:** Trained in the Ride skill
- **Quick summary:** You can reroll any Ride check, but the result of the reroll must be accepted even if it is worse.
- **Production record:** `b9169c3ac22d4652`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can reroll any Ride check, but the result of the reroll must be accepted even if it is worse.

#### Terrain Guidance

- **Page:** 22
- **Prerequisites:** Trained in the Ride skill
- **Quick summary:** When in control of your mount, you can make a DC 20 Ride check as a swift action to negate the effect of difficult terrain on your mount's speed.
- **Production target:** CREATE `598c2b9b9bb1136f`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When in control of your mount, you can make a DC 20 Ride check as a swift action to negate the effect of difficult terrain on your mount's speed.

#### Mechanized Rider

- **Page:** 22
- **Prerequisites:** Trained in the Pilot and Ride skills
- **Quick summary:** When riding a speeder bike, swoop, or similar vehicle, you can use the Fast Mount or Dismount, Soft Fall, Stay in Saddle, and Use Mount as Cover applications of the Ride skill.
- **Production target:** CREATE `93b73db64423a7a3`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When riding a speeder bike, swoop, or similar vehicle, you can use the Fast Mount or Dismount, Soft Fall, Stay in Saddle, and Use Mount as Cover applications of the Ride skill.

### Commando

#### Out of Harm's Way

- **Page:** 23
- **Prerequisites:** Harm's Way, trained in the Initiative skill
- **Quick summary:** As a reaction, when you use Harm's Way, which still requires a swift action to activate, you can move into the square of the ally you are protecting and move the ally to any legal square adjacent to you.
- **Production target:** CREATE `1946e16d1e6c831c`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

As a reaction, when you use Harm's Way, which still requires a swift action to activate, you can move into the square of the ally you are protecting and move the ally to any legal square adjacent to you. This movement does not provoke an attack of opportunity.

### Warrior

#### Champion

- **Page:** 23
- **Prerequisites:** Warrior's Awareness, Warrior's Determination
- **Quick summary:** Once each per encounter, enhance second wind, disarm after threshold damage, or add +2 melee/unarmed damage per 5 points your attack beats Reflex.
- **Production target:** CREATE `a7aea0411eb4fbc0`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use each of the following actions once per encounter. Champion's Pride: When you use your second wind, you move +1 step on the condition track and remove one fear effect or mind-affecting effect in addition to the normal benefit of second wind. Disarming Hit: When you hit and damage a creature and that damage equals or exceeds its damage threshold, you can make a Disarm Attack against that target as a free action; if using a ranged weapon, you must also have the Ranged Disarm feat. Masterful Strike: When making a successful unarmed or melee attack other than with a lightsaber, increase your damage by 2 for every 5 points by which your attack roll exceeds the target's Reflex Defense.

#### Quick Study

- **Page:** 23
- **Prerequisites:** Warrior's Awareness
- **Quick summary:** Once per encounter, if an enemy attacks you using a non-Force-related talent, you can use the same talent against it on your next turn.
- **Production target:** CREATE `fd37b68c6fb620f6`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, if an enemy attacks you using a non-Force-related talent, you can use the same talent against it on your next turn. You must use an appropriate weapon or item if required, but you do not need to meet the talent's prerequisites. You can do this even if the enemy's attack misses you.

#### Simple Opportunity

- **Page:** 23
- **Prerequisites:** Weapon Proficiency (simple weapons)
- **Quick summary:** You can make attacks of opportunity when using a ranged or thrown simple weapon against a single target.
- **Production target:** CREATE `7ca8719e6fdf7a2a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can make attacks of opportunity when using a ranged or thrown simple weapon against a single target. Area attack weapons cannot be used with this talent.

#### Warrior's Awareness

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** When an enemy character makes an unarmed or melee attack against you for at least the second time in an encounter, make a Perception check as a reaction.
- **Production record:** `a36c49bcd3fa4395`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When an enemy character makes an unarmed or melee attack against you for at least the second time in an encounter, make a Perception check as a reaction. If successful, you gain +1 to Reflex and Fortitude Defenses against that character until the end of the encounter. You can use this against only one character at a time until that character is incapacitated or killed, or until you voluntarily switch targets by dropping the use of this talent for one full round.

#### Warrior's Determination

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a reaction, you can ignore one non-Force-related effect, talent, skill, or ability that exceeds your Will Defense.
- **Production target:** CREATE `ad08d7ea0c5e859e`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, as a reaction, you can ignore one non-Force-related effect, talent, skill, or ability that exceeds your Will Defense. If you spend a Force Point, you can ignore one mind-affecting effect even if it is the result of a Force power, technique, or secret.

### Expert Pilot

#### Roll Out

- **Page:** 29
- **Prerequisites:** Elusive Dogfighter
- **Quick summary:** When making an opposed check to disengage from a dogfight, you can reroll your Pilot check, taking the better result.
- **Production target:** CREATE `3524a8f7582708d9`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When making an opposed check to disengage from a dogfight, you can reroll your Pilot check, taking the better result. If you fail, you remain in the dogfight, but the gunners on your vehicle do not take penalties to their attack rolls.

### Gunner

#### Fast Attack Specialist

- **Page:** 29
- **Prerequisites:** Expert Gunner, Quick Trigger
- **Quick summary:** Once per encounter, when piloting a vehicle of Gargantuan size or smaller, you can make a full attack as a standard action.
- **Production target:** CREATE `c6708ba5777c248e`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, when piloting a vehicle of Gargantuan size or smaller, you can make a full attack as a standard action. You can spend a Force Point to use this action one additional time in an encounter.

#### Overcharged Shot

- **Page:** 29
- **Prerequisites:** Expert Gunner
- **Quick summary:** As a swift action, you can overcharge your vehicle's energy weapon and deal 1 additional die of damage on your next attack in the same turn.
- **Production target:** CREATE `b9894d35f93cae97`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action, you can overcharge your vehicle's energy weapon and deal 1 additional die of damage on your next attack in the same turn. However, your weapon loses 1 die of damage on its subsequent attacks and cannot be overcharged again until a full round passes without the weapon firing.

### Bounty Hunter

#### Familiar Enemies

- **Page:** 29
- **Prerequisites:** Familiar foe special quality
- **Quick summary:** You can apply your familiar foe bonus against a second enemy.
- **Production target:** CREATE `d20ee3d5e6b8e703`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can apply your familiar foe bonus against a second enemy. If you can see both enemies simultaneously in the same round, you need to spend only a single full-round action observing them; otherwise you must spend a separate full-round action on each enemy.

#### Familiar Situation

- **Page:** 29
- **Prerequisites:** Familiar foe special quality
- **Quick summary:** You can apply your familiar foe bonus to your Fortitude and Will Defenses against attacks and actions taken against you by the target of your familiar foe special quality.
- **Production target:** CREATE `5ae43bdec20b714c`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can apply your familiar foe bonus to your Fortitude and Will Defenses against attacks and actions taken against you by the target of your familiar foe special quality.

#### Quick Cuffs

- **Page:** 29
- **Prerequisites:** Quick Draw feat
- **Quick summary:** As a swift action, when you successfully use the grab action against a target, you can use binder cuffs or similar restraints to bind one of the target's arms to one of your arms or to an adjacent object.
- **Production target:** CREATE `842d1dfc65cce80a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action, when you successfully use the grab action against a target, you can use binder cuffs or similar restraints to bind one of the target's arms to one of your arms or to an adjacent object. You cannot use improvised materials, and the binders must be in your hands or readily available. You and the target both take -2 to attack rolls and Reflex Defense while bound together.

### Infamy

#### Master Manipulator

- **Page:** 29
- **Prerequisites:** Notorious, Skill Focus (Persuasion), trained in the Persuasion skill
- **Quick summary:** When you make a successful Persuasion check, you can immediately make a second Persuasion check against the same target even if it is not normally allowed.
- **Production target:** CREATE `32fb42ce3ee46e6d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you make a successful Persuasion check, you can immediately make a second Persuasion check against the same target even if it is not normally allowed. The second check need not be for the same use of Persuasion as the first.

#### Small Favor

- **Page:** 29
- **Prerequisites:** Notorious, trained in the Persuasion skill
- **Quick summary:** Once per day, make a DC 25 Persuasion check.
- **Production target:** CREATE `81e423a476c377fa`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per day, make a DC 25 Persuasion check. On success, an informant gives you information, granting a +10 competence bonus to one Gather Information or Knowledge check made within the next 24 hours.

### Mastermind

#### Master's Orders

- **Page:** 30
- **Prerequisites:** Impel Ally I, Impel Ally II
- **Quick summary:** When an ally uses an action granted to him or her by you, the ally can reroll any attack or check made during that action, taking the better result.
- **Production target:** CREATE `8149b23aece320fd`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When an ally uses an action granted to him or her by you, the ally can reroll any attack or check made during that action, taking the better result.

### Critical Master

#### Extended Critical Range (simple weapons)

- **Page:** 30
- **Prerequisites:** Weapon Proficiency (simple weapons), base attack bonus +10
- **Quick summary:** When you attack with a simple weapon, extend the weapon's critical range by 1.
- **Production target:** CREATE `7cbd576e420a36b0`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you attack with a simple weapon, extend the weapon's critical range by 1. Anything other than a natural 20 is not an automatic hit; if the attack still misses, you do not score a critical hit.

### Weapon Master

#### Extended Threat

- **Page:** 30
- **Prerequisites:** Weapon Focus and Weapon Proficiency with weapon used
- **Quick summary:** When using a ranged weapon eligible to make attacks of opportunity, you threaten all squares within a 2-square radius.
- **Production target:** CREATE `4699879601d8891c`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When using a ranged weapon eligible to make attacks of opportunity, you threaten all squares within a 2-square radius.

#### Multiattack Proficiency (simple weapons)

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** When you make multiple attacks with any type of simple weapon as a full attack action, reduce the penalty to your attack rolls by 2.
- **Production target:** CREATE `eb37a8bab49f8ab7`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you make multiple attacks with any type of simple weapon as a full attack action, reduce the penalty to your attack rolls by 2. You can take this talent multiple times; each additional selection reduces the penalty by another 2.

#### Two-For-One Throw

- **Page:** 30
- **Prerequisites:** Weapon Focus (simple weapons), Weapon Proficiency (simple weapons)
- **Quick summary:** As a standard action, you can throw two weapons simultaneously at the same enemy or target square with one hand.
- **Production target:** CREATE `5730c15fad41ebb3`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a standard action, you can throw two weapons simultaneously at the same enemy or target square with one hand. Make separate attack rolls for each weapon at a -10 penalty. The weapons must be similar and no larger than one size category smaller than you, and the attack cannot exceed short range, typically 8 squares.

### Force Adept

#### Instrument of the Force

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** When you successfully use Search Your Feelings, you gain a Force Point that must be used before the end of the encounter.
- **Production record:** `f0ade00000000001`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you successfully use Search Your Feelings, you gain a Force Point that must be used before the end of the encounter. If you use this Force Point in a manner that would end in unfavorable results according to Search Your Feelings, increase your Dark Side Score by 1. If you use the Force Point in an action that would normally increase your Dark Side Score, increase it by 2 instead.

#### Long Call

- **Page:** 30
- **Prerequisites:** Mystical Link
- **Quick summary:** When using the telepathy ability of Use the Force, reduce the DC of the Use the Force check by half, as do Force-users for whom you are a willing telepathic recipient.
- **Production record:** `f0ade00000000002`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When using the telepathy ability of Use the Force, reduce the DC of the Use the Force check by half, as do Force-users for whom you are a willing telepathic recipient. When attempting to contact an unwilling target, you can reroll and take the better result. By spending a Force Point, you can simultaneously contact a number of targets equal to your Charisma modifier, minimum two, with a single Use the Force check.

#### Mystical Link

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** As a standard action, make a DC 30 Use the Force check.
- **Production record:** `45c4e72d74c44acb`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, make a DC 30 Use the Force check. If successful, gain one benefit selected by the Gamemaster: return one Force power to your Force suite; gain one Force Point that is lost if not spent before the end of the encounter; gain an additional use of a Force-related talent or feat normally restricted to once per encounter; or roll an additional die when making a Force check and select the highest die rolled.

### Gunslinger

#### Lingering Debilitation

- **Page:** 31
- **Prerequisites:** Debilitating Shot
- **Quick summary:** Once per encounter, when you successfully use Debilitating Shot to move a target character -1 step on the condition track, the target suffers a persistent condition requiring 4 hours of rest or a DC 25 Treat Injury check to remove.
- **Production target:** CREATE `1250a3dac18104eb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, when you successfully use Debilitating Shot to move a target character -1 step on the condition track, the target suffers a persistent condition requiring 4 hours of rest or a DC 25 Treat Injury check to remove.

#### Retreating Fire

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** When moving away from a pursuing target, if you either run or use two move actions during this turn, you can make a single ranged attack with a -5 penalty as part of your move action.
- **Production target:** CREATE `c92468ee73588b90`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When moving away from a pursuing target, if you either run or use two move actions during this turn, you can make a single ranged attack with a -5 penalty as part of your move action. You can spend a Force Point to avoid the penalty.

#### Slowing Shot

- **Page:** 31
- **Prerequisites:** Debilitating Shot
- **Quick summary:** If you successfully use Debilitating Shot, until the target moves to the normal state on the condition track or until the end of the encounter, the target's speed is reduced by 2 squares, it loses its Dexterity bonus to Reflex Defense, and it is considered flat-footed.
- **Production target:** CREATE `c04e66a3f2577e62`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

If you successfully use Debilitating Shot, until the target moves to the normal state on the condition track or until the end of the encounter, the target's speed is reduced by 2 squares, it loses its Dexterity bonus to Reflex Defense, and it is considered flat-footed. These effects are in addition to Debilitating Shot. If you spend a Force Point, the target's speed is reduced by 4 squares or half its normal speed, whichever is the greater reduction.

#### Swift Shot

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, you can make a single ranged attack with a handheld weapon as a swift action instead of a standard action.
- **Production target:** CREATE `dccac6744e458608`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, you can make a single ranged attack with a handheld weapon as a swift action instead of a standard action. You cannot use your remaining actions for an attack.

### Military Tactics

#### Commander's Prerogative

- **Page:** 31
- **Prerequisites:** Trained in the Initiative skill
- **Quick summary:** During the first round of combat after the surprise round, if any, you can take your turn before any of your allies, but you must use either the share talent prestige class ability or a talent from the Commando, Leadership, or Military Tactics talent trees as part of your turn.
- **Production record:** `d18f6de464dc42cf`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

During the first round of combat after the surprise round, if any, you can take your turn before any of your allies, but you must use either the share talent prestige class ability or a talent from the Commando, Leadership, or Military Tactics talent trees as part of your turn. On the subsequent round, return to your normal place in initiative.

#### Irregular Tactics

- **Page:** 31
- **Prerequisites:** Share talent special quality
- **Quick summary:** After using the share talent special quality, make a Knowledge (tactics) check as a free action.
- **Production target:** CREATE `2be9f49f9c675bfb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

After using the share talent special quality, make a Knowledge (tactics) check as a free action. The result replaces the DC of any talents that use Knowledge (tactics) from the Military Tactics tree used against you or your allies by enemy commanders or tacticians that can observe your forces.

#### Lead by Example

- **Page:** 31
- **Prerequisites:** Share talent special quality
- **Quick summary:** If you have already used a talent in an encounter before granting the same talent to an ally with your share talent special quality in the same encounter, any character who benefits from share talent gains one of the following when using that talent: reduce the talent's DC by 5; increase by +2 any bonus to attack, Defense, or damage used by the talent; or reduce damage taken through the talent by 10 points.
- **Production target:** CREATE `7369f8ce78ce4821`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

If you have already used a talent in an encounter before granting the same talent to an ally with your share talent special quality in the same encounter, any character who benefits from share talent gains one of the following when using that talent: reduce the talent's DC by 5; increase by +2 any bonus to attack, Defense, or damage used by the talent; or reduce damage taken through the talent by 10 points. If more than one applies, the character selects the desired effect.

#### Turn the Tide

- **Page:** 31
- **Prerequisites:** Command Decision, Commander's Prerogative, trained in the Initiative skill
- **Quick summary:** Once per encounter, after the first round of combat, make a Knowledge (tactics) check as a full-round action and compare the result to the Will Defense of all enemies within 12 squares and line of sight.
- **Production target:** CREATE `4a3fdcd0f32062b2`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, after the first round of combat, make a Knowledge (tactics) check as a full-round action and compare the result to the Will Defense of all enemies within 12 squares and line of sight. Affected enemies must reroll Initiative at the start of the next round. Allies within your line of sight can choose whether to reroll. Rerolls and other Initiative modifiers apply normally.

### Blazing Chain

#### Force Directed Shot

- **Page:** 33
- **Prerequisites:** Force Sensitivity, trained in the Use the Force skill
- **Quick summary:** As a swift action, select one square within 12 squares and line of sight.
- **Production target:** CREATE `e1557fe93f2d960c`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action, select one square within 12 squares and line of sight. Treat that square as the origin square for your next ranged attack with an energy weapon made before the end of your next turn, determining cover and concealment as though firing from that square. You must still have line of sight to the target from your own square.

#### Negate and Redirect

- **Page:** 33
- **Prerequisites:** Negate energy, Force Sensitivity, trained in Use the Force
- **Quick summary:** When you successfully use negate energy against a ranged energy weapon, as a free action immediately afterward choose one enemy you can see within 6 squares and make a Use the Force check against its Fortitude Defense.
- **Production target:** CREATE `9687660c05ff7992`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you successfully use negate energy against a ranged energy weapon, as a free action immediately afterward choose one enemy you can see within 6 squares and make a Use the Force check against its Fortitude Defense. On a hit, the target takes energy damage equal to one-half the damage you negated.

#### Rising Anger

- **Page:** 33
- **Prerequisites:** Force Sensitivity, Dark Side Score of 1 or higher
- **Quick summary:** Once per round as a reaction to an ally taking damage or being moved down the condition track by an enemy, gain a +1 morale bonus to your next attack roll.
- **Production target:** CREATE `421af33d2ee72101`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per round as a reaction to an ally taking damage or being moved down the condition track by an enemy, gain a +1 morale bonus to your next attack roll. If you use this talent again before making an attack, the bonus increases by 1, to a maximum of +5.

#### Rising Panic

- **Page:** 33
- **Prerequisites:** Force Sensitivity, Dark Side Score of 1 or higher
- **Quick summary:** Once per round as a reaction to an enemy damaging one of your allies or moving one of your allies down the condition track, make a Use the Force check against that enemy's Will Defense.
- **Production record:** `d091b5f6b34b4967`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per round as a reaction to an enemy damaging one of your allies or moving one of your allies down the condition track, make a Use the Force check against that enemy's Will Defense. On success, move the target -1 step on the condition track. A target moved to the bottom of the track by this talent does not fall unconscious, but must spend its actions fleeing combat for one minute or until it moves up the condition track. This is a mind-affecting fear effect.

---

## Book 10 — Legacy Era Campaign Guide

**Phase 3B status:** COMPLETE — 101 owned canonical identities; 89 UPDATE_CONTENT; 1 UPDATE_METADATA; 1 REMOVE_CONTAMINATION; 1 CORRECT_TREE; 9 CREATE.

### Jedi Consular

#### Aggressive Negotiator

- **Page:** 26
- **Prerequisites:** Adept Negotiator
- **Quick summary:** Whenever you damage an opponent with a lightsaber attack, you can take 10 on any Persuasion checks you make before the end of your next turn, even if you would not normally be able to.
- **Production record:** `f7bf586a35299965`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you damage an opponent with a lightsaber attack, you can take 10 on any Persuasion checks you make before the end of your next turn, even if you would not normally be able to.

#### Consular's Wisdom

- **Page:** 26
- **Prerequisites:** Adept Negotiator
- **Quick summary:** Once per encounter as a swift action, you can choose one ally within your line of sight that can hear and understand you.
- **Production record:** `321a3e9b59e7c7d7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a swift action, you can choose one ally within your line of sight that can hear and understand you. Until the end of the encounter, that ally adds your Wisdom bonus to its Will Defense against mind-affecting effects.

#### Entreat Aid

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** Once per turn as a swift action, you can spend a Force Point to let one adjacent ally use the aid another action (as a reaction) to assist you with a skill check.
- **Production record:** `f561d569196bdda5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn as a swift action, you can spend a Force Point to let one adjacent ally use the aid another action (as a reaction) to assist you with a skill check. You must make the skill check before the end of your turn, or the benefit of the aid another action is lost. An ally that has already used the aid another action to assist you since the end of your last turn may not be targeted by this talent.

### Jedi Guardian

#### Defensive Acuity

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** When you take the fight defensively action, you deal +1 die of damage with lightsaber attacks and gain a +2 circumstance bonus on Use the Force checks made to negate an attack with the Block or Deflect talents.
- **Production record:** `0bc102751285d17c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you take the fight defensively action, you deal +1 die of damage with lightsaber attacks and gain a +2 circumstance bonus on Use the Force checks made to negate an attack with the Block or Deflect talents. These benefits last until the end of your next turn.

### Jedi Sentinel

#### Dark Side Bane

- **Page:** 27
- **Prerequisites:** Dark Side Sense
- **Quick summary:** When you use a damage-dealing Force power against a creature with a Dark Side Score of 1 or higher, you deal extra damage on a hit equal to your Charisma bonus (minimum +1).
- **Production record:** `97a771d1f4627521`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use a damage-dealing Force power against a creature with a Dark Side Score of 1 or higher, you deal extra damage on a hit equal to your Charisma bonus (minimum +1).

### Lightsaber Combat

#### Cortosis Gauntlet Block

- **Page:** 27
- **Prerequisites:** Armor Proficiency (light, medium)
- **Quick summary:** You have received additional training in the use of cortosis gauntlets (see page 183).
- **Production record:** `8989464c43d81045`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have received additional training in the use of cortosis gauntlets (see page 183). You can use the Block talent, even when not armed with a lightsaber, provided you are wearing a cortosis gauntlet. If you successfully block an attack with a lightsaber while wearing a cortosis gauntlet, the attacking lightsaber is deactivated.

#### Precision

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** As a standard action, you can make a melee attack with a lightsaber against an adjacent opponent.
- **Production record:** `80e14ef4d1f52a4a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can make a melee attack with a lightsaber against an adjacent opponent. If the attack hits, it deals normal damage and also reduces the target's speed to 2 squares until the end of your next turn.

### Provocateur

#### Cast Suspicion

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** As a swift action, you can select one enemy within your line of sight.
- **Production record:** `9408056ede41b43f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can select one enemy within your line of sight. That enemy loses all morale and insight bonuses on attack rolls and cannot be aided (using the aid another action) by its allies until the end of your next turn.

#### Distress to Discord

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** You encourage your allies to sow discord among your enemies by fighting with renewed vigor.
- **Production record:** `974c24246ed2b972`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You encourage your allies to sow discord among your enemies by fighting with renewed vigor. Whenever an ally within your line of sight takes its second wind, all enemies within 2 squares of that ally lose their Dexterity bonuses to Reflex Defense until the end of your next turn.

#### Friend or Foe

- **Page:** 27
- **Prerequisites:** Cast Suspicion
- **Quick summary:** Whenever an ally within your line of sight is missed by a ranged attack, you can (as a reaction, once per turn) designate one enemy adjacent to that ally.
- **Production record:** `014d291a6e16cc12`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever an ally within your line of sight is missed by a ranged attack, you can (as a reaction, once per turn) designate one enemy adjacent to that ally. Compare the attack roll of the missed attack to the Reflex Defense of that enemy; if the attack would hit, the attack targets that enemy and is resolved as normal.

#### Seize the Moment

- **Page:** 27
- **Prerequisites:** Distress to Discord
- **Quick summary:** Once per turn as a reaction, when an enemy is reduced to 0 hit points or is moved down the condition track by any means, you allow one ally within your line of sight to take its second wind immediately (as a free action).
- **Production record:** `ec12ce36ff7048f2`
- **Phase 3B disposition:** `REMOVE_CONTAMINATION`

**Canonical rules text**

Once per turn as a reaction, when an enemy is reduced to 0 hit points or is moved down the condition track by any means, you allow one ally within your line of sight to take its second wind immediately (as a free action). Furthermore, when your ally takes its second wind, it regains a number of additional hit points equal to your class level.

#### Stolen Advantage

- **Page:** 28
- **Prerequisites:** Cast Suspicion
- **Quick summary:** Whenever an enemy within your line of sight uses the aid another action to grant one of its allies a bonus, you can (as a reaction) designate one ally within your line of sight.
- **Production record:** `d137ae2e8be700b3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever an enemy within your line of sight uses the aid another action to grant one of its allies a bonus, you can (as a reaction) designate one ally within your line of sight. The enemy automatically fails to aid its ally, and the ally you designate gains a +2 bonus on its next attack roll made before the end of your next turn.

#### True Betrayal

- **Page:** 28
- **Prerequisites:** Cast Suspicion, Friend or Foe
- **Quick summary:** As a standard action, make a Persuasion check against the Will Defense of one enemy within your line of sight that can hear and understand you.
- **Production record:** `ce1f5d3316b052f6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, make a Persuasion check against the Will Defense of one enemy within your line of sight that can hear and understand you. If your check result equals or exceeds the target's Will Defense, that target immediately makes an attack (as a free action) against another target of your choice. This can be a melee attack against an adjacent target or a ranged attack against a target within the attacker's point-blank range.

The target gets a +5 bonus to its Will Defense if it is higher level than you. This is a mind-affecting effect.

### Misfortune

#### Seducer

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** You excel at seduction through deception.
- **Production record:** `d21d7d3d4d7be0d2`
- **Phase 3B disposition:** `CORRECT_TREE`

**Canonical rules text**

You excel at seduction through deception. If you fail a Persuasion check to change a target's attitude (see page 71 of the Saga Edition core rulebook), you can immediately reroll the check using your Deception skill in lieu of your Persuasion skill. You must accept the result of the reroll, even if it's lower.

#### Seize Object

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a move action, you can attempt to seize a held, carried, or worn object from an adjacent target by making a Disarm attack, with a +10 bonus on your attack roll.
- **Production record:** `e97177f243cb2b0a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a move action, you can attempt to seize a held, carried, or worn object from an adjacent target by making a Disarm attack, with a +10 bonus on your attack roll. If the attack succeeds, you are now holding the object. You must have a free hand with which to grab the object, and you cannot use this talent in place of the disarm action. You cannot conceal the use of this talent from the target.

### Yuuzhan Vong Biotech

#### Biotech Adept

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** You can reroll any Knowledge (life sciences) or Treat Injury check made to use or repair biotech devices and weapons, but you must keep the second result, even if it is worse.
- **Production record:** `a86559a808738c98`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can reroll any Knowledge (life sciences) or Treat Injury check made to use or repair biotech devices and weapons, but you must keep the second result, even if it is worse.

#### Bugbite

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** You deal +1 die of damage on attacks made with razor bugs and thud bugs.
- **Production record:** `bed279ef3c81c42d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You deal +1 die of damage on attacks made with razor bugs and thud bugs.

#### Curved Throw

- **Page:** 29
- **Prerequisites:** Bugbite
- **Quick summary:** You can spend a swift action to ignore cover (but not total cover) with your next attack with a thud bug or a razor bug made before the end of your turn.
- **Production record:** `76eb427551c6495c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a swift action to ignore cover (but not total cover) with your next attack with a thud bug or a razor bug made before the end of your turn.

#### Surprising Weapons

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** Whenever you successfully hit an enemy with an amphistaff, thud bug, or razor bug, and your attack roll also exceeds the target's Will Defense, that target is considered flat-footed against you until the end of your next turn.
- **Production record:** `6ef0900cd62869e7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully hit an enemy with an amphistaff, thud bug, or razor bug, and your attack roll also exceeds the target's Will Defense, that target is considered flat-footed against you until the end of your next turn.

#### Veiled Biotech

- **Page:** 30
- **Prerequisites:** Trained in Stealth
- **Quick summary:** You gain a +10 competence bonus on Deception and Stealth checks made to conceal any biotechnology or any biotech implants you possess.
- **Production record:** `b66c142c79341858`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a +10 competence bonus on Deception and Stealth checks made to conceal any biotechnology or any biotech implants you possess. Additionally, you may draw a concealed biotech item or weapon as a swift action instead of a standard action; if you then make an attack with that biotech weapon before the end of your turn, your opponent loses its Dexterity bonus to Reflex Defense against the first attack you make with that weapon.

### Versatility

#### Adapt and Survive

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** When an enemy within 24 squares of you and in your line of sight receives a morale or insight bonus of any kind, you also gain the benefits of that bonus until the end of your next turn.
- **Production record:** `ef8a59509a45df46`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When an enemy within 24 squares of you and in your line of sight receives a morale or insight bonus of any kind, you also gain the benefits of that bonus until the end of your next turn.

#### Defensive Protection

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point as a reaction and add the results of the Force Point roll to any one of your defenses, or to one of the defenses of an adjacent ally.
- **Production record:** `ded0046215380b0c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point as a reaction and add the results of the Force Point roll to any one of your defenses, or to one of the defenses of an adjacent ally. This bonus lasts until the beginning of your next turn.

#### Quick on Your Feet

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, you may move up to your speed as a reaction.
- **Production record:** `22d2c4b0d4d9b784`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you may move up to your speed as a reaction.

#### Ready and Willing

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** When you ready an action, you can choose at any time before the start of your next turn to take your readied action at the end of the current turn, after the acting creature, droid, or vehicle completes its action.
- **Production record:** `8a5c6b01f67caa85`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you ready an action, you can choose at any time before the start of your next turn to take your readied action at the end of the current turn, after the acting creature, droid, or vehicle completes its action.

#### Unbalancing Adaptation

- **Page:** 30
- **Prerequisites:** Adapt and Survive
- **Quick summary:** When you use the Adapt and Survive talent, you also deny the bonus that triggered the talent to one enemy within your line of sight.
- **Production record:** `02bf213d8104b017`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use the Adapt and Survive talent, you also deny the bonus that triggered the talent to one enemy within your line of sight.

### Brute Squad

#### Gang Leader

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, when you make a Persuasion check to intimidate, you gain a +1 bonus on the check for every ally within 6 squares of you and in the target's line of sight (maximum +5 bonus).
- **Production record:** `3a4ef3559a002c6f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, when you make a Persuasion check to intimidate, you gain a +1 bonus on the check for every ally within 6 squares of you and in the target's line of sight (maximum +5 bonus).

#### Melee Assault

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** When you make a melee attack against a target that has one or more of your allies adjacent to it, compare the result to the target's Fortitude Defense as well as its Reflex Defense.
- **Production record:** `e9aec3a7b011e17a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you make a melee attack against a target that has one or more of your allies adjacent to it, compare the result to the target's Fortitude Defense as well as its Reflex Defense. If the attack hits both defenses, the attack deals +1 die of damage and the target is knocked prone.

#### Melee Brute

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** When you make a melee attack against a target that has one or more of your allies adjacent to it, compare the result to the target's Fortitude Defense as well as its Reflex Defense.
- **Production record:** `2cf48b8aa712d19d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you make a melee attack against a target that has one or more of your allies adjacent to it, compare the result to the target's Fortitude Defense as well as its Reflex Defense. If the attack hits both defenses, the target's speed is reduced by 2 squares and it takes a -2 penalty to its Reflex Defense until the end of your next turn.

#### Melee Opportunist

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, when an ally makes a successful melee attack against a target adjacent to you, you can make a melee attack against that target as a reaction, with a +2 bonus on the attack roll.
- **Production record:** `91bb6515cf153d46`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, when an ally makes a successful melee attack against a target adjacent to you, you can make a melee attack against that target as a reaction, with a +2 bonus on the attack roll.

#### Squad Brutality

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** When you succeed on a melee attack against a target that has one or more of your allies adjacent to it, you may reroll your damage roll, taking the better result.
- **Production record:** `5f92ad8d44c9055c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you succeed on a melee attack against a target that has one or more of your allies adjacent to it, you may reroll your damage roll, taking the better result. ,

#### Squad Superiority

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** Whenever you and at least two allies are adjacent to the same target, that target is considered flat-footed against you.
- **Production record:** `e38263c4acc245fe`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you and at least two allies are adjacent to the same target, that target is considered flat-footed against you.

### Brawler

#### Grabber

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** You do not take a -5 penalty when using the grab action (see page 152 of the Saga Edition core rulebook).
- **Production record:** `ae6c41da173f1385`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You do not take a -5 penalty when using the grab action (see page 152 of the Saga Edition core rulebook).

#### Hammerblow

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** If you are unarmed and holding no items, you double your Strength bonus on unarmed attack rolls.
- **Production record:** `4356ac9986934fbf`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you are unarmed and holding no items, you double your Strength bonus on unarmed attack rolls.

#### Strong Grab

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** When you successfully grab an opponent, they must use a full-round action instead of a standard action to break the grab.
- **Production record:** `89d557f60251f4a5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you successfully grab an opponent, they must use a full-round action instead of a standard action to break the grab.

### Weapon Specialist

#### Improved Suppression Fire

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** When you successfully suppress an enemy using the aid another action (see page 151 of the Saga Edition core rulebook), that enemy takes a -5 penalty on its attack rolls until the start of your next turn.
- **Production record:** `bf6bcc2fc31411d2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you successfully suppress an enemy using the aid another action (see page 151 of the Saga Edition core rulebook), that enemy takes a -5 penalty on its attack rolls until the start of your next turn. When targeting an area with an autofire weapon, each enemy in the attack area takes a -2 penalty on its attack rolls until the start of your next turn, regardless of whether your attack hits.

### Force Hunter

#### Force Blank

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** You are especially hard to detect using the Force.
- **Production record:** `cdcdb85912d9eb67`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are especially hard to detect using the Force. Attempts to detect you using the Sense Surroundings aspect of the Use the Force skill suffer a -10 penalty.

#### Lightsaber Evasion

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** Whenever an enemy misses you with a melee attack with a lightsaber, you may move up to 2 squares in any direction.
- **Production record:** `b3ce8b08a8cb95fa`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever an enemy misses you with a melee attack with a lightsaber, you may move up to 2 squares in any direction. This movement does not provoke attacks of opportunity.

#### Precision Fire

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** The Jedi are skilled at blocking and deflecting ranged attacks with their lightsabers, and you are able to compensate for this to some degree by taking careful shots.
- **Production record:** `bef731c3743c2c7f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

The Jedi are skilled at blocking and deflecting ranged attacks with their lightsabers, and you are able to compensate for this to some degree by taking careful shots. Whenever you aim before making a ranged attack, you increase the difficulty of Deflect attempts to negate your attack by +5.

#### Steel Mind

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** If you resist the effects of a mind-affecting Force power, the user of that power cannot attempt to use the same power against you for the rest of the encounter.
- **Production record:** `19ba6767726bdc86`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you resist the effects of a mind-affecting Force power, the user of that power cannot attempt to use the same power against you for the rest of the encounter.

#### Strong-Willed

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** You are trained to resist Jedi mind tricks.
- **Production record:** `5621a55aea1936b2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are trained to resist Jedi mind tricks. You add your class level to Will Defense against Use the Force checks.

#### Telekinetic Resistance

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** Whenever you are targeted by a Force power that moves you, you reduce the distance you are moved by half.
- **Production record:** `203464310c5c2492`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you are targeted by a Force power that moves you, you reduce the distance you are moved by half.

### Protection

#### Armored Guard

- **Page:** 40
- **Prerequisites:** Ward
- **Quick summary:** When you use the Ward talent (see below), your ally's cover bonus to Reflex Defense is increased by one-half the armor bonus of any natural armor you possess as well as any armor you are wearing.
- **Production record:** `514b1225139b22b8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use the Ward talent (see below), your ally's cover bonus to Reflex Defense is increased by one-half the armor bonus of any natural armor you possess as well as any armor you are wearing.

#### Bodyguard's Sacrifice

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** As a reaction, you can interfere with any successful attack against an adjacent ally.
- **Production record:** `7505fbdd592c04fd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a reaction, you can interfere with any successful attack against an adjacent ally. You can choose to take any or all of that attack's damage, and the remainder is dealt to the target as normal. Once you use this talent, you may not use it again until the end of your next turn.

#### Guard's Endurance

- **Page:** 41
- **Prerequisites:** Ward
- **Quick summary:** Whenever you begin your turn adjacent to the target of your Ward talent (see below), you gain bonus hit points equal to your character level until the start of your next turn.
- **Production record:** `bffc3826d39f3946`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you begin your turn adjacent to the target of your Ward talent (see below), you gain bonus hit points equal to your character level until the start of your next turn. Damage is subtracted from the bonus hit points first, and any bonus hit points remaining at the end of the encounter go away. Bonus hit points from different sources do not stack.

#### Lifesaver

- **Page:** 41
- **Prerequisites:** Bodyguard's Sacrifice
- **Quick summary:** Once per encounter as a reaction, when an ally takes damage that equals or exceeds its damage threshold or reduces it to 0 hit points, you can move up to your speed provided you end your movement adjacent to that ally.
- **Production record:** `8eace9d86fc60711`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a reaction, when an ally takes damage that equals or exceeds its damage threshold or reduces it to 0 hit points, you can move up to your speed provided you end your movement adjacent to that ally. This movement provokes attacks of opportunity as normal, you take all of the damage that triggered this talent's use, and your ally takes no damage.

#### Out of Harm's Way

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** As a move action, you allow one ally within 6 squares of you to move up to its speed, provided the ally ends its movement adjacent to you.
- **Production record:** `6031244221b73865`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a move action, you allow one ally within 6 squares of you to move up to its speed, provided the ally ends its movement adjacent to you. This movement does not provoke attacks of opportunity.

#### Roll With It

- **Page:** 41
- **Prerequisites:** Bodyguard's Sacrifice, Take the Hit
- **Quick summary:** Whenever you take damage on behalf of an ally through the use of a talent (including Harm's Way), you gain damage reduction equal to your class level until the end of your next turn.
- **Production record:** `f4ca7e7a674372a5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you take damage on behalf of an ally through the use of a talent (including Harm's Way), you gain damage reduction equal to your class level until the end of your next turn.

#### Take the Hit

- **Page:** 41
- **Prerequisites:** Bodyguard's Sacrifice
- **Quick summary:** Whenever you take damage on behalf of an ally through the use of a talent (including Harm's Way), your damage threshold is increased by 5.
- **Production record:** `450aa69ead3975f2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you take damage on behalf of an ally through the use of a talent (including Harm's Way), your damage threshold is increased by 5.

#### Ward

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** As a swift action, designate one adjacent ally.
- **Production record:** `d9241073d3b975e6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, designate one adjacent ally. Until the end of your next turn, as long as that ally remains adjacent to you, you are considered to be providing that ally with soft cover against all attacks. You cannot be designated as the target of this talent (such as, when it is used by an ally) if you have used this talent since the start of your last turn, and you cannot use this talent if you are currently designated as another ally's ward.

### Carbineer

#### Blowback

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** When you make an attack with a rifle that deals damage in excess of your target's damage threshold, you can choose to push the target 1 square away from you.
- **Production record:** `9b337a844329fa17`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you make an attack with a rifle that deals damage in excess of your target's damage threshold, you can choose to push the target 1 square away from you.

#### Close Contact

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** The point-blank range of any rifle or carbine you use is increased by 5 squares.
- **Production record:** `7d30702a5a2640a4`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

The point-blank range of any rifle or carbine you use is increased by 5 squares. Short range for the weapon begins 5 squares later, but still ends at the same distance.

You can take this talent up to two times; each time you take this talent, you increase the point-blank range of any rifle or carbine you use by an additional 5 squares, up to a maximum of 10 squares.

#### Multiattack Proficiency (rifles)

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** Whenever you make multiple attacks with any type of rifle as a full attack action (see page 154 of the Saga Edition core rulebook), you reduce the penalty of your attack rolls by 2.
- **Production record:** `ecb678c47bb2cb43`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you make multiple attacks with any type of rifle as a full attack action (see page 154 of the Saga Edition core rulebook), you reduce the penalty of your attack rolls by 2.

You can take this talent multiple times; each time you take this talent, you reduce the penalty on your attack rolls by an additional 2.

#### Old Faithful

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** The trusty sidearm class feature (see page 217 of the Saga Edition core rulebook) of the gunslinger prestige class also applies to any rifle or carbine that you use.
- **Production record:** `970d8d555645604d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

The trusty sidearm class feature (see page 217 of the Saga Edition core rulebook) of the gunslinger prestige class also applies to any rifle or carbine that you use.

#### Opportunity Fire

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** You gain a +2 bonus on attacks of opportunity made with rifles.
- **Production record:** `f5fcf2752e99961a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a +2 bonus on attacks of opportunity made with rifles.

#### Rifle Master

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** You treat all rifles as though they were accurate weapons, taking no penalty when firing at targets at short range.
- **Production record:** `d24b04541998b27b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You treat all rifles as though they were accurate weapons, taking no penalty when firing at targets at short range.

#### Shoot from the Hip

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** You can always use a rifle to make attacks of opportunity.
- **Production record:** `554e245686231855`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can always use a rifle to make attacks of opportunity.

#### Snap Shot

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** You do not provoke attacks of opportunity while using the aim action with a rifle or carbine with its stock extended.
- **Production record:** `2c1268268212d135`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You do not provoke attacks of opportunity while using the aim action with a rifle or carbine with its stock extended.

### Jedi Refugee

#### Cover Your Tracks

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** You are adept at living beneath society's radar.
- **Production record:** `43ee5741f4b2375c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are adept at living beneath society's radar. Anyone who attempts to locate you using the Gather Information skill suffers a -5 penalty on their Gather Information checks.

#### Difficult to Sense

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** You are skilled at concealing your presence from other Force-users.
- **Production record:** `8c47c02ec74fa858`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are skilled at concealing your presence from other Force-users. You may reroll any opposed Use the Force check made to conceal your presence from someone who attempts to sense other Forceusers, keeping the better result.

#### Force Veil

- **Page:** 41
- **Prerequisites:** Difficult to Sense
- **Quick summary:** Your ability to conceal yourself from other Force-users allows you to reduce the radius within which you can be detected to 10 kilometers (instead of 100 kilometers).
- **Production record:** `4fa3e301abad7a48`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your ability to conceal yourself from other Force-users allows you to reduce the radius within which you can be detected to 10 kilometers (instead of 100 kilometers).

#### Jedi Network

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** You have access to a network of Jedi sympathizers.
- **Production record:** `251462d5e3aaa4ce`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have access to a network of Jedi sympathizers. While in a civilized area, you can call upon this network of allies once per game session for one of the following purposes:

Acquire Equipment or Funds: You can use your contacts to obtain material that might otherwise be licensed, restricted, military, or illegal, provided the total value of the equipment does not exceed your level in this class x 500 credits. Alternately, you can obtain a number of credits from your contacts equal to this amount to spend as you see fit.

Obtain Information: Your contacts provide you with information, automatically succeeding on a Gather Information check (and covering the credit cost of the check) provided that the DC does not exceed 20.

Receive Medical Attention: Your contacts provide you and up to three of your allies with medical attention as dispensed by a skilled physician or healer. The length of the treatment cannot exceed 24 hours, but is otherwise free of charge and completely private.

Secure Safe house: One of your contacts provides a safe redoubt for you and up to three of your allies, for a number of days equal to your Jedi Knight class level. While in hiding, you have no contact with anyone other than the individual who is hiding you. Once the allotted time is up, you must leave the safe house or risk discovery. For each day you remain in hiding past this deadline, the Gamemaster should roll 1d20. On a result of 15 or higher, your safe house is discovered, and your contact's complicity in keeping you hidden is exposed.

### Fugitive Commander

#### Disciplined Trickery

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** Once per turn as a reaction, you allow one ally within 12 squares of you and in your line of sight to reroll one Deception or Stealth check, but the ally must keep the second result, even if it is worse.
- **Production record:** `f7a7ecda71555b5c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn as a reaction, you allow one ally within 12 squares of you and in your line of sight to reroll one Deception or Stealth check, but the ally must keep the second result, even if it is worse.

#### Group Perception

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** Whenever you roll a Perception check, all allies within 6 squares of you can do so as well, taking the highest reroll result rolled by you or any ally.
- **Production record:** `5775fa033444f4f0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you roll a Perception check, all allies within 6 squares of you can do so as well, taking the highest reroll result rolled by you or any ally.

#### Hasty Withdrawal

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** As a swift action once per turn, you target a number of allies equal to your Charisma bonus (minimum 1).
- **Production record:** `8f388280e0d1b244`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action once per turn, you target a number of allies equal to your Charisma bonus (minimum 1). Each targeted ally must be within 12 squares of you and in your line of sight. Each ally you target can take the withdraw action immediately as a free action. The normal rules for withdrawing otherwise apply (see page 153 of the Saga Edition core rulebook).

#### Stalwart Subordinates

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** When any ally within 12 squares of you and in your line of sight is targeted by a skill check against its Will Defense, the source of that skill check (whether a hazard, a creature, a droid, or whatever) must roll the skill check twice...
- **Production record:** `d9ffff2586cd259b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When any ally within 12 squares of you and in your line of sight is targeted by a skill check against its Will Defense, the source of that skill check (whether a hazard, a creature, a droid, or whatever) must roll the skill check twice and take the lowest result.

#### Stay in the Fight

- **Page:** 42
- **Prerequisites:** Stalwart Subordinates
- **Quick summary:** As a swift action, you remove one mind-affecting or fear effect currently affecting an ally within 12 squares of you and in your line of sight.
- **Production record:** `c980750800b91061`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you remove one mind-affecting or fear effect currently affecting an ally within 12 squares of you and in your line of sight. When you do so, you also grant the target a number of bonus hit points equal to 10 + your class level.

#### Stealthy Withdrawal

- **Page:** 42
- **Prerequisites:** Hasty Withdrawal
- **Quick summary:** When an ally withdraws as a result of your Hasty Withdrawal talent and ends its withdraw action with cover or concealment from any enemy target, that ally can make an immediate Stealth check to sneak as a free action.
- **Production record:** `c483676cb3c07cb3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When an ally withdraws as a result of your Hasty Withdrawal talent and ends its withdraw action with cover or concealment from any enemy target, that ally can make an immediate Stealth check to sneak as a free action.

### Sith Commander

#### Desperate Measures

- **Page:** 43
- **Prerequisites:** Focus Terror
- **Quick summary:** Desperation stems from fear.
- **Production record:** `d11f6beaa5f93e66`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Desperation stems from fear. Once per encounter as a swift action, you instill desperation in all allies within 12 squares of you and in your line of sight, allowing each of them to make an immediate attack at a -5 penalty.

#### Focus Terror

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a swift action, you can harness the fear felt by your allies and transform it into a powerful motivational tool.
- **Production record:** `98c720992c5b428e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a swift action, you can harness the fear felt by your allies and transform it into a powerful motivational tool. All allies within 12 squares of you and in your line of sight move +2 steps along the condition track, but suffer a -2 penalty on attack rolls and skill checks for a number of rounds equal to your character level.

#### Incite Rage

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a swift action, you can channel your anger and hatred into your allies.
- **Production record:** `b8a9dd4c950a96f5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a swift action, you can channel your anger and hatred into your allies. All allies within 12 squares of you and in your line of sight gain a +1 rage bonus on attack rolls but take a -2 penalty to their Reflex Defense. This effect lasts until the encounter ends, or you are knocked unconscious or killed.

#### Power of Hatred

- **Page:** 43
- **Prerequisites:** Incite Rage
- **Quick summary:** Once per encounter as a swift action, you can inflame the passions of your allies.
- **Production record:** `51a8e7a193955f11`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a swift action, you can inflame the passions of your allies. Each ally within your line of sight who has fewer than half its normal hit points gains bonus hit points equal to your character level. Damage is subtracted from the bonus hit points first, and any bonus hit points remaining at the end of the encounter go away. Bonus hit points from different sources do not stack.

### Knight's Armor

#### Armored Augmentation I

- **Page:** 45
- **Prerequisites:** Armor Proficiency with the type of armor worn
- **Quick summary:** Once per encounter, you may spend a Force Point as a swift action to augment your own ability to withstand damage by imbuing the armor you are wearing with the Force.
- **Production record:** `98355ed4f6473028`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you may spend a Force Point as a swift action to augment your own ability to withstand damage by imbuing the armor you are wearing with the Force. This allows you to add your armor bonus to Reflex Defense to your damage threshold until the end of the encounter.

#### Armored Augmentation II

- **Page:** 45
- **Prerequisites:** Armor Proficiency with the type of armor worn, Armored Augmentation I
- **Quick summary:** Whenever you use the Armored Augmentation I talent, you also gain DR equal to 2 x your armor's equipment bonus to Fortitude Defense.
- **Production record:** `51588e91f335bb67`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you use the Armored Augmentation I talent, you also gain DR equal to 2 x your armor's equipment bonus to Fortitude Defense.

#### Armor Mastery

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** When calculating your Reflex Defense, you may add your heroic level plus one-half your armor bonus (rounded down) or your armor bonus, whichever is higher.
- **Production record:** `d9e707f23fffc2af`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When calculating your Reflex Defense, you may add your heroic level plus one-half your armor bonus (rounded down) or your armor bonus, whichever is higher. You must be proficient with the armor you are wearing to gain this benefit.

This talent counts as both the Armored Defense and Improved Armored Defense talents for the purposes of prerequisites.

#### Cortosis Defense

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** You are adept at using a cortosis gauntlet to parry lightsaber attacks.
- **Production record:** `dfe97e928928efc3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are adept at using a cortosis gauntlet to parry lightsaber attacks. You gain a +2 bonus when making an opposed unarmed melee attack roll against a lightsaber attack.

#### Cortosis Retaliation

- **Page:** 45
- **Prerequisites:** Cortosis Defense
- **Quick summary:** Whenever you successfully use a cortosis gauntlet to parry an attack made with a lightsaber, you may make an immediate attack of opportunity against the attacker.
- **Production record:** `22ce14b57f9b8c1a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully use a cortosis gauntlet to parry an attack made with a lightsaber, you may make an immediate attack of opportunity against the attacker.

### Knight's Resolve

#### Knight's Morale

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain a +1 morale bonus to all defenses until the end of your next turn.
- **Production record:** `e3b7d8c87441a1f0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain a +1 morale bonus to all defenses until the end of your next turn.

#### Oath of Duty

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain bonus hit points equal to 3 x your class level until the end of your next turn.
- **Production record:** `001ae84d5862af55`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain bonus hit points equal to 3 x your class level until the end of your next turn. Damage is subtracted from the bonus hit points first, and any bonus hit points remaining at the end of the encounter go away. Bonus hit points from different sources do not stack.

#### Praetoria Ishu

- **Page:** 45
- **Prerequisites:** Block, Deflect
- **Quick summary:** You can use the Block talent to negate a melee attack made against an adjacent ally.
- **Production record:** `16aa9efd54967320`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the Block talent to negate a melee attack made against an adjacent ally. In addition, you can use the Deflect talent to negate a ranged attack made against an adjacent ally.

#### Praetoria Vonil

- **Page:** 45
- **Prerequisites:** Weapon Focus (lightsabers)
- **Quick summary:** You have mastered the offensive lightsaber style favored by the Imperial Knights.
- **Production record:** `4723e1eb351e07ae`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have mastered the offensive lightsaber style favored by the Imperial Knights. When wielding a single lightsaber with two hands, you deal +1 die of damage if you move at least 1 square on your turn before making the attack.

#### Strength of the Empire

- **Page:** 45
- **Prerequisites:** Knight's Morale
- **Quick summary:** When an ally within 12 squares of you and in your line of sight hits with a lightsaber attack, you deal +1 die of damage with the next lightsaber attack you make before the end of your next turn.
- **Production record:** `2b808a4a90614f92`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When an ally within 12 squares of you and in your line of sight hits with a lightsaber attack, you deal +1 die of damage with the next lightsaber attack you make before the end of your next turn.

### Implant

#### Adrenaline Implant

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a standard action, you can give one adjacent living creature an adrenaline implant.
- **Production record:** `2fdf215a5da99e00`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a standard action, you can give one adjacent living creature an adrenaline implant. The target must be willing to receive this implant, which grants the target 10 bonus hit points at the start of each of its turns. These bonus hit points do not accumulate. Damage is subtracted from the bonus hit points first, and any bonus hit points remaining at the end of the encounter go away. Bonus hit points from different sources do not stack.

The following talents all grant effects that last until the end of the encounter. At the end of the encounter, any target that benefits from one or more of these talents immediately moves -3 steps down the condition track, and the condition becomes persistent. The persistent condition can only be removed after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target.

#### Precision Implant

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a standard action, you can give one adjacent living creature a precision implant.
- **Production record:** `58e37d40d3aa7d4b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a standard action, you can give one adjacent living creature a precision implant. The target must be willing to receive this implant, which grants the target a +1 equipment bonus on attack rolls until the end of the encounter.

The following talents all grant effects that last until the end of the encounter. At the end of the encounter, any target that benefits from one or more of these talents immediately moves -3 steps down the condition track, and the condition becomes persistent. The persistent condition can only be removed after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target.

#### Resilience Implant

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a standard action, you can give one adjacent living creature a resilience implant.
- **Production record:** `94b1951d4795f602`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a standard action, you can give one adjacent living creature a resilience implant. The target must be willing to receive this implant, which grants the target a +5 equipment bonus to its damage threshold until the end of the encounter.

The following talents all grant effects that last until the end of the encounter. At the end of the encounter, any target that benefits from one or more of these talents immediately moves -3 steps down the condition track, and the condition becomes persistent. The persistent condition can only be removed after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target.

#### Speed Implant

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a standard action, you can give one adjacent living creature a speed implant.
- **Production record:** `d6d3b0a2ec01ca9a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a standard action, you can give one adjacent living creature a speed implant. The target must be willing to receive this implant, which increases the target's base speed by 2 until the end of the encounter.

The following talents all grant effects that last until the end of the encounter. At the end of the encounter, any target that benefits from one or more of these talents immediately moves -3 steps down the condition track, and the condition becomes persistent. The persistent condition can only be removed after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target.

#### Strength Implant

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a standard action, you can give one adjacent living creature a strength implant.
- **Production record:** `cb0dcc59f7ced910`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a standard action, you can give one adjacent living creature a strength implant. The target must be willing to receive this implant, which allows the target to deal +1 die of damage whenever it hits with a melee attack until the end of the encounter.

The following talents all grant effects that last until the end of the encounter. At the end of the encounter, any target that benefits from one or more of these talents immediately moves -3 steps down the condition track, and the condition becomes persistent. The persistent condition can only be removed after 8 hours of rest, or by performing successful surgery (as per the application of the Treat Injury skill) on the target.

### Shaper

#### Biotech Mastery

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** When using the Biotech Specialist feat to modify biotechnology, you are able to make the appropriate modification in half of the normal time for half the normal cost.
- **Production record:** `fc91564e800719be`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When using the Biotech Specialist feat to modify biotechnology, you are able to make the appropriate modification in half of the normal time for half the normal cost. In addition, you can take 10 on the Mechanics check (even when distracted or threatened), but you cannot take 20.

#### Expedient Mending

- **Page:** 47
- **Prerequisites:** Expert Shaper
- **Quick summary:** You can temporarily mend a damaged or disabled biotech device using the Treat Injury skill (see page 32) as a standard action instead of a full-round action.
- **Production record:** `7f792f0e531e9abb`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can temporarily mend a damaged or disabled biotech device using the Treat Injury skill (see page 32) as a standard action instead of a full-round action.

#### Expert Shaper

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** You may reroll any Treat Injury check made to repair or modify a biotech object, but the result of the reroll must be accepted even if it is worse.
- **Production record:** `f9047f30ef6712af`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You may reroll any Treat Injury check made to repair or modify a biotech object, but the result of the reroll must be accepted even if it is worse.

#### Master Mender

- **Page:** 47
- **Prerequisites:** Expert Shaper
- **Quick summary:** Whenever you temporarily mend a biotech device using the Treat Injury skill (see page 32), the mended device moves +4 steps on the condition track.
- **Production record:** `bebc181408831371`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you temporarily mend a biotech device using the Treat Injury skill (see page 32), the mended device moves +4 steps on the condition track. In addition, the mended device only moves -3 steps down the condition track at the end of the scene or encounter, and is only disabled if this reduction brings it to -5 steps on the track.

#### Skilled Implanter

- **Page:** 47
- **Prerequisites:** Biotech Surgery feat
- **Quick summary:** Whenever you use the Biotech Surgery feat to install an implant, the implant's attack bonus against the recipient's Fortitude Defense is halved (see page 67 for more information on implants).
- **Production record:** `bf0c791fe21df919`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you use the Biotech Surgery feat to install an implant, the implant's attack bonus against the recipient's Fortitude Defense is halved (see page 67 for more information on implants).

### Disciple Of Twilight

#### Cloak of Shadow

- **Page:** 57
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point as a swift action to bend light around you, veiling yourself in shadows.
- **Production target:** CREATE `b3fe6f7659b40a55`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can spend a Force Point as a swift action to bend light around you, veiling yourself in shadows. Until the end of the encounter, whenever you move and end your movement at least 3 squares away from your starting position, you gain concealment from all targets until the beginning of your next turn.

#### Phantasm

- **Page:** 57
- **Prerequisites:** None.
- **Quick summary:** Whenever you successfully use a Force power with the [mind-affecting] descriptor against a target, any time before the end of the encounter you can spend a Force Point as a swift action to create illusory phantoms around that target.
- **Production target:** CREATE `943f8753f56f3a63`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you successfully use a Force power with the [mind-affecting] descriptor against a target, any time before the end of the encounter you can spend a Force Point as a swift action to create illusory phantoms around that target. When you do this, you and all of your allies within the target's line of sight have concealment from the target until the end of your next turn.

#### Revelation

- **Page:** 58
- **Prerequisites:** None.
- **Quick summary:** As a standard action, you can make a Use the Force check against the Will Defense of an enemy that has concealment from you or any of your allies.
- **Production target:** CREATE `35af8366f831bd8b`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a standard action, you can make a Use the Force check against the Will Defense of an enemy that has concealment from you or any of your allies. If successful, the enemy is silhouetted by a faint shimmering light that belies his location. Your target loses any concealment bonuses to Reflex Defense until the end of your next turn.

#### Shadow Armor

- **Page:** 58
- **Prerequisites:** Cloak of Shadow
- **Quick summary:** You use the Force to bend light around yourself, wrapping you in shadows and making it difficult for enemies to tell where you end and the shadows begin.
- **Production target:** CREATE `4916dbbae0f18ee1`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You use the Force to bend light around yourself, wrapping you in shadows and making it difficult for enemies to tell where you end and the shadows begin. As a swift action, you grant yourself a +1 Force bonus to your Reflex Defense until the start of your next turn.

You may select this talent multiple times. Each time you select it, the Force bonus it provides increases by +1 (maximum +4).

#### Shadow Vision

- **Page:** 58
- **Prerequisites:** None.
- **Quick summary:** As a swift action, you gain low-light vision, allowing you to ignore concealment (but not total concealment) from darkness.
- **Production target:** CREATE `66b3278292626e27`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action, you gain low-light vision, allowing you to ignore concealment (but not total concealment) from darkness. This benefit lasts for 5 minutes or until the end of the encounter, whichever comes first.

### Ember Of Vahl

#### Initiate of Vahl

- **Page:** 59
- **Prerequisites:** None.
- **Quick summary:** Having been formally initiated into Vahl's priesthood, you are resistant to the effects of fire and extreme heat.
- **Production record:** `510a0f02ffa843e3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Having been formally initiated into Vahl's priesthood, you are resistant to the effects of fire and extreme heat. You take half damage from attacks that deal fire damage, or no damage on a miss (if the fire damage is part of an area attack).

#### Reading the Flame

- **Page:** 59
- **Prerequisites:** Initiate of Vahl
- **Quick summary:** You can enter a trance by staring into a flame of any size, gaining insight into the workings of the galaxy by meditating on the flame's movement.
- **Production target:** CREATE `12f61917f809a3fb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can enter a trance by staring into a flame of any size, gaining insight into the workings of the galaxy by meditating on the flame's movement. Whenever you use the farseeing power or the Search Your Feelings application of the Use the Force skill, you can reroll your Use the Force check, keeping the better result.

#### Sword of Vahl

- **Page:** 59
- **Prerequisites:** Initiate of Vahl
- **Quick summary:** Your devotion to Vahla allows you to eschew advanced weapons in favor of simple implements of war.
- **Production target:** CREATE `b1a9d6277428e6c0`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Your devotion to Vahla allows you to eschew advanced weapons in favor of simple implements of war. You gain a +1 Force bonus on attack rolls made with simple weapons.

#### Vahl's Brand

- **Page:** 59
- **Prerequisites:** Empower Weapon
- **Quick summary:** Any additional damage you deal with an empowered weapon (see the Empower Weapon talent, page 214 of the Saga Edition core rulebook) is considered to be fire damage.
- **Production target:** CREATE `a5f8ec365ef2b699`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Any additional damage you deal with an empowered weapon (see the Empower Weapon talent, page 214 of the Saga Edition core rulebook) is considered to be fire damage.

#### Vahl's Flame

- **Page:** 59
- **Prerequisites:** Initiate of Vahl
- **Quick summary:** As a swift action, you can use the Force to call forth the sparks of your goddess, wreathing your weapon in flames.
- **Production target:** CREATE `8ba6abad84c6d9ef`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action, you can use the Force to call forth the sparks of your goddess, wreathing your weapon in flames. Until the beginning of your next turn, any successful attack you make with a melee weapon deals an additional 1d6 points of fire damage.

---

## Book 14 — Scavenger's Guide to Droids

**Phase 3B status:** COMPLETE — 31 owned canonical identities; 12 UPDATE_CONTENT; 19 CREATE.

### 1stdegree Droid

#### Known Vulnerability

- **Page:** 26
- **Prerequisites:** Trained in Knowledge (life sciences)
- **Quick summary:** You know the vulnerable spots to hit on most species.
- **Production target:** CREATE `852c4b043904102f`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You know the vulnerable spots to hit on most species. As a free action, you make a DC 15 Knowledge (life sciences) check (DC 25 for rare species, DC 35 for unknown species, both as determined by the Gamemaster). If the check is successful, until the end of the encounter, whenever you make a successful melee or unarmed attack that deals damage against a target of that species, your target takes a -2 penalties to attack rolls until the end of your next turn.

#### Medical Analyzer

- **Page:** 26
- **Prerequisites:** Trained in Knowledge (life sciences), medical droid
- **Quick summary:** You use your medical knowledge and advanced droid processor to improve your treatment of medical conditions.
- **Production target:** CREATE `7fb6b7d078bdb493`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You use your medical knowledge and advanced droid processor to improve your treatment of medical conditions. When making a Treat Injury check to Treat Disease, Treat Poison, or Treat Radiation, you can also add your Intelligence modifier to your roll.

#### Science Analyzer

- **Page:** 26
- **Prerequisites:** Trained in Knowledge (life sciences) and Knowledge (physical sciences)
- **Quick summary:** You use your extensive databanks to better analyze scientific data.
- **Production target:** CREATE `739397eded522cd8`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You use your extensive databanks to better analyze scientific data. You can add double your Intelligence modifier to your Knowledge (life sciences) or Knowledge (physical sciences) skill check.

#### Triage Scan

- **Page:** 26
- **Prerequisites:** Trained in Treat Injury, medical droid
- **Quick summary:** As a standard action, you can make a DC 20 Treat Injury check.
- **Production target:** CREATE `c9433c6bcb4133d5`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a standard action, you can make a DC 20 Treat Injury check. If the check succeeds, you know if the organic characters within 6 squares and within your line of sight are below one half of their hit points and at what step they are along the condition track.

### 2nddegree Droid

#### Burst Transfer

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** Double Binary data transfer with another droid that has Burst Transfer and halve Access Information time when using Use Computer.
- **Production target:** `df91dea8db444459`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can double the amount of data transferred with the Binary language in a single round (see page 191 of the Saga Edition core rulebook) when communicating with other droids with Burst Transfer, and you cut Access Information time in half when making Use Computer checks to find general or specific information (see page 76 of the Saga Edition core rulebook).

#### On-Board System Link

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** While aboard a starship or vehicle and plugged into the ship's systems by scomp link, droid socket, or basic data port, you can reroute power or recharge shields as two swift actions instead of three.
- **Production target:** CREATE `31461ebe45c5f4c9`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

While aboard a starship or vehicle and plugged into the ship's systems by scomp link, droid socket, or basic data port, you can reroute power or recharge shields as two swift actions instead of three.

#### Quick Astrogation

- **Page:** 26
- **Prerequisites:** Trained in Use Computer
- **Quick summary:** Your speedy electronic astrogation-calculation routines allow you to cut calculation time in half.
- **Production target:** CREATE `cdbaa45c44141d9c`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Your speedy electronic astrogation-calculation routines allow you to cut calculation time in half. Additionally, when attempting a Use Computer check to Astrogate, you can make the calculation as a standard action instead of a full-round action.

#### Scomp Link Slicer

- **Page:** 27
- **Prerequisites:** Any two talents from the Slicer Talent Tree (see page 47 of the Saga Edition core rulebook). Burst Transfer can be one of these talents
- **Quick summary:** While physically linked to a computer, use Eradicate, Lockout, and Untraceable once each per encounter to slice systems more safely.
- **Production target:** CREATE `3b38783594bcebce`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Your inherent speed and advanced skill reduce the danger of slicing computer systems. You must be physically linked to the system you are slicing. You can use each of the following actions once per encounter: e Eradicate: You can use Disable or Erase Program on a computer that is friendly or helpful toward you. With this talent, disabling or erasing a program takes 5 minutes and requires a DC 15 Use Computer check (see page 76 of the Saga Edition core rulebook). ¢ Lockout: If you succeed on an opposed Use Computer check when you Issue a Routine Command to counteract another programmer's actions, you automatically lock the other programmer out of the system. He or she must succeed in an opposed Use Computer check against you to regain access to the system (see page 76 of the Saga Edition core rulebook). You resist the attempt as a reaction. © Untraceable: As a reaction, you automatically keep a hostile computer from tracing your location if you fail a Use Computer check (see page 76 of the Saga Edition core rulebook) by 10 or less.

### 3rddegree Droid

#### Nuanced

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** You are skilled in the nuances of diplomatic speech and gestures.
- **Production target:** CREATE `8f4fed2c36ab4c2a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You are skilled in the nuances of diplomatic speech and gestures. Once per encounter, you can add your Wisdom bonus to a Persuasion check in addition to your Charisma bonus.

#### Observant

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** You enhance your persuasiveness by applying data obtained through observation.
- **Production target:** `175c46931a9e474a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You enhance your persuasiveness by applying data obtained through observation. Whenever you would fail a Persuasion check, you can roll a Perception check as a free action, with a DC equal to the DC of the Persuasion check. If you succeed, add +5 to the original Persuasion check result.

#### Supervising Droid

- **Page:** 27
- **Prerequisites:** Observant, any talent from the Influence, Inspiration, or Leadership Talent Trees (see pages 43-44 of the Saga Edition core rulebook)
- **Quick summary:** Once per encounter each, use Combat Support, Director, and Instant Action to assist allied droids in attacks, skills, or action economy.
- **Production target:** CREATE `0025737e7198390e`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You are programmed to oversee other droids. You can use each of the following actions once per encounter: © Combat Support: As a standard action, you automatically aid another on an allied droid's attack roll, provided you are capable of using the aid another action to assist that ally. If you also have Weapon Focus with this weapon, you increase the bonus provided by the aid another action from +2 to +3. e Director: As a standard action, you automatically aid another droid with a skill you are trained in. If you also have Skill Focus in the skill, you increase the aid another bonus from +2 to +5. e Instant Action: As a swift action, you grant one ally a swift action that it can use immediately as a free action.

#### Talkdroid

- **Page:** 27
- **Prerequisites:** Trained in Persuasion
- **Quick summary:** You know how to subtly massage translations.
- **Production target:** CREATE `4e52d41e355b5923`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You know how to subtly massage translations. When one of your allies is attempting to use the Persuasion skill to change the attitude of a creature that does not understand your ally, you add +2 to the ally’s Persuasion check results if you perform the translation.

### 4thdegree Droid

#### Just a Scratch

- **Page:** 27
- **Prerequisites:** Equipped with medium or better armor, proficient with that armor
- **Quick summary:** Once per encounter, as a reaction, you can reduce the damage from a single attack that targets your Reflex Defense by an amount equal to your Fortitude Defense.
- **Production target:** CREATE `81acbac191981ace`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, as a reaction, you can reduce the damage from a single attack that targets your Reflex Defense by an amount equal to your Fortitude Defense.

#### Target Acquisition

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a swift action, designate an enemy target within line of sight as an acquired target.
- **Production target:** `6ef413a824474491`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a swift action, designate an enemy target within line of sight as an acquired target. You gain a +1 circumstance bonus to attack rolls and damage rolls for all attacks against that target until the end of the encounter, as long as the target remains within your line of sight.

#### Target Lock

- **Page:** 27
- **Prerequisites:** Target Acquisition
- **Quick summary:** You lock onto the target designated by the Target Acquisition talent.
- **Production target:** CREATE `3d2805cd83bb0cc4`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You lock onto the target designated by the Target Acquisition talent. If the target leaves your line of sight, you automatically reacquire the target lock as a reaction if the target comes back within your line of sight. You also gain a +5 bonus to your Perception skill when opposing the target's Stealth checks.

#### Weapons Power Surge

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a free action, you can increase the damage dealt by one of your weapons by 1 or 2 damage dice in exchange for moving -1 step on the condition track for each die increased.
- **Production target:** CREATE `09e7eeda16a7814f`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per encounter, as a free action, you can increase the damage dealt by one of your weapons by 1 or 2 damage dice in exchange for moving -1 step on the condition track for each die increased. The weapon must be permanently mounted to your chassis, and it must use your internal power supply. Handheld weapons, such as blaster rifles, do not qualify for this talent.

### 5thdegree Droid

#### Durable

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** You are particularly durable and continue to function when a lesser droid would become disabled.
- **Production target:** CREATE `c5410351fc7c7aa7`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You are particularly durable and continue to function when a lesser droid would become disabled. The first time during an encounter that you would be moved to the bottom of the condition track by any effect, you instead stop at the -10 step. Additionally, if a single attack causes you to move multiple steps down the condition track, you can spend a Force Point as a reaction to only move -1 step down the condition track.

#### Heavy-Duty Actuators

- **Page:** 27
- **Prerequisites:** Medium or larger size
- **Quick summary:** Your heavy-duty actuators allow you to release your power and speed in a quick burst.
- **Production target:** `f733e1a56fba443b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your heavy-duty actuators allow you to release your power and speed in a quick burst. You can double your Strength bonus to your melee and unarmed damage rolls.

#### Load Launcher

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** You are considered proficient with improvised thrown weapons (see page 150 of the Saga Edition core rulebook) when making a ranged attack by throwing an object.
- **Production target:** CREATE `b1090fa2d2ebc982`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You are considered proficient with improvised thrown weapons (see page 150 of the Saga Edition core rulebook) when making a ranged attack by throwing an object. Objects up to one size category larger than you can be thrown up to a number of squares equal to 2 x your Strength bonus (minimum 1 square). Additionally, you add your Strength bonus to any damage dealt.

#### Task Optimization

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** Select a skill you are trained in.
- **Production target:** CREATE `8f26ca25481d612f`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Select a skill you are trained in. Once per encounter, you can perform any application of that skill as one action quicker than normal but as at least a swift action (for example, a full-round action becomes a standard action, a standard action becomes a move action, a move action becomes a swift action). Tasks requiring more than one round cannot be optimized with this talent.

### Autonomy

#### Just a Droid

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** You are adept at passing yourself off as an ordinary droid.
- **Production target:** `27604b55a6fd41ffbc04f05cec16463d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are adept at passing yourself off as an ordinary droid. You can use each of the following actions once per encounter. Just Another Droid: You are skilled at using Stealth to sneak past unwary enemies when moving in plain sight. You can use the Sneak application of the Stealth skill when in plain sight of an enemy, if the enemy has no reason to doubt that you are just another droid. You are considered trained in Stealth for this action. Just a Normal Droid: You can reroll Deception checks for deceptive appearance to make observers believe that you are carrying out a standard function when attempting to do something atypical for your droid model or function. You may keep either result.

#### Swift Droid

- **Page:** 28
- **Prerequisites:** Any two talents from the Autonomy talent tree
- **Quick summary:** You move quickly when caught.
- **Production target:** `594eb9e7f9084742a7d1cbc209d2f340`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You move quickly when caught. You can make a swift action as a reaction after failing a Deception check or a Stealth check.

### Elite Droid

#### Break Program

- **Page:** 29
- **Prerequisites:** Trained in Use Computer
- **Quick summary:** You can use your ability to circumvent behavioral inhibitors to temporarily break the programming of a droid that you have a data link with.
- **Production target:** `cb3bbc1e7d8829e9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use your ability to circumvent behavioral inhibitors to temporarily break the programming of a droid that you have a data link with. Make a Use Computer check opposed by the droid's Will Defense. Breaking the droid's programming overrides its behavioral inhibitors for a number of rounds equal to your Intelligence bonus.

#### Heuristic Mastery

- **Page:** 29
- **Prerequisites:** Wisdom 15
- **Quick summary:** You understand the subtleties and limitations of your heuristic processor.
- **Production target:** `2b6a4a203b72dc79`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You understand the subtleties and limitations of your heuristic processor. You can reroll any untrained skill check (except Use the Force), keeping the second result, even if it is worse. Once per encounter, you can spend a Force Point to reroll any skill check (trained or untrained), taking the better result.

#### Scripted Routines

- **Page:** 29
- **Prerequisites:** Base attack bonus +5
- **Quick summary:** Your extensive experience allows you to preset specific routines that give you an advantage in some situations.
- **Production target:** `8d0657e7ade688bd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your extensive experience allows you to preset specific routines that give you an advantage in some situations. Once per encounter you can use each of the following actions: Attack Script: You can use a feat or a talent that modifies your attack roll as one action less (for example, a full-round action becomes a standard action, a standard action becomes a move action, a move action becomes a swift action, a swift action becomes a free action). Defense Script: You can apply your Independent Spirit bonus a second time during a single encounter. Skill Script: While in combat, you can apply a bonus equal to one-half of your class level to any single skill that requires a standard action or less to use. You must be trained in the skill.

#### Ultra Resilient

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** You have advanced subroutines that make you more resistant to the effect of damage.
- **Production target:** `6fdbdd17eba93006`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have advanced subroutines that make you more resistant to the effect of damage. Once per encounter, as a reaction, you can increase your damage threshold with a bonus equal to your Independent Droid level.

### Override

#### Directed Action

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** As a standard action, you allow one droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a free action.
- **Production target:** `3a34ce2ef55c41b1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you allow one droid that can hear and understand you to make a Deception, Mechanics, Persuasion, Pilot, Ride, Treat Injury, or Use Computer check immediately as a free action. The droid can replace its relevant ability score modifier for that check with your Intelligence modifier.

#### Directed Movement

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** As a move action, you allow one droid that can hear and understand you to move up to its speed.
- **Production target:** CREATE `510d4b2aadbbc2de`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a move action, you allow one droid that can hear and understand you to move up to its speed. The droid can make Acrobatics, Climb, Jump, Stealth, or Swim checks during this movement, and can replace its own relevant ability score modifier for that check with your Intelligence modifier.

#### Full Control

- **Page:** 28
- **Prerequisites:** Directed Action, Directed Movement, and Remote Attack
- **Quick summary:** As a full-round action, you allow one droid that can hear and understand you to take the full attack action.
- **Production target:** CREATE `67c0e483d52bee0d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a full-round action, you allow one droid that can hear and understand you to take the full attack action. The droid can replace its relevant ability score modifier to any attack rolls it makes with your Intelligence modifier.

#### Remote Attack

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** As a standard action, you allow one droid that can hear and understand you to make a melee or ranged attack.
- **Production target:** CREATE `86da8cfcddb94adb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a standard action, you allow one droid that can hear and understand you to make a melee or ranged attack. The droid can replace its relevant ability score modifier to its attack roll with your Intelligence modifier.

### Specialized Droid

#### Power Boost

- **Page:** 28
- **Prerequisites:** Power Surge
- **Quick summary:** You channel your power surge into a boost for your locomotion system.
- **Production target:** `eb503c1c3fb945a6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You channel your power surge into a boost for your locomotion system. When you initiate a power surge, you can use one of the following bonuses with your installed locomotion system: Jump +4 squares (walking or wheeled locomotion), or increase hovering height by 4 squares (hovering locomotion). You can use this talent for a number of rounds equal to one-haIf your level (rounded down). At the end of a power boost, you move -1 persistent step on the condition track. The penalties imposed by this condition persist until you receive repairs (using the Repair Droid application of the Mechanics skill). You can use both Power Surge and Power Boost at the same time, but you must move -2 persistent steps on the condition track.

---

## Append-only book index

- [x] Saga Edition Core Rulebook — 198 certified talent claims
- [ ] Clone Wars Campaign Guide
- [x] Rebellion Era Campaign Guide — 64 certified talent claims
- [x] Galaxy at War — 56 certified talent claims
- [x] Galaxy of Intrigue — 43 certified talent claims
- [x] Starships of the Galaxy — 23 certified talent claims
- [x] Threats of the Galaxy — 11 certified talent claims
- [ ] Scum and Villainy
- [x] Unknown Regions — 57 certified talent claims
- [x] Legacy Era Campaign Guide — 101 certified talent claims
- [ ] Knights of the Old Republic Campaign Guide
- [ ] Force Unleashed Campaign Guide
- [ ] Jedi Academy Training Manual
- [x] Scavenger's Guide to Droids — 31 certified talent claims

## Phase 3 production-status convention

Phase 3 may later append a production-status line beneath a talent using only certified dispositions such as:

- `KEEP`
- `UPDATE_CONTENT`
- `UPDATE_METADATA`
- `CORRECT_TREE`
- `CREATE`
- `IDENTITY_SPLIT`
- `REMOVE_CONTAMINATION`
- `REVIEW_EXTRA`

Do not infer `CREATE` from Phase 2's missing-correct-tree status alone.
