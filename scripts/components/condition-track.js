import { ProgressionEngine } from "../progression/engine/progression-engine.js";
/**
 * Condition Track UI Component
 * This creates the visual condition track that's central to SWSE combat.
 * It's interactive - click to set position, buttons to move up/down.
 */
export class ConditionTrackComponent {

  static render(actor) {
    const current = actor.system.conditionTrack?.current || 0;
    const persistent = actor.system.conditionTrack?.persistent || false;

    const steps = [
      {index: 0, label: 'Normal', penalty: '', cssClass: 'normal'},
      {index: 1, label: '-1', penalty: '-1', cssClass: 'penalty-1'},
      {index: 2, label: '-2', penalty: '-2', cssClass: 'penalty-2'},
      {index: 3, label: '-5', penalty: '-5', cssClass: 'penalty-5'},
      {index: 4, label: '-10', penalty: '-10', cssClass: 'penalty-10'},
      {index: 5, label: 'Helpless', penalty: '', cssClass: 'helpless'}
    ];

    return `
      <div class="condition-track-component">
        <h3 class="track-header">
          Condition Track
          ${persistent ? '<span class="persistent-badge">PERSISTENT</span>' : ''}
        </h3>

        <div class="track-visual">
          ${steps.map(step => `
            <div class="track-step ${step.cssClass} ${current === step.index ? 'active' : ''}"
                 data-action="setCondition"
                 data-step="${step.index}"
                 title="Click to set condition">
              <div class="step-label">${step.label}</div>
              ${step.penalty ? `<div class="penalty">${step.penalty}</div>` : ''}
              ${current === step.index ? '<div class="current-marker">▼</div>' : ''}
            </div>
          `).join('')}
        </div>

        <div class="track-controls">
          <button class="track-btn improve" data-action="improveCondition">
            <i class="fas fa-arrow-up"></i> Recover
          </button>
          <button class="track-btn worsen" data-action="worsenCondition">
            <i class="fas fa-arrow-down"></i> Damage
          </button>
          <label class="persistent-toggle">
            <input type="checkbox" 
                   name="system.conditionTrack.persistent" 
                   ${persistent ? 'checked' : ''}>
            Persistent
          </label>
        </div>

        ${current > 0 ? `
          <div class="penalty-reminder">
            Current Penalty: <strong>${steps[current].penalty}</strong> to all d20 rolls
          </div>
        ` : ''}
      </div>
    `;
  }

  static attachListeners(html, actor) {
    // Click on step to set position
    html.find('[data-action="setCondition"]').click(async (event) => {
      const step = parseInt(event.currentTarget.dataset.step);
      await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
globalThis.SWSE.ActorEngine.updateActor(actor, {'system.conditionTrack.current': step});
    });

    // Improve button
    html.find('[data-action="improveCondition"]').click(async () => {
      await actor.moveConditionTrack(-1);
    });

    // Worsen button
    html.find('[data-action="worsenCondition"]').click(async () => {
      await actor.moveConditionTrack(1);
    });

    // Persistent checkbox
    html.find('[name="system.conditionTrack.persistent"]').change(async (event) => {
      await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
globalThis.SWSE.ActorEngine.updateActor(actor, {'system.conditionTrack.persistent': event.target.checked});
    });
  }
}
