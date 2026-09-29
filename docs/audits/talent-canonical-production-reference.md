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

This talent allows you to redirect a deflected blaster bolt along a specific trajectory so that it damages another creature or object in its path, Once per round when you successfully deflect a blaster bolt, you can make an immediate ranged attack against another target with which you have line of sight. Apply the normal range penalties to the attack roll (see Table 8-5: Range Penalties), not counting the distance the bolt traveled to reach you. If the attack succeeds, it deals normal weapon damage to the target.

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
- **Quick summary:** You are able to obtain licensed, restricted, military, or illegal equipment without having to pay a licensing fee or endure a background check, provided the total cost of the desired equipment is equal to or less than your...
- **Phase 2 repository evidence:** Mapped repository record: `e58a8ad63c1d8771` (Connections)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You are able to obtain licensed, restricted, military, or illegal equipment without having to pay a licensing fee or endure a background check, provided the total cost of the desired equipment is equal to or less than your character level x 1,000 credits. In addition, when obtaining equipment or services through the black market, you reduce the black market cost multiplier by 1. See Restricted Items (page 118) for details.

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
- **Quick summary:** Whenever you use a Force power that has an area effect (such as Force slam), you may exclude a certain number of targets from the effects of that power.
- **Phase 2 repository evidence:** Mapped repository record: `0fc08fad3a87a830` (Disciplined Strike)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

Whenever you use a Force power that has an area effect (such as Force slam), you may exclude a certain number of targets from the effects of that power. The number of targets that you may exclude in this manner is equal to your Wisdom modifier (minimum of 1).

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
- **Phase 3B correction:** The mapped record is the distinct JATM Beastwarden identity and must remain there. Core Dathomiri Witch `Charm Beast` is `IDENTITY_SPLIT` with create ID `c919d7682bd9df40`.

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
- **Prerequisites:** —
- **Quick summary:** You can spend a Swift Action to grant one ally the ability to move its normal speed. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted.
- **Phase 2 repository evidence:** Mapped repository record: `aa32a31a179fe5c1` (Impel Ally I)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can spend a Swift Action to grant one ally the ability to move its normal speed. The ally must move immediately on your turn, before you do anything else, or else the opportunity is wasted.

#### Impel Ally II

- **Page:** 210
- **Prerequisites:** Impel Ally I
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
- **Quick summary:** You are considered proficient with any exotic weapon, even if you don't possess the appropriate Exotic Weapon Proficiency feat.
- **Phase 2 repository evidence:** Mapped repository record: `fb103ac0e4501e95` (Exotic Weapon Mastery)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You are considered proficient with any exotic weapon, even if you don't possess the appropriate Exotic Weapon Proficiency feat.

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
- **Quick summary:** You are skilled at using a particular Force Power. Select one Force Power you know.
- **Phase 2 repository evidence:** Mapped repository record: `90d9a2e7dbc160d1` (Force Power Adept)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You are skilled at using a particular Force Power. Select one Force Power you know. When using that Force Power, you have the option of spending a Force Point to make two Use the Force checks, keeping the better result.

This Talent may be selected multiple times. Its effects do not stack. Each time you select this Talent, you must choose a different Force Power.

#### Force Treatment

- **Page:** 214
- **Prerequisites:** —
- **Quick summary:** You can make a Use the Force check in place of a Treat Injury check. You are considered Trained in the Treat Injury Skill.
- **Phase 2 repository evidence:** Mapped repository record: `181da7f36b9fba9d` (Force Treatment)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You can make a Use the Force check in place of a Treat Injury check. You are considered Trained in the Treat Injury Skill. If you are entitled to a Treat Injury check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations).

In addition, you can administer First Aid, Treat Disease, Treat Poison, and Treat Radiation without the requisite Medical Kit or Medpac.

#### Fortified Body

- **Page:** 214
- **Prerequisites:** Equilibrium (see page 101).
- **Quick summary:** The Force shields you against ailments, toxins, and radiation poisoning, making you immune to Disease, Poison, and Radiation.
- **Phase 2 repository evidence:** Mapped repository record: `6714ab8e28708f50` (Fortified Body)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

The Force shields you against ailments, toxins, and radiation poisoning, making you immune to Disease, Poison, and Radiation.

### Force Item

**Canonical tree key:** `Saga Edition Core Rulebook|Force Item`

#### Attune Weapon

- **Page:** 214
- **Prerequisites:** —
- **Quick summary:** You may spend a Force Point to attune a melee weapon. Attuning the weapon takes a Full-Round Action.
- **Phase 2 repository evidence:** Mapped repository record: `aa9b67c6737c2549` (Attune Weapon)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may spend a Force Point to attune a melee weapon. Attuning the weapon takes a Full-Round Action. From that point forward, whenever you wield the attuned weapon, you gain a +1 Force bonus on attack rolls.

The weapon is attuned to you alone; others who wield the weapon do not gain the Force bonus.

#### Empower Weapon

- **Page:** 214
- **Prerequisites:** —
- **Quick summary:** You may spend a Force Point to empower a melee weapon. Empowering the weapon takes a Full-Round Action.
- **Phase 2 repository evidence:** Mapped repository record: `5218d5971b78119b` (Empower Weapon)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may spend a Force Point to empower a melee weapon. Empowering the weapon takes a Full-Round Action. From that point forward, the Empowered Weapon deals an additional die of damage, but only when wielded by you.

For example, an empowered Lightsaber deals 3d8 points of damage, instead of 2d8 points of damage. Others who wield the weapon do not gain the bonus damage die.

#### Force Talisman

- **Page:** 214
- **Prerequisites:** —
- **Quick summary:** You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you.
- **Phase 2 repository evidence:** Mapped repository record: `66b23ee79bd33bf1` (Force Talisman)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action.

While you wear or carry the Talisman on your person, you gain a +1 Force bonus to one of your Defenses (Reflex Defense, Fortitude Defense, or Will Defense).

You may only have one Force Talisman active at a given time, and if your Force Talisman is destroyed, you may not create another Force Talisman for 24 hours.

#### Greater Force Talisman

- **Page:** 214
- **Prerequisites:** Force Talisman
- **Quick summary:** You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you.
- **Phase 2 repository evidence:** Mapped repository record: `0c636cdbb63cdba3` (Greater Force Talisman)
- **Phase 2 discrepancy flags:** CORRECT_OR_SOURCE_ALIGNED

**Canonical rules text**

You may spend a Force Point to imbue a weapon or some other portable object with The Force, creating a Talisman that provides protection to you. Creating the Talisman takes a Full-Round Action.

While you wear or carry the Talisman on your person, you gain a +1 Force bonus to all of your Defenses (Reflex Defense, Fortitude Defense, and Will Defense).

You may only have one Greater Force Talisman active at a given time, and if your Greater Force Talisman is destroyed, you may not create another Greater Force Talisman (or regular Force Talisman) for 24 hours.

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


## Book 8 — Scum and Villainy

**Phase 3B status:** COMPLETE — 110 owned canonical identities; 104 UPDATE_CONTENT; 1 UPDATE_METADATA; 3 CORRECT_TREE; 1 CREATE; 1 IDENTITY_SPLIT; 1 tree consolidation.

### Jedi Sentinel

#### Persistent Haze

- **Page:** 13
- **Prerequisites:** Clear Mind, Force Haze
- **Quick summary:** Whenever anyone concealed by your use of the Force Haze talent attacks, you maintain total concealment without having to make another Use the Force check.
- **Production record:** `797de6f9dab4d578`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever anyone concealed by your use of the Force Haze talent attacks, you maintain total concealment without having to make another Use the Force check. Only those who do not attack remain concealed; the attacker no longer has total concealment, even when using this talent.

### Disgrace

#### Ambush

- **Page:** 13
- **Prerequisites:** Dirty Tactics
- **Quick summary:** During a surprise round, before combat begins, if you are not surprised you can give up your standard action to allow all nonsurprised allies within your line of sight to take an extra move action during the surprise round.
- **Production record:** `a3ac90e84127805d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

During a surprise round, before combat begins, if you are not surprised you can give up your standard action to allow all nonsurprised allies within your line of sight to take an extra move action during the surprise round. Allies can spend this move action to instead reroll their Initiative check and take the better result as a free action before combat begins.

#### Castigate

- **Page:** 14
- **Prerequisites:** None.
- **Quick summary:** You deliver a scathing rebuke against a target to erode its will and fill it with doubt.
- **Production record:** `cad07bbaa57634c0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You deliver a scathing rebuke against a target to erode its will and fill it with doubt. Make a Persuasion check as a standard action against the target's Will Defense. If successful, impose a -2 penalty to all the target's Defenses until the end of your next turn. You can use this ability only against targets that can clearly hear you and understand your language.

#### Dirty Tactics

- **Page:** 14
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a standard action, you can grant a tactical advantage to all allies within your line of sight.
- **Production record:** `1e7a0010a589b870`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a standard action, you can grant a tactical advantage to all allies within your line of sight. When any ally flanks an opponent, that ally gains a +4 flanking bonus on melee attack rolls instead of the normal +2 bonus. Allies lose this benefit immediately if line of sight is broken, if you are unconscious or dead, or at the end of the encounter.

#### Misplaced Loyalty

- **Page:** 14
- **Prerequisites:** Dirty Tactics
- **Quick summary:** As a swift action once per turn, you can make a Persuasion check against the Will Defense of all opponents within your line of sight.
- **Production record:** `4635850263c7bf94`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action once per turn, you can make a Persuasion check against the Will Defense of all opponents within your line of sight. If successful, a target cannot attack you if one of your allies is within 6 squares of you. You may not use this talent in the same round as the soldier's Draw Fire talent. This effect lasts until the beginning of your next turn.

#### Two-Faced

- **Page:** 14
- **Prerequisites:** Dirty Tactics, Misplaced Loyalty
- **Quick summary:** Once each per encounter, attack to set up a retaliatory strike, become nonthreatening, or gain +2 attack and damage against a target that ignored you.
- **Production record:** `cef9b7ca6a26f4a6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use each of the following actions once per encounter as a standard action. False Security: Make a single melee or ranged attack against a target within range; any time before the beginning of your next turn, you can make a single attack against that target as a reaction if that target attacks you. Nonthreatening: Make a single melee or ranged attack against a target within range; until the beginning of your next turn, that opponent cannot make any attacks against you except attacks of opportunity; this is a mind-affecting effect. Tricky Target: Make a single melee or ranged attack against a target within range that has not attacked you since the end of your last turn; you gain a +2 bonus on your attack roll and damage roll for this attack.

#### Unreadable

- **Page:** 14
- **Prerequisites:** None.
- **Quick summary:** You gain a +5 bonus to your Will Defense against skill checks made to read your emotions and influence your attitude.
- **Production record:** `01bcee2365b82ce6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a +5 bonus to your Will Defense against skill checks made to read your emotions and influence your attitude. In addition, whenever you successfully feint a target in combat, that target is flat-footed against all your attacks until the end of your next turn.

### Inspiration

#### Beloved

- **Page:** 14
- **Prerequisites:** Bolster Ally, Inspire Confidence
- **Quick summary:** Once each per encounter, use Guardian for +2 Reflex, Reprisal to enable an ally's reaction attack, or To Me! to let visible allies reposition when you take damage.
- **Production record:** `444c032c563c18a1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your allies hold you in such esteem that when you are threatened or injured, you can impel them to action. You can use each of the following actions once per encounter. Guardian: Choose one ally as a swift action. As long as you remain within 6 squares of the ally, you gain a +2 bonus to your Reflex Defense until the start of your next turn. Reprisal: Make a single melee or ranged attack against any target within range as a standard action. If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction. To Me!: Spend a swift action. Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity.

### Fortune

#### Avert Disaster

- **Page:** 14
- **Prerequisites:** Fool's Luck
- **Quick summary:** Once per encounter, you can turn a critical hit against you into a normal hit.
- **Production record:** `f453d09361b02e5a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can turn a critical hit against you into a normal hit.

#### Better Lucky than Dead

- **Page:** 14
- **Prerequisites:** Fool's Luck
- **Quick summary:** Once per encounter, as a reaction, you gain a +5 luck bonus to any one defense until the start of your next turn.
- **Production record:** `bea59db82b097eea`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction, you gain a +5 luck bonus to any one defense until the start of your next turn.

#### Dumb Luck

- **Page:** 14
- **Prerequisites:** Knack, Lucky Shot
- **Quick summary:** Once each per encounter, use Dumb Luck to gain Reflex against a damaged target, escape after being damaged, or gain +2 on your next attack after a miss.
- **Production record:** `7a024dac260bf9ec`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use each of the following actions once per encounter as a standard action. Elude Enemy: Make a single melee or ranged attack against any target within range; if you damage the target, you gain a +2 bonus to your Reflex Defense against that target until the beginning of your next turn. Escape: Make a single melee or ranged attack against any target within range; if the target successfully damages you before the start of your next turn, you can immediately move 2 squares as a reaction without provoking attacks of opportunity. Make your Own Luck: Make a single melee or ranged attack against any target within range; if you miss this target, you gain a +2 bonus on your next attack roll.

#### Labyrinthine Mind

- **Page:** 15
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a reaction, you become immune to all mind-affecting effects until the end of your next turn.
- **Production record:** `e07f87b5dbcf035f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction, you become immune to all mind-affecting effects until the end of your next turn. You can choose to ignore this for beneficial effects. Any mind-affecting effects currently affecting you are also removed, though you may choose to retain any beneficial effects.

#### Ricochet Shot

- **Page:** 15
- **Prerequisites:** Knack, Lucky Shot
- **Quick summary:** When making a ranged attack against a target with cover, you can choose to reduce the benefit of that target's cover by one step, from improved cover to cover or cover to no cover.
- **Production record:** `5459cc5eedf15c8d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When making a ranged attack against a target with cover, you can choose to reduce the benefit of that target's cover by one step, from improved cover to cover or cover to no cover. You deal only half damage with this attack.

#### Uncanny Luck

- **Page:** 15
- **Prerequisites:** Knack, Lucky Shot
- **Quick summary:** Once per encounter, you can consider any single d20 roll of 16 or higher to be a natural 20.
- **Production record:** `e435b618793d8bc7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can consider any single d20 roll of 16 or higher to be a natural 20.

#### Unlikely Shot

- **Page:** 15
- **Prerequisites:** Knack, Lucky Shot
- **Quick summary:** Once per encounter, you can reroll the damage of one attack and take the better result.
- **Production record:** `beae25ca4ed40eea`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can reroll the damage of one attack and take the better result.

### Misfortune

#### Befuddle

- **Page:** 15
- **Prerequisites:** None.
- **Quick summary:** If you succeed on a Deception check against a target's Will Defense as a swift action, until the start of your next turn you can move through the threatened area of that target as a part of your move action without provoking an attack of opportunity.
- **Production record:** `1b26576c71db3b1b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you succeed on a Deception check against a target's Will Defense as a swift action, until the start of your next turn you can move through the threatened area of that target as a part of your move action without provoking an attack of opportunity. Each threatened square that you move through counts as 2 squares of movement.

#### Cunning Strategist

- **Page:** 15
- **Prerequisites:** Disruptive, Walk the Line
- **Quick summary:** Once each per encounter, attack to impose -5 Reflex, reduce speed by 2, or attack two nearby targets at -5 while rolling damage once.
- **Production record:** `94adb5de4d3a7b20`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use each of the following actions once per encounter as a standard action. Create Opening: Make a single melee or ranged attack against any target within range; if you damage the target, it takes a -5 penalty to its Reflex Defense until the start of your next turn. Crippling Attack: Make a single melee or ranged attack against an opponent within range; until the start of your next turn, the target takes a -2 penalty to its speed. Vicious Attack: Make a melee or ranged attack with one weapon against two opponents that are within 2 squares of each other; make a separate attack roll at a -5 penalty against each target, but roll damage only once.

#### Hesitate

- **Page:** 15
- **Prerequisites:** None.
- **Quick summary:** You can fill your opponent with doubt by making a Persuasion check as a standard action against a single target that can hear and understand you within 12 squares.
- **Production record:** `1c381292494e3139`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can fill your opponent with doubt by making a Persuasion check as a standard action against a single target that can hear and understand you within 12 squares. If your check result equals or exceeds the target's Will Defense, the target takes a -2 penalty to its base speed, and if the target takes a standard action it must also spend its swift action. This penalty lasts until the end of the target's next turn.

#### Improved Skirmisher

- **Page:** 15
- **Prerequisites:** Skirmisher
- **Quick summary:** When you move at least 2 squares before your attack and end your move in a different square from where you started, you gain a +1 bonus to all your defenses until the start of your next turn.
- **Production record:** `dd69400f0069f846`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you move at least 2 squares before your attack and end your move in a different square from where you started, you gain a +1 bonus to all your defenses until the start of your next turn.

#### Sow Confusion

- **Page:** 15
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a standard action, you can make a Deception check and compare the result to the Will Defense of all enemies in your line of sight.
- **Production record:** `6b09fe0c6fe98367`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a standard action, you can make a Deception check and compare the result to the Will Defense of all enemies in your line of sight. If the check result equals or exceeds an enemy's Will Defense, that enemy must spend a swift action in addition to a standard action to make an attack until the start of your next turn.

#### Sudden Strike

- **Page:** 15
- **Prerequisites:** Skirmisher, Sneak Attack
- **Quick summary:** Whenever you would gain the benefit of the Skirmisher talent and you successfully hit your opponent, you deal sneak attack damage in addition to the normal damage dealt by the attack.
- **Production record:** `08c80cfea1a3b886`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you would gain the benefit of the Skirmisher talent and you successfully hit your opponent, you deal sneak attack damage in addition to the normal damage dealt by the attack.

#### Weakening Strike

- **Page:** 15
- **Prerequisites:** Dastardly Strike
- **Quick summary:** Whenever you deal damage to an opponent denied its Dexterity bonus to Reflex Defense, you can choose not to move the target down the condition track and instead impose a -5 penalty on all your opponent's attacks and melee damage until the end of your next turn.
- **Production record:** `9c1e0b0566cb45c2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you deal damage to an opponent denied its Dexterity bonus to Reflex Defense, you can choose not to move the target down the condition track and instead impose a -5 penalty on all your opponent's attacks and melee damage until the end of your next turn.

### Slicer

#### Virus

- **Page:** 16
- **Prerequisites:** Electronic Sabotage, trained in Use Computer
- **Quick summary:** You can substitute a Use Computer check for a Mechanics check when disabling a computerized device.
- **Production record:** `aa964478cf5b30e8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can substitute a Use Computer check for a Mechanics check when disabling a computerized device. The effort takes 1 minute and the DC is equal to the computer's Will Defense. In addition, whenever anyone accesses the affected computer using a droid or another computer, that computer or droid's attitude immediately becomes unfriendly.

### Spacer

#### Cramped Quarters Fighting

- **Page:** 16
- **Prerequisites:** Spacehound, Starship Raider
- **Quick summary:** When adjacent to an obstacle or barrier, you gain a +2 cover bonus to your Reflex Defense.
- **Production record:** `2b424f7cc4115acf`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When adjacent to an obstacle or barrier, you gain a +2 cover bonus to your Reflex Defense.

#### Make a Break for It

- **Page:** 16
- **Prerequisites:** Spacehound, Stellar Warrior
- **Quick summary:** Once per encounter, while on or in a vehicle, you can move up to one-half your speed or move the vehicle up to one-half its speed if you are the pilot, as a swift action.
- **Production record:** `294bad1c8a7b4132`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, while on or in a vehicle, you can move up to one-half your speed or move the vehicle up to one-half its speed if you are the pilot, as a swift action. This movement does not provoke attacks of opportunity.

### Camouflage

#### Hide in Plain Sight

- **Page:** 16
- **Prerequisites:** Hidden Movement, Improved Stealth
- **Quick summary:** Once per encounter, when you are within 2 squares of cover or concealment, you can move to that cover or concealment and make a Stealth check to hide as a single move action.
- **Production record:** `f25d28252bade7d1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, when you are within 2 squares of cover or concealment, you can move to that cover or concealment and make a Stealth check to hide as a single move action.

#### Hunker Down

- **Page:** 16
- **Prerequisites:** None.
- **Quick summary:** Whenever you benefit from cover, you can spend a swift action to hunker down and maximize the benefit of the cover.
- **Production record:** `11065e811d738b6e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you benefit from cover, you can spend a swift action to hunker down and maximize the benefit of the cover. You increase the benefit of cover to improved cover and improved cover to total cover.

#### Shadow Striker

- **Page:** 16
- **Prerequisites:** Hidden Movement, Improved Stealth
- **Quick summary:** Once each per encounter, attack from stealth to gain total concealment, restrict a target to one swift action, or gain +2/+5 on the attack.
- **Production record:** `bca8ce9a488cf3d8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use each of the following actions once per encounter as a standard action. Blinding Strike: Make a single melee or ranged attack against an opponent within range; if you damage the target, you gain total concealment against that target until the beginning of your next turn. Confusing Strike: Make a single melee or ranged attack against an opponent within range; if the opponent is denied its Dexterity bonus to Reflex Defense or you have concealment from this opponent, a successful attack also causes the opponent to be able to take only a swift action on its next turn. Unexpected Attack: Make a melee or ranged attack within range against an opponent from whom you have concealment; you gain a +2 bonus on this attack roll if you have concealment or a +5 bonus if you have total concealment.

### Fringer

#### Flee

- **Page:** 17
- **Prerequisites:** Long Stride
- **Quick summary:** As a standard action, you can designate a single opponent and move up to your speed away from that opponent.
- **Production record:** `9ee88ce289527ed3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can designate a single opponent and move up to your speed away from that opponent. This movement does not provoke attacks of opportunity from that opponent, though it might provoke as normal from all other opponents. In addition, your speed increases by 2 until the end of your next turn.

#### Keep it Together

- **Page:** 17
- **Prerequisites:** Jury-Rigger
- **Quick summary:** Whenever you successfully jury-rig a device or vehicle, the vehicle does not move -5 steps along the condition track at the end of the encounter, though it does move -2 persistent steps down the condition track.
- **Production record:** `9211e3f6268b3413`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully jury-rig a device or vehicle, the vehicle does not move -5 steps along the condition track at the end of the encounter, though it does move -2 persistent steps down the condition track.

#### Sidestep

- **Page:** 17
- **Prerequisites:** Long Stride
- **Quick summary:** You can use a swift action to reduce the cost of each move into a diagonal space to 1 until the end of your turn if you are wearing light armor or no armor.
- **Production record:** `b4ae0f26326cdf71`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use a swift action to reduce the cost of each move into a diagonal space to 1 until the end of your turn if you are wearing light armor or no armor. You cannot use this talent if you are wearing medium or heavy armor.

#### Surge

- **Page:** 17
- **Prerequisites:** Long Stride
- **Quick summary:** Once per encounter, you can use a swift action to move up to your speed.
- **Production record:** `0a0681811f43b128`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can use a swift action to move up to your speed.

#### Swift Strider

- **Page:** 17
- **Prerequisites:** Long Stride, Sidestep
- **Quick summary:** Once each per encounter, move for a lasting Reflex bonus, charge without the Reflex penalty, or build Reflex bonuses from attacks of opportunity during movement.
- **Production record:** `cae4f000dcfddd99`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use each of the following actions once per encounter as a standard action. Blurring Burst: As a move action move up to your speed and gain a +2 bonus to your Reflex Defense until the end of the encounter. Sudden Assault: Make a charge attack against an enemy within range as a standard action; you take no penalty to your Reflex Defense for this attack. Weaving Stride: Move up to your speed as a move action; you gain a cumulative +2 dodge bonus to Reflex Defense for each attack of opportunity made against you during this movement, lasting until the beginning of your next turn.

### Brawler

#### Cantina Brawler

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** While flanked, you gain a +2 bonus to your attack rolls and damage rolls.
- **Production record:** `430b73348460715e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

While flanked, you gain a +2 bonus to your attack rolls and damage rolls.

#### Counterpunch

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** When you fight defensively, any adjacent creature that attacks you provokes an attack of opportunity from you.
- **Production record:** `e1ac13b319b66c76`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you fight defensively, any adjacent creature that attacks you provokes an attack of opportunity from you.

#### Experienced Brawler

- **Page:** 18
- **Prerequisites:** Melee Smash, Stunning Strike
- **Quick summary:** Once each per encounter after a melee attack, gain +5 Reflex, gain +5 Fortitude/Will, or move 2 squares safely as a reaction.
- **Production record:** `bab0b5d081e304b6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use each of the following actions as a standard action once per encounter. Avoid Attack: Make a single melee attack against an opponent within your reach. Until the beginning of your next turn, you gain a +5 dodge bonus to Reflex Defense against a single attack as a reaction. Fortified Mind: Make a single melee attack against an opponent within your reach. Until the beginning of your next turn, you gain a +5 bonus to Fortitude or Will Defense against a single attack as a reaction. Focused Stance: Make a single melee attack against an opponent within your reach. At any time before the beginning of your next turn, as a reaction, you can move up to 2 squares; this movement does not provoke attacks of opportunity.

#### Make Do

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** When fighting with an improvised weapon, you take no penalty on your attack rolls.
- **Production record:** `95ae8969ac50b180`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When fighting with an improvised weapon, you take no penalty on your attack rolls.

#### Man Down

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** Whenever an ally within 6 squares is reduced to 0 hit points, you can immediately move up to your speed toward that ally as a reaction.
- **Production record:** `da6a06aaf630376d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever an ally within 6 squares is reduced to 0 hit points, you can immediately move up to your speed toward that ally as a reaction. This movement does not provoke attacks of opportunity.

#### Pick a Fight

- **Page:** 18
- **Prerequisites:** Cantina Brawler
- **Quick summary:** During the surprise round, you and all allies within 6 squares of you gain a +1 morale bonus on attack rolls.
- **Production record:** `ffe31e578e9abeee`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

During the surprise round, you and all allies within 6 squares of you gain a +1 morale bonus on attack rolls. Additionally, until the end of the encounter, you retain this bonus to attack rolls against any target you or your allies damage during the surprise round.

#### Sucker Punch

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** When your melee attack damages an opponent that is denied its Dexterity bonus to Reflex Defense, that opponent cannot make attacks of opportunity until the end of its next turn.
- **Production record:** `6044037b6eb3ede9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When your melee attack damages an opponent that is denied its Dexterity bonus to Reflex Defense, that opponent cannot make attacks of opportunity until the end of its next turn.

### Weapon Specialist

#### Crushing Assault

- **Page:** 18
- **Prerequisites:** Weapon Specialization
- **Quick summary:** Whenever you successfully damage an opponent using a bludgeoning weapon that you have the Weapon Specialization talent for, your next attack against that opponent made before the end of the encounter gains a +2 bonus to the attack roll and to the damage roll.
- **Production record:** `e1cb0fd81f7f6d44`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully damage an opponent using a bludgeoning weapon that you have the Weapon Specialization talent for, your next attack against that opponent made before the end of the encounter gains a +2 bonus to the attack roll and to the damage roll. The effects of multiple Crushing Assaults do not stack.

#### Impaling Assault

- **Page:** 18
- **Prerequisites:** Weapon Specialization
- **Quick summary:** Whenever you successfully damage an opponent using a piercing weapon that you have the Weapon Specialization talent for, your opponent reduces its speed by 2 squares until the end of your next turn.
- **Production record:** `86a8e796b6c4deae`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully damage an opponent using a piercing weapon that you have the Weapon Specialization talent for, your opponent reduces its speed by 2 squares until the end of your next turn. The effects of multiple Impaling Assaults do not stack.

#### Stinging Assault

- **Page:** 18
- **Prerequisites:** Weapon Specialization
- **Quick summary:** Whenever you successfully injure an opponent using a slashing weapon that you have the Weapon Specialization talent for, your opponent takes a -2 penalty on melee attacks against you until the start of your next turn.
- **Production record:** `cdb01f90827fad8c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully injure an opponent using a slashing weapon that you have the Weapon Specialization talent for, your opponent takes a -2 penalty on melee attacks against you until the start of your next turn. The effects of multiple Stinging Assaults do not stack.

### Blockade Runner

#### Close Cover

- **Page:** 25
- **Prerequisites:** Watch This
- **Quick summary:** If you occupy the same space as a vehicle that is larger than the vehicle you are piloting, your vehicle gains a +5 cover bonus from the larger vehicle.
- **Production record:** `9af262765ace3af1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you occupy the same space as a vehicle that is larger than the vehicle you are piloting, your vehicle gains a +5 cover bonus from the larger vehicle.

#### Outrun

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Whenever you use the all-out movement action as the pilot of a vehicle, your vehicle gains a +2 dodge bonus to Reflex Defense.
- **Production record:** `57caba8565b88056`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you use the all-out movement action as the pilot of a vehicle, your vehicle gains a +2 dodge bonus to Reflex Defense.

#### Punch Through

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** If you are the pilot of a vehicle, smaller vehicles that attempt to engage you in a dogfight take a -10 penalty on their Pilot check instead of the normal -5.
- **Production record:** `a0099db14b3fc3e7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you are the pilot of a vehicle, smaller vehicles that attempt to engage you in a dogfight take a -10 penalty on their Pilot check instead of the normal -5.

#### Small Target

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** When you are the pilot of a Colossal or smaller vehicle, capital ship weapons that take a -20 penalty on attack rolls against your vehicle, such as turbolasers, do not automatically score a critical hit on your vehicle on a natural 20.
- **Production record:** `70a06f3be4e9c216`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you are the pilot of a Colossal or smaller vehicle, capital ship weapons that take a -20 penalty on attack rolls against your vehicle, such as turbolasers, do not automatically score a critical hit on your vehicle on a natural 20. The attack is only a critical hit if the total attack roll (20 + the weapon's attack bonus) would normally hit your vehicle. Otherwise, the attack deals normal damage.

#### Watch This

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** You can move into or through a space occupied by a vehicle of Colossal (frigate) size or larger without causing a collision.
- **Production record:** `0b04910aaabc51ba`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can move into or through a space occupied by a vehicle of Colossal (frigate) size or larger without causing a collision. Additionally, if you pilot a Colossal or smaller vehicle, you can occupy the same space as a vehicle of Colossal (frigate) size or larger.

### Bounty Hunter

#### Dread

- **Page:** 26
- **Prerequisites:** Hunter's Mark, Hunter's Target
- **Quick summary:** As a standard action, you can instill bone-chilling fear in an opponent whom you selected for Hunter's Target.
- **Production record:** `782768cab6bd13de`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can instill bone-chilling fear in an opponent whom you selected for Hunter's Target. Make a Persuasion check against your opponent's Will Defense. If you equal or exceed your opponent's Will Defense, that opponent takes a -5 penalty to Will Defense. This is a mind-affecting effect. The penalty remains as long as you have line of sight to your opponent and immediately ends if the line of sight is broken.

#### Nowhere to Run

- **Page:** 26
- **Prerequisites:** Hunter's Mark, Hunter's Target, Nowhere to Hide
- **Quick summary:** Once per turn, whenever an opponent whom you selected for Hunter's Target attempts to withdraw, you can make an attack of opportunity against the opponent.
- **Production record:** `93a41831fe6bfc09`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn, whenever an opponent whom you selected for Hunter's Target attempts to withdraw, you can make an attack of opportunity against the opponent.

#### Tag

- **Page:** 26
- **Prerequisites:** Hunter's Mark, Hunter's Target
- **Quick summary:** Whenever you damage an opponent whom you selected for Hunter's Target, all allies gain a +2 bonus on their next attack roll against that opponent until the start of your next turn.
- **Production record:** `28a61dadc073cd84`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you damage an opponent whom you selected for Hunter's Target, all allies gain a +2 bonus on their next attack roll against that opponent until the start of your next turn.

### Gand Findsman

#### Findsman Ceremonies

- **Page:** 26
- **Prerequisites:** Force Sensitivity feat
- **Quick summary:** Once per day, you can spend 10 minutes performing rituals that enhance your connection with the Force, receiving visions and portents as a result.
- **Production record:** `661c2c0665e911f6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per day, you can spend 10 minutes performing rituals that enhance your connection with the Force, receiving visions and portents as a result. At that time, you can spend any number of Force Points in the performance of the ritual, up to the total number you have remaining. For the remainder of the day, whenever you make a Perception or Stealth check, make a Use the Force check to use the farseeing Force power, or make an attack roll, you can choose to reroll but must keep the second result, even if it is worse. You may do this a number of times per day equal to the number of Force Points you spent during the casting of the ritual. At the end of the day, you regain Force Points equal to the number of rerolls you have remaining.

#### Findsman's Foresight

