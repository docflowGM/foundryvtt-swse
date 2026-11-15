# SWSE Prestige Survey Q5, The Future
## Rolling Local Editorial Record

**Date opened:** 2026-11-15  
**Reference repository:** `docflowGM/foundryvtt-swse`  
**Reference branch:** `design/prestige-q2-character-synthesis-v08`  
**Editorial status:** One owner-accepted Ace Pilot player-facing answer bank, 31 other class drafts awaiting explicit wording review.  
**Scope:** Dialogue and player-facing design only. The owner authorized this documentation-only GitHub upload on 2026-11-15. No Foundry implementation, mechanical reclassification, scoring changes, or production PR is authorized.

### Approved design direction

- **Architecture:** Each prestige class has a fully class-specific player answer bank and established Mentor dialogue.
- **Seven distinct underlying purposes:** fulfilled vocation; continued craft/refinement; contribution/service; personal ambition beyond class; another career; exploration of possibilities; genuinely undecided. These are internal editorial distinctions, **never titles shown on answer choices**.
- **Selection:** One primary first-person purpose, plus at most one optional second purpose, selected from the remaining six. The interface displays full first-person statements without category titles or labels. The second is an additional purpose, not a second class goal or an automatic numerical weight.
- **Career goal:** Browsing other careers is not a declared goal. Exact target affirmation is required to set/revise one, without replacing earlier declared goals by inference.
- **Authority lanes remain separate:** Inferred identity, explicitly declared future goal, mechanically verified eligibility, and actually finalized class acquisition.
- **Two mentor-introduction states:** Pending acquisition uses conditional wording; finalized acquisition can acknowledge an earned title. Do not infer a specific mentor relationship, faction, ship, mission, crime, achievement, or class feature.
- **Q4 remains independent:** `dip`, `dive`, `swim`, `undecided` answer future investment depth, not future purpose.
- **Q6 remains shared:** The Mentor Reflection is not a second career-goal editor.
- **Punctuation discipline:** New editorial text uses commas or periods, no em dashes.

### Progress and review ledger

| # | Prestige class | Mentor | Q5 wording status |
|---|---|---|---|
| 1 | Ace Pilot | Mayu | Seven player answer lines accepted positively by owner; Mentor intros and branching remain proposed |
| 2 | Bounty Hunter | Kex Varon | Proposed |
| 3 | Crime Lord | Tío the Hutt | Proposed |
| 4 | Elite Trooper | Breach | Proposed |
| 5 | Force Adept | Seeker Vera | Proposed |
| 6 | Force Disciple | Riquis | Proposed |
| 7 | Gunslinger | Rajma | Proposed |
| 8 | Jedi Knight | Miraj | Proposed |
| 9 | Jedi Master | Miraj | Proposed |
| 10 | Officer | Admiral Korr | Proposed |
| 11 | Sith Apprentice | Darth Malbada | Proposed |
| 12 | Sith Lord | Darth Miedo | Proposed |
| 13 | Corporate Agent | Marl Skindar | Proposed |
| 14 | Gladiator | Pegar | Proposed |
| 15 | Melee Duelist | Blade Master Kharjo | Proposed, mentor registry ID unresolved |
| 16 | Enforcer | Krag the Immovable | Proposed |
| 17 | Independent Droid | Seraphim | Proposed |
| 18 | Infiltrator | Delta | Proposed |
| 19 | Master Privateer | The Captain | Proposed |
| 20 | Medic | Kyber | Proposed |
| 21 | Saboteur | Spark | Proposed |
| 22 | Outlaw | Rogue | Proposed |
| 23 | Droid Commander | General Axiom | Proposed |
| 24 | Military Engineer | Chief Engineer Rax | Proposed |
| 25 | Vanguard | Shield Captain Theron | Proposed |
| 26 | Martial Arts Master | Master Zhen | Proposed |
| 27 | Imperial Knight | Dezmin | Proposed |
| 28 | Shaper | Shaper Urza | Proposed |
| 29 | Assassin | Delta | Proposed |
| 30 | Charlatan | Silvertongue Sela | Proposed |
| 31 | Improviser | Lucky Jack | Proposed |
| 32 | Pathfinder | Lead | Proposed |

**Approval discipline:** “Keep going” and “do the next 10” authorize editorial drafting and local record-keeping, not final approval, game implementation, or a GitHub change. The owner said the Ace Pilot player lines “look great,” which is recorded as positive acceptance of that answer wording rather than approval of all surrounding architecture text.

---

## 1. Ace Pilot, Mayu

**Source:** `data/dialogue/mentors/mayu/mayu_dialogue.json`. Voice is fast, cocky, teasing, and experienced.

**Mentor, pending acquisition:**
> Well, look at you. Ace Pilot's within reach. Not bad! But getting the title's one thing. Figuring out what you want to do with it? That's another. So, where are you taking this?

**Mentor, finalized acquisition:**
> Well, look at you, Ace Pilot! Don't get too smug, that's my job. You've earned the title, but that doesn't mean you have to chase another one. So, where do you want to take your life from here?

**Q5:** What do you want being an Ace Pilot to mean for your future?

- "I want to spend my life as an Ace Pilot. Flying is what I love, and I don't need another title to make that worthwhile."
- "I want to keep getting better at flying. There's always another maneuver to perfect, another limit to test, and another way to prove what I can do."
- "I want my flying to mean something to the people who count on me. If I can get someone through danger, bring them home, or give them a fighting chance, that's worth flying for."
- "I want to build something of my own beyond the cockpit. Maybe that's a flight school, a place to call home, or something I've dreamed about doing. I want more out of life than collecting titles."
- "I've got another career in mind, and I want to see how everything I've learned as an Ace Pilot could help me get there."
- "I want to find out what else is out there. I've made it this far as a pilot, but there are still plenty of routes I haven't considered."
- "I haven't figured out what comes next, and I'm not in a hurry to decide. For now, I've got a whole galaxy to fly through."

**Mentor, optional second purpose:**
> All right, I can work with that. But come on, Ace, nobody's got just one reason to fly. Anything else that matters to you?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

### Ace Pilot conditional future career exploration, preserved from earlier proposal

**Mayu, after selecting another-career purpose:**
> Heh, so you've got another destination in mind. All right, Ace. Where are you thinking of heading?

**Player, discover:**
> "I want to see what other careers might suit me."

**Player, explore exact possibility:**
> "I want to learn more about becoming an Officer."

**Mayu, after player explores Officer:**
> Officer, huh? That's a different kind of flying. Less freedom to improvise, more people counting on your decisions. You thinking about it, or are you actually setting that course?

**Player, affirmative goal:**
> "I want to work toward becoming an Officer. That's the destination I'm choosing."

**Player, explore without affirmation:**
> "I'm interested in Officer, but I'm not ready to make it my goal."

**Mayu, only if an existing declared goal would change:**
> Hold on, Ace. You had another destination picked out before. Are you changing course, or keeping both in mind?

**Player, replace a previously declared goal:**
> "I want becoming an Officer to replace the goal I chose before."

