# Contributing

SVS accepts issues and pull requests. Before opening a pull request, run:

```sh
npm test
npm run build
npm run lint
```

Keep the public API intentionally small. Do not add host state, storage, tabs, Tauri, game scenes, or application-specific UI to SVS.

## Public API rules

- `core` must not import React or xterm.
- `react` must stay controlled: the host owns profile state and persistence.
- `terminal` is optional and owns only the xterm-to-canvas adapter lifecycle.
- `ScreenProfile` stores a mode ID, never host-specific dimensions.
- `ScreenOverlay` is runtime-only and uses virtual-pixel coordinates.

## Contributor licensing

By submitting a contribution, you grant the copyright holders the right to distribute that contribution under the repository license and under separately negotiated commercial licenses. Do not submit code unless you have the right to grant those permissions.
