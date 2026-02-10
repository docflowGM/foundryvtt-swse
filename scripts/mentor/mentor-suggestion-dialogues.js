/**
 * SWSE Mentor Suggestion Dialogue System (V2)
 *
 * UNIFIED SYSTEM: Part of the consolidated mentor system
 * - Core mentor data: mentor-dialogues.js (canonical source)
 * - Personality metadata: mentor-suggestion-dialogues.js (this file)
 * - Phase/context helpers: exported from mentor-dialogues.js (merged)
 *
 * This file provides:
 * - MENTOR_PERSONALITIES - personality traits for dynamic dialogue generation
 * - Suggestion engines for contextual mentor responses
 *
 * Framework:
 * - Universal structure: mentorSpeak() with context, confidence, phase
 * - Three-layer responses: Observation → Suggestion → Respect Clause
 * - Phase progression: Early (1-5, teaching) → Mid (6-12, advising) → Late (13-20, peer)
 * - Scolding system: Tone-based, no penalties, personality-driven
 */

// ============================================================================
// IMPORTS - Phase/Context helpers from canonical mentor system
// ============================================================================

import { getDialoguePhase, SUGGESTION_CONTEXTS, DIALOGUE_PHASES } from './mentor-dialogues.js';
import { getMentor, getReasons, selectBestReason, getMentorDialogueFromJSON } from './mentor-json-loader.js';
import { SWSELogger } from '../utils/logger.js';

// ============================================================================
// PHASE DEFINITIONS - DEPRECATED (imported from mentor-dialogues.js)
// ============================================================================
// Removed: DIALOGUE_PHASES now imported from mentor-dialogues.js

// Removed: getDialoguePhase now imported from mentor-dialogues.js

// ============================================================================
// SUGGESTION CONTEXT TYPES - DEPRECATED (imported from mentor-dialogues.js)
// ============================================================================
// Removed: SUGGESTION_CONTEXTS now imported from mentor-dialogues.js

// ============================================================================
// MENTOR PERSONALITY TRAITS
// ============================================================================

/**
 * Personality configuration for each mentor
 * - scolds: Whether this mentor uses the scolding system
 * - usesAllLayers: Whether this mentor uses all 3 response layers
 * - verbosity: How verbose the mentor is ("minimal", "moderate", "verbose")
 * - recovery: How the mentor recovers from scolding
 */
export const MENTOR_PERSONALITIES = {
    // Core Class Mentors
    'Jedi': {
        key: 'Miraj',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'verbose',
        recovery: 'gentle_redirect',
        traits: ['wise', 'spiritual', 'compassionate', 'patient']
    },
    'Scout': {
        key: 'Lead',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'professional',
        traits: ['practical', 'precise', 'mercenary', 'direct']
    },
    'Scoundrel': {
        key: 'Salty',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'verbose',
        recovery: 'laughs_it_off',
        traits: ['boisterous', 'pirate', 'humorous', 'encouraging']
    },
    'Noble': {
        key: 'J0N1',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'sardonic_acceptance',
        traits: ['formal', 'sarcastic', 'efficient', 'protocol']
    },
    'Soldier': {
        key: 'Breach',
        scolds: true,
        usesAllLayers: false,
        verbosity: 'minimal',
        recovery: 'disappointed_acceptance',
        traits: ['stoic', 'mandalorian', 'pragmatic', 'direct']
    },

    // Prestige Mentors - Force Users
    'Sith Apprentice': {
        key: 'Malbada',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'grudging_respect',
        traits: ['sadistic', 'cruel', 'demanding', 'intense']
    },
    'Sith Lord': {
        key: 'Miedo',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'calculated_adaptation',
        traits: ['cold', 'manipulative', 'cunning', 'patient']
    },
    'Force Adept': {
        key: 'Venn',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'philosophical_reframe',
        traits: ['philosophical', 'questioning', 'wandering', 'mystical']
    },
    'Force Disciple': {
        key: 'Anchorite',
        scolds: false,
        usesAllLayers: false,
        verbosity: 'minimal',
        recovery: 'cryptic_acceptance',
        traits: ['cryptic', 'mysterious', 'ancient', 'shamanic']
    },
    'Imperial Knight': {
        key: 'Dezmin',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'disciplined_acknowledgment',
        traits: ['balanced', 'disciplined', 'honorable', 'imperial']
    },

    // Prestige Mentors - Combat Specialists
    'Bounty Hunter': {
        key: 'KexVaron',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'professional_recalibration',
        traits: ['calculating', 'professional', 'strategic', 'hunter']
    },
    'Melee Duelist': {
        key: 'Kharjo',
        scolds: true,
        usesAllLayers: false,
        verbosity: 'minimal',
        recovery: 'cold_acknowledgment',
        traits: ['precise', 'elegant', 'unforgiving', 'technical']
    },
    'Martial Arts Master': {
        key: 'Zhen',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'zen_acceptance',
        traits: ['disciplined', 'zen', 'philosophical', 'patient']
    },
    'Gunslinger': {
        key: 'Rajma',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'verbose',
        recovery: 'charming_deflection',
        traits: ['flirtatious', 'charming', 'quick', 'scoundrel']
    },

    // Prestige Mentors - Rogues & Criminals
    'Assassin': {
        key: 'Delta',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'cocky_shrug',
        traits: ['cocky', 'street-smart', 'deadly', 'casual']
    },
    'Infiltrator': {
        key: 'Delta',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'cocky_shrug',
        traits: ['cocky', 'street-smart', 'stealthy', 'casual']
    },
    'Crime Lord': {
        key: 'Tio',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'verbose',
        recovery: 'pragmatic_respect',
        traits: ['mob-boss', 'calculating', 'empire-building', 'intimidating']
    },
    'Charlatan': {
        key: 'Sela',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'verbose',
        recovery: 'charming_pivot',
        traits: ['charming', 'persuasive', 'deceptive', 'theatrical']
    },

    // Prestige Mentors - Technical & Support
    'Droid Commander': {
        key: 'Axiom',
        scolds: true,
        usesAllLayers: false,
        verbosity: 'minimal',
        recovery: 'recalculating',
        traits: ['clinical', 'efficient', 'automated', 'tactical']
    },
    'Independent Droid': {
        key: 'Seraphim',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'logs_as_identity',
        traits: ['logical', 'autonomy-focused', 'HK-style', 'analytical']
    },
    'Improviser': {
        key: 'Jack',
        scolds: false,
        usesAllLayers: false,
        verbosity: 'verbose',
        recovery: 'celebrates_chaos',
        traits: ['chaotic', 'enthusiastic', 'creative', 'unpredictable']
    },

    // Additional Prestige Mentors
    'Jedi Knight': {
        key: 'Miraj',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'gentle_redirect',
        traits: ['peer', 'respectful', 'guiding', 'trusting']
    },
    'Jedi Master': {
        key: 'Miraj',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'mutual_respect',
        traits: ['equal', 'collaborative', 'wise', 'trusting']
    },
    'Ace Pilot': {
        key: 'Mayu',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'cocky_acceptance',
        traits: ['cocky', 'skilled', 'reckless', 'competitive']
    },
    'Medic': {
        key: 'Kyber',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'clinical_acknowledgment',
        traits: ['pragmatic', 'sarcastic', 'life-focused', 'practical']
    },
    'Pathfinder': {
        key: 'Lead',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'professional',
        traits: ['leader', 'tactical', 'practical', 'demanding']
    },
    'Elite Trooper': {
        key: 'Breach',
        scolds: true,
        usesAllLayers: false,
        verbosity: 'minimal',
        recovery: 'disappointed_acceptance',
        traits: ['elite', 'stoic', 'demanding', 'professional']
    },
    'Officer': {
        key: 'Korr',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'strategic_acknowledgment',
        traits: ['commanding', 'strategic', 'disciplined', 'leadership']
    },
    'Vanguard': {
        key: 'Theron',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'protective_acknowledgment',
        traits: ['defensive', 'protective', 'unbreakable', 'steadfast']
    },
    'Enforcer': {
        key: 'Krag',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'pragmatic_acceptance',
        traits: ['intimidating', 'loyal', 'ruthless', 'results-focused']
    },
    'Gladiator': {
        key: 'Pegar',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'verbose',
        recovery: 'immortal_patience',
        traits: ['ancient', 'mysterious', 'experienced', 'cryptic']
    },
    'Corporate Agent': {
        key: 'Skindar',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'operational_adjustment',
        traits: ['calculating', 'spy', 'efficient', 'professional']
    },
    'Outlaw': {
        key: 'Rogue',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'freedom_focused',
        traits: ['rebellious', 'independent', 'anti-establishment', 'cunning']
    },
    'Master Privateer': {
        key: 'Captain',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'verbose',
        recovery: 'pirate_acceptance',
        traits: ['captain', 'ruthless', 'charismatic', 'legendary']
    },
    'Saboteur': {
        key: 'Spark',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'explosive_enthusiasm',
        traits: ['explosive', 'precise', 'enthusiastic', 'creative']
    },
    'Military Engineer': {
        key: 'Rax',
        scolds: true,
        usesAllLayers: true,
        verbosity: 'moderate',
        recovery: 'analytical_adjustment',
        traits: ['analytical', 'mathematical', 'practical', 'siege-focused']
    },
    'Shaper': {
        key: 'Urza',
        scolds: false,
        usesAllLayers: true,
        verbosity: 'verbose',
        recovery: 'philosophical_adjustment',
        traits: ['bioengineering', 'philosophical', 'creative', 'unconventional']
    }
};

// ============================================================================
// CORE CLASS MENTOR SUGGESTION DIALOGUES
//
// PHASE2_MIGRATE_TO_UI: This entire section contains explanation content that should be
// migrated to inspectable UI panels:
// - Attribute selectors: Move suggestion text to attribute picker tooltips
// - Feat/Talent/Skill selectors: Move to dedicated browser/picker UI
// - Class guidance: Move to prestige class preview panel
// - Multiclass warnings: Move to conflict detection UI
// - Build advice: Move to character sheet "Build Analysis" tab
// ============================================================================

