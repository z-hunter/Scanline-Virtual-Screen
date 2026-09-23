# Scanline Virtual Screen

Scanline Virtual Screen (SVS) is a reusable browser-side display pipeline for a fixed virtual canvas. It composites overlays in virtual pixels and presents the frame through a CRT WebGL renderer or a Canvas 2D pass-through path.

It is the shared display module used by Scanline Term and Quest. SVS does not know about Tauri, ConPTY, tabs, storage, game state, or any particular UI shell.

## License

SVS is source-available under the [PolyForm Noncommercial License 1.0.0](./LICENSE). You may use, modify, and redistribute it for noncommercial purposes. Commercial use requires a separate written license from the copyright holders. This is not an OSI-approved open-source license.

Historical releases retain the license terms under which they were published. Do not assume that a later license change alters rights granted by an earlier release.

## Install

Until SVS is published to npm, install a tagged GitHub release over HTTPS:

```sh
npm install git+https://github.com/z-hunter/Scanline-Virtual-Screen.git#v3.0.0
```

SVS exposes independent entrypoints:

```ts
import { VirtualScreenRenderer, defaultScreenProfile } from 'scanline-virtual-screen/core';
import { TerminalRenderer } from 'scanline-virtual-screen/terminal'; // optional xterm adapter
import { DisplaySettingsSection } from 'scanline-virtual-screen/react'; // optional React UI
import 'scanline-virtual-screen/react/styles.css';
```

`core` does not import xterm or React. `terminal` declares xterm as an optional peer dependency. `react` declares React as an optional peer dependency.

## Quick start

The host owns its `HTMLCanvasElement` source, output canvas, mode catalogue, persistence, and animation loop.

```ts
import {
  VirtualScreenRenderer,
  defaultScreenProfile,
  profileToRenderSettings,
  type ScreenMode,
} from 'scanline-virtual-screen/core';

const modes: ScreenMode[] = [{ id: 'game-320x240', width: 320, height: 240 }];
const profile = defaultScreenProfile(modes[0].id);
const renderer = new VirtualScreenRenderer(outputCanvas);

renderer.render(sourceCanvas, profileToRenderSettings(profile), [], true);

// Call when the host closes the screen or replaces the WebGL context.
renderer.dispose();
```

Overlays are runtime-only `CanvasImageSource` objects measured in virtual pixels. For normalized host state, convert at the boundary with `normalizedOverlay()`.

## Documentation

- [Architecture](./docs/architecture.md)
- [Public API](./docs/api.md)
- [Host integration](./docs/integration.md)
- [Development and releases](./docs/development.md)
- [Contributing](./CONTRIBUTING.md)

## Validation

```sh
npm test
npm run build
npm run lint
```

The host integration must additionally exercise its own resize, render-loop, persistence, and lifecycle paths.