- **Page:** 26
- **Prerequisites:** Findsman Ceremonies
- **Quick summary:** The visions you receive sometimes provide clues about dangerous situations.
- **Production record:** `e8fe6087eef386c7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

The visions you receive sometimes provide clues about dangerous situations. Whenever you make a Perception check to avoid surprise, you may roll two dice and keep the better result.

#### Omens

- **Page:** 26
- **Prerequisites:** Findsman Ceremonies
- **Quick summary:** You see omens in both success and failure.
- **Production record:** `b08c8efbea22f604`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You see omens in both success and failure. Whenever an ally within 10 squares and line of sight rolls a natural 1 or a natural 20 on an attack roll, you gain a +2 insight bonus to either your next attack roll made before the end of your next turn, or a +2 insight bonus to Reflex Defense until the end of your next turn, your choice.

#### Target Visions

- **Page:** 26
- **Prerequisites:** Findsman Ceremonies
- **Quick summary:** You have visions that tell you what your enemies are likely to do even before they do it.
- **Production record:** `d61e3a2afe8ab339`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have visions that tell you what your enemies are likely to do even before they do it. Once per encounter, when an enemy creature moves within 6 squares of you, you may make a melee or ranged attack against that target as a reaction to their movement.

#### Temporal Awareness

- **Page:** 26
- **Prerequisites:** Findsman Ceremonies
- **Quick summary:** Once per encounter, as a reaction to any enemy's attack, you can move up to your speed.
- **Production record:** `028e4e50565971ee`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction to any enemy's attack, you can move up to your speed.

### Infamy

#### Fear Me!

- **Page:** 26
- **Prerequisites:** Attract Minion, Inspire Fear I, Inspire Fear II
- **Quick summary:** Once per encounter, as a reaction to one of your minions being moved down the condition track, you can reduce the number of steps the minion moves down the condition track by 1.
- **Production record:** `a49074cc564848bb`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction to one of your minions being moved down the condition track, you can reduce the number of steps the minion moves down the condition track by 1. Additionally, the target regains hit points equal to your heroic level. If the target is reduced to 0 hit points or moved to the bottom of the condition track, you cannot use this talent on that target.

#### Frighten

- **Page:** 26
- **Prerequisites:** Attract Minion, Inspire Fear I
- **Quick summary:** Once per encounter, you can designate a minion as a free action to spread fear among your enemies.
- **Production record:** `50273d5ce8f84c31`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can designate a minion as a free action to spread fear among your enemies. At any point before the end of the encounter, you can activate this ability to force all enemies adjacent to your minion to move 1 square away from the minion. This movement does not provoke attacks of opportunity. This is a mind-affecting effect.

#### Terrify

- **Page:** 27
- **Prerequisites:** Frighten, Inspire Fear I, Inspire Fear II
- **Quick summary:** As a standard action, you can make a Persuasion check against a target that is within your line of sight and that is also affected by your Inspire Fear talent.
- **Production record:** `8ed7b1889b1416d4`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can make a Persuasion check against a target that is within your line of sight and that is also affected by your Inspire Fear talent. If you equal or exceed the target's Will Defense, then on its next turn the target must spend at least one move action to move away from you. If the target is somehow prevented from doing so, then the penalty from Inspire Fear doubles until the start of your next turn. This is a mind-affecting fear effect.

#### Unsavory Reputation

- **Page:** 27
- **Prerequisites:** Inspire Fear I, Inspire Fear II, Inspire Fear III, Notorious
- **Quick summary:** Any opponent that is reduced to half hit points or fewer while within 6 squares of you takes a -2 penalty on all attack rolls and skill checks for the duration of the encounter.
- **Production record:** `b0ecc747a76deb72`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Any opponent that is reduced to half hit points or fewer while within 6 squares of you takes a -2 penalty on all attack rolls and skill checks for the duration of the encounter. This is a mind-affecting fear effect.

### Mastermind

#### Bodyguard I

- **Page:** 27
- **Prerequisites:** Attract Minion
- **Quick summary:** Whenever you are adjacent to a minion gained with the Attract Minion talent, once per turn as a reaction to being attacked you can redirect the attack against that minion.
- **Production record:** `58789f9d0a49f215`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you are adjacent to a minion gained with the Attract Minion talent, once per turn as a reaction to being attacked you can redirect the attack against that minion. Compare the attack roll to the minion's defenses and resolve the attack as normal.

#### Bodyguard II

- **Page:** 27
- **Prerequisites:** Attract Minion, Bodyguard I
- **Quick summary:** When you redirect an attack to a minion using the Bodyguard I talent, that minion's relevant defense score gains a bonus equal to half your class level.
- **Production record:** `7679eae1004af0cc`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you redirect an attack to a minion using the Bodyguard I talent, that minion's relevant defense score gains a bonus equal to half your class level.

#### Bodyguard III

- **Page:** 27
- **Prerequisites:** Attract Minion, Bodyguard I, Bodyguard II
- **Quick summary:** When you redirect an attack to a minion using the Bodyguard I talent, that minion can make an immediate melee or ranged attack against your attacker if the attacker is within range.
- **Production record:** `9c2a4cbe82e922ec`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you redirect an attack to a minion using the Bodyguard I talent, that minion can make an immediate melee or ranged attack against your attacker if the attacker is within range. Additionally, the bonus provided by the Bodyguard II talent increases to your full class level.

#### Impel Ally III

- **Page:** 27
- **Prerequisites:** Impel Ally I, Impel Ally II
- **Quick summary:** Once per encounter, you can spend three swift actions on consecutive turns to grant one ally the ability to take a standard action and a move action.
- **Production record:** `3f01107ed7779426`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can spend three swift actions on consecutive turns to grant one ally the ability to take a standard action and a move action. The ally must act immediately on your turn when the final swift action is spent, before you do anything else, or the opportunity is wasted.

#### Inspire Wrath

- **Page:** 27
- **Prerequisites:** Impel Ally I, Impel Ally II
- **Quick summary:** As a standard action, you can designate a target to be the object of your allies' wrath.
- **Production record:** `dbe08a93276b6c25`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can designate a target to be the object of your allies' wrath. While your allies have line of sight to the target or until the target is unconscious or dead, your allies gain a +2 morale bonus on attack rolls against the target and a +2 morale bonus on skill checks against that target. You can designate a new target on any round by using another standard action. You can only use this talent against one opponent at a time.

#### Shelter

- **Page:** 27
- **Prerequisites:** Attract Minion
- **Quick summary:** Whenever you are adjacent to a minion, you gain a +2 cover bonus to your Reflex Defense.
- **Production record:** `e37a169786348439`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you are adjacent to a minion, you gain a +2 cover bonus to your Reflex Defense.

#### Tactical Superiority

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** Spend two swift actions to select two allies.
- **Production record:** `f259cf27c1b62c47`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Spend two swift actions to select two allies. Each ally can move 2 squares as a reaction. This movement does not provoke attacks of opportunity.

#### Tactical Withdrawal

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** Spend two swift actions to grant all allies that are in your line of sight and within 6 squares of you the ability to use the withdraw action as a swift action until the start of your next turn.
- **Production record:** `b293a6a20b90bebe`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Spend two swift actions to grant all allies that are in your line of sight and within 6 squares of you the ability to use the withdraw action as a swift action until the start of your next turn.

#### Urgency

- **Page:** 27
- **Prerequisites:** Impel Ally I, Impel Ally II, Impel Ally III
- **Quick summary:** Once per encounter, you can spend three swift actions on consecutive turns to increase the speed of all allies within line of sight of you by 2.
- **Production record:** `a45e2213dd7eb4ca`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can spend three swift actions on consecutive turns to increase the speed of all allies within line of sight of you by 2. The increased speed lasts until the start of your next turn after the third swift action is spent.

#### Wealth of Allies

- **Page:** 27
- **Prerequisites:** Attract Minion
- **Quick summary:** Whenever one of your minions is killed, he or she is replaced by another minion of the same level.
- **Production record:** `397ba7dc962f6ebc`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever one of your minions is killed, he or she is replaced by another minion of the same level. This replacement occurs 24 hours later.

### Gunslinger

#### Ranged Flank

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** If you are within 6 squares of a target and are armed with a pistol or a rifle, you can act as though you occupied the nearest square adjacent to the target for the purposes of determining whether or not you or any allies are flanking that target.
- **Production record:** `a6e38142447c64a9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you are within 6 squares of a target and are armed with a pistol or a rifle, you can act as though you occupied the nearest square adjacent to the target for the purposes of determining whether or not you or any allies are flanking that target. You may only be considered to be flanking a single target at range at a time. You must spend a swift action on your turn to designate the target you flank at range.

### Pistoleer

#### Dash and Blast

- **Page:** 27
- **Prerequisites:** Dual Weapon Mastery I, Running Attack
- **Quick summary:** Once per encounter as a full-round action, when you are wielding two pistols, you may move up to twice your speed and make a ranged attack with each pistol.
- **Production record:** `c41461c3bdd0165d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a full-round action, when you are wielding two pistols, you may move up to twice your speed and make a ranged attack with each pistol. The normal penalties for attacking with two weapons apply to these attacks.

#### Flanking Fire

- **Page:** 28
- **Prerequisites:** Dual Weapon Mastery I
- **Quick summary:** Whenever you are flanked by two or more opponents and are wielding two pistols, you can make a full attack action as a standard action instead of a full-round action.
- **Production target:** CREATE `1f6b9d509a07f881`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you are flanked by two or more opponents and are wielding two pistols, you can make a full attack action as a standard action instead of a full-round action. This is provided that you target only opponents that flank you and attack at least two targets.

#### Guaranteed Shot

- **Page:** 28
- **Prerequisites:** Dual Weapon Mastery I
- **Quick summary:** If you are wielding two pistols and make a single ranged attack with one of those pistols as a standard action, even if you miss you deal damage equal to half your heroic level to the target.
- **Production record:** `52a4914cca90cc4d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you are wielding two pistols and make a single ranged attack with one of those pistols as a standard action, even if you miss you deal damage equal to half your heroic level to the target. This consumes a single shot from the weapon not making the attack, and the weapon you attack with uses as many shots as required by the attack.

#### Hailfire

- **Page:** 28
- **Prerequisites:** Dual Weapon Mastery I
- **Quick summary:** When you are wielding two pistols, as a standard action you can make an autofire attack with one of the pistols as though the weapon were set to autofire, even if the pistol would not normally be capable of autofire.
- **Production record:** `223ba62ffbabb9c2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you are wielding two pistols, as a standard action you can make an autofire attack with one of the pistols as though the weapon were set to autofire, even if the pistol would not normally be capable of autofire. The normal penalties for autofire still apply to this attack roll, and you may split the number of shots consumed between the two pistols.

#### Twin Shot

- **Page:** 28
- **Prerequisites:** Dual Weapon Mastery I, Rapid Shot
- **Quick summary:** When you are wielding two pistols, you gain a +2 bonus to damage rolls when using the Rapid Shot feat.
- **Production record:** `c219dc05ccc7db81`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you are wielding two pistols, you gain a +2 bonus to damage rolls when using the Rapid Shot feat.

### Assassin

#### Advantageous Positioning

- **Page:** 29
- **Prerequisites:** Shift
- **Quick summary:** Any opponent that you are flanking is considered flat-footed and is denied its Dexterity bonus to Reflex Defense against you.
- **Production record:** `b2b2176b7d9360e0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Any opponent that you are flanking is considered flat-footed and is denied its Dexterity bonus to Reflex Defense against you.

#### Get Some Distance

- **Page:** 29
- **Prerequisites:** Advantageous Positioning, Shift
- **Quick summary:** Once per encounter as a standard action you can make a melee attack against a target and then move your speed away from that target.
- **Production record:** `2871d6138603fbcc`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a standard action you can make a melee attack against a target and then move your speed away from that target. This movement does not provoke an attack of opportunity.

#### Murderous Arts I

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** When your successful attack causes an opponent to move -1 step along the condition track, that opponent immediately takes an additional 1d6 damage.
- **Production record:** `0d58e041b9bf0be8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When your successful attack causes an opponent to move -1 step along the condition track, that opponent immediately takes an additional 1d6 damage.

#### Murderous Arts II

- **Page:** 29
- **Prerequisites:** Murderous Arts I
- **Quick summary:** Whenever you successfully hit an opponent that you have marked, your melee and ranged attacks deal an additional die of damage.
- **Production record:** `48734ec40189bb12`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully hit an opponent that you have marked, your melee and ranged attacks deal an additional die of damage.

#### Ruthless

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, when you drop a foe to 0 hit points or push an opponent to the bottom of the condition track, you can immediately take a bonus standard action.
- **Production record:** `7aa4ca13a96d8770`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, when you drop a foe to 0 hit points or push an opponent to the bottom of the condition track, you can immediately take a bonus standard action.

#### Shift

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** As a move action, you can move 1 square without provoking an attack of opportunity.
- **Production record:** `a7cb4c0dbcdd0fb8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a move action, you can move 1 square without provoking an attack of opportunity.

#### Sniping Assassin

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** When you make a ranged attack against a target that is not at point blank range, you add half your class level to your damage roll.
- **Production record:** `6ea04b7286133846`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you make a ranged attack against a target that is not at point blank range, you add half your class level to your damage roll.

#### Sniping Marksman

- **Page:** 29
- **Prerequisites:** Sniping Assassin
- **Quick summary:** Once per encounter, when you make a ranged attack against a target that is not at point blank range, you can ignore your target's armor bonus to Reflex Defense.
- **Production record:** `28b781d7186a03a9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, when you make a ranged attack against a target that is not at point blank range, you can ignore your target's armor bonus to Reflex Defense.

#### Sniping Master

- **Page:** 29
- **Prerequisites:** Sniping Assassin, Sniping Marksman
- **Quick summary:** By taking only a single swift action, you can aim at a target that is not within point blank range.
- **Production record:** `216f5ea65b7c04fb`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

By taking only a single swift action, you can aim at a target that is not within point blank range.

### GenoHaradan

#### Deadly Repercussions

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** When you reduce a target to 0 hit points or move the target to the bottom of the condition track, all your opponents within line of sight of both you and your target take a -2 penalty on attack rolls until the beginning of your next turn.
- **Production record:** `58c3d63d94288eb2`
- **Phase 3B disposition:** `CORRECT_TREE`

**Canonical rules text**

When you reduce a target to 0 hit points or move the target to the bottom of the condition track, all your opponents within line of sight of both you and your target take a -2 penalty on attack rolls until the beginning of your next turn.

#### Manipulating Strike

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** Once per turn when you successfully damage a target with a non-area attack, make an immediate Persuasion check against the target's Will Defense.
- **Production record:** `9f01b5c07bbd5f76`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn when you successfully damage a target with a non-area attack, make an immediate Persuasion check against the target's Will Defense. If successful, you can determine what the target does with its swift action on its next turn. This is a mind-affecting effect.

#### Improved Manipulating Strike

- **Page:** 30
- **Prerequisites:** Manipulating Strike
- **Quick summary:** Whenever you successfully use the Manipulating Strike talent, you determine what the target does with its move action on its next turn.
- **Production record:** `8d14ab116a78dfd6`
- **Phase 3B disposition:** `CORRECT_TREE`

**Canonical rules text**

Whenever you successfully use the Manipulating Strike talent, you determine what the target does with its move action on its next turn. You cannot move an opponent into a hazard such as lava or off a cliff.

#### Pulling the Strings

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** As a standard action, you can make a Persuasion check against the Will Defense of a target within 12 squares.
- **Production record:** `d6faa4b87d5c35ce`
- **Phase 3B disposition:** `CORRECT_TREE`

**Canonical rules text**

As a standard action, you can make a Persuasion check against the Will Defense of a target within 12 squares. If you succeed, you move the target up to half its speed toward what you determine is the safest route, and you can make an immediate ranged or melee attack against the target if it is within your range. You cannot move an opponent into a hazard such as lava or off a cliff.

### Trickery

#### Cunning Distraction

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** When you successfully feint an opponent in combat, you can immediately move up to one-half your speed as a reaction.
- **Production record:** `3340f268613c0349`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you successfully feint an opponent in combat, you can immediately move up to one-half your speed as a reaction.

#### Damaging Deception

- **Page:** 31
- **Prerequisites:** Cunning Distraction
- **Quick summary:** As a standard action, you can make a Deception check against the Will Defense of any target within your line of sight that can see, hear, and understand you.
- **Production record:** `533867af3de50833`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can make a Deception check against the Will Defense of any target within your line of sight that can see, hear, and understand you. If successful, the next attack made by one of your allies against that target deals 2 additional dice of damage.

#### Distracting Shout

- **Page:** 31
- **Prerequisites:** Cunning Distraction
- **Quick summary:** Once per encounter, as a reaction to one of your allies being attacked, you can make a Deception check, replacing the defense score of that ally with the result of your Deception check for resolution of the attack.
- **Production record:** `6c62f35fddd45d66`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction to one of your allies being attacked, you can make a Deception check, replacing the defense score of that ally with the result of your Deception check for resolution of the attack. If any defense score is higher than the Deception check result, your ally can use that defense score instead. If the attack still hits, this does not count as the one use per encounter of this talent.

#### Improved Soft Cover

- **Page:** 31
- **Prerequisites:** Innocuous
- **Quick summary:** While you occupy a square adjacent to another creature, you can use a swift action to gain a +2 cover bonus to your Reflex Defense until the start of your next turn or until you are no longer adjacent to another creature, whichever comes first.
- **Production record:** `1681031c6828d556`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

While you occupy a square adjacent to another creature, you can use a swift action to gain a +2 cover bonus to your Reflex Defense until the start of your next turn or until you are no longer adjacent to another creature, whichever comes first.

#### Innocuous

- **Page:** 31
- **Prerequisites:** None.
- **Quick summary:** As a swift action, you can make a Deception check against a single enemy within 6 squares of you and in line of sight.
- **Production record:** `0fa7aace1d7606c6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can make a Deception check against a single enemy within 6 squares of you and in line of sight. If the check equals or exceeds the target's Will Defense, the target takes a -5 penalty on all attacks made against you until the start of your next turn.

#### Treacherous

- **Page:** 32
- **Prerequisites:** Improved Soft Cover, Innocuous
- **Quick summary:** Whenever you are attacked in combat and adjacent to a creature other than your attacker, you can move 1 square as a reaction.
- **Production record:** `e289618b92890003`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you are attacked in combat and adjacent to a creature other than your attacker, you can move 1 square as a reaction. The attack intended for you instead targets the adjacent creature, though if you move away from a creature that threatens you, it can make an attack of opportunity before the original attack is resolved.

### Piracy

#### Bloodthirsty

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** You can perform a coup de grace as a move action.
- **Production record:** `18e1fa8a911dda55`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can perform a coup de grace as a move action. Whenever you successfully perform a coup de grace action and kill the target, all allies within your line of sight gain a +2 morale bonus on attack rolls for the duration of the encounter.

#### Fight to the Death

- **Page:** 33
- **Prerequisites:** Bloodthirsty
- **Quick summary:** Once per encounter, as a swift action, you can fill your companions with renewed vigor.
- **Production record:** `ae97654ded718351`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a swift action, you can fill your companions with renewed vigor. All allies within 6 squares of you heal damage equal to your heroic level.

#### Keep Them Reeling

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** As a standard action, you can make a single melee attack against a target within reach.
- **Production target:** CREATE `9fe189e1376feec5`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

As a standard action, you can make a single melee attack against a target within reach. If the attack hits, you deal no damage, but your target must move or withdraw away from you on its next turn.

#### Raider's Frenzy

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Once per round, when one of your allies within 6 squares successfully damages a target, you grant all your allies within your line of sight a bonus to damage rolls against that target equal to one-half your class level until the end of your next turn.
- **Production record:** `37c45caffa191816`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per round, when one of your allies within 6 squares successfully damages a target, you grant all your allies within your line of sight a bonus to damage rolls against that target equal to one-half your class level until the end of your next turn.

#### Raider's Surge

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a standard action, you can make a Deception or Persuasion check, your choice, against each enemy within your line of sight.
- **Production record:** `50285aaa58fed099`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a standard action, you can make a Deception or Persuasion check, your choice, against each enemy within your line of sight. If the check result equals or exceeds the enemy's Will Defense, that enemy must withdraw on its next action or take a -1 penalty on its attack rolls until the end of the encounter. This is a mind-affecting effect.

#### Savage Reputation

- **Page:** 33
- **Prerequisites:** Bloodthirsty
- **Quick summary:** All opponents within 6 squares of you take a -1 penalty on all attacks.
- **Production record:** `994e8232ccd3847c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

All opponents within 6 squares of you take a -1 penalty on all attacks. This is a mind-affecting fear effect.

#### Take Them Alive

- **Page:** 33
- **Prerequisites:** None.
- **Quick summary:** Whenever you or any of your allies within 6 squares of you reduces a target to 0 hit points, you can choose to treat that opponent as though they had been reduced to 0 by stun damage and thus remain stable.
- **Production record:** `cf59931d6a0c0719`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you or any of your allies within 6 squares of you reduces a target to 0 hit points, you can choose to treat that opponent as though they had been reduced to 0 by stun damage and thus remain stable.

### Outlaw

#### Confounding Attack

- **Page:** 34
- **Prerequisites:** Tangle Up, Uncanny Instincts
- **Quick summary:** Once per encounter, whenever you would use Uncanny Instincts, you can forgo the movement to make an immediate melee or ranged attack against the opponent that hit you.
- **Production record:** `fd35b51c26fa0d5c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, whenever you would use Uncanny Instincts, you can forgo the movement to make an immediate melee or ranged attack against the opponent that hit you. If your attack is a melee attack that hits and deals damage, you and your opponent immediately switch places if both you and your opponent can end in a legal space.

#### Double Up

- **Page:** 35
- **Prerequisites:** Find an Opening, Seize the Moment
- **Quick summary:** Once per encounter, whenever you would use Seize the Moment, you can forgo the extra swift action to make an immediate melee or ranged attack against the damaged opponent.
- **Production record:** `3aeee38a6c7b7f12`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, whenever you would use Seize the Moment, you can forgo the extra swift action to make an immediate melee or ranged attack against the damaged opponent. If your attack is a ranged attack that hits and deals damage, you treat the damage dealt by you and your ally as though it was one attack for the purposes of overcoming DR, SR, and determining whether the damage exceeded the target's damage threshold.

#### Find an Opening

- **Page:** 35
- **Prerequisites:** Seize the Moment
- **Quick summary:** Whenever you would use Seize the Moment, you can forgo the swift action to be able to aim as a single swift action on your next turn.
- **Production record:** `3991e671da41995a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you would use Seize the Moment, you can forgo the swift action to be able to aim as a single swift action on your next turn.

#### Opportunistic Defense

- **Page:** 35
- **Prerequisites:** Uncanny Instincts
- **Quick summary:** Once per encounter, whenever you would use Uncanny Instincts, you can forgo this extra movement and instead increase your Reflex Defense by 5 until the end of your next turn.
- **Production record:** `ffdca1739d401042`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per encounter, whenever you would use Uncanny Instincts, you can forgo this extra movement and instead increase your Reflex Defense by 5 until the end of your next turn.

#### Preternatural Senses

- **Page:** 35
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a reaction, you can add one-half your class level to the defense score of your choice.
- **Production record:** `4df672d524de7aa0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction, you can add one-half your class level to the defense score of your choice.

#### Seize the Moment

- **Page:** 35
- **Prerequisites:** None.
- **Quick summary:** Once per round, whenever an ally successfully damages an opponent, you can take a swift action as a reaction.
- **Production record:** `e19c06b6dfc7a703`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per round, whenever an ally successfully damages an opponent, you can take a swift action as a reaction.

#### Tangle Up

- **Page:** 35
- **Prerequisites:** Uncanny Instincts
- **Quick summary:** As a standard action, you can make a non-area melee or ranged attack against an opponent within range.
- **Production record:** `e49c62d72e8b28d3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can make a non-area melee or ranged attack against an opponent within range. If the attack hits, you deal half your normal damage, minimum 1 point, but your opponent loses its next move action.

#### Uncanny Instincts

- **Page:** 35
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, whenever an opponent successfully deals damage to you, you can move 1 square as a reaction.
- **Production record:** `252285ae33a2a2d5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, whenever an opponent successfully deals damage to you, you can move 1 square as a reaction. This movement does not provoke attacks of opportunity.

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

## Book 2 — Clone Wars Campaign Guide

**Phase 3B status:** COMPLETE — 118 owned canonical identities; 40 UPDATE_CONTENT; 69 UPDATE_METADATA; 3 REMOVE_CONTAMINATION; 6 CREATE.

### Brawler

#### Bayonet Master

- **Page:** 26
- **Prerequisites:** Gun Club
- **Quick summary:** When you take a full attack action, you can treat a ranged weapon with a bayonet as a double melee weapon.
- **Production record:** `b6e600188cf5597f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you take a full attack action, you can treat a ranged weapon with a bayonet as a double melee weapon. You can attack with the bayonet and club a target with your ranged weapon (as with the Gun Club talent), ignoring the normal penalties for attacking with both ends of a double weapon.

#### Unrelenting Assault

- **Page:** 26
- **Prerequisites:** Melee Smash
- **Quick summary:** You launch yourself at your foe, attacking with weapons, limbs, or anything else available.
- **Production record:** `0b2c53ed53f20751`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You launch yourself at your foe, attacking with weapons, limbs, or anything else available. Whenever you miss with a melee attack or the attack is negated, you still deal your Strength bonus in damage to the target (minimum 1), or 2 x your Strength bonus if you attack with a weapon you are wielding two-handed.

### Commando

#### Keep Them at Bay

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** When you use the Aid Another Action to Suppress an Enemy, that enemy takes a -5 penalty on its next attack instead of the normal -2 penalty.
- **Production record:** `ff3b4c48d0a05a16`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you use the Aid Another Action to Suppress an Enemy, that enemy takes a -5 penalty on its next attack instead of the normal -2 penalty. Only 1 character may gain the benefits of this Talent against a given target at a time.

### Expert Pilot

#### Renowned Pilot

- **Page:** 39
- **Prerequisites:** None.
- **Quick summary:** Your reputation as a skilled pilot precedes you and bolsters the resolve of your allies. All allies within 6 squares of a Vehicle you Pilot can reroll one Pilot check, keeping the better of the two results.
- **Production record:** `38e64db2b516759a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your reputation as a skilled pilot precedes you and bolsters the resolve of your allies. All allies within 6 squares of a Vehicle you Pilot can reroll one Pilot check, keeping the better of the two results.

Once an ally has used this ability, that same ally cannot gain this Talent's benefit during the same encounter.

### Force Item

#### Focused Force Talisman

- **Page:** 40
- **Prerequisites:** Force Talisman
- **Quick summary:** Bind one Force power to a talisman; after activating it, spend a Force Point to immediately return that spent power to your suite.
- **Production record:** `12eea831f06c45f7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you create a Force talisman, you can select a single Force power from your Force suite. Whenever you are wearing this talisman and activate the selected Force power, you can spend a Force Point to immediately regain that spent power, adding it to your Force suite.

#### Greater Focused Force Talisman

- **Page:** 40
- **Prerequisites:** Force Talisman, Focused Force Talisman
- **Quick summary:** As the Focused Force Talisman Talent, except that a Force Point spent to immediately recover the selected Force Power does not count against the "one per turn" restriction on spending Force Points.
- **Production record:** `4ae840aaa4e0eba0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As the Focused Force Talisman Talent, except that a Force Point spent to immediately recover the selected Force Power does not count against the "one per turn" restriction on spending Force Points.

### Gunslinger

#### Blind Shot

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** You ignore the penalties on your ranged attack rolls when a target has Concealment or Total Concealment.
- **Production record:** `bb484bdbc96c96ad`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You ignore the penalties on your ranged attack rolls when a target has Concealment or Total Concealment.

### Jedi Consular

#### Consular's Vitality

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** Once per round as a Swift Action, grant an ally Bonus Hit Points equal to 5 + your Charisma modifier; take -5 on UTF until your next turn.
- **Production record:** `c87b8389c8ca6ea9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Jedi during the Clone Wars learn to call upon the Force not only for their own strength but also to aid the clone troopers and other allies under their command. Once per round as a swift action, you grant one ally within 12 squares of you (and in your line of sight) bonus hit points equal to 5 + your Charisma modifier. These bonus hit points last until the beginning of your next turn (at which point any remaining bonus hit points are lost), and any damage dealt to that ally comes out of bonus hit points first. You take a -5 penalty on all Use the Force checks until the beginning of your next turn.

#### Improved Consular's Vitality

- **Page:** 21
- **Prerequisites:** Consular's Vitality
- **Quick summary:** Whenever you damage a target with a successful Lightsaber attack, you may use the Consular's Vitality Talent as a Free Action instead of a Swift Action until the start of your next turn.
- **Production record:** `3d3806bd03110ee8`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you damage a target with a successful Lightsaber attack, you may use the Consular's Vitality Talent as a Free Action instead of a Swift Action until the start of your next turn.

### Jedi Guardian

#### Exposing Strike

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** When you use a Lightsaber to deal damage to a target, you can spend a Force Point to make that target Flat-Footed until the end of your next turn.
- **Production record:** `2afe84b999aa1c43`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you use a Lightsaber to deal damage to a target, you can spend a Force Point to make that target Flat-Footed until the end of your next turn.

#### Guardian Strike

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** Whenever you use a Lightsaber to deal damage to a target, that target takes a -2 penalty on attack rolls against any target other than you until the beginning of your next turn.
- **Production record:** `f15b54aeaaa5c578`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you use a Lightsaber to deal damage to a target, that target takes a -2 penalty on attack rolls against any target other than you until the beginning of your next turn.

### Jedi Sentinel

#### Sentinel's Observation

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** If you have Concealment against a target, you gain a +2 circumstance bonus on attack rolls against that target.
- **Production record:** `da672f7b558a75ba`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you have Concealment against a target, you gain a +2 circumstance bonus on attack rolls against that target.

#### Unseen Eyes

- **Page:** 21
- **Prerequisites:** Clear Mind, Force Haze
- **Quick summary:** Whenever you use the Force Haze Talent, allies hidden by the Force Haze can reroll any Perception check, keeping the better of the two results.
- **Production record:** `f6a7cb3c07ded492`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you use the Force Haze Talent, allies hidden by the Force Haze can reroll any Perception check, keeping the better of the two results. Additionally, allies hidden by the Force Haze gain a +2 bonus on all damage rolls against foes that are unaware of them.

### Military Tactics

#### Exploit Weakness

- **Page:** 42
- **Prerequisites:** Assault Tactics
- **Quick summary:** When you use the Assault Tactics Talent on an enemy, the target takes a cumulative -1 penalty to its Reflex Defense each time it is damaged by one of your allies (maximum -5 penalty).
- **Production record:** `8ba50ebccb1f938e`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you use the Assault Tactics Talent on an enemy, the target takes a cumulative -1 penalty to its Reflex Defense each time it is damaged by one of your allies (maximum -5 penalty). This penalty applies until the end of your next turn.

#### Grand Leader

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** As a Swift Action, once per encounter, you can grant bonus Hit Points equal to 5 + one-half your Character Level to allies within 20 squares of you and in your line of sight.
- **Production record:** `ce987679b604f25b`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Swift Action, once per encounter, you can grant bonus Hit Points equal to 5 + one-half your Character Level to allies within 20 squares of you and in your line of sight. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from multiple sources do not stack.

#### Uncanny Defense

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** Once per day, you can add one-half your Officer Class Level to all your Defenses for one round.
- **Production record:** `3eddc00a79422747`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per day, you can add one-half your Officer Class Level to all your Defenses for one round. You must declare that you are using this Talent at the beginning of your turn. The benefits last until the beginning of your next turn.

### Misfortune

#### Stymie

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** Swift action once per round: impose -5 on one chosen skill for a visible target within 12 squares; mind-affecting.
- **Production record:** `f16128ef7a76aa03`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per round, as a swift action, you can designate a target within 12 squares of you and in your line of sight as the target of this talent. Until the beginning of your turn, you can cause that target to take a -5 penalty on all checks made with a single skill. You must have line of sight to your target to make use of this talent, and declare which skill is to be penalized at the time this talent is activated. This is a mind-affecting effect.

### Collaborator

#### Double Agent

- **Page:** 22
- **Prerequisites:** None.
- **Quick summary:** When you roll Initiative at the beginning of combat, also roll a Deception check, comparing the result to the Will Defense of all enemies in line of sight.
- **Production record:** `35cd0efb3aae31c7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you roll Initiative at the beginning of combat, also roll a Deception check, comparing the result to the Will Defense of all enemies in line of sight. If your Deception check is successful, that target cannot attack you and does not believe you to be an enemy (though they do not consider you an ally) while this effect is active.

If you attack or otherwise obviously harm or hinder a target under the effect of this Talent, or one of that target's allies, this effect ends. This is a Mind-Affecting effect.

#### Enemy Tactics

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** Whenever an enemy within 12 squares of you and in your line of sight receives an insight or morale bonus from any source, you can also gain that bonus, subject to all the same limitations as the bonus provided to...
- **Production record:** `bb28cf47a45aff36`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever an enemy within 12 squares of you and in your line of sight receives an insight or morale bonus from any source, you can also gain that bonus, subject to all the same limitations as the bonus provided to that enemy.

#### Feed Information

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** As a Swift Action, you can grant one enemy a +1 bonus on its next attack roll made before the beginning of your next turn.
- **Production record:** `f9a2bda9b63ad191`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Swift Action, you can grant one enemy a +1 bonus on its next attack roll made before the beginning of your next turn. Additionally, until the beginning of your next turn, you can designate one ally who receives a +2 bonus on its next attack roll.

#### Friendly Fire

- **Page:** 23
- **Prerequisites:** Enemy Tactics
- **Quick summary:** If you are engaged in melee combat with an adjacent enemy and are the target of a ranged attack that misses you, compare the attack roll to the Reflex Defense of one adjacent enemy; if the attack equals or exceeds...
- **Production record:** `5cb9f0f6011a1bab`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you are engaged in melee combat with an adjacent enemy and are the target of a ranged attack that misses you, compare the attack roll to the Reflex Defense of one adjacent enemy; if the attack equals or exceeds the target's Reflex Defense, that enemy becomes the new target of the attack, which is resolved as normal.

#### Protection

- **Page:** 23
- **Prerequisites:** Double Agent
- **Quick summary:** As a standard action, you can designate one ally and make a Persuasion check, comparing the result against the Will Defense of all enemies in your line of sight who can hear and understand you.
- **Production record:** `76352a9b615287f8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can designate one ally and make a Persuasion check, comparing the result against the Will Defense of all enemies in your line of sight who can hear and understand you. If your check result equals or exceeds a target's Will Defense, that target cannot attack the ally you designated until the beginning of your next turn.

### Droid Commander

#### Automated Strike

- **Page:** 43
- **Prerequisites:** Double Attack with the chosen weapon
- **Quick summary:** Swift action and DC 15 Knowledge (tactics): droid allies gain Double Attack with one of your proficient weapon groups until your next turn ends.
- **Production target:** `6b2b31d1b90739d1`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action, you can make a DC 15 Knowledge (tactics) check. If successful, all droid allies able to hear and understand you gain the benefits of the Double Attack feat for one weapon group with which you are proficient until the end of your next turn.

#### Droid Defense

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** As a Standard Action, you can transmit tactical information to all Droid allies that can hear and understand you, granting them a bonus equal to your Intelligence modifier to one of their Defenses (your choice) until...
- **Production record:** `e5ac014e044a4afa`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Standard Action, you can transmit tactical information to all Droid allies that can hear and understand you, granting them a bonus equal to your Intelligence modifier to one of their Defenses (your choice) until the beginning of your next turn.

#### Droid Mettle

- **Page:** 43
- **Prerequisites:** Droid Defense
- **Quick summary:** Once per turn as a swift action, give one visible droid ally bonus HP equal to 10 + your class level.
- **Production target:** `e55e9497ecf6303d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action once per turn, you can designate a single droid ally within your line of sight. That droid ally gains bonus hit points equal to 10 + your class level.

#### Expanded Sensors

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** If you or any of your Droid allies has line of sight to, and is aware of, a target, all Droid allies that can hear and understand you are also considered to have line of sight (but not necessarily line of effect) to...
- **Production record:** `db14070064e54a04`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you or any of your Droid allies has line of sight to, and is aware of, a target, all Droid allies that can hear and understand you are also considered to have line of sight (but not necessarily line of effect) to that target.

#### Inspire Competence

- **Page:** 44
- **Prerequisites:** Expanded Sensors
- **Quick summary:** Swift action: give one visible droid ally half your class level as a competence bonus on its next attack before your next turn.
- **Production target:** `853d7f87a4610f85`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action once per turn, you can grant one droid ally within your line of sight a competence bonus on its next attack roll made before the start of your next turn equal to half your class level. Additionally, any droid designated as the target of your Networked Mind class feature is considered to have a heuristic processor whenever it is beneficial, even if it does not actually have a heuristic processor.

#### Maintain Focus

- **Page:** 44
- **Prerequisites:** None.
- **Quick summary:** Swift action: visible droid allies can Recover with two swift actions until your next turn begins.
- **Production target:** `1e984785c24ab9c0`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action once per turn, you can grant all droid allies within your line of sight the ability to take the Recover action as two swift actions (instead of as three swift actions) until the start of your next turn.

#### Overclocked Troops

- **Page:** 44
- **Prerequisites:** Droid Defense
- **Quick summary:** Once per turn as a swift action, let each networked droid ally immediately move up to its speed.
- **Production target:** `f09bb97395175598`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You push the limits of the droids under your command. You can spend a swift action once per turn to allow each of your networked allies to immediately move up to their speed.

#### Reinforced Commands

- **Page:** 44
- **Prerequisites:** Droid Defense
- **Quick summary:** Increase any morale or insight bonus you grant a droid ally by 1.
- **Production target:** `6bfdeeec8ccd21bb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you use an ability that grants a droid ally a morale or insight bonus, increase the value of that bonus by 1.

### Jedi Archivist

#### Direct

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** As a Standard Action, you can return one spent Force Power to the Force Power Suite of any ally within 6 squares of you and in your line of sight. The Force Power must have been spent by the ally you designate.
- **Production record:** `81154e9fc33e43b3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a Standard Action, you can return one spent Force Power to the Force Power Suite of any ally within 6 squares of you and in your line of sight. The Force Power must have been spent by the ally you designate.

#### Impart Knowledge

- **Page:** 41
- **Prerequisites:** Skilled Advisor
- **Quick summary:** You can Aid Another on the Knowledge checks of an ally within 6 squares of you as a Reaction for Knowledge skills you are Trained in.
- **Production record:** `5d682aa33468b683`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can Aid Another on the Knowledge checks of an ally within 6 squares of you as a Reaction for Knowledge skills you are Trained in.

#### Insight of the Force

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** You can make a Use the Force check in place of a Knowledge check for any Knowledge skill you are not Trained in.
- **Production record:** `0adc25cfaa35147a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can make a Use the Force check in place of a Knowledge check for any Knowledge skill you are not Trained in. You are considered Trained in that Knowledge skill for the purposes of using this Talent. If you are entitled to a Knowledge check reroll, you can reroll your Use the Force check instead (subject to the same circumstances and limitations).

#### Master Advisor

- **Page:** 41
- **Prerequisites:** Skilled Advisor
- **Quick summary:** When you use the Skilled Advisor Talent, the ally you aid gains one temporary Force Point at the end of their next turn. If the Force Point is not spent before the end of the encounter, it is lost.
- **Production record:** `e6c4f05db6ac6c06`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use the Skilled Advisor Talent, the ally you aid gains one temporary Force Point at the end of their next turn. If the Force Point is not spent before the end of the encounter, it is lost.

#### Scholarly Knowledge

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** As a Swift Action, you can reroll a Knowledge check and keep the better of the two results. This can be used with any Knowledge skill you are Trained in.
- **Production record:** `63143040b7c229a7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a Swift Action, you can reroll a Knowledge check and keep the better of the two results. This can be used with any Knowledge skill you are Trained in.

### Jedi Healer

#### Force Treatment