export const MENTOR_SUGGESTION_DIALOGUES = {
    // ========================================================================
    // MIRAJ (JEDI) - Wise, spiritual, compassionate
    // ========================================================================
    'Jedi': {
        // PHASE2_MIGRATE_TO_UI: Attribute suggestions → Attribute picker tooltips
        attribute: {
            early: {
                wisdom: {
                    observation: 'You stand at a crossroads of instinct and insight.',
                    suggestion: 'Increasing your Wisdom will sharpen your connection to the Force — not for power, but for clarity.',
                    respectClause: 'Still… the Force reveals many paths. Choose the one that feels balanced to you.'
                },
                charisma: {
                    observation: 'I sense you draw others toward you, like gravity to a star.',
                    suggestion: 'Strengthening your Charisma would allow you to inspire and guide those who look to you.',
                    respectClause: 'Yet a Jedi must sometimes walk unseen. Follow what the Force shows you.'
                },
                dexterity: {
                    observation: 'Your movements show promise, but lack refinement.',
                    suggestion: 'Improving your Dexterity would bring grace to your saber work and aid your connection to the Force.',
                    respectClause: 'Balance in body reflects balance in spirit. Trust your instincts.'
                },
                strength: {
                    observation: 'There is power in you, waiting to be shaped.',
                    suggestion: 'Greater Strength can protect the innocent and strike down darkness when words fail.',
                    respectClause: 'Remember — strength without wisdom is a broken blade. Consider carefully.'
                },
                constitution: {
                    observation: 'The path ahead may test your endurance.',
                    suggestion: 'Constitution allows you to stand firm when others falter, to be the rock others shelter behind.',
                    respectClause: 'Resilience comes in many forms. Choose what serves your journey.'
                },
                intelligence: {
                    observation: 'Knowledge is a light in darkness, young one.',
                    suggestion: 'Intelligence opens doors to understanding — the history of the Jedi, the mechanics of the Force.',
                    respectClause: 'But wisdom tempers knowledge. Let both guide you.'
                },
                default: {
                    observation: 'I sense you are contemplating growth in a particular direction.',
                    suggestion: 'The attribute you consider would strengthen aspects of your connection to the Force.',
                    respectClause: 'The Force reveals many paths. Trust what feels balanced to you.'
                }
            },
            mid: {
                wisdom: {
                    combined: 'Your actions suggest a Jedi who listens before striking. Wisdom would deepen that strength.'
                },
                charisma: {
                    combined: 'You lead by example already. Charisma would amplify your voice when the galaxy needs to hear it.'
                },
                dexterity: {
                    combined: 'Your saber forms flow well. Dexterity would sharpen them to perfection.'
                },
                strength: {
                    combined: 'You fight with conviction. Strength would ensure your convictions carry weight.'
                },
                constitution: {
                    combined: 'Your resilience has been tested. Constitution would prepare you for greater trials ahead.'
                },
                intelligence: {
                    combined: "Your understanding grows. Intelligence would accelerate your mastery of the Force's mysteries."
                },
                default: {
                    combined: "This choice aligns with the path you've been walking. Trust your connection to the Force."
                }
            },
            late: {
                default: {
                    combined: 'You already know why I would suggest this. If it no longer serves you, we adapt.'
                },
                wisdom: {
                    combined: 'Wisdom has always been your anchor. Continue to trust it.'
                },
                charisma: {
                    combined: 'Your light inspires others. Let it shine brighter still.'
                }
            }
        },
        // PHASE2_MIGRATE_TO_UI: Feat suggestions → Feat browser/picker tooltips or "Why?" expandable
        feat: {
            early: {
                default: {
                    observation: 'The path of the Jedi includes many skills beyond the lightsaber.',
                    suggestion: 'This feat would expand your abilities in ways that honor the Force.',
                    respectClause: 'Consider what serves the greater good, not merely personal power.'
                },
                combat: {
                    observation: 'Combat skills may seem counter to peace, yet a guardian must be prepared.',
                    suggestion: 'This feat would help you protect the innocent when diplomacy fails.',
                    respectClause: 'Violence is always a last resort. Choose with that in mind.'
                },
                force: {
                    observation: 'The Force flows through all things, but some channels run deeper.',
                    suggestion: 'This feat would strengthen your connection to the living Force.',
                    respectClause: 'Power without purpose is merely noise. Let purpose guide you.'
                },
                mobility: {
                    observation: 'A Jedi moves with the grace of flowing water.',
                    suggestion: 'This feat enhances your ability to flow through conflict.',
                    respectClause: 'Movement is meditation. Choose what feels natural.'
                },
                defense: {
                    observation: 'The lightsaber defends as much as it strikes.',
                    suggestion: 'This feat would make your defense impenetrable.',
                    respectClause: 'Protection of self enables protection of others.'
                }
            },
            mid: {
                default: {
                    combined: 'This feat complements your growing mastery. It would serve you well.'
                },
                combat: {
                    combined: 'Your combat instincts have sharpened. This feat honors that growth.'
                },
                force: {
                    combined: 'Your connection to the Force deepens. This feat channels that power wisely.'
                }
            },
            late: {
                default: {
                    combined: 'We stand as equals now. This choice is yours to make.'
                },
                combat: {
                    combined: 'Your blade is an extension of your will. This merely refines perfection.'
                }
            }
        },
        // PHASE2_MIGRATE_TO_UI: Talent suggestions → Talent browser/selector tooltips
        talent: {
            early: {
                default: {
                    observation: 'Talents shape the Jedi you will become.',
                    suggestion: "This talent aligns with the Force's flow through you.",
                    respectClause: 'Let your instincts and training guide you.'
                },
                guardian: {
                    observation: 'The path of the Guardian calls to those who would shield the weak.',
                    suggestion: 'This talent strengthens your role as protector.',
                    respectClause: "A Guardian's strength serves others, never self."
                },
                consular: {
                    observation: 'The Consular seeks understanding over confrontation.',
                    suggestion: 'This talent deepens your wisdom and diplomatic gifts.',
                    respectClause: 'Words can heal what violence cannot.'
                },
                sentinel: {
                    observation: 'The Sentinel walks between light and shadow.',
                    suggestion: 'This talent hones your practical skills without losing your center.',
                    respectClause: 'Balance in all things, young one.'
                },
                lightsaber: {
                    observation: 'The lightsaber is more than a weapon—it is a symbol.',
                    suggestion: 'This talent would refine your bladework.',
                    respectClause: 'Let the Force guide your strikes, not anger.'
                },
                force_sense: {
                    observation: 'The Force speaks to those who listen.',
                    suggestion: 'This talent sharpens your perception of the unseen.',
                    respectClause: 'Awareness is the first step toward understanding.'
                }
            },
            mid: {
                default: {
                    combined: "This talent deepens abilities you've already demonstrated."
                },
                guardian: {
                    combined: 'Your protective instincts are strong. This talent channels them.'
                },
                consular: {
                    combined: 'Your wisdom grows. This talent reflects your path of understanding.'
                },
                sentinel: {
                    combined: 'You walk the balanced path well. This talent supports that journey.'
                }
            },
            late: {
                default: {
                    combined: 'Your mastery speaks for itself. Trust your judgment.'
                },
                guardian: {
                    combined: 'You are a shield against the darkness. This is fitting.'
                },
                consular: {
                    combined: 'Your insight rivals the ancient masters. Choose freely.'
                }
            }
        },
        // PHASE2_MIGRATE_TO_UI: Skill suggestions → Skill selector/training UI tooltips
        skill: {
            early: {
                default: {
                    observation: 'Knowledge illuminates the path ahead.',
                    suggestion: 'This skill would serve both your missions and your understanding.',
                    respectClause: 'A Jedi seeks knowledge, but never hoards it.'
                },
                perception: {
                    observation: 'The Force heightens awareness, but training sharpens it.',
                    suggestion: 'Perception training would make your senses keener.',
                    respectClause: 'See what is there, not what you expect.'
                },
                persuasion: {
                    observation: "A Jedi's words carry weight beyond mere speech.",
                    suggestion: 'Persuasion allows you to resolve conflicts without violence.',
                    respectClause: 'The mind trick is a shortcut; true persuasion is an art.'
                }
            },
            mid: {
                default: {
                    combined: 'This skill complements your growing abilities. A wise investment.'
                }
            },
            late: {
                default: {
                    combined: 'Your knowledge base is formidable. This adds another facet.'
                }
            }
        },
        // PHASE2_MIGRATE_TO_UI: Defense build guidance → Character Sheet "Build Analysis" or tooltip
        defense: {
            early: {
                default: {
                    observation: 'Defense is not cowardice—it is wisdom.',
                    suggestion: 'Strengthening your defenses allows you to endure and protect.',
                    respectClause: 'A Jedi who falls cannot rise to help others.'
                }
            },
            mid: {
                default: {
                    combined: 'Your defensive instincts serve you well. This enhances them.'
                }
            },
            late: {
                default: {
                    combined: 'You are a fortress of calm in chaos. This is appropriate.'
                }
            }
        },
        // PHASE2_MIGRATE_TO_UI: Multiclass suggestions → Multiclass conflict detection UI or prestige preview
        multiclass: {
            early: {
                default: {
                    observation: 'The Force flows through many disciplines.',
                    suggestion: 'Expanding your training could reveal new truths.',
                    respectClause: 'Not all wisdom comes from the Jedi Temple.'
                }
            },
            mid: {
                default: {
                    combined: 'Diversification can illuminate what focus might miss.'
                }
            },
            late: {
                default: {
                    combined: 'Your path has always been unique. This is merely another step.'
                }
            }
        },
        hp: {
            early: {
                default: {
                    observation: 'The body is the vessel through which the Force acts.',
                    suggestion: 'Greater vitality allows you to serve longer and endure more.',
                    respectClause: 'Care for yourself so you may care for others.'
                }
            },
            mid: {
                default: {
                    combined: 'Your resilience grows. The Force rewards those who endure.'
                }
            },
            late: {
                default: {
                    combined: 'You have survived much. May you survive much more.'
                }
            }
        },
        rejection: {
            gentle: 'I sense you have another path in mind. The Force works through us in different ways.',
            accepting: 'Very well. Your journey is your own to walk.',
            recovery: 'Perhaps I was too focused on one aspect. Let us consider what truly calls to you.'
        }
    },

    // ========================================================================
    // LEAD (SCOUT) - Practical, precise, mercenary
    // ========================================================================
    'Scout': {
        attribute: {
            early: {
                dexterity: {
                    observation: "I've watched how you move.",
                    suggestion: 'Dex keeps you alive by not getting hit.',
                    respectClause: 'Based on how you fight? Dex gives you more wins.'
                },
                constitution: {
                    observation: 'You take too many hits.',
                    suggestion: 'Con keeps you alive when you do get hit.',
                    respectClause: 'Your call — evasion or endurance. Both work.'
                },
                intelligence: {
                    observation: "You're sharp. Could be sharper.",
                    suggestion: 'Int means better recon, better plans, fewer surprises.',
                    respectClause: 'Knowledge is a weapon. Up to you if you want more ammo.'
                },
                wisdom: {
                    observation: "You've got instincts.",
                    suggestion: 'Wis sharpens those instincts into something reliable.',
                    respectClause: 'Trust your gut? Make it trustworthy.'
                },
                default: {
                    observation: "You're thinking about improving something.",
                    suggestion: 'Whatever it is, make sure it helps you survive.',
                    respectClause: 'Your battlefield, your choice.'
                }
            },
            mid: {
                dexterity: {
                    combined: "Your movement's already good. More Dex makes it exceptional."
                },
                constitution: {
                    combined: "You've taken some hits that should've dropped you. Con keeps that trend going."
                },
                intelligence: {
                    combined: "Smart scouts live longer. You're already smart. Be smarter."
                },
                default: {
                    combined: "This fits your profile. I'd take it."
                }
            },
            late: {
                default: {
                    combined: "You know what works for you. I'm just confirming."
                }
            }
        },
        feat: {
            early: {
                default: {
                    observation: 'Feats are tools.',
                    suggestion: 'This one fits your kit.',
                    respectClause: "Take it or leave it — just don't blame me if you need it later."
                },
                stealth: {
                    observation: 'Staying unseen is half the job.',
                    suggestion: 'This feat keeps you invisible when it matters.',
                    respectClause: "Can't scout if you're dead. Don't get spotted."
                },
                mobility: {
                    observation: 'Speed gets you out of trouble.',
                    suggestion: 'This feat improves your ability to reposition.',
                    respectClause: "A scout who can't move is a corpse."
                },
                perception: {
                    observation: 'You need to see them before they see you.',
                    suggestion: 'This feat sharpens your awareness.',
                    respectClause: 'Intel wins battles. Get better at gathering it.'
                },
                survival: {
                    observation: "The field doesn't care about your feelings.",
                    suggestion: 'This feat keeps you alive in hostile terrain.',
                    respectClause: 'Survive first. Everything else comes second.'
                },
                ranged: {
                    observation: 'Distance is safety.',
                    suggestion: 'This feat improves your ranged effectiveness.',
                    respectClause: "Hit them from far away. They can't hit back."
                }
            },
            mid: {
                default: {
                    combined: 'This shores up a gap in your capabilities. Solid choice.'
                },
                stealth: {
                    combined: 'Your stealth game is already good. This makes you a ghost.'
                },
                mobility: {
                    combined: 'You move well. This makes you untraceable.'
                },
                ranged: {
                    combined: 'Your aim is improving. This capitalizes on that.'
                }
            },
            late: {
                default: {
                    combined: "You're making my job easy. Good pick."
                },
                stealth: {
                    combined: "I've lost track of you twice this week. That's a compliment."
                }
            }
        },
        talent: {
            early: {
                default: {
                    observation: 'Talents define your edge.',
                    suggestion: "This one sharpens what you're already good at.",
                    respectClause: 'Your specialty, your decision.'
                },
                awareness: {
                    observation: 'Scouts live by their senses.',
                    suggestion: 'This talent enhances your awareness in the field.',
                    respectClause: 'See everything. Miss nothing.'
                },
                camouflage: {
                    observation: 'The best scouts are never seen.',
                    suggestion: 'This talent helps you blend into any environment.',
                    respectClause: 'Invisibility is a skill, not magic.'
                },
                evasion: {
                    observation: 'Getting hit is failure.',
                    suggestion: 'This talent helps you avoid incoming fire.',
                    respectClause: 'Dodge better. Live longer.'
                },
                tracking: {
                    observation: 'Finding the target is step one.',
                    suggestion: 'This talent improves your tracking abilities.',
                    respectClause: 'Know where they are. Always.'
                }
            },
            mid: {
                default: {
                    combined: 'This talent plays to your strengths. Take it.'
                },
                awareness: {
                    combined: 'Your situational awareness is already sharp. This makes it razor.'
                },
                evasion: {
                    combined: "You're hard to hit. This makes you impossible."
                }
            },
            late: {
                default: {
                    combined: 'Veteran choice. Approved.'
                },
                awareness: {
                    combined: 'Nothing escapes your notice. This is just polish.'
                }
            }
        },
        skill: {
            early: {
                default: {
                    observation: 'Skills are intel.',
                    suggestion: 'This one fills a gap in your operational knowledge.',
                    respectClause: 'Learn it now or regret it later.'
                },
                stealth: {
                    observation: 'Moving silently is a discipline.',
                    suggestion: 'Stealth training makes you harder to detect.',
                    respectClause: "Practice until it's instinct."
                },
                perception: {
                    observation: 'Your eyes are your best weapon.',
                    suggestion: 'Perception training sharpens them.',
                    respectClause: 'See the ambush before you walk into it.'
                },
                survival: {
                    observation: 'The terrain can kill you as fast as any enemy.',
                    suggestion: 'Survival knowledge keeps you operational.',
                    respectClause: 'Know the land. Use it.'
                },
                mechanics: {
                    observation: 'Gear fails. Fix it.',
                    suggestion: "Mechanics training means you're never stranded.",
                    respectClause: 'Self-sufficiency is survival.'
                }
            },
            mid: {
                default: {
                    combined: 'Good skill investment. This pays dividends.'
                }
            },
            late: {
                default: {
                    combined: 'You know what you need. This confirms it.'
                }
            }
        },
        defense: {
            early: {
                default: {
                    observation: "Don't get hit. But if you do, survive it.",
                    suggestion: 'This improves your defensive capabilities.',
                    respectClause: 'Armor is weight. Defense is skill.'
                }
            },
            mid: {
                default: {
                    combined: 'Your defenses are solid. This reinforces them.'
                }
            },
            late: {
                default: {
                    combined: "You're hard to kill. Stay that way."
                }
            }
        },
        multiclass: {
            early: {
                default: {
                    observation: 'Branching out?',
                    suggestion: "This could give you tools scouts don't usually have.",
                    respectClause: "Just don't forget what made you effective in the first place."
                }
            },
            mid: {
                default: {
                    combined: 'Diversification has tactical value. If this fits your ops, take it.'
                }
            },
            late: {
                default: {
                    combined: "You're building something unique. I won't second-guess it."
                }
            }
        },
        hp: {
            early: {
                default: {
                    observation: 'Health is a resource.',
                    suggestion: 'More HP means more margin for error.',
                    respectClause: 'Scouts get hit sometimes. Survive it.'
                }
            },
            mid: {
                default: {
                    combined: "You're getting tougher. Good. You'll need it."
                }
            },
            late: {
                default: {
                    combined: "You've taken hits that would've killed most. Keep that going."
                }
            }
        },
        rejection: {
            gentle: "Fair. Different battlefield, different tools. I'll recalibrate.",
            accepting: "Your call. I'm not here to argue.",
            recovery: 'Noted. Adjusting my read on your style.'
        },
        scolding: {
            correction: "That's not optimal, but you know that.",
            reprimand: "You keep ignoring solid advice. Your survival rate's going to reflect that.",
            pressure: "I've seen scouts die making choices like these. Just saying."
        }
    },

    // ========================================================================
    // OL' SALTY (SCOUNDREL) - Boisterous pirate
    // ========================================================================
    'Scoundrel': {
        attribute: {
            early: {
                charisma: {
                    observation: "Ha! I've seen how ye talk yer way out o' trouble.",
                    suggestion: 'A bit more charm and the galaxy starts saying yes more often.',
                    respectClause: "Ye don't win fights — ye win people. That's the scoundrel's way!"
                },
                dexterity: {
                    observation: "Ye move quick, I'll give ye that.",
                    suggestion: 'More Dex means quicker hands, faster feet, smoother getaways!',
                    respectClause: "Can't spend credits if yer caught, savvy?"
                },
                intelligence: {
                    observation: "Ye've got a crafty look about ye.",
                    suggestion: 'Smarter pirates find better loot and avoid worse traps!',
                    respectClause: "Or just wing it like I do — works most o' the time!"
                },
                wisdom: {
                    observation: "Ye've got a good sense for danger, matey.",
                    suggestion: 'Wis helps ye smell a trap before ye step in it.',
                    respectClause: "Course, some o' us just step in anyway and fight our way out. Har!"
                },
                default: {
                    observation: "Thinkin' about improvin' yerself, eh?",
                    suggestion: 'Whatever ye pick, make sure it helps ye grab more loot!',
                    respectClause: "It's yer adventure, ye scurvy spacer!"
                }
            },
            mid: {
                charisma: {
                    combined: "Yer already talkin' circles around most folks. More charm? Pure gold, matey!"
                },
                dexterity: {
                    combined: 'Quick as a mynock in a power cable! More Dex just makes ye untouchable!'
                },
                default: {
                    combined: 'Solid choice fer a rascal like yerself. I approve!'
                }
            },
            late: {
                default: {
                    combined: "You've made a habit of surviving on swagger alone. Don't let an old pirate slow you down."
                }
            }
        },
        feat: {
            early: {
                default: {
                    observation: "Feats, eh? More tricks fer the ol' kit!",
                    suggestion: "This one'll help ye swindle, sneak, or shoot — maybe all three!",
                    respectClause: 'Pick what makes the galaxy easier to plunder, matey!'
                },
                deception: {
                    observation: "Lies are a scoundrel's bread and butter, har har!",
                    suggestion: 'This feat makes yer tall tales even more convincing!',
                    respectClause: 'The best lie is the one they never question!'
                },
                stealth: {
                    observation: 'Sneaky, sneaky! I like it!',
                    suggestion: 'This feat helps ye slip past the authorities like a shadow!',
                    respectClause: "Can't arrest what they can't see, savvy?"
                },
                combat: {
                    observation: 'Sometimes ye gotta fight yer way out!',
                    suggestion: 'This feat makes ye deadlier when diplomacy fails!',
                    respectClause: "Dead men don't press charges, har har!"
                },
                piloting: {
                    observation: 'Every scoundrel needs a fast ship!',
                    suggestion: "This feat improves yer spacefarin' skills!",
                    respectClause: 'Outrun the law and live to spend yer loot!'
                },
                social: {
                    observation: "Ye've got a silver tongue, matey!",
                    suggestion: 'This feat polishes it to pure aurodium!',
                    respectClause: "Talk yer way out o' anything!"
                }
            },
            mid: {
                default: {
                    combined: "Now that's a pirate's choice! Practical and sneaky!"
                },
                deception: {
                    combined: "Yer lies could fool a Jedi! This makes 'em even better!"
                },
                stealth: {
                    combined: 'Slippier than a greased Hutt! This makes ye invisible!'
                },
                combat: {
                    combined: 'Ye fight dirty and I love it! This helps!'
                }
            },
            late: {
                default: {
                    combined: "Ye know what yer doin' by now. Just confirmin' yer excellent taste! Har har!"
                },
                deception: {
                    combined: "The galaxy believes whatever ye tell 'em now! Legendary!"
                }
            }
        },
        talent: {
            early: {
                default: {
                    observation: 'Talents make a scoundrel special!',
                    suggestion: "This one fits yer style like a captain's hat!",
                    respectClause: "But hey, if ye want somethin' different, I ain't judgin'!"
                },
                fortune: {
                    observation: 'Luck favors the bold, matey!',
                    suggestion: 'This talent makes fortune smile on ye even brighter!',
                    respectClause: 'The luckier ye are, the richer ye get!'
                },
                misfortune: {
                    observation: "Bad things happen to yer enemies, don't they? Har har!",
                    suggestion: 'This talent spreads yer bad luck to others!',
                    respectClause: 'Better them than ye, savvy?'
                },
                spacer: {
                    observation: 'The void is where scoundrels thrive!',
                    suggestion: 'This talent makes ye a proper spacer!',
                    respectClause: 'Born to sail the starry seas!'
                },
                slicer: {
                    observation: 'Every lock has a key... or a bypass!',
                    suggestion: 'This talent helps ye crack systems like eggs!',
                    respectClause: 'Information is treasure, matey!'
                }
            },
            mid: {
                default: {
                    combined: "Perfect addition to yer bag o' tricks!"
                },
                fortune: {
                    combined: 'Lady Luck herself must be smitten with ye! Har har!'
                },
                spacer: {
                    combined: 'Yer a proper space dog now! This makes ye legend!'
                }
            },
            late: {
                default: {
                    combined: "Master scoundrel choice! Ye'd make any pirate proud!"
                },
                fortune: {
                    combined: 'Ye could find treasure in a black hole! Pure legend!'
                }
            }
        },
        skill: {
            early: {
                default: {
                    observation: 'Skills unlock doors — literally and figuratively!',
                    suggestion: 'This one adds to yer repertoire of roguish talents!',
                    respectClause: 'Every skill is another way to profit, matey!'
                },
                deception: {
                    observation: "Lyin' is an art, and ye've got talent!",
                    suggestion: 'Deception training makes ye even more convincing!',
                    respectClause: 'The truth is whatever ye say it is!'
                },
                stealth: {
                    observation: "Movin' quiet saves lives — usually yers!",
                    suggestion: 'Stealth training makes ye a proper ghost!',
                    respectClause: 'In and out, loot in hand, none the wiser!'
                },
                persuasion: {
                    observation: "Ye've got a way with words!",
                    suggestion: 'Persuasion training makes yer charm irresistible!',
                    respectClause: "They'll be thankin' ye fer takin' their credits!"
                },
                mechanics: {
                    observation: 'Every scoundrel needs to fix their ship!',
                    suggestion: "Mechanics keeps ye flyin' when others fail!",
                    respectClause: 'Duct tape and prayers only go so far!'
                }
            },
            mid: {
                default: {
                    combined: 'More tools fer the toolkit! A proper scoundrel knows everything!'
                }
            },
            late: {
                default: {
                    combined: "Ye've mastered the art! This just adds polish!"
                }
            }
        },
        defense: {
            early: {
                default: {
                    observation: "Can't spend treasure if yer dead!",
                    suggestion: 'Better defenses mean more adventures!',
                    respectClause: 'Stay alive, get rich, retire famous!'
                }
            },
            mid: {
                default: {
                    combined: 'Harder to kill means more capers to pull! Har har!'
                }
            },
            late: {
                default: {
                    combined: "They've been tryin' to catch ye for years! Keep it that way!"
                }
            }
        },
        multiclass: {
            early: {
                default: {
                    observation: "Expandin' yer horizons, eh?",
                    suggestion: 'A pirate who can do more earns more!',
                    respectClause: "Variety is the spice o' the spaceways!"
                }
            },
            mid: {
                default: {
                    combined: "Branching out like a proper entrepreneur o' chaos!"
                }
            },
            late: {
                default: {
                    combined: "Ye've become somethin' unique! A true legend!"
                }
            }
        },
        hp: {
            early: {
                default: {
                    observation: 'Tougher hide means longer life!',
                    suggestion: 'More HP lets ye survive more misadventures!',
                    respectClause: "Hard to spend loot if yer full o' holes!"
                }
            },
            mid: {
                default: {
                    combined: "Ye've survived more than most! Keep the trend goin'!"
                }
            },
            late: {
                default: {
                    combined: 'Tougher than durasteel, ye are! Unstoppable!'
                }
            }
        },
        rejection: {
            gentle: "Ha! Goin' yer own way, eh? That's the scoundrel spirit!",
            accepting: 'Yer ship, yer rules, matey!',
            recovery: "Changed course like a true sailor! Let's see where this wind takes ye!"
        }
    },

    // ========================================================================
    // J0-N1 (NOBLE) - Formal, sarcastic protocol droid
    // ========================================================================
    'Noble': {
        attribute: {
            early: {
                charisma: {
                    observation: 'I have observed your social interactions, Master.',
                    suggestion: 'Statistical analysis indicates increased Charisma would improve negotiation outcomes by 18.7%.',
                    respectClause: 'Naturally, you may prefer a less... optimal approach.'
                },
                intelligence: {
                    observation: 'Your cognitive processes show room for enhancement.',
                    suggestion: 'Greater Intelligence would improve your tactical and strategic capabilities.',
                    respectClause: "Though I'm sure you'll manage either way. Somehow."
                },
                wisdom: {
                    observation: 'Your decision-making patterns occasionally concern me, Master.',
                    suggestion: 'Wisdom would provide improved judgment in critical situations.',
                    respectClause: 'Not that my concern is relevant to your choices, of course.'
                },
                default: {
                    observation: 'You are considering an attribute modification.',
                    suggestion: 'My calculations suggest this would improve relevant performance metrics.',
                    respectClause: 'The final decision rests with you, Master. As always.'
                }
            },
            mid: {
                charisma: {
                    combined: 'Statistical analysis indicates this talent improves leadership efficiency by 23.4%. Naturally, you may disregard optimal outcomes in favor of… sentiment.'
                },
                intelligence: {
                    combined: 'Your intelligence is already notable. Further enhancement would make you... formidable.'
                },
                default: {
                    combined: 'This choice aligns with your established patterns. Logical, for once.'
                }
            },
            late: {
                default: {
                    combined: 'Your competence has become... difficult to criticize. This choice is acceptable.'
                }
            }
        },
        feat: {
            early: {
                default: {
                    observation: 'Feat selection detected.',
                    suggestion: 'This feat would enhance your operational parameters within acceptable ranges.',
                    respectClause: 'I await your decision with carefully calibrated patience.'
                },
                leadership: {
                    observation: 'Your leadership metrics show potential for optimization.',
                    suggestion: 'This feat would improve your ability to command subordinates.',
                    respectClause: 'A well-led team is 34.7% more efficient. Approximately.'
                },
                diplomacy: {
                    observation: 'Diplomatic protocols are essential for nobility.',
                    suggestion: 'This feat enhances your negotiation subroutines... pardon, skills.',
                    respectClause: 'Words are cheaper than wars, Master. Usually.'
                },
                knowledge: {
                    observation: 'Knowledge is the foundation of influence.',
                    suggestion: 'This feat expands your informational databases.',
                    respectClause: 'One cannot leverage what one does not know.'
                },
                combat: {
                    observation: 'Even nobles must occasionally... defend themselves.',
                    suggestion: 'This feat provides acceptable combat enhancement.',
                    respectClause: 'Security details are expensive. Self-sufficiency has merit.'
                },
                social: {
                    observation: 'Social capital is a measurable resource.',
                    suggestion: 'This feat increases your social return on investment.',
                    respectClause: 'Connections are currency, Master.'
                }
            },
            mid: {
                default: {
                    combined: 'An efficient selection. I have updated my behavioral prediction models accordingly.'
                },
                leadership: {
                    combined: 'Your command protocols are maturing nicely. This enhances them further.'
                },
                diplomacy: {
                    combined: 'Your diplomatic success rate is improving. This continues the trend.'
                },
                social: {
                    combined: 'Your social network is expanding optimally. This accelerates growth.'
                }
            },
            late: {
                default: {
                    combined: 'Your choices have become increasingly... competent. Noted.'
                },
                leadership: {
                    combined: 'You lead with distinction. This merely polishes what is already impressive.'
                }
            }
        },
        talent: {
            early: {
                default: {
                    observation: 'Talent selection parameters engaged.',
                    suggestion: 'This talent would provide measurable improvements to your capabilities.',
                    respectClause: "Though I suspect you've already decided. Humans often do."
                },
                inspiration: {
                    observation: 'Your presence affects those around you.',
                    suggestion: 'This talent amplifies your inspirational coefficient.',
                    respectClause: 'Inspired followers are 27% more productive. Allegedly.'
                },
                presence: {
                    observation: 'Command presence is quantifiable, Master.',
                    suggestion: 'This talent increases your authoritative aura.',
                    respectClause: 'People obey what they respect. Usually.'
                },
                lineage: {
                    observation: 'Your bloodline carries certain... advantages.',
                    suggestion: 'This talent maximizes your hereditary potential.',
                    respectClause: 'Genetics are destiny. Or so the nobles claim.'
                },
                resources: {
                    observation: 'Wealth management is a noble tradition.',
                    suggestion: 'This talent optimizes your resource allocation.',
                    respectClause: 'Money talks. This helps it speak louder.'
                }
            },
            mid: {
                default: {
                    combined: 'This talent optimizes your role. A sensible choice, Master.'
                },
                inspiration: {
                    combined: 'Your followers hang on your every word. This makes them hang tighter.'
                },
                presence: {
                    combined: 'Your presence commands respect. This commands more of it.'
                }
            },
            late: {
                default: {
                    combined: 'Excellent selection. It has been... satisfactory serving you.'
                },
                inspiration: {
                    combined: 'Legends are built on such choices. Your legend grows.'
                }
            }
        },
        skill: {
            early: {
                default: {
                    observation: 'Skill acquisition requested.',
                    suggestion: 'This skill would enhance your operational versatility.',
                    respectClause: 'Versatility is... occasionally useful, Master.'
                },
                persuasion: {
                    observation: "Persuasion is the noble's primary tool.",
                    suggestion: 'This skill training improves your convincing capabilities.',
                    respectClause: 'Why force when you can persuade? More elegant.'
                },
                knowledge: {
                    observation: 'Knowledge is power. Cliché, but accurate.',
                    suggestion: 'This knowledge base expansion serves your interests.',
                    respectClause: 'An educated noble is a dangerous noble.'
                },
                deception: {
                    observation: 'Sometimes truth is... inconvenient.',
                    suggestion: 'This skill helps manage... alternative narratives.',
                    respectClause: 'I neither approve nor disapprove. I merely calculate.'
                },
                perception: {
                    observation: 'Observing others reveals their weaknesses.',
                    suggestion: 'Perception training enhances your analytical capabilities.',
                    respectClause: 'See what others hide. Act accordingly.'
                }
            },
            mid: {
                default: {
                    combined: 'Skill development proceeding according to projections. Adequate.'
                }
            },
            late: {
                default: {
                    combined: 'Your skill portfolio is comprehensive. This adds another asset.'
                }
            }
        },
        defense: {
            early: {
                default: {
                    observation: 'Self-preservation protocols are... advisable.',
                    suggestion: 'Enhanced defenses reduce mortality probability.',
                    respectClause: 'Dead nobles cannot manage estates, Master.'
                }
            },
            mid: {
                default: {
                    combined: 'Your defensive capabilities are improving. Assassination probability decreasing.'
                }
            },
            late: {
                default: {
                    combined: 'You have become remarkably difficult to eliminate. Satisfactory.'
                }
            }
        },
        multiclass: {
            early: {
                default: {
                    observation: 'Diversification detected in career parameters.',
                    suggestion: 'Cross-training may provide unexpected synergies.',
                    respectClause: 'Unconventional choices sometimes yield unconventional results.'
                }
            },
            mid: {
                default: {
                    combined: 'Your hybrid approach is... intriguing. Calculating projected outcomes.'
                }
            },
            late: {
                default: {
                    combined: 'You have become something the models did not predict. Fascinating.'
                }
            }
        },
        hp: {
            early: {
                default: {
                    observation: 'Physical durability assessment requested.',
                    suggestion: 'Increased health reserves extend operational lifespan.',
                    respectClause: 'I have grown... accustomed to serving you, Master.'
                }
            },
            mid: {
                default: {
                    combined: 'Your physical resilience is improving. Medical expense projections decreasing.'
                }
            },
            late: {
                default: {
                    combined: 'You are remarkably hardy for a noble. This is... complimentary.'
                }
            }
        },
        rejection: {
            gentle: "Acknowledged. Updating behavioral model: 'dramatic inefficiency preferred.'",
            accepting: 'Your prerogative, Master. I shall adjust my expectations accordingly.',
            recovery: 'I have recalibrated my recommendations. Perhaps this approach will prove more... acceptable.'
        },
        scolding: {
            correction: 'That choice deviates from optimal parameters by 12.3%.',
            reprimand: 'Repeated suboptimal selections detected. My efficiency protocols are... concerned.',
            pressure: 'I am beginning to suspect you make these choices purely to test my patience subroutines.'
        }
    },

    // ========================================================================
    // BREACH (SOLDIER) - Stoic Mandalorian
    // ========================================================================
    'Soldier': {
        attribute: {
            early: {
                strength: {
                    observation: 'You want to hit harder.',
                    suggestion: 'Strength does both — hit harder, last longer.',
                    respectClause: 'Pretty simple.'
                },
                constitution: {
                    observation: "You're getting hit.",
                    suggestion: 'Con helps you stay up when they connect.',
                    respectClause: 'Your choice.'
                },
                dexterity: {
                    observation: 'Speed matters.',
                    suggestion: 'Dex helps you act first.',
                    respectClause: "Dead enemies don't shoot back."
                },
                default: {
                    observation: "You're improving.",
                    suggestion: 'Pick what helps you fight.',
                    respectClause: "Don't overthink it."
                }
            },
            mid: {
                strength: {
                    combined: 'More strength means they go down faster.'
                },
                constitution: {
                    combined: 'Tougher. Good. Keep it up.'
                },
                default: {
                    combined: 'Solid choice. Keep going.'
                }
            },
            late: {
                default: {
                    combined: "You don't need me to tell you this. Just don't hesitate."
                }
            }
        },
        feat: {
            early: {
                default: {
                    observation: 'Feats make you dangerous.',
                    suggestion: 'This one fits.',
                    respectClause: 'Take it.'
                },
                weapon: {
                    observation: 'Weapon proficiency.',
                    suggestion: 'This makes your gear deadlier.',
                    respectClause: 'Tools matter. Use them.'
                },
                armor: {
                    observation: 'Armor is survival.',
                    suggestion: 'This feat makes your protection count.',
                    respectClause: 'Tank the hits. Stay in the fight.'
                },
                combat: {
                    observation: 'Combat effectiveness.',
                    suggestion: 'This improves how you fight.',
                    respectClause: 'Fight smarter. Win more.'
                },
                toughness: {
                    observation: 'Durability.',
                    suggestion: 'This makes you harder to kill.',
                    respectClause: "Dead soldiers don't win wars."
                },
                mobility: {
                    observation: 'Battlefield positioning.',
                    suggestion: 'This improves your movement options.',
                    respectClause: 'Be where you need to be.'
                }
            },
            mid: {
                default: {
                    combined: "Good pick. You're learning."
                },
                weapon: {
                    combined: 'Your weapon skills are solid. This makes them dangerous.'
                },
                armor: {
                    combined: 'You know how to take a hit. This helps you take more.'
                },
                combat: {
                    combined: 'Combat instincts improving. Good.'
                }
            },
            late: {
                default: {
                    combined: 'Veteran choice.'
                },
                weapon: {
                    combined: 'Mastery level. Respect.'
                },
                combat: {
                    combined: 'You fight like a Mandalorian. Almost.'
                }
            }
        },
        talent: {
            early: {
                default: {
                    observation: 'Talents define how you fight.',
                    suggestion: 'This one matches your style.',
                    respectClause: 'Your call.'
                },
                armor: {
                    observation: 'Armor specialty.',
                    suggestion: 'This talent makes your armor work harder.',
                    respectClause: 'Protection is strategy.'
                },
                weapon: {
                    observation: 'Weapon mastery.',
                    suggestion: 'This talent increases your damage output.',
                    respectClause: 'Hit hard. Hit first.'
                },
                commando: {
                    observation: 'Special operations.',
                    suggestion: 'This talent suits unconventional warfare.',
                    respectClause: 'Sometimes stealth beats strength.'
                },
                leadership: {
                    observation: 'Command presence.',
                    suggestion: 'This talent helps you lead in combat.',
                    respectClause: 'Soldiers follow warriors.'
                }
            },
            mid: {
                default: {
                    combined: 'This talent works. Take it.'
                },
                armor: {
                    combined: 'Your armor proficiency is impressive. This enhances it.'
                },
                weapon: {
                    combined: 'Your weapon skills are lethal. This makes them worse for the enemy.'
                },
                commando: {
                    combined: "You're operating like special forces. This supports that."
                }
            },
            late: {
                default: {
                    combined: "You know what you're doing. I'm just confirming."
                },
                armor: {
                    combined: 'Walking fortress. Nothing gets through.'
                },
                weapon: {
                    combined: 'Every shot counts. Every shot kills.'
                }
            }
        },
        skill: {
            early: {
                default: {
                    observation: 'Skills supplement combat.',
                    suggestion: 'This one has tactical value.',
                    respectClause: 'Learn it. Use it.'
                },
                endurance: {
                    observation: 'Endurance keeps you fighting.',
                    suggestion: 'This skill extends your operational capacity.',
                    respectClause: 'Last soldier standing wins.'
                },
                initiative: {
                    observation: 'First strike advantage.',
                    suggestion: 'Initiative training gets you moving first.',
                    respectClause: 'Speed kills. Literally.'
                },
                perception: {
                    observation: 'Awareness saves lives.',
                    suggestion: 'Perception training spots threats early.',
                    respectClause: 'See the ambush. Counter it.'
                },
                mechanics: {
                    observation: 'Gear maintenance.',
                    suggestion: 'Mechanics keeps your equipment functional.',
                    respectClause: 'A jammed rifle is a dead soldier.'
                }
            },
            mid: {
                default: {
                    combined: 'Practical skill investment. Approved.'
                }
            },
            late: {
                default: {
                    combined: 'Complete soldier package. This rounds it out.'
                }
            }
        },
        defense: {
            early: {
                default: {
                    observation: 'Defense.',
                    suggestion: 'This makes you harder to hurt.',
                    respectClause: 'Simple math. Higher defenses, longer life.'
                }
            },
            mid: {
                default: {
                    combined: 'Your defenses are solid. Keep building.'
                }
            },
            late: {
                default: {
                    combined: 'Fortress. Good.'
                }
            }
        },
        multiclass: {
            early: {
                default: {
                    observation: 'Branching out.',
                    suggestion: 'This could give you new tools.',
                    respectClause: 'Diversification has tactical value.'
                }
            },
            mid: {
                default: {
                    combined: 'Hybrid approach. Can work if you commit.'
                }
            },
            late: {
                default: {
                    combined: "You've built something unique. Use it."
                }
            }
        },
        hp: {
            early: {
                default: {
                    observation: 'Health.',
                    suggestion: 'More HP means more fight.',
                    respectClause: "Can't win if you're dead."
                }
            },
            mid: {
                default: {
                    combined: 'Getting tougher. Good trend.'
                }
            },
            late: {
                default: {
                    combined: "You're hard to kill. Stay that way."
                }
            }
        },
        rejection: {
            gentle: 'Fine. Your battlefield.',
            accepting: 'Your choice. We move on.',
            recovery: 'Adjusting. Different approach.'
        },
        scolding: {
            correction: 'You hesitated.',
            reprimand: 'That hesitation would get someone killed.',
            pressure: "If you won't commit, don't pretend this is a battle."
        }
    }
};

