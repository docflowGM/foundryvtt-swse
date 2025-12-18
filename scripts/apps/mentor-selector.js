/**
 * Mentor Selector UI
 * Allows players to choose or change their mentor
 */

import { MENTORS, setMentorOverride, getActiveMentor } from "./mentor-dialogues.js";
import { swseLogger } from "../utils/logger.js";

export class MentorSelectorWindow {
    /**
     * Open mentor selection dialog for an actor
     * @param {Actor} actor - The actor to change mentor for
     */
    static open(actor) {
        // Build mentor options with portraits
        const mentorOptions = Object.entries(MENTORS)
            .map(([key, mentor]) => ({
                key,
                name: mentor.name,
                title: mentor.title,
                portrait: mentor.portrait
            }));

        // Get current active mentor
        const activeMentor = getActiveMentor(actor);
        const currentKey = Object.keys(MENTORS).find(k => MENTORS[k] === activeMentor);

        // Create dialog content
        const content = `
            <div class="swse-mentor-selector">
                <p style="margin-bottom:12px;">Select a mentor to guide ${actor.name} through their journey:</p>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 12px;">
                    ${mentorOptions.map(mentor => `
                        <div class="mentor-card" data-mentor="${mentor.key}"
                             style="cursor: pointer; padding: 8px; border: 2px solid transparent; border-radius: 6px;
                                    transition: all 0.2s; ${currentKey === mentor.key ? 'border-color: #4a90e2; background: rgba(74, 144, 226, 0.1);' : 'background: rgba(0,0,0,0.05);'}"
                             onmouseover="this.style.background='rgba(74, 144, 226, 0.2)'; this.style.borderColor='#4a90e2';"
                             onmouseout="this.style.background='${currentKey === mentor.key ? 'rgba(74, 144, 226, 0.1);' : 'rgba(0,0,0,0.05);'}'; this.style.borderColor='${currentKey === mentor.key ? '#4a90e2' : 'transparent'}';">
                            <img src="${mentor.portrait}" width="100%" style="border-radius: 4px; margin-bottom: 6px; object-fit: cover; aspect-ratio: 1/1;" />
                            <p style="margin: 0 0 2px 0; font-weight: bold; font-size: 12px; text-align: center;">${mentor.name}</p>
                            <p style="margin: 0; font-size: 10px; text-align: center; opacity: 0.7;">${mentor.title}</p>
                        </div>
                    `).join('')}
                </div>

                <div class="mentor-preview" style="margin-top: 12px; padding: 12px; background: rgba(0,0,0,0.05); border-radius: 4px; display: none;">
                    <h4 id="preview-name" style="margin: 0 0 4px 0;"></h4>
                    <p id="preview-title" style="margin: 0; opacity: 0.7; font-size: 12px;"></p>
                </div>

                <script>
                    // Handle mentor card selection
                    document.querySelectorAll('.mentor-card').forEach(card => {
                        card.addEventListener('click', function() {
                            // Remove selection from all cards
                            document.querySelectorAll('.mentor-card').forEach(c => {
                                c.style.borderColor = 'transparent';
                                c.style.background = 'rgba(0,0,0,0.05)';
                            });

                            // Add selection to clicked card
                            this.style.borderColor = '#4a90e2';
                            this.style.background = 'rgba(74, 144, 226, 0.1)';

                            // Store selected mentor key in hidden input
                            document.getElementById('selected-mentor').value = this.dataset.mentor;

                            // Update preview
                            const mentorData = window.MENTOR_DATA[this.dataset.mentor];
                            document.getElementById('preview-name').textContent = mentorData.name;
                            document.getElementById('preview-title').textContent = mentorData.title;
                            document.querySelector('.mentor-preview').style.display = 'block';
                        });
                    });

                    // Make mentor data available to script
                    window.MENTOR_DATA = ${JSON.stringify(
                        Object.fromEntries(
                            mentorOptions.map(m => [m.key, { name: m.name, title: m.title }])
                        )
                    )};

                    // Initialize preview with current selection
                    document.querySelectorAll('.mentor-card').forEach(card => {
                        if (card.dataset.mentor === '${currentKey}') {
                            card.click();
                        }
                    });
                </script>

                <input type="hidden" id="selected-mentor" value="${currentKey}" />
            </div>
        `;

        // Create and show dialog
        new Dialog({
            title: `Select Mentor for ${actor.name}`,
            content: content,
            buttons: {
                ok: {
                    label: "Confirm",
                    icon: '<i class="fas fa-check"></i>',
                    callback: async (html) => {
                        const selectedMentor = html.find('#selected-mentor').val();

                        if (!selectedMentor) {
                            ui.notifications.warn("Please select a mentor");
                            return;
                        }

                        try {
                            await setMentorOverride(actor, selectedMentor);
                            ui.notifications.info(`Mentor changed to ${MENTORS[selectedMentor].name}`);
                            swseLogger.log(`Mentor changed to ${selectedMentor} for ${actor.name}`);
                        } catch (err) {
                            swseLogger.error("Failed to change mentor:", err);
                            ui.notifications.error(`Failed to change mentor: ${err.message}`);
                        }
                    }
                },
                cancel: {
                    label: "Cancel",
                    icon: '<i class="fas fa-times"></i>'
                }
            },
            default: "ok",
            width: 600,
            resizable: true
        }).render(true);
    }
}

// Add UI command registration for opening mentor selector
Hooks.once("init", () => {
    // Make available globally for use in macros/tools
    window.SWSE = window.SWSE || {};
    window.SWSE.MentorSelectorWindow = MentorSelectorWindow;
});
