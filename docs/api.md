# Public API

[← Architecture](./architecture.md) · [Integration →](./integration.md)

SVS has three independent entrypoints. Import only what the host uses.

| Entrypoint | Purpose | Optional peer |
|---|---|---|
| `scanline-virtual-screen/core` | profiles, modes, overlays, compositor, CRT and renderer facade | none |
| `scanline-virtual-screen/terminal` | xterm buffer-to-canvas renderer and terminal helpers | `@xterm/xterm` |
| `scanline-virtual-screen/react` | controlled settings sections | `react` |

## `core`

### Profiles

- `ScreenProfile`, `TerminalSettings`, `CRTVisualSettings`, `RenderSettings`
- `ScreenMode` — `{ id, label?, width?, height? }`; only the host interprets dimensions.
- `defaultScreenProfile(modeId?)`
- `normalizeProfile(input, fallback?, availableModes?)`
- `profileToRenderSettings(profile)` and `profileFromRenderSettings(settings, modeId)`
- `profileToJSON(profile)`
- `profileFromLegacyPreset(preset, modes?)` and `legacyPresetFromProfile(profile)`

`normalizeProfile()` returns `null` for a payload that is neither the canonical nor supported legacy schema. It clamps supported numeric values, rejects invalid enum values, maps historical terminal colour profile aliases, and chooses a valid fallback mode.

### Rendering

```ts
const screen = new VirtualScreenRenderer(outputCanvas, true);
screen.render(sourceCanvas, renderSettings, overlays, sourceChanged);
screen.clearPersistence();
screen.dispose();
```

- `VirtualScreenRenderer` owns an `OverlayCompositor` and optional `CRTFilter`.
- `render()` accepts an `HTMLCanvasElement` source and ready `RenderSettings`.
- `sourceChanged` informs the CRT pipeline whether its source frame changed.
- `isValid()`, `restartBreathing()`, and `startChannelSwitch()` expose CRT lifecycle controls.

`CRTFilter`, `CRTSettings`, `DEFAULT_CRT_SETTINGS`, `COLOR_PROFILES`, and built-in preset exports are also available from `core`. Treat `VirtualScreenRenderer` and `ScreenProfile` as the normal integration surface; use `CRTFilter` directly only when the facade cannot meet a host requirement.

### Overlays

```ts
type ScreenOverlay = {
  id: string;
  source: CanvasImageSource;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  opacity?: number;
};
```

- `OverlayCompositor.compose(source, overlays)` returns whether Canvas 2D composition succeeded.
- `normalizedOverlay(overlay, virtualWidth, virtualHeight, zIndex?)` maps a normalized overlay into virtual pixels.

## `terminal`

`TerminalRenderer` binds an xterm `Terminal`, tracks dirty rows, and paints its source canvas. It is an optional source adapter, not part of the core render loop contract.

Exported helpers include `terminalDimensions`, `fontCellSize`, `canvasFont`, terminal colour helpers, selection types, and terminal-buffer search utilities. The terminal entrypoint is intended for hosts that already use xterm; it does not create or manage a shell, PTY, tab, or persistence layer.

## `react`

All React sections are controlled. They receive current host state and emit whole updated values; they do not access storage or create a renderer.

- `DisplaySettingsSection({ value, modes, onChange })`
- `TerminalSettingsSection({ value, fonts, onChange })`
- `CRTSettingsSection({ value, onChange })`
- `PresetSettingsSection({ value, names, disabled?, onNameChange, onLoad, onSave })`

Import `scanline-virtual-screen/react/styles.css` when the host wants the supplied base styles. The host may place sections in any layout and provide its own styling.