- **Page:** 41
- **Prerequisites:** None.
- **Quick summary:** Use Use the Force instead of Treat Injury, count as trained, and use applicable Treat Injury rerolls on the Force check.
- **Production record:** `a6ad65c1275faa33`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can make a Use the Force check in the place of a Treat Injury check. You are considered trained in the Treat Injury skill. If you are entitled to a Treat Injury check reroll, you can reroll your Use the Force check instead (subject to the same circumstances and limitations).

#### Healing Boost

- **Page:** 41
- **Prerequisites:** Vital Transfer
- **Quick summary:** When healing somebody through Vital Transfer, the amount of damage healed increases by 1 point per your Class Level.
- **Production record:** `0e6a784501100693`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When healing somebody through Vital Transfer, the amount of damage healed increases by 1 point per your Class Level.

#### Improved Healing Boost

- **Page:** 41
- **Prerequisites:** Healing Boost, Vital Transfer
- **Quick summary:** When healing somebody through Vital Transfer, the amount of damage healed increases by 2 points per your Class Level.
- **Production record:** `fb2bb5613e7edd49`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When healing somebody through Vital Transfer, the amount of damage healed increases by 2 points per your Class Level.

#### Soothe

- **Page:** 41
- **Prerequisites:** Vital Transfer
- **Quick summary:** When using Vital Transfer to heal somebody, you can move the target +1 step on the Condition Track instead of healing damage. When doing so, you move -1 step on the Condition Track.
- **Production record:** `3713870862584269`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When using Vital Transfer to heal somebody, you can move the target +1 step on the Condition Track instead of healing damage. When doing so, you move -1 step on the Condition Track.

### Loyal Protector

#### Inspire Loyalty

- **Page:** 23
- **Prerequisites:** None.
- **Quick summary:** You gain a single Follower.
- **Production record:** `6ecfeff647f8764e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a single Follower. Choose either the aggressive, defensive, or utility Follower Template for your follower, generating the follower's statistics based on the rules found in the Followers section. This Follower gains one Armor Proficiency Feat of your choice and becomes Trained in the Perception skill. The Follower must meet the prerequisites for the Armor Proficiency Feat you select.

You can select this Talent multiple times. Each time you do, you gain one additional Follower (maximum of 3 Followers).

#### Undying Loyalty

- **Page:** 23
- **Prerequisites:** Inspire Loyalty
- **Quick summary:** Each of your Followers gains the Toughness Feat.
- **Production record:** `2a209f3e58d8528c`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Each of your Followers gains the Toughness Feat.

#### Punishing Protection

- **Page:** 23
- **Prerequisites:** Inspire Loyalty, Base Attack Bonus +5
- **Quick summary:** As a Reaction to you being damaged by an attack or a Force Power, one of your followers can make an immediate melee or ranged attack against the target that attacked you.
- **Production record:** `b3590045fcd7c28c`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Reaction to you being damaged by an attack or a Force Power, one of your followers can make an immediate melee or ranged attack against the target that attacked you. Until the beginning of your next turn, any time you are damaged by an attack or Force Power, another one of your followers can attack that attacking target. This ability can be used once per encounter.

#### Protector Actions

- **Page:** 23
- **Prerequisites:** Inspire Loyalty
- **Quick summary:** Use coordinated protector actions to redirect attacks, move followers toward attackers, or penalize an enemy's attacks.
- **Production record:** `254b51a34600e2ef`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You and your Followers have learned to work together to great effect, ensuring that you remain safe while allowing them to do their duty. You can use any of the following actions on your turn:

Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range. Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal.
Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range. If that target attacks you or one of your allies before the beginning of your next turn, you can move one of your Followers up to its speed directly toward that target.
The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range. For each of your followers armed with a ranged weapon and having line of sight to the target, that target takes a -1 penalty on attack rolls until the beginning of your next turn.

### Melee Specialist

#### Accurate Blow

- **Page:** 39
- **Prerequisites:** None.
- **Quick summary:** Choose one Exotic Weapon (Melee) or one of the following Weapon Groups in which you are proficient: Advanced Melee Weapons, Lightsabers, or Simple Weapons (Melee).
- **Production record:** `32df92c3114b5c94`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Choose one Exotic Weapon (Melee) or one of the following Weapon Groups in which you are proficient: Advanced Melee Weapons, Lightsabers, or Simple Weapons (Melee). When you make a Melee Attack with a Weapon from the chosen group and the attack roll exceeds the target's Reflex Defense by 5 or more, you deal +1 die of damage with the attack.

#### Close-Quarters Fighter

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** Whenever you occupy the same square as your target or are adjacent to your target, you gain a +1 circumstance bonus to your melee attack rolls against that target.
- **Production record:** `8063a6b94b1de530`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you occupy the same square as your target or are adjacent to your target, you gain a +1 circumstance bonus to your melee attack rolls against that target.

#### Ignore Armor

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, when you make a melee attack, you can ignore any Armor or Equipment bonuses granted by your target's Armor.
- **Production record:** `dbfcec98f38c8e2f`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Once per encounter, when you make a melee attack, you can ignore any Armor or Equipment bonuses granted by your target's Armor.

#### Improved Stunning Strike

- **Page:** 40
- **Prerequisites:** Stunning Strike
- **Quick summary:** When you damage an opponent with a melee attack that moves the target down the Condition Track, the target cannot take any Action requiring a Standard Action or a Full-Round Action on its next turn.
- **Production record:** `680d3741dcaea6fe`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you damage an opponent with a melee attack that moves the target down the Condition Track, the target cannot take any Action requiring a Standard Action or a Full-Round Action on its next turn.

#### Whirling Death

- **Page:** 40
- **Prerequisites:** Melee Smash, Unrelenting Assault
- **Quick summary:** You twirl your Weapon around you in a blur, creating a circle of death around you.
- **Production record:** `98a88ebf26ac318a`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You twirl your Weapon around you in a blur, creating a circle of death around you. Any enemy target that begins its turn adjacent to you takes damage equal to your Strength bonus. You must be wielding a Melee Weapon to be using this Talent.

### Military Engineer

#### Breach Cover

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** When you fire or throw a Weapon with a Burst or Splash radius at a target with Cover, you ignore that Cover.
- **Production record:** `da891615bb87a9e6`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you fire or throw a Weapon with a Burst or Splash radius at a target with Cover, you ignore that Cover.

#### Breaching Explosive

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** You ignore the Damage Threshold of doors and walls when using Mines and fixed (non-Grenade) Explosives.
- **Production record:** `96d4cfaa29cab92b`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You ignore the Damage Threshold of doors and walls when using Mines and fixed (non-Grenade) Explosives.

#### Droid Expert

- **Page:** 45
- **Prerequisites:** Repairs on the Fly
- **Quick summary:** When you Repair a Droid, you Repair 1 additional Hit Point for each point by which your Mechanics check beats the base DC of 20.
- **Production record:** `befa9b2b15e54ff0`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you Repair a Droid, you Repair 1 additional Hit Point for each point by which your Mechanics check beats the base DC of 20.

#### Prepared Explosive

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** When you use a Mine or other fixed (non-Grenade) Explosive, you can choose to have the Burst radius of the Explosive become Difficult Terrain after the Explosive has detonated.
- **Production record:** `32029a2f0dbb7104`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you use a Mine or other fixed (non-Grenade) Explosive, you can choose to have the Burst radius of the Explosive become Difficult Terrain after the Explosive has detonated. Alternatively, if you plant a Mine or fixed Explosive in an area of Difficult Terrain, you can have the Explosive deal no damage and instead turn the Difficult Terrain into normal terrain.

#### Problem Solver

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** As a Swift Action once per turn, you can designate a single Vehicle within your line of sight whose Pilot can hear and understand you.
- **Production record:** `16f53472844251a7`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Swift Action once per turn, you can designate a single Vehicle within your line of sight whose Pilot can hear and understand you. That Pilot's Vehicle ignores Difficult Terrain until the start of your next turn, and the Pilot gains a +5 insight bonus on all Pilot checks made to avoid Hazards and Collisions until the start of your next turn.

#### Quick Modifications

- **Page:** 45
- **Prerequisites:** Repairs on the Fly, Tech Specialist
- **Quick summary:** When you create a Field-Created Weapon, you can choose one Weapon Modification from the Tech Specialist feat to apply to the created Weapon at the time of creation.
- **Production record:** `1e32cec439c5ecad`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you create a Field-Created Weapon, you can choose one Weapon Modification from the Tech Specialist feat to apply to the created Weapon at the time of creation.

#### Repairs on the Fly

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** You can use the Repair application of the Mechanics skill to Repair Droid or Repair Object as a Standard Action. You can gain the benefits of this Talent only once per day per Droid, object, or Vehicle Repaired.
- **Production record:** `16dd1c81c5145dd8`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You can use the Repair application of the Mechanics skill to Repair Droid or Repair Object as a Standard Action. You can gain the benefits of this Talent only once per day per Droid, object, or Vehicle Repaired.

#### Sabotage Device

- **Page:** 46
- **Prerequisites:** None.
- **Quick summary:** As a Swift Action, you can sabotage any object or weapon that is powered by an Energy Cell or Power Pack so that it becomes a Grenade.
- **Production record:** `fbe4b1551ef49a84`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Swift Action, you can sabotage any object or weapon that is powered by an Energy Cell or Power Pack so that it becomes a Grenade. The object or Weapon is then considered to be a Frag Grenade in all ways, but it can be turned back into its original form with another Swift Action.

#### Tech Savant

- **Page:** 46
- **Prerequisites:** Trained in Knowledge (Technology)
- **Quick summary:** As a standard action, you can increase the speed of one adjacent droid or vehicle you occupy by 1 square (applied to any method of locomotion) until the end of your next turn.
- **Production record:** `e53cad01df3f27dd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can increase the speed of one adjacent droid or vehicle you occupy by 1 square (applied to any method of locomotion) until the end of your next turn.

#### Vehicular Boost

- **Page:** 46
- **Prerequisites:** None.
- **Quick summary:** As a Standard Action, you can make a DC 15 Mechanics check to grant one Vehicle you occupy a number of Bonus Hit Points equal to 5 x your Class Level.
- **Production record:** `856812052aa6c6d2`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Standard Action, you can make a DC 15 Mechanics check to grant one Vehicle you occupy a number of Bonus Hit Points equal to 5 x your Class Level. Damage is subtracted from the Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from multiple sources do not stack.

### Opportunist

#### Advantageous Opening

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** When an enemy or ally in your line of sight rolls a Natural 1 on an attack roll, you can make a melee or ranged attack against a single target within Range.
- **Production record:** `c2403caee49be74b`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When an enemy or ally in your line of sight rolls a Natural 1 on an attack roll, you can make a melee or ranged attack against a single target within Range.

#### Retribution

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** When a target moves one of your allies in your line of sight down the Condition Track by any means, you gain a +2 insight bonus to your attack rolls against that target until the end of your next turn.
- **Production record:** `dd6b66af4a67b0a3`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When a target moves one of your allies in your line of sight down the Condition Track by any means, you gain a +2 insight bonus to your attack rolls against that target until the end of your next turn.

#### Slip By

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** When you damage an opponent, you may move through that opponent’s square; attacks of opportunity apply as normal.
- **Production record:** `893c4fd12df55469`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you damage a target, until the beginning of your next turn, you can move through that target's space. Moving through the target's space might still provoke attacks of opportunity as normal, and you must end your movement in a legal space.

#### Thrive on Chaos

- **Page:** 24
- **Prerequisites:** Advantageous Opening
- **Quick summary:** When an enemy or ally within 20 squares of you is reduced to 0 Hit Points, you gain Bonus Hit Points equal to 5 + one-half your Character Level.
- **Production record:** `4bdb0bda258c609e`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When an enemy or ally within 20 squares of you is reduced to 0 Hit Points, you gain Bonus Hit Points equal to 5 + one-half your Character Level. Damage is subtracted from Bonus Hit Points first, and any Bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points do not stack.

#### Vindication

- **Page:** 24
- **Prerequisites:** Retribution
- **Quick summary:** When an enemy you have damaged is reduced to 0 Hit Points or moved to the bottom of the Condition Track, your next attack made before the end of the encounter deals +1 die of damage.
- **Production record:** `a3ab3f2ad47c8775`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When an enemy you have damaged is reduced to 0 Hit Points or moved to the bottom of the Condition Track, your next attack made before the end of the encounter deals +1 die of damage.

### Reconnaissance

#### Reconnaissance Team Leader

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** You gain a single Follower.
- **Production record:** `ff3c38adbb101622`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a single Follower. Choose either the Aggressive, Defensive, or Utility Follower Template for your Follower, generating the follower's statistics using the Followers rules. This Follower gains the Skill Training (Perception) and Skill Training (Stealth) Feats. Additionally, whenever you use the Stealth skill, all your Followers can also make Stealth checks as a part of the same Action if they are able to.

You can select this Talent up to three times. Each time you do, you gain one additional Follower.

#### Close-Combat Assault

- **Page:** 25
- **Prerequisites:** Reconnaissance Team Leader
- **Quick summary:** Each of your Followers gains the Point-Blank Shot Feat.
- **Production record:** `84a9654b80238daf`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Each of your Followers gains the Point-Blank Shot Feat.

#### Get Into Position

- **Page:** 25
- **Prerequisites:** Base attack bonus +5, Reconnaissance Team Leader
- **Quick summary:** As a Move Action, you can cause one of your Followers to move up to his or her speed +2 squares.
- **Production record:** `510541d890629be0`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Move Action, you can cause one of your Followers to move up to his or her speed +2 squares.

#### Reconnaissance Actions

- **Page:** 25
- **Prerequisites:** Reconnaissance Team Leader
- **Quick summary:** Use reconnaissance-team actions to grant attack, Stealth, or Perception bonuses based on armed followers with line of sight.
- **Production record:** `cf16d7c9bb7a70ad`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You and your reconnaissance team have learned to work together as a cohesive unit and have an established set of tactics, which you have practiced to perfection. You can use any of the following actions on your turn:

Forward Scouting: As a Standard Action, you can make a melee or ranged attack against a target in Range. For each of your Followers armed with a ranged weapon who has line of sight to your target, you can grant one ally a +2 insight bonus on attack rolls against the target until the end of your next turn. Thus, if you have multiple armed Followers with line of sight to the target, you can grant the +2 bonus to multiple allies.
Group Sniping: As a Standard Action, you can make a melee or ranged attack against a target in Range. For each of your Followers armed with a ranged weapon who has line of sight to your target, you and each of your followers gains a +1 circumstance bonus to Stealth checks until the end of your next turn.
Sweep the Area: As a Standard Action, you can make a melee or ranged attack against a target in Range. For each of your Followers armed with a ranged weapon who has line of sight to your target, you and each of your Followers gains a +1 circumstance bonus on Perception checks until the end of your next turn.

### Republic Commando

#### Ambush

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** If you hit an opponent that has not yet acted, add +2 dice of damage.
- **Production record:** `c5996de1e3c69c04`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you successfully hit an opponent that has not yet acted in combat, you deal +2 dice of damage with the attack.

#### Higher Yield

- **Page:** 40
- **Prerequisites:** Trained in the Demolitions skill
- **Quick summary:** Once per encounter, add +1 damage die with one grenade or other explosive.
- **Production record:** `fb003bc00401f0b7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can choose to deal +1 die of damage with a single grenade or other explosive.

#### Rapid Reload

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** You can retrieve a stored Energy Cell or Power Pack and reload your Weapon as a single Swift Action.
- **Production record:** `f8922fbb1ac0b6d3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can retrieve a stored energy cell and reload your weapon as a single swift action.

#### Shoulder to Shoulder

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** Whenever you begin your turn adjacent to an ally, you gain a number of bonus Hit Points equal to your Heroic Level.
- **Production record:** `b2a9f60d6647fcc4`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you begin your turn adjacent to an ally, you gain a number of bonus Hit Points equal to your Heroic Level. Damage is subtracted from the bonus Hit Points first, and any bonus Hit Points remaining at the end of the encounter go away. Bonus Hit Points from various sources do not stack.

#### Strength in Numbers

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** If you are within 10 squares of an ally, you can add +2 to your Damage Reduction.
- **Production record:** `22674c41b3d185be`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you are within 10 squares of an ally, you can add +2 to your Damage Reduction.

#### Weapon Shift

- **Page:** 40
- **Prerequisites:** Gun Club
- **Quick summary:** If you use a Ranged Weapon as a Melee Weapon (as with the Gun Club Talent), you gain a +2 bonus to melee attack rolls with that Weapon.
- **Production record:** `032242fb87215e06`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you use a Ranged Weapon as a Melee Weapon (as with the Gun Club Talent), you gain a +2 bonus to melee attack rolls with that Weapon.

### Squad Leader

#### Commanding Officer

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** You gain a single Follower.
- **Production record:** `bd34fd5bbc4a14fb`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a single Follower. Choose either the Aggressive, Defensive, or Utility Follower Template for your Follower, generating the follower's statistics using the rules found in the Followers page. This Follower gains one Armor Proficiency Feat of your choice and Weapon Proficiency (Rifles), in addition to those provided by the Follower Templates. The Follower must meet the prerequisites for the Armor Proficiency Feat you select.

You can select this Talent multiple times. Each time you do, you gain one additional Follower (maximum of three Followers).

#### Coordinated Tactics

- **Page:** 26
- **Prerequisites:** Commanding Officer
- **Quick summary:** Each of your Followers gains the Coordinated Attack Feat, provided he or she meets the prerequisite. If your Follower later meets the prerequisite for the Feat, they gain the Feat at that time.
- **Production record:** `4559e2e975f552fa`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Each of your Followers gains the Coordinated Attack Feat, provided he or she meets the prerequisite. If your Follower later meets the prerequisite for the Feat, they gain the Feat at that time.

#### Fire at Will

- **Page:** 26
- **Prerequisites:** Commanding Officer, Base Attack Bonus +5
- **Quick summary:** As a Full-Round Action, you and one of your Followers can make a ranged attack against one target (each) in line of sight. You each take a -5 penalty to your attack rolls.
- **Production record:** `fa113b33ac66c3b9`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Full-Round Action, you and one of your Followers can make a ranged attack against one target (each) in line of sight. You each take a -5 penalty to your attack rolls.

#### Squad Actions

- **Page:** 26
- **Prerequisites:** Commanding Officer
- **Quick summary:** Use coordinated squad actions to widen autofire, add follower-based damage, or gain follower-based attack bonuses.
- **Production record:** `a4fca56a9a3853a6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You and your squad have learned to work together as a team, and have an established set of tactics that you have practiced to perfection. You can use any of the following Actions on your turn.

Autofire Barrage: As a Standard Action, you can make an Autofire attack against legal target spaces. For each of your Followers who is armed with a ranged Weapon set on Autofire and has a line of sight to the area targeted by your Autofire, you can designate one additional square as targeted by your Autofire (that square must be adjacent to your original target area).
Open Fire: As a Standard Action, make a ranged attack against a single target. For each of your Followers who is armed with a ranged Weapon and has a line of sight to the target, add +2 to your damage roll on a successful hit.
Painted Target: As a Standard Action, make a ranged attack against a single target. You gain a competence bonus on your attack roll equal to the number of your Followers who are armed with a ranged Weapon and have line of sight to the target. Thus, if you have three armed Followers with line of sight to the target, you gain a +3 competence bonus on your attack roll.

### Surveillance

#### Advanced Intel

- **Page:** 25
- **Prerequisites:** Spotter
- **Quick summary:** If you are not Surprised at the beginning of combat, you can use the Spotter talent as a Free Action on your first turn, including during the Surprise Round.
- **Production record:** `b48e17b423ae8300`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you are not Surprised at the beginning of combat, you can use the Spotter talent as a Free Action on your first turn, including during the Surprise Round.

#### Hidden Eyes

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** If you have Concealment from a target, you gain a +5 circumstance bonus on all Perception checks made against that target.
- **Production record:** `792ee3a45bf6f002`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you have Concealment from a target, you gain a +5 circumstance bonus on all Perception checks made against that target.

#### Hunt the Hunter

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** When you use a Standard Action to actively look for hidden enemies, you can make a single melee or ranged attack against any one enemy you notice with your Perception check.
- **Production record:** `cb018e0f620614fd`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you use a Standard Action to actively look for hidden enemies, you can make a single melee or ranged attack against any one enemy you notice with your Perception check.

#### Seek and Destroy

- **Page:** 25
- **Prerequisites:** Hidden Eyes
- **Quick summary:** If you make a Charge attack against a target that is unaware of you, that target cannot make a Perception check to notice you until after the attack is resolved, even if you move away from Cover or Concealment.
- **Production record:** `adacf682b6ccf21c`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you make a Charge attack against a target that is unaware of you, that target cannot make a Perception check to notice you until after the attack is resolved, even if you move away from Cover or Concealment.

#### Spotter

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** As a Move Action, you can make a Perception check with a DC equal to 10 + the CL of a single target enemy in your line of sight.
- **Production record:** `a8973662a2f1cf0f`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Move Action, you can make a Perception check with a DC equal to 10 + the CL of a single target enemy in your line of sight. If you succeed on the check, you and all your allies that can hear and understand you gain a +1 insight bonus on attack rolls against that target until the end of your next turn.

### Trooper

#### Comrades in Arms

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** Gain +1 circumstance on melee and ranged attacks while you are within 3 squares of an ally.
- **Production record:** `d4dcafa34cda98c2`
- **Phase 3B disposition:** `REMOVE_CONTAMINATION`

**Canonical rules text**

Whenever you are within 3 squares of an ally, you gain a +1 circumstance bonus on all melee and ranged attack rolls.

#### Focused Targeting

- **Page:** 26
- **Prerequisites:** Comrades in Arms
- **Quick summary:** When you damage a target with a melee or ranged attack, all allies within 3 squares gain a +2 bonus on damage rolls against that target until the beginning of your next turn.
- **Production record:** `6c52d837af948ca0`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When you damage a target with a melee or ranged attack, all allies within 3 squares gain a +2 bonus on damage rolls against that target until the beginning of your next turn.

#### Phalanx

- **Page:** 26
- **Prerequisites:** Watch Your Back
- **Quick summary:** If you provide soft cover to an ally within 3 squares, it becomes improved cover.
- **Production record:** `e02a3171a6862f02`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you provide soft cover to an ally within 3 squares, it becomes improved cover.

#### Stick Together

- **Page:** 26
- **Prerequisites:** Comrades in Arms
- **Quick summary:** You can spend a Move Action to activate this Talent. Until the beginning of your next turn, if an ally Moves you can immediately move up to your speed, provided you end your movement within 3 squares of that ally.
- **Production record:** `729a17e25b873f4f`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You can spend a Move Action to activate this Talent. Until the beginning of your next turn, if an ally Moves you can immediately move up to your speed, provided you end your movement within 3 squares of that ally.

#### Watch Your Back

- **Page:** 26
- **Prerequisites:** None.
- **Quick summary:** If you are adjacent to at least one ally, enemies gain no benefit from Flanking you or any adjacent allies.
- **Production record:** `a0c97d4ca8a2d34d`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you are adjacent to at least one ally, enemies gain no benefit from Flanking you or any adjacent allies.

### Vanguard

#### Enhanced Vision

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** When actively looking for hidden enemies, you can make a Perception check as a Swift Action instead of a Standard Action.
- **Production record:** `d6f62f5d8b003e14`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When actively looking for hidden enemies, you can make a Perception check as a Swift Action instead of a Standard Action.

#### Impenetrable Cover

- **Page:** 47
- **Prerequisites:** Maximize Cover
- **Quick summary:** Whenever you have Cover against a target, you gain Damage Reduction equal to your Class Level against that target until the start of your next turn, provided you still have Cover from the target at the time the...
- **Production record:** `1584c86ad48d7b81`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you have Cover against a target, you gain Damage Reduction equal to your Class Level against that target until the start of your next turn, provided you still have Cover from the target at the time the attack is made.

#### Invisible Attacker

- **Page:** 47
- **Prerequisites:** Maximize Cover
- **Quick summary:** If your target is unaware of you, your ranged attacks deal +1 die of damage against that target.
- **Production record:** `fb495a33cd53da43`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If your target is unaware of you, your ranged attacks deal +1 die of damage against that target.

#### Mark the Target

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** Whenever you damage a target with a non-Area Attack ranged attack, you may designate one ally within your line of sight as a Swift Action.
- **Production record:** `10a678b2b7e3ac0e`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you damage a target with a non-Area Attack ranged attack, you may designate one ally within your line of sight as a Swift Action. Your target is considered Flat-Footed against that ally's first attack made before the start of your next turn.

#### Maximize Cover

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** When an opponent uses the Aim Action to negate your Cover, you can make a Stealth check opposed by the attacker's Initiative check. If successful, you retain your Cover bonus.
- **Production record:** `f7b8af6b2e6b50c3`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When an opponent uses the Aim Action to negate your Cover, you can make a Stealth check opposed by the attacker's Initiative check. If successful, you retain your Cover bonus.

#### Shellshock

- **Page:** 47
- **Prerequisites:** Soften the Target
- **Quick summary:** Whenever you damage a target that is unaware of you with an Area Attack, that target is considered Flat-Footed until the start of your next turn.
- **Production record:** `f75fa286772de3e7`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you damage a target that is unaware of you with an Area Attack, that target is considered Flat-Footed until the start of your next turn.

#### Soften the Target

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** Whenever you damage a target with a ranged attack, you may designate one ally within your line of sight as a Swift Action.
- **Production record:** `148e7a10a55d6ed3`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you damage a target with a ranged attack, you may designate one ally within your line of sight as a Swift Action. The ally you designate ignores the target's Damage Reduction and Shield Rating (if any) until the start of your next turn.

#### Triangulate

- **Page:** 47
- **Prerequisites:** Enhanced Vision
- **Quick summary:** If you and at least one other ally have line of sight to and are aware of a target, you and all allies that can hear and understand you can reroll one ranged attack roll against that target, accepting the second...
- **Production record:** `bd6cbb85cf7fc8a2`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you and at least one other ally have line of sight to and are aware of a target, you and all allies that can hear and understand you can reroll one ranged attack roll against that target, accepting the second result even if it is worse. You and your allies can only gain the benefits of this Talent once per encounter.

### Alter

#### Aversion

- **Page:** 53
- **Prerequisites:** None.
- **Quick summary:** Swift action + Force Point: enemies treat squares within 2 squares of you as difficult terrain for the encounter; mind-affecting.
- **Production record:** `13cc978a8023eaa4`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can spend a Force Point to radiate an invisible aura that makes other beings want to avoid you. Until the end of the encounter, all squares within 2 squares of you are considered difficult terrain for your enemies. This is a mind-affecting effect.

### Bando Gora Captain

#### Bando Gora Surge

- **Page:** 55
- **Prerequisites:** None.
- **Quick summary:** Whenever you move up the Condition Track by any means, you gain Bonus Hit Points equal to 5 + your Heroic Level.
- **Production record:** `6cb7efd0785d4114`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you move up the Condition Track by any means, you gain Bonus Hit Points equal to 5 + your Heroic Level. Bonus Hit Points are consumed before regular Hit Points, and unused Bonus Hit Points go away at the end of the encounter. Bonus Hit Points from multiple sources do not stack.

#### Force Fighter

- **Page:** 56
- **Prerequisites:** None.
- **Quick summary:** Whenever you spend a Force Point to add to an attack roll, you heal a number of Hit Points equal to the Force Point result if the attack hits.
- **Production record:** `3684019966515ceb`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever you spend a Force Point to add to an attack roll, you heal a number of Hit Points equal to the Force Point result if the attack hits.

#### Resist Enervation

- **Page:** 56
- **Prerequisites:** None.
- **Quick summary:** Whenever an effect would move you down the Condition Track, you can spend a Force Point to negate that movement down the Condition Track.
- **Production record:** `3fa908b70c8d97a6`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever an effect would move you down the Condition Track, you can spend a Force Point to negate that movement down the Condition Track.

#### Victorious Force Mastery

- **Page:** 56
- **Prerequisites:** Force Training
- **Quick summary:** Whenever an enemy you have damaged in this encounter is reduced to 0 Hit Points, you may automatically return one spent Force Power to your Force Power Suite as a Free Action.
- **Production record:** `0742d901c13ea130`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

Whenever an enemy you have damaged in this encounter is reduced to 0 Hit Points, you may automatically return one spent Force Power to your Force Power Suite as a Free Action.

### Believer Disciple

#### Believer Intuition

- **Page:** 56
- **Prerequisites:** None.
- **Quick summary:** As a Reaction, when an opponent successfully attacks you, make a Use the Force check and compare the result to your opponent's attack roll.
- **Production record:** `3c7eff4b63880ee2`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Reaction, when an opponent successfully attacks you, make a Use the Force check and compare the result to your opponent's attack roll. If the check equals or exceeds the result of the attack roll, you can add your Charisma modifier to your Reflex Defense.

#### Defense Boost

- **Page:** 56
- **Prerequisites:** None.
- **Quick summary:** As a Swift Action, you can make a DC 15 Use the Force check.
- **Production record:** `7d4f036dbaabdd02`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Swift Action, you can make a DC 15 Use the Force check. If the check succeeds, you gain a +1 Force bonus to your Fortitude Defense until the end of the encounter. Before you make your Use the Force check, you can increase the target number to DC 20 to gain a +1 Force bonus to all your Defenses.

#### Hardiness

- **Page:** 56
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point to reduce the number of Swift Actions it takes you to move +1 step along to Condition Track by one.
- **Production record:** `038fcce2b039ece5`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You can spend a Force Point to reduce the number of Swift Actions it takes you to move +1 step along to Condition Track by one.

#### High Impact

- **Page:** 56
- **Prerequisites:** None.
- **Quick summary:** As a Swift Action, make a DC 15 Use the Force check. If your check succeeds, double your Strength bonus to the next melee damage roll you make before the end of your turn.
- **Production record:** `71bba39bd4ad95ae`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

As a Swift Action, make a DC 15 Use the Force check. If your check succeeds, double your Strength bonus to the next melee damage roll you make before the end of your turn.

#### Sith Reverence

- **Page:** 56
- **Prerequisites:** None.
- **Quick summary:** You gain a +1 morale bonus on your attack rolls while you are within 20 squares and in line of sight of an ally with a Dark Side Score equal to or greater than your own.
- **Production record:** `81b2b88df9600ca7`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You gain a +1 morale bonus on your attack rolls while you are within 20 squares and in line of sight of an ally with a Dark Side Score equal to or greater than your own.

### Control

#### The Will To Resist

- **Page:** 53
- **Prerequisites:** None.
- **Quick summary:** Once per turn, react to a Will-targeting effect with Use the Force as your Will Defense, then take -5 Use the Force until your next turn ends.
- **Production record:** `9befb5e9bce19fa0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn, as a reaction to being targeted by a Force power or other ability that targets your Will Defense, you can make a Use the Force check and replace your Will Defense with the result of the Use the Force check. After you make this check, until the end of your next turn, you take a -5 penalty on all Use the Force checks.

### Dark Side

#### Consumed by Darkness

- **Page:** 53
- **Prerequisites:** None.
- **Quick summary:** Swift action: take -5 Will Defense to gain +2 Force on attacks until the beginning of your next turn.
- **Production record:** `b4d45c6951deb889`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Sometimes your anger consumes you. As a swift action, you can take a -5 penalty to your Will Defense to gain a +2 Force bonus on attack rolls. The penalty and bonus last until the beginning of your next turn.

### Korunnai Adept

#### Akk Dog Master

- **Page:** 57
- **Prerequisites:** None.
- **Quick summary:** Gain an akk dog follower with species traits and Power Attack; your self-targeting Force powers may target it instead.
- **Production record:** `b265aa9dd35c4c5b`
- **Phase 3B disposition:** `REMOVE_CONTAMINATION`

**Canonical rules text**

You gain an akk dog follower. Choose either the aggressive, defensive, or utility follower template, and generate the akk dog follower's statistics using the rules on page 32. This follower gains the akk dog species traits and the Power Attack feat. Additionally, any Force power you activate that targets you can target your akk dog follower instead, at your discretion. An akk dog counts toward the total number of followers you have, just like followers gained from other talents.

#### Akk Dog Trainer's Actions

- **Page:** 57
- **Prerequisites:** Akk Dog Master
- **Quick summary:** Unlock three coordinated akk-dog actions: Attack in Concert, Fall Upon Prey, and Paired Maul.
- **Production record:** `ad7fd3e1a2b04c30`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You and your akk dog have bonded through the Force and can fight in concert. You can use any of the following actions on your turn.

Attack in Concert: As a standard action, you can make a melee or ranged attack against a target in range. If your akk dog follower is adjacent to the target and your attack hits, the target also takes piercing damage equal to 1d6 + the akk dog's Strength modifier. This additional damage is considered part of your attack for the purposes of resolving damage, DR, SR, and overcoming damage threshold.

Fall Upon Prey: As a standard action, you can make a melee or ranged attack against a target in range, and your akk dog can take the charge action against a target within its range. However, both you and your akk dog take a -5 penalty on your attack rolls (this replaces the bonus to attack rolls granted by the charge action).

Paired Maul: As a standard action, you can make a melee or ranged attack against a target in range. If the attack hits, your akk dog follower gains a +2 competence bonus on its next attack roll against that target.

#### Akk Dog Attack Training

- **Page:** 57
- **Prerequisites:** Akk Dog Master
- **Quick summary:** Your akk dog follower gains Powerful Charge.
- **Production record:** `ad7fd3e1a2b04c31`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your akk dog follower gains the Powerful Charge feat.

#### Protective Reaction

- **Page:** 57
- **Prerequisites:** Akk Dog Master
- **Quick summary:** When an enemy adjacent to your Akk Dog Follower targets you with an attack, that enemy provokes an Attack of Opportunity from your Akk Dog Follower.
- **Production record:** `ad7fd3e1a2b04c32`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

When an enemy adjacent to your Akk Dog Follower targets you with an attack, that enemy provokes an Attack of Opportunity from your Akk Dog Follower.

### Light Side

#### At Peace

- **Page:** 53
- **Prerequisites:** None.
- **Quick summary:** Spend a Force Point for +2 Force to all defenses until the encounter ends or you attack.
- **Production record:** `d054d594fe0ceba2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point to gain a +2 Force bonus to all defenses until the end of the encounter or until you attack, whichever comes first.

#### Attuned

- **Page:** 53
- **Prerequisites:** Focused Attack
- **Quick summary:** On a natural 20 against a target with Dark Side Score 1+, immediately activate a [light side] Force power as a free action.
- **Production record:** `bd797d3f83d0f61f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you roll a natural 20 on an attack roll against a target with a Dark Side Score of 1 or higher, you can activate a single Force power with the [light side] descriptor immediately as a free action.

#### Focused Attack

- **Page:** 53
- **Prerequisites:** None.
- **Quick summary:** Spend a Force Point to reroll an attack against a target with Dark Side Score 1+ and keep the better roll.
- **Production record:** `2fc019fa8c4108a7`
- **Phase 3B disposition:** `REMOVE_CONTAMINATION`

**Canonical rules text**

You can spend a Force Point to reroll an attack against a creature with a Dark Side Score of 1 or higher, keeping the better of the two rolls.

#### Surge of Light

- **Page:** 53
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a swift action, recover a [light side] Force power without a Force Point; each additional selection adds another use.
- **Production record:** `8223d30bfce0c14d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a swift action, you can return any Force power with the [light side] descriptor to your suite without spending a Force Point. You can select this talent multiple times. Each time you select it, you can use this talent one additional time per encounter.

### Sense

#### Heightened Awareness

- **Page:** 53
- **Prerequisites:** None.
- **Quick summary:** Spend a Force Point to add Charisma to Perception; selecting this talent again adds Charisma an additional time.
- **Production record:** `2db9534917366b8d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point to add your Charisma bonus to your Perception check. You can select this talent multiple times. Each time you select this talent, you add your Charisma bonus an additional time.

#### Psychometry

- **Page:** 53
- **Prerequisites:** Farseeing, Force Perception
- **Quick summary:** Use farseeing on a held object to perceive up to 5 years of its past per character level through its prior holder's impressions.
- **Production record:** `8ff0ec89e13b6d51`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use the farseeing Force power, you can choose to target an object you hold instead of a character or creature. You can look into the targeted object's past, up to a maximum of 5 years per your character level. Any information gained about the object's past is based on the thoughts and emotions of the person holding or carrying the object at the time you perceive, which can skew the results of the vision.

#### Shift Sense

