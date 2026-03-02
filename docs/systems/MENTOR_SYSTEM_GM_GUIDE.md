# Mentor System - GM Guide

## What Mentors Do

The mentor system in this module provides **advisory guidance** to help players navigate Star Wars Saga Edition's complex character progression system. Mentors explain character identity, observe player choices, and gently recommend options that align with stated intent.

### Mentors Are Advisory, Not Authoritative

The mentor system:
- **Reflects** player choices through persistent dialogue
- **Explains** class identity and progression philosophy
- **Biases** automated suggestions (feat/talent/class recommendations)
- **Learns** from player decisions to personalize future advice

Mentors do **not**:
- Override GM rulings or table decisions
- Enforce specific builds or restrict character options
- Determine alignment, story outcomes, or narrative authority
- Require player attention or interaction
- Replace roleplay or character agency

## How It Works

### L1 Survey → Mentor Memory
When a character is first created, players may complete a mentor-voiced survey answering questions like "What role do you want to fill in combat?" Survey answers seed the mentor's initial understanding of the player's stated intent.

### Persistent Dialogue
When a player clicks the mentor button on their character sheet, they see a series of 8 reflective dialogue topics:
1. **Who am I becoming?** - Role reflection & identity
2. **What paths are open to me?** - Archetype guidance
3. **What am I doing well?** - Synergy reinforcement
4. **What am I doing wrong?** - Constructive feedback
5. **How should I fight?** - Combat style framing
6. **What should I be careful of?** - Risk awareness
7. **What lies ahead?** - Prestige class planning
8. **How would you play this?** - Mentor philosophy

Each dialogue respects the player's choices and experiences.

### Divergence Feedback
Mentors are aware when player actions diverge from stated intent. If a player said "I want to be a guardian" in the survey but has invested heavily in Dexterity and strike-focused talents, the mentor will notice:

> _"Your choices are moving away from what you once valued. That may be growth—or avoidance."_

This is **purely observational**—no judgment, no penalties. It helps players reflect on their choices.

### Suggestion Engine Integration
The mentor system seeds bias multipliers used by the suggestion engine. These are **soft influences**, not hard locks:
- If a player chose "striker" in the survey, feat/talent suggestions will slightly favor striker options
- But a player is completely free to ignore suggestions and build however they want
- The multipliers are capped at 1.5x—they amplify, not override

## GM Authority

**GMs retain complete authority.** You can:
- Ignore mentor advice entirely
- Contradict mentor suggestions narratively
- Override mentor feedback for story purposes
- Disable the mentor system in your world settings
- Use mentors to reinforce your own guidance
- Silence mentors if they feel too prescriptive

## Configuration

### Disabling Mentors
If mentors feel too intrusive for your table, you can:
1. Hide the mentor button from character sheets
2. Disable mentor dialogue in system settings
3. Override mentor memory manually via actor flags

### Customizing Mentor Personality
Each mentor (Miraj, Lead, Breach, etc.) has a personality profile that affects dialogue tone:
- **Miraj**: Philosophical, balanced, encouraging
- **Lead**: Tactical, practical, direct
- **Breach**: Action-focused, discipline-oriented
- **Ol' Salty**: Colorful, irreverent, adventure-seeking
- **J0-N1**: Formal, efficient, protocol-minded

Mentor choice is up to the player—mentors are flavor, not mechanics.

## Common Questions

### Can mentors force a player to build a certain way?
No. Mentors provide guidance and influence suggestions, but players have complete freedom. A player can ignore all mentor advice and build however they want.

### Do mentors track alignment?
No. Mentors don't determine if a character is Light Side or Dark Side. Mentors observe Dark Side Points and adjust tone accordingly, but they don't enforce moral judgments.

### What if a mentor and I (the GM) disagree?
You win. If you've established that a character should pursue a certain path for story reasons, that supersedes any mentor suggestion. Mentors are tools to help players—not to override GM narrative authority.

### Do mentors spy on characters?
No. Mentors only remember what they've directly observed in dialogue and what the player explicitly told them (via survey). Mentors don't track hidden motivations or private thoughts.

### Can I customize mentor feedback?
Yes. Mentor dialogue is generated from personality profiles and character data. You can:
- Edit mentor personality files to change tone
- Add custom mentor voices
- Modify archetype descriptions
- Override mentor memory via actor flags if needed

## Technical Details (For Reference)

### Mentor Memory Structure
Mentors store persistent per-actor data:
- **trust**: Relationship confidence (0.0-1.0)
- **committedPath**: Stated archetype (striker/guardian/controller)
- **commitmentStrength**: How strongly committed (decays by 15% per level)
- **targetClass**: Planned prestige class
- **inferredRole**: What mentor observes from actual choices
- **philosophyAxes**: Scales for restraint, dominance, protection

### File Locations
- **Mentor memory**: `actor.flags.swse.mentorMemories[mentorId]`
- **Survey biases**: `actor.system.swse.mentorBuildIntentBiases`
- **Dialogue generation**: `scripts/apps/mentor-reflective-dialogue.js`
- **Memory system**: `scripts/engine/mentor-memory.js`

### Clearing Mentor Memory
If needed, you can reset a character's mentor relationship via:
```javascript
// In browser console:
const actor = game.actors.getName("Character Name");
await actor.setFlag('swse', 'mentorMemories', {});
```

## Summary

The mentor system is designed to:
- **Help players** navigate complex character progression
- **Respect player agency** through observation, not enforcement
- **Support GMs** by offloading explanatory dialogue
- **Enhance roleplay** by making mentors feel aware and responsive

Mentors are companions in the conversation—not the conversation itself. Use them, ignore them, override them. They're here to serve your table.
