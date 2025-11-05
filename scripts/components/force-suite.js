/**
 * Force Suite Management Component
 * This handles the drag-and-drop interface for managing Force Powers.
 * Think of it as a deck of cards where you choose your hand.
 */
export class ForceSuiteComponent {

  static render(actor) {
    const powers = actor.items.filter(i => i.type === 'forcepower');
    const knownPowers = powers.filter(p => !p.system.inSuite);
    const suitePowers = powers.filter(p => p.system.inSuite);
    const maxSuite = actor.system.forceSuite?.maxPowers || 6;

    return `
      <div class="force-suite-component">
        <div class="suite-container">
          <div class="known-powers">
            <h3>Known Powers</h3>
            <div class="power-list" data-zone="known">
              ${knownPowers.map(power => this.renderPowerCard(power, false)).join('')}
            </div>
          </div>

          <div class="suite-arrow">
            <i class="fas fa-exchange-alt"></i>
          </div>

          <div class="active-suite">
            <h3>Active Suite (${suitePowers.length}/${maxSuite})</h3>
            <div class="power-list suite-drop-zone" data-zone="suite">
              ${suitePowers.map(power => this.renderPowerCard(power, true)).join('')}
              ${suitePowers.length < maxSuite ? 
                `<div class="empty-slot">Drag power here</div>`.repeat(maxSuite - suitePowers.length) : 
                ''}
            </div>
          </div>
        </div>

        <div class="suite-info">
          <p><i class="fas fa-info-circle"></i> 
             Drag powers between columns to manage your Force Suite.
             Powers in the suite can be used at-will.</p>
        </div>
      </div>
    `;
  }

  static renderPowerCard(power, inSuite) {
    const lightSide = power.system.discipline === 'light-side';
    const darkSide = power.system.discipline === 'dark-side';

    return `
      <div class="power-card ${lightSide ? 'light-side' : ''} ${darkSide ? 'dark-side' : ''}"
           data-item-id="${power.id}"
           draggable="true">
        <img src="${power.img}" alt="${power.name}">
        <div class="power-name">${power.name}</div>
        <div class="power-actions">
          <button class="use-power" data-action="usePower" data-power-id="${power.id}">
            <i class="fas fa-hand-sparkles"></i>
          </button>
          ${inSuite ? 
            `<button class="remove-suite" data-action="removeFromSuite" data-power-id="${power.id}">
              <i class="fas fa-minus-circle"></i>
            </button>` : 
            `<button class="add-suite" data-action="addToSuite" data-power-id="${power.id}">
              <i class="fas fa-plus-circle"></i>
            </button>`}
        </div>
      </div>
    `;
  }

  static attachListeners(html, actor) {
    // Drag start
    html.find('.power-card').on('dragstart', (event) => {
      const powerId = event.currentTarget.dataset.itemId;
      event.originalEvent.dataTransfer.setData('powerId', powerId);
    });

    // Drop zones
    html.find('.suite-drop-zone').on('dragover', (event) => {
      event.preventDefault();
      event.currentTarget.classList.add('drag-hover');
    });

    html.find('.suite-drop-zone').on('dragleave', (event) => {
      event.currentTarget.classList.remove('drag-hover');
    });

    html.find('.suite-drop-zone').on('drop', async (event) => {
      event.preventDefault();
      event.currentTarget.classList.remove('drag-hover');

      const powerId = event.originalEvent.dataTransfer.getData('powerId');
      const power = actor.items.get(powerId);

      if (power) {
        const suitePowers = actor.items.filter(i => 
          i.type === 'forcepower' && i.system.inSuite
        );

        if (suitePowers.length >= actor.system.forceSuite.maxPowers) {
          ui.notifications.warn('Force Suite is full!');
          return;
        }

        await power.update({'system.inSuite': true});
      }
    });

    // Button actions
    html.find('[data-action="usePower"]').click(async (event) => {
      const powerId = event.currentTarget.dataset.powerId;
      const power = actor.items.get(powerId);
      if (power) {
        await SWSERoll.rollUseTheForce(actor, power);
      }
    });

    html.find('[data-action="addToSuite"]').click(async (event) => {
      const powerId = event.currentTarget.dataset.powerId;
      const power = actor.items.get(powerId);
      if (power) {
        await power.update({'system.inSuite': true});
      }
    });

    html.find('[data-action="removeFromSuite"]').click(async (event) => {
      const powerId = event.currentTarget.dataset.powerId;
      const power = actor.items.get(powerId);
      if (power) {
        await power.update({'system.inSuite': false});
      }
    });
  }
}