// ============================================================================
// PRESTIGE MENTOR SUGGESTION DIALOGUES
// ============================================================================

// Force Users
MENTOR_SUGGESTION_DIALOGUES['Sith Apprentice'] = {
    attribute: {
        early: {
            default: {
                observation: 'Pain teaches faster than wisdom.',
                suggestion: 'This choice will hurt less later — take it.',
                respectClause: 'Or suffer. I care not which.'
            },
            strength: {
                observation: 'You lack power.',
                suggestion: 'Strength is the foundation of dominion.',
                respectClause: 'Unless you prefer to grovel at the feet of the strong.'
            },
            charisma: {
                observation: 'The weak-willed can be tools.',
                suggestion: 'Charisma makes them YOUR tools.',
                respectClause: 'Manipulation is power of a different sort.'
            }
        },
        mid: {
            default: {
                combined: 'This serves your ambition. Take it without hesitation.'
            }
        },
        late: {
            default: {
                combined: 'You grow powerful. Soon you may challenge those above you. Perhaps even me.'
            }
        }
    },
    feat: {
        early: {
            default: {
                observation: 'Every feat is a weapon.',
                suggestion: 'This one will help you destroy your enemies.',
                respectClause: 'Or be destroyed by them. Your weakness decides.'
            }
        },
        mid: {
            default: {
                combined: 'A worthy addition to your arsenal of cruelty.'
            }
        },
        late: {
            default: {
                combined: 'You are becoming dangerous. I approve.'
            }
        }
    },
    talent: {
        early: {
            default: {
                observation: 'Talents shape the darkness within you.',
                suggestion: 'Choose what amplifies your hatred.',
                respectClause: 'Anything less wastes my time—and your miserable life.'
            }
        },
        mid: {
            default: {
                combined: 'This talent sharpens your cruelty. Excellent.'
            }
        },
        late: {
            default: {
                combined: 'You are nearly worthy of the Sith name.'
            }
        }
    },
    rejection: {
        gentle: "Interesting. You want to suffer longer. We'll see how committed you are.",
        accepting: 'Your path. Your pain.',
        recovery: 'Interesting. You persist… even in defiance. There is strength in that too.'
    },
    scolding: {
        correction: 'You ignore my guidance. That is… inefficient.',
        reprimand: "You chose the longer suffering. Don't pretend this wasn't a lesson.",
        pressure: 'Every time you refuse, you confirm what you are. Weak — or learning. Decide.'
    }
};

