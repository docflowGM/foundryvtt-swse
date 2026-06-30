# Scavenger's Guide to Droids feat implementation fit

Scavenger's Guide to Droids adds a compact but highly contextual droid feat set. Most of the feats are not static math. They are action options, reactions, attack riders, shield interactions, or choice-scoped rules.

## Architecture fit

### Feat catalog and progression

The feat catalog should continue to own:

- sourcebook attribution
- prerequisite text
- selected-choice metadata
- repeatable/scoped choice metadata
- implementation classification

### Runtime systems

The following feat groups require runtime workflows:

| Group | Feats | Proper home |
| --- | --- | --- |
| Aim / attack options | Aiming Accuracy, Multi-Targeting, Pinpoint Accuracy | action cards / attack result hooks |
| Damage / CT reactions | Damage Conversion, Ion Shielding | damage workflow / CT prompt |
| Shield rules | Droid Shield Mastery, Shield Surge | shield subsystem |
| Grapple rules | Pincer | grapple workflow |
| Special attacks | Slammer, Tool Frenzy, Mechanical Martial Arts | action cards / attack result hooks |
| Skill-vs-defense action | Distracting Droid | skill attack / chat action card |
| Mobility reaction | Turn and Burn | movement/combat reaction metadata |
| Sensor sharing | Sensor Link | table-context UI / GM note |
| Choice-scoped rules | Droid Focus, Logic Upgrade: Skill Swap | progression choice metadata |

## Avoided anti-patterns

Do not apply these feats as unconditional static bonuses:

- Aiming Accuracy
- Damage Conversion
- Droid Shield Mastery
- Erratic Target
- Ion Shielding
- Pinpoint Accuracy
- Shield Surge
- Slammer
- Tool Frenzy

Doing so would make the sheet lie about rules that only apply in very specific timing/target/action contexts.

## Best next implementation slice

The safest next coded slice is action-card metadata for:

- Aiming Accuracy
- Distracting Droid
- Slammer
- Tool Frenzy

Those can be exposed as GM/player action reminders without changing core combat math.