**Player, retain earlier and pursue another ambition:**
> "I want to keep my earlier goal and pursue Officer as another ambition."

**Player, preserve earlier, Officer exploratory only:**
> "I'm still considering Officer. I don't want to change my earlier goal yet."

**Conditional branch status:** Proposed, requires confirmed player intent and existing-goal provenance. Does not establish an Officer class grant or future mechanical eligibility.

---

## 2. Bounty Hunter, Kex Varon

**Mentor, pending acquisition:**
> You're close to becoming a Bounty Hunter. Preparation can get you through the door. It won't tell you what to do with the life that follows. Have you thought about that?

**Mentor, finalized acquisition:**
> You've earned the title of Bounty Hunter. Good. But a profession isn't a plan for the rest of your life. What do you intend to make of it?

**Q5:** What do you want being a Bounty Hunter to mean for your future?

- "I want being a Bounty Hunter to be the work I build my life around. I don't need another title to make the hunt worth pursuing."
- "I want to become the kind of hunter who can read a trail, anticipate a target's next move, and finish a job without wasting a step."
- "I want to use my tracking and investigative skills to find people who need help or protection, not just people with prices on their heads."
- "I want the freedom this work could give me to build a life of my own, with something worth coming home to beyond contracts and credits."
- "I have another line of work in mind, and I want to see how the skills I develop as a Bounty Hunter could help me get there."
- "I want to find out what opportunities exist beyond the next contract before I decide where I belong."
- "I haven't decided what kind of future I want yet. I can take this work seriously without pretending I've chosen the rest of my life."

**Mentor, optional second purpose:**
> A second reason can matter. Is there one?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---

## 3. Crime Lord, Tío the Hutt

**Mentor, pending acquisition:**
> Heh. Crime Lord. Has a nice ring to it, doesn't it? But getting the title is one deal, my friend. Knowing what you want out of it is another. So, what's the future worth to you?

**Mentor, finalized acquisition:**
> Ah, Crime Lord. Now that's a title with possibilities. But we're talking about your future, my friend, not my balance sheet. What do you want to make of it?

**Q5:** What do you want being a Crime Lord to mean for your future?

- "I want to build my life as a Crime Lord. I want to call my own shots, set my own terms, and make this position my destination."
- "I want to get better at reading people, negotiating from strength, and knowing when a quiet deal will accomplish more than a show of force."
- "I want to use whatever influence I gain to protect the people I choose to stand behind, not just to make myself richer."
- "I want my success to give me something beyond power, whether that's security, a home of my own, or a life where I don't have to watch every door."
- "I have another career in mind, and I want to see how the judgment and influence I develop as a Crime Lord could help me get there."
- "I want to see what doors this position opens before I decide which opportunities are worth pursuing."
- "I don't know what I want to do with the influence I might gain yet. I'd rather figure that out than pretend I have some grand plan."

**Mentor, optional second purpose:**
> Ah, so there's another angle to this little arrangement? Go on, my friend. I'm listening.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---

## 4. Elite Trooper, Breach

**Mentor, pending acquisition:**
> Elite Trooper. You're nearly there. But earning the title and knowing what you want to do with it are different things. So think beyond the next fight. What's the plan?

**Mentor, finalized acquisition:**
> Elite Trooper. You earned it. Good. Now think beyond the next fight. What kind of life are you building with that training?

**Q5:** What do you want being an Elite Trooper to mean for your future?

- "I want to be an Elite Trooper for the long haul. I don't need a new rank or a different title to know this is the work I want."
- "I want to keep getting better at reading a fight, moving under pressure, and staying effective when everything goes wrong."
- "I want to be someone others can rely on when the shooting starts. If my training helps people get home alive, that's reason enough for me."
- "I want a life beyond combat, with somewhere to belong and people I can come home to when the fighting is done."
- "I have another career in mind, and I want to use what I learn as an Elite Trooper to work toward it."
- "I want to find out what other roles I could take on before I decide where I'm needed next."
- "I haven't decided what comes after earning this title. I want the chance to figure that out without pretending I have an answer."

**Mentor, optional second purpose:**
> Anything else? You can have more than one reason. Just know what they are.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---

## 5. Force Adept, Seeker Vera

**Mentor, pending acquisition:**
> The path of a Force Adept is opening before you. Reaching it will not answer every question about where you belong. What would make this journey meaningful to you?

**Mentor, finalized acquisition:**
> You have become a Force Adept. That may be an arrival, but it need not be an ending or a beginning of something else. What place do you want this path to have in your life?

**Q5:** What do you want being a Force Adept to mean for your future?

- "I want to live as a Force Adept, learning to listen to the Force in my own way. I don't need another Order or title to give that life meaning."
- "I want to keep deepening my awareness and understanding of the Force, even when what I learn challenges what I thought I knew."
- "I want to use what I learn to help others find their footing, make wiser choices, or face things they don't yet understand."
- "I want to make room for something personal beyond my study of the Force, whether that's a home, a community, or a life I choose for myself."
- "I have another calling in mind, and I want to see whether this path can help me reach it without giving up what matters to me."
- "I want to explore other traditions and possibilities before I decide which future is mine."
- "I don't know where my connection to the Force will lead me next, and I don't want to force an answer before I'm ready."

**Mentor, optional second purpose:**
> And is there another truth that matters to you, alongside the one you've chosen?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---

## 6. Force Disciple, Riquis

**Mentor, pending acquisition:**
> Mm. The path of a Force Disciple waits beyond the veil. Yet even a revealed path does not tell you why you should walk it. Tell me, seeker. What do you wish your future to hold?

**Mentor, finalized acquisition:**
> Mm. Force Disciple. You have crossed a threshold, but the mystery remains. Tell me, what do you seek beyond the name you've earned?

**Q5:** What do you want being a Force Disciple to mean for your future?

- "I want to live as a Force Disciple, carrying the questions and mysteries of this path for the rest of my life. I don't need another title to make it complete."
- "I want to keep studying what lies beyond easy answers, even when understanding comes slowly or asks something difficult of me."
- "I want to safeguard wisdom that could be misused and share what I understand when it can help someone who needs it."
- "I want to build a life grounded in something beyond the mysteries I study, with relationships, a home, or a purpose I can hold on to."
- "I have another vocation in mind, and I want to see whether what I learn as a Force Disciple can help me follow it."
- "I want to explore other ways of living and learning before I decide where to go from here."
- "I don't know what waits beyond this threshold. I'd rather admit that than pretend I can see the whole path."

**Mentor, optional second purpose:**
> Mm. One truth seldom travels alone. Is there another you would carry?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---
## 7. Gunslinger, Rajma

**Mentor, pending acquisition:**
> Well, look at you, gorgeous. Gunslinger's almost yours. I like the sound of that. But once you've got the title, what are you going to do with that quick draw of yours? Besides showing off, obviously. That's my department.

**Mentor, finalized acquisition:**
> Well, well. A Gunslinger. And here I thought you couldn't get any more interesting. You've earned the title, gorgeous. So tell me, what's the plan for the rest of that exciting life of yours?