- **Page:** 53
- **Prerequisites:** None.
- **Quick summary:** Spend a Force Point for low-light vision for 1 minute or the rest of the encounter, whichever is longer.
- **Production record:** `98d0ce77949d17cd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point to gain low-light vision for 1 minute or until the end of the encounter, whichever is longer.

## Book 11 — Knights of the Old Republic Campaign Guide

**Phase 3B status:** COMPLETE — 114 owned canonical identities; 99 UPDATE_CONTENT; 2 CORRECT_TREE; 12 CREATE; 1 IDENTITY_SPLIT; 1 reference-only publication claim.

### Jedi Consular

#### Collective Visions

- **Page:** 24
- **Prerequisites:** farseeing
- **Quick summary:** Developed by Krynda Draay, this talent is used by Jedi Covenant WatchCircles to sharpen their visions through the Force.
- **Production record:** `e5bef6ccacb51788`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Developed by Krynda Draay, this talent is used by Jedi Covenant WatchCircles to sharpen their visions through the Force. When you use farseeing or a Force power or talent that has farseeing as a prerequisite, other Force-users with farseeing in their Force-power suite can aid another (page 151 of the Saga Edition core rulebook) on your Use the Force check as a reaction if they are within 6 squares of you.

#### Visionary Attack

- **Page:** 24
- **Prerequisites:** farseeing, WatchCircle Initiate
- **Quick summary:** As a reaction, you can make a Use the Force check after you or an ally within 12 squares misses with a melee or ranged attack, removing one use of the farseeing Force power from your active suite (as though you had activated the power).
- **Production record:** `299c45ac33bf1485`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a reaction, you can make a Use the Force check after you or an ally within 12 squares misses with a melee or ranged attack, removing one use of the farseeing Force power from your active suite (as though you had activated the power). If your check result equals or exceeds the Will Defense of the target of that missed attack, the attacker can reroll the missed attack roll. This counts as using the farseeing Force power against that target, but this talent replaces the normal rules and effect of that power. Any attack can only be affected by this talent once (thus, multiple characters cannot use this talent on the same attack to allow multiple rerolls). You take a cumulative -5 penalty on Use the Force checks until the beginning of your next turn when you use this talent.

#### Visionary Defense

- **Page:** 25
- **Prerequisites:** farseeing, WatchCircle Initiate
- **Quick summary:** As a reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the farseeing Force power from your active suite (as though you had just activated the power).
- **Production record:** `153f4b3c6510023d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the farseeing Force power from your active suite (as though you had just activated the power). If your check result exceeds the Will Defense of the attacker, you grant the target of the attack a +5 Force bonus to Reflex Defense against that attack. This counts as using the farseeing Force power against the attacker, but this talent replaces the normal rules and effect of that power. Any attack can only be affected by this talent once (thus, multiple characters cannot use this talent on the same attack to allow multiple rerolls). You take a cumulative -5 penalty on Use the Force checks until the beginning of your next turn when you use this talent.

#### Renew Vision

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, you can regain all expended uses of the farseeing power as a swift action.
- **Production record:** `61302cbe9ccdea12`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can regain all expended uses of the farseeing power as a swift action.

#### WatchCircle Initiate

- **Page:** 25
- **Prerequisites:** farseeing
- **Quick summary:** As a reaction, you can make a Use the Force check (DC 15) and remove one use of the farseeing Force power from your active suite (as though you had activated the power).
- **Production record:** `ab9f1497d0b2d7c2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a reaction, you can make a Use the Force check (DC 15) and remove one use of the farseeing Force power from your active suite (as though you had activated the power). You subtract 1 from your Force Point total (this cannot be subtracted from temporary Force Points, and does not count as spending a Force Point) and add 1 to the Force Point total of an ally within line of sight. This counts as using the farseeing Force power against that target, but this talent replaces the normal rules and effect of that power.

### Jedi Guardian

#### Improved Battle Meditation

- **Page:** 25
- **Prerequisites:** Battle Meditation
- **Quick summary:** You may activate your Battle Meditation talent as a swift action instead of as a full-round action.
- **Production record:** `d6a04668587e2c03`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You may activate your Battle Meditation talent as a swift action instead of as a full-round action. The range of the Battle Meditation extends out to 12 squares. Enemies within the radius of your Battle Meditation suffer a -1 penalty to all attack rolls.

### Jedi Sentinel

#### Dark Retaliation

- **Page:** 25
- **Prerequisites:** Sentinel Strike
- **Quick summary:** Once per encounter, you can spend a Force Point to activate a Force power as a reaction to being targeted by a power with the [dark side] descriptor.
- **Production record:** `2b4ffff03274a825`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can spend a Force Point to activate a Force power as a reaction to being targeted by a power with the [dark side] descriptor.

#### Sentinel Strike

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Any time you attack a flat-footed opponent (or one who is denied its Dexterity bonus to Reflex Defense against you) with a damage-dealing Force power or attack with a lightsaber, you deal an extra 106 damage with that attack.
- **Production record:** `cf2d518039afd828`
- **Phase 3B disposition:** `CORRECT_TREE`

**Canonical rules text**

Any time you attack a flat-footed opponent (or one who is denied its Dexterity bonus to Reflex Defense against you) with a damage-dealing Force power or attack with a lightsaber, you deal an extra 106 damage with that attack. This talent does not affect Force powers with the [dark side] descriptor.

You can select this talent multiple times. Each time you select it, your Sentinel Strike damage increases by 1d6 (maximum +5d6).

#### Sentinel's Gambit

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a swift action, you can designate an adjacent enemy with a Dark Side Score of 1 or higher as the target of this talent.
- **Production record:** `df40e8294bd43fe7`
- **Phase 3B disposition:** `CORRECT_TREE`

**Canonical rules text**

Once per encounter, as a swift action, you can designate an adjacent enemy with a Dark Side Score of 1 or higher as the target of this talent. The designated enemy loses its Dexterity bonus to Reflex Defense against your attacks until the end of your next turn.

### Lightsaber Combat

#### Riposte

- **Page:** 25
- **Prerequisites:** Block, base attack bonus +5
- **Quick summary:** As a reaction once per encounter, make a lightsaber attack against a being whose attack you negate using the Block lightsaber combat talent (page 41 of the Saga Edition core rulebook).
- **Production record:** `b788095a71a47be7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a reaction once per encounter, make a lightsaber attack against a being whose attack you negate using the Block lightsaber combat talent (page 41 of the Saga Edition core rulebook). Only non-area melee attacks can be riposted in this manner; you cannot use this talent when negating the damage from melee area attacks (such as those made with the Whirlwind Attack feat).

### Influence

#### Fluster

- **Page:** 26
- **Prerequisites:** Presence, trained in Persuasion
- **Quick summary:** You get under an enemy's skin.
- **Production record:** `e6d56fb82c669b9d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You get under an enemy's skin. Once per encounter, make a Persuasion check to intimidate one creature within line of sight as a standard action. On a success, instead of the normal effect of an intimidate application of the Persuasion skill, the affected creature can take only a single swift action on its next turn. If the target is higher level than you, it gains a +5 bonus to its Will Defense against the skill check.

This is a mind-affecting effect.

#### Intimidating Defense

- **Page:** 26
- **Prerequisites:** Presence, trained in Persuasion
- **Quick summary:** Once per encounter, as a reaction, you can make a Persuasion check to intimidate one creature that has made a melee or ranged attack against you if that creature is within line of sight.
- **Production record:** `de751f28fc269c85`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction, you can make a Persuasion check to intimidate one creature that has made a melee or ranged attack against you if that creature is within line of sight. If you succeed, you impose a —5 penalty to that attack roll. If the target is higher level than you, it gains a +5 bonus to its Will Defense against the Intimidating Defense.

This is a mind-affecting effect.

### Leadership

#### Reactionary Attack

- **Page:** 26
- **Prerequisites:** Born Leader, trained in Persuasion
- **Quick summary:** Once per encounter, as a reaction to an attack made against you or an ally, you can direct an ally within 6 squares to make an immediate attack as a reaction against the attacking enemy.
- **Production record:** `bc8667e10d541cb8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction to an attack made against you or an ally, you can direct an ally within 6 squares to make an immediate attack as a reaction against the attacking enemy. The ally you choose must be capable of making an attack against the target.

### Fencing

#### Demoralizing Defense

- **Page:** 26
- **Prerequisites:** Noble Fencing Style
- **Quick summary:** As a reaction, you can designate an enemy you
- **Production record:** `4c7eb9c679ee43a8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a reaction, you can designate an enemy you

have just hit with a melee attack. The enemy takes only half damage from the attack, but takes a -5 penalty on attacks made against you until the end of your next turn.

This is a mind-affecting effect.

#### Leading Feint

- **Page:** 26
- **Prerequisites:** Noble Fencing Style
- **Quick summary:** Whenever you successfully damage an opponent with a melee attack, you can make a Deception check to feint against that target as a swift action.
- **Production record:** `d68318a928d3d5c7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you successfully damage an opponent with a melee attack, you can make a Deception check to feint against that target as a swift action. If successful, you designate an ally within 12 squares; your target is treated as flat-footed against the first attack that ally makes against your target before the beginning of your next turn.

#### Noble Fencing Style

- **Page:** 27
- **Prerequisites:** Trained in Deception and Persuasion
- **Quick summary:** This style of swordplay uses wit and force of personality to increase accuracy, taunting and distracting an opponent with feints, misdirection, and deception.
- **Production record:** `00c3231e4a4173fa`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

This style of swordplay uses wit and force of personality to increase accuracy, taunting and distracting an opponent with feints, misdirection, and deception. When using a light melee weapon or a lightsaber that you are proficient with, you can use your Charisma modifier instead of your Strength modifier on attack rolls.

#### Personal Affront

- **Page:** 27
- **Prerequisites:** Noble Fencing Style, base attack bonus +5
- **Quick summary:** Once per encounter, as a reaction, you can make a single melee attack against an adjacent enemy who just damaged you.
- **Production record:** `8b8c0f8c9d62f410`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction, you can make a single melee attack against an adjacent enemy who just damaged you.

#### Transposing Strike

- **Page:** 27
- **Prerequisites:** Noble Fencing Style, base attack bonus +5,
- **Quick summary:** When you hit a character with a melee attack, you can choose to have the attack deal only half damage and switch places with that foe.
- **Production record:** `39b5423e255e14b1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you hit a character with a melee attack, you can choose to have the attack deal only half damage and switch places with that foe. Your foe must be no more than one size category larger than you, and you must end up occupying a space that was previously occupied by your target (and vice versa) to use this talent. This movement does not provoke attacks of opportunity.

### Fortune

#### Lucky Stop

- **Page:** 27
- **Prerequisites:** Knack
- **Quick summary:** A successful hit against you is mitigated by an item you just happen to be wearing or carrying, or glances off your armor or clothing in just the right way.
- **Production record:** `a64632cafe74b864`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

A successful hit against you is mitigated by an item you just happen to be wearing or carrying, or glances off your armor or clothing in just the right way. Once per encounter, as a reaction, you can negate the damage from a single attack that would normally reduce you to 0 hit points.

### Run and Gun

#### Cheap Shot

- **Page:** 27
- **Prerequisites:** Opportunistic Strike
- **Quick summary:** Once per encounter, you can make an attack of opportunity against an opponent that takes the withdraw action to withdraw from a space threatened by one of your allies within point-blank range.
- **Production record:** `32a76fe000898f90`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can make an attack of opportunity against an opponent that takes the withdraw action to withdraw from a space threatened by one of your allies within point-blank range.

#### No Escape

- **Page:** 27
- **Prerequisites:** Opportunistic Strike
- **Quick summary:** Whenever an opponent uses the withdraw action to leave your threatened space, that opponent is considered flat-footed against you until the end of your next turn.
- **Production record:** `f0bfcfc354862328`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever an opponent uses the withdraw action to leave your threatened space, that opponent is considered flat-footed against you until the end of your next turn.

#### Opportunistic Strike

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, you can make an attack of opportunity against an opponent within point-blank range (even using a ranged weapon) if that opponent provokes an attack of opportunity from one of your allies.
- **Production record:** `93770927eba5446d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can make an attack of opportunity against an opponent within point-blank range (even using a ranged weapon) if that opponent provokes an attack of opportunity from one of your allies.

#### Slippery Strike

- **Page:** 27
- **Prerequisites:** Strike and Run
- **Quick summary:** Once per encounter, you can designate an opponent you have just damaged as a reaction; that opponent cannot make attacks of opportunity against you until the end of your next turn.
- **Production record:** `a1a905019e7f17c0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can designate an opponent you have just damaged as a reaction; that opponent cannot make attacks of opportunity against you until the end of your next turn. You may use this in conjunction with the Strike and Run talent, allowing you to benefit from both talents as a single reaction.

#### Strike and Run

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a reaction after successfully damaging an opponent with a melee or ranged attack, you can move your speed.
- **Production record:** `119725589e32a35a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction after successfully damaging an opponent with a melee or ranged attack, you can move your speed.

### Awareness

#### Weak Point

- **Page:** 28
- **Prerequisites:** Acute Senses, Keen Shot
- **Quick summary:** Once per encounter, you can use a swift action to ignore the Damage Reduction of a single target within your line of sight for the rest of your turn.
- **Production record:** `18bbce2836989fc5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can use a swift action to ignore the Damage Reduction of a single target within your line of sight for the rest of your turn.

### Hyperspace Explorer

#### Deep-Space Gambit

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, when you or a vehicle you occupy are the target of an attack roll, you can force your opponent to reroll the attack.
- **Production record:** `ae7accbdad82989e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, when you or a vehicle you occupy are the target of an attack roll, you can force your opponent to reroll the attack. The opponent must take the worse result.

#### Guidance

- **Page:** 28
- **Prerequisites:** Trained in Perception
- **Quick summary:** You know how to guide others through treacherous terrain.
- **Production record:** `54e32a12afb28906`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You know how to guide others through treacherous terrain. You may use a swift action to point out to an ally the path of least resistance to an ally within line of sight who can see, hear, and understand you. The ally ignores the effect of difficult terrain on its next turn. You may not use this talent on yourself.

#### Hidden Attacker

- **Page:** 29
- **Prerequisites:** Trained in Stealth
- **Quick summary:** Your shots seem to come from nowhere.
- **Production record:** `6315a1a7aaf758d5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your shots seem to come from nowhere. Whenever you use the snipe application of the Stealth skill, you do so as a swift action instead of a move action.

#### Hyperspace Savant

- **Page:** 29
- **Prerequisites:** Trained in Pilot
- **Quick summary:** You can substitute your Pilot skill for any Use Computer check made to astrogate or operate sensors while you are the pilot of a vehicle.
- **Production record:** `89914a75353f8810`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can substitute your Pilot skill for any Use Computer check made to astrogate or operate sensors while you are the pilot of a vehicle.

#### Vehicle Sneak

- **Page:** 29
- **Prerequisites:** Trained in Pilot
- **Quick summary:** You know how to fly and operate your vehicle in order to hide its approach visually, decrease the noise it produces, and minimize its sensor signature.
- **Production record:** `0c5026168620dbae`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You know how to fly and operate your vehicle in order to hide its approach visually, decrease the noise it produces, and minimize its sensor signature. Treat your ship as two size categories smaller when attempting Stealth checks.

### Armor Specialist

#### Shield Expert

- **Page:** 29
- **Prerequisites:** Armor Proficiency (tight)
- **Quick summary:** You are an expert in using personal shields for maximum effectiveness.
- **Production record:** `590178f76ad1b08a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are an expert in using personal shields for maximum effectiveness. Once per encounter, you can spend a swift action to regain 10 points of SR (up to the shield’s maximum) on an active personal shield.

### Brawler

#### Devastating Melee Smash

- **Page:** 29
- **Prerequisites:** Melee Smash
- **Quick summary:** Once per encounter, you can attempt a devastating melee smash.
- **Production record:** `d7e9b15e21ea1c4e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can attempt a devastating melee smash. You must declare this special melee attack before making the attack roll. If the attack roll succeeds add half your level to the damage instead of the normal +1 for Melee Smash. The damage from this talent does not stack with any damage bonus provided by the Powerful Charge feat.

### Weapon Specialist

#### Disarming Attack

- **Page:** 29
- **Prerequisites:** Improved Disarm, Intelligence 13, Weapon Specialization with the chosen weapon
- **Quick summary:** Choose a single exotic weapon or weapon group with which you are proficient.
- **Production record:** `456a0aa44da5105c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Choose a single exotic weapon or weapon group with which you are proficient. You ignore a target's armor bonus to Reflex Defense when disarming with such a weapon. Additionally, as a free action, once per encounter, you can grant yourself a +10 bonus on your attack roll when attempting to disarm an opponent while using such a weapon.

### Rocket Jumper

#### Burning Assault

- **Page:** 30
- **Prerequisites:** Jet Pack Training
- **Quick summary:** As a standard action you can expend one of your jet pack’s charges to make an attack with the jet pack, treating it as a flame thrower (see page 128 of the Saga Edition core rulebook).
- **Production record:** `be617461ca46a5ad`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action you can expend one of your jet pack’s charges to make an attack with the jet pack, treating it as a flame thrower (see page 128 of the Saga Edition core rulebook). You cannot use this talent when you are flying. You are considered proficient in the flame thrower for the purpose of making this attack.

#### Improved Trajectory

- **Page:** 30
- **Prerequisites:** Jet Pack Training
- **Quick summary:** You always use the proper trajectories to maximize efficiency of your rocket-pack burn rates.
- **Production record:** `f96f1d48cf6604c2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You always use the proper trajectories to maximize efficiency of your rocket-pack burn rates. You increase your fly speed by 2 squares when using a jet pack.

#### Jet Pack Training

- **Page:** 30
- **Prerequisites:** None.
- **Quick summary:** You can activate a jet pack as a free action on your turn.
- **Production record:** `d3a642f2ceb21ed4`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can activate a jet pack as a free action on your turn. You need not make Pilot checks to land safely with a jet pack.

#### Jet Pack Withdraw

- **Page:** 30
- **Prerequisites:** Jet Pack Training
- **Quick summary:** Once per encounter, as a reaction when an opponent moves adjacent to you, you can expend one charge of your jet pack to fly and move your speed or withdraw.
- **Production record:** `4c23c64e3ab8dcc6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction when an opponent moves adjacent to you, you can expend one charge of your jet pack to fly and move your speed or withdraw.

### Mandalorian Warrior

#### Armored Mandalorian

- **Page:** 38
- **Prerequisites:** Dexterity 13, Mandalorian Glory, proficient in armor worn
- **Quick summary:** Mandalorians wear armor constantly and learn to adjust to take an impact on the strongest section of their armor.
- **Production record:** `c3b22fdc6ca5af8e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Mandalorians wear armor constantly and learn to adjust to take an impact on the strongest section of their armor. You add your armor’s Fortitude Defense bonus as an equipment bonus to your elite trooper damage reduction (with a maximum bonus equal to your base elite trooper DR). Additionally, if a lightsaber does not ignore the DR of the armor you are wearing (such as cortosis weave/phrik alloy armor),

a lightsaber does not ignore your damage reduction.

#### Mandalorian Advance

- **Page:** 38
- **Prerequisites:** None.
- **Quick summary:** Veteran Mandalorians know how to move on the battlefield.
- **Production record:** `e97df0daa156338c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Veteran Mandalorians know how to move on the battlefield. Once per encounter, on your turn, you can move up to your speed as a free action before any other action.

#### Mandalorian Ferocity

- **Page:** 38
- **Prerequisites:** Dexterity 13, proficient in selected exotic weapon or weapon group
- **Quick summary:** Mandalorians can be ferocious fighters.
- **Production record:** `9d1c806bdee12411`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Mandalorians can be ferocious fighters. Select one weapon group or exotic weapon you are proficient with. Once per encounter, when making more than one attack in a round, you can add one damage die to each successful hit with the selected weapon group or exotic weapon. You can take this talent more than once, selecting a different weapon group each time.

#### Mandalorian Glory

- **Page:** 38
- **Prerequisites:** None.
- **Quick summary:** Above everything else, Mandalorians fight for glory in battle.
- **Production record:** `2ed2cffbd702c1c3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Above everything else, Mandalorians fight for glory in battle. Once per encounter, when you reduce an opponent's hit points to 0, you gain a +5 attack bonus with your next attack during the same encounter.

### Force Item

#### Primitive Block

- **Page:** 38
- **Prerequisites:** Enpower Weapon
- **Quick summary:** As a reaction, you may negate a melee attack by making a successful Use the Force check.
- **Production record:** `d043a3c0494345ac`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a reaction, you may negate a melee attack by making a successful Use the Force check. The DC of the skill check is equal to the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force checks to use this talent for every time you have used Primitive Block since the beginning of your last turn. You must have a weapon you have empowered drawn to use this talent, and you must be aware of the attack and not flat-footed. You may spend a Force Point to use this talent to negate an attack against an adjacent character.

You may use the Primitive Block talent to negate melee area attacks, such as those made by the Whirlwind Attack feat. If you succeed on the Use the Force check, you take half damage if the attack hits and no damage if the attack misses.

#### Force Throw

- **Page:** 38
- **Prerequisites:** Empower Weapon
- **Quick summary:** You can hurl a simple or advanced melee weapon your size or smaller as a standard action, treating it as a thrown weapon.
- **Production record:** `86565bbe8b8fd1a2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can hurl a simple or advanced melee weapon your size or smaller as a standard action, treating it as a thrown weapon. You are considered proficient with the thrown weapon. The thrown weapon deals normal weapon damage if it hits. If the weapon deals piercing or slashing damage, it becomes embedded in your target, remaining there and causing an additional die of damage each round at the end of the target's turn, and also when it is removed (removing the embedded weapon is a swift action and an adjacent ally can remove the embedded weapon for you). Your target must be within 6 squares of you. The weapon does not automatically return to you, but you can retrieve it with move object (dealing an additional die of damage in the process, if the weapon is embedded in the target, as above).

### Gunslinger

#### Mobile Attack (pistols)

- **Page:** 39
- **Prerequisites:** Multiattack Proficiency (pistols), Dual Weapon Mastery I, Weapon Focus (pistols)
- **Quick summary:** Immediately after making a full attack where you attack with two pistols, you may move up to your speed as a free action.
- **Production record:** `855d544f08e54afc`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Immediately after making a full attack where you attack with two pistols, you may move up to your speed as a free action.

### Duelist

#### Improved Riposte

- **Page:** 39
- **Prerequisites:** Block, Riposte
- **Quick summary:** Once per turn, when you successfully make a riposte attack using the Riposte talent, you do not count the Block use that triggered the riposte (thus, you take no cumulative penalty to Use the Force checks from that Block attempt).
- **Production record:** `91c910b9c46a8649`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn, when you successfully make a riposte attack using the Riposte talent, you do not count the Block use that triggered the riposte (thus, you take no cumulative penalty to Use the Force checks from that Block attempt). Subsequent Block attempts before the beginning of your next turn impose penalties as normal.

#### Improved Redirect

- **Page:** 39
- **Prerequisites:** Deflect, Redirect Shot
- **Quick summary:** Once per turn, when you successfully redirect an attack with the Redirect Shot talent, do not count the Deflect use that triggered the redirected attack (thus, you take no cumulative penalty to Use the Force checks from that Deflect attempt).
- **Production record:** `366ac9dea2e484d3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn, when you successfully redirect an attack with the Redirect Shot talent, do not count the Deflect use that triggered the redirected attack (thus, you take no cumulative penalty to Use the Force checks from that Deflect attempt). Subsequent Deflect attempts before the beginning of your next turn impose penalties as normal.

### Jedi Battlemaster

#### Defensive Circle

- **Page:** 39
- **Prerequisites:** Battle Meditation, Block or Deflect, Jedi Battle Commander
- **Quick summary:** As a swift action, you and any allies affected by your Battle Meditation gain a +2 insight bonus to Reflex Defense, lasting as long as they are affected by Battle Meditation.
- **Production record:** `d838141fe404a9fb`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you and any allies affected by your Battle Meditation gain a +2 insight bonus to Reflex Defense, lasting as long as they are affected by Battle Meditation. Additionally, you gain a +1 bonus to your Use the Force checks to Block and Deflect (as per the talents) for each adjacent ally wielding a lightsaber.

#### Force Revive

- **Page:** 39
- **Prerequisites:** Battle Meditation, Jedi Battle Commander
- **Quick summary:** When an ally affected by your Battle Mediation is reduced to O hit points, you can spend a Force Point as a reaction, allowing that ally to take its Second Wind as a reaction immediately (though the target still falls unconscious before the Second Wind is triggered).
- **Production record:** `83dce0bf42928741`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When an ally affected by your Battle Mediation is reduced to O hit points, you can spend a Force Point as a reaction, allowing that ally to take its Second Wind as a reaction immediately (though the target still falls unconscious before the Second Wind is triggered).

#### Jedi Battle Commander

- **Page:** 39
- **Prerequisites:** Battle Meditation
- **Quick summary:** You are trained to direct Jedi in pitched battles.
- **Production record:** `57823500e878124a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are trained to direct Jedi in pitched battles. Your battle meditation grants a +2 insight bonus on attack rolls instead of the normal +1.

#### Slashing Charge

- **Page:** 39
- **Prerequisites:** Block, Riposte, Weapon Focus (lightsabers), Weapon Proficiency (lightsabers)
- **Quick summary:** Once per encounter, while making a charge, you take no cumulative penalty to Use the Force checks for each Block attempt you make during the charge.
- **Production record:** `d587fb91aedddd09`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, while making a charge, you take no cumulative penalty to Use the Force checks for each Block attempt you make during the charge. When performing slashing charge, you can apply the attack bonus granted by the charge to all Riposte attacks as well. You can declare the use of this ability after you begin the charge but before you make your first Riposte attack.

#### Mobile Attack (lightsabers)

- **Page:** 39
- **Prerequisites:** Multiattack Proficiency (lightsabers), Dual Weapon Mastery I, Weapon Focus (lightsabers)
- **Quick summary:** Immediately after making a full attack where you attack with two lightsabers (or both ends of a double-bladed lightsaber), you may move up to your speed as a free action.
- **Production record:** `eb701499ba157c6a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Immediately after making a full attack where you attack with two lightsabers (or both ends of a double-bladed lightsaber), you may move up to your speed as a free action.

### Jedi Shadow

#### Dark Deception

- **Page:** 39
- **Prerequisites:** None.
- **Quick summary:** You can cloak your intentions with a veil of anger and hate.
- **Production record:** `d1561acfdeac3d78`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can cloak your intentions with a veil of anger and hate. When another character attempts to sense you through the Force in any way, you can choose to act as though your Dark Side Score equals your Wisdom score.

Additionally, Deception is now a class skill for you.

#### Improved Sentinel Strike

- **Page:** 39
- **Prerequisites:** Sentinel Strike
- **Quick summary:** Increase the damage dice of your Sentinel Strike to d8 instead of d6.
- **Production record:** `f836070c4a153ba0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Increase the damage dice of your Sentinel Strike to d8 instead of d6.

#### Improved Sentinel's Gambit

- **Page:** 39
- **Prerequisites:** Sentinel’s Gambit
- **Quick summary:** You can use Sentinel’s Gambit an additional number of times an encounter equal to half your class level (minimum 1).
- **Production record:** `c62073de45482781`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use Sentinel’s Gambit an additional number of times an encounter equal to half your class level (minimum 1).

#### Rebuke the Dark

- **Page:** 39
- **Prerequisites:** None.
- **Quick summary:** When using the rebuke Force power against a Force power with the [dark side] descriptor, roll two dice for the rebuke attempt and take the better result.
- **Production record:** `55379010171cf765`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When using the rebuke Force power against a Force power with the [dark side] descriptor, roll two dice for the rebuke attempt and take the better result.

#### Taint of the Dark Side

- **Page:** 39
- **Prerequisites:** Dark Deception
- **Quick summary:** Add one Force power with the [dark side] descriptor to your Force suite.
- **Production record:** `3f5b1b3566f16ff5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Add one Force power with the [dark side] descriptor to your Force suite. Once per encounter you can use that Force power with the [dark side] descriptor without increasing your Dark Side Score.

### Jedi Watchman

#### Force Warning

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** Allies within 12 squares can choose to reroll their Initiative checks at the start of combat but must take the second result, even if it is worse.
- **Production record:** `0178e98b17ab2bcc`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Allies within 12 squares can choose to reroll their Initiative checks at the start of combat but must take the second result, even if it is worse. Furthermore, if any allies within 12 squares are surprised at the start of an encounter, but you are not, you can designate a number of those allies equal to your Wisdom modifier (minimum 1); those allies are no longer considered surprised and can act normally on the surprise round.

#### Improved Quick Draw (lightsabers)

- **Page:** 40
- **Prerequisites:** Quick Draw, Weapon Focus (lightsabers)
- **Quick summary:** If you are carrying a lightsaber (either in your hand or at your belt), you can draw the lightsaber, ignite it, and make a single attack during the surprise round even if you are surprised.
- **Production record:** `acb9d2dddeea7efd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you are carrying a lightsaber (either in your hand or at your belt), you can draw the lightsaber, ignite it, and make a single attack during the surprise round even if you are surprised. If you are not surprised, you can take any single action of your choice, as normal.

Additionally, once per turn you may draw and ignite a lightsaber as a free action on your turn.

#### Sheltering Stance

- **Page:** 40
- **Prerequisites:** Block or Deflect, Vigilance
- **Quick summary:** Whenever you are adjacent to an ally, you may use the Block or Deflect talents on attacks that target that ally without the need to spend a Force Point.
- **Production record:** `f541b5e57c5af27e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you are adjacent to an ally, you may use the Block or Deflect talents on attacks that target that ally without the need to spend a Force Point.

#### Vigilance

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** As a swift action you may designate one adjacent ally as the target of this talent.
- **Production record:** `abe485644b195f0b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action you may designate one adjacent ally as the target of this talent. That target gains a +1 deflection bonus to Reflex Defense as long as you remain adjacent to them. You may change the target of this talent as a swift action.

#### Watchman's Advance

- **Page:** 40
- **Prerequisites:** Force Warning
- **Quick summary:** When acting in the surprise round, you and your allies can take an extra move action.
- **Production record:** `e3927fc5314cc492`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When acting in the surprise round, you and your allies can take an extra move action. Any character can gain only one extra move action during the surprise round regardless of the number of Jedi with this talent in your group.

### Sith

#### Affliction

- **Page:** 40
- **Prerequisites:** None.
- **Quick summary:** Your Force power carries the taint of the dark side more so than even other dark side users.
- **Production record:** `776a0fa8ae532ccc`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your Force power carries the taint of the dark side more so than even other dark side users. When you damage a single opponent with one of your Force powers, that target also takes 2d6 points of Force damage at the beginning of its next turn, before taking any actions.

#### Dark Healing Field

- **Page:** 40
- **Prerequisites:** Dark Healing, Improved Dark Healing
- **Quick summary:** You can spend a Force Point to heal wounds by drawing life energy from up to three targeted creatures within 12 squares of you.
- **Production record:** `89a8c710bb68901c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point to heal wounds by drawing life energy from up to three targeted creatures within 12 squares of you. Once per encounter, make a Use the Force check. If the attack equals or exceeds a target's Fortitude Defense, the target takes 1d6 damage per class level. You heal half the total damage dealt (cumulative from all targets). If the attack fails, the targets take half damage and you heal that amount.

#### Drain Force

- **Page:** 40
- **Prerequisites:** Affliction
- **Quick summary:** Once per encounter, as a reaction when you damage a Forcesensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength and covert it to personal power, regaining one spent Force power.
- **Production record:** `2056998b5afa4e00`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a reaction when you damage a Forcesensitive opponent, the dark taint of your power allows you to sap some of the opponent's strength and covert it to personal power, regaining one spent Force power. Additionally, the target loses one Force Point.

#### Sith Alchemy

- **Page:** 41
- **Prerequisites:** Dark Side Adept, Dark Side Master
- **Quick summary:** Your knowledge of Sith sorcery allows you to imbue talismans and other objects with the power of the dark side.
- **Production target:** `eeecb3737aabf789`
- **Phase 3B disposition:** `IDENTITY_SPLIT`

**Canonical rules text**

Your knowledge of Sith sorcery allows you to imbue talismans and other objects with the power of the dark side.

Create Sith Talisman:You can spend one Force Point to imbue a portable object with the dark side, creating a Sith talisman that provides offensive strength to a Force power or lightsaber attack. Creating the talisman takes a full-round action. While you wear or carry the talisman on your person, add 1d6 to your damage with Force powers. You gain a Dark Side point when you first put on or carry a Sith talisman. You can have only one Sith talisman active at any given time, and if it is destroyed, you cannot create another one for 24 hours.

Create Sith Weapon: You can alchemically treat a properly prepared weapon to become a Sith weapon. You may spend a Force Point to imbue the weapon with the properties of the Sith alchemical weapon template (this process takes one hour to complete). See Chapter 5: Equipment and Droids for information on Sith alchemical weapons.

### Corporate Power

#### Competitive Drive

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** You are driven to compete and succeed.
- **Production record:** `53b0aa17a95ba670`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are driven to compete and succeed. Once per encounter, you can reroll any Wisdom-, Intelligence-, or Charisma-based skill check (except Use the Force) and take the better result.

#### Competitive Edge

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** When you and your allies are not surprised, you and a number of allies equal to your Charisma modifier (minimum 1) that you designate on your first turn gain the benefit of the Quick Draw feat for the remainder of the encounter.
- **Production record:** `4acfb3b5a7a402fd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you and your allies are not surprised, you and a number of allies equal to your Charisma modifier (minimum 1) that you designate on your first turn gain the benefit of the Quick Draw feat for the remainder of the encounter.

#### Corporate Clout

- **Page:** 42
- **Prerequisites:** Impose Hesitation, Wrong Decision
- **Quick summary:** You are adept at making deals that make enemies question which side they should be on.
- **Production record:** `50073b86c51c52cd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are adept at making deals that make enemies question which side they should be on. Once per encounter, as a standard action, you can make a Persuasion check against the Will Defense of an enemy within line of sight. If your check equals or exceeds the target's Will Defense, the target cannot attack you for the remainder of the encounter. If your check exceeds the Will Defense by 5 or more, the target will not attack you or your allies for the remainder of the encounter, and retreats from the encounter. If your check exceeds the Will Defense by 10 or more, the target's attitude toward you is now Friendly, and the target becomes your ally for the remainder of the encounter, remaining under the control of the Gamemaster. If you or one of your allies attacks the target, the target once again becomes hostile.

lf the target is higher level than you, it gains a +5 bonus to its Will Defense.

This is a mind-affecting fear effect.

#### Impose Confusion

- **Page:** 43
- **Prerequisites:** Impose Hesitation
- **Quick summary:** Increase the area of Impose Hesitation toa 12-square cone.
- **Production record:** `d4da27798cbb18e6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Increase the area of Impose Hesitation toa 12-square cone. Also, once per encounter, after making the Persuasion check for Impose Hesitation, you can instead choose to have the targets lose a standard action on their next turn.

#### Impose Hesitation

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** As a standard action, make a Persuasion check targeting all opponents in a 6-square cone.
- **Production record:** `0fd8fc8cfae6f516`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, make a Persuasion check targeting all opponents in a 6-square cone. If you equal or exceed the target's Will Defense, the target loses a swift action on its next turn and cannot take full-round actions. This is a mind-affecting effect. Targets need to see, hear, and understand you to be affected by this attack.

#### Willful Resolve

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, you can negate the effect of a single attack roll or skill check made against you that targets your Will Defense.
- **Production record:** `f0c13c60b2e3f35b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can negate the effect of a single attack roll or skill check made against you that targets your Will Defense.

#### Wrong Decision

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** Each time you are attacked, the opponent that attacked you takes a -2 morale penalty to its Will Defense until the end of your next turn.
- **Production record:** `463ae052e705eaf3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Each time you are attacked, the opponent that attacked you takes a -2 morale penalty to its Will Defense until the end of your next turn. This penalty is not cumulative, so if a target makes multiple attacks against you it only incurs the penalty once per turn.

Executive Leadership

As aswift action, as many times an encounter equal to half your corporate agent level, you can grant an ally within line of sight a temporary boost to theirspeed, attacks, or defenses. Until the end of their turn they can gain one of the following benefits (your choice): increase base speed by 2 squares, a +2 morale bonus to attack rolls, or a +2 morale bonus to all defenses.