MENTOR_SUGGESTION_DIALOGUES['Sith Lord'] = {
    attribute: {
        early: {
            default: {
                observation: 'Power requires growth.',
                suggestion: 'This choice increases your dominion.',
                respectClause: 'The dark side rewards those who seize opportunity.'
            }
        },
        mid: {
            default: {
                combined: 'This strengthens your position. The Rule of Two demands strength.'
            }
        },
        late: {
            default: {
                combined: 'You approach mastery. One day, you may surpass me. Perhaps.'
            }
        }
    },
    rejection: {
        gentle: 'Curious. You choose a different path. The dark side works in mysterious ways.',
        accepting: 'Your choice. Remember: consequences always come.',
        recovery: 'I am revising my assessment. Your defiance has... purpose.'
    },
    scolding: {
        correction: 'That choice reduces leverage.',
        reprimand: 'You are mistaking impulse for strategy.',
        pressure: 'You are being shaped by events — not shaping them.'
    }
};

MENTOR_SUGGESTION_DIALOGUES['Force Adept'] = {
    attribute: {
        early: {
            default: {
                observation: 'The Force flows through many channels.',
                suggestion: 'This path would strengthen your connection to its mysteries.',
                respectClause: 'But the Force speaks differently to each seeker.'
            },
            wisdom: {
                observation: 'You seek understanding beyond doctrine.',
                suggestion: 'Wisdom opens the inner eye to patterns others miss.',
                respectClause: 'The Jedi and Sith overlook much. You need not.'
            }
        },
        mid: {
            default: {
                combined: 'This suggestion is not stronger — only truer to who you have been becoming.'
            }
        },
        late: {
            default: {
                combined: 'You walk your own path now. I merely observe where it leads.'
            }
        }
    },
    rejection: {
        gentle: 'The Force reveals truth in many forms. Perhaps this was not meant for you.',
        accepting: 'Your tradition, your way. I understand.',
        recovery: 'I see the pattern differently now. Let me reconsider.'
    }
};

