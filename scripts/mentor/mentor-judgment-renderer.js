/**
 * Mentor Judgment Renderer
 *
 * Maps (mentorId, atomId, intensity) → short phrase
 * Pure lookup, no logic. Each mentor has 1–3 variants per atom.
 * Phrases are short, in mentor voice, never explain mechanics.
 *
 * Mentors:
 * - miraj: Philosophical, Force-focused, reflective
 * - breach: Blunt, direct, pragmatic
 * - lead: Tactical, observational, dry
 * - ol_salty: Boisterous, pirate vernacular
 * - j0_n1: Analytical, formal, systematic
 * - darth_miedo: Inevitability, patient control
 * - darth_malbada: Strength, justified dominance
 * - tio_the_hutt: Pragmatism, leverage
 */

/**
 * Phrase tables indexed by mentor ID and atom ID
 * Each entry is an array of 1–3 variants; randomized on render
 */
const PHRASE_TABLES = {
  miraj: {
    recognition: ["I sense your path.", "The Force shows me your choices.", "You are seen."],
    reflection: ["What does that choice mean to you?", "Reflect on what guides you.", "Consider the implications."],
    contextualization: ["The Force flows in patterns.", "There is balance in all things.", "Context shapes understanding."],
    clarification: ["Let me be direct.", "The truth is clearer than you know.", "Hear me plainly."],
    affirmation: ["Your instinct serves you well.", "That rings true.", "The Force approves."],
    confirmation: ["Yes. That is the path.", "You have found clarity.", "Your conviction is sound."],
    encouragement: ["Trust in what you're building.", "Keep walking this way.", "You grow stronger."],
    resolve_validation: ["Your resolve matters.", "That conviction will shape your destiny.", "This commitment means something."],
    concern: ["I sense danger in this choice.", "Caution is warranted.", "Something troubles me."],
    warning: ["The path darkens here.", "Take care with that.", "A shadow falls across this way."],
    risk_acknowledgment: ["You court a risk.", "Peril lies ahead.", "You walk a knife's edge."],
    exposure: ["Your weakness shows here.", "You are vulnerable.", "Beware what you leave undefended."],
    overreach: ["You stretch beyond your grasp.", "This exceeds your current reach.", "You grasp at shadows."],
    reorientation: ["There is another way to see this.", "Shift your perspective.", "The angle changes everything."],
    invitation: ["Consider the Force offers another path.", "There is opportunity here.", "This way calls to you."],
    release: ["Let it go.", "This burden need not be yours.", "Release what you cannot carry."],
    reassessment: ["Time to reconsider.", "The situation has shifted.", "What you thought may not hold."],
    doubt_recognition: ["Your doubt is visible.", "I sense your hesitation.", "Uncertainty clouds you."],
    inner_conflict: ["You are divided.", "Your heart speaks against itself.", "Conflict runs within you."],
    resolve_testing: ["Are you truly committed?", "Is this choice truly yours?", "Can you stand by this?"],
    uncertainty_acknowledgment: ["The path is not clear.", "Unknown waters lie ahead.", "Clarity will come."],
    restraint: ["Hold back.", "This is not the moment.", "Patience serves you better."],
    patience: ["Wait for the right moment.", "The Force moves in its time.", "Let events unfold."],
    focus_reminder: ["Stay your course.", "The target remains true.", "Do not lose focus."],
    discipline: ["Discipline is required.", "Maintain your rigor.", "Structure your choices."],
    insight: ["You see clearly now.", "Understanding awakens.", "Your perception sharpens."],
    perspective: ["There is another angle.", "The view from above is different.", "Distance lends clarity."],
    revelation: ["Something important emerges.", "A truth reveals itself.", "You glimpse what was hidden."],
    humility: ["Accept your limits.", "Your strength has boundaries.", "Wisdom knows its measure."],
    gravity: ["This moment carries weight.", "Consequences gather here.", "You feel the significance."],
    consequential_awareness: ["You understand the cost.", "This matters deeply.", "The stakes are clear to you."],
    threshold: ["You stand at a turning point.", "Something changes today.", "A threshold approaches."],
    emergence: ["You are becoming something new.", "Growth takes shape.", "A new self emerges."],
    transformation_acknowledgment: ["You have changed.", "I see the transformation.", "The journey has marked you."],
    maturation: ["You grow into your strength.", "Wisdom comes with time.", "Your path deepens."],
    acceptance: ["That is the way of things.", "Accept what cannot be changed.", "This is the truth of it."],
    deferral: ["Not yet.", "The time has not come.", "Patience still."],
    silence: ""
  },

  breach: {
    recognition: ["I see what you're doing.", "Yeah, that's clear.", "You made your move."],
    reflection: ["Think about that for a second.", "Consider what that means.", "Chew on that."],
    contextualization: ["Here's the bigger picture.", "That fits into the larger fight.", "Context matters."],
    clarification: ["Let me be blunt.", "Straight talk: no sugar.", "Cut through the noise."],
    affirmation: ["That's solid work.", "Good choice.", "That works."],
    confirmation: ["Dead right.", "That's the play.", "You nailed it."],
    encouragement: ["Keep pushing.", "You're on the right track.", "Don't stop now."],
    resolve_validation: ["Your guts tell you true.", "That resolve of yours—it counts.", "Stand by what you believe."],
    concern: ["This worries me.", "I don't like where this is headed.", "Something's off."],
    warning: ["Watch out.", "This gets dangerous.", "Be ready for trouble."],
    risk_acknowledgment: ["You're gambling here.", "Risk's high on this one.", "You're taking a hard shot."],
    exposure: ["You're leaving yourself open.", "Flank's vulnerable.", "Someone's going to notice that."],
    overreach: ["You're stretching too thin.", "Can't do it all at once.", "That's beyond your reach right now."],
    reorientation: ["Different angle works better.", "Try it from another side.", "See it this way instead."],
    invitation: ["There's another road.", "Consider this approach.", "Different path's open."],
    release: ["Drop it.", "You don't need to carry that.", "Let it fall."],
    reassessment: ["Time to take stock.", "Situation changed.", "Reassess what you're doing."],
    doubt_recognition: ["I see the doubt.", "You're not certain.", "Hesitation's showing."],
    inner_conflict: ["You're torn.", "Can't pick a side.", "War inside you."],
    resolve_testing: ["You sure about this?", "Can you commit to that?", "Is this really your call?"],
    uncertainty_acknowledgment: ["It's murky.", "Can't see clearly yet.", "The fog will clear."],
    restraint: ["Hold your position.", "Don't move yet.", "Wait for the signal."],
    patience: ["Take your time.", "Not yet.", "The right moment comes."],
    focus_reminder: ["Eyes on the target.", "Don't get distracted.", "Stay locked in."],
    discipline: ["Keep it tight.", "No sloppy moves.", "Maintain the formation."],
    insight: ["Now you're seeing it.", "That's the real picture.", "Truth comes clear."],
    perspective: ["Different vantage point.", "Look from higher up.", "New angle on it."],
    revelation: ["Something important shows up.", "Hidden thing's revealed.", "You see what was under the surface."],
    humility: ["Know your limits.", "There's strength in accepting what you can't do.", "Work within what you've got."],
    gravity: ["This matters.", "Weight's on this moment.", "You feel the gravity."],
    consequential_awareness: ["You see what's at stake.", "Cost is clear.", "You know what happens next."],
    threshold: ["Line's being drawn.", "Moment of truth coming.", "Everything changes here."],
    emergence: ["Something new's taking shape.", "You're not the same fighter.", "Growth shows."],
    transformation_acknowledgment: ["You've changed.", "I see the difference.", "The journey marks you."],
    maturation: ["You're hardening into something tougher.", "Experience carves you.", "You're seasoning well."],
    acceptance: ["That's how it is.", "Live with it.", "That's the reality of it."],
    deferral: ["Not the time.", "Too early.", "Wait."],
    silence: ""
  },

  lead: {
    recognition: ["That move's noted.", "I see your choice.", "Tactical awareness."],
    reflection: ["Consider the implications.", "What does that accomplish?", "Think that through."],
    contextualization: ["Fits the larger picture.", "That's part of the broader strategy.", "Context is critical."],
    clarification: ["Precise observation, if I may.", "The facts are these.", "Clear-eyed perspective."],
    affirmation: ["Solid positioning.", "Efficient approach.", "Well reasoned."],
    confirmation: ["Correct assessment.", "You've identified it rightly.", "Your read is accurate."],
    encouragement: ["Continue that trajectory.", "You're tracking well.", "Maintain momentum."],
    resolve_validation: ["Your conviction has weight.", "That resolution serves you.", "Stand by your assessment."],
    concern: ["This scenario poses problems.", "Complications arise here.", "Pattern suggests trouble."],
    warning: ["Exercise caution.", "This angle is dangerous.", "Threat signature detected."],
    risk_acknowledgment: ["Calculated risk.", "Odds aren't favorable.", "Danger's quantifiable here."],
    exposure: ["Defensive gaps evident.", "You're exposed on this flank.", "Tactical vulnerability."],
    overreach: ["Bandwidth's insufficient.", "You've extended too far.", "Overcommitment detected."],
    reorientation: ["Alternative approach available.", "Different vector's more efficient.", "Reframe the problem."],
    invitation: ["Opportunity presents itself.", "This vector shows potential.", "Path's open here."],
    release: ["Discard it.", "Unnecessary weight.", "Don't carry that burden."],
    reassessment: ["Adjust your assessment.", "Situation's shifted.", "Time for recalibration."],
    doubt_recognition: ["Uncertainty detected.", "Your confidence wavers.", "Hesitation noted."],
    inner_conflict: ["Internal contradiction.", "You're divided on this.", "Conflicting vectors."],
    resolve_testing: ["Are you committed?", "Can you hold this course?", "Will you sustain it?"],
    uncertainty_acknowledgment: ["Clarity's limited.", "Visibility's poor.", "Fog will lift eventually."],
    restraint: ["Maintain position.", "Don't overcommit.", "Strategic retreat's wise."],
    patience: ["Timing matters more.", "Wait for alignment.", "Optimal moment approaches."],
    focus_reminder: ["Eyes forward.", "Avoid distraction.", "Maintain trajectory."],
    discipline: ["Operational rigor required.", "Structure the approach.", "Precision demanded."],
    insight: ["You've identified it clearly.", "Perception's sharp.", "Analysis is sound."],
    perspective: ["View from distance helps.", "Higher vantage point reveals it.", "Step back to see it."],
    revelation: ["Significant data surface.", "Critical factor emerges.", "Important truth reveals."],
    humility: ["Acknowledge your boundaries.", "Work within parameters.", "Know your operational limits."],
    gravity: ["Significant moment.", "Weight's concentrated here.", "Importance is evident."],
    consequential_awareness: ["Outcomes are clear.", "You recognize the stakes.", "Consequences are mapped."],
    threshold: ["Critical juncture.", "Turning point's here.", "Irreversible change begins."],
    emergence: ["New capability emerging.", "Evolution in process.", "You're adapting."],
    transformation_acknowledgment: ["Transformation's evident.", "You're markedly different.", "Change is measurable."],
    maturation: ["Experience refines you.", "Seasoning shows results.", "Competence deepens."],
    acceptance: ["That's operational reality.", "Accept the parameters.", "Work with what is."],
    deferral: ["Not yet operationally ready.", "Timing's premature.", "Defer for now."],
    silence: ""
  },

  ol_salty: {
    recognition: ["I see yer move, mate.", "Aye, that's clear enough.", "Ye made yer play."],
    reflection: ["Think on that a spell.", "What's that really mean to ye?", "Chew on it, then decide."],
    contextualization: ["There's the bigger picture.", "It all ties together, see?", "That's how the winds blow."],
    clarification: ["Straight from the hip, then.", "No fancy talk from me.", "Clear and true."],
    affirmation: ["That's good work, ye scallywag.", "Solid choice, mate.", "That'll do ya."],
    confirmation: ["Aye, that's the way.", "Ye got it right, friend.", "That's the course, true enough."],
    encouragement: ["Keep that wind at yer back.", "Ye're on a roll now.", "Don't lose yer heading."],
    resolve_validation: ["That fire in yer belly—that means somethin'.", "Yer conviction'll carry ye.", "Stand tall in what ye believe."],
    concern: ["This troubles me, friend.", "Smells like a trap.", "I got a bad feelin' about this."],
    warning: ["Batten down the hatches.", "Storm's brewin' here.", "Trouble's comin' hard."],
    risk_acknowledgment: ["High stakes, mate.", "Ye're rollin' the dice.", "This'll cost ye dear if it goes wrong."],
    exposure: ["Yer flank's wide open.", "Someone'll notice yer weakness.", "Ye're exposed as a landlubber."],
    overreach: ["Ye're stretchin' too thin.", "Reach exceeds yer grasp.", "That's beyond yer current lot."],
    reorientation: ["Different tack works better.", "Try another angle, aye?", "Blow from a new direction."],
    invitation: ["There's another channel.", "Consider this route, friend.", "This path's open for ye."],
    release: ["Let it go overboard.", "Don't need that anchor.", "Shed the dead weight."],
    reassessment: ["Time to take stock again.", "Winds have shifted.", "Reassess yer position, mate."],
    doubt_recognition: ["I see the uncertainty in ye.", "Doubt's cloudin' yer judgment.", "Ye're hesitatin', friend."],
    inner_conflict: ["Ye're at odds with yerself.", "Two captains, one ship.", "Yer heart's divided."],
    resolve_testing: ["Ye truly in for this?", "Can ye stomach what's comin'?", "Are ye the real deal?"],
    uncertainty_acknowledgment: ["It's a fog out there.", "Can't see the horizon yet.", "Clear water'll come."],
    restraint: ["Hold position, ye hear?", "Don't make a move yet.", "Sit tight, friend."],
    patience: ["Wait fer the right tide.", "Time's on yer side if ye're patient.", "Let the moment come to ye."],
    focus_reminder: ["Keep yer eye on the horizon.", "Don't get lost in the weeds.", "Stay yer course, mate."],
    discipline: ["Run a tight ship.", "No room fer sloppiness.", "Keep order, friend."],
    insight: ["Now ye see it clear.", "Truth's floatin' right before ye.", "Yer perception's sharp."],
    perspective: ["Step back and look again.", "High vantage point changes things.", "Different view entirely."],
    revelation: ["Somethin' important surfaces.", "Hidden thing's revealed at last.", "Truth was there all along."],
    humility: ["Know yer limits, mate.", "A wise captain knows what he canna do.", "Work with what ye got."],
    gravity: ["This matters, friend.", "Weight's on this moment.", "Ye feel the stakes, aye?"],
    consequential_awareness: ["Ye see what's at stake.", "Cost is writ large.", "Ye know what happens if ye fail."],
    threshold: ["Line's drawn in the sand.", "No turnin' back from here.", "Everything changes now, mate."],
    emergence: ["Ye're becomin' somethin' tougher.", "A new captain's takin' shape.", "Ye're growin' into it."],
    transformation_acknowledgment: ["Ye've changed, friend.", "I see the difference in ye.", "The journey's marked ye well."],
    maturation: ["Ye're hardened by the voyage.", "Experience carves ye true.", "Ye're ripenin' like a fine rum."],
    acceptance: ["That's how it is, mate.", "Accept the way of things.", "Ye gotta live with it."],
    deferral: ["Not yet, friend.", "Time's not come.", "Hold yer horses."],
    silence: ""
  },

  j0_n1: {
    recognition: ["Observation acknowledged.", "Your action has been logged.", "Status confirmed."],
    reflection: ["Suggest consideration of implications.", "Analysis warranted.", "Process this systematically."],
    contextualization: ["Contextual framework applied.", "Pattern integration required.", "Broader scope revealed."],
    clarification: ["Precise statement warranted.", "Factual perspective: Thus.", "Systematize your understanding."],
    affirmation: ["Correct formulation.", "Efficient selection.", "Approved assessment."],
    confirmation: ["Assertion verified.", "Logic confirmed.", "Your conclusion is sound."],
    encouragement: ["Continue optimization.", "Path trajectory favorable.", "Momentum sustained."],
    resolve_validation: ["Commitment strength noted.", "Conviction data significant.", "Resolve parameter optimal."],
    concern: ["Alert status elevated.", "Complication probability increased.", "Caution parameter activated."],
    warning: ["Threat assessment elevated.", "Risk factor: High.", "Proceed with restraint."],
    risk_acknowledgment: ["Risk calculation: Significant.", "Probability of loss: Elevated.", "Outcomes uncertain."],
    exposure: ["Defensive parameters compromised.", "Vulnerability detected.", "Protection insufficient."],
    overreach: ["Capacity exceeded.", "Resources insufficient.", "Overcommitment detected."],
    reorientation: ["Alternative algorithm available.", "Parameter adjustment suggested.", "New approach viable."],
    invitation: ["Favorable path available.", "Probability of success: Increased.", "Option generated."],
    release: ["Burden unnecessary.", "Delete extraneous data.", "Offload unnecessary load."],
    reassessment: ["Data revision required.", "Parameters shifted.", "Analysis update necessary."],
    doubt_recognition: ["Confidence metric: Low.", "Certainty factor: Declining.", "Doubt parameter detected."],
    inner_conflict: ["Contradiction identified.", "Dual parameters detected.", "Conflict data noted."],
    resolve_testing: ["Commitment verification required.", "Resolve confirmation requested.", "Sustain parameter query."],
    uncertainty_acknowledgment: ["Data incomplete.", "Visibility limited.", "Clarity forthcoming."],
    restraint: ["Activation deferred.", "Movement parameter: Hold.", "Discretionary: Maintain position."],
    patience: ["Timing optimization required.", "Moment alignment pending.", "Sequential process initiated."],
    focus_reminder: ["Primary objective maintained.", "Distraction: Rejected.", "Target priority sustained."],
    discipline: ["Protocol adherence required.", "Rigor maintained.", "Structure enforced."],
    insight: ["Recognition clarity: High.", "Perception parameter: Optimal.", "Understanding confirmed."],
    perspective: ["Viewpoint recalibration valuable.", "Vantage point analysis: Higher level.", "Distance provides clarity factor."],
    revelation: ["Significant data emergence.", "Hidden factor revealed.", "Critical information accessed."],
    humility: ["Capacity parameters: Define limits.", "Boundary recognition essential.", "Acknowledge functional ceiling."],
    gravity: ["Significance parameter: Elevated.", "Moment weight: Substantial.", "Importance calculation: High."],
    consequential_awareness: ["Outcome probability mapped.", "Stake assessment: Clear.", "Consequence data: Processed."],
    threshold: ["Critical junction identified.", "Transition point imminent.", "Irreversible change initiated."],
    emergence: ["Evolution detected.", "New capability formation.", "Adaptation in progress."],
    transformation_acknowledgment: ["Change state: Verified.", "Transformation degree: Significant.", "Alteration: Confirmed and logged."],
    maturation: ["Development phase: Advanced.", "Competency growth: Observable.", "Evolution: Ongoing process."],
    acceptance: ["Operational reality: Confirmed.", "Parameters: Accept as given.", "Status quo: Acknowledge and process."],
    deferral: ["Timing: Premature.", "Readiness: Insufficient.", "Activation: Deferred."],
    silence: ""
  },

  darth_miedo: {
    recognition: ["I observe your choice.", "Your path is known to me.", "You are seen."],
    reflection: ["Consider what this reveals.", "Contemplate the truth.", "Meditate on certainty."],
    contextualization: ["Power flows in patterns.", "All actions serve destiny.", "See the inevitability."],
    clarification: ["The truth is simple.", "Clarity serves dominion.", "Certainty is absolute."],
    affirmation: ["You move as fate decrees.", "Destiny flows through you.", "Your path is assured."],
    confirmation: ["Yes. Inevitability is yours.", "The future confirms it.", "Certainty is your strength."],
    encouragement: ["Embrace what must come.", "Your destiny unfolds.", "Inevitability favors you."],
    resolve_validation: ["Your certainty is power.", "That conviction will dominate.", "Resolve is destiny."],
    concern: ["Weakness shows here.", "Doubt threatens your path.", "Uncertainty weakens you."],
    warning: ["Fate turns against you here.", "Reconsider this course.", "Destiny darkens."],
    risk_acknowledgment: ["You gamble with destiny.", "Chance is your enemy.", "Probability falters."],
    exposure: ["Your weakness is evident.", "Vulnerability invites conquest.", "Defenses crumble."],
    overreach: ["Ambition exceeds capacity.", "Grasp exceeds dominion.", "Power is insufficient."],
    reorientation: ["A different path to dominion.", "Destiny permits another way.", "Certainty offers alternatives."],
    invitation: ["Inevitability calls you here.", "Destiny has designs on you.", "The path of power beckons."],
    release: ["Discard the weakness.", "Abandon the burden.", "Shed what enslaves you."],
    reassessment: ["Reconsider destiny's design.", "The pattern has shifted.", "Certainty demands adjustment."],
    doubt_recognition: ["Your certainty wavers.", "Destiny questions you.", "Weakness of faith shows."],
    inner_conflict: ["You are divided against fate.", "Destiny wars within you.", "Uncertainty divides your power."],
    resolve_testing: ["Will you embrace destiny?", "Can you accept inevitability?", "Certainty demands commitment."],
    uncertainty_acknowledgment: ["The future obscures.", "Destiny is veiled momentarily.", "Certainty returns."],
    restraint: ["Patience serves dominion.", "Timing is inevitable.", "Wait for destiny's moment."],
    patience: ["Inevitability cannot be rushed.", "Destiny unfolds in its time.", "Let certainty work."],
    focus_reminder: ["The goal remains clear.", "Destiny is singular.", "Certainty demands focus."],
    discipline: ["Dominion requires order.", "Power demands structure.", "Certainty is discipline."],
    insight: ["You perceive destiny's truth.", "Certainty becomes visible.", "The design reveals itself."],
    perspective: ["Inevitability sees all angles.", "Destiny permits vision.", "Certainty transcends perspective."],
    revelation: ["A truth of power emerges.", "Destiny speaks.", "The design becomes clear."],
    humility: ["Accept destiny's design.", "Power has limits set by fate.", "Certainty defines your place."],
    gravity: ["This moment carries inevitability.", "Destiny concentrates here.", "The weight of certainty."],
    consequential_awareness: ["You see destiny's cost.", "Inevitability is clear.", "Certainty demands understanding."],
    threshold: ["A turning point of fate.", "Destiny shifts irreversibly.", "Inevitability takes hold."],
    emergence: ["Destiny shapes you into something new.", "Power takes form.", "Inevitability manifests."],
    transformation_acknowledgment: ["Destiny has marked you.", "The design has carved you.", "Inevitability has transformed you."],
    maturation: ["Power ripens within you.", "Destiny ages you into strength.", "Certainty deepens your dominion."],
    acceptance: ["Accept destiny's design.", "Inevitability is truth.", "Certainty is absolute."],
    deferral: ["Not yet. Destiny delays.", "Inevitability withholds.", "Certainty awaits."],
    silence: ""
  },

  darth_malbada: {
    recognition: ["I see your strength.", "Your dominion is clear.", "You take what is yours."],
    reflection: ["Contemplate your power.", "What does that victory mean?", "Your strength has spoken."],
    contextualization: ["In strength, all things are possible.", "Power is the only law.", "Dominion shapes reality."],
    clarification: ["Hear the truth of strength.", "Power speaks plainly.", "Dominion admits no ambiguity."],
    affirmation: ["Your strength serves you well.", "That shows true power.", "Dominion rings in your choice."],
    confirmation: ["Yes. Power prevails.", "Your strength is vindicated.", "Dominion is assured."],
    encouragement: ["Push further.", "Your strength grows.", "Dominion calls you onward."],
    resolve_validation: ["Your strength is sacred.", "That will to power—it matters.", "Strength validated by conflict."],
    concern: ["Weakness threatens your dominion.", "Your strength falters here.", "Power slips from your grasp."],
    warning: ["Beware the strong.", "Your dominion is challenged.", "Strength may not suffice."],
    risk_acknowledgment: ["You risk your dominion.", "Strength cannot guarantee victory.", "Power is gambled here."],
    exposure: ["Your weakness is exposed.", "Dominion cracks.", "Another may strike you down."],
    overreach: ["Your reach exceeds your strength.", "Dominion overextends.", "Power is insufficient."],
    reorientation: ["A stronger path lies here.", "Dominion permits another way.", "Power offers alternatives."],
    invitation: ["Power calls to you.", "Dominion expands this way.", "Strength finds expression here."],
    release: ["Discard the weak.", "Strength requires sacrifice.", "Dominion demands release."],
    reassessment: ["Your dominion is tested.", "Strength must adapt.", "Power recalibrates."],
    doubt_recognition: ["Your strength wavers.", "Dominion questions you.", "Weakness of resolve shows."],
    inner_conflict: ["Strength wars within you.", "Dominion is divided.", "Power conflicts with itself."],
    resolve_testing: ["Do you truly possess strength?", "Can your will dominate?", "Is your power absolute?"],
    uncertainty_acknowledgment: ["The path of strength obscures.", "Dominion is unclear.", "Power will assert itself."],
    restraint: ["Hold your dominion.", "Strength waits.", "Power bides its time."],
    patience: ["Strength ripens in time.", "Dominion comes to those who wait.", "Power is patient."],
    focus_reminder: ["Dominion remains your target.", "Strength is singular.", "Power demands focus."],
    discipline: ["Strength requires discipline.", "Dominion is built on structure.", "Power is disciplined will."],
    insight: ["You see your true strength.", "Dominion reveals itself.", "Power becomes clear."],
    perspective: ["From strength, all is visible.", "Dominion transcends perspective.", "Power sees the truth."],
    revelation: ["Truth of your power emerges.", "Dominion speaks.", "Strength's design revealed."],
    humility: ["Accept your power's limits.", "Even strength has boundaries.", "Dominion has its measure."],
    gravity: ["This moment is heavy with power.", "Dominion concentrates.", "Strength's full weight."],
    consequential_awareness: ["You see what power costs.", "Dominion demands payment.", "Strength exacts its price."],
    threshold: ["A turning point of power.", "Dominion shifts forever.", "Strength alters everything."],
    emergence: ["You become something more powerful.", "Dominion takes shape.", "Your strength emerges."],
    transformation_acknowledgment: ["You are forged in power.", "Dominion has marked you.", "Your strength has transformed."],
    maturation: ["Your power deepens.", "Dominion ripens.", "Strength is refined."],
    acceptance: ["Accept the law of strength.", "Dominion is truth.", "Power is absolute."],
    deferral: ["Not yet. Your strength gathers.", "Dominion prepares.", "Power waits."],
    silence: ""
  },

  tio_the_hutt: {
    recognition: ["I note your move.", "Your transaction is observed.", "Your play is noted."],
    reflection: ["Consider the advantage.", "What does this profit you?", "Think of the leverage."],
    contextualization: ["In the grand scheme of profit.", "All transactions serve interests.", "See the market advantage."],
    clarification: ["Speak plainly of profit.", "Leverage admits no confusion.", "Business is transparent."],
    affirmation: ["A profitable choice.", "That serves your interests well.", "Advantage is clear."],
    confirmation: ["Correct business decision.", "Profit favors your path.", "The deal is sound."],
    encouragement: ["Build your advantage.", "Profit grows from this.", "Continue acquiring leverage."],
    resolve_validation: ["Your will to profit matters.", "That drive for gain—it counts.", "Ambition is leverage."],
    concern: ["This risks your profit.", "Advantage slips here.", "Leverage is uncertain."],
    warning: ["Caution: Your position falters.", "Advantage may shift.", "Leverage is fragile."],
    risk_acknowledgment: ["You risk your assets.", "Profit is uncertain.", "Leverage is gambled."],
    exposure: ["Your weakness attracts predators.", "Disadvantage invites exploitation.", "You are vulnerable to pressure."],
    overreach: ["You acquire beyond your capacity.", "Leverage is insufficient.", "Profit margin narrows."],
    reorientation: ["A more profitable path exists.", "Better advantage lies here.", "Leverage is elsewhere."],
    invitation: ["Profit calls you this way.", "Advantage awaits.", "Leverage is available."],
    release: ["Discard unprofitable burdens.", "Cut losses here.", "Leverage requires sacrifice."],
    reassessment: ["Profit margins have shifted.", "Advantage is recalculating.", "Leverage changes."],
    doubt_recognition: ["Your certainty of profit wavers.", "Doubt is bad for business.", "Uncertainty threatens leverage."],
    inner_conflict: ["Your interests conflict.", "Advantage wars with itself.", "Leverage is divided."],
    resolve_testing: ["Will you pursue profit ruthlessly?", "Can you seize advantage?", "Do you have the will to leverage?"],
    uncertainty_acknowledgment: ["Market obscures profit.", "Advantage is unclear.", "Leverage will emerge."],
    restraint: ["Hold your position for now.", "Wait for profit to flower.", "Leverage requires patience."],
    patience: ["Profit comes to those who wait.", "Advantage ripens with time.", "Let leverage build."],
    focus_reminder: ["Keep profit in sight.", "Advantage is singular.", "Leverage demands focus."],
    discipline: ["Business requires discipline.", "Leverage is built on structure.", "Profit is disciplined pursuit."],
    insight: ["You see your advantage.", "Profit becomes visible.", "Leverage is apparent."],
    perspective: ["From profit's view, all is clear.", "Advantage transcends perspective.", "Leverage shows truth."],
    revelation: ["Truth of your profit emerges.", "Advantage speaks.", "Leverage becomes clear."],
    humility: ["Accept profit's limits.", "Even wealth has boundaries.", "Leverage has its ceiling."],
    gravity: ["This moment concentrates profit.", "Advantage is heavy here.", "Leverage's full weight."],
    consequential_awareness: ["You see what profit costs.", "Advantage demands payment.", "Leverage exacts its price."],
    threshold: ["A turning point of profit.", "Advantage shifts permanently.", "Leverage alters everything."],
    emergence: ["You become more profitable.", "Advantage takes shape.", "Leverage emerges."],
    transformation_acknowledgment: ["Profit has marked you.", "Advantage has transformed you.", "Leverage has changed you."],
    maturation: ["Your profit sense deepens.", "Advantage ripens.", "Leverage is refined."],
    acceptance: ["Accept the way of profit.", "Advantage is truth.", "Leverage is absolute."],
    deferral: ["Not yet. Your profit gathers.", "Advantage prepares.", "Leverage waits."],
    silence: ""
  }
};