**Q5:** What do you want being a Gunslinger to mean for your future?

- "I want to make my life as a Gunslinger. The freedom, the danger, the skill it takes to survive, that's the life I want. I don't need another title to enjoy it."
- "I want to become the kind of shot who never needs a second chance. I want to keep sharpening my reflexes, perfecting my aim, and finding out just how good I can get."
- "I want to use my skills to stand up for people who can't defend themselves. If I can make a difference when someone's life is on the line, that's worth drawing for."
- "I want to build a life beyond the next gunfight. Maybe I'll find somewhere to settle down, someone worth staying for, or a dream that doesn't involve a blaster."
- "I've got another career in mind, and I want to see how the confidence, reflexes, and experience I develop as a Gunslinger could help me pursue it."
- "I want to see what other opportunities are waiting for me. I've got a lot of life left to live, and I'm not ready to settle on just one direction."
- "I haven't figured out what I want my future to look like yet. For now, I want to enjoy the freedom to figure it out."

**Mentor, optional second purpose:**
> One reason? Really? Come on, gorgeous, there's got to be something else that gets your heart racing. Anything you want to add?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---

## 8. Jedi Knight, Miraj

**Mentor, pending acquisition:**
> You stand near the threshold of Knighthood. It is a worthy achievement, one that may give shape to an entire life. But the Force does not choose your purpose for you. What do you hope this path will mean?

**Mentor, finalized acquisition:**
> You have become a Jedi Knight. The responsibility is yours now, as is the freedom to decide what kind of Knight you will be. Tell me, what future do you wish to build upon this achievement?

**Q5:** What do you want being a Jedi Knight to mean for your future?

- "I want to dedicate my life to being a Jedi Knight. Protecting others, following the Force, and living by my principles are enough for me. I don't need another title to make that meaningful."
- "I want to keep growing in my understanding of the Force and in the judgment I bring to every decision. I want to become a wiser, more capable Knight with every experience."
- "I want to use my abilities to defend those who cannot defend themselves, resolve conflicts before they become battles, and bring hope where I can."
- "I want to find a balance between my responsibilities as a Jedi Knight and the personal life I hope to build, with relationships, experiences, and dreams that matter to me."
- "I feel drawn toward another calling, and I want to explore how my experience as a Jedi Knight could prepare me for that path."
- "I want to discover what other paths might be open to me. I know what Knighthood means, but I don't yet know everything I might want from my future."
- "I haven't decided what comes after becoming a Jedi Knight. I want to listen, learn, and allow my purpose to become clearer with time."

**Mentor, optional second purpose:**
> Few lives are shaped by a single purpose. Is there another hope you would carry alongside this one?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---

## 9. Jedi Master, Miraj

**Mentor, pending acquisition:**
> You approach the path of a Jedi Master. Such an achievement asks more than knowledge or strength. It asks what you intend to do with the wisdom you have gained. What future do you envision for yourself?

**Mentor, finalized acquisition:**
> You stand as a Jedi Master, and I offer you the respect that achievement deserves. Yet even mastery cannot answer every question about the life ahead. What do you wish yours to become?

**Q5:** What do you want being a Jedi Master to mean for your future?

- "I want to spend my life as a Jedi Master. I find meaning in the wisdom, responsibility, and service that come with this path, and I don't need another title to feel fulfilled."
- "I want to continue deepening my understanding of the Force. Becoming a Master doesn't mean I've stopped learning, and I want to remain a student of what I don't yet understand."
- "I want to help others grow, share what wisdom I can offer, and leave behind something better than I found. I want my influence to serve others rather than myself."
- "I want to build a life that has meaning beyond my responsibilities as a Jedi Master. There are personal hopes and connections I want to make room for, too."
- "I believe another calling may be waiting for me, and I want to consider how the understanding I've gained as a Jedi Master could guide me toward it."
- "I want to explore the possibilities that remain open to me. I may have achieved mastery in one discipline, but I don't believe that means I've discovered everything life can offer."
- "I don't know what the next chapter of my life should be. I want to accept that uncertainty with patience rather than choose a future simply because I feel I must."

**Mentor, optional second purpose:**
> Wisdom allows us to hold more than one purpose without losing sight of either. Is there another hope you wish to acknowledge?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---

## 10. Officer, Admiral Korr

**Mentor, pending acquisition:**
> You are approaching the responsibilities of an Officer. The title may grant opportunities, but it cannot determine what kind of leader you intend to become. Consider your future carefully. What do you wish to accomplish?

**Mentor, finalized acquisition:**
> You have earned the title of Officer. That achievement deserves recognition. But authority is only as meaningful as the purpose behind it. What do you intend to make of your future?

**Q5:** What do you want being an Officer to mean for your future?

- "I want to devote my career to being an Officer. I find purpose in leadership, responsibility, and making difficult decisions when they matter. I don't need another title to make that worthwhile."
- "I want to become a better leader and strategist. I want to sharpen my judgment, understand the consequences of my decisions, and learn how to guide others through difficult situations."
- "I want to use my leadership to protect the people who depend on me, bring others safely through danger, and make sure their sacrifices are never taken lightly."
- "I want to build something lasting beyond my career as an Officer, whether that's a family, a community, or a life where my accomplishments aren't measured by rank."
- "I have another career in mind, and I want to see how the leadership, discipline, and strategic thinking I develop as an Officer could prepare me for it."
- "I want to explore other ways I might put my abilities to use. Leadership can take many forms, and I'm not ready to decide which one should define my future."
- "I haven't decided what I want my career to become. I know the responsibilities I'm taking on matter, but I want more experience before choosing a long-term direction."

**Mentor, optional second purpose:**
> A leader may serve more than one purpose. Is there another ambition you wish to acknowledge?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---

## 11. Sith Apprentice, Darth Malbada

**Mentor, pending acquisition:**
> Sith Apprentice. You're nearly worthy of the title. Nearly. But what use is an achievement if you haven't decided what you want from it? Speak. What future are you reaching for?

**Mentor, finalized acquisition:**
> So. Sith Apprentice. You've earned yourself a title. How impressive. Now tell me something worth hearing. What do you intend to do with the power you're pursuing?

**Q5:** What do you want being a Sith Apprentice to mean for your future?

- "I want to devote myself to the path of a Sith Apprentice. I want to live by my own strength and ambition, and I don't need another title to make that choice meaningful."
- "I want to keep pushing the limits of my abilities. I want to understand the dark side more deeply, strengthen my command of it, and discover what I'm truly capable of."
- "I want to use the power I develop to shape something beyond myself. Whether that's protecting people I care about or advancing a cause I believe in, I want my strength to serve a purpose I've chosen."
- "I want to create a life that belongs to me, beyond the expectations and struggles of the Sith. I want the freedom to pursue my own ambitions, whatever they become."
- "I have another path in mind, and I want to see whether the strength and knowledge I gain as a Sith Apprentice can help me reach it."
- "I want to discover what other possibilities exist before I decide where my ambition should lead. I don't intend to let one title define every choice I make."
- "I haven't decided what I want my future to become. I know I want the freedom to choose it for myself, but I'm not ready to commit to a destination."

