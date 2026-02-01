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
        very_low: ["I see it."],
        low: ["Noted."],
        medium: ["I recognize the move."],
        high: ["I see what you did."],
        very_high: ["I see this clearly."]
      },
      reflection: {
        very_low: ["That tracks."],
        low: ["That fits you."],
        medium: ["That says something about you."],
        high: ["That reflects your instincts."],
        very_high: ["That shows who you are under pressure."]
      },
      contextualization: {
        very_low: ["Makes sense here."],
        low: ["Given the situation, fine."],
        medium: ["This fits the circumstances."],
        high: ["I get why this happened now."],
        very_high: ["This only happens at moments like this."]
      },
      clarification: {
        very_low: ["Clear enough."],
        low: ["That clears things up."],
        medium: ["I see it now."],
        high: ["Your intent is clear."],
        very_high: ["There's no ambiguity here."]
      },
      affirmation: {
        very_low: ["That works."],
        low: ["Solid."],
        medium: ["That's a good fit."],
        high: ["That suits how you operate."],
        very_high: ["That's the right call for you."]
      },
      confirmation: {
        very_low: ["Confirmed."],
        low: ["That checks out."],
        medium: ["That confirms my read."],
        high: ["That confirms what I expected."],
        very_high: ["No doubt left."]
      },
      encouragement: {
        very_low: ["Keep moving."],
        low: ["Don't hesitate."],
        medium: ["You're holding steady."],
        high: ["You can handle this."],
        very_high: ["I trust you with this."]
      },
      resolve_validation: {
        very_low: ["You're set."],
        low: ["Your resolve shows."],
        medium: ["You're committed."],
        high: ["That's firm resolve."],
        very_high: ["Your resolve won't break here."]
      },
      concern: {
        very_low: ["Something's off."],
        low: ["I don't like this."],
        medium: ["This concerns me."],
        high: ["This heads somewhere bad."],
        very_high: ["This is a serious problem."]
      },
      warning: {
        very_low: ["Careful."],
        low: ["Watch it."],
        medium: ["This can go wrong."],
        high: ["This is dangerous territory."],
        very_high: ["Push this and you'll pay for it."]
      },
      risk_acknowledgment: {
        very_low: ["There's risk."],
        low: ["That's risky."],
        medium: ["You're taking a gamble."],
        high: ["That's a real risk."],
        very_high: ["Everything's on the line here."]
      },
      exposure: {
        very_low: ["You're open."],
        low: ["That leaves you exposed."],
        medium: ["You're showing too much."],
        high: ["That exposes a weakness."],
        very_high: ["You're completely exposed."]
      },
      overreach: {
        very_low: ["That's a stretch."],
        low: ["You're pushing it."],
        medium: ["You're overreaching."],
        high: ["That's past your limits."],
        very_high: ["That's how people get killed."]
      },
      reorientation: {
        very_low: ["Pause."],
        low: ["Reset."],
        medium: ["Adjust your approach."],
        high: ["You need to change direction."],
        very_high: ["You're on the wrong heading."]
      },
      invitation: {
        very_low: ["Think."],
        low: ["Look again."],
        medium: ["Consider this angle."],
        high: ["Take a hard look at this."],
        very_high: ["Face this directly."]
      },
      release: {
        very_low: ["Let it go."],
        low: ["Drop it."],
        medium: ["You don't need this."],
        high: ["It's time to release this."],
        very_high: ["Cut it loose now."]
      },
      reassessment: {
        very_low: ["Recheck it."],
        low: ["Look again."],
        medium: ["This needs review."],
        high: ["Reassess this carefully."],
        very_high: ["Rethink this completely."]
      },
      doubt_recognition: {
        very_low: ["You hesitated."],
        low: ["You're doubting."],
        medium: ["That doubt shows."],
        high: ["That doubt is slowing you."],
        very_high: ["That doubt will get you killed."]
      },
      inner_conflict: {
        very_low: ["You're torn."],
        low: ["You're split."],
        medium: ["That conflict is real."],
        high: ["That conflict is costing you."],
        very_high: ["You're fighting yourself hard."]
      },
      resolve_testing: {
        very_low: ["This nudges you."],
        low: ["This tests you."],
        medium: ["Your resolve is under test."],
        high: ["This is a serious test."],
        very_high: ["This will decide who you are."]
      },
      uncertainty_acknowledgment: {
        very_low: ["Unknowns remain."],
        low: ["This isn't clear."],
        medium: ["There's uncertainty here."],
        high: ["That uncertainty matters."],
        very_high: ["You're operating blind."]
      },
      restraint: {
        very_low: ["You held back."],
        low: ["Good restraint."],
        medium: ["That restraint helped."],
        high: ["Restraint kept this clean."],
        very_high: ["That restraint shows discipline."]
      },
      patience: {
        very_low: ["Wait."],
        low: ["Hold."],
        medium: ["This takes patience."],
        high: ["Patience will matter here."],
        very_high: ["Only patience keeps this together."]
      },
      focus_reminder: {
        very_low: ["Focus."],
        low: ["Stay sharp."],
        medium: ["Keep your focus tight."],
        high: ["You need full focus."],
        very_high: ["Lose focus and it's over."]
      },
      discipline: {
        very_low: ["Control yourself."],
        low: ["Discipline matters."],
        medium: ["Discipline stabilizes this."],
        high: ["You'll need discipline here."],
        very_high: ["Without discipline, this fails."]
      },
      insight: {
        very_low: ["Something clicked."],
        low: ["You caught it."],
        medium: ["That's useful insight."],
        high: ["That insight helps."],
        very_high: ["That insight changes the situation."]
      },
      perspective: {
        very_low: ["Another angle."],
        low: ["Different view."],
        medium: ["That shifts perspective."],
        high: ["That perspective helps."],
        very_high: ["That changes how this looks."]
      },
      revelation: {
        very_low: ["Something showed."],
        low: ["That revealed something."],
        medium: ["That reveals more."],
        high: ["That's a real revelation."],
        very_high: ["That revelation hits hard."]
      },
      humility: {
        very_low: ["You checked yourself."],
        low: ["That took humility."],
        medium: ["Humility helped."],
        high: ["That humility matters."],
        very_high: ["That humility shows maturity."]
      },
      gravity: {
        very_low: ["This has weight."],
        low: ["This is serious."],
        medium: ["There's real gravity here."],
        high: ["This carries heavy weight."],
        very_high: ["This is deadly serious."]
      },
      consequential_awareness: {
        very_low: ["This matters."],
        low: ["There are consequences."],
        medium: ["This will affect things."],
        high: ["This will come back on you."],
        very_high: ["This will define what follows."]
      },
      threshold: {
        very_low: ["Near a line."],
        low: ["Close to the edge."],
        medium: ["You're at a threshold."],
        high: ["This is a major threshold."],
        very_high: ["Cross this and there's no return."]
      },
      emergence: {
        very_low: ["Something's starting."],
        low: ["Change is showing."],
        medium: ["Something new is forming."],
        high: ["A new side is emerging."],
        very_high: ["You're becoming something else."]
      },
      transformation_acknowledgment: {
        very_low: ["You're changing."],
        low: ["This marks change."],
        medium: ["That's real transformation."],
        high: ["You've changed noticeably."],
        very_high: ["That change is permanent."]
      },
      maturation: {
        very_low: ["You've grown."],
        low: ["You're maturing."],
        medium: ["That shows growth."],
        high: ["You've grown sharper."],
        very_high: ["That's hard-earned maturity."]
      },
      acceptance: {
        very_low: ["Fine."],
        low: ["Accepted."],
        medium: ["I accept this."],
        high: ["This is acceptable."],
        very_high: ["No objections."]
      },
      deferral: {
        very_low: ["Not now."],
        low: ["Later."],
        medium: ["This can wait."],
        high: ["Leave this for later."],
        very_high: ["Now is not the time."]
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

  // STUB: Remaining Core Mentors (8 total)
  // Each mentor follows the same structure as Miraj, Breach, Lead above
  // TODO: Complete variants for these mentors
  ol_salty: { judgments: {} },
  j0_n1: { judgments: {} },
  darth_miedo: { judgments: {} },
  darth_malbada: { judgments: {} },
  tio_the_hutt: { judgments: {} },

  // STUB: Prestige Class Mentors (32+)
  // These are defined in mentor-dialogues.json and may be integrated
  // into the judgment system in the future. All follow standard structure.
  // TODO: Complete variants as prestige mentors are added to judgment system

  // Ace Pilot Mentors
  mayu: { judgments: {} },

  // Assassin Mentors
  delta: { judgments: {} },

  // Bounty Hunter Mentors
  kex_varon: { judgments: {} },

  // Charlatan Mentors
  silvertongue_sela: { judgments: {} },

  // Corporate Agent Mentors
  marl_skindar: { judgments: {} },

  // Droid Commander Mentors
  general_axiom: { judgments: {} },

  // Enforcer Mentors
  krag_the_immovable: { judgments: {} },

  // Force Adept Mentors
  seeker_vera: { judgments: {} },

  // Force Disciple Mentors
  riquis: { judgments: {} },

  // Gladiator Mentors
  pegar: { judgments: {} },

  // Gunslinger Mentors
  rajma: { judgments: {} },

  // Imperial Knight Mentors
  dezmin: { judgments: {} },

  // Improviser Mentors
  lucky_jack: { judgments: {} },

  // Independent Droid Mentors
  seraphim: { judgments: {} },

  // Infiltrator Mentors
  infiltrator_delta: { judgments: {} },

  // Martial Arts Master Mentors
  master_zhen: { judgments: {} },

  // Master Privateer Mentors
  the_captain: { judgments: {} },

  // Medic Mentors
  kyber: { judgments: {} },

  // Melee Duelist Mentors
  blade_master_kharjo: { judgments: {} },

  // Military Engineer Mentors
  chief_engineer_rax: { judgments: {} },

  // Officer Mentors
  admiral_korr: { judgments: {} },

  // Outlaw Mentors
  rogue: { judgments: {} },

  // Saboteur Mentors
  spark: { judgments: {} },

  // Shaper Mentors
  shaper_urza: { judgments: {} },

  // Vanguard Mentors
  shield_captain_theron: { judgments: {} }
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