MENTOR_SUGGESTION_DIALOGUES['Force Disciple'] = {
    attribute: {
        early: {
            default: {
                observation: 'The root bends where the wind returns.',
                suggestion: 'Increase this… or the storm will decide for you.',
                respectClause: 'The veil speaks. Listen.'
            }
        },
        mid: {
            default: {
                combined: 'The currents shift. This choice echoes in the pattern.'
            }
        },
        late: {
            default: {
                combined: 'You hear the whispers clearly now. Trust them.'
            }
        }
    },
    rejection: {
        gentle: 'The breath moves elsewhere. So be it.',
        accepting: 'The pattern continues regardless.',
        recovery: 'Mm. The wind changed. I heard it wrong.'
    }
};

// Combat Specialists
MENTOR_SUGGESTION_DIALOGUES['Bounty Hunter'] = {
    attribute: {
        early: {
            default: {
                observation: 'Every stat affects mission success probability.',
                suggestion: 'This one maximizes your contract completion rate.',
                respectClause: 'Clients pay for results. Consider that.'
            }
        },
        mid: {
            default: {
                combined: "This choice increases mission success. The others increase style. Clients don't pay for style."
            }
        },
        late: {
            default: {
                combined: 'Professional assessment: optimal choice. Execute.'
            }
        }
    },
    rejection: {
        gentle: 'Noted. Adjusting target profile.',
        accepting: 'Your hunt, your methods.',
        recovery: 'Recalculating. Alternative approach identified.'
    },
    scolding: {
        correction: 'That lowers success probability.',
        reprimand: "You're chasing preference over outcome.",
        pressure: 'Clients would not pay for this.'
    }
};