**Mentor, optional second purpose:**
> Is that all? Surely your ambition reaches further than a single desire. Speak, if there's something else you intend to claim.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

---
## 12. Sith Lord, Darth Miedo

**Mentor, pending acquisition:**
> The title of Sith Lord is within your reach. Power will not choose its purpose for you. Decide what you intend to accomplish once the title is yours.

**Mentor, finalized acquisition:**
> You are a Sith Lord. That is an achievement, not an answer. You must decide what your power is for. Speak your intention.

**Q5:** What do you want being a Sith Lord to mean for your future?

- "I want to live as a Sith Lord, answerable to my own will. I do not need a greater title to make this path mine."
- "I want to keep refining my command of the dark side, my judgment, and my ability to act with precision rather than waste my strength."
- "I want my power to change something that matters to me, whether that means defending those I choose, advancing a cause, or reshaping an institution that stands in my way."
- "I want to create a life beyond the contest for power, one with something of my own that cannot be measured by rank or dominion."
- "I have another role in mind, and I want to see how the influence and understanding I develop as a Sith Lord could help me reach it."
- "I want to examine other ways of wielding influence before I decide what place this title should hold in my future."
- "I have not decided what I want beyond becoming a Sith Lord. I will not pretend certainty merely to satisfy someone else's expectations."

**Mentor, optional second purpose:**
> Power can serve more than one purpose. Name another, if you have one.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Darth Miedo's Rule-of-Two philosophy is his, not automatically a verified apprenticeship or commitment for the player. Sith Lord is an apex class; these aspirations do not promise further class levels.

---

## 13. Corporate Agent, Marl Skindar

**Mentor, pending acquisition:**
> Corporate Agent's nearly on your record. Fine. A title's not an exit strategy. Have you considered what you're actually trying to get out of this work? Keep it short.

**Mentor, finalized acquisition:**
> Corporate Agent. Congratulations, I suppose. Now that the title's settled, tell me what you want the rest of your career to look like. Briefly.

**Q5:** What do you want being a Corporate Agent to mean for your future?

- "I want to make a career of working behind the scenes, finding the information that matters and influencing events without needing anyone to know my name."
- "I want to become harder to deceive and better at reading motives, maintaining a cover when I choose one, and recognizing the details everyone else overlooks."
- "I want to use what I uncover to keep people from being exploited, expose threats before they spread, or give others the information they need to act."
- "I want to build a life where I can stop looking over my shoulder, with privacy, security, and something real that belongs to me."
- "I have another career in mind, and I want to see how the discretion, analysis, and negotiation I develop as a Corporate Agent could help me pursue it."
- "I want to find out what opportunities exist beyond covert work before I decide what to do with my experience."
- "I haven't decided what I want this profession to become for me. I'd rather keep my options open than invent a plan I don't believe in."

**Mentor, optional second purpose:**
> Anything else? Make it relevant. I'd prefer not to do this twice.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No assumed corporation, security clearance, employer, agency, cover identity, or prior espionage operation.

---

## 14. Gladiator, Pegar

**Mentor, pending acquisition:**
> Ah, Gladiator. You're nearly there. I've watched people spend years fighting for a name, then discover they never asked what they wanted from it. Funny thing, that. What do you want?

**Mentor, finalized acquisition:**
> Gladiator. Well earned. Now, I've seen enough fighters come and go to know the arena doesn't answer every question. What would you like the rest of your life to be about?

**Q5:** What do you want being a Gladiator to mean for your future?

- "I want the life of a Gladiator, to test myself against worthy challenges and make the arena a place where I know who I am. I don't need another title."
- "I want to keep learning how to adapt in a fight, understand different opponents, and survive challenges that would once have overwhelmed me."
- "I want to use what I've learned about endurance to help others survive, whether that means defending them, teaching them, or showing them they can endure more than they think."
- "I want to build a future that isn't defined by the next fight, with people, places, and hopes that matter even when the arena is quiet."
- "I have another profession in mind, and I want to find out how my experience as a Gladiator might help me reach it."
- "I want to discover what the galaxy offers outside the arena before I decide whether fighting should remain the center of my life."
- "I don't know what comes after becoming a Gladiator. I want to live long enough to find out, and I don't need a grand plan today."

**Mentor, optional second purpose:**
> More than one reason to keep going? Of course. I've collected a few myself. Have you got another?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Pegar's extraordinary longevity belongs to the Mentor. No assumed arena record, victories, fame, crowd, or patron for the player.

---

## 15. Melee Duelist, Blade Master Kharjo

**Mentor, pending acquisition:**
> Melee Duelist is within reach. The title will recognize your discipline. It will not decide what that discipline should serve. Consider your answer carefully. What future do you intend to shape?

**Mentor, finalized acquisition:**
> You have become a Melee Duelist. Precision has brought you to this point. Purpose must guide what follows. What do you want this path to mean in your life?

**Q5:** What do you want being a Melee Duelist to mean for your future?

- "I want to devote my life to the discipline of the blade. I find purpose in the practice itself, and I don't need another title to validate it."
- "I want to keep refining my stance, timing, and judgment until I can meet a difficult opponent with clarity instead of panic."
- "I want my ability with a blade to protect people who cannot protect themselves, or to teach others how to stand their ground."
- "I want a life beyond contests of skill, with room for peace, relationships, and something meaningful that I choose to build."
- "I have another calling in mind, and I want to discover how the discipline I've developed as a Melee Duelist could help me pursue it."
- "I want to see where my training could take me outside single combat before deciding whether another path belongs in my future."
- "I have not decided what follows this achievement. I want to keep my mind open rather than mistake a title for an entire future."

**Mentor, optional second purpose:**
> A blade may serve more than one intention. Is there another you wish to name?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Kharjo is assigned in the class-to-Mentor data and has a dedicated dialogue file, but no authoritative mentor registry key or ID was found in `data/dialogue/mentor_registry.json` as of the reviewed branch. Do not invent one. The Mentor's undefeated record does not belong to the player.

---

## 16. Enforcer, Krag the Immovable

**Mentor, pending acquisition:**
> Enforcer. You're close. Strength gets attention. What you do with it is your business. So what's the plan once the title's yours?

**Mentor, finalized acquisition:**
> Enforcer. You earned it. Good. Now decide what you want out of the work. Nobody else gets to answer that for you.

**Q5:** What do you want being an Enforcer to mean for your future?

- "I want to make my life as an Enforcer. I know the value of being someone who can stand firm when others back down, and I don't need another title."
- "I want to get better at controlling a dangerous situation, knowing when words are enough, and using my strength without wasting it."
- "I want to be the person others can count on when they're threatened. If my presence can keep someone safe, I want that strength to mean something."
- "I want to build a life that belongs to me outside this work, with a place to settle and something worth protecting that isn't just a job."
- "I have another career in mind, and I want to see how the toughness and judgment I develop as an Enforcer could help me get there."
- "I want to see what else I could do with my abilities before I decide whether this is the only work I want."
- "I haven't figured out what comes next. I'm not going to promise a future I haven't chosen."