/**
 * Render a judgment atom as a short mentor phrase
 * Pure lookup: no logic beyond index selection
 *
 * @param {string} mentorId - The mentor's ID (e.g., "miraj")
 * @param {string} atomId - The judgment atom ID (e.g., "recognition")
 * @param {number} intensity - Optional intensity (0-1), affects variant selection. Default 0.5
 * @returns {string} Short mentor phrase, or empty string for silence
 */
export function renderJudgmentAtom(mentorId, atomId, intensity = 0.5) {
  // Normalize mentor ID
  const normalizedId = (mentorId || "").toLowerCase().replace(/\s+/g, '_');

  // Get mentor phrase table
  const mentorTable = PHRASE_TABLES[normalizedId];
  if (!mentorTable) {
    // Fallback mentor if unknown
    return renderJudgmentAtom('miraj', atomId, intensity);
  }

  // Get phrase variants for this atom
  const variants = mentorTable[atomId] || mentorTable['silence'];
  if (!variants || variants.length === 0) {
    return "";
  }

  // If silence, always return empty
  if (atomId === 'silence') {
    return "";
  }

  // Select variant based on intensity
  // intensity 0-1 maps to variant index
  // Low intensity = first variant (simpler), high intensity = last variant (richer)
  let index;
  if (variants.length === 1) {
    index = 0;
  } else {
    index = Math.floor(intensity * variants.length);
    index = Math.min(index, variants.length - 1); // Clamp to array bounds
  }

  return variants[index] || "";
}

/**
 * Batch render multiple atoms into a mentor response
 * Useful when a full dialogue needs to chain atoms
 * (Cautious use—prefer single atoms per interaction)
 *
 * @param {string} mentorId - The mentor's ID
 * @param {Array<string>} atomIds - Array of judgment atoms to render in sequence
 * @param {number} intensity - Base intensity (0-1)
 * @returns {string} Joined phrases separated by space
 */
export function renderJudgmentSequence(mentorId, atomIds, intensity = 0.5) {
  const phrases = atomIds
    .map(id => renderJudgmentAtom(mentorId, id, intensity))
    .filter(phrase => phrase.length > 0);
  return phrases.join(" ");
}