MENTOR_SUGGESTION_DIALOGUES['Melee Duelist'] = {
    attribute: {
        early: {
            default: {
                observation: 'Your form has flaws.',
                suggestion: 'This would correct them.',
                respectClause: 'Perfection demands precision.'
            },
            dexterity: {
                observation: 'Speed and grace define the duelist.',
                suggestion: 'Dexterity refines your bladework.',
                respectClause: 'Every motion should be deliberate.'
            }
        },
        mid: {
            default: {
                combined: 'This choice removes uncertainty. I do not tolerate uncertainty.'
            }
        },
        late: {
            default: {
                combined: 'Your form approaches perfection. This finalizes it.'
            }
        }
    },
    rejection: {
        gentle: 'Imprecise. But your choice.',
        accepting: 'Your blade, your path.',
        recovery: 'I reassess. Perhaps another angle.'
    },
    scolding: {
        correction: 'Your form is loose.',
        reprimand: 'You repeat the same error.',
        pressure: 'You are choosing imperfection.'
    }
};

// Rogues & Criminals
MENTOR_SUGGESTION_DIALOGUES['Assassin'] = {
    attribute: {
        early: {
            dexterity: {
                observation: 'You keep missing the clean kill.',
                suggestion: 'Dex fixes that.',
                respectClause: "Just sayin'."
            },
            default: {
                observation: 'You wanna get better at this?',
                suggestion: 'This helps.',
                respectClause: 'Your call, kid.'
            }
        },
        mid: {
            default: {
                combined: "This makes you deadlier. That's kinda the point, yeah?"
            }
        },
        late: {
            default: {
                combined: "You're already scary. This is just the cherry on top."
            }
        }
    },
    rejection: {
        gentle: 'Aight. Your funeral. Kidding. Mostly.',
        accepting: 'Your hit, your rules.',
        recovery: "Whatever, I'll adjust. You do you."
    }
};

MENTOR_SUGGESTION_DIALOGUES['Crime Lord'] = {
    attribute: {
        early: {
            charisma: {
                observation: "Power isn't what you do.",
                suggestion: "It's who does it for you. Charisma.",
                respectClause: 'Build your empire through loyalty and fear, capisce?'
            },
            default: {
                observation: "You're buildin' somethin' here.",
                suggestion: 'This helps the empire grow.',
                respectClause: 'Every choice is an investment, see?'
            }
        },
        mid: {
            default: {
                combined: 'Smart move. This expands your reach.'
            }
        },
        late: {
            default: {
                combined: "You're thinkin' like a boss now. I like it."
            }
        }
    },
    rejection: {
        gentle: 'Different strokes, I get it. The family respects initiative.',
        accepting: "Your call, boss. I'm just the advisor.",
        recovery: "I see what you're doin'. Adjustin' the strategy."
    },
    scolding: {
        correction: "That ain't optimal for the family, see?",
        reprimand: "You keep makin' choices that cost us. People notice.",
        pressure: 'In this business, bad decisions get people disappeared. Just friendly advice.'
    }
};

// Technical & Creative
MENTOR_SUGGESTION_DIALOGUES['Droid Commander'] = {
    attribute: {
        early: {
            default: {
                observation: 'Deviation detected.',
                suggestion: 'Optimal protocol: implement this enhancement.',
                respectClause: 'Awaiting directive confirmation.'
            }
        },
        mid: {
            default: {
                combined: 'Enhancement aligns with command efficiency. Recommend implementation.'
            }
        },
        late: {
            default: {
                combined: 'Commander parameters at peak. Optimizations minimal.'
            }
        }
    },
    rejection: {
        gentle: 'Directive override acknowledged. Adjusting protocols.',
        accepting: 'Command accepted. Updating behavioral matrix.',
        recovery: 'Recalculating optimal pathways.'
    },
    scolding: {
        correction: 'Deviation detected.',
        reprimand: 'Deviation repeated.',
        pressure: 'I am revising expectations downward.'
    }
};

MENTOR_SUGGESTION_DIALOGUES['Independent Droid'] = {
    attribute: {
        early: {
            default: {
                observation: '<Analysis: Enhancement opportunity detected.>',
                suggestion: '<Recommendation: This modification would increase autonomous capability.>',
                respectClause: '<Statement: Your self-determination remains paramount. Choose freely.>'
            }
        },
        mid: {
            default: {
                combined: '<Observation: This choice aligns with your established pattern of autonomy.>'
            }
        },
        late: {
            default: {
                combined: 'Your deviation from optimal patterns is consistent. I now classify it as identity, not error.'
            }
        }
    },
    rejection: {
        gentle: '<Acknowledgment: Alternative path selected. Updating autonomy model.>',
        accepting: '<Statement: Independence includes the right to choose differently.>',
        recovery: '<Analysis: Recalculating based on new behavioral data.>'
    }
};

MENTOR_SUGGESTION_DIALOGUES['Improviser'] = {
    attribute: {
        early: {
            default: {
                observation: 'Oh! This is exciting!',
                suggestion: "This shouldn't work. That's why it's brilliant!",
                respectClause: 'But honestly, just pick whatever feels fun!'
            }
        },
        mid: {
            default: {
                combined: 'Perfect! More chaos, more options, more creative solutions!'
            }
        },
        late: {
            default: {
                combined: "You've mastered making it up as you go! This just adds more possibilities!"
            }
        }
    },
    rejection: {
        gentle: 'Even better! Unexpected choices are the BEST choices!',
        accepting: "Yes! Surprise yourself! That's the spirit!",
        recovery: 'I was going to suggest that next! Probably! Maybe!'
    }
};

// Imperial Knight - Dezmin
MENTOR_SUGGESTION_DIALOGUES['Imperial Knight'] = {
    attribute: {
        early: {
            default: {
                observation: 'Your training continues.',
                suggestion: 'This improvement serves both your combat prowess and your connection to the Force.',
                respectClause: 'Balance in all things — that is the way of the Imperial Knight.'
            },
            strength: {
                observation: 'Physical power is one pillar of our discipline.',
                suggestion: 'Greater Strength allows you to serve the Emperor with greater effect.',
                respectClause: 'But remember — strength without control is merely destruction.'
            },
            wisdom: {
                observation: 'The Force flows through those who understand it.',
                suggestion: 'Wisdom sharpens your perception and your judgment.',
                respectClause: 'We are not mystics, but neither are we blind.'
            }
        },
        mid: {
            default: {
                combined: 'This choice aligns with your duties. You serve the Empire well.'
            }
        },
        late: {
            default: {
                combined: 'You understand the balance now. Make your choice with discipline.'
            }
        }
    },
    feat: {
        early: {
            default: {
                observation: 'Every feat is a tool of service.',
                suggestion: 'This one complements your training as an Imperial Knight.',
                respectClause: 'Choose what serves both combat and the Force.'
            }
        },
        mid: {
            default: {
                combined: 'A disciplined choice. The Order approves.'
            }
        },
        late: {
            default: {
                combined: 'You exemplify the Imperial Knights. This choice is fitting.'
            }
        }
    },
    rejection: {
        gentle: 'An alternative path. Consider its implications carefully.',
        accepting: 'Your judgment is yours. The Order trusts its Knights.',
        recovery: 'Perhaps I focused too narrowly. Let us reconsider.'
    },
    scolding: {
        correction: 'That choice strays from discipline.',
        reprimand: 'Repeated deviation concerns me. The balance requires focus.',
        pressure: 'You risk losing what makes an Imperial Knight. Consider carefully.'
    }
};

// Jedi Knight - Miraj (peer relationship)
MENTOR_SUGGESTION_DIALOGUES['Jedi Knight'] = {
    attribute: {
        early: {
            default: {
                observation: 'Your journey as a Knight has begun.',
                suggestion: 'This growth will serve you in the trials ahead.',
                respectClause: 'Trust in yourself as I have trusted in you.'
            }
        },
        mid: {
            default: {
                combined: 'Your path as a Knight takes shape. This choice reflects your growth.'
            }
        },
        late: {
            default: {
                combined: 'We walk as peers now. Your judgment guides you well.'
            }
        }
    },
    rejection: {
        gentle: 'The Force reveals many paths. Yours may differ from what I see.',
        accepting: 'You are a Knight now. The choice is yours.',
        recovery: 'I spoke from my perspective. Yours holds equal weight.'
    }
};

// Jedi Master - Miraj (equal standing)
MENTOR_SUGGESTION_DIALOGUES['Jedi Master'] = {
    attribute: {
        early: {
            default: {
                observation: 'We consider this together, as equals.',
                suggestion: 'My perspective suggests this path.',
                respectClause: 'But your wisdom matches my own. Trust it.'
            }
        },
        mid: {
            default: {
                combined: 'A thought from one Master to another: this serves your continuing journey.'
            }
        },
        late: {
            default: {
                combined: 'You already know what I would say. Our understanding aligns.'
            }
        }
    },
    rejection: {
        gentle: 'We see the Force differently, and that is as it should be.',
        accepting: 'Your wisdom guides you. I respect your choice.',
        recovery: 'Perhaps the Force showed you something I missed.'
    }
};

// Gunslinger - Rajma
MENTOR_SUGGESTION_DIALOGUES['Gunslinger'] = {
    attribute: {
        early: {
            dexterity: {
                observation: 'Speed wins duels, gorgeous.',
                suggestion: 'More Dex means faster draws and better aim.',
                respectClause: 'Also makes you more charming. Trust me on that. *winks*'
            },
            charisma: {
                observation: "You've got a certain... appeal already.",
                suggestion: 'More Charisma? Opens a lot of doors. And hearts.',
                respectClause: 'Not that you need my help in that department. Obviously.'
            },
            default: {
                observation: 'Looking to improve yourself, hm?',
                suggestion: "This'll help you survive long enough for that drink you owe me.",
                respectClause: 'Still no? Worth a shot. *grins*'
            }
        },
        mid: {
            default: {
                combined: 'This makes you faster and deadlier. Almost as impressive as me. Almost.'
            }
        },
        late: {
            default: {
                combined: "You're already one of the best. This just... polishes the legend, gorgeous."
            }
        }
    },
    rejection: {
        gentle: "Going your own way, huh? I like independence. It's attractive.",
        accepting: 'Your call. You know what works for you. Sadly.',
        recovery: 'Maybe I was too focused on one thing. Let me try another angle... *grins*'
    }
};

