  });
}

// Auto-setup hooks on module load
if (typeof Hooks !== 'undefined') {
  Hooks.once('ready', setupMentorDialogueHooks);
}
