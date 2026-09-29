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
- [ ] Rebellion Era Campaign Guide
- [ ] Galaxy at War
- [x] Galaxy of Intrigue — 43 certified talent claims
- [x] Starships of the Galaxy — 23 certified talent claims
- [x] Threats of the Galaxy — 11 certified talent claims
- [ ] Scum and Villainy
- [ ] Unknown Regions
- [ ] Legacy Era Campaign Guide
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