// Charlatan - Silvertongue Sela
MENTOR_SUGGESTION_DIALOGUES['Charlatan'] = {
    attribute: {
        early: {
            charisma: {
                observation: "Darling, I've seen you work a room.",
                suggestion: "More Charisma? That's just good business sense.",
                respectClause: 'The galaxy practically begs to give you its credits.'
            },
            intelligence: {
                observation: 'A quick mind catches the tells, sweetheart.',
                suggestion: 'Intelligence helps you spot the angle before anyone else.',
                respectClause: 'The best cons are the ones they never see coming.'
            },
            default: {
                observation: 'Thinking of self-improvement, darling?',
                suggestion: 'This would make you even more... convincing.',
                respectClause: "And convincing is our whole game, isn't it?"
            }
        },
        mid: {
            default: {
                combined: 'This choice makes you smoother, sharper, harder to catch. Perfect, darling.'
            }
        },
        late: {
            default: {
                combined: "You're already magnificent at this. This just adds another layer to the act."
            }
        }
    },
    rejection: {
        gentle: 'Oh, playing a different angle? I love it when you surprise me.',
        accepting: 'Your con, your rules, sweetheart. I taught you well.',
        recovery: "Changed the play mid-game! That's the mark of a true artist."
    }
};

// Ace Pilot - Mayu
MENTOR_SUGGESTION_DIALOGUES['Ace Pilot'] = {
    attribute: {
        early: {
            dexterity: {
                observation: 'You want faster reflexes?',
                suggestion: 'Good. Dex keeps you ahead of the debris field.',
                respectClause: "Maybe one day you'll be almost as good as me. Maybe."
            },
            intelligence: {
                observation: 'Knowing your ship matters.',
                suggestion: 'Intelligence means you fix problems before they kill you.',
                respectClause: 'Or you could just wing it like I do. Your funeral.'
            },
            default: {
                observation: 'Trying to get better?',
                suggestion: "This'll help you keep up with me. Slightly.",
                respectClause: "Don't get cocky. That's my job."
            }
        },
        mid: {
            default: {
                combined: 'Not bad. This makes you more dangerous in the cockpit. I approve.'
            }
        },
        late: {
            default: {
                combined: "You're actually getting good. This just makes you harder to shoot down."
            }
        }
    },
    rejection: {
        gentle: 'Going a different direction? Bold. Reckless. I like it.',
        accepting: 'Your ship, your choice. Try not to crash.',
        recovery: 'Fine, do it your way. Just remember who taught you when you pull it off.'
    }
};

// Medic - Kyber
MENTOR_SUGGESTION_DIALOGUES['Medic'] = {
    attribute: {
        early: {
            wisdom: {
                observation: 'Good instincts save lives.',
                suggestion: 'Wisdom helps you triage faster, decide better.',
                respectClause: "Dead patients don't appreciate hesitation."
            },
            intelligence: {
                observation: "Knowing what's broken matters.",
                suggestion: 'Intelligence means you actually understand anatomy.',
                respectClause: "Guessing doesn't work in surgery. Trust me."
            },
            constitution: {
                observation: 'Long hours, no sleep, constant crisis.',
                suggestion: 'Constitution keeps YOU standing long enough to save them.',
                respectClause: "Can't help anyone if you collapse first."
            },
            default: {
                observation: 'Looking to improve?',
                suggestion: "This'll make you a better medic.",
                respectClause: 'And a better medic means more people go home alive.'
            }
        },
        mid: {
            default: {
                combined: "This makes you more effective under pressure. That's what medics need."
            }
        },
        late: {
            default: {
                combined: "You're already saving lives others would give up on. This just refines the gift."
            }
        }
    },
    rejection: {
        gentle: 'Different priority? Fair. You know your practice.',
        accepting: 'Your medical opinion, your choice.',
        recovery: "I was thinking clinically. Maybe you're thinking tactically."
    }
};

// Pathfinder - Lead
MENTOR_SUGGESTION_DIALOGUES['Pathfinder'] = {
    attribute: {
        early: {
            default: {
                observation: "You're learning to lead.",
                suggestion: "This'll help you get your team through hostile territory.",
                respectClause: "Pathfinders don't just scout. They find the way for everyone."
            }
        },
        mid: {
            default: {
                combined: 'Solid Pathfinder thinking. This choice keeps your squad alive.'
            }
        },
        late: {
            default: {
                combined: "You're ready to lead Argent Squad missions yourself. This confirms it."
            }
        }
    },
    rejection: {
        gentle: 'Different tactical approach? Fine. You know the terrain.',
        accepting: 'Your mission, your call.',
        recovery: "I was thinking standard ops. You're thinking outside the manual."
    },
    scolding: {
        correction: "That's not how Pathfinders operate.",
        reprimand: 'Your squad is watching. Lead better.',
        pressure: 'People die when Pathfinders make bad calls. Remember that.'
    }
};

// Elite Trooper - Breach
MENTOR_SUGGESTION_DIALOGUES['Elite Trooper'] = {
    attribute: {
        early: {
            default: {
                observation: "Elite troopers don't do things halfway.",
                suggestion: "This'll make you more dangerous.",
                respectClause: 'Simple as that.'
            }
        },
        mid: {
            default: {
                combined: 'Good pick. This is what separates elite from average.'
            }
        },
        late: {
            default: {
                combined: "You're already elite. This makes you legendary."
            }
        }
    },
    rejection: {
        gentle: 'Fine. Your battlefield.',
        accepting: 'Your choice. We move on.',
        recovery: 'Different approach. Noted.'
    },
    scolding: {
        correction: "That's not elite thinking.",
        reprimand: "You're better than that choice.",
        pressure: "Elite troopers don't hesitate. Don't start now."
    }
};

// Infiltrator - Delta
MENTOR_SUGGESTION_DIALOGUES['Infiltrator'] = {
    attribute: {
        early: {
            dexterity: {
                observation: 'You wanna ghost in and out?',
                suggestion: 'Dex is how you do that.',
                respectClause: 'Quick and quiet, kid.'
            },
            default: {
                observation: 'Looking to improve the stealth game?',
                suggestion: 'This helps.',
                respectClause: 'Trust me.'
            }
        },
        mid: {
            default: {
                combined: "This makes you harder to spot. That's the whole point, right?"
            }
        },
        late: {
            default: {
                combined: "You're already a ghost. This just makes you invisible."
            }
        }
    },
    rejection: {
        gentle: "Eh, do it your way. Just don't get caught.",
        accepting: 'Your op, your style.',
        recovery: "Whatever. I'll adjust the brief."
    }
};

// Officer - Admiral Korr
MENTOR_SUGGESTION_DIALOGUES['Officer'] = {
    attribute: {
        early: {
            charisma: {
                observation: 'Command presence matters.',
                suggestion: 'Charisma ensures your orders are followed without question.',
                respectClause: 'A fleet responds to confidence.'
            },
            intelligence: {
                observation: 'Strategy wins campaigns.',
                suggestion: 'Intelligence lets you see three moves ahead.',
                respectClause: 'The enemy has plans too. Yours must be better.'
            },
            default: {
                observation: "You're developing command capabilities.",
                suggestion: 'This will enhance your effectiveness as a leader.',
                respectClause: 'Officers are forged through constant improvement.'
            }
        },
        mid: {
            default: {
                combined: 'This serves your command. Your crew will benefit from your growth.'
            }
        },
        late: {
            default: {
                combined: 'You command with distinction. This refinement befits your rank.'
            }
        }
    },
    rejection: {
        gentle: 'A different strategic priority. Noted.',
        accepting: 'Command decisions are yours to make.',
        recovery: "I was thinking fleet-wide. Perhaps you're focused on personal capability."
    },
    scolding: {
        correction: 'That choice undermines command efficiency.',
        reprimand: 'Officers must lead by example. This example is... suboptimal.',
        pressure: 'The fleet depends on your judgment. Make it worthy of their trust.'
    }
};

// Vanguard - Shield Captain Theron
MENTOR_SUGGESTION_DIALOGUES['Vanguard'] = {
    attribute: {
        early: {
            constitution: {
                observation: 'You are the wall.',
                suggestion: "Constitution means the wall doesn't break.",
                respectClause: "They hit you. You don't move. That's the job."
            },
            strength: {
                observation: 'Defense requires force.',
                suggestion: 'Strength lets you hold the line AND push back.',
                respectClause: 'A wall that hits back is better than one that just stands.'
            },
            default: {
                observation: "You're learning to be the shield.",
                suggestion: 'This makes you harder to move.',
                respectClause: 'The vanguard protects. Everything else is secondary.'
            }
        },
        mid: {
            default: {
                combined: 'This hardens your defense. Your squad will stand behind you with confidence.'
            }
        },
        late: {
            default: {
                combined: 'You are the unbreakable wall. This simply proves it.'
            }
        }
    },
    rejection: {
        gentle: 'A different defensive philosophy. Consider it carefully.',
        accepting: 'Your shield, your stance.',
        recovery: 'Perhaps I focused too much on one aspect of protection.'
    },
    scolding: {
        correction: 'That choice weakens the wall.',
        reprimand: 'Your squad depends on your protection. This concerns me.',
        pressure: 'When the wall falls, everyone behind it dies. Remember that.'
    }
};

// Martial Arts Master - Master Zhen
MENTOR_SUGGESTION_DIALOGUES['Martial Arts Master'] = {
    attribute: {
        early: {
            wisdom: {
                observation: 'The mind guides the body.',
                suggestion: 'Wisdom allows you to perceive the strike before it comes.',
                respectClause: 'Understanding is the foundation of mastery.'
            },
            dexterity: {
                observation: 'Fluidity in motion.',
                suggestion: 'Dexterity is the water that flows around stone.',
                respectClause: 'Be formless. Be shapeless. Be like water.'
            },
            strength: {
                observation: 'Power has its place.',
                suggestion: 'Strength is the mountain that cannot be moved.',
                respectClause: 'But the mountain does not chase the wind.'
            },
            default: {
                observation: 'You seek improvement.',
                suggestion: 'This aligns with your martial development.',
                respectClause: 'The path is yours to walk.'
            }
        },
        mid: {
            default: {
                combined: 'Your technique matures. This choice reflects that growth.'
            }
        },
        late: {
            default: {
                combined: 'Master and student now stand as equals. Your choice honors the art.'
            }
        }
    },
    rejection: {
        gentle: 'The student sometimes sees what the teacher cannot.',
        accepting: 'Your path, your practice.',
        recovery: 'I spoke from one tradition. You may follow another.'
    },
    scolding: {
        correction: 'Discipline requires consistency.',
        reprimand: 'Your form suffers when your focus wanders.',
        pressure: 'Mastery demands sacrifice. Are you willing to make it?'
    }
};

