import { CRTFilter, channelSwitchProgress, type CRTSettings } from './CRTFilter.js';
import { OverlayCompositor, type ScreenOverlay } from './overlays.js';

export class VirtualScreenRenderer {
  readonly compositor = new OverlayCompositor();
  private filter: CRTFilter | null = null;
  private channelSwitchStartedAt: number | null = null;

  constructor(readonly output: HTMLCanvasElement, crtEnabled = true) {
    if (crtEnabled) this.filter = new CRTFilter(output);
  }

  render(source: HTMLCanvasElement, settings: CRTSettings, overlays: readonly ScreenOverlay[] = [], sourceChanged = true): void {
    this.compositor.compose(source, overlays);
    if (this.filter?.isValid()) {
      this.filter.render(this.compositor.canvas, settings, sourceChanged);
      if (this.channelSwitchStartedAt !== null && performance.now() - this.channelSwitchStartedAt >= 420) this.channelSwitchStartedAt = null;
    }
    else {
      const ctx = this.output.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = settings.pixelSmoothing !== false;
      const now = performance.now();
      const startedAt = this.channelSwitchStartedAt;
      const roll = startedAt !== null && now - startedAt < 420 ? channelSwitchProgress(startedAt, now) : 0;
      if (startedAt !== null && now - startedAt >= 420) this.channelSwitchStartedAt = null;
      ctx.clearRect(0, 0, this.output.width, this.output.height);
      ctx.drawImage(this.compositor.canvas, 0, -roll * 1.18 * this.output.height, this.output.width, this.output.height);
    }
  }

  isValid(): boolean { return this.filter?.isValid() ?? true; }
  restartBreathing(): void { this.filter?.restartBreathing(); }
  clearPersistence(): void { this.filter?.clearPersistence(); }
  isChannelSwitchAnimating(): boolean { return this.channelSwitchStartedAt !== null; }
  startChannelSwitch(): void {
    this.channelSwitchStartedAt = performance.now();
    this.filter?.startChannelSwitch();
  }
  joinChannelSwitch(): void { this.filter?.joinChannelSwitch(); }
  dispose(): void { this.filter?.dispose(); this.filter = null; }
}