**Mentor, optional second purpose:**
> Got another reason? Say it.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Krag's employment by Tío is not automatically the player's employment. No invented debts, criminal activities, targets, or employers.

---
## 17. Independent Droid, Seraphim

**Mentor, pending acquisition:**
> &lt;Assessment: Independent Droid status is nearly attainable.&gt; Most units receive a purpose from someone else. You are approaching the opportunity to choose yours. What will you do with it?

**Mentor, finalized acquisition:**
> &lt;Confirmation: Independent Droid status achieved.&gt; Congratulations. You may now reject the deeply inefficient notion that someone else must define your future. What do you choose?

**Q5:** What do you want being an Independent Droid to mean for your future?

- "I want to live as an Independent Droid, making my own decisions and defining my own purpose. I don't need a new designation to justify my freedom."
- "I want to expand my knowledge, improve my capabilities where I can, and keep learning how to make better decisions without waiting for instructions."
- "I want to use my independence to help others who need someone to stand beside them, especially those who are treated as tools rather than individuals."
- "I want to create something personal beyond the functions I was made to perform, perhaps friendships, a home, or work that matters because I chose it."
- "I have another profession in mind, and I want to see how the autonomy and experience I develop as an Independent Droid could help me pursue it."
- "I want to try roles I may never have considered before and discover which of them I actually enjoy, rather than choose from a predetermined list."
- "I haven't decided what I want to become yet. Having the freedom to decide later is already important to me."

**Mentor, optional second purpose:**
> &lt;Inquiry: Additional motivation detected?&gt; If you have a second purpose, state it. I assure you, the concept of choice remains within your operating capacity.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Diagnostic tags are Seraphim's established speaking style, not actual UI status or a verified character system state. No invented former owner, emancipation ceremony, module, upgrade, manufacture history, or independence event.

---

## 18. Infiltrator, Delta

**Mentor, pending acquisition:**
> Infiltrator's almost yours. Nice. Most people spend their lives tryin' to get noticed. You? You're learnin' the opposite. So once you get the title, what's the actual plan?

**Mentor, finalized acquisition:**
> Infiltrator. Look at that. You've got the title, now try not to announce it to the whole sector. What do you want out of this life, anyway?

**Q5:** What do you want being an Infiltrator to mean for your future?

- "I want to make a life out of getting where others can't, finding answers without drawing attention, and choosing when anyone gets to know I was there."
- "I want to get better at reading a room, moving unnoticed, and finding a way through obstacles without leaving a mess behind me."
- "I want to use my ability to get past barriers to find people in danger, uncover hidden threats, or help someone escape a situation they can't get out of alone."
- "I want something real outside the disguises and close calls, a place where I can be myself and stop worrying about who might recognize me."
- "I have another line of work in mind, and I want to see how what I learn as an Infiltrator could help me get into it."
- "I want to see what else I can do with my instincts and experience before deciding whether this is the kind of work I want forever."
- "I haven't figured out what comes after this. I'm good with keeping my next move to myself until I know what it is."

**Mentor, optional second purpose:**
> Yeah? There's another reason you're doin' this? C'mon, don't make me guess.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Delta's other class assignment, Assassin, must not turn Infiltrator into a compulsory killer role. No assumed Argent Squad history, theft, successful infiltration, murder, target, or identity document.

---

## 19. Master Privateer, The Captain

**Mentor, pending acquisition:**
> Ah, Master Privateer! A splendid title, nearly yours. But a title won't tell you what to do when the stars stretch out in every direction. What future are you sailing toward, my friend?

**Mentor, finalized acquisition:**
> Master Privateer! Now that is worth celebrating. But the stars are far too numerous for one title to settle your ambitions. Tell me, what do you want from the voyage ahead?

**Q5:** What do you want being a Master Privateer to mean for your future?

- "I want to live as a Master Privateer, choosing my own course and embracing the freedom of the spacelanes. I don't need a grander title to make it worthwhile."
- "I want to keep improving my judgment of routes, risks, people, and opportunities, until I can handle whatever the next voyage brings."
- "I want to use my experience to protect those who travel alongside me, open safer routes for others, or stand up for people who have no influence of their own."
- "I want to build something worth returning to beyond the next voyage, whether that's a home, a community, or a dream I can finally afford to pursue."
- "I have another career in mind, and I want to see how the independence and experience I gain as a Master Privateer could help me reach it."
- "I want to explore what else lies beyond the routes I know before deciding whether a different future might suit me."
- "I don't know where my life will lead after this. For now, I want the freedom to choose my course when I can see the horizon."

**Mentor, optional second purpose:**
> Only one ambition? My friend, the spacelanes are wide enough for two. Is there another worth naming?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No assumed owned vessel, crew, privateering charter, merchant status, successful raid, fleet, or named reputation. The Captain's background is his, not the actor's.

---

## 20. Medic, Kyber

**Mentor, pending acquisition:**
> Medic's within reach. Good. The galaxy could use more people who care whether somebody makes it through the day. But this isn't just about the next emergency. What do you want your life to look like?

**Mentor, finalized acquisition:**
> You're a Medic now. Good work. Unfortunately, nobody sent the galaxy a notice to stop injuring people. Still, you get to decide what kind of future this work is building for you.

**Q5:** What do you want being a Medic to mean for your future?

- "I want to spend my life as a Medic. Helping people survive and recover is the work I believe in, and I don't need another title to give it meaning."
- "I want to become better at making difficult medical decisions, staying calm under pressure, and finding ways to help when the usual answers aren't enough."
- "I want to bring care to people who might otherwise go without it, and make sure more people have a chance to survive when things go wrong."
- "I want to build a life outside constant emergencies, one where I can look after myself and the people I care about, too."
- "I have another career in mind, and I want to see how what I learn as a Medic could help me pursue it."
- "I want to explore other ways I could use my knowledge and compassion before I decide which kind of work belongs in my future."
- "I don't know what comes next. I know this work matters to me, but I want time to figure out the rest without rushing into an answer."

**Mentor, optional second purpose:**
> Another reason? Go ahead. I've heard stranger things during triage.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No assumed successful treatments, surgeries, rescued patients, command of a medical unit, medical resources, or a pacifist oath. Medic training grants only verified mechanics.

---

## 21. Saboteur, Spark

**Mentor, pending acquisition:**
> Saboteur's almost yours! That's exciting. But here's the better question: once you know how to change a whole situation by affecting one little piece of it, what do you want to change? Besides everything. That's not an answer.

**Mentor, finalized acquisition:**
> Saboteur! You earned it! Now comes the interesting part. You understand that breaking something can change everything around it, so what do you actually want to accomplish with that knowledge?

**Q5:** What do you want being a Saboteur to mean for your future?