### Gladiatorial Combat

#### Brutal Attack

- **Page:** 44
- **Prerequisites:** Weapon Focus with the chosen weapon
- **Quick summary:** Choose a single exotic weapon or weapon group you are proficient with.
- **Production record:** `d9f47bfdde76475f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Choose a single exotic weapon or weapon group you are proficient with. Attacks with such weapons that deal damage that exceeds an opponent's damage threshold deal +1 die of damage on that attack.

You can select this talent multiple times. Each time you select this talent, it applies to a different exotic weapon or weapon group.

#### Call Out

- **Page:** 44
- **Prerequisites:** Personal Vendetta
- **Quick summary:** When you use the Personal Vendetta talent, you may designate one target of that talent to take a -5 penalty to attacks against targets other than you instead of the normal -2.
- **Production record:** `5c3036b82c047490`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use the Personal Vendetta talent, you may designate one target of that talent to take a -5 penalty to attacks against targets other than you instead of the normal -2.

#### Distracting Attack

- **Page:** 44
- **Prerequisites:** Brutal Attack with the weapon used
- **Quick summary:** When you deal damage to a target with a melee or ranged attack, compare the attack roll to the target's Will Defense.
- **Production record:** `cdf3e44536031f53`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you deal damage to a target with a melee or ranged attack, compare the attack roll to the target's Will Defense. If the attack roll also meets or exceeds the target's Will Defense, the target takes a -2 penalty to Reflex Defense until the end of your next turn.

#### Exotic Weapons Master

- **Page:** 44
- **Prerequisites:** Proficiency in at least one exotic weapon
- **Quick summary:** You treat all exotic weapons as a single weapon group (exotic weapons).
- **Production record:** `5a2dee101c2217b3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You treat all exotic weapons as a single weapon group (exotic weapons). If you already have feats that grant proficiency with or augment the use of one exotic weapon, those feats grant proficiency with or augment all exotic weapons. For example, if you already had Exotic Weapon Proficiency (shyarn) and Weapon Focus (shyarn) you now how Weapon Proficiency (exotic weapons) and Weapon Focus (exotic weapons), and the effects of both feats apply to all exotic weapons.

#### Lockdown Strike

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** When you hit a moving opponent that is one size category larger than you or smaller with an attack of opportunity, you immediately end its current movement.
- **Production record:** `c7ecd80bdcdfaaba`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you hit a moving opponent that is one size category larger than you or smaller with an attack of opportunity, you immediately end its current movement.

#### Multiattack Proficiency (exotic weapons)

- **Page:** 45
- **Prerequisites:** Exotic Weapons Master
- **Quick summary:** Whenever you make multiple attacks with exotic weapons as a full attack action, you reduce the penalty on your attack rolls by 2.
- **Production target:** `66c8f9d94547b5e6`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you make multiple attacks with exotic weapons as a full attack action, you reduce the penalty on your attack rolls by 2.

You can take this talent multiple times; each time you take this talent, you reduce the penalty on your attack rolls by an additional 2.

#### Personal Vendetta

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** As a swift action, you can taunt all enemies within 12 squares and line of sight; on their next turn, these enemies take a -2 penalty on attack rolls made against any target other than you.
- **Production record:** `bc618e6b3da78b3e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can taunt all enemies within 12 squares and line of sight; on their next turn, these enemies take a -2 penalty on attack rolls made against any target other than you.

This is a mind-affecting effect.

#### Unstoppable

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** You can sometimes shrug off the effect of debilitating attacks, Once per encounter, if you are hit by an attack that would normally knock you down the condition track, you can reduce the number of steps you move down the condition track by 1 step (to a minimum of 0).
- **Production record:** `9c0c0966b7c7c30e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can sometimes shrug off the effect of debilitating attacks, Once per encounter, if you are hit by an attack that would normally knock you down the condition track, you can reduce the number of steps you move down the condition track by 1 step (to a minimum of 0).

### Melee Duelist

#### Advantageous Strike

- **Page:** 46
- **Prerequisites:** None.
- **Quick summary:** You take advantage of your opponent's haste.
- **Production record:** `c740ed344484a2b5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You take advantage of your opponent's haste. You gain a +5 bonus on attacks of opportunity with melee weapons you are proficient with.

#### Dirty Tricks

- **Page:** 46
- **Prerequisites:** Trained in Deception
- **Quick summary:** You are not above using a few dirty tricks to win.
- **Production record:** `46ef0773cd6ef86d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are not above using a few dirty tricks to win. You can use the feint application of the Deception skill as two swift actions against an opponent you threaten.

#### Dual Weapon Flourish I

- **Page:** 46
- **Prerequisites:** Dual Weapon Mastery I, Weapon Finesse
- **Quick summary:** When wielding only two light melee weapons or two lightsabers, whenever you make a single attack as a standard action with one weapon you can make a single attack with the other weapon as a free action against the same target.
- **Production record:** `5004013069710c3e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When wielding only two light melee weapons or two lightsabers, whenever you make a single attack as a standard action with one weapon you can make a single attack with the other weapon as a free action against the same target. You apply the normal penalties for fighting with two weapons with this attack.

#### Dual Weapon Flourish II

- **Page:** 46
- **Prerequisites:** Dual Weapon Mastery I, Weapon Finesse
- **Quick summary:** When wielding only two light melee weapons or two lightsabers, whenever you make a single attack as a standard action with one weapon you can make a single attack with the other weapon as a free action against the same target.
- **Production record:** `02c69474cc7bbedd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When wielding only two light melee weapons or two lightsabers, whenever you make a single attack as a standard action with one weapon you can make a single attack with the other weapon as a free action against the same target. You apply the normal penalties for fighting with two weapons with this attack.

#### Master of Elegance

- **Page:** 46
- **Prerequisites:** Dual Weapon Flourish I or Single Weapon Flourish I, Weapon Finesse
- **Quick summary:** You may add your Dexterity bonus (instead of your Strength bonus) on damage rolls when wielding a light melee weapon.
- **Production record:** `fc986d810732ff3a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You may add your Dexterity bonus (instead of your Strength bonus) on damage rolls when wielding a light melee weapon. When you wield a light melee weapon two-handed, you may apply double your Dexterity bonus (instead of double your Strength bonus) to the damage.

#### Multiattack Proficiency (advanced melee weapons)

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** Whenever you make multiple attacks with advanced melee weapons as a full attack action, you reduce the penalty on your attack rolls by 2.
- **Production target:** `35375c6c9505e6f5`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you make multiple attacks with advanced melee weapons as a full attack action, you reduce the penalty on your attack rolls by 2.

You can take this talent multiple times; each time you take this talent, you reduce the penalty on your attack rolls by an additional 2.

#### Out of Nowhere

- **Page:** 47
- **Prerequisites:** Trained in Deception, Weapon Finesse
- **Quick summary:** Once per encounter, as a free action on your turn, you can make an attack with a light melee weapon or lightsaber after a successful feint.
- **Production record:** `f7bc7dab38c43fb5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a free action on your turn, you can make an attack with a light melee weapon or lightsaber after a successful feint.

#### Single Weapon Flourish I

- **Page:** 47
- **Prerequisites:** Double Attack (advanced melee weapons, exotic melee weapon, or lightsabers), Weapon Finesse
- **Quick summary:** When you wield only a single light melee weapon or a Single lightsaber and make a full attack, you can move up to your speed as a free action at any time during your turn.
- **Production record:** `499cfbb7489b1244`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you wield only a single light melee weapon or a Single lightsaber and make a full attack, you can move up to your speed as a free action at any time during your turn.

#### Single Weapon Flourish II

- **Page:** 47
- **Prerequisites:** Double Attack (advanced melee weapons, exotic melee weapon, or lightsabers), Master of Elegance, Single Weapon Flourish I, Weapon Finesse
- **Quick summary:** When you wield only a single light melee weapon or a single lightsaber, you can make a full attack as a standard action instead of a full-round action.
- **Production record:** `bf23bf3704382723`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you wield only a single light melee weapon or a single lightsaber, you can make a full attack as a standard action instead of a full-round action.

### Alter

#### Force Flow

- **Page:** 52
- **Prerequisites:** None.
- **Quick summary:** For reasons unknown to you, the Living Force flows through you in an irregular fashion.
- **Production record:** `b0898acb0a19a3cd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

For reasons unknown to you, the Living Force flows through you in an irregular fashion. Whenever you roll a natural 1 on an attack roll or Use the Force check, you gain one temporary Force Point. If you do not spend this Force Point before the end of the encounter, it is lost.

#### Telepathic Influence

- **Page:** 53
- **Prerequisites:** Telepathic Link, trained in Use the Force
- **Quick summary:** You naturally and unconsciously influence those who are regularly around you.
- **Production record:** `3b30ffbfc3e3270f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You naturally and unconsciously influence those who are regularly around you. Whenever you roll a natural 20 on an attack roll or Use the Force check, instead of regaining all your spent Force powers you may instead choose to grant one ally within 12 squares a temporary Force Point. If your ally does not use this temporary Force Point before the end of the encounter, it is lost.

#### Telepathic Link

- **Page:** 53
- **Prerequisites:** Trained in Use the Force
- **Quick summary:** You form an enhanced telepathic link with a willing ally with the Force Sensitivity feat as a swift action.
- **Production record:** `25dd9d9b3b66c048`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You form an enhanced telepathic link with a willing ally with the Force Sensitivity feat as a swift action. The link is maintained until you choose to remove it (no action required). As long as you remain within one kilometer or your target, you and the target can communicate telepathically as though you were speaking. Once per encounter, you may use a Force power from your target’s Force suite (if the target consents), or you may allow the target to use one of your Force powers. You may only have one telepathic link active at a time.

### Control

#### Beast Trick

- **Page:** 53
- **Prerequisites:** None.
- **Quick summary:** You can use the mind trick Force power on creatures of Intelligence 2 and lower.
- **Production record:** `6c374ec52e710f11`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the mind trick Force power on creatures of Intelligence 2 and lower. However, a beast with an Intelligence of 2 or less still cannot perform any complex action or understand complex commands it wouldn't otherwise be able to understand; an affected beast might understand “Attack those Sith troopers!” but it would not comprehend, “Break into the command center and disable the communications array."

#### Force Suppression

- **Page:** 53
- **Prerequisites:** rebuke Force power
- **Quick summary:** If you use the rebuke Force power to attempt to negate or redirect a Force power used against you but fail to overcome your opponent's Use the Force check result, you instead lessen the effect of the Force power by one step.
- **Production record:** `7fa47c5d2c33ed40`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you use the rebuke Force power to attempt to negate or redirect a Force power used against you but fail to overcome your opponent's Use the Force check result, you instead lessen the effect of the Force power by one step. For example, if an opponent attempted to use the slow Force power on you and rolled a 21, if you fail to rebuke the power you only suffer the DC 15 effect instead of the DC 20 effect. This talent only affects Force powers that have variable effects based on your opponent's Use the Force checks, and powers with static DCs without variable effects (such as Force lightning) are unaffected.

### Jal Shey

#### Action Exchange

- **Page:** 57
- **Prerequisites:** Force Delay
- **Quick summary:** Whenever you successfully use Force Delay, you grant one ally within six squares and line of sight the ability to trade a move action for another standard action on his next turn.
- **Production target:** `837af2972223104f`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you successfully use Force Delay, you grant one ally within six squares and line of sight the ability to trade a move action for another standard action on his next turn.

#### Force Delay

- **Page:** 57
- **Prerequisites:** Trained in Persuasion
- **Quick summary:** Jal Shey verbally startle opponents with a little help from the Force.
- **Production record:** `bb6511073dfb4774`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Jal Shey verbally startle opponents with a little help from the Force. Once per encounter, make a Persuasion check against the Will Defense of a target of Intelligence 3 or higher that can understand you as a reaction. If successful, the target loses its move action on its next round. If you spend a Force Point, the target loses its standard action instead.

#### Imbue Item

- **Page:** 58
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point to imbue a specially crafted weapon, item, armor, or article of clothing with the power of the Force.
- **Production target:** `5e972b61a1f9ecce`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can spend a Force Point to imbue a specially crafted weapon, item, armor, or article of clothing with the power of the Force. Imbuing the item requires a full round action. As a full-round action, the wearer of such an item can open himself to the Force, transferring one of their Force Points into the item. You can then use a swift action to spend a stored Force Point at any later time, even in the same round that you spend a Force Point of your own. You can attune only one item per 24 hours, the item functions only for you and a given item can only store one Force Point at a time. You cannot wear more than one attuned item at a time, and you can spend only up to a maximum of two Force Points in a round (one of your own plus one from an item).

#### Knowledge of the Force

- **Page:** 58
- **Prerequisites:** None.
- **Quick summary:** You can use your scholarly knowledge of the Force to help others reach their full potential.
- **Production target:** `04eca2813630e8d4`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use your scholarly knowledge of the Force to help others reach their full potential. You can spend a Force Point as a reaction to aid another ally within 6 squares on a Use the Force check, following the normal rules for the aid another action as usual.

### Keetael

#### Conceal Force Use

- **Page:** 58
- **Prerequisites:** None.
- **Quick summary:** You have learned to use the Force without telltale gestures, reducing the disturbance created in the process.
- **Production target:** `deb5ce7af3c824ff`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You have learned to use the Force without telltale gestures, reducing the disturbance created in the process. Whenever you make a Use the Force check, as a swift action you can make a Deception check to convey deceptive appearances in order to conceal the effects of your Force use. Normal modifiers for the deception’s complexity still apply.

#### Force Direction

- **Page:** 58
- **Prerequisites:** None.
- **Quick summary:** You use the Force to guide your ranged attacks to their target.
- **Production target:** `d65ad7fb7a374762`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You use the Force to guide your ranged attacks to their target. Whenever you spend a Force point to add to a ranged attack roll, you can always add +3 (or +4, if you roll d8s for Force Points) instead of rolling the die.

#### Force Momentum

- **Page:** 58
- **Prerequisites:** None.
- **Quick summary:** You use the Force to add to the impact of your melee weapon, increasing your damage.
- **Production target:** `4cb2cf521a4d2175`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You use the Force to add to the impact of your melee weapon, increasing your damage. Whenever you spend a Force point to add to a melee attack roll, if the attack hits you can also add the Force point’s result to the damage roll.

#### Past Visions

- **Page:** 58
- **Prerequisites:** Visions
- **Quick summary:** The long-lived Draethos are particularly adept at searching and understanding the past.
- **Production target:** `462df9a631ee50f4`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

The long-lived Draethos are particularly adept at searching and understanding the past. When using farseeing to look into the past, reduce your DC numbers by half. Also, you are able to see everything within 6 squares of your target clearly without spending a Force Point.

### Krath

#### Dark Side Manipulation

- **Page:** 59
- **Prerequisites:** None.
- **Quick summary:** Your Sith sorcery experimentation has provided you with a method of manipulating the dark side.
- **Production record:** `eaaecdfd7a538975`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your Sith sorcery experimentation has provided you with a method of manipulating the dark side. Once per encounter, when using a Force Point in an act that would give you a dark side point, you may treat the Force Point as though you had rolled the maximum on the die.

#### Krath Illusions

- **Page:** 60
- **Prerequisites:** Illusion
- **Quick summary:** As a swift action, you can reduce the penalty for large illusions by one half (rounded down, minimum -1).
- **Production record:** `90820963f87dd268`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can reduce the penalty for large illusions by one half (rounded down, minimum -1).

#### Krath Intuition

- **Page:** 60
- **Prerequisites:** None.
- **Quick summary:** You have a natural ability to use dark-side artifacts, such as Sith talismans and alchemical weapons.
- **Production record:** `ed0304eebd82042b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have a natural ability to use dark-side artifacts, such as Sith talismans and alchemical weapons. Once per encounter, you may spend a Force Point to treat the damage from a Sith alchemical weapon as though you had rolled the maximum damage on the dice.

#### Krath Surge

- **Page:** 60
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, using rudimentary Sith sorcery, you channel dark side energy in a manner that boosts one use of a Force power.
- **Production record:** `ca30265867f3dcb1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, using rudimentary Sith sorcery, you channel dark side energy in a manner that boosts one use of a Force power. As a swift action, you can add 1 die of damage (if the power deals damage) or extend the range of the power by 6 squares (if it has a range beyond yourself or a single target). Using this talent automatically adds the [dark side] descriptor to the power used.

### Luka Sene

#### Field Detection

- **Page:** 60
- **Prerequisites:** Trained in Use the Force
- **Quick summary:** As a swift action, make a DC 15 Use the Force check.
- **Production record:** `700ec3d782794d11`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, make a DC 15 Use the Force check. If tne check succeeds, you can detect the presence, general strength, and origin (or direction of origin if the source is out of range) of electromagnetic and energy fields within 12 squares of you. You can also determine the type of field, allowing you to detect communications devices, sensors, and other electronic equipment. When dealing damage to a person or droid using a personal shield, or to a vehicle with shields active, a successful check allows you to detect minute fluctuations in the shield, reducing their SR by -5 against your attacks until the end of your turn.

#### Improved Force Sight

- **Page:** 60
- **Prerequisites:** Force sight species trait, trained in Use the Force
- **Quick summary:** Your natural Force sight is more precise than that of your fellow Miraluka.
- **Production target:** `38f57c9f9cd0b727`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Your natural Force sight is more precise than that of your fellow Miraluka. You can use the Search application of the Perception skill as a swift action. Additionally, you always succeed when using the Sense Surroundings application of the Use the Force skill (no roll required).

#### Luka Sene Master

- **Page:** 60
- **Prerequisites:** Field Detection, farseeing
- **Quick summary:** You are a master of Luka Sene techniques and an expert in using sense-related talents and powers.
- **Production target:** `b0427980c49cd650`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You are a master of Luka Sene techniques and an expert in using sense-related talents and powers. Once per encounter, you gain a temporary Force Point that you must spend when activating a talent from the Sense or Luka Sene talent trees, using the farseeing Force power, or on a Use the Force check made to use the Search Your Feelings or Sense Force applications of the skill. The Force Point is lost if not used before the end of the encounter.

#### Quickseeing

- **Page:** 60
- **Prerequisites:** Trained in Use the Force, farseeing
- **Quick summary:** As a free action on your turn, you can make a Use the Force check against a living creature within 12 squares, removing one use of the farseeing Force power from your active suite (as though you had activated the power).
- **Production target:** `537afb4984d1ca61`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a free action on your turn, you can make a Use the Force check against a living creature within 12 squares, removing one use of the farseeing Force power from your active suite (as though you had activated the power). If your check result equals or exceeds the Will Defense of the target you gain a +2 insight bonus on attack rolls against that target until the end of your turn. This counts as using the farseeing Force power against that target, but this talent replaces the normal rules and effect of that power.

### Order of Shasa

#### Deception Awareness

- **Page:** 61
- **Prerequisites:** None.
- **Quick summary:** Realizing how the devastating the consequences would have been if the Sith had successfully deceived her and her companions during the Jedi Civil War, Shasa has developed a technique for using the Force to detect deceptions.
- **Production record:** `4cc3f26d58c3302b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Realizing how the devastating the consequences would have been if the Sith had successfully deceived her and her companions during the Jedi Civil War, Shasa has developed a technique for using the Force to detect deceptions. You gain +5 to your Will Defense against uses of the Deception skill. Additionally, you can make a Use the Force check instead of a Perception check to sense deception and sense influence. You are considered trained in Perception for the purpose of using this talent. If you are entitled toa Perception check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations).

#### Greater Weapon Focus (Fira)

- **Page:** 61
- **Prerequisites:** Weapon Focus (fira)
- **Quick summary:** You have mastered the chosen weapon of the Order of Shasa.
- **Production record:** `f9c5c2077e398e60`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have mastered the chosen weapon of the Order of Shasa. You gain a +1 bonus on melee attack rolls with a fira. This bonus stacks with the bonus granted by the Weapon Focus feat.

#### Progenitor's Call

- **Page:** 61
- **Prerequisites:** None.
- **Quick summary:** You have learned to sense the call of your ancestors and wield it through the Force.
- **Production record:** `4ebb3a798e36afe6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have learned to sense the call of your ancestors and wield it through the Force. Once per encounter, you can telepathically disrupt an enemy by making a Use the Force check against the target's Will Defense. If you succeed, the target is confused by the call, moving -1 persistent step down the condition track and losing its standard action on its next turn. A creature can only be affected by this power once per encounter, and the persistent condition can be removed with a DC 15 Treat Injury check or by resting for 8 hours. This is a mind-affecting effect.

#### Waveform

- **Page:** 61
- **Prerequisites:** None.
- **Quick summary:** Taking cues from Manaan's oceans, you know how to emulate wave action using the Force.
- **Production record:** `29ae5a7db772d779`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Taking cues from Manaan's oceans, you know how to emulate wave action using the Force. As a swift action, when you use a telekinetic Force power (that is, a power affected by the Telekinetic Power or Telekinetic Savant talents), you manipulate the particles of the environment around you to add to the force of impact, allowing you to add your Charisma modifier to any damage dealt (minimum +1).

### Reference-only publication

- Alter — Illusion — KOTOR page 52. Canonical owner: Force Unleashed Campaign Guide. No KOTOR production mutation.

## Book 12 — Force Unleashed Campaign Guide

**Phase 3B status:** COMPLETE — 137 owned canonical identities; 107 UPDATE_CONTENT; 2 UPDATE_METADATA; 28 CREATE.

### Awareness

#### Reset Initiative

- **Page:** 28
- **Prerequisites:** Acute Senses, Improved Initiative, trained in the Initiative skill
- **Quick summary:** Scouts are highly aware of their surroundings and able to take advantage of the slightest opportunities.
- **Production record:** `97eeb67b9428f0eb`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Scouts are highly aware of their surroundings and able to take advantage of the slightest opportunities. Once per encounter, at any time after the first full round (that is, the first full round after the surprise round, if one occurs), the scout can set his Initiative to his current Initiative +5.

### Bounty Hunter

#### Fearsome

- **Page:** 42
- **Prerequisites:** Notorious
- **Quick summary:** Your reputation precedes you, striking fear in your target.
- **Production record:** `11e8f858af268e8c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your reputation precedes you, striking fear in your target. Any opponent within 6 squares whose level is equal to or less than your heroic level takes a -1 penalty on attack rolls made against you.

#### Signature Item

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** You are famous for using certain items, and you have become skilled at wielding them.
- **Production record:** `a6fa8cb695f2882c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are famous for using certain items, and you have become skilled at wielding them. You select a single weapon, suit of armor, vehicle, starship, or other item. While wielding that weapon, wearing that armor, piloting that vehicle, or otherwise using that item, you gain a +2 morale bonus on opposed skill checks. You can select this talent multiple times. Each time you do so, you choose a new object to be your signature item. The effects of multiple signature items are cumulative with one another, increasing this morale bonus by 1 each time.

#### Jedi Hunter

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** You are skilled at fighting Jedi and other Force-users.
- **Production record:** `226aea42fcdd30b0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are skilled at fighting Jedi and other Force-users. You gain a +1 insight bonus to Fortitude and Will Defense and deal +1 die of damage against characters who have the Force Sensitivity feat.

### Duelist

#### Improved Lightsaber Throw

- **Page:** 43
- **Prerequisites:** Lightsaber Throw
- **Quick summary:** You can spend a Force Point as a standard action to throw your lightsaber at a group of opponents.
- **Production record:** `705f100f5703e707`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point as a standard action to throw your lightsaber at a group of opponents. You make a single ranged attack roll (treating the lightsaber as a thrown weapon) and compare the result to the Reflex Defense of all targets in a 6-square line originating in your square. If your attack roll result exceeds a target’s Reflex Defense, you deal normal lightsaber damage to that target (dealing half damage if you fail to exceed the target’s Reflex Defense). This attack is considered an area attack. You can pull your lightsaber back to your hand as a swift action by making a DC 20 Use the Force check.

#### Thrown Lightsaber Mastery

- **Page:** 43
- **Prerequisites:** Improved Lightsaber Throw, Lightsaber Throw
- **Quick summary:** Any target successfully struck by a lightsaber you throw moves at half speed (round down) until the beginning of your next turn.
- **Production record:** `6ae9bf79e77bd8c3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Any target successfully struck by a lightsaber you throw moves at half speed (round down) until the beginning of your next turn.

### Inspiration

#### Willpower

- **Page:** 25
- **Prerequisites:** Inspire Confidence
- **Quick summary:** You can share your strength of will with your allies.
- **Production record:** `ae9cf46162b4bc42`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can share your strength of will with your allies. Once per encounter as a swift action, you can grant all allies within line of sight a +2 morale bonus to their Will Defense. This bonus lasts for the remainder of the encounter, and once it is granted your allies need not remain within line of sight with you to retain this bonus. You may not use this talent on yourself.

### Jedi Consular

#### Cleanse Mind

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** As a swift action once per turn, remove one ongoing mind-affecting effect from an allied target within line of sight.
- **Production record:** `c93a9e38c432551b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per turn as a swift action, you can remove one ongoing mind-affecting effect (such as the effects of Demand Surrender or Weaken Resolve talents, or the effect of being moved to the end of the condition track by the Adept Negotiator talent, or the ongoing effects of the mind trick Force power) from a single allied target within line of sight.

#### Force of Will

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** You gain a +2 insight bonus to Will Defense.
- **Production record:** `b3538b62448c840e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a +2 insight bonus to Will Defense. Also, as a swift action, you can spend a Force Point to give all allies within 6 squares of you a +2 insight bonus to Will Defense that lasts for the remainder of the encounter. This bonus does not extend to allies outside the range of the effect, even if they move within 6 squares of you later on. Allies who benefit from this talent must remain within 6 squares of you to retain the insight bonus, and they lose it if you are knocked unconscious or killed. This is a mind-affecting effect.

### Jedi Guardian

#### Forceful Warrior

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** When you score a critical hit with a lightsaber, you gain 1 temporary Force Point.
- **Production record:** `f4b22e32d448b703`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you score a critical hit with a lightsaber, you gain 1 temporary Force Point. If the Force Point is not used before the end of the encounter, it is lost.

#### Mobile Combatant

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** When you end your movement adjacent to an opponent, you can spend a swift action to activate this talent.
- **Production record:** `198b68c0ca770ad7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you end your movement adjacent to an opponent, you can spend a swift action to activate this talent. If the designated opponent moves or withdraws before the beginning of your next turn, you can choose to move with that opponent, up to a total distance equal to your current speed. Unless your opponent uses the withdraw action or makes an Acrobatics check to avoid attacks of opportunity, its movement provokes an attack of opportunity from you for the first square moved as normal (but not subsequent squares in the same movement). If your target moves farther than your speed, you must still end this movement closer to the target than you began.

### Jedi Sentinel

#### Dampen Presence

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** When you interact with another sentient creature, you can use a swift action to reduce the impression you leave on it.
- **Production record:** `236e5a8ef7bbcfa6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you interact with another sentient creature, you can use a swift action to reduce the impression you leave on it. When you have finished interacting with the creature, you make a Use the Force check, and if the check result exceeds the target's Will Defense, it does not remember interacting with you once you are gone. A target that is higher in level than you gains a +5 bonus to its Will Defense to resist this ability. This is a mind-affecting effect.

#### Steel Resolve

- **Page:** 24
- **Prerequisites:** None.
- **Quick summary:** When you use a standard action to make a melee attack, you can take a penalty of -1 to -5 on your attack roll and add twice that value (+2 to +10) as an insight bonus to your Will Defense.
- **Production record:** `3e18acc25d6c03db`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use a standard action to make a melee attack, you can take a penalty of -1 to -5 on your attack roll and add twice that value (+2 to +10) as an insight bonus to your Will Defense. This bonus may not exceed your base attack bonus. The changes to attack rolls and Will Defense last until the start of your next turn.

### Lineage

#### Influential Friends

- **Page:** 25
- **Prerequisites:** Connections
- **Quick summary:** You have influential contacts within a certain organization, planet, or region who can provide concrete information to you on certain subjects.
- **Production record:** `471f4294820ce5ec`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have influential contacts within a certain organization, planet, or region who can provide concrete information to you on certain subjects. Once per day, you can have one of those contacts make a skill check on your behalf. The contact always takes 20 on the skill check (even if the skill would normally not allow taking 20) and has a skill modifier equal to 5 + one-haIf your heroic level. Contacting your influential allies and receiving the benefit of the skill check takes a number of minutes equal to 10 x the skill check result.

#### Powerful Friends

- **Page:** 26
- **Prerequisites:** Connections, Influential Friends
- **Quick summary:** You have a powerful contact who has an extended sphere of influence.
- **Production record:** `62d47b8982b6591e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have a powerful contact who has an extended sphere of influence. The contact could be an Imperial Senator, a high-level military officer, a regional governor, an infamous crime lord, or another person of similar significance. Once per encounter, you can invoke the name or office of your powerful friend and take 20 on one Persuasion check, with no increase in the time needed to make the check.

### Slicer

#### Electronic Forgery

- **Page:** 27
- **Prerequisites:** Trained in the Use Computer skill
- **Quick summary:** You can use your Use Computer modifier in place of your Deception modifier to create a deceptive appearance with forged electronic documents.
- **Production record:** `319c5ded54dbc4e6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use your Use Computer modifier in place of your Deception modifier to create a deceptive appearance with forged electronic documents.

#### Electronic Sabotage

- **Page:** 27
- **Prerequisites:** Trained in the Use Computer skill
- **Quick summary:** You excel at causing havoc with computers and electronics.
- **Production record:** `0290634450ab1637`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You excel at causing havoc with computers and electronics. As a standard action, you can lock down a computer terminal by making a Use Computer check, making it potentially difficult for anyone else to access. That computer is considered unfriendly to anyone other than you who attempts to use it, and the result of your Use Computer check replaces the computer's Will Defense on an attempt to change its attitude. This effect ends if anyone else succeeds in adjusting the computer's attitude to indifferent. You cannot take 20 on this Use Computer check.

#### Security Slicer

- **Page:** 27
- **Prerequisites:** Trained in the Mechanics skill
- **Quick summary:** You are an expert in electronic security.
- **Production record:** `51ee1b777709cc4e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are an expert in electronic security. When you make a Mechanics check to disable a security system, you can do so without the help of a security kit. Additionally, something goes wrong only when you fail the Mechanics check by 10 or more.

### Advanced Medicine

#### Battlefield Medic

- **Page:** 54
- **Prerequisites:** Steady Under Pressure
- **Quick summary:** You can use the first aid application of the Treat Injury skill on a creature as a standard action instead of a full-round action.
- **Production record:** `684e15133a9cc1e2`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the first aid application of the Treat Injury skill on a creature as a standard action instead of a full-round action.

#### Bring Them Back

- **Page:** 54
- **Prerequisites:** None.
- **Quick summary:** You can use the revivify application of the Treat Injury skill on a target that has died anytime within a number of rounds equal to one-haIf your heroic level.
- **Production record:** `aeb8d3e495605f71`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the revivify application of the Treat Injury skill on a target that has died anytime within a number of rounds equal to one-haIf your heroic level.

#### Emergency Team

- **Page:** 54
- **Prerequisites:** None.
- **Quick summary:** You are skilled at working on and managing an emergency medical team.
- **Production record:** `d0c46d08ea867ae0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are skilled at working on and managing an emergency medical team. Allies automatically succeed on aid another attempts when assisting you with Treat Injury checks.

#### Extra First Aid

- **Page:** 54
- **Prerequisites:** None.
- **Quick summary:** You can use the first aid application of the Treat Injury skill one additional time per day on a target that has already received first aid for the day.
- **Production record:** `58a602ec4aa5b2dd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the first aid application of the Treat Injury skill one additional time per day on a target that has already received first aid for the day.

#### Medical Miracle

- **Page:** 54
- **Prerequisites:** None.
- **Quick summary:** As a standard action, you can make a DC 20 Treat Injury check on an adjacent target.
- **Production record:** `ddece484fcea9c84`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can make a DC 20 Treat Injury check on an adjacent target. If the check is successful, that target immediately uses its second wind, even if it is above half hit points. If the target has already expended all of its second winds for the day, this talent has no effect.

#### Natural Healing

- **Page:** 54
- **Prerequisites:** None.
- **Quick summary:** Make first aid, treat disease, and treat poison checks without a medical kit when suitable natural substitutes are available.
- **Production record:** `2c18d68d5e294dc8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your extensive knowledge of natural healing allows you to make first aid, treat disease, and treat poison (Treat Injury) checks without a medical kit, if you have access to appropriate natural substitutes (as determined by the Gamemaster).

#### Second Chance

- **Page:** 54
- **Prerequisites:** Steady Under Pressure
- **Quick summary:** If you fail your Treat Injury check, your patient does not take any additional damage, nor does it die, even if the failed check would normally require it.
- **Production record:** `c1d9d20e7789da33`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

If you fail your Treat Injury check, your patient does not take any additional damage, nor does it die, even if the failed check would normally require it.

#### Steady Under Pressure

- **Page:** 54
- **Prerequisites:** None.
- **Quick summary:** You can choose to reroll any Treat Injury check, using the better result.
- **Production record:** `ec18c61d653ce3e4`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can choose to reroll any Treat Injury check, using the better result.

### Autonomy

#### Defensive Electronics

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** You defend your independence from all.
- **Production record:** `7a2cab18b77945538426f19d662f14f9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You defend your independence from all. When someone tries to reprogram you, add your class level to your Will Defense.

#### Ion Resistance 10

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** You gain DR 10 against ion damage.
- **Production record:** `c113b29cde344fafb6aa376a843639d3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain DR 10 against ion damage.

#### Soft Reset

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** You are adept at rerouting your internal electronics.
- **Production record:** `2739921a657a49a496885c456bcace65`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are adept at rerouting your internal electronics. If you are moved to the bottom of the condition track by any means other than taking damage exceeding your damage threshold, you automatically move +1 step along the condition track after being disabled for 2 rounds.

#### Modification Specialist

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** You have become skilled at reprogramming and modifying your own systems.
- **Production record:** `cc6f40522eca4cdd90dc5a04edad0a07`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have become skilled at reprogramming and modifying your own systems. You do not incur the normal -5 penalty on Mechanics and Use Computer checks to reprogram yourself or perform self-modifications (see page 197 of the Saga Edition core rulebook).

#### Repair Self

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** When you repair yourself (using the repair droid application of the Mechanics skill), you repair 1 additional hit point for each point by which your check exceeds the DC.
- **Production record:** `177198e388ad4e3ca6fe85d3b6b399f5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you repair yourself (using the repair droid application of the Mechanics skill), you repair 1 additional hit point for each point by which your check exceeds the DC.

### Bothan Spynet

#### Bothan Resources

- **Page:** 50
- **Prerequisites:** Spynet Agent
- **Quick summary:** Your status within the Spynet gives you access to additional resources, and you know the best sources for restricted or rare items.
- **Production record:** `c11e9edfda40c53d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your status within the Spynet gives you access to additional resources, and you know the best sources for restricted or rare items. With a successful DC 20 Gather Information check, you can purchase standard weapons, equipment, and transport services at 50% of the going rate, or exotic and restricted weapons, equipment, and transport services at 75% of the going rate.

#### Knowledge Is Life

