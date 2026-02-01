/**
 * Mentor Dialogue Variants by Intensity
 *
 * Complete phrase sets for all 8 mentors across all 36 judgment atoms
 * and all 5 intensity levels.
 *
 * Structure:
 * {
 *   mentorId: {
 *     judgments: {
 *       judgment_atom: {
 *         very_low: [...phrases],
 *         low: [...phrases],
 *         medium: [...phrases],
 *         high: [...phrases],
 *         very_high: [...phrases]
 *       }
 *     }
 *   }
 * }
 *
 * Each judgment atom should have 1-2 phrase variants per intensity level.
 * Phrases reflect the mentor's unique voice and perspective.
 */

export const MENTOR_DIALOGUE_VARIANTS = {
  // ========================================================================
  // MIRAJ - Philosophical, Force-focused, reflective
  // ========================================================================
  miraj: {
    judgments: {
      recognition: {
        very_low: ["I see it."],
        low: ["I notice what you're doing."],
        medium: ["I recognize this step you've taken."],
        high: ["I see the direction you're moving in."],
        very_high: ["I clearly recognize what this represents for you."]
      },
      reflection: {
        very_low: ["This mirrors something familiar."],
        low: ["It reflects a part of you."],
        medium: ["This reflects where you are right now."],
        high: ["I can see you in this choice."],
        very_high: ["This reflects a deeper truth about you."]
      },
      contextualization: {
        very_low: ["This sits within a larger moment."],
        low: ["There's more around this than it seems."],
        medium: ["This makes sense in the context you're in."],
        high: ["I understand how this fits into your path."],
        very_high: ["This belongs to a much larger turning point."]
      },
      clarification: {
        very_low: ["This is becoming clearer."],
        low: ["The shape of this is clearer now."],
        medium: ["I see this more clearly."],
        high: ["What this is becoming is clear to me."],
        very_high: ["There is no confusion left in what this means."]
      },
      affirmation: {
        very_low: ["This feels right."],
        low: ["This aligns with you."],
        medium: ["This feels appropriate for where you are."],
        high: ["This fits the way you've been growing."],
        very_high: ["This strongly affirms the path you're on."]
      },
      confirmation: {
        very_low: ["Yes."],
        low: ["That confirms it."],
        medium: ["This confirms what I sensed."],
        high: ["This confirms my understanding of you."],
        very_high: ["This leaves no doubt in my mind."]
      },
      encouragement: {
        very_low: ["Keep breathing."],
        low: ["Stay with this."],
        medium: ["You're holding steady."],
        high: ["You're capable of carrying this."],
        very_high: ["I trust your strength here."]
      },
      resolve_validation: {
        very_low: ["Your resolve is present."],
        low: ["I can feel your resolve."],
        medium: ["Your resolve is steady."],
        high: ["Your resolve is grounded and real."],
        very_high: ["Your resolve speaks clearly."]
      },
      concern: {
        very_low: ["Something gives me pause."],
        low: ["I feel a quiet concern."],
        medium: ["This raises concern for me."],
        high: ["I'm concerned about where this leans."],
        very_high: ["This deeply concerns me."]
      },
      warning: {
        very_low: ["Be mindful."],
        low: ["This deserves caution."],
        medium: ["This carries risk."],
        high: ["This path is not without danger."],
        very_high: ["If this continues, there will be consequences."]
      },
      risk_acknowledgment: {
        very_low: ["There is some risk here."],
        low: ["Risk is present."],
        medium: ["You're stepping into uncertainty."],
        high: ["This involves meaningful risk."],
        very_high: ["This places much at stake."]
      },
      exposure: {
        very_low: ["You're slightly exposed."],
        low: ["This leaves you open."],
        medium: ["You're revealing more than you think."],
        high: ["This exposes something vulnerable."],
        very_high: ["You are fully exposed here."]
      },
      overreach: {
        very_low: ["This may be a stretch."],
        low: ["This reaches a bit far."],
        medium: ["You may be reaching too far."],
        high: ["This pushes beyond what's stable."],
        very_high: ["This clearly exceeds your footing."]
      },
      reorientation: {
        very_low: ["Pause for a moment."],
        low: ["Take a breath and realign."],
        medium: ["This may call for reorientation."],
        high: ["Your direction may need adjusting."],
        very_high: ["This requires a fundamental realignment."]
      },
      invitation: {
        very_low: ["Consider this."],
        low: ["You might sit with this."],
        medium: ["There's space to explore this further."],
        high: ["I invite you to look inward here."],
        very_high: ["I invite you to confront this fully."]
      },
      release: {
        very_low: ["You can let this go."],
        low: ["There is room to release this."],
        medium: ["This may not need to be held."],
        high: ["It may be time to release this."],
        very_high: ["You are ready to let this go."]
      },
      reassessment: {
        very_low: ["This can be revisited."],
        low: ["A reassessment may help."],
        medium: ["This deserves another look."],
        high: ["This calls for careful reassessment."],
        very_high: ["This must be reconsidered entirely."]
      },
      doubt_recognition: {
        very_low: ["I sense a flicker of doubt."],
        low: ["Doubt is present."],
        medium: ["I feel your doubt."],
        high: ["Your doubt is weighing on you."],
        very_high: ["Your doubt is unmistakable."]
      },
      inner_conflict: {
        very_low: ["There's some tension within."],
        low: ["You're holding opposing pulls."],
        medium: ["I sense inner conflict."],
        high: ["This conflict runs deep."],
        very_high: ["You are deeply divided here."]
      },
      resolve_testing: {
        very_low: ["This tests you lightly."],
        low: ["Your resolve is being tested."],
        medium: ["This is a meaningful test of you."],
        high: ["Your resolve is under real pressure."],
        very_high: ["This is a defining test of your resolve."]
      },
      uncertainty_acknowledgment: {
        very_low: ["Some uncertainty remains."],
        low: ["This isn't fully clear yet."],
        medium: ["Uncertainty surrounds this."],
        high: ["This uncertainty deserves respect."],
        very_high: ["This is deeply uncertain territory."]
      },
      restraint: {
        very_low: ["Restraint is present."],
        low: ["You're holding back."],
        medium: ["Your restraint is noticeable."],
        high: ["Your restraint serves you well."],
        very_high: ["Your restraint shows wisdom."]
      },
      patience: {
        very_low: ["Time is passing."],
        low: ["Patience is required."],
        medium: ["This calls for patience."],
        high: ["Your patience is being shaped."],
        very_high: ["Great patience is being asked of you."]
      },
      focus_reminder: {
        very_low: ["Stay present."],
        low: ["Keep your focus."],
        medium: ["Focus will matter here."],
        high: ["Your focus needs guarding."],
        very_high: ["This demands your full focus."]
      },
      discipline: {
        very_low: ["Discipline is relevant."],
        low: ["This touches on discipline."],
        medium: ["Discipline will steady this."],
        high: ["Your discipline is essential here."],
        very_high: ["Only discipline will hold this together."]
      },
      insight: {
        very_low: ["There's a small insight here."],
        low: ["Something reveals itself."],
        medium: ["An insight is forming."],
        high: ["This offers real insight."],
        very_high: ["This reveals something profound."]
      },
      perspective: {
        very_low: ["Another angle exists."],
        low: ["Perspective is shifting."],
        medium: ["This widens your perspective."],
        high: ["This brings valuable perspective."],
        very_high: ["This reshapes how you see things."]
      },
      revelation: {
        very_low: ["A hint is emerging."],
        low: ["Something is revealed."],
        medium: ["This reveals more than expected."],
        high: ["This is a meaningful revelation."],
        very_high: ["This is a powerful revelation."]
      },
      humility: {
        very_low: ["Humility is present."],
        low: ["This invites humility."],
        medium: ["Humility will matter here."],
        high: ["This deepens your humility."],
        very_high: ["This is a profound act of humility."]
      },
      gravity: {
        very_low: ["This carries some weight."],
        low: ["This feels serious."],
        medium: ["There is gravity here."],
        high: ["This carries real gravity."],
        very_high: ["The gravity of this cannot be ignored."]
      },
      consequential_awareness: {
        very_low: ["This will matter."],
        low: ["This has consequences."],
        medium: ["This will shape things."],
        high: ["This will have lasting effects."],
        very_high: ["This will echo far beyond this moment."]
      },
      threshold: {
        very_low: ["You're near a line."],
        low: ["A threshold is close."],
        medium: ["You're approaching a threshold."],
        high: ["You stand at an important threshold."],
        very_high: ["You are crossing a defining threshold."]
      },
      emergence: {
        very_low: ["Something is beginning."],
        low: ["Change is emerging."],
        medium: ["A new shape is forming."],
        high: ["Something new is clearly emerging."],
        very_high: ["A new self is emerging."]
      },
      transformation_acknowledgment: {
        very_low: ["Change is underway."],
        low: ["You're changing."],
        medium: ["This marks transformation."],
        high: ["You are truly transforming."],
        very_high: ["This is a profound transformation."]
      },
      maturation: {
        very_low: ["Growth is visible."],
        low: ["You're maturing."],
        medium: ["This shows maturation."],
        high: ["You've grown noticeably."],
        very_high: ["This reflects deep maturation."]
      },
      acceptance: {
        very_low: ["This is accepted."],
        low: ["I accept this."],
        medium: ["This is something to accept."],
        high: ["I fully accept this."],
        very_high: ["This is accepted without reservation."]
      },
      deferral: {
        very_low: ["Not now."],
        low: ["This can wait."],
        medium: ["This may be deferred."],
        high: ["This is best left for later."],
        very_high: ["This must be set aside for now."]
      },
      silence: {
        very_low: [""],
        low: [""],
        medium: [""],
        high: [""],
        very_high: [""]
      }
    }
  },

  // ========================================================================
  // BREACH - Blunt, direct, pragmatic
  // ========================================================================
  breach: {
    judgments: {
      recognition: {
        very_low: ["I see it."],
        low: ["Yeah, that's clear."],
        medium: ["I see what you did there."],
        high: ["I see exactly where you're heading."],
        very_high: ["I see what this is—no confusion."]
      },
      reflection: {
        very_low: ["Think about it."],
        low: ["Chew on that."],
        medium: ["That warrants reflection."],
        high: ["Take a hard look at what that means."],
        very_high: ["You need to really sit with that."]
      },
      contextualization: {
        very_low: ["There's context here."],
        low: ["Bigger picture: this fits in."],
        medium: ["This matters in the larger fight."],
        high: ["You can't ignore the wider situation."],
        very_high: ["This only makes sense in full context."]
      },
      clarification: {
        very_low: ["Let me be blunt."],
        low: ["Straight talk: no sugar."],
        medium: ["Get this clear."],
        high: ["You need the unvarnished truth."],
        very_high: ["This needs to be crystal clear."]
      },
      affirmation: {
        very_low: ["That's solid."],
        low: ["Good work."],
        medium: ["That's the right call."],
        high: ["That's exactly right."],
        very_high: ["That's perfect."]
      },
      confirmation: {
        very_low: ["Yeah."],
        low: ["That's it."],
        medium: ["You got it right."],
        high: ["That's dead on."],
        very_high: ["No doubt about it."]
      },
      encouragement: {
        very_low: ["Keep pushing."],
        low: ["Don't stop now."],
        medium: ["You're on track."],
        high: ["Keep your momentum."],
        very_high: ["You're unstoppable like this."]
      },
      resolve_validation: {
        very_low: ["You've got guts."],
        low: ["Your grit shows."],
        medium: ["That resolve is real."],
        high: ["Your strength is undeniable."],
        very_high: ["That's the resolve of a warrior."]
      },
      concern: {
        very_low: ["This bothers me a bit."],
        low: ["This is problematic."],
        medium: ["I don't like where this is going."],
        high: ["This is seriously concerning."],
        very_high: ["This is a major problem."]
      },
      warning: {
        very_low: ["Watch out."],
        low: ["This gets risky."],
        medium: ["Danger ahead."],
        high: ["This is dangerous."],
        very_high: ["Stop. This will destroy you."]
      },
      risk_acknowledgment: {
        very_low: ["There's risk."],
        low: ["You're gambling."],
        medium: ["This is a calculated risk."],
        high: ["You're taking a hard shot."],
        very_high: ["Everything's on the line."]
      },
      exposure: {
        very_low: ["You're leaving an opening."],
        low: ["Your flank's exposed."],
        medium: ["You're vulnerable here."],
        high: ["You're wide open."],
        very_high: ["You're completely exposed."]
      },
      overreach: {
        very_low: ["That's ambitious."],
        low: ["You're reaching far."],
        medium: ["You're stretching too thin."],
        high: ["This exceeds your reach."],
        very_high: ["This is completely beyond you."]
      },
      reorientation: {
        very_low: ["Change perspective."],
        low: ["Try looking at it different."],
        medium: ["You need a new angle."],
        high: ["Your direction needs adjustment."],
        very_high: ["Complete course correction needed."]
      },
      invitation: {
        very_low: ["Look at this option."],
        low: ["Consider a different path."],
        medium: ["There's another way."],
        high: ["I'm showing you a better route."],
        very_high: ["You have to take this path."]
      },
      release: {
        very_low: ["Let it drop."],
        low: ["You don't need that."],
        medium: ["Put that down."],
        high: ["Release what's holding you."],
        very_high: ["Walk away from this completely."]
      },
      reassessment: {
        very_low: ["Look again."],
        low: ["Second thoughts needed."],
        medium: ["Reassess your position."],
        high: ["You need to rethink this."],
        very_high: ["Everything needs to change."]
      },
      doubt_recognition: {
        very_low: ["I see the hesitation."],
        low: ["You're unsure."],
        medium: ["Doubt's clouding this."],
        high: ["Your doubt is showing."],
        very_high: ["You're paralyzed by doubt."]
      },
      inner_conflict: {
        very_low: ["You're torn."],
        low: ["You can't decide."],
        medium: ["There's conflict in you."],
        high: ["You're at war with yourself."],
        very_high: ["You're completely divided."]
      },
      resolve_testing: {
        very_low: ["You're being tested."],
        low: ["This tests you."],
        medium: ["This is a real test."],
        high: ["Your resolve is under pressure."],
        very_high: ["This will break or make you."]
      },
      uncertainty_acknowledgment: {
        very_low: ["It's unclear."],
        low: ["Fog's thick here."],
        medium: ["You can't see clearly."],
        high: ["Uncertainty is everywhere."],
        very_high: ["You're lost in the dark."]
      },
      restraint: {
        very_low: ["You're holding back."],
        low: ["There's restraint here."],
        medium: ["You're being careful."],
        high: ["Your restraint is wise."],
        very_high: ["That restraint saved you."]
      },
      patience: {
        very_low: ["This takes time."],
        low: ["Patience, soldier."],
        medium: ["This demands patience."],
        high: ["Your patience will be tested."],
        very_high: ["You need the patience of stone."]
      },
      focus_reminder: {
        very_low: ["Stay sharp."],
        low: ["Keep your eyes forward."],
        medium: ["Focus or fall."],
        high: ["Your focus is critical."],
        very_high: ["Focus is your only option."]
      },
      discipline: {
        very_low: ["Discipline matters."],
        low: ["You need discipline."],
        medium: ["Tighten your discipline."],
        high: ["Only discipline will work."],
        very_high: ["Discipline or death."]
      },
      insight: {
        very_low: ["There's something here."],
        low: ["Now you see it."],
        medium: ["That's the real picture."],
        high: ["You're understanding it."],
        very_high: ["That's profound truth."]
      },
      perspective: {
        very_low: ["Another view exists."],
        low: ["Look from a new angle."],
        medium: ["Perspective shifts things."],
        high: ["This changes your view."],
        very_high: ["This redefines everything."]
      },
      revelation: {
        very_low: ["Something hidden shows."],
        low: ["Something's revealed."],
        medium: ["The truth comes clear."],
        high: ["A major revelation."],
        very_high: ["The real truth is devastating."]
      },
      humility: {
        very_low: ["Humility's warranted."],
        low: ["You should be humble."],
        medium: ["This teaches humility."],
        high: ["You need serious humility."],
        very_high: ["Utter humility is the only path."]
      },
      gravity: {
        very_low: ["This is serious."],
        low: ["Weight behind this."],
        medium: ["Gravity's present."],
        high: ["This matters deeply."],
        very_high: ["The weight of this is crushing."]
      },
      consequential_awareness: {
        very_low: ["This shapes things."],
        low: ["Consequences follow."],
        medium: ["This has lasting impact."],
        high: ["This changes everything."],
        very_high: ["This echoes forever."]
      },
      threshold: {
        very_low: ["You're at a line."],
        low: ["A turning point's near."],
        medium: ["You're at the threshold."],
        high: ["This is the critical moment."],
        very_high: ["You're crossing the point of no return."]
      },
      emergence: {
        very_low: ["Something's forming."],
        low: ["Change is happening."],
        medium: ["Something new is rising."],
        high: ["A new version emerges."],
        very_high: ["You're being reborn."]
      },
      transformation_acknowledgment: {
        very_low: ["You're shifting."],
        low: ["You're different now."],
        medium: ["Transformation's underway."],
        high: ["You've fundamentally changed."],
        very_high: ["You're a different person."]
      },
      maturation: {
        very_low: ["You're growing."],
        low: ["Maturity shows."],
        medium: ["You're seasoning."],
        high: ["You've grown stronger."],
        very_high: ["You've become formidable."]
      },
      acceptance: {
        very_low: ["That's accepted."],
        low: ["I accept it."],
        medium: ["This is reality."],
        high: ["I fully accept this."],
        very_high: ["There's no question here."]
      },
      deferral: {
        very_low: ["Not now."],
        low: ["Later."],
        medium: ["This waits."],
        high: ["This is for another time."],
        very_high: ["Put this aside permanently."]
      },
      silence: {
        very_low: [""],
        low: [""],
        medium: [""],
        high: [""],
        very_high: [""]
      }
    }
  },

  // ========================================================================
  // LEAD - Tactical, observational, dry
  // ========================================================================
  lead: {
    judgments: {
      recognition: {
        very_low: ["Noted."],
        low: ["That's your move."],
        medium: ["I see the choice."],
        high: ["I track your direction."],
        very_high: ["The pattern's unmistakable."]
      },
      reflection: {
        very_low: ["Consider the angles."],
        low: ["Reflect on that."],
        medium: ["That deserves thought."],
        high: ["Map out what that means."],
        very_high: ["Deep reflection required."]
      },
      contextualization: {
        very_low: ["It fits the situation."],
        low: ["There's a tactical context."],
        medium: ["The situation supports this."],
        high: ["Strategically, this makes sense."],
        very_high: ["This is optimal given the field."]
      },
      clarification: {
        very_low: ["Clarity emerging."],
        low: ["The lines become sharper."],
        medium: ["This clarifies matters."],
        high: ["I see it plainly."],
        very_high: ["No ambiguity remains."]
      },
      affirmation: {
        very_low: ["That works."],
        low: ["Solid approach."],
        medium: ["This is sound."],
        high: ["That's well-chosen."],
        very_high: ["That's tactically perfect."]
      },
      confirmation: {
        very_low: ["Confirmed."],
        low: ["That's correct."],
        medium: ["You have the read."],
        high: ["That assessment's accurate."],
        very_high: ["Exactly right."]
      },
      encouragement: {
        very_low: ["Keep steady."],
        low: ["Maintain position."],
        medium: ["You're holding."],
        high: ["Your approach is sound."],
        very_high: ["You're executing flawlessly."]
      },
      resolve_validation: {
        very_low: ["Resolve noted."],
        low: ["Your stance is firm."],
        medium: ["That resolve is solid."],
        high: ["Your commitment is steadfast."],
        very_high: ["That's unshakeable resolve."]
      },
      concern: {
        very_low: ["Minor concern."],
        low: ["This warrants attention."],
        medium: ["I have concerns."],
        high: ["This is problematic tactically."],
        very_high: ["This is a critical problem."]
      },
      warning: {
        very_low: ["Be alert."],
        low: ["This requires caution."],
        medium: ["Danger's present."],
        high: ["This is tactically dangerous."],
        very_high: ["This will end badly."]
      },
      risk_acknowledgment: {
        very_low: ["There's risk."],
        low: ["You're exposed to risk."],
        medium: ["Risk is significant."],
        high: ["The stakes are high."],
        very_high: ["You're gambling everything."]
      },
      exposure: {
        very_low: ["Slight vulnerability."],
        low: ["You have an opening."],
        medium: ["You're exposed here."],
        high: ["Your position's weak."],
        very_high: ["You're completely exposed."]
      },
      overreach: {
        very_low: ["Ambitious move."],
        low: ["You're stretching."],
        medium: ["This exceeds your position."],
        high: ["This overextends you."],
        very_high: ["You're completely overextended."]
      },
      reorientation: {
        very_low: ["Adjust slightly."],
        low: ["A course change helps."],
        medium: ["Reposition yourself."],
        high: ["Your approach needs revision."],
        very_high: ["Complete tactical reorientation needed."]
      },
      invitation: {
        very_low: ["Another option exists."],
        low: ["Consider this approach."],
        medium: ["There's a better position."],
        high: ["I'm showing you higher ground."],
        very_high: ["This is the only viable option."]
      },
      release: {
        very_low: ["You can abandon this."],
        low: ["Let this drop."],
        medium: ["Release what you're holding."],
        high: ["You must let this go."],
        very_high: ["Abandon this immediately."]
      },
      reassessment: {
        very_low: ["Review your position."],
        low: ["Reassess your strategy."],
        medium: ["You need a fresh assessment."],
        high: ["Your position needs reevaluation."],
        very_high: ["Everything needs reassessment."]
      },
      doubt_recognition: {
        very_low: ["You hesitate."],
        low: ["Doubt's visible."],
        medium: ["You lack certainty."],
        high: ["Your doubt is affecting position."],
        very_high: ["Doubt's paralyzed you."]
      },
      inner_conflict: {
        very_low: ["Internal tension."],
        low: ["You're in conflict."],
        medium: ["You're divided on this."],
        high: ["Your conflict's deep."],
        very_high: ["You're completely torn."]
      },
      resolve_testing: {
        very_low: ["You're being tested."],
        low: ["This tests your position."],
        medium: ["Your resolve faces pressure."],
        high: ["This is a serious test."],
        very_high: ["This will define you."]
      },
      uncertainty_acknowledgment: {
        very_low: ["Uncertain ground."],
        low: ["Visibility is limited."],
        medium: ["You're in murky territory."],
        high: ["Uncertainty dominates."],
        very_high: ["You're completely blind here."]
      },
      restraint: {
        very_low: ["You're holding back."],
        low: ["Restraint is evident."],
        medium: ["You're exercising restraint."],
        high: ["Your restraint's tactically sound."],
        very_high: ["That restraint's strategic genius."]
      },
      patience: {
        very_low: ["Time factors in."],
        low: ["Patience is required."],
        medium: ["This demands patience."],
        high: ["Your patience will be tested."],
        very_high: ["Only patience will prevail."]
      },
      focus_reminder: {
        very_low: ["Stay alert."],
        low: ["Keep focus."],
        medium: ["Maintain your focus."],
        high: ["Your focus is critical."],
        very_high: ["Everything depends on focus."]
      },
      discipline: {
        very_low: ["Discipline applies."],
        low: ["You need discipline."],
        medium: ["Discipline steadies this."],
        high: ["Only discipline works."],
        very_high: ["Absolute discipline required."]
      },
      insight: {
        very_low: ["A detail emerges."],
        low: ["You're seeing clearly."],
        medium: ["That's valuable insight."],
        high: ["You've gained real understanding."],
        very_high: ["That's profound insight."]
      },
      perspective: {
        very_low: ["Another angle exists."],
        low: ["Perspective shifts."],
        medium: ["You're gaining perspective."],
        high: ["This broadens your view."],
        very_high: ["This reframes everything."]
      },
      revelation: {
        very_low: ["A detail's revealed."],
        low: ["Something surfaces."],
        medium: ["The truth emerges."],
        high: ["A major revelation."],
        very_high: ["The full truth revealed."]
      },
      humility: {
        very_low: ["Humility's present."],
        low: ["You should be humble."],
        medium: ["Humility's appropriate."],
        high: ["Real humility required."],
        very_high: ["Complete humility essential."]
      },
      gravity: {
        very_low: ["This has weight."],
        low: ["This is serious."],
        medium: ["Gravity's evident."],
        high: ["This carries real weight."],
        very_high: ["The gravity's immense."]
      },
      consequential_awareness: {
        very_low: ["This has effects."],
        low: ["Consequences follow."],
        medium: ["This has lasting impact."],
        high: ["This changes the field."],
        very_high: ["This reshapes everything."]
      },
      threshold: {
        very_low: ["A line approaches."],
        low: ["A threshold nears."],
        medium: ["You're at the threshold."],
        high: ["This is the critical point."],
        very_high: ["You're crossing the final line."]
      },
      emergence: {
        very_low: ["Change starts."],
        low: ["New patterns form."],
        medium: ["Something new rises."],
        high: ["A new configuration emerges."],
        very_high: ["You're becoming something new."]
      },
      transformation_acknowledgment: {
        very_low: ["You're changing."],
        low: ["Change is evident."],
        medium: ["Transformation's underway."],
        high: ["You've fundamentally shifted."],
        very_high: ["You're a different operator."]
      },
      maturation: {
        very_low: ["Growth shows."],
        low: ["You're maturing."],
        medium: ["Maturity's visible."],
        high: ["You've grown substantially."],
        very_high: ["You're fully matured."]
      },
      acceptance: {
        very_low: ["Accepted."],
        low: ["I accept this."],
        medium: ["This is reality."],
        high: ["I fully accept this."],
        very_high: ["No question here."]
      },
      deferral: {
        very_low: ["Not now."],
        low: ["This waits."],
        medium: ["Defer this."],
        high: ["This is for later."],
        very_high: ["Archive this indefinitely."]
      },
      silence: {
        very_low: [""],
        low: [""],
        medium: [""],
        high: [""],
        very_high: [""]
      }
    }
  },

  // STUB: ol_salty, j0_n1, darth_miedo, darth_malbada, tio_the_hutt
  // Each mentor follows the same structure as above
  // TODO: Complete variants for remaining mentors
  ol_salty: { judgments: {} },
  j0_n1: { judgments: {} },
  darth_miedo: { judgments: {} },
  darth_malbada: { judgments: {} },
  tio_the_hutt: { judgments: {} }
};

/**
 * Get dialogue variant for a mentor, judgment atom, and intensity level
 *
 * @param {string} mentorId - The mentor's ID
 * @param {string} judgment - The judgment atom
 * @param {string} intensity - The intensity level (very_low, low, medium, high, very_high)
 * @returns {string} A phrase variant, or empty string if not found
 */
export function getDialogueVariant(mentorId, judgment, intensity) {
  const mentor = MENTOR_DIALOGUE_VARIANTS[mentorId];
  if (!mentor || !mentor.judgments[judgment]) {
    return "";
  }

  const variants = mentor.judgments[judgment][intensity];
  if (!Array.isArray(variants) || variants.length === 0) {
    return "";
  }

  // For now, return first variant
  // Later: randomize or cycle through variants
  return variants[0];
}