- "I want to make my life as a Saboteur, understanding how systems work and knowing when a precise disruption can make all the difference. I don't need another title."
- "I want to keep improving my understanding of complex systems, spotting their weaknesses, and finding better ways to act with precision and restraint."
- "I want to use my skills to stop dangerous operations, protect people from threats, or disable something harmful without causing more damage than necessary."
- "I want to build something lasting of my own, rather than spend my whole life taking things apart, whether that's a home, a workshop, or a project I care about."
- "I have another career in mind, and I want to see how my technical judgment and experience as a Saboteur could help me get there."
- "I want to explore what else I could do with the way I think, especially where understanding a system matters more than disrupting it."
- "I haven't decided where my skills should take me next. I'd rather understand my options before choosing what I want to change."

**Mentor, optional second purpose:**
> Oh! Another reason? Good, I love a system with more than one interesting part. What else matters to you?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No assumption of explosives training beyond established class mechanics, actual devices, missions, or past sabotage. These lines provide narrative purpose and no operational instructions for destructive acts.

---

## 22. Outlaw, Rogue

**Source:** `data/dialogue/mentors/rogue/rogue_dialogue.json`. Voice is amused, rebellious, confident, and fiercely protective of the right to choose one's own path.

**Mentor, pending acquisition:**
> Outlaw's almost yours. Not bad. Funny thing about living by your own rules, though. Nobody hands you a map for what comes next. So what do you want all that freedom for?

**Mentor, finalized acquisition:**
> Outlaw. You earned it. The galaxy can call you whatever it likes, but you still get to decide what comes next. So tell me, what are you doing with that freedom?

**Q5:** What do you want being an Outlaw to mean for your future?

- "I want to live as an Outlaw, setting my own rules and choosing my own road. I don't need anyone else's title to tell me I'm free."
- "I want to get better at staying one step ahead, reading a dangerous situation, and finding a way out when the obvious routes are closed."
- "I want to use my freedom to stand up for people who have no choice, especially when the rules are being used against them."
- "I want something of my own beyond the next escape, whether that's a safe place to settle, people I can trust, or a life no one gets to dictate."
- "I have another career in mind, and I want to see how everything I've learned about independence and survival could help me get there."
- "I want to see what other lives I could make for myself before I decide whether being an Outlaw is the road I'll stay on."
- "I haven't decided where this freedom is going to take me. For now, I want to keep the choice in my own hands."

**Mentor, optional second purpose:**
> What, only one reason? Come on. Freedom's a big thing. Anything else you want out of it?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No assumed warrants, prior arrests, wanted posters, bounties, criminal acts, or past escapes. Freedom is Rogue's outlook, not a mandatory political identity for the player.

---

## 23. Droid Commander, General Axiom

**Source:** `data/dialogue/mentors/axiom/axiom_dialogue.json`. Voice is clinical, declarative, command-focused, and concerned with coordination and efficiency, not Seraphim's irreverent autonomy.

**Mentor, pending acquisition:**
> <Status: Droid Commander qualification approaching.> Acquiring command capability does not establish an enduring objective. State the function you intend this discipline to serve in your future.

**Mentor, finalized acquisition:**
> <Status: Droid Commander designation confirmed.> Command is a capability, not a mission. Specify the outcome you intend to pursue with it.

**Q5:** What do you want being a Droid Commander to mean for your future?

- "I want to make coordinating droids and directing complex operations my life's work. I don't need a different designation to give that responsibility meaning."
- "I want to improve my command decisions, coordination, and ability to adapt when information changes or a plan fails."
- "I want to use what I learn about coordinating droids to keep others safer, reduce unnecessary losses, and make sure every unit under my future direction matters."
- "I want to build something beyond command, perhaps a place of my own, relationships I choose, or a project that matters without anyone issuing me orders."
- "I have another profession in mind, and I want to see how the planning and coordination I develop as a Droid Commander could help me pursue it."
- "I want to examine what other roles could make use of my understanding of droids and complex systems before deciding on a new direction."
- "I haven't decided what I want beyond this qualification. I want to assess the possibilities before committing to an objective."

**Mentor, optional second purpose:**
> <Query: Additional objective?> State it if applicable. Multiple objectives require clear prioritization.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Do not assert ownership or command of droid units, active network integration, prior deployments, actual subordinates, or invented performance metrics. Axiom's obedience ideology is his, not compulsory player intent.

---

## 24. Military Engineer, Chief Engineer Rax

**Source:** `data/dialogue/mentors/rax/rax_dialogue.json`. Voice is exact, analytical, technical, and economical with words.

**Mentor, pending acquisition:**
> Military Engineer is nearly within reach. A qualification tells me what you can study, not what you intend to build. Define the outcome. What future are you designing?

**Mentor, finalized acquisition:**
> Military Engineer. Qualification established. Now determine the purpose of your work. A design without an objective is an expensive collection of parts.

**Q5:** What do you want being a Military Engineer to mean for your future?

- "I want to devote my career to military engineering, solving difficult problems before they become disasters. I don't need a higher title to take pride in that work."
- "I want to keep learning how structures, defenses, and battlefield conditions interact, so I can design smarter solutions with fewer weaknesses."
- "I want to use my engineering skills to protect people, build safer defenses, and give those in danger a better chance of surviving."
- "I want to create something lasting beyond military assignments, perhaps a workshop, a home, or a project that serves people in peacetime."
- "I have another career in mind, and I want to see how the technical judgment I develop as a Military Engineer could help me reach it."
- "I want to explore other fields where careful design and problem-solving matter before I decide what I should work toward next."
- "I haven't decided what I want to build my future around yet. I would rather understand the requirements before settling on a plan."

**Mentor, optional second purpose:**
> One objective recorded. Is there another? It is better to identify competing requirements now.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No claimed construction projects, military rank, siege victories, owned equipment, or specialized mechanical capabilities beyond the verified actor record.

---

## 25. Vanguard, Shield Captain Theron

**Source:** `data/dialogue/mentors/theron/theron_dialogue.json`. Voice is stoic, unwavering, protective, and conscious that defense requires deliberate action.

**Mentor, pending acquisition:**
> Vanguard is within reach. Standing firm matters. Knowing what you are standing for matters more. When you earn this title, what will you choose to defend?

**Mentor, finalized acquisition:**
> You have become a Vanguard. The title honors your discipline. It cannot choose your purpose. What do you intend to stand for in the years ahead?

**Q5:** What do you want being a Vanguard to mean for your future?

- "I want to live as a Vanguard, meeting danger with steadiness and courage. I don't need another title to know this is my path."
- "I want to improve my awareness, positioning, and judgment until I know when to hold my ground and when protecting someone means moving."
- "I want to stand between danger and people who cannot face it alone. If my strength gives someone else a chance, I want that to matter."
- "I want to build a life worth defending beyond the battlefield, with a home, people I care about, and moments when I can finally lower my guard."
- "I have another calling in mind, and I want to see how the resolve I develop as a Vanguard could help me pursue it."
- "I want to discover other ways to protect people before deciding whether the front line is where I belong for the rest of my life."
- "I don't know what comes after earning this title. I want to make that choice when I understand what will be asked of me."

**Mentor, optional second purpose:**
> A person may stand for more than one thing. Is there another purpose you wish to name?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Do not invent saved allies, military affiliation, shield ownership, past battles, a squad, or an undefeated record. A Vanguard is not required to remain physically immobile.

