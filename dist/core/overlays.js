export function normalizedOverlay(overlay, width, height, zIndex = 0) {
    return { ...overlay, x: overlay.x * width, y: overlay.y * height, width: overlay.width * width, height: overlay.height * height, zIndex: overlay.zIndex ?? zIndex };
}
export class OverlayCompositor {
    canvas = document.createElement('canvas');
    resize(width, height) {
        if (this.canvas.width !== width)
            this.canvas.width = width;
        if (this.canvas.height !== height)
            this.canvas.height = height;
    }
    compose(source, overlays) {
        this.resize(source.width, source.height);
        const ctx = this.canvas.getContext('2d');
        if (!ctx || typeof ctx.drawImage !== 'function')
            return false;
        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(source, 0, 0);
        const ordered = overlays.map((overlay, index) => ({ overlay, index })).sort((a, b) => a.overlay.zIndex - b.overlay.zIndex || a.index - b.index);
        for (const { overlay } of ordered) {
            if (overlay.opacity === 0)
                continue;
            ctx.globalAlpha = Math.max(0, Math.min(1, overlay.opacity ?? 1));
            ctx.drawImage(overlay.source, overlay.x, overlay.y, overlay.width, overlay.height);
        }
        ctx.globalAlpha = 1;
        return true;
    }
}
//# sourceMappingURL=overlays.js.map