# Droid Chassis Builder Hosting Notes

The Droid Chassis Builder now exposes a Garage-style view model with explicit context profiles.

Supported context profile identifiers:

- `chargenDraft` - progression/character creation draft host.
- `buildNew` - Garage-hosted first-time droid build.
- `modifyExisting` - Garage-hosted modification of an existing owned droid.
- `storeQuote` - Store-side quote/purchase approval host.
- `followerDraft` - follower/minion droid construction host.
- `gmDraft` - future GM command tool host.

Current production host:

- The progression `droid-builder` step passes `chargenDraft` unless a shell/session context provides a different `droidContext.contextMode` or `droidContext.builderMode`.

Reuse contract:

- Reuse `DroidBuilderViewModelAdapter.build(...)` instead of building a parallel droid UI model.
- Continue to source droid construction data from the existing droid authorities.
- Continue to route install/remove through the existing DroidBuilderStep state mutation logic until the Garage host owns the same mutation contract.
- Store/follower/GM hosts should set the context mode and provide the same droid state shape rather than forking the builder.

Do not create another droid builder. Host this shared Garage-style chassis workbench wherever first-time droid construction is needed.
