# 0056. An effect carries its own icon, and a popover the driver opens does not animate

- **Date:** 2026-08-16
- **Status:** accepted

Every effect plugin declares an `icon` beside its `id` and `label`, imported per icon in its own file. The registry is therefore the whole answer to what the picker shows, and a new plugin appears in the picker by existing (0016). The alternative — a map from effect ids to pictures in the UI — is the second declaration 0055 forbids: an effect is not an action, so it never belongs in `ACTION_ICONS`.

A popover the browser smoke opens is not free. Measured against a stashed baseline: the three picker gestures the rack's own scenario would have made cost the gate **1.68s** before `reload()`, because pre-reload browser work stalls the reloaded audio clock (plan §3); moved after the reload, the same gestures still cost **~450ms**, nearly all of it Playwright waiting for the popup's 100ms enter and exit animations to settle before it may click. Rendering the picker's popup with `duration-0` brings the whole browser proof to **+131ms**, inside 0012's budget. So: a popup whose entries the driver clicks opens instantly, and a rack scenario that only needs instances to exist seeds them with `effect.add` rather than through the picker.
