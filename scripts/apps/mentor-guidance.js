/**
 * Mentor Guidance System
 * Displays mentor guidance when players navigate to character progression steps
 */

import {
    getMentorForClass,
    getMentorGuidance,
    getLevel1Class
} from "./mentor-dialogues.js";

import { swseLogger } from "../utils/logger.js";

export class MentorGuidanceUI {

    static initialize() {
        Hooks.on("swse:mentor:guidance", (data) => {
            try {
                MentorGuidanceUI._handleGuidance(data.actor, data.step);
            } catch (e) {
                swseLogger.warn("MentorGuidanceUI step failed:", e);
            }
        });
    }

    static async _handleGuidance(actor, stepId) {

        const startingClass = getLevel1Class(actor);
        const mentor = getMentorForClass(startingClass);

        const choiceType = MentorGuidanceUI._mapStepToGuidance(stepId);
        if (!choiceType) return; // No guidance for this step

        const guidance = getMentorGuidance(mentor, choiceType);
        if (!guidance) return;

        // Check if guidance popups are enabled
        if (!game.settings.get("foundryvtt-swse", "mentorGuidanceEnabled")) {
            // Fallback: send to chat if popups disabled
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: actor }),
                content: `<div class="swse-mentor-chat"><strong>${mentor.name}:</strong> ${guidance}</div>`
            });
            return;
        }

        // Render popup
        MentorGuidanceUI._showPopup(mentor, guidance);
    }

    static _mapStepToGuidance(stepId) {
        return {
            "class": "classGuidance",
            "skills": "skillGuidance",
            "feats": "talentGuidance",
            "talents": "talentGuidance",
            "hp": "hpGuidance",
            "abilities": "abilityGuidance",
        }[stepId] || null;
    }

    static _showPopup(mentor, text) {
        new Dialog({
            title: `${mentor.name} — Guidance`,
            content: `
                <div class="swse-mentor-guidance">
                    <div style="display:flex; gap:12px;">
                        <img src="${mentor.portrait}"
                             width="72"
                             height="72"
                             style="border-radius:8px; object-fit:cover;" />
                        <div>
                            <h3 style="margin:0;">${mentor.name}</h3>
                            <p style="opacity:0.7; margin:0 0 6px 0;">${mentor.title}</p>
                            <p style="font-size:14px; line-height:1.3em; margin:0;">${text}</p>
                        </div>
                    </div>
                </div>
            `,
            buttons: {
                ok: {
                    label: "Understood",
                    icon: '<i class="far fa-check-circle"></i>'
                }
            },
            default: "ok"
        }).render(true);
    }
}

// Activate on init hook
Hooks.once("init", () => {
    MentorGuidanceUI.initialize();
});