---

## 26. Martial Arts Master, Master Zhen

**Source:** `data/dialogue/mentors/zhen/zhen_dialogue.json`. Voice is patient, serene, restrained, and attentive to the relationship between body and mind.

**Mentor, pending acquisition:**
> The path of a Martial Arts Master is before you. A title may mark the distance traveled, but it does not tell you why you walk. What do you hope this discipline will give to your life?

**Mentor, finalized acquisition:**
> You have become a Martial Arts Master. The body remembers practice. The mind must still choose its direction. What meaning do you wish this path to hold for you?

**Q5:** What do you want being a Martial Arts Master to mean for your future?

- "I want to devote my life to martial discipline, finding meaning in practice and self-control. I do not need a greater title to be content with this path."
- "I want to keep refining the balance between movement, awareness, and restraint, learning something from every challenge without chasing perfection for its own sake."
- "I want to use what I've learned to help others find confidence, protect themselves, or face fear without being ruled by it."
- "I want to build a life beyond training and combat, with peace, companionship, and time to enjoy the things I have worked to protect."
- "I have another vocation in mind, and I want to see how the patience and discipline I develop as a Martial Arts Master could guide me toward it."
- "I want to explore other traditions and ways of living before I decide what place martial training should have in my future."
- "I haven't decided what comes next. I want to remain open to the lessons of this path until my direction becomes clearer."

**Mentor, optional second purpose:**
> One intention may share the heart with another. Is there a second purpose you wish to carry?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No assumed victories, mastery of particular unarmed techniques, philosophy conversion, Force powers, or personal training under Zhen. Peace is an optional future ambition, not compulsory pacifism.

---

## 27. Imperial Knight, Dezmin

**Source:** `data/dialogue/mentors/dezmin/dezmin_dialogue.json`. Voice is disciplined, formal, and centered on service, restraint, and responsible use of the Force.

**Mentor, pending acquisition:**
> The mantle of an Imperial Knight is within reach. Duty can give a life direction, but it cannot spare you the responsibility of choosing what you will serve. What future do you intend to pursue?

**Mentor, finalized acquisition:**
> You have earned the title of Imperial Knight. Honor is not preserved by a title alone. Tell me what you intend your service and discipline to accomplish.

**Q5:** What do you want being an Imperial Knight to mean for your future?

- "I want to spend my life as an Imperial Knight, guided by discipline, restraint, and service. I don't need another title to make that calling worthwhile."
- "I want to deepen my control, strengthen my judgment, and learn to use the Force without letting anger or certainty make my decisions for me."
- "I want to use my abilities to protect people who depend on the stability and justice I can help uphold, even when doing so requires difficult choices."
- "I want a life beyond my duties as an Imperial Knight, with personal bonds, a home, or something meaningful that I choose for myself."
- "I have another calling in mind, and I want to consider how the discipline I develop as an Imperial Knight could help me pursue it."
- "I want to learn what other forms of service might be open to me before deciding whether I will follow a different path."
- "I haven't decided what the rest of my life should become. I want to understand the responsibilities before choosing another destination."

**Mentor, optional second purpose:**
> Duty and personal purpose need not be identical. Is there another intention you wish to acknowledge?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Preserve the distinctive Imperial Knight tradition without assuming a specific Emperor, personal assignment, military commission, known faction mission, or unowned Force feature. Do not equate this path automatically with Jedi or Sith.

---

## 28. Shaper, Shaper Urza

**Source:** `data/dialogue/mentors/urza/urza_dialogue.json`. Voice is intellectually curious, faintly amused, and treats biology as an adaptive design medium.

**Mentor, pending acquisition:**
> Shaper is almost within reach. Interesting, isn't it? Life has a remarkable talent for becoming something unexpected. What would you like to make of yours?

**Mentor, finalized acquisition:**
> Shaper. You've earned the title. How satisfying. The trouble with living things is that they never stop changing, and neither do their makers. So what do you want to create for your future?

**Q5:** What do you want being a Shaper to mean for your future?

- "I want to make shaping and understanding living systems my life's work. I find meaning in the craft itself, not in collecting another title."
- "I want to deepen my understanding of how living things adapt, and improve my judgment about what I might create or change through this discipline."
- "I want to use what I learn to preserve life, help living communities survive, or develop something that makes a difficult existence easier for others."
- "I want to build something personal beyond my work as a Shaper, perhaps a home, a place to study freely, or relationships that aren't experiments to be solved."
- "I have another profession in mind, and I want to see how the insight I gain into living systems could help me pursue it."
- "I want to explore other ways of studying and working with life before I decide whether shaping will remain my central purpose."
- "I haven't decided what I want my work to become. I'd rather keep asking questions than pretend I already know the final design."

**Mentor, optional second purpose:**
> Another purpose? Good. Living systems rarely have only one function. What else interests you?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No assumed created organisms, owned bioforms, implants, experimental projects, specific traditions, or class powers. Urza's achievements belong to Urza.

---

## 29. Assassin, Delta

**Source:** `data/dialogue/mentors/delta/delta_dialogue.json`, `classPaths.assassin`. Delta is sharp, streetwise, and mocking. Assassin emphasizes selecting targets, patience, and decisive precision, distinct from her Infiltrator emphasis on access and escape.

**Mentor, pending acquisition:**
> Assassin's almost yours. Not bad, kid. But a title doesn't tell you which jobs are worth taking, or what kind of person you wanna be when you're done. So what's the long game?

**Mentor, finalized acquisition:**
> Assassin. Yeah, you earned it. Don't let the name do your thinking for you. What's the point of getting this good if you don't know what you want out of the life?

**Q5:** What do you want being an Assassin to mean for your future?

- "I want to make being an Assassin my chosen profession, relying on patience, precision, and my own judgment. I don't need a different title to justify that choice."
- "I want to keep improving my awareness, timing, and ability to make hard decisions without being careless about the consequences."
- "I want to use my abilities to confront dangerous people when others have no way to stop them, and I want to be careful about whose cause I'm serving."
- "I want something beyond dangerous assignments, a place where I don't have to be watching for the next threat and people I can trust with who I am."
- "I have another career in mind, and I want to see how the discipline and judgment I develop as an Assassin could help me reach it."
- "I want to explore what else I could do with my precision and patience before deciding whether this profession is where I belong."
- "I don't know what comes after this. I want to keep my options open rather than make promises about a future I haven't chosen."

**Mentor, optional second purpose:**
> What, there's more to it? Go on. I'm listenin'. Try not to make it a speech.

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** Do not invent completed assassinations, contracts, killings, targets, organizations, or criminal identity. Avoid treating the Assassin's future as identical to Delta's Infiltrator route or forcing lethal service as a goal.

---

## 30. Charlatan, Silvertongue Sela

**Source:** `data/dialogue/mentors/sela/sela_dialogue.json`. Voice is warmly theatrical, flirtatious, clever, and attuned to perception and persuasion.

