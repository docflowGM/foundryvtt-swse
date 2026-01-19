# Mentor Synthesis Examples

This document shows how non-core mentors are synthesized from core voices without custom writing.

Each example shows:
1. **Mentor Config** — Primary/Secondary voices and axis
2. **How It's Built** — The composition rule
3. **Sample Output** — Actual dialogue (one topic)

---

## Example 1: Captain (Military Leader)

**Config:**
```
primaryVoice: "J0-N1"
secondaryVoice: "Breach"
corruptionAxis: null
```

**How It Works:**

Captain uses **J0-N1's analytical structure** for the main voice, but adds **Breach's military directness** for emphasis and closing.

**Example Topic: "Who am I becoming?"**

1. Get J0-N1 response (canonical analysis + J0-N1 opening/closing)
2. Mix in Breach's emphasis lines
3. No corruption axis → use J0-N1's DSP interpreter

**Output:**
> "<Observation> Your development status: you've proven yourself in the field. <Analysis> Behavioral patterns indicate specialization as a Guardian.
>
> ⚠️ Look, I'm not here to preach about light and dark. But you're getting reckless. That kind of instability? It gets people killed. Yours and mine.
>
> <Conclusion> Continue optimizing your trajectory."

**Why It Works:**
- J0-N1's formal analytical structure (opening/closing/analysis tags)
- Breach's blunt military clarity (emphasis lines)
- No softening → feels like command authority

---

## Example 2: Rajma (Information Broker)

**Config:**
```
primaryVoice: "J0-N1"
secondaryVoice: "Tío the Hutt"
corruptionAxis: "Exploitation"
```

**How It Works:**

Rajma uses **J0-N1's systems thinking** as primary voice, but adds **Tío's transactional framing** for secondary emphasis.

The **Exploitation axis** reframes DSP as pragmatic business logic, not moral warning.

**Example Topic: "Who am I becoming?"**

1. Get J0-N1 response (systems/optimization focus)
2. Mix in Tío's emphasis (leverage, profit, transaction)
3. Apply Exploitation DSP interpreter

**Output:**
> "<Observation> Your development status: you've proven yourself valuable. <Analysis> Behavioral patterns indicate specialization as information broker.
>
> ⚠️ You understand value now. Power responds to those who know its price. What you know is worth more every day.
>
> <Conclusion> Information is currency. Keep accumulating it."

**Why It Works:**
- J0-N1's analytical language (structures thinking)
- Tío's transactional emphasis (frames growth as asset accumulation)
- Exploitation DSP (treats darkness as business opportunity)

---

## Example 3: Whisper (Assassin/Nihilist)

**Config:**
```
primaryVoice: "Lead"
secondaryVoice: "Darth Malbada"
corruptionAxis: "Nihilism"
```

**How It Works:**

Whisper uses **Lead's tactical perception** for the main voice (patterns, adaptation), but adds **Malbada's justification** for secondary emphasis.

The **Nihilism axis** reframes DSP as irrelevance of meaning, not corruption.

**Example Topic: "Who am I becoming?"**

1. Get Lead response (patterns, adaptation focus)
2. Mix in Malbada's emphasis (strength, justification)
3. Apply Nihilism DSP interpreter

**Output:**
> "Not bad at all. You've learned to read people and terrain, and you're shaping up as an assassin. That's what your choices say about you.
>
> ⚠️ Meaning dissolves. Only action remains. You're becoming what function demands.
>
> Keep building on what works. Don't fix what isn't broken."

**Why It Works:**
- Lead's dry tactical language (perception, adaptation)
- Malbada's justification emphasis (validates lethal choice)
- Nihilism DSP (removes moral language, focuses on mechanical action)

---

## How to Add New Mentors

### Step 1: Define Synthesis Config

```javascript
// In mentor-synthesis-config.js, add to appropriate category:
new_mentor: {
  title: "New Mentor Name",
  primaryVoice: "miraj",        // Pick from 8 core mentors
  secondaryVoice: "lead",       // Optional
  tertiaryVoice: null,          // Optional (reserved for future)
  corruptionAxis: null,         // "Domination" | "Temptation" | "Exploitation" | "Nihilism" | null
  description: "What makes this mentor unique"
}
```

### Step 2: System Generates All Dialogue

```javascript
// In your UI code, when player selects mentor:
const response = MentorVoiceSynthesizer.synthesizeVoice(
  "new_mentor",
  "who_am_i_becoming",
  analysisData
);
```

That's it. Dialogue is generated via synthesis. No custom writing required.

### Step 3: (Optional) Test Synthesis

```javascript
// Debug helper to see how synthesis works:
MentorVoiceSynthesizer.debugSynthesis("new_mentor", "who_am_i_becoming");
// Output: Shows which voices blend and how
```

---

## Voice Blending Rules

**Primary Voice:** Dominates opening, structure, and emotional tone.

**Secondary Voice:** Adds emphasis lines and closing flavor.

**Corruption Axis:** Replaces DSP interpreter only.

**Example Blending:**
```
Officer = J0-N1 (primary) + Breach (secondary)
↓
Analytical opening (J0-N1)
+ Military emphasis lines (Breach)
+ Breach's DSP warnings
= "Analytical officer with military bark"
```

---

## Corruption Axis Effects

### Domination Axis
- **DSP Meaning:** Proof of power, not corruption
- **Tone Shift:** Celebrates intensity
- **Example:** "Your power grows undeniable."

### Temptation Axis
- **DSP Meaning:** Justification, not sin
- **Tone Shift:** Validates difficult choices
- **Example:** "The path was necessary. They would have done the same."

### Exploitation Axis
- **DSP Meaning:** Business pragmatism
- **Tone Shift:** Removes moral language
- **Example:** "You understand value now. Power respects those who know its price."

### Nihilism Axis
- **DSP Meaning:** Irrelevance of meaning
- **Tone Shift:** Focuses on mechanics only
- **Example:** "Meaning dissolves. Only action remains."

---

## Complete Mentor List (Ready to Synthesize)

✅ **8 Core Mentors** (Fully Authored)
- Miraj, Breach, Lead, Ol' Salty, J0-N1, Darth Miedo, Darth Malbada, Tío

✅ **Force Mentors** (5 mentors)
- Anchorite, Venn, Seraphim, Urza, Axiom

✅ **Sith Mentors** (3 mentors)
- Korr, Delta Assassin, Infiltrator

✅ **Military Mentors** (4 mentors)
- Captain, Krag, Theron, Zhen

✅ **Scout Mentors** (3 mentors)
- Rogue, Spark, Whisper

✅ **Criminal Mentors** (6 mentors)
- Skindar, Pegár, Jack, Rax, Kex Varon, Rajma

✅ **Social Mentors** (3 mentors)
- Sela, Mayu, Kyber

**Total: 35 mentors, all synthesized from 8 core voices, zero custom dialogue writing required.**

---

## Architecture Summary

```
MentorVoiceSynthesizer.synthesizeVoice()
  ↓
Check if core mentor → return directly
  ↓
Get synthesis config (primary/secondary/axis)
  ↓
Get primary voice response
  ↓
Mix in secondary voice emphasis (if present)
  ↓
Apply corruption axis DSP (if present)
  ↓
Return synthesized response
```

No rewriting. No templates. No NLP. Just composition from known-good parts.