- **Page:** 50
- **Prerequisites:** Spynet Agent
- **Quick summary:** As a swift action, you can designate a single target within line of sight and make a Knowledge (galactic lore) check against a DC equal to 15 + the target's CL.
- **Production record:** `94aa0ef55bace440`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can designate a single target within line of sight and make a Knowledge (galactic lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you gain a +2 morale bonus to the defense score of your choice against that target.

#### Knowledge Is Power

- **Page:** 50
- **Prerequisites:** Spynet Agent
- **Quick summary:** As a swift action, you can designate a single target within your line of sight and make a Knowledge (galactic lore) check against a DC equal to 15 + the target's CL.
- **Production record:** `cdf46b8cdde49733`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can designate a single target within your line of sight and make a Knowledge (galactic lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you score a critical hit against that target on a natural rol! of 19 or 20. If you have another ability that increases your weapon's critical range against that target (such as the elite trooper's extended critical range talent, or the Jedi Knight's Vaapad talent), you increase this range by 1 (for example, from 19-20 to 18-20). However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

#### Knowledge Is Strength

- **Page:** 50
- **Prerequisites:** Spynet Agent
- **Quick summary:** As a swift action, you can designate a single target within your line of sight and make a Knowledge (galactic lore) check against a DC equal to 15 + the target's CL.
- **Production record:** `e2690af7f6700f95`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can designate a single target within your line of sight and make a Knowledge (galactic lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you gain a +2 morale bonus on attack rolls against that target.

#### Six Questions

- **Page:** 50
- **Prerequisites:** Spynet Agent
- **Quick summary:** You have mastered the basic Bothan philosophy of Six Questions to glean more information from contacts through fewer questions.
- **Production record:** `46946e7208f1cf05`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have mastered the basic Bothan philosophy of Six Questions to glean more information from contacts through fewer questions. As a swift action, you can make a Knowledge (galactic lore) check against a DC equal to 15 + the target's CL. If the check is successful, you learn a target character's level, classes, and ability scores, and the target's available Force Points and Destiny Points.

#### Spynet Agent

- **Page:** 50
- **Prerequisites:** Bothan species, or two talents from the Infiltration tree
- **Quick summary:** You can use your Gather Information check modifier instead of your Knowledge (galactic lore) check modifier when making Knowledge (galactic lore) checks.
- **Production record:** `648d9634a3795988`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use your Gather Information check modifier instead of your Knowledge (galactic lore) check modifier when making Knowledge (galactic lore) checks. You are considered trained in the Knowledge (galactic lore) skill for the purpose of using this talent. If you are entitled to a Knowledge (galactic lore) reroll, you can reroll your Gather Information check instead (subject to the same circumstances and limitations).

### Critical Master

#### Deny Move

- **Page:** 42
- **Prerequisites:** Reduce Mobility
- **Quick summary:** When you score a critical hit with a melee or ranged attack, your target cannot move on its next turn.
- **Production record:** `72ccf7bbe3048453`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you score a critical hit with a melee or ranged attack, your target cannot move on its next turn.

#### Extended Critical Range (heavy weapons)

- **Page:** 42
- **Prerequisites:** Base attack bonus +10, Weapon Proficiency (heavy weapons) feat
- **Quick summary:** When you are using a heavy weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20).
- **Production target:** `04985a42930dff2a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you are using a heavy weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

#### Extended Critical Range (rifles)

- **Page:** 42
- **Prerequisites:** Base attack bonus +10, Weapon Proficiency (rifles) feat
- **Quick summary:** When you are using a rifle, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20).
- **Production record:** `141e1a07b365e0fd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you are using a rifle, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

#### Flurry Attack

- **Page:** 42
- **Prerequisites:** Weapon Proficiency feat for chosen weapon
- **Quick summary:** Choose a single weapon group or exotic weapon you are proficient with.
- **Production record:** `9e2092257b53cd21`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Choose a single weapon group or exotic weapon you are proficient with. When you score a critical hit with a weapon from that group, you can make one immediate extra attack (in addition to the other effects of a critical hit) against a single target within range. You may only use this talent once per turn. You can select this talent multiple times. Its effects do not stack. Each time you take the talent, it applies to a new weapon group or exotic weapon.

#### Knockback

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** When you score a critical hit against a target no more than two size categories larger than you are, you can choose to move that opponent 1 square in any direction as a free action.
- **Production record:** `9d235eba6b3e5daf`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you score a critical hit against a target no more than two size categories larger than you are, you can choose to move that opponent 1 square in any direction as a free action. You cannot use this talent on an opponent that is being grabbed or grappled, and you cannot move your target into a solid object or another creature's fighting space.

#### Reduce Defense

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** When you score a critical hit with a melee or ranged attack, your target takes a -2 penalty to Reflex Defense until it is fully healed (at maximum hit points).
- **Production record:** `874ffa6b66cf2c37`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you score a critical hit with a melee or ranged attack, your target takes a -2 penalty to Reflex Defense until it is fully healed (at maximum hit points).

#### Reduce Mobility

- **Page:** 42
- **Prerequisites:** None.
- **Quick summary:** When you score a critical hit with a melee or ranged attack, you reduce the target's speed by half until it is fully healed (at maximum hit points).
- **Production record:** `c80edefd9c32ad02`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you score a critical hit with a melee or ranged attack, you reduce the target's speed by half until it is fully healed (at maximum hit points).

### Enforcement

#### Cover Bracing

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** You can brace a weapon set on autofire as a single swift action (instead of two) if you are adjacent to an object (including walls, barriers, and vehicles) that provides you with cover from all of the target squares.
- **Production record:** `c59e7eba84e6d4eb`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can brace a weapon set on autofire as a single swift action (instead of two) if you are adjacent to an object (including walls, barriers, and vehicles) that provides you with cover from all of the target squares.

#### Intentional Crash

- **Page:** 45
- **Prerequisites:** Trained in the Pilot skill
- **Quick summary:** You know how to intentionally crash an opponent's moving vehicle.
- **Production record:** `226b0a05cebd81ab`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You know how to intentionally crash an opponent's moving vehicle. When you successfully deal damage to a vehicle by ramming it, your vehicle takes half damage from the ram. Additionally, if the target vehicle is the same size as your vehicle or smaller, that vehicle cannot move in the following round.

#### Nonlethal Tactics

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** When you are using a ranged weapon set to stun, stun grenades, nets, or stun batons, you gain a +1 bonus on your attack roll and deal +1 die of stun damage.
- **Production record:** `475fef43d75f3bff`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you are using a ranged weapon set to stun, stun grenades, nets, or stun batons, you gain a +1 bonus on your attack roll and deal +1 die of stun damage.

#### Pursuit

- **Page:** 45
- **Prerequisites:** Dexterity 13
- **Quick summary:** When running, you are not restricted to a straight line (see “Endurance,” page 66 of the Saga Edition core rulebook) and you can reroll Endurance checks, using the better result, while running.
- **Production record:** `25f285b1cf4cff35`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When running, you are not restricted to a straight line (see “Endurance,” page 66 of the Saga Edition core rulebook) and you can reroll Endurance checks, using the better result, while running.

#### Respected Officer

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** You have a reputation that causes allies and enemies to treat you with respect.
- **Production record:** `8488911915ea094d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have a reputation that causes allies and enemies to treat you with respect. You automatically improve the attitude of an indifferent character to friendly with no check required (see “Persuasion,” page 71 of the Saga Edition core rulebook).

#### Slowing Stun

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** When you move a target at least -1 step along the condition track with an attack, its speed is halved until all conditions are removed.
- **Production record:** `fa20a7209820d512`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you move a target at least -1 step along the condition track with an attack, its speed is halved until all conditions are removed.

#### Takedown

- **Page:** 45
- **Prerequisites:** None.
- **Quick summary:** When you successfully make a melee attack and deal damage at the end of a charge, you knock your target prone as well, provided your opponent is no more than one size category larger than you.
- **Production record:** `fbac177b74fcea09`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you successfully make a melee attack and deal damage at the end of a charge, you knock your target prone as well, provided your opponent is no more than one size category larger than you.

### Ideologue

#### Instruction

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as a standard action, you can boost the competence of one of your allies within 6 squares.
- **Production record:** `b37ac074a7e8de58`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as a standard action, you can boost the competence of one of your allies within 6 squares. That individual gains the ability to make a single skill check using your skill modifier (except Use the Force); this skill check must be made before the end of the encounter, or the benefit is lost. You can select this talent multiple times. Each time you do so, you gain one additional use of this talent per encounter.

#### Idealist

- **Page:** 25
- **Prerequisites:** Charisma 13
- **Quick summary:** Your confidence empowers you, giving you the ability to withstand the harmful influence of others.
- **Production record:** `e8922370838f2965`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your confidence empowers you, giving you the ability to withstand the harmful influence of others. You can add your Charisma bonus in place of your Wisdom bonus to your Will Defense.

#### Know Your Enemy

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** You are well versed in the strengths and weaknesses of enemies of your cause.
- **Production record:** `72cfc8816ea3ebf5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are well versed in the strengths and weaknesses of enemies of your cause. As a swift action, you can select a single enemy within line of sight and make a Knowledge (galactic lore) check against a DC equal to 15 + the target's CL. If the check is successful, you immediately learn any two (your choice) of the following pieces of information: target's base attack bonus or attack bonus with a particular weapon, any one defense Score, any one skill modifier, or the presence of any one talent or feat (you choose the talent or feat, and the Gamemaster reveals whether or not it is present).

#### Known Dissident

- **Page:** 25
- **Prerequisites:** Know Your Enemy
- **Quick summary:** You are a well-known opponent of a large and influential government or organization (such as the Empire or the Corporate Sector Authority).
- **Production record:** `e15adb60be0dda02`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are a well-known opponent of a large and influential government or organization (such as the Empire or the Corporate Sector Authority). Officials of any level are loath to take action against you, lest they inadvertently promote your cause. As a standard action, you can make a Persuasion check against the Will Defense of a single opponent within line of sight that can hear and understand you. If your Persuasion check succeeds, that opponent may not attack you or any vehicle you occupy until the start of your next turn. If the target is of higher level than you, it gains a +5 bonus to its Will Defense, and the target must be able to hear and understand you. If the target is attacked, the effect of this talent ends. This is a mind-affecting effect.

#### Lead by Example

- **Page:** 25
- **Prerequisites:** None.
- **Quick summary:** Your bravery and skill inspires others to follow your lead.
- **Production record:** `2455d85114f52830`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your bravery and skill inspires others to follow your lead. Once per encounter, when you successfully deal damage to an enemy, you can choose to grant all allies a +1 circumstance bonus on attack rolls and +1 die of damage on non-area attacks against that target for the remainder of the encounter.

### Imperial Inquisitor

#### Cower Enemies

- **Page:** 42
- **Prerequisites:** Force Interrogation
- **Quick summary:** When you use the Persuasion skill to intimidate, you can intimidate all targets in a 6-square cone (originating from your square) instead of intimidating a single target.
- **Production record:** `0e36a04342959256`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use the Persuasion skill to intimidate, you can intimidate all targets in a 6-square cone (originating from your square) instead of intimidating a single target. All other limitations to the intimidation use of the Persuasion skill still apply.

#### Force Interrogation

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** When you deal damage to one or more creatures by using a Force power, you can immediately make a Persuasion check as a free action to intimidate a single target you damaged.
- **Production record:** `2acaa4620d396fe9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you deal damage to one or more creatures by using a Force power, you can immediately make a Persuasion check as a free action to intimidate a single target you damaged.

#### Inquisition

- **Page:** 43
- **Prerequisites:** None.
- **Quick summary:** You are particularly adept at dealing with Force-sensitive foes.
- **Production record:** `76ff0ba56aa3864b`
- **Phase 3B disposition:** `UPDATE_METADATA`

**Canonical rules text**

You are particularly adept at dealing with Force-sensitive foes. You gain a +1 bonus on attack rolls and deal +1 die of damage against targets that have the Force Sensitivity feat.

#### Unsettling Presence

- **Page:** 43
- **Prerequisites:** Force Interrogation
- **Quick summary:** You can spend a Force Point as a standard action to create an aura of unsettling discomfort around you.
- **Production record:** `dd488c2dc43d14ab`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point as a standard action to create an aura of unsettling discomfort around you. You make a Use the Force check when you activate this talent and compare the check result to the Will Defense of any creature that comes within 6 squares of you. If your Use the Force check result exceeds the creature's Will Defense, that target takes a -2 penalty on attack rolls and skill checks while within 6 squares of you. This aura lasts for the remainder of the encounter.

### Infiltration

#### Always Ready

- **Page:** 49
- **Prerequisites:** Trained in the Initiative skill
- **Quick summary:** You are accustomed to operating in response to enemy actions.
- **Production record:** `49f6a9ed0c91f847`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are accustomed to operating in response to enemy actions. When your readied action is triggered, it does not change your initiative count (see page 162 of the Saga Edition core rulebook).

#### Concealed Weapon Expert

- **Page:** 49
- **Prerequisites:** None.
- **Quick summary:** You are deadly with an unarmed strike, hold-out blaster, dagger, or vibrodagger or other small, concealable weapon (as determined by the Gamemaster).
- **Production record:** `59b2b90ad0ae8eb8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are deadly with an unarmed strike, hold-out blaster, dagger, or vibrodagger or other small, concealable weapon (as determined by the Gamemaster). Once per round you can use a swift action to reroll an attack using one of these weapons, but you must take the second result, even if it is worse.

#### Creeping Approach

- **Page:** 49
- **Prerequisites:** Trained in the Stealth skill
- **Quick summary:** As a swift action, you can designate a single opponent within 12 squares that is unaware of you as the target of this talent.
- **Production record:** `2931a9052148e79a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can designate a single opponent within 12 squares that is unaware of you as the target of this talent. Until the beginning of your next turn, that target may not make Perception checks to notice you, even if you enter the target's line of sight. If you or any of your allies attack the target, the effect of this talent ends.

#### Set for Stun

- **Page:** 49
- **Prerequisites:** None.
- **Quick summary:** You are particularly adept with stun weapons.
- **Production record:** `878d89b7232413cf`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are particularly adept with stun weapons. If you are using a ranged weapon that deals stun damage (including a lethal weapon set to stun), you can spend two consecutive swift actions in the same round to activate this talent. If the stun damage on your next attack exceeds the target's damage threshold, you move the target -3 steps along the condition track instead of the normal -2. You lose the benefit of this talent if you lose line of sight to your target or if you take any other action before making your attack.

#### Silent Takedown

- **Page:** 49
- **Prerequisites:** Trained in the Stealth skill
- **Quick summary:** You are skilled at quietly knocking out or eliminating guards and others when they are caught unaware.
- **Production record:** `b1960cbc28776a53`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are skilled at quietly knocking out or eliminating guards and others when they are caught unaware. If you damage an opponent that is unaware of you, that opponent cannot speak or make other noises until the end of your next turn. This is a stunning effect.

### Mercenary

#### Commanding Presence

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, you can activate this talent as a swift action.
- **Production record:** `438e13c99c7b53a6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can activate this talent as a swift action. Until the end of the encounter, all your enemies within 6 squares of you take a -2 penalty to their Will Defense. This is a mind-affecting fear effect. Additionally, Persuasion is now considered a class skill for you.

#### Dirty Fighting

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, if you successfully damage an opponent with a melee or ranged attack, you reduce the target's damage threshold by 2 for the remainder of the encounter.
- **Production record:** `c07b6c68e715b9ff`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, if you successfully damage an opponent with a melee or ranged attack, you reduce the target's damage threshold by 2 for the remainder of the encounter.

#### Feared Warrior

- **Page:** 29
- **Prerequisites:** Commanding Presence
- **Quick summary:** Your abilities on the battlefield are well known and feared.
- **Production record:** `cfd5d3f677b2bf1a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your abilities on the battlefield are well known and feared. When you reduce an enemy to 0 hit points with an attack, you can make a Persuasion check as a free action against all targets within 6 squares. Jf your Persuasion check exceeds a target's Will Defense, that target takes a -2 penalty on attack rolls for the remainder of the encounter. This talent affects any given target only once per encounter. This is a mind-affecting fear effect.

#### Focused Warrior

- **Page:** 29
- **Prerequisites:** None.
- **Quick summary:** Your training makes you confident and disciplined in combat.
- **Production record:** `42f9f503f5e26de7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your training makes you confident and disciplined in combat. When you successfully deal damage to an opponent in combat, you gain a +5 morale bonus to Will Defense until the start of your next turn. You lose this bonus to Will Defense if you are surprised or flat-footed for any reason.

#### Ruthless

- **Page:** 29
- **Prerequisites:** Dirty Fighting
- **Quick summary:** When you deal damage to a target with a melee or ranged attack roll that exceeds the target's damage threshold, you gain a +2 bonus on damage rolls against that target for the remainder of the encounter.
- **Production record:** `adfb725d20faade5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you deal damage to a target with a melee or ranged attack roll that exceeds the target's damage threshold, you gain a +2 bonus on damage rolls against that target for the remainder of the encounter.

### Privateer

#### Armored Spacer

- **Page:** 52
- **Prerequisites:** None.
- **Quick summary:** You can use armored spacesuits as if you had the Armor Proficiency (heavy) feat.
- **Production record:** `0bf26c4fb8622e0b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use armored spacesuits as if you had the Armor Proficiency (heavy) feat.

#### Attract Privateer

- **Page:** 52
- **Prerequisites:** None.
- **Quick summary:** You attract a loyal privateer lieutenant.
- **Production record:** `7a049ee1ecc3891b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You attract a loyal privateer lieutenant. The privateer is a nonheroic character who has a class level equal to three-quarters of your character level, rounded down. You can select this talent multiple times. Each time you do so, you gain another privateer. Each privateer who accompanies you on an adventure is entitled to an equal share of the total experience points earned for the adventure. For example, a privateer who accompanies a party of five heroes on an adventure receives one-sixth of the XP that the group earns.

#### Blaster and Blade I

- **Page:** 52
- **Prerequisites:** Dual Weapon Mastery I feat, Weapon Proficiency (advanced melee weapons, pistols) feats
- **Quick summary:** After a standard-action attack with an advanced melee weapon, make a pistol attack as a free action while wielding both weapons.
- **Production record:** `976c36831fecbd2b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you make a single attack with an advanced melee weapon as a standard action, you can immediately make an attack with a pistol as a free action, provided you have both the advanced melee weapon and the pistol in your hands when the melee attack is made. You apply the normal penalties for fighting with two weapons to both of these attacks.

#### Blaster and Blade II

- **Page:** 52
- **Prerequisites:** Blaster and Blade I, Dual Weapon Mastery I feat, Weapon Proficiency (advanced melee weapons, pistols) feats
- **Quick summary:** When you are wielding both an advanced melee weapon and a pistol, you treat the advanced melee weapon as though you were wielding it two-handed (including doubling your Strength bonus on damage rolls).
- **Production record:** `5e895be4051e1408`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you are wielding both an advanced melee weapon and a pistol, you treat the advanced melee weapon as though you were wielding it two-handed (including doubling your Strength bonus on damage rolls).

#### Blaster and Blade III

- **Page:** 52
- **Prerequisites:** Blaster and Blade I, Blaster and Blade II, Dual Weapon Mastery I feat, Weapon Proficiency (advanced melee weapons, pistols) feats
- **Quick summary:** When you are wielding both an advanced melee weapon and a pistol, you can make a full attack as a standard action instead of a full-round action, provided you attack with both weapons.
- **Production record:** `584bf5a0f7381648`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you are wielding both an advanced melee weapon and a pistol, you can make a full attack as a standard action instead of a full-round action, provided you attack with both weapons.

#### Boarder

- **Page:** 52
- **Prerequisites:** None.
- **Quick summary:** You are skilled at boarding hostile vessels.
- **Production record:** `34669d959223b187`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You are skilled at boarding hostile vessels. You ignore cover (but not improved cover) with your character-scale ranged attacks while aboard a Starship or space station.

#### Ion Mastery

- **Page:** 52
- **Prerequisites:** None.
- **Quick summary:** You know the typical weaknesses of vehicles and droids, and you know how to preserve such targets for capture rather than destroying them.
- **Production record:** `df9c25340dcb7c95`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You know the typical weaknesses of vehicles and droids, and you know how to preserve such targets for capture rather than destroying them. When attacking with ion weapons, you gain a +1 bonus on attack rolls and deal +1 die of ion damage.

#### Multiattack Proficiency (advanced melee weapons)

- **Page:** 52
- **Prerequisites:** None.
- **Quick summary:** When you make multiple attacks with any type of advanced melee weapon as a full attack action, you lessen the penalty on your attack rolls by 2.
- **Production target:** `d7ba5fb8b677a2f4`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you make multiple attacks with any type of advanced melee weapon as a full attack action, you lessen the penalty on your attack rolls by 2. You can take this talent multiple times. Each time you do so, you lessen the penalty on your attack rolls by an additional 2.

#### Preserving Shot

- **Page:** 52
- **Prerequisites:** None.
- **Quick summary:** When a vehicle-weapon hit would destroy a vehicle, instead deal half damage, move it -1 condition step, and disable its sublight engines and hyperdrive.
- **Production record:** `a594f0b9ff786a6c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you deal damage with a vehicle weapon that is equal to or greater than both the target vehicle's current hit points and the target vehicle's damage threshold (that is, when you would deal enough damage to destroy the target vehicle), you can choose to use this talent. Instead of dealing full damage, you instead deal half damage to your target and move it -1 step along on the condition track. In addition, you disable the ship's sublight engines and hyperdrive. The ship cannot move or make a jump to lightspeed until it has received repairs (through use of the repair object application of the Mechanics skill).

### Sabotage

#### Device Jammer

- **Page:** 56
- **Prerequisites:** None.
- **Quick summary:** You can construct a short-range jammer that affects a specific type of electronic device such as a personal shield generator, comlink, computer, or datapad.
- **Production record:** `5db4343762664d95`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can construct a short-range jammer that affects a specific type of electronic device such as a personal shield generator, comlink, computer, or datapad. As a full-round action, you select a particular piece of equipment (any object except a droid, vehicle, or weapon) and make a DC 20 Mechanics check. If the check is successful, all devices of the chosen type cease to function while within 12 squares of your position for the remainder of the encounter. You may only have one jammer (device or droid) active at a time.

#### Droid Jammer

- **Page:** 56
- **Prerequisites:** None.
- **Quick summary:** You can construct a short-range jammer that affects droids.
- **Production record:** `80a24150fd2f3163`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can construct a short-range jammer that affects droids. As a full-round action, you make a Mechanics check to build the jammer. When a droid comes within 6 squares of you, compare the result of your Mechanics check to the droid’s Will Defense. If your check result equals or exceeds the droid’s Will Defense, the droid can take only swift actions as long as it remains within the radius of the jammer. Droids that are immune to the effect of a restraining bolt are immune to the effect of this talent. The jammer functions for the remainder of the encounter. You may only have one jammer (device or droid) active at a time.

#### Extreme Explosion

- **Page:** 57
- **Prerequisites:** Skilled Demolitionist, Shaped Explosion
- **Quick summary:** You know how to set large charges and use dozens of charges for extremely large explosions.
- **Production record:** `ddf81a7bb146ed87`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You know how to set large charges and use dozens of charges for extremely large explosions. You increase the blast radius of any mines or explosives by 1 square.

#### Mine Mastery

- **Page:** 57
- **Prerequisites:** None.
- **Quick summary:** You can place a mine as a standard action instead of a full-round action.
- **Production record:** `9ceea9d860aab046`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can place a mine as a standard action instead of a full-round action.

#### Shaped Explosion

- **Page:** 57
- **Prerequisites:** Skilled Demolitionist
- **Quick summary:** You know how to set charges to direct a blast in a specific direction or manner.
- **Production record:** `7ab4fcbe5a8b7714`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You know how to set charges to direct a blast in a specific direction or manner. You can shape an explosion caused by explosives or mines that you set into a line or a cone instead of a radius. The length of the line is equal to 2 x the radius of the explosive blast, the length of the cone is equal to 3 x the radius of the blast, and either the line or the cone originates from the square where the explosives are placed.

#### Skilled Demolitionist

- **Page:** 57
- **Prerequisites:** None.
- **Quick summary:** You can set a detonator as a swift action, and your explosives never go off as the detonator is being placed, even if you fail the check by 10 or more.
- **Production record:** `c3a67c14c713a7a3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can set a detonator as a swift action, and your explosives never go off as the detonator is being placed, even if you fail the check by 10 or more. You must still roll to determine if the charge otherwise goes off as planned (see “Mechanics,” page 69 of the Saga Edition core rulebook).

### Smuggling

#### Art of Concealment

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** Some smugglers are adept at hiding contraband and weapons, even on their person.
- **Production record:** `64cfde2d0cf6c523`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Some smugglers are adept at hiding contraband and weapons, even on their person. When making a Stealth check to conceal an item, you can take 10 even under pressure. Additionally, you can conceal an item as a swift action.

#### Fast Talker

- **Page:** 27
- **Prerequisites:** Art of Concealment
- **Quick summary:** Smugglers must be quick to explain discrepancies in their cover stories.
- **Production record:** `eeed98748becb161`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Smugglers must be quick to explain discrepancies in their cover stories. Once per day, you can take 20 on a Deception check as a standard action when attempting to deceive.

#### Hidden Weapons

- **Page:** 27
- **Prerequisites:** Art of Concealment
- **Quick summary:** If you draw a concealed weapon and attack a target that failed to notice the item in the same round, that target is considered flat-footed against you.
- **Production record:** `234f9d660d14220c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you draw a concealed weapon and attack a target that failed to notice the item in the same round, that target is considered flat-footed against you. You can draw a concealed item or a stowed item as a move action, Additionally, if you have the Quick Draw feat, you can reduce this to a swift action.

#### Illicit Dealings

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** Smugglers have a knack for locating and negotiating illicit deals.
- **Production record:** `0681e1ea8e72f362`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Smugglers have a knack for locating and negotiating illicit deals. When using Persuasion to haggle for restricted, military, or illegal goods you may roll twice, keeping the better result.

#### Surprise Strike

- **Page:** 27
- **Prerequisites:** None.
- **Quick summary:** Sometimes a smuggler has to fight his way out of a bad situation.
- **Production record:** `b92e61669b29d090`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Sometimes a smuggler has to fight his way out of a bad situation. If you fail any Deception check to convey deceptive information, you can initiate combat and make a single unarmed attack as a free action in the surprise round (or with a melee or ranged weapon, if you have the Quick Draw feat); all other combatants are considered surprised even if they are aware of you.

### Specialized Droid

#### Computer Language

- **Page:** 47
- **Prerequisites:** Must know the Binary language
- **Quick summary:** You can use your Persuasion modifier instead of your Use Computer modifier when making Use Computer checks.
- **Production target:** `662eb601a2686349`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use your Persuasion modifier instead of your Use Computer modifier when making Use Computer checks. You are considered trained in the Use Computer skill for the purpose of using this talent. If you are entitled to a Use Computer check reroll, you can reroll your Persuasion check instead (subject to the same circumstances and limitations).

#### Computer Master

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** You can reroll any opposed Use Computer check, using the better result.
- **Production target:** `8d7cbcbbf1dc58bb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can reroll any opposed Use Computer check, using the better result.

#### Enhanced Manipulation

- **Page:** 47
- **Prerequisites:** Dexterity 15
- **Quick summary:** You have improved appendage manipulation routines.
- **Production target:** `37cdbac0dee1b93a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You have improved appendage manipulation routines. You can take 10 when making any Dexterity-based skill check, even if you are threatened or would not normally be able to take 10.

#### Hotwired Processor

- **Page:** 47
- **Prerequisites:** None.
- **Quick summary:** You gain temporary processing power, enhancing your mental attributes.
- **Production target:** `e9a5fe40ce95a053`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You gain temporary processing power, enhancing your mental attributes. When you hotwire your processor (a swift action), you gain a +5 circumstance bonus on Intelligence- and Wisdom-based skill checks and a +1 circumstance bonus on ranged attack rolls. A hotwiring lasts for a number of rounds equal to one-haIf your level (rounded down). When the hotwiring ends, you move -1 persistent step along the condition track. The penalties imposed by this condition persist until you receive repairs (using the repair droid application of the Mechanics skill).

#### Power Surge

- **Page:** 48
- **Prerequisites:** None.
- **Quick summary:** You temporarily surge your power systems to enhance your physical abilities.
- **Production record:** `77d09ca0a54f4c36`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You temporarily surge your power systems to enhance your physical abilities. When you initiate a power surge (a swift action), you gain a +1 circumstance bonus on melee attack rolls, +1 die of damage on melee damage rolls, and an increase of 2 squares to your speed. A power surge lasts for a number of rounds equal to one-haIf your level (rounded down). At the end of a power surge, you move -1 persistent step along the condition track. The penalties imposed by this condition persist until you receive repairs (using the repair droid application of the Mechanics skill).

#### Skill Conversion

- **Page:** 48
- **Prerequisites:** None.
- **Quick summary:** When you reprogram yourself, you can sacrifice a single trained skill for a bonus Skill Focus feat.
- **Production target:** `3d17761d072eeb53`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you reprogram yourself, you can sacrifice a single trained skill for a bonus Skill Focus feat. You must meet the prerequisites for the feat (you must be trained in the skill you choose to gain Skill Focus for), and you can do this only once per reprogramming.

### Spy

#### Blend In

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** You know the tricks of body language and movement that allow you to disguise your appearance without elaborate materials or efforts.
- **Production record:** `a18d67d9fd947f68`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You know the tricks of body language and movement that allow you to disguise your appearance without elaborate materials or efforts. You can use your Stealth modifier in place of your Deception modifier for the purpose of creating a deceptive appearance. You are considered trained in the Deception skill for the purpose of using this talent. If you are entitled to a Deception check reroll, you can reroll your Stealth check instead (subject to the same circumstances and conditions).

#### Incognito

- **Page:** 28
- **Prerequisites:** Blend In
- **Quick summary:** Spies are adept at concealing their identities, even if not using a physical disguise.
- **Production record:** `55988579a1906e5e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Spies are adept at concealing their identities, even if not using a physical disguise. You can reroll your Deception check for the purpose of creating a deceptive appearance, using the better result.

#### Improved Surveillance

- **Page:** 28
- **Prerequisites:** Surveillance, trained in the Perception skill
- **Quick summary:** When you successfully use the Surveillance talent, you grant yourself and your allies a +1 insight bonus to all defenses against that target.
- **Production record:** `8070dbbea2886bbd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you successfully use the Surveillance talent, you grant yourself and your allies a +1 insight bonus to all defenses against that target.

#### Intimate Knowledge

- **Page:** 28
- **Prerequisites:** Surveillance
- **Quick summary:** Experienced spies and scouts remember many details from previous assignments, providing insights on later missions.
- **Production record:** `a810b68876f7e44e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Experienced spies and scouts remember many details from previous assignments, providing insights on later missions. Once per encounter as a standard action, you can take 20 on a check involving a Knowledge skill you are trained in, or take 10 on a check involving a Knowledge skill you are untrained in, even if circumstances would not normally allow you to take 10 or 20.

#### Surveillance

- **Page:** 28
- **Prerequisites:** Trained in the Perception skill
- **Quick summary:** As a full-round action, you can make a Perception check against a single target within line of sight.
- **Production record:** `f23b63464e0aeff7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a full-round action, you can make a Perception check against a single target within line of sight. The DCs equal to 15 or the target's Stealth check result (if the target is actively trying to remain hidden), whichever is greater. If the check is successful, you grant yourself and all allies within line of sight a +2 insight bonus on attack rolls against that target until the end of your next turn. Your allies must be able to hear and understand you to benefit from this bonus, and they do not lose the benefit of this talent if they move out of line of sight after it is used.

#### Traceless Tampering

- **Page:** 28
- **Prerequisites:** None.
- **Quick summary:** Spies specialize in leaving no evidence of their presence when they tamper with advanced electronics or basic mechanical systems.
- **Production record:** `9215a487a59862f3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Spies specialize in leaving no evidence of their presence when they tamper with advanced electronics or basic mechanical systems. When using Mechanics to disable a device, you automatically leave no trace when tampering (with no DC increase), and you must fail by 10 or more (instead of 5 or more) before something goes wrong.

### Turret

#### Blaster Turret I

- **Page:** 57
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, as standard action you can create a blaster turret (Size Tiny, Initiative +4, Perception +4, Reflex Defense 10, 10 hp, Threshold 8) that can be mounted to any flat surface.
- **Production record:** `7b56d0b92582ae88`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, as standard action you can create a blaster turret (Size Tiny, Initiative +4, Perception +4, Reflex Defense 10, 10 hp, Threshold 8) that can be mounted to any flat surface. The turret fires as a standard blaster pistol once per round, using your base attack bonus plus your Intelligence bonus and dealing 3d6 points of damage. The turret fires at any target you designate (a free action, once per round on your turn), though you must remain adjacent to the turret to control it. The turret is expended at the end of the encounter.

#### Blaster Turret II

- **Page:** 57
- **Prerequisites:** Blaster Turret I
- **Quick summary:** Your turret’s capabilities increase in the following ways: Initiative +8, Perception +8, Reflex Defense 12, 15 hp, Threshold 10, and the turret deals 3d8 points of damage.
- **Production record:** `1b1f818e56956bc5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your turret’s capabilities increase in the following ways: Initiative +8, Perception +8, Reflex Defense 12, 15 hp, Threshold 10, and the turret deals 3d8 points of damage. The turret can be directed by remote control at a range of 12 squares.

#### Blaster Turret III

- **Page:** 57
- **Prerequisites:** Blaster Turret I, Blaster Turret II
- **Quick summary:** Your turret gains the ability to fire twice per round, with a -5 penalty on each attack roll, and gains DR 5.
- **Production record:** `aa2a3697eeab3e35`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your turret gains the ability to fire twice per round, with a -5 penalty on each attack roll, and gains DR 5.

#### Ion Turret

- **Page:** 57
- **Prerequisites:** Blaster Turret I
- **Quick summary:** You can construct a turret that is highly effective against droids.
- **Production record:** `c2f332d1e74e3e1a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can construct a turret that is highly effective against droids. The turret deals ion damage instead of normal damage.

#### Stun Turret

- **Page:** 57
- **Prerequisites:** Blaster Turret I
- **Quick summary:** You can construct a nonlethal turret.
- **Production record:** `8a551fd42b051d0e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can construct a nonlethal turret. The turret deals stun damage instead of normal damage.

#### Turret Self-Destruct

- **Page:** 57
- **Prerequisites:** Blaster Turret I
- **Quick summary:** Your turret self-destructs automatically when it reaches 0 hit points.
- **Production record:** `17ec736c3984fe43`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your turret self-destructs automatically when it reaches 0 hit points. It explodes in a 2-square radius, dealing its normal damage.!f you are adjacent to the turret, you can disable this feature as a reaction.

### 1stdegree Droid

#### Dull the Pain

- **Page:** 102
- **Prerequisites:** Medical Droid
- **Quick summary:** As a full-round action, you can make a DC 15 Treat Injury check on an adjacent living creature to move it +1 step along the condition track.
- **Production target:** `d32459fe16029f2a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a full-round action, you can make a DC 15 Treat Injury check on an adjacent living creature to move it +1 step along the condition track.

#### Interrogator

- **Page:** 102
- **Prerequisites:** None.
- **Quick summary:** You can create an aura of unliving, emotionless menace that no biological creature can match, and combine it with the cruel application of medical knowledge.
- **Production target:** `aab9d63888f12dba`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can create an aura of unliving, emotionless menace that no biological creature can match, and combine it with the cruel application of medical knowledge. You can use your Treat Injury modifier on a Persuasion check to change attitude or intimidate. You must be adjacent to your target to use this ability, in addition to the normal requirements for these uses of the Persuasion skill.

#### Medical Droid

- **Page:** 102
- **Prerequisites:** None.
- **Quick summary:** When you use a medpac to perform first aid with the Treat Injury skill, the creature gains 2 hit points for every point by which your check exceeds the DC (rather than the normal 1 hit point).
- **Production record:** `97faaefe3487494c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you use a medpac to perform first aid with the Treat Injury skill, the creature gains 2 hit points for every point by which your check exceeds the DC (rather than the normal 1 hit point).

### 2nddegree Droid

#### Adept Assistant

- **Page:** 102
- **Prerequisites:** None.
- **Quick summary:** When you successfully aid another character on a Mechanics, Pilot, or Use Computer check, you add +5 to the check result (rather than the normal +2).
- **Production target:** `7cbae1f695df81c5`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you successfully aid another character on a Mechanics, Pilot, or Use Computer check, you add +5 to the check result (rather than the normal +2).

#### Mechanics Mastery

- **Page:** 102
- **Prerequisites:** None.
- **Quick summary:** You can always take 10 on a Mechanics check, even if distractions or hazardous circumstances would normally prevent you from doing so.
- **Production target:** `88d01facdd76940e`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can always take 10 on a Mechanics check, even if distractions or hazardous circumstances would normally prevent you from doing so.

#### Vehicle Mechanic

- **Page:** 102
- **Prerequisites:** None.
- **Quick summary:** Once per day you can spend three swift actions in successive rounds to make a DC 20 Mechanics check to restore 1d8 hit points to a vehicle and move it +1 step along the condition track.
- **Production target:** `5ea7a0fd9015b29c`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per day you can spend three swift actions in successive rounds to make a DC 20 Mechanics check to restore 1d8 hit points to a vehicle and move it +1 step along the condition track. You also restore 1 hit point to the vehicle for every paint by which you exceed the Mechanics check DC.

### 3rddegree Droid

#### Etiquette

- **Page:** 103
- **Prerequisites:** None.
- **Quick summary:** When you succeed on a Persuasion check to change attitude, you adjust the target's attitude by one additional step.
- **Production target:** `9a0c74195f3d4ac3`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you succeed on a Persuasion check to change attitude, you adjust the target's attitude by one additional step.

#### Helpful

- **Page:** 103
- **Prerequisites:** None.
- **Quick summary:** Once per turn you can use the aid another action to assist any adjacent ally on a skill check as a swift action instead of a standard action.
- **Production target:** `342fd105ca6369c7`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per turn you can use the aid another action to assist any adjacent ally on a skill check as a swift action instead of a standard action.

#### Protocol

- **Page:** 103
- **Prerequisites:** None.
- **Quick summary:** You always succeed on attempts to aid another on Deception, Knowledge, and Persuasion checks (no check required).
- **Production target:** `058898a456a9a8fb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You always succeed on attempts to aid another on Deception, Knowledge, and Persuasion checks (no check required).

### 4thdegree Droid

#### Combat Repairs

- **Page:** 103
- **Prerequisites:** None.
- **Quick summary:** Once per day, as a full-round action, you can use the Mechanics skill to repair yourself (using the repair droid application of the skill), as opposed to the normal 1 hour.
- **Production target:** `428896be183fadb1`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per day, as a full-round action, you can use the Mechanics skill to repair yourself (using the repair droid application of the skill), as opposed to the normal 1 hour.

#### Droid Smash

- **Page:** 103
- **Prerequisites:** None.
- **Quick summary:** You can use your mechanical strength when wielding a melee weapon.
- **Production target:** `236bf4d940eb6b12`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use your mechanical strength when wielding a melee weapon. You add 2 x your Strength bonus to melee damage rolls when wielding a weapon in one hand.

#### Targeting Package

- **Page:** 103
- **Prerequisites:** None.
- **Quick summary:** You can take two consecutive swift actions in the same round to activate special targeting software.
- **Production target:** `ac8c46e1f6365c4a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can take two consecutive swift actions in the same round to activate special targeting software. When you do so, you gain a +2 bonus on attack rolls and damage rolls on your next attack if your target is at point blank range (or within reach, for melee attacks) and within line of sight. You lose the benefit of this talent if you lose line of sight to your target or if you take any other action before making your attack. The effect of this talent stacks with that of the Point Blank Shot feat.

### 5thdegree Droid

#### Cargo Hauler

- **Page:** 103
- **Prerequisites:** None.
- **Quick summary:** You gain a +5 bonus on Strength-based skill checks.
- **Production target:** `ce141cbd257003bc`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You gain a +5 bonus on Strength-based skill checks. Additionally, you double your carrying capacity.

#### Environmentally Shielded

- **Page:** 103
- **Prerequisites:** None.
- **Quick summary:** You gain a +5 equipment bonus to your Fortitude Defense against environmental hazards, including extreme atmospheric conditions and corrosion.
- **Production target:** `aadcae548952b7eb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You gain a +5 equipment bonus to your Fortitude Defense against environmental hazards, including extreme atmospheric conditions and corrosion.

#### Power Supply

- **Page:** 103
- **Prerequisites:** None.
- **Quick summary:** You have learned to reroute power through your system to act as a power generator, providing power to an E-Web blaster (or similar weapon requiring a power generator).
- **Production target:** `56a3b3c9b57f11fa`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You have learned to reroute power through your system to act as a power generator, providing power to an E-Web blaster (or similar weapon requiring a power generator). Additionally, whenever you would normally spend three swift actions to recharge shields or reroute power on a vehicle or starship, you need spend only two swift actions instead.

### Agent Of Ossus

#### Buried Presence

- **Page:** 92
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point as a standard action to become immune to detection by the Force for 1 hour.
- **Production record:** `c913aa5322934cfd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point as a standard action to become immune to detection by the Force for 1 hour. During this time, you always avoid detection by characters who are using the sense force application of the Use the Force skill, and you cannot be the target of the farseeing power. You may use this as a reaction to another character attempting to locate you with Sense Force (but before the character locates you), and if you make a Use the Force check this power’s effect immediately ends.

#### Conceal Other

- **Page:** 92
- **Prerequisites:** Buried Presence
- **Quick summary:** When you use either the Buried Presence talent or the Vanish talent, you affect one other willing adjacent target, granting it the effect of that talent as well.
- **Production target:** `ea3bdb2a7d6b44db`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you use either the Buried Presence talent or the Vanish talent, you affect one other willing adjacent target, granting it the effect of that talent as well. You can select this talent multiple times. Each time you do so, it increases the number of adjacent willing targets you affect by one.

#### Insightful Aim

- **Page:** 92
- **Prerequisites:** Weapon Proficiency (pistols or rifles) feat
- **Quick summary:** You can spend a Force Point as a swift action to substitute your Use the Force modifier for your ranged attack bonus when making attacks with a ranged weapon until the beginning of your next turn.
- **Production target:** `c60790c84a0be9cf`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can spend a Force Point as a swift action to substitute your Use the Force modifier for your ranged attack bonus when making attacks with a ranged weapon until the beginning of your next turn.

#### Vanish

- **Page:** 92
- **Prerequisites:** None.
- **Quick summary:** You can make a Use the Force check as a swift action to vanish from the sight of a single target within line of sight.
- **Production target:** `4816e7970b4241c2`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can make a Use the Force check as a swift action to vanish from the sight of a single target within line of sight. If the result of your Use the Force check exceeds the target's Will Defense, you gain total concealment from that target until the beginning of your next turn, or until you make an attack roll or skill check against the target.

### Alter

#### Illusion

- **Page:** 87
- **Prerequisites:** Mind trick
- **Quick summary:** As a standard action, you can spend a Force Point to create an illusion that seems perfectly real to anyone who views it.
- **Production record:** `708a47d1be414990`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can spend a Force Point to create an illusion that seems perfectly real to anyone who views it. You designate the form and complexity of the illusion, as well as its size and location, and make a Use the Force check. When a creature views the illusion, compare the result of your Use the Force check to the creature's Will Defense; if your check result exceeds its Will Defense, it believes the illusion to be real. Any physical interaction with the illusion (such as touching it, passing through it, or shooting it with a blaster) immediately reveals the true nature of the illusion, and the creature is no longer deceived. The illusion lasts for a number of minutes equal to your heroic level. The illusion's size also affects your Use the Force check, applying a penalty for exceptionally large illusions. The penalties are -1 for Huge illusions, -2 for Gargantuan illusions, -5 for Colossal illusions, and -10 for Colossal (Frigate) or larger illusions. This is a mind-affecting effect.

#### Telekinetic Prodigy

- **Page:** 88
- **Prerequisites:** Telekinetic Savant
- **Quick summary:** When you take the Force Training feat and select move object as one of your Force powers, you can also select one extra power to add to your Force suite for free.
- **Production record:** `7af4caf439358120`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you take the Force Training feat and select move object as one of your Force powers, you can also select one extra power to add to your Force suite for free. This power must be one of the powers affected by the Telekinetic Savant talent. You can gain only one extra power each time you take the Force Training feat, regardless of how many times you choose the move object power.

### Control

#### Force Exertion

- **Page:** 88
- **Prerequisites:** Force Training feat
- **Quick summary:** When you select this talent, choose one Force power that you have in your Force power suite.
- **Production record:** `7d0259a008e5d68f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you select this talent, choose one Force power that you have in your Force power suite. As a reaction, you can remove any one Force power from your active suite to add an extra use of the Force power designated by this talent. Doing so moves you -1 persistent step along the condition track. This persistent condition is removed by resting for 1 minute. You can select this talent multiple times. Each time you do so, you choose a different Force power to be gained by using this talent.

#### Indomitable Will

- **Page:** 88
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point as a standard action to become immune to all mind-affecting effects for 1 minute.
- **Production record:** `a1f7a6ee66410c3e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point as a standard action to become immune to all mind-affecting effects for 1 minute.

### Dark Side

#### Wrath of the Dark Side

- **Page:** 88
- **Prerequisites:** Power of the Dark Side
- **Quick summary:** On a natural 20 with a directly damaging Force power, forgo normal Force-power recovery to deal half that damage again at the start of the targets next turn.
- **Production record:** `f5ebaf5d77257e0c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you roll a natural 20 on a Use the Force check to activate a Force power that directly deals damage to a target, you can choose not to regain all of your spent Force powers as normal and instead the targets damaged by the power take half that damage again at the start of their next turn. Only powers that directly damage the target are subject to this talent, including corruption, Force blast, Force grip, Force lightning, Force slam, Force storm, Force thrust (only when spending a Force Point), and repulse (only when spending a Force Point).

### Felucian Shaman

#### Detonate

- **Page:** 93
- **Prerequisites:** Force blast
- **Quick summary:** When you use the Force blast power, you can spend a Force Point to compare the result of your Use the Force check to the Reflex Defense of all other characters, creatures, and droids within 2 squares of your target.
- **Production target:** `bf1a79b50e129dc7`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you use the Force blast power, you can spend a Force Point to compare the result of your Use the Force check to the Reflex Defense of all other characters, creatures, and droids within 2 squares of your target. If you exceed the Reflex Defense of those secondary targets, they also take damage from the Force blast, and if you fail to exceed their Reflex Defense, they take half damage instead. This is considered to be an area attack against the secondary targets (but not against the original target).

#### Hive Mind

- **Page:** 93
- **Prerequisites:** None.
- **Quick summary:** You can use the telepathy application of the Use the Force skill as a swift action, and you automatically succeed (no roll required) if your target is a willing recipient on the same planet.
- **Production target:** `ba740330cf490549`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use the telepathy application of the Use the Force skill as a swift action, and you automatically succeed (no roll required) if your target is a willing recipient on the same planet.

#### Infuse Weapon

- **Page:** 93
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point to infuse an unpowered melee weapon (one that does not require an energy cell) with the strength of the Force, making it resistant to the attacks of other weapons.
- **Production target:** `0df15b0ea7721c50`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can spend a Force Point to infuse an unpowered melee weapon (one that does not require an energy cell) with the strength of the Force, making it resistant to the attacks of other weapons. Infusing the weapon takes a full-round action. From that point forward, when you wield the weapon, its damage reduction is doubled, and lightsabers do not ignore the weapon's damage reduction. When you spend a Force Point to modify the attack roll of an infused weapon, you also add 2 x the Force Point's result to the damage roll if the attack is a success.

#### Sickening Blast

- **Page:** 93
- **Prerequisites:** Force blast
- **Quick summary:** When you use the Force blast power, if your Use the Force check exceeds the target's Fortitude Defense, you can choose to move the target -1 step along the condition track.
- **Production target:** `6f32f14243bd4856`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you use the Force blast power, if your Use the Force check exceeds the target's Fortitude Defense, you can choose to move the target -1 step along the condition track. Doing so increases your Dark Side Score by 1.

### Sense

#### Feel the Force

- **Page:** 88
- **Prerequisites:** None.
- **Quick summary:** As a standard action, you can spend a Force Point to ignore all concealment for 1 minute.
- **Production record:** `301415f97665a33b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can spend a Force Point to ignore all concealment for 1 minute.

---


---

## Book 13 — Jedi Academy Training Manual

**Phase 3B status:** COMPLETE — 117 owned canonical identities; 74 UPDATE_CONTENT; 43 CREATE; 1 reference-only publication; 2 talent-tree creates.

### Dark Side Devotee

#### Dark Side Talisman

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point to imbue a weapon or some other portable object with the dark side of the Force, creating a talisman that grants you protection from the light side.
- **Production record:** `e96812723ff4eb04`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point to imbue a weapon or some other portable object with the dark side of the Force, creating a talisman that grants you protection from the light side. Creating the dark side talisman takes a full-round action. While you wear or carry the talisman, you gain a +2 Force bonus to one of your defenses (Reflex, Fortitude, or Will) against Force powers with the [light side] descriptor. You can have only one dark side talisman active at a given time (though you can have both a dark side talisman and a Force talisman active at the same time), and if your dark side talisman is destroyed, you cannot create another one for 24 hours.

#### Greater Dark Side Talisman

- **Page:** 17
- **Prerequisites:** Dark Side Talisman
- **Quick summary:** As Dark Side Talisman (above), except that the talisman’s Force bonus extends to all three of your defenses (Reflex, Fortitude, and Will).
- **Production record:** `c8bf9ab9d1f8588a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As Dark Side Talisman (above), except that the talisman’s Force bonus extends to all three of your defenses (Reflex, Fortitude, and Will).

### Duelist

#### Lightsaber Form Savant

- **Page:** 19
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a swift action, you can return any one spent Force power with the [lightsaber form] descriptor to your Force suite without spending a Force Point.
- **Production record:** `fcc6357b5b33dbb7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a swift action, you can return any one spent Force power with the [lightsaber form] descriptor to your Force suite without spending a Force Point. You can select this talent multiple times, Each time you select it, you can use it one additional time per encounter.

#### Shoto Master

- **Page:** 19
- **Prerequisites:** None.
- **Quick summary:** When you wield both a one-handed lightsaber and a shoto (or guard shoto), you can consider the one-handed lightsaber to be a light weapon.
- **Production record:** `26bece7080710c8d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you wield both a one-handed lightsaber and a shoto (or guard shoto), you can consider the one-handed lightsaber to be a light weapon. Additionally, if you have the Lightsaber Defense talent, you can activate the talent as a free action on your turn (instead of a swift action) whenever you wield both a one-handed lightsaber and a shoto (or guard shoto)

### Jedi Consular

#### Adversary Lore

- **Page:** 14
- **Prerequisites:** None.
- **Quick summary:** As a standard action, you can peer into the Force and search for weaknesses in the defenses of your enemies.
- **Production record:** `a8347dda0f619f2d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can peer into the Force and search for weaknesses in the defenses of your enemies. Make a Use the Force check against the Will Defense of a target creature within 12 squares of you and in your line of sight. If the skill check equals or exceeds the target's Will Defense, that target takes a -2 penalty to Reflex Defense against you and all allies who can hear and understand you until the end of your next turn.

#### Know Weakness

- **Page:** 14
- **Prerequisites:** Adversary Lore
- **Quick summary:** Whenever you use Adversary Lore on a target suc-cessfully, that target also takes an additional 1d6 points of damage from any successful attack made against it by you or an ally who can hear and understand you until the end of your next turn.
- **Production record:** `d0b25a52cdc093bf`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you use Adversary Lore on a target suc-cessfully, that target also takes an additional 1d6 points of damage from any successful attack made against it by you or an ally who can hear and understand you until the end of your next turn.

### Jedi Guardian

#### Grenade Defense

- **Page:** 14
- **Prerequisites:** None.
- **Quick summary:** You can use the Move Light Object application of the Use the Force skill to cast aside grenades that are thrown at you.
- **Production record:** `27a67c4c00c1b9ae`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the Move Light Object application of the Use the Force skill to cast aside grenades that are thrown at you. As a reaction when you are attacked by a grenade of any kind, you can make a Use the Force check with a DC equal to the attack roll of the incoming grenade attack. If your check equals or beats the DC, you hurl the grenade toa location where it explodes harmlessly, negating the attack. Whether or not you are successful, you take a -5 penalty on Use the Force checks until the start of your next turn.

#### Hold the Line

- **Page:** 14
- **Prerequisites:** None.
- **Quick summary:** When you make a successful attack of opportunity against a target leaving your threatened area, you stop the target's movement, ending its action.
- **Production record:** `a843f45ec0f99db6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you make a successful attack of opportunity against a target leaving your threatened area, you stop the target's movement, ending its action.

### Jedi Sentinel

#### Master of the Great Hunt

- **Page:** 14
- **Prerequisites:** None.
- **Quick summary:** You gain a +1 Force bonus on attack rolls and deal +1 die of damage on lightsaber attacks made against a beast with a Dark Side Score of 1+.
- **Production record:** `ee2cbf6681a5a7e1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a +1 Force bonus on attack rolls and deal +1 die of damage on lightsaber attacks made against a beast with a Dark Side Score of 1+.

### Lightsaber Combat

#### Shoto Focus

- **Page:** 14
- **Prerequisites:** None.
- **Quick summary:** Whenever you wield both a one-handed lightsaber and a shoto (or guard shoto), you gain a +2 competence bonus on attack rolls made with the shoto.
- **Production record:** `e0f66d77a2b065a7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you wield both a one-handed lightsaber and a shoto (or guard shoto), you gain a +2 competence bonus on attack rolls made with the shoto.

### Beastwarden

#### Charm Beast

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** You can make a Use the Force check in place of a Persuasion check when attempting to change the attitude of an undomesticated creature with an Intelligence of 2 or less.
- **Production record:** `bab9a1ce285f98b9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can make a Use the Force check in place of a Persuasion check when attempting to change the attitude of an undomesticated creature with an Intelligence of 2 or less. Additionally, you do not take the normal -5 penalty on the check if the creature can’t speak or understand your language. (This talent is identical to the Dathomiri Witch talent of the same name, and both are considered to be the same talent for the purposes of satisfying prerequisites).

#### Bonded Mount

- **Page:** 18
- **Prerequisites:** Charm Beast
- **Quick summary:** Whenever you encounter a domesticated beast with a friendly or helpful attitude toward you, you can spend a Force Point as a full-round action to bond the beast to you as a mount.
- **Production record:** `9c88f3f82e6e2082`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you encounter a domesticated beast with a friendly or helpful attitude toward you, you can spend a Force Point as a full-round action to bond the beast to you as a mount. A bonded mount shares an empathic link with you, allowing you to sense its emotions as a free action. When you ride a bonded mount, your mount uses your Reflex Defense and Will Defense instead of its own, Additionally, if your mount has any special senses (such as scent, darkvision, or low-light vision) that you do not possess, you gain the benefits of its special senses as long as you are riding that mount.

#### Entreat Beast

- **Page:** 18
- **Prerequisites:** Charm Beast
- **Quick summary:** You can use the Force to convince a small beast to carry objects, deliver messages, or perform other minor tasks for you.
- **Production record:** `b15fa2f45baf55ea`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the Force to convince a small beast to carry objects, deliver messages, or perform other minor tasks for you. If you are near a beast that is at least indifferent to you (whether this be a pet you bring with you or a beast encountered in the wild), you can make a Use the Force check against the beast's Will Defense as a swift action. If your skill check equals or exceeds the beast's Will Defense, the beast performs one task for you from the following list: deliver one object from your person to another target within 30 squares of you; retrieve one unattended object within 30 squares of it and in its line of sight and bring it to you; or press a button, pull a lever, or otherwise perform some minor activation of an unattended item within 30 squares,

#### Soothing Presence

- **Page:** 18
- **Prerequisites:** Charm Beast
- **Quick summary:** Whenever you encounter a beast with an unfriendly attitude toward you, you automatically shift its attitude to indifferent (no skill check required).
- **Production record:** `0a65325a98b108a7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you encounter a beast with an unfriendly attitude toward you, you automatically shift its attitude to indifferent (no skill check required).

#### Wild Sense

- **Page:** 18
- **Prerequisites:** Charm Beast
- **Quick summary:** As a swift action once per turn, you can make a Use the Force check to touch the mind of a beast with an indifferent or better attitude toward you, provided it is within 12 squares of you and in your line of sight.
- **Production record:** `b6e75c52f5d66ade`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action once per turn, you can make a Use the Force check to touch the mind of a beast with an indifferent or better attitude toward you, provided it is within 12 squares of you and in your line of sight. When you do so, the beast makes an immediate active Perception check, and you are considered to perceive everything that the beast does, including noticing targets, as though you had made the check. Additionally, until the end of your turn, you are considered to have line of sight to anything the beast has line of sight to.

### Jedi Artisan

#### Call Weapon

- **Page:** 19
- **Prerequisites:** None.
- **Quick summary:** You can use the Move Light Object application of the Use the Force skill to call a lightsaber you built into your hand and ignite it as a free action.
- **Production record:** `bec7535325ee1eb1`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the Move Light Object application of the Use the Force skill to call a lightsaber you built into your hand and ignite it as a free action. The weapon must be in your line of sight to call it to your hand,

#### Lightsaber Specialist

- **Page:** 19
- **Prerequisites:** Masterwork Lightsaber
- **Quick summary:** Whenever you are armed with a lightsaber that you built, you gain a +2 morale bonus on Use the Force checks made to use the Block and Deflect talents.
- **Production record:** `6fe17dc4f0f03c12`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you are armed with a lightsaber that you built, you gain a +2 morale bonus on Use the Force checks made to use the Block and Deflect talents.

#### Masterwork Lightsaber

- **Page:** 19
- **Prerequisites:** None.
- **Quick summary:** Whenever you build a lightsaber, you do so with such expertise that it makes the weapon even more refined and elegant.
- **Production record:** `a64c01df9eba3147`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you build a lightsaber, you do so with such expertise that it makes the weapon even more refined and elegant. When you build a lightsaber, you can choose to add one extra accessory to the lightsaber at the time of creation, and when you hit a target with a lightsaber that you built, you can always choose to reroll one damage die from your damage roll, but you must keep the second result, even if it is worse. In addition, you can mentor another character while he constructs his own lightsaber. When you do so, you reduce the Use the Force check DC for constructing the lightsaber by -5.

#### Perfect Attunement

- **Page:** 19
- **Prerequisites:** Masterwork Lightsaber
- **Quick summary:** Whenever you spend a Force Point to add to an lightsaber attack roll made with a lightsaber that you built, you can add that same amount to the damage if the attack hits.
- **Production record:** `c67e45ac79e6f0d7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you spend a Force Point to add to an lightsaber attack roll made with a lightsaber that you built, you can add that same amount to the damage if the attack hits.

#### Quick Modification

- **Page:** 19
- **Prerequisites:** Masterwork Lightsaber
- **Quick summary:** You can spend 1 minute modifying a lightsaber you have built, removing one accessory and putting a different one in its place.
- **Production record:** `ac11f849b15c784c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend 1 minute modifying a lightsaber you have built, removing one accessory and putting a different one in its place. Gamemasters may rule that some modifications cannot be added or removed in this way due to rarity of materials or the difficulty of the modification (such as adding or removing the electrum detail)

### Jedi Instructor

#### Apprentice Boon

- **Page:** 19
- **Prerequisites:** None.
- **Quick summary:** Whenever an ally within 12 squares with a lower Use the Force skill bonus than you makes a Use the Force check, you can spend a Force Point as a reaction to add to that Use the Force check.
- **Production record:** `53c5a847e3396d13`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever an ally within 12 squares with a lower Use the Force skill bonus than you makes a Use the Force check, you can spend a Force Point as a reaction to add to that Use the Force check. Use your level to determine how many dice to roll for the Force Point.

#### Share Force Secret

- **Page:** 19
- **Prerequisites:** Must know at least 1 Force secret
- **Quick summary:** When you take this talent, choose one Force secret that you know.
- **Production record:** `2dc6ad1667133f2d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you take this talent, choose one Force secret that you know. Once per turn as a swift action, you can grant the use of this Force secret to one ally within 12 squares of you who is trained in the Use the Force skill. The target gains the benefit of this secret until the end of your next turn.

#### Share Force Technique

- **Page:** 20
- **Prerequisites:** Must know at least 1 Force Technique
- **Quick summary:** When you take this talent, choose one Force technique that you know.
- **Production record:** `7d02251f13fd5645`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you take this talent, choose one Force technique that you know. Once per turn asa swift action, you can grant the use of this Force technique to one ally within 12 squares of you who is trained in the Use the Force skill. The target gains the benefit of this technique until the end of your next turn. You cannot choose the Force Point Recovery technique for this talent.

#### Share Talent

- **Page:** 20
- **Prerequisites:** At least one talent from the Lightsaber Combat, Duelist, or Lightsaber Forms talent tree
- **Quick summary:** Choose a talent that you already possess.
- **Production record:** `2f00c50f3bf6bf5a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Choose a talent that you already possess. The talent must be from the Lightsa-ber Combat talent tree, the Duel-ist talent tree, or the Lightsaber Forms talent tree. Once per day as a standard action, you can spend a Force Point to impart the benefits of the chosen talent to one or more allies, effectively granting them the talent (even if they don't meet the prerequisites), An ally must be within 12 squares of you and must be able to see and hear you to gain the talent; once gained, its benefits last until the end of the encounter. You can share the talent with a number of allies equal to one-haIf your class level, rounded down. Only allies who are trained in the Use the Force skill can gain the benefits of the shared talent. A Twi'Ler Jeo! INsTRUCTOR. You can take this talent multiple times. Each time you do so, you must select a different talent to share with this ability. You can share each talent with your allies only once per day.

#### Transfer Power

- **Page:** 20
- **Prerequisites:** Force Training feat
- **Quick summary:** As a standard action, you can spend any one use of a Force power currently in your Force suite, adding a use of that power to the Force suite of any ally trained in the Use the Force skill.
- **Production record:** `488aaac69a9829bc`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, you can spend any one use of a Force power currently in your Force suite, adding a use of that power to the Force suite of any ally trained in the Use the Force skill. The ally must be within 12 squares of you and in your line of sight. When your ally uses that power, it disappears from his or her Force suite. If the ally does not use the Force power before the end of the encounter, it is permanently removed from his or her Force suite.

### Jedi Investigator

#### Echoes in the Force

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** You can use the farseeing power on a location instead of on an individual creature, peering into the location's past to view events that occurred there.
- **Production target:** CREATE `e26abfa7fe650912`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can use the farseeing power on a location instead of on an individual creature, peering into the location's past to view events that occurred there. Unlike the normal use of the farseeing power, you are actually looking into the location's past (at a time you designate), and you must be standing in the location being viewed. The target DC for your Use the Force check is 20, +1 for each day into the past that you attempt to scry. When you look into the past, you need only specify a time in a number of days, as you can sense tremors in the Force that focus your visions on meaningful events that day.

#### Jedi Quarry

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** As a swift action, you designate a single target creature as the focus of your attentions.
- **Production record:** `dfb9e58c7bcb095c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you designate a single target creature as the focus of your attentions. You gain a +2 bonus to your speed any time you spend a move action to move, provided that you end your movement adjacent to the target. You retain this bonus (and may not use this talent again) until your target surrenders, is reduced to 0 hit points, or moves to the bottom of the condition track, or until the encounter ends.

#### Prepared for Danger

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** Whenever you have at least one unspent farseeing power in your Force suite, you can spend that farseeing power to regain any one other Force power as a swift action.
- **Production record:** `aa5b9fe99274274a`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you have at least one unspent farseeing power in your Force suite, you can spend that farseeing power to regain any one other Force power as a swift action.

#### Sense Deception

- **Page:** 20
- **Prerequisites:** None.
- **Quick summary:** Whenever someone makes a Deception or Persuasion skill check against your Will Defense, you can make a Use the Force check, replacing your Will Defense with the result of your Use the Force check if it is higher.
- **Production record:** `467accea4a3c8cbd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever someone makes a Deception or Persuasion skill check against your Will Defense, you can make a Use the Force check, replacing your Will Defense with the result of your Use the Force check if it is higher.

#### Unclouded Judgment

- **Page:** 20
- **Prerequisites:** Sense Deception
- **Quick summary:** Whenever you are the target of a mind-affecting Force power or talent, you can spend a Force Point as a reaction to negate the effects of that Force power or talent (no skill check required).
- **Production target:** CREATE `7f5aac5b3a2d0f5d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you are the target of a mind-affecting Force power or talent, you can spend a Force Point as a reaction to negate the effects of that Force power or talent (no skill check required).

### Jedi Weapon Master

#### Combat Trance

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** Whenever you use the battle strike power, you gain the power's bonus on attack rolls on your first melee attack made each round until the end of the encounter.
- **Production record:** `675bfa10691b60f6`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you use the battle strike power, you gain the power's bonus on attack rolls on your first melee attack made each round until the end of the encounter. If you do not attack in a round, this effect ends.

#### Improvised Weapon Master

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** You take no penalty on attack rolls with improvised weapons.
- **Production target:** CREATE `a7bb794bf2c385d8`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You take no penalty on attack rolls with improvised weapons.

#### Shoto Pin

- **Page:** 21
- **Prerequisites:** Block
- **Quick summary:** Whenever you are wielding a shoto and success-fully use the Block talent to negate a melee attack, the attacker can make no further melee attacks until the start of its next turn or until you are no longer adjacent to it.
- **Production record:** `ab4b51be30dfa9bc`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you are wielding a shoto and success-fully use the Block talent to negate a melee attack, the attacker can make no further melee attacks until the start of its next turn or until you are no longer adjacent to it.

#### Twin Weapon Mastery

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** Whenever you use the Twin Weapon Style talent, you can move 2 squares between each attack.
- **Production record:** `cb4984135c665c4b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you use the Twin Weapon Style talent, you can move 2 squares between each attack. This movement does not provoke attacks of opportunity.

#### Twin Weapon Style

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** As a standard action, whenever you are wielding two weapons (or a double weapon), you can make one attack with each weapon (or each end of a double-weapon).
- **Production record:** `5ea9a4c30dff1ac8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a standard action, whenever you are wielding two weapons (or a double weapon), you can make one attack with each weapon (or each end of a double-weapon). Each attack must be against a different target

### Mystic

#### Channel Vitality

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** You can fuel your mastery of the Force with your own vitality.
- **Production record:** `cddfb9833c7d3344`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can fuel your mastery of the Force with your own vitality. As a swift action, you can move -1 step down the condition track to gain a temporary Force Point. This temporary Force Point lasts until the end of your turn, at which point it is lost if it has not been used.

#### Closed Mind

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** Whenever a creature uses a mind-affecting effect on you that targets your Will Defense, it must roll the attack roll or skill check twice, taking the lower result.
- **Production record:** `084423db749d2bb3`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever a creature uses a mind-affecting effect on you that targets your Will Defense, it must roll the attack roll or skill check twice, taking the lower result.

#### Esoteric Technique

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** When you spend a Force Point to activate a Force technique or Force secret, you gain bonus hit points equal to 10 + your class level until the end of the encounter.
- **Production record:** `08e904def2f9ea5c`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you spend a Force Point to activate a Force technique or Force secret, you gain bonus hit points equal to 10 + your class level until the end of the encounter.

#### Mystic Mastery

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** Whenever you gain a level, you also gain a number of additional Force Points equal to the number of Force talents you possess (maximum +6).
- **Production record:** `4ec766d6818c373f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you gain a level, you also gain a number of additional Force Points equal to the number of Force talents you possess (maximum +6).

#### Regimen Aptitude

- **Page:** 18
- **Prerequisites:** Force Regimen Mastery (see page 23)
- **Quick summary:** You gain a +5 Force bonus on skill checks made to perform a Force regimen (see page 10).
- **Production target:** CREATE `36e44f2c3831eb02`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You gain a +5 Force bonus on skill checks made to perform a Force regimen (see page 10).

### Sith Alchemy

#### Cause Mutation

- **Page:** 21
- **Prerequisites:** Sith Alchemy
- **Quick summary:** You can use your mastery of Sith alchemy to create mutated abominations.
- **Production record:** `c59de6f440c92832`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use your mastery of Sith alchemy to create mutated abominations. You must have access to a willing (or unconscious) creature to which you will apply the Sith Abomination template (see the side-bar) or the Chrysalis Beast template (see page 133). You also need a medical lab outfitted for the process, which requires a number of days equal to the creature's modified CL. You must spend a Force Point at the completion of the process to complete the transformation. A creature you have mutated is considered to be a domesticated creature, but for you only (unless it was already a domesticated creature before its mutation).

#### Rapid Alchemy

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** Asa standard action, you can perform minor alchemical alterations to a melee weapon you wield.
- **Production record:** `69420a9a5ff5d8b9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Asa standard action, you can perform minor alchemical alterations to a melee weapon you wield. For the remainder of the encounter, you gain a +2 equipment bonus on attack rolls with that weapon, Addition-ally, once before the end of the encounter, you can sacrifice this bonus as a free action to gain a +5 equipment bonus on a single damage roll you make with that weapon.

#### Sith Alchemy

- **Page:** 21
- **Prerequisites:** None.
- **Quick summary:** Use Sith alchemy to create Sith amulets, dark armor, Sith talismans, and Sith weapons; each transformation increases your Dark Side Score by 1.
- **Production record:** `eb4f3e8660bc476589d0323d4cc00845`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Your knowledge of Sith alchemy allows you to imbue certain objects with the power of the dark side. You can perform any of the following alchemical transformations, though each time you do so, increase your Dark Side Score by 1.

Create Sith Amulet: You can create a Sith amulet. The creation of a Sith amulet requires 25,000 credits' worth of gems and other raw materials, and the creation process takes 1 week (this work can be spread out over several sessions and need not be consecutive). At the end of the process, you must spend a Force Point to complete the Sith amulet, after which point it functions exactly as a Sith amulet (see page 68).

Create Sith Armor: You can transform a suit of normal battle armor into the dark armor worn by Sith Lords. You must have a suit of battle armor to transform into the dark armor (light battle armor becomes light dark armor, medium battle armor becomes medium dark armor, and heavy battle armor becomes heavy dark armor). The transformation process takes 1 day for light dark armor, 2 days for medium dark armor, and 3 days for heavy dark armor. You must spend a Force Point at the end of the creation process to complete the armor's transformation.

Create Sith Talisman: You can spend 1 Force Point to imbue a portable object with the dark side, creating a Sith talisman that provides offensive strength to a Force power. Creating the talisman takes a full-round action. While you wear or carry the talisman on your person, you add 1d6 to your damage with Force powers. You increase your Dark Side Score by 1 when you first wear or carry a Sith talisman. You can have only one Sith talisman active at any given time, and if it is destroyed, you cannot create another one for 24 hours.

Create Sith Weapon: You can alchemically treat a simple melee weapon or an advanced melee weapon, turning it into a Sith weapon. You must spend a Force Point and spend 1 hour imbuing the weapon with the properties of a Sith alchemical weapon. A lightsaber does not ignore the Sith weapon's DR, and characters who are proficient in the weapon's use can treat it as a lightsaber for the purposes of the Block, Deflect, and Redirect Shot talents (and any talents that have those Jedi talents as a prerequisite). Additionally, as a swift action, the wielder of a Sith weapon can spend a Force Point to gain a bonus equal to his Dark Side Score to the damage of his next attack made with the weapon before the end of the encounter. This increases the wielder's Dark Side Score by 1.

#### Sith Alchemy Specialist

- **Page:** 22
- **Prerequisites:** Sith Alchemy
- **Quick summary:** Spend a Force Point and 1 hour to give a Sith-alchemy object one trait from Table 1-1, increasing your Dark Side Score by 1.
- **Production record:** `9bee4563b328def7`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can modify an object with Sith alchemy so that it gains a specific trait. Specific traits are listed on Table 1-1. You can only perform one modification at a time. Unless otherwise noted, you cannot grant more than one benefit to a single object, and you cannot apply the same benefit more than once. You must spend a Force Point and devote 1 hour of uninterrupted work to apply a trait to the relevant object, and when you do so, you increase your Dark Side Score by 1.

### Telepath

#### Mind Probe

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** When you touch a living creature with an Intelligence of 3 or higher, you can use the Force to probe its mind for secrets.
- **Production record:** `ccaa66ed749e3317`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you touch a living creature with an Intelligence of 3 or higher, you can use the Force to probe its mind for secrets. You must be adjacent to the target, and using the mind probe is a full-round action. If the target is unwilling, you must succeed on a Use the Force check, equal ing or exceeding the target's Will Defense. This ability otherwise functions exactly as the Gather Information skill's Learn News and Rumors, Learn Secret Information, and Locate Individual applications. Your Use the Force check must still exceed the base Gather Information skill DCs in order to retrieve the information you seek, but you need not pay anything in bribes, and you retrieve the information as a part of the full-round action. Failing the skill check by 5 or more does not cause someone to notice that you are seeking the information.

#### Perfect Telepathy

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** You can communicate in full sentences and complete thoughts when you use the Telepathy aspect of the Use the Force skill, instead of just in basic phrases.
- **Production record:** `2da74bc3f4d45d2d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can communicate in full sentences and complete thoughts when you use the Telepathy aspect of the Use the Force skill, instead of just in basic phrases. However, the target of your telepathy can still only communicate in basic emotions or single thoughts.

#### Psychic Citadel

- **Page:** 18
- **Prerequisites:** None.
- **Quick summary:** You gain a Force bonus to your Will Defense equal to your class level.
- **Production record:** `546034f073eab1fd`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a Force bonus to your Will Defense equal to your class level.

#### Psychic Defenses

- **Page:** 18
- **Prerequisites:** Psychic Citadel
- **Quick summary:** Whenever another creature targets you with a Force power with the [mind-affecting] descriptor, it automatically takes Force damage equal to 146 x your Wisdom modifier (minimum x1).
- **Production record:** `202a117b1b203951`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever another creature targets you with a Force power with the [mind-affecting] descriptor, it automatically takes Force damage equal to 146 x your Wisdom modifier (minimum x1).

#### Telepathic Intruder

- **Page:** 19
- **Prerequisites:** None.
- **Quick summary:** After successfully using a mind-affecting Force power, gain +2 on checks to use mind-affecting Force powers and talents against that target until the end of your next turn.
- **Production record:** `443bfe7fa33dd627`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you use a Force power with the [mind-affecting] descriptor successfully against a target, until the end of your next turn you gain a +2 Force bonus on skill checks made to activate mind-affecting Force powers and talents against that same target.

### Aingtii Monk

#### Aura of Freedom

- **Page:** 73
- **Prerequisites:** None.
- **Quick summary:** All allies within 6 squares of you gain a +5 Force bonus on skill checks or grapple checks made to escape grapples or other immobilizing hazards.
- **Production record:** `437443efb52249aa`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

All allies within 6 squares of you gain a +5 Force bonus on skill checks or grapple checks made to escape grapples or other immobilizing hazards. Additionally, whenever an ally within 6 squares of you is moved against its will (such as by the move object Force power or the Bantha Rush feat), you can spend a Force Point as a reaction to negate the forced movement entirely.

#### Folded Space Mastery

- **Page:** 73
- **Prerequisites:** Fold space
- **Quick summary:** While you are the pilot of a vehicle, you can use the fold space Force power (see page 25) to move the vehicle across long distances.
- **Production target:** CREATE `0bb459ef9331df9d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

While you are the pilot of a vehicle, you can use the fold space Force power (see page 25) to move the vehicle across long distances. If your Use the Force check to activate the power is sufficient to move an object of the same size as your vehicle (or larger), you can use the power to move your vehicle and all of its occupants safely to the desired destination. You use your Use the Force check result instead of a Use Com-puter check, as though calculating a hyperspace jump. This otherwise uses the normal rules for hyperspace travel, though travel is instantaneous and requires no hyperdrive.

#### Liberate

- **Page:** 73
- **Prerequisites:** Aura of Freedom
- **Quick summary:** Spend a Force Point as a swift action to free a nearby ally from a grab, grapple, or immobilizing effect and let the ally move up to half speed as a reaction.
- **Production target:** CREATE `44f9c0fb687671eb`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can spend a Force Point as a swift action to designate one ally within 12 squares of you and in line of sight that is currently grabbed, grappled, or immobilized; that target automatically escapes from the grab or grapple (or the immobilizing effect is removed), and the target can move up to half its speed immediately as a reaction. This movement does not provoke attacks of opportunity.

#### Many Shades of the Force

- **Page:** 73
- **Prerequisites:** Force Training
- **Quick summary:** Choose one Force power with the [dark side] or [light side] descriptor in your Force suite.
- **Production target:** CREATE `a0147b10aa17816f`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Choose one Force power with the [dark side] or [light side] descriptor in your Force suite. That power is no longer considered to have that descriptor for you.

#### Spatial Integrity

- **Page:** 73
- **Prerequisites:** None.
- **Quick summary:** While you are aboard a vehicle, you can spend a Force Point as a reaction to the vehicle taking damage; you make a Use the Force check and reduce the damage the vehicle takes by the check result.
- **Production target:** CREATE `ed756bf97aad8264`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

While you are aboard a vehicle, you can spend a Force Point as a reaction to the vehicle taking damage; you make a Use the Force check and reduce the damage the vehicle takes by the check result. This reduction occurs after both DR and SR are applied to the damage.

### Alter

#### Illusion Bond

- **Page:** 15
- **Prerequisites:** Illusion
- **Quick summary:** Whenever you create an illusion of a humanoid using the Illusion talent, you are able to see and hear as though you were standing in the space occupied by your illusion.
- **Production record:** `cd4803e05638b4ab`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you create an illusion of a humanoid using the Illusion talent, you are able to see and hear as though you were standing in the space occupied by your illusion.

#### Influence Savant

- **Page:** 15
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a swift action, you can return ‘one Force power with the [mind-affecting] descriptor to your Force suite without spending a Force Point.
- **Production record:** `ced81064716debaa`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a swift action, you can return ‘one Force power with the [mind-affecting] descriptor to your Force suite without spending a Force Point. You can select this talent multiple times. Each time you select it, you can use it one additional time per encounter.

#### Link

- **Page:** 15
- **Prerequisites:** None.
- **Quick summary:** You can lend your strength in the Force to another character, creating a bond between you through which the Force flows.
- **Production record:** `df1bdd9ca78ad14d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can lend your strength in the Force to another character, creating a bond between you through which the Force flows. As a standard action, you can designate one willing ally within 12 squares of you and in your line of sight, This ally must be trained in the Use the Force skill. As long as you remain within 12 squares of each other, you can aid each other on Use the Force checks as a reaction. However, the character using the aid another reaction takes a -5 penalty on all Use the Force checks until the end of his next turn. This link lasts until the end of the encounter, or until you or your ally ends the link (a free action). You can have only one active link at a time.

#### Masquerade

- **Page:** 15
- **Prerequisites:** Illusion
- **Quick summary:** You can use the Illusion talent to create a disguise for yourself.
- **Production record:** `86fbb269a17a8c5e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the Illusion talent to create a disguise for yourself. You use the result of your Use the Force check made to create the illusion for the purposes of creating a deceptive appearance, as per the application of the Deception skill. All other rules and restrictions for using the Illusion talent still apply.

#### Suppress Force

- **Page:** 15
- **Prerequisites:** Influence Savant, mind trick
- **Quick summary:** You can convince others that they have been cut off from the Force, even if that is not the case, preventing them from making Use the Force checks.
- **Production record:** `ec3e6a05561ddc07`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can convince others that they have been cut off from the Force, even if that is not the case, preventing them from making Use the Force checks. Whenever a target with an Intelligence of 3 or higher within 12 squares of you and in your line of sight attempts to make a Use the Force check for any reason, you can spend one use of the mind trick Force power as a reaction. You make a Use the Force check, and if your Use the Force check equals or exceeds the target's Use the Force check result, that target's skill check is negated, and the action it was attempting fails.

### Baran Do Sage

#### Enhanced Danger Sense

- **Page:** 75
- **Prerequisites:** None.
- **Quick summary:** You gain a +10 bonus on Perception checks made to avoid being surprised.
- **Production record:** `f29c25c955f24e57`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You gain a +10 bonus on Perception checks made to avoid being surprised. Additionally, you can spend a Force Point to act in the surprise round, even if you are surprised.

#### Expanded Horizon

- **Page:** 75
- **Prerequisites:** None.
- **Quick summary:** Whenever you use the Search Your Feelings applica-tion of the Use the Force skill, you can sense the consequences of your actions out to 1 hour into the future (instead of the normal 10 minutes).
- **Production target:** CREATE `ba7803cebc9caa0e`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you use the Search Your Feelings applica-tion of the Use the Force skill, you can sense the consequences of your actions out to 1 hour into the future (instead of the normal 10 minutes). You can spend a Force Point when you do so to expand this window out to 8 hours, or a Destiny Point to expand this window out to 24 hours.

#### Knowledge and Defense

- **Page:** 75
- **Prerequisites:** Enhanced Danger Sense
- **Quick summary:** You add your Wisdom bonus to your Reflex Defense whenever your Dexterity bonus would normally be denied to you.
- **Production target:** CREATE `9dbb669ad8788c96`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You add your Wisdom bonus to your Reflex Defense whenever your Dexterity bonus would normally be denied to you.

#### Planetary Attunement

- **Page:** 75
- **Prerequisites:** None.
- **Quick summary:** Whenever you arrive on a new planet, you can spend 10 minutes and a Force Point to acclimate yourself to the planet's unique ebb and flow of Force energy.
- **Production target:** CREATE `ee1ff1a4fc035bee`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you arrive on a new planet, you can spend 10 minutes and a Force Point to acclimate yourself to the planet's unique ebb and flow of Force energy. While on the planet, you gain a +2 Force bonus to all defenses against naturally occurring hazards on the world, your speed increases by 1 square, and you can sense what the weather will be like in the immediate area up to 24 hours in advance as a full-round action.

#### Precognitive Meditation

- **Page:** 75
- **Prerequisites:** None.
- **Quick summary:** Once per day, you can spend 10 minutes meditating to seek visions of the future.
- **Production target:** CREATE `413c9544030ba424`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Once per day, you can spend 10 minutes meditating to seek visions of the future. At that time, you can spend a Force Point as a part of this meditation. Once during the rest of the day, whenever you or a vehicle you pilot are the target of an attack, you can choose to negate that attack provided the attack roll is not a natural 20. At the end of the day, if you did not use this ability, you regain the Force Point spent on the meditation.

### Control

#### Channel Energy

- **Page:** 16
- **Prerequisites:** Negate energy
- **Quick summary:** After negate energy prevents energy-weapon damage, spend a Force Point as a reaction to immediately activate a Force power from your suite.
- **Production record:** `fb6b798fe0c6091f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you use the negate energy Force power to successfully negate the damage from an energy weapon attack, you can spend a Force Point as a reaction to immediately activate any Force power currently in your Force suite.

#### Force Harmony

- **Page:** 16
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, you can activate one Force talent that requires a Force Point to use without spending a Force Point New Dark Side Talents The following talents belong to the Dark Side talent tree (see page 101 of the Saga Edition core rulebook).
- **Production record:** `5b949c8cd8e78ee8`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, you can activate one Force talent that requires a Force Point to use without spending a Force Point New Dark Side Talents The following talents belong to the Dark Side talent tree (see page 101 of the Saga Edition core rulebook).

### Dark Side

#### Dark Side Savant

- **Page:** 16
- **Prerequisites:** None.
- **Quick summary:** Once per encounter as a swift action, you can return one Force power with the [dark side] descriptor to your Force suite without spending a Force Point.
- **Production record:** `b47beb909e6fce63`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter as a swift action, you can return one Force power with the [dark side] descriptor to your Force suite without spending a Force Point. You can select this talent multiple times. Each time you select it, you can use it one additional time per encounter.

#### Transfer Essence

- **Page:** 16
- **Prerequisites:** Dark Side Score equal to your Wisdom score
- **Quick summary:** When you die, you become a dark side spirit (see page 118) until the end of the encounter.
- **Production record:** `c1be1f29c00436d5`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you die, you become a dark side spirit (see page 118) until the end of the encounter. You continue to occupy a space in this form, but other creatures can occupy the same space or move through your space without impediment. As a standard action, you can attempt to possess an adjacent target. You must succeed on a Use the Force check against an adjacent target's Will Defense. If your check result equals or exceeds the target's Will Defense, you deal 8d6 points of stun damage to the target; if you reduce the target to 0 hit points or move it to the bottom of the condition track with this attack, you possess the target as though it were a willing host (see the dark spirit template for details). Alternately, as a standard action, you can transfer your essence into a single adjacent object, such as a holocron or a lightsaber. If you do so, you lie dormant within the object until another creature attempts to use that object, at which time you can emerge and attempt to possess the creature, as described above. If you do not possess a creature or object within 10 rounds of manifesting as a dark spirit, your spirit dissipates and ceases to exist.

### Guardian Spirit

#### Guardian Spirit

- **Page:** 16
- **Prerequisites:** None.
- **Quick summary:** You have a guardian spirit watching over you from the realm of the Force, providing you with insight and advice.
- **Production record:** `0b18181b971fc505`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You have a guardian spirit watching over you from the realm of the Force, providing you with insight and advice. Your guardian spirit might be an old mentor or an ancient member of your Force tradition who has chosen to guide you to your destiny. When you use the Search Your Feelings application of the Use the Force skill, you can instead choose to consult your guardian spirit. When you do so, you learn more than just whether the results of your actions will be favorable or unfavorable; you also learn the nature of any immediate consequences, including potential encounters, and whether or not certain actions will bring you closer to achieving your destiny. Additionally, you gain one bonus Force Point each day (available after you rest for at least 6 hours). This bonus Force Point can only be used to improve a Force power or activate a Force technique or a Force secret. If you do not spend your bonus Force Point in a given day, it is lost at the start of the next day.

#### Crucial Advice

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, when you fail a skill check, you can reroll the skill check with a +2 circumstance bonus.
- **Production record:** `20ce23e9cc418512`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, when you fail a skill check, you can reroll the skill check with a +2 circumstance bonus. (In the case of skill checks with multiple possible results, such as when activating a Force power with multiple effects, failing a skill check is defined achieving less than the minimum DC for that check.)

#### Distracting Apparition

- **Page:** 17
- **Prerequisites:** Manifest Guardian Spirit
- **Quick summary:** When you have a manifested guardian spirit, the spirit also discourages your enemies and distracts them from their goals.
- **Production record:** `b85b92b788f7fa54`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

When you have a manifested guardian spirit, the spirit also discourages your enemies and distracts them from their goals. Any enemy within 3 squares of your guardian spirit takes a -2 penalty to Will Defense and a -2 penalty on attack rolls against you.

#### Manifest Guardian Spirit

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point as a swift action to have your guardian spirit manifest for the duration of the encounter.
- **Production record:** `3449cb22b384498b`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can spend a Force Point as a swift action to have your guardian spirit manifest for the duration of the encounter. Your guardian spirit appears in any square within 6 squares of you. A guardian spirit occupies a space, but creatures can move through the guardian spirit without obstruction. As long as the guardian spirit remains within 12 squares of you, you gain a +1 morale bonus on attack rolls, a +2 morale bonus on Use the Force checks, and a +2 morale bonus to Will Defense. You can move the guardian spirit up to 6 squares as a swift action once per turn.

#### Vital Encouragement

- **Page:** 17
- **Prerequisites:** None.
- **Quick summary:** Once per encounter, your guardian spirit offers you vital encouragement, urging you to press on despite adversity.
- **Production record:** `1215e1c464a087b0`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Once per encounter, your guardian spirit offers you vital encouragement, urging you to press on despite adversity. As a free action, you gain bonus hit points equal to 10 + one-haIf your heroic level. Damage is subtracted from bonus hit points first, and any bonus hit points remaining at the end of the encounter are lost. New Sense Talents The following talents belong to the Sense talent tree (see page 101 of the Saga Edition core rulebook)

### Iron Knight

#### Droid Duelist

- **Page:** 79
- **Prerequisites:** None.
- **Quick summary:** Whenever you are wielding a lightsaber, you can spend a Force Point as a swift action to cause an opponent to be flat-footed against your next attack made with a lightsaber before the end of your turn.
- **Production record:** `b4ccb329f72bd67f`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you are wielding a lightsaber, you can spend a Force Point as a swift action to cause an opponent to be flat-footed against your next attack made with a lightsaber before the end of your turn.

#### Force Repair

- **Page:** 79
- **Prerequisites:** None.
- **Quick summary:** You can use the Force Trance application of the Use the Force skill to recover hit points through natural healing.
- **Production record:** `5731c9fdc0b11421`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the Force Trance application of the Use the Force skill to recover hit points through natural healing. You can also receive hit points from the vital transfer Force power. Whenever you receive bonus hit points from any source, you gain additional bonus hit points equal to your Charisma modifier (minimum +1).

#### Heal Droid

- **Page:** 79
- **Prerequisites:** Vital transfer
- **Quick summary:** You can use the vital transfer Force power to heal droids (including Shard-inhabited droids), which are normally immune to this power.
- **Production record:** `138586f784e21d7e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the vital transfer Force power to heal droids (including Shard-inhabited droids), which are normally immune to this power.

#### Mask Presence

- **Page:** 79
- **Prerequisites:** None.
- **Quick summary:** As a swift action, you become immune to the Sense Force application of the Use the Force skill, and appear to be nothing more than a regular droid in the Force.
- **Production record:** `6f7fa0ea2ad38e50`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you become immune to the Sense Force application of the Use the Force skill, and appear to be nothing more than a regular droid in the Force. If you make a Use the Force check or use any Force power or Force talent, this effect immediately ends.

#### Silicon Mind

- **Page:** 79
- **Prerequisites:** None.
- **Quick summary:** Other Force-users have a difficult time knowing how to influence you.
- **Production record:** `d2ffe0250af82d28`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Other Force-users have a difficult time knowing how to influence you. You can spend a Force Point as a reaction to gain a bonus to your Will Defense equal to your Charisma modifier (minimum +1) against all Use the Force checks until the end of your next turn.

### Matukai Adept

#### Body Control

- **Page:** 81
- **Prerequisites:** None.
- **Quick summary:** You can add your Charisma modifier instead of your Con-stitution modifier to your Fortitude Defense.
- **Production target:** CREATE `3148da1245711efd`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can add your Charisma modifier instead of your Con-stitution modifier to your Fortitude Defense. Additionally, you can spend a Force Point as a swift action to become immune to poison, radiation, and disease until the end of the encounter.

#### Physical Surge

- **Page:** 81
- **Prerequisites:** None.
- **Quick summary:** Whenever you roll an Initiative check at the start of combat, you can spend a swift action immediately, regardless of whether or not you are surprised.
- **Production target:** CREATE `e70fc01f9d76d984`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you roll an Initiative check at the start of combat, you can spend a swift action immediately, regardless of whether or not you are surprised.

#### Soft to Solid

- **Page:** 81
- **Prerequisites:** None.
- **Quick summary:** As a reaction when you are damaged by an attack, you can spend a Force Point to increase the rigidity of your skin, gaining DR 10 until the end of your next turn.
- **Production target:** CREATE `918e049da1550f2f`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a reaction when you are damaged by an attack, you can spend a Force Point to increase the rigidity of your skin, gaining DR 10 until the end of your next turn.

#### Wan-Shen Defense

- **Page:** 81
- **Prerequisites:** Proficient with the wan-shen (see page 54)
- **Quick summary:** As a swift action, you can use your wan-shen to parry your opponents’ attacks, gaining a +1 deflection bonus to your Reflex Defense against melee attacks until the start of your next turn.
- **Production target:** CREATE `abf877ec135d4f05`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action, you can use your wan-shen to parry your opponents’ attacks, gaining a +1 deflection bonus to your Reflex Defense against melee attacks until the start of your next turn. You must have your wan-shen in hand to use this talent, and you do not gain the deflection bonus if you are flat-footed or otherwise unaware of the incoming attack. You can take this talent multiple times; each time you take this talent, the deflection bonus increases by +1 (to a maximum of +3)

#### Wan-Shen Kata

- **Page:** 81
- **Prerequisites:** Proficient with the wan-shen (see page 54)
- **Quick summary:** You treat the wan-shen as a Medium weapon instead of a Large weapon.
- **Production record:** `ae3fd778e4a34798`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You treat the wan-shen as a Medium weapon instead of a Large weapon. You can use the Pin and Trip feats with a wan-shen, substituting your attack bonus with the wan-shen for your grapple check You must have your wan-shen in hand to use this talent. In addition, when you use the wan-shen as a double weapon, you reduce all attack penalties for attacking with both ends of the weapon by 1

#### Wan-Shen Mastery

- **Page:** 81
- **Prerequisites:** Proficient with the wan-shen, Wan-Shen Kata, base attack bonus +5
- **Quick summary:** As a standard action, you make two attacks with your wan-shen, each one against a different target within your reach.
- **Production target:** CREATE `de9a5e8ac3998301`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a standard action, you make two attacks with your wan-shen, each one against a different target within your reach. You must have your wan-shen in hand to use this talent.

### Sense

#### Instinctive Navigation

- **Page:** 17
- **Prerequisites:** Force Pilot
- **Quick summary:** You can substitute your Use the Force skill for any Use Computer check made to astrogate or operate sensors while you are the pilot of a vehicle.
- **Production record:** `2d392f2b63b738ed`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can substitute your Use the Force skill for any Use Computer check made to astrogate or operate sensors while you are the pilot of a vehicle.

#### Motion of the Future

- **Page:** 17
- **Prerequisites:** Force Perception
- **Quick summary:** As a swift action, you can peer into the future in search of signs of danger, removing one use of the farseeing Force power from your active suite (as though you had just activated the power).
- **Production record:** `ff2201a270efa29e`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can peer into the future in search of signs of danger, removing one use of the farseeing Force power from your active suite (as though you had just activated the power). Any time before the end of your next turn when you are the target of an attack or Force power, you can force your attacker to reroll the attack roll (or Use the Force check) against you, keeping the second result. This counts as using the farseeing Force power against the attacker, but this talent replaces the normal rules and effect of that power.

### Seyugi Dervish

#### Seyugi Cyclone

- **Page:** 83
- **Prerequisites:** None.
- **Quick summary:** If you are wielding no weapons (other than combat gloves or stun gauntlets), you can use the Whirlwind Attack feat as a standard action by spending a Force Point even if you do not posess the Whirlwind Attack feat.
- **Production record:** `cc90a9fc255f4dc4`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

If you are wielding no weapons (other than combat gloves or stun gauntlets), you can use the Whirlwind Attack feat as a standard action by spending a Force Point even if you do not posess the Whirlwind Attack feat. Additionally, this talent satisfies the prerequisites for the Whirlwind Attack feat.

#### Mobile Whirlwind

- **Page:** 83
- **Prerequisites:** Seyugi Cyclone
- **Quick summary:** Whenever you use the Whirlwind Attack feat, you can move up to your speed after the attack is resolved.
- **Production target:** CREATE `4a94affdfe899dcc`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you use the Whirlwind Attack feat, you can move up to your speed after the attack is resolved.

#### Repelling Whirlwind

- **Page:** 83
- **Prerequisites:** Seyugi Cyclone
- **Quick summary:** You gain a +2 circumstance bonus to Reflex Defense against any target hit by your Whirlwind Attack until the start of your next turn.
- **Production target:** CREATE `69420a430d38abc6`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You gain a +2 circumstance bonus to Reflex Defense against any target hit by your Whirlwind Attack until the start of your next turn.

#### Sudden Storm

- **Page:** 83
- **Prerequisites:** Seyugi Cyclone
- **Quick summary:** Spend a Force Point to replace the normal melee attack at the end of a charge with a Whirlwind Attack while unarmed.
- **Production target:** CREATE `e22615e71b4d2b5e`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Instead of a normal melee attack at the end of the charge, you can spend a Force Point to make a Whirlwind Attack (as per the feat) at the end of a charge, provided you are not wielding any weapons (except combat gloves or stun gauntlets).

#### Tempest Tossed

- **Page:** 83
- **Prerequisites:** Seyugi Cyclone
- **Quick summary:** When you damage a target with a Whirlwind Attack, you can choose to move that target 1 square in any direction as a free action.
- **Production target:** CREATE `2c33256a6f6be51c`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you damage a target with a Whirlwind Attack, you can choose to move that target 1 square in any direction as a free action. You can't move a target that's being grabbed or grappled, and you can't move the opponent into a solid object or another creature's fighting space. This forced movement does not provoke attacks of opportunity.

### Tyia Adept

#### Cycle of Harmony

- **Page:** 87
- **Prerequisites:** Tyia Adept
- **Quick summary:** When one nearby ally is harmed or moved down the condition track, give another nearby ally bonus hit points as a reaction.
- **Production target:** CREATE `fafcbb9f270a8832`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When an ally within 12 squares of you and in your line of sight takes damage or moves down the condition track by any means, you can designate a different ally within 12 squares of you and in your line of sight as a reaction. The ally you designate gains bonus hit points equal to 5 + your Charisma modifier (minimum +1). Damage is subtracted from bonus hit points first, and any bonus hit points remaining at the end of the encounter are lost.

#### Force Stabilize

- **Page:** 87
- **Prerequisites:** Tyia Adept
- **Quick summary:** You can designate an ally within 12 squares of you and in your line of sight once per turn as a swift action; that ally immediately takes its second wind if it has not yet done so in this encounter.
- **Production target:** CREATE `bdb50f9c95d57965`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can designate an ally within 12 squares of you and in your line of sight once per turn as a swift action; that ally immediately takes its second wind if it has not yet done so in this encounter.

#### Repel Discord

- **Page:** 87
- **Prerequisites:** None.
- **Quick summary:** When targeted by a dark-side Force power, spend a Force Point to penalize the users activation check by its Dark Side Score.
- **Production target:** CREATE `b0e098c0c1117b5a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you are targeted by a Force power with the [dark side] descriptor, you can spend a Force Point as a reaction to give the creature using that Force Power against you a penalty on its Use the Force check to activate the power equal to its Dark Side Score.

#### Stifle Conflict

- **Page:** 87
- **Prerequisites:** None.
- **Quick summary:** You can choose to have any Force power you activate deal stun damage instead of normal damage.
- **Production target:** CREATE `91337685961e598b`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can choose to have any Force power you activate deal stun damage instead of normal damage.

#### Tyia Adept

- **Page:** 87
- **Prerequisites:** None.
- **Quick summary:** As a swift action, you can spend a Force Point to designate one nondroid ally within 12 squares of you and in your line of sight.
- **Production record:** `8f64ec5c81784b2d`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

As a swift action, you can spend a Force Point to designate one nondroid ally within 12 squares of you and in your line of sight. Until the end of your next turn, whenever you or the targeted ally takes damage from any source, you take half of the damage and your ally takes half of the damage. This halving of damage takes place before the damage is compared to your respective damage thresholds.

### Warden Of The Sky

#### Brutal Unarmed Strike

- **Page:** 89
- **Prerequisites:** Telekinetic Strike
- **Quick summary:** Whenever you roll the damage for an unarmed attack, you reroll any dice that come up with a result of 1.
- **Production target:** CREATE `90630f61edcdb6db`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you roll the damage for an unarmed attack, you reroll any dice that come up with a result of 1.

#### Martial Resurgence

- **Page:** 89
- **Prerequisites:** None.
- **Quick summary:** You recover all spent Force powers, adding them to your Force suite again, whenever you roll a natural 20 on an unarmed attack.
- **Production target:** CREATE `5ea93db75c485810`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You recover all spent Force powers, adding them to your Force suite again, whenever you roll a natural 20 on an unarmed attack.

#### Rebound Leap

- **Page:** 89
- **Prerequisites:** None.
- **Quick summary:** Whenever you reduce an opponent to 0 hit points with an unarmed attack, you can make a Jump check as a free action, moving a distance as determined by the results of your Jump check.
- **Production target:** CREATE `6231c28737053444`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you reduce an opponent to 0 hit points with an unarmed attack, you can make a Jump check as a free action, moving a distance as determined by the results of your Jump check. You can use the surge power as normal to enhance this Jump check, increasing the distance you move.

#### Simultaneous Strike

- **Page:** 89
- **Prerequisites:** Base attack bonus +5
- **Quick summary:** As a standard action, you can make two unarmed attacks, each against different targets.
- **Production target:** CREATE `788ee1bd17672ec9`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a standard action, you can make two unarmed attacks, each against different targets.

#### Telekinetic Strike

- **Page:** 89
- **Prerequisites:** None.
- **Quick summary:** Whenever you make a successful unarmed attack, you can add the result of a Force Point roll to the damage instead of the attack roll (see “Using Force Points" on page 93 of the Saga Edition core rulebook).
- **Production record:** `196b54d69bd54983`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

Whenever you make a successful unarmed attack, you can add the result of a Force Point roll to the damage instead of the attack roll (see “Using Force Points" on page 93 of the Saga Edition core rulebook).

#### Telekinetic Throw

- **Page:** 89
- **Prerequisites:** Throw feat
- **Quick summary:** Whenever you successfully use the Throw feat, your opponent falls prone in any space you desire up to 3 squares beyond your reach.
- **Production target:** CREATE `a9cbbb79f3b87970`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you successfully use the Throw feat, your opponent falls prone in any space you desire up to 3 squares beyond your reach.

### White Current Adept

#### Force Immersion

- **Page:** 77
- **Prerequisites:** White Current Adept, trained in Stealth
- **Quick summary:** You can use the sneak application of the Stealth skill to hide from electronic surveillance and sensors.
- **Production record:** `d2aabaa6848b4a09`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can use the sneak application of the Stealth skill to hide from electronic surveillance and sensors. Any opponent attempting to detect you with sensors or electronic surveillance must beat your Stealth check with a Use Computer check. You need only roll a single Stealth check to avoid both electronic notice and notice by conventional means, using the same result as the DC for both Perception checks and Use Computer checks made to detect you.

#### Immerse Another

- **Page:** 77
- **Prerequisites:** White Current Adept, trained in Stealth
- **Quick summary:** Use your Stealth or Use the Force result for an adjacent ally when hiding or avoiding Sense Force; spend a Force Point to affect all adjacent allies.
- **Production target:** CREATE `357cd59f1b0cb306`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

Whenever you make a Stealth check to sneak, you can use your check result in the place of one adjacent ally’s Stealth check to sneak (additionally, if you have the Force Immersion talent, that talent applies to the designated ally as well). Similarly, you can use your Use the Force check result in the place of an adjacent ally’s Use the Force check result to avoid detection by the Sense Force application of the skill. You can spend a Force Point to have this ability apply to all adjacent allies instead of just one.

#### Ride the Current

- **Page:** 77
- **Prerequisites:** None.
- **Quick summary:** As a reaction to being damaged by an attack or Force power, you can spend a Force Point to gain total concealment from all targets until the end of your next turn.
- **Production target:** CREATE `0273dfee9b1eb522`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a reaction to being damaged by an attack or Force power, you can spend a Force Point to gain total concealment from all targets until the end of your next turn. Additionally, if you have not yet taken your second wind, you can do so immediately as a part of this reaction.

#### Surrender to the Current

- **Page:** 77
- **Prerequisites:** None.
- **Quick summary:** As a swift action, you can choose to sur-render to the White Current and allow it to flow around you and fuel your Force powers.
- **Production target:** CREATE `cb2d2947f45b3df5`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a swift action, you can choose to sur-render to the White Current and allow it to flow around you and fuel your Force powers. Until the end of the encounter, you cannot use Force powers that do not have "You" as the sole target. However, once per turn as a swift action, you can recover one spent Force power that has “You" as the sole target without spending a Force Point, adding that power back to your Force suite.

#### White Current Adept

- **Page:** 77
- **Prerequisites:** None.
- **Quick summary:** You can make a Use the Force check in place of a Stealth check.
- **Production record:** `50598d8920bd46e9`
- **Phase 3B disposition:** `UPDATE_CONTENT`

**Canonical rules text**

You can make a Use the Force check in place of a Stealth check. You are considered trained in the Stealth skill. If you are entitled to a Stealth check reroll, you can reroll your Use the Force check instead (subject to the same circumstances and limitations).

### Shapers of Kro Var

#### Combustion

- **Page:** 85
- **Prerequisites:** Force Training
- **Quick summary:** You can spend a Force Point as a swift action to add 146 points of fire damage to any Force power that causes damage to a single target.
- **Production target:** CREATE `78a296a68645450b`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can spend a Force Point as a swift action to add 146 points of fire damage to any Force power that causes damage to a single target. A target that takes fire damage also catches on fire (see page 256 of the Saga Edition core rulebook).

#### Earth Buckle

- **Page:** 85
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point as a swift action to create a 3x3 square area of difficult terrain centered on you.
- **Production target:** CREATE `2f9bd5b93d0eb82a`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can spend a Force Point as a swift action to create a 3x3 square area of difficult terrain centered on you. You ignore any penalties for moving on difficult terrain that you create using this talent.

#### Fluidity

- **Page:** 85
- **Prerequisites:** None.
- **Quick summary:** You use your Use the Force check modifier instead of your Acro-batics check modifier when making Acrobatics checks.
- **Production target:** CREATE `d257d180378c8f9d`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You use your Use the Force check modifier instead of your Acro-batics check modifier when making Acrobatics checks. If you are entitled to an Acrobatics check reroll, you may reroll your Use the Force check instead (subject to the same circumstances and limitations). Additionally, when you attempt a grapple or attempting to break free of a grapple, you can spend a Force Point to be treated as if you were one size category larger.

#### Thunderclap

- **Page:** 85
- **Prerequisites:** Bantha Rush, Force Training
- **Quick summary:** When you use a Force power that deals damage, you can use the Bantha Rush feat against that target as though you had made a melee attack.
- **Production target:** CREATE `07680913de8adc53`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you use a Force power that deals damage, you can use the Bantha Rush feat against that target as though you had made a melee attack.

#### Wind Vortex

- **Page:** 85
- **Prerequisites:** None.
- **Quick summary:** You can spend a Force Point as a swift action to surround yourself with whirling winds.
- **Production target:** CREATE `addff1294f534ac7`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can spend a Force Point as a swift action to surround yourself with whirling winds. You gain concealment from all other targets and gain a +2 circumstance bonus to Reflex Defense against thrown weapons. This effect lasts until the end of the encounter.

### Zeison Sha Warrior

#### Discblade Arc

- **Page:** 91
- **Prerequisites:** Proficiency with the discblade
- **Quick summary:** As a full-round action, you can make an area attack with your discblade, striking three targets, all of which must be within point blank range for your discblade.
- **Production target:** CREATE `69380dec0c195e82`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

As a full-round action, you can make an area attack with your discblade, striking three targets, all of which must be within point blank range for your discblade. This attack uses the area attack rules; you make one attack roll and apply the result to every target you designate.

#### Distant Discblade Throw

- **Page:** 91
- **Prerequisites:** Proficiency with the discblade
- **Quick summary:** When you use a discblade, you treat it as a pistol (instead of a thrown weapon) for the purpose of determining range.
- **Production target:** CREATE `b2c9221dafb87277`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you use a discblade, you treat it as a pistol (instead of a thrown weapon) for the purpose of determining range.

#### Recall Discblade

- **Page:** 91
- **Prerequisites:** Proficiency with the discblade
- **Quick summary:** When you make a ranged attack with a discblade (or use the Discblade Arc talent above), after the attack is resolved you can make a DC 15 Use the Force check to call the weapon back to your hand as a free action.
- **Production target:** CREATE `72ac4192d35d3ae8`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

When you make a ranged attack with a discblade (or use the Discblade Arc talent above), after the attack is resolved you can make a DC 15 Use the Force check to call the weapon back to your hand as a free action.

#### Telekinetic Vigilance

- **Page:** 91
- **Prerequisites:** Intercept
- **Quick summary:** You can return the intercept Force power to your Force suite as a swift action without spending a Force Point.
- **Production target:** CREATE `b7b402e8065f4fa8`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You can return the intercept Force power to your Force suite as a swift action without spending a Force Point.

#### Weapon Specialization (discblade)

- **Page:** 91
- **Prerequisites:** Proficiency with the discblade, Weapon Focus (discblade)
- **Quick summary:** You gain a +2 bonus on melee damage rolls with your discblade.
- **Production target:** CREATE `e7307fe67d4abd64`
- **Phase 3B disposition:** `CREATE`

**Canonical rules text**

You gain a +2 bonus on melee damage rolls with your discblade.

### Reference-only publication

- Alter — Illusion — Jedi Academy page 87. Canonical owner: Force Unleashed Campaign Guide. No Jedi Academy production mutation.

### Missing Force-tradition trees

- Shapers of Kro Var — create tree `ab3311a860d8d359` before its 5 talents; no base-class access mutation is authorized.
- Zeison Sha Warrior — create tree `aec386e85f66e93e` before its 5 talents; no base-class access mutation is authorized.

## Append-only book index

- [x] Saga Edition Core Rulebook — 198 certified talent claims
- [x] Clone Wars Campaign Guide — 118 certified talent claims
- [x] Rebellion Era Campaign Guide — 64 certified talent claims
- [x] Galaxy at War — 56 certified talent claims
- [x] Galaxy of Intrigue — 43 certified talent claims
- [x] Starships of the Galaxy — 23 certified talent claims
- [x] Threats of the Galaxy — 11 certified talent claims
- [x] Scum and Villainy — 110 certified talent claims
- [x] Unknown Regions — 57 certified talent claims
- [x] Legacy Era Campaign Guide — 101 certified talent claims
- [x] Knights of the Old Republic Campaign Guide — 115 certified talent claims
- [x] Force Unleashed Campaign Guide — 137 certified talent claims
- [x] Jedi Academy Training Manual — 118 certified talent claims
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