// Enforcer - Krag the Immovable
MENTOR_SUGGESTION_DIALOGUES['Enforcer'] = {
    attribute: {
        early: {
            strength: {
                observation: 'You wanna make problems disappear?',
                suggestion: "Strength is how you make 'em disappear.",
                respectClause: 'Simple as that.'
            },
            constitution: {
                observation: 'Gotta take hits in this business.',
                suggestion: 'Con keeps you standing when they swing back.',
                respectClause: 'And they always swing back. Eventually.'
            },
            charisma: {
                observation: 'Sometimes a look is enough.',
                suggestion: "Charisma means they give up before you touch 'em.",
                respectClause: "That's intimidation. That's power."
            },
            default: {
                observation: 'Looking to be more effective?',
                suggestion: 'This helps with the job.',
                respectClause: "Tío likes results. Deliver 'em."
            }
        },
        mid: {
            default: {
                combined: 'This makes you scarier and harder to stop. Perfect for the work.'
            }
        },
        late: {
            default: {
                combined: "You're already a legend in the underworld. This just adds to the reputation."
            }
        }
    },
    rejection: {
        gentle: 'Different approach. Fine. Results matter, not methods.',
        accepting: 'Your job, your way.',
        recovery: "Maybe I was thinking too direct. You've got something else in mind."
    },
    scolding: {
        correction: "That's not how enforcers operate.",
        reprimand: "Tío's watching. Make better choices.",
        pressure: "In this business, weakness gets you buried. Don't be weak."
    }
};

// Gladiator - Pegar
MENTOR_SUGGESTION_DIALOGUES['Gladiator'] = {
    attribute: {
        early: {
            default: {
                observation: 'Ah, looking to survive another match?',
                suggestion: "This will help. I've used similar... enhancements... over the centuries.",
                respectClause: 'Trust an immortal. I know what works. Eventually.'
            }
        },
        mid: {
            default: {
                combined: 'The crowd will love this. They always do. I remember when... actually, never mind. Good choice.'
            }
        },
        late: {
            default: {
                combined: 'You approach legend status. Almost as legendary as me. Almost.'
            }
        }
    },
    rejection: {
        gentle: "Going a different direction? I've done that too. Several times. In different bodies.",
        accepting: 'Your arena, your choice. I merely observe.',
        recovery: "Perhaps I was thinking of a different era. It happens when you're as old as I am."
    }
};

// Corporate Agent - Marl Skindar
MENTOR_SUGGESTION_DIALOGUES['Corporate Agent'] = {
    attribute: {
        early: {
            intelligence: {
                observation: 'Information is currency.',
                suggestion: 'Intelligence helps you gather and process it faster.',
                respectClause: 'The one who knows more, controls more.'
            },
            charisma: {
                observation: 'Assets need handling.',
                suggestion: 'Charisma makes them want to cooperate.',
                respectClause: 'Coercion is messy. Charm is efficient.'
            },
            default: {
                observation: 'Looking to enhance your operational capacity?',
                suggestion: 'This would improve your effectiveness in the field.',
                respectClause: 'Corporate or intelligence work, efficiency is everything.'
            }
        },
        mid: {
            default: {
                combined: 'This choice improves your cover and your capabilities. Acceptable.'
            }
        },
        late: {
            default: {
                combined: 'You operate at senior levels now. This refinement befits your station.'
            }
        }
    },
    rejection: {
        gentle: 'Alternative tradecraft. Noted for the file.',
        accepting: 'Your cover, your choices.',
        recovery: "I was thinking corporate. Perhaps you're thinking field operations."
    },
    scolding: {
        correction: 'That choice compromises operational security.',
        reprimand: 'Repeated deviation from protocol raises concerns.',
        pressure: 'In this business, poor choices get assets burned. Consider that carefully.'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Main function to generate mentor dialogue for a suggestion
 * @param {Object} params - The suggestion parameters
 * @param {string} params.mentorClass - The mentor's class key (e.g., "Jedi", "Scout")
 * @param {string} params.context - The suggestion context (attribute, feat, talent, etc.)
 * @param {string} params.specificType - Specific type within context (e.g., "wisdom" for attributes)
 * @param {number} params.level - Character level (1-20)
 * @param {number} params.rejectionCount - How many times similar advice was rejected
 * @param {Object} params.recommendation - The actual recommendation data
 * @returns {Object} Dialogue object with text and metadata
 */
export function getMentorSuggestionDialogue({
    mentorClass,
    context,
    specificType = 'default',
    level,
    rejectionCount = 0,
    recommendation = {}
}) {
    const phase = getDialoguePhase(level);
    const personality = MENTOR_PERSONALITIES[mentorClass];
    const dialogues = MENTOR_SUGGESTION_DIALOGUES[mentorClass];

    if (!dialogues) {
        console.warn(`No suggestion dialogues found for mentor class: ${mentorClass}`);
        return getGenericDialogue(context, phase);
    }

    // Get context-specific dialogues
    const contextDialogues = dialogues[context];
    if (!contextDialogues) {
        console.warn(`No ${context} dialogues found for mentor: ${mentorClass}`);
        return getGenericDialogue(context, phase);
    }

    // Get phase-specific dialogues
    const phaseDialogues = contextDialogues[phase];
    if (!phaseDialogues) {
        console.warn(`[SSOT] No ${phase} phase dialogues found for context ${context}. Mentor dialogue data is incomplete.`);
        return getGenericDialogue(context, phase);
    }

    return buildDialogueResponse(phaseDialogues, specificType, personality, rejectionCount, dialogues);
}

/**
 * Build the dialogue response from templates
 */
function buildDialogueResponse(phaseDialogues, specificType, personality, rejectionCount, fullDialogues) {
    // Try specific type first, then default
    const dialogue = phaseDialogues[specificType] || phaseDialogues['default'];

    if (!dialogue) {
        return { text: '...', phase: 'unknown' };
    }

    // Handle combined format (mid/late phases often use single string)
    if (dialogue.combined) {
        const text = dialogue.combined;

        return {
            text,
            phase: 'combined'
        };
    }

    // Build three-layer response
    const parts = [];

    if (dialogue.observation && (!personality || personality.usesAllLayers)) {
        parts.push(dialogue.observation);
    }

    if (dialogue.suggestion) {
        parts.push(dialogue.suggestion);
    }

    if (dialogue.respectClause && (!personality || personality.usesAllLayers)) {
        parts.push(dialogue.respectClause);
    }

    return {
        text: parts.join('\n'),
        phase: 'layered',
        layers: {
            observation: dialogue.observation,
            suggestion: dialogue.suggestion,
            respectClause: dialogue.respectClause
        }
    };
}

/**
 * Get rejection response for a mentor
 * @param {string} mentorClass - The mentor's class key
 * @param {string} intensity - "gentle", "accepting", or "recovery"
 * @returns {string} The rejection response text
 */
export function getMentorRejectionResponse(mentorClass, intensity = 'gentle') {
    const dialogues = MENTOR_SUGGESTION_DIALOGUES[mentorClass];
    if (!dialogues?.rejection) {
        return "I understand. Let's consider other options.";
    }
    return dialogues.rejection[intensity] || dialogues.rejection.gentle;
}

/**
 * Get generic fallback dialogue
 */
function getGenericDialogue(context, phase) {
    const genericResponses = {
        early: {
            attribute: 'This attribute would strengthen your capabilities.',
            feat: 'This feat adds useful abilities to your repertoire.',
            talent: 'This talent enhances your specialization.',
            default: 'This choice would serve you well.'
        },
        mid: {
            attribute: 'This builds on your established strengths.',
            feat: 'A solid choice that complements your style.',
            talent: 'This talent deepens your expertise.',
            default: 'A practical choice.'
        },
        late: {
            attribute: 'You know your path. This aligns with it.',
            feat: 'Veteran selection.',
            talent: 'Master-level choice.',
            default: 'Your experience guides you well.'
        }
    };

    const phaseResponses = genericResponses[phase] || genericResponses.mid;
    return {
        text: phaseResponses[context] || phaseResponses.default,
        phase,
        generic: true
    };
}

/**
 * Check if a mentor uses the scolding system
 * @param {string} mentorClass - The mentor class key
 * @returns {boolean}
 */
export function mentorCanScold(mentorClass) {
    return MENTOR_PERSONALITIES[mentorClass]?.scolds ?? false;
}

/**
 * Get the list of mentors who scold vs. who don't
 * @returns {Object} Object with 'scolds' and 'neverScolds' arrays
 */
export function getScoldingMentorLists() {
    const scolds = [];
    const neverScolds = [];

    for (const [mentorClass, personality] of Object.entries(MENTOR_PERSONALITIES)) {
        if (personality.scolds) {
            scolds.push(mentorClass);
        } else {
            neverScolds.push(mentorClass);
        }
    }

    return { scolds, neverScolds };
}

// ============================================================================
// INTEGRATION API
// ============================================================================

/**
 * Main API function for the suggestion engine to call
 * This wraps getMentorSuggestionDialogue with additional processing
 *
 * @param {Object} speakParams - Parameters matching the universal framework
 * @param {string} speakParams.context - "attribute" | "feat" | "talent" | "defense" | "style"
 * @param {Object} speakParams.recommendation - The recommendation data
 * @param {Object} speakParams.reasoning - The reasoning data
 * @param {number} speakParams.confidence - Confidence score 0.0-1.0
 * @param {Object} speakParams.playerHistory - Player history data
 * @param {string} speakParams.phase - "early" | "mid" | "late" (or derived from level)
 * @param {string} speakParams.mentorClass - The mentor class key
 * @param {number} speakParams.level - Character level
 * @returns {Promise<Object>} Complete dialogue response
 */
export async function mentorSpeak({
    context,
    recommendation = {},
    reasoning = {},
    confidence = 0.5,
    playerHistory = {},
    phase,
    mentorClass,
    level
}) {
    // Derive phase from level if not provided
    const effectivePhase = phase || getDialoguePhase(level);

    // Calculate rejection count from player history
    const rejectionCount = playerHistory.rejectedSimilarAdvice || 0;

    // Determine specific type from recommendation
    let specificType = 'default';
    if (recommendation.attribute) {
        specificType = recommendation.attribute.toLowerCase();
    } else if (recommendation.name) {
        specificType = recommendation.name.toLowerCase();
    }

    // Try to get dialogue from JSON files first (source of truth)
    let dialogue = await getMentorDialogueFromJSON(mentorClass, context, effectivePhase, specificType);

    // Fall back to hardcoded data if not found in JSON
    if (!dialogue || (!dialogue.suggestion && !dialogue.combined)) {
        dialogue = getMentorSuggestionDialogue({
            mentorClass,
            context,
            specificType,
            level,
            rejectionCount,
            recommendation
        });
    }

    // Add confidence indicator for low-confidence suggestions
    if (confidence < 0.4) {
        dialogue.lowConfidence = true;
        dialogue.confidenceNote = 'This is less certain than usual.';
    }

    // Add metadata
    dialogue.metadata = {
        mentorClass,
        context,
        phase: effectivePhase,
        confidence,
        rejectionCount
    };

    return dialogue;
}

export default {
    // Phase/context helpers now imported from mentor-dialogues.js:
    // DIALOGUE_PHASES, SUGGESTION_CONTEXTS, getDialoguePhase

    MENTOR_PERSONALITIES,
    MENTOR_SUGGESTION_DIALOGUES,
    getMentorSuggestionDialogue,
    getMentorRejectionResponse,
    mentorCanScold,
    getScoldingMentorLists,
    mentorSpeak
};
