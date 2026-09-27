import { CRTFilter, channelSwitchProgress } from './CRTFilter.js';
import { OverlayCompositor } from './overlays.js';
export class VirtualScreenRenderer {
    output;
    compositor = new OverlayCompositor();
    filter = null;
    channelSwitchStartedAt = null;
    constructor(output, crtEnabled = true) {
        this.output = output;
        if (crtEnabled)
            this.filter = new CRTFilter(output);
    }
    render(source, settings, overlays = [], sourceChanged = true) {
        this.compositor.compose(source, overlays);
        if (this.filter?.isValid())
            this.filter.render(this.compositor.canvas, settings, sourceChanged);
        else {
            const ctx = this.output.getContext('2d');
            if (!ctx)
                return;
            ctx.imageSmoothingEnabled = settings.pixelSmoothing !== false;
            const now = performance.now();
            const startedAt = this.channelSwitchStartedAt;
            const roll = startedAt !== null && now - startedAt < 420 ? channelSwitchProgress(startedAt, now) : 0;
            if (startedAt !== null && now - startedAt >= 420)
                this.channelSwitchStartedAt = null;
            ctx.clearRect(0, 0, this.output.width, this.output.height);
            ctx.drawImage(this.compositor.canvas, 0, -roll * 1.18 * this.output.height, this.output.width, this.output.height);
        }
    }
    isValid() { return this.filter?.isValid() ?? true; }
    restartBreathing() { this.filter?.restartBreathing(); }
    clearPersistence() { this.filter?.clearPersistence(); }
    isChannelSwitchAnimating() { return this.channelSwitchStartedAt !== null; }
    startChannelSwitch() {
        if (this.filter)
            this.filter.startChannelSwitch();
        else
            this.channelSwitchStartedAt = performance.now();
    }
    dispose() { this.filter?.dispose(); this.filter = null; }
}
//# sourceMappingURL=VirtualScreenRenderer.js.map