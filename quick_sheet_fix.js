/**
 * Quick Character Sheet Fix
 * Run this in the browser console (F12) as a temporary fix
 * while waiting for file updates to take effect
 */

// Fix for character sheets not being draggable
Hooks.on('renderActorSheet', (app, html, data) => {
  // Make sure the sheet can be dragged
  const header = html.find('.window-header')[0] || html[0]?.querySelector('.window-header');
  if (header && app.options.draggable) {
    app.element[0].classList.add('draggable');
  }
});

// Fix for tabs not working
Hooks.on('renderActorSheet', (app, html, data) => {
  html.find('.tabs .item').on('click', function(event) {
    event.preventDefault();
    const tab = $(this).data('tab');
    
    // Hide all tab contents
    html.find('.tab').removeClass('active');
    html.find('.tabs .item').removeClass('active');
    
    // Show selected tab
    html.find(`.tab[data-tab="${tab}"]`).addClass('active');
    $(this).addClass('active');
    
    // Save the active tab
    app._tabs[0].active = tab;
  });
});

console.log("SWSE | Quick sheet fixes applied! Refresh any open character sheets.");