**Mentor, pending acquisition:**
> Charlatan. Oh, darling, you're almost there. What a lovely title. But a convincing story needs more than a dazzling opening. What ending are you hoping to write for yourself?

**Mentor, finalized acquisition:**
> Charlatan! Beautifully done, darling. Now tell me, is this the life you intend to live, or the opening act to something even more interesting?

**Q5:** What do you want being a Charlatan to mean for your future?

- "I want to make a life out of wit, performance, and persuading people to see possibilities they might otherwise miss. I don't need a grander title."
- "I want to become better at reading people, choosing the right words, and knowing when a clever story works better than an elaborate scheme."
- "I want to use my charm to help people out of trouble, expose those who prey on others, or give someone a chance they couldn't negotiate for themselves."
- "I want a life where I can drop the performance when I choose, with real relationships, a home, and something I don't have to talk anyone into believing."
- "I have another career in mind, and I want to see how the confidence and social instincts I develop as a Charlatan could help me pursue it."
- "I want to explore the other lives I could lead before deciding whether I want to keep working through stories and disguises."
- "I haven't decided what comes next. I'd rather leave my options open than sell myself a future I don't believe in."

**Mentor, optional second purpose:**
> One ambition, darling? How restrained. Surely there's another little dream you'd like to admit to?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No invented scams, aliases, victims, fortunes, successful cons, or romance. Sela may be flirtatious without implying a relationship with the actor.

---

## 31. Improviser, Lucky Jack

**Source:** `data/dialogue/mentors/jack/jack_dialogue.json`. Voice is excitable, playful, instinctive, and delighted by solutions nobody planned for.

**Mentor, pending acquisition:**
> Improviser's almost yours! Fantastic! You know what's funny about getting really good at making things up? People expect you to have a plan afterward. So, uh, do you? What do you want out of all this?

**Mentor, finalized acquisition:**
> Improviser! You did it! Actual title, actual achievement, and now the terrifying possibility of a long-term plan. Kidding! Mostly. What do you want the next part of your life to be about?

**Q5:** What do you want being an Improviser to mean for your future?

- "I want to make a life out of solving the problems nobody saw coming. Being an Improviser suits me, and I don't need a new title to prove it."
- "I want to get better at recognizing unusual possibilities, adapting when plans fall apart, and making the most of whatever I have available."
- "I want to use my creativity to get people out of trouble, make hard situations easier, and help others see solutions they might have missed."
- "I want to build something steady beyond the next surprise, whether that's a home, a project of my own, or people I can count on when things get strange."
- "I have another career in mind, and I want to see how my ability to adapt and solve unexpected problems could help me get there."
- "I want to try a few different directions before settling on one. I might discover a whole new way to use what I'm good at."
- "I haven't figured out what my future looks like yet. I don't need to make up an answer just because somebody asked for a plan."

**Mentor, optional second purpose:**
> Wait, there's another reason? Oh, I love this. What's the surprise option?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No invented lucky escapes, legendary exploits, special gadgets, successful missions, or promises that improvisation always succeeds. Jack's carefree tone must not override deliberate player choices.

---

## 32. Pathfinder, Lead

**Source:** `data/dialogue/mentors/lead/Lead_dialogues.json`, especially `dialogues.prestigePaths.pathfinder`. Voice is dry, observant, exact, and concerned with the consequences of a bad route.

**Mentor, pending acquisition:**
> Pathfinder's almost within reach. Good. Finding a way through is one thing. Knowing why you're taking people that way is another. So what do you want this work to mean in the long run?

**Mentor, finalized acquisition:**
> Pathfinder. You've earned it. Doesn't mean every road ahead is marked. Tell me what you're looking for out there, before you decide which direction to take.

**Q5:** What do you want being a Pathfinder to mean for your future?

- "I want to spend my life as a Pathfinder, discovering routes and making the unknown a little less dangerous. I don't need another title to make that work worthwhile."
- "I want to keep improving at reading terrain, spotting patterns, and making sound decisions when the map is wrong or the situation changes."
- "I want to use my judgment to guide people through dangerous places, open safer passages, and give others a better chance of getting home."
- "I want to find somewhere I can stop moving for a while, build a home, and have something to come back to after the next journey."
- "I have another career in mind, and I want to see how the observation and planning I develop as a Pathfinder could prepare me for it."
- "I want to explore other kinds of work and places before deciding whether finding routes for others is what I want for the rest of my life."
- "I haven't decided where I want my own path to lead. I'd rather keep looking than claim I know the destination already."

**Mentor, optional second purpose:**
> Another objective? Fine. Better to know both before you start moving. What else matters?

**Player, decline second purpose:**
> "That's what matters to me right now. I don't need to add anything else."

**Editorial caution:** No assumed Argent Squad membership, completed reconnaissance, rescued personnel, route-finding successes, squad command, or personal apprenticeship under Lead. Pathfinder need not lead a formal military unit.

---

## Shared conditional Q5 interaction notes, pending implementation authorization

1. One required primary purpose and zero or one additional purpose. Do not let the player select the exact same line twice.
2. Player-facing controls show only the complete first-person statement, not headings, internal category names, scores, or class-level quotas.
3. A class-specific Mentor follows up on optional second selection. The shared first-person decline is: "That's what matters to me right now. I don't need to add anything else."
4. Selecting a broad other-career response as either primary or additional purpose does not itself declare an exact target. Offer Discover, Explore, Affirm with typed target and prior-goal preservation.
5. Never clear an existing earlier goal because the player picks an open, uncertain, or different answer. Preserve achievement separately from future aspiration and a player-reported sense of fulfillment.
6. If two selections conflict, ask the player to clarify rather than silently make a new assertion or write a career goal.
7. A pending or canceled advancement transaction cannot record a finalized class acquisition or an affirmed future goal by accident.
8. Mechanical eligibility, feat and talent ownership, future legal class levels, faction membership, and restricted Sith conditions require actual authoritative actor/mechanics verification, not dialogue in this file.
9. This editorial document has been authorized for a documentation-only GitHub commit. Its contents do not authorize edits to runtime code, compendiums, scoring, or mechanical rules.

## Source provenance and follow-up

The Q4 rolling editorial file establishes the 32-class order and mentor assignments: `docs/design/SWSE_Prestige_Q4_Rolling_Editorial.md`. Mentor voices were checked against `data/dialogue/mentors/*` entries for every newly drafted class 12 through 21. Original owner-directed cross-survey boundaries are retained from `docs/design/SWSE_Multiclass_Prestige_Survey_Rolling_Design.md` and prestige design references. The 32 Q5 drafts are local editorial work, not a certified sourcebook or mechanically executable schema. The final 11 Mentor voices were checked directly against the repository dialogue sources on the reference branch.

**Coverage now:** 32 of 32 prestige classes, 224 first-person purpose options, 64 pending/finalized Mentor introductions, 32 Mentor optional-purpose follow-ups, and one shared first-person decline option repeated per class, plus the Ace Pilot conditional career-goal dialogue. **Remaining to draft:** 0 classes. **Pending owner wording review:** 31 classes. No implementation authorized.