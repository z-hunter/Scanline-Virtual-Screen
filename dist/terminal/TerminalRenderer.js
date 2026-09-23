import { colorProfile, profileColor, remapLegacyRgb } from '../core/color-profiles';
const MIN_SCROLL_OVERLAP = 4;
const MIN_SCROLL_TEXT_ROWS = 3;
const MAX_PRESENTATION_MISMATCH_ROWS = 2;
const SMOOTH_SCROLL_PIXELS_PER_SECOND = 240;
const FAST_SCROLL_THRESHOLD_ROWS = 6;
// Enable temporarily when investigating a missed smooth-scroll candidate.
export const SMOOTH_SCROLL_DIAGNOSTICS = false;
function rowHasText(signature) { return signature.includes(':') ? /:[^,\s;]/.test(signature) : /\S/.test(signature); }
export function inspectVerticalScroll(previous, next, previousContent = previous, nextContent = next) {
    if (!previous.length || previous.length !== next.length || previousContent.length !== previous.length || nextContent.length !== next.length)
        return { candidate: null, maxExactOverlap: 0, maxExactDelta: null, rejection: 'different-row-count' };
    // ponytail: O(rows²) shift scan keeps the MVP exact; optimize only if profiling shows large grids need it.
    const candidates = [];
    let maxExactOverlap = 0;
    let maxExactDelta = null;
    let ambiguousRuns = false;
    let insufficientText = false;
    let unchangedIncoming = false;
    const maxDelta = previous.length - MIN_SCROLL_OVERLAP;
    for (let delta = -maxDelta; delta <= maxDelta; delta += 1) {
        if (!delta)
            continue;
        let runStart = -1;
        let exactStart = -1;
        let presentationMismatchRows = [];
        const runs = [];
        const finish = (runEnd) => {
            if (runStart >= 0 && presentationMismatchRows.length <= MAX_PRESENTATION_MISMATCH_ROWS)
                runs.push({ start: runStart, end: runEnd, presentationMismatchRows });
        };
        const finishExact = (runEnd) => {
            if (exactStart >= 0 && runEnd - exactStart > maxExactOverlap) {
                maxExactOverlap = runEnd - exactStart;
                maxExactDelta = delta;
            }
        };
        for (let row = 0; row <= next.length; row += 1) {
            const inRange = row < next.length && row + delta >= 0 && row + delta < previous.length;
            const exact = inRange && next[row] === previous[row + delta];
            const presentationOnly = inRange && !exact && nextContent[row] === previousContent[row + delta];
            if (exact) {
                if (exactStart < 0)
                    exactStart = row;
            }
            else {
                finishExact(row);
                exactStart = -1;
            }
            if (exact || presentationOnly) {
                if (runStart < 0) {
                    runStart = row;
                    presentationMismatchRows = [];
                }
                if (presentationOnly)
                    presentationMismatchRows.push(row);
            }
            else {
                finish(row);
                runStart = -1;
                presentationMismatchRows = [];
            }
        }
        finishExact(next.length);
        const longest = Math.max(...runs.map((run) => run.end - run.start), 0);
        const bestRuns = runs.filter((run) => run.end - run.start === longest);
        if (longest < MIN_SCROLL_OVERLAP)
            continue;
        if (bestRuns.length !== 1) {
            ambiguousRuns = true;
            continue;
        }
        const run = bestRuns[0];
        const overlap = next.slice(run.start, run.end);
        const textRows = overlap.filter(rowHasText);
        if (textRows.length < MIN_SCROLL_TEXT_ROWS) {
            insufficientText = true;
            continue;
        }
        const topRow = Math.min(run.start, run.start + delta);
        const bottomRow = Math.max(run.end, run.end + delta);
        let incomingChanged = false;
        const incomingStart = delta > 0 ? run.end : run.start + delta;
        const incomingEnd = delta > 0 ? run.end + delta : run.start;
        for (let row = incomingStart; row < incomingEnd; row += 1) {
            if (next[row] !== previous[row]) {
                incomingChanged = true;
                break;
            }
        }
        if (incomingChanged)
            candidates.push({ deltaRows: delta, topRow, bottomRow, overlapRows: longest, matchTopRow: run.start, matchBottomRow: run.end, presentationMismatchRows: run.presentationMismatchRows });
        else
            unchangedIncoming = true;
    }
    candidates.sort((a, b) => b.overlapRows - a.overlapRows || Math.abs(a.deltaRows) - Math.abs(b.deltaRows));
    const best = candidates[0];
    const candidate = best && (!candidates[1] || best.overlapRows >= candidates[1].overlapRows + 2) ? best : null;
    const rejection = candidate ? null : candidates.length > 1 ? 'ambiguous-candidates' : ambiguousRuns ? 'ambiguous-run' : insufficientText ? 'fewer-than-three-text-rows' : unchangedIncoming ? 'unchanged-incoming-band' : maxExactOverlap < MIN_SCROLL_OVERLAP ? 'no-four-row-exact-overlap' : 'no-eligible-candidate';
    return { candidate, maxExactOverlap, maxExactDelta, rejection };
}
export function detectVerticalScroll(previous, next, previousContent = previous, nextContent = next) { return inspectVerticalScroll(previous, next, previousContent, nextContent).candidate; }
const fontMetricsCache = new Map();
const boxDrawingProfileCache = new Map();
const loadedFontFaces = new Map();
const fontLoadPromises = new Map();
let measurementContext;
export function terminalPadding(width, height) { return Math.max(2, Math.floor(Math.min(width, height) * 0.01)); }
export function canvasFont(fontSize, family, fallbackFont) {
    const cleanFamily = `"${family.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
    const cleanFallback = fallbackFont && fallbackFont.trim() && fallbackFont.trim() !== family
        ? `"${fallbackFont.trim().replaceAll('\\', '\\\\').replaceAll('"', '\\"')}", `
        : '';
    return `${fontSize}px ${cleanFamily}, ${cleanFallback}Consolas, "Courier New", monospace`;
}
const CELL_ATTRIBUTES = ['isBold', 'isItalic', 'isUnderline', 'isStrikethrough', 'isOverline'];
function cellAttribute(cell, attribute) {
    const value = cell[attribute];
    return typeof value === 'function' && value.call(cell) !== 0;
}
export function loadCanvasFont(family, bytes) {
    let loading = loadedFontFaces.get(family);
    if (!loading) {
        loading = new FontFace(family, new Uint8Array(bytes)).load().then((face) => {
            document.fonts.add(face);
            for (const key of fontMetricsCache.keys()) {
                const parts = key.split(':');
                if (parts[1] === family || parts[2] === family || key.endsWith(`:${family}`))
                    fontMetricsCache.delete(key);
            }
            boxDrawingProfileCache.clear();
        });
        loadedFontFaces.set(family, loading);
        void loading.catch(() => loadedFontFaces.delete(family));
    }
    return loading;
}
export function canvasFontLoad(family, load) {
    let loading = fontLoadPromises.get(family) ?? loadedFontFaces.get(family);
    if (!loading && load) {
        loading = load().then((bytes) => bytes ? loadCanvasFont(family, bytes) : undefined);
        fontLoadPromises.set(family, loading);
        void loading.catch(() => { if (fontLoadPromises.get(family) === loading)
            fontLoadPromises.delete(family); });
    }
    return loading;
}
export function fontCellSize(fontSize, family, context, widthAdjustment = 0, heightAdjustment = 0, fallbackFont) {
    const key = `${fontSize}:${family}:${fallbackFont ?? ''}`;
    const cached = fontMetricsCache.get(key);
    if (cached)
        return { width: Math.max(1, cached.width + widthAdjustment), height: Math.max(1, cached.height + heightAdjustment) };
    context ??= (measurementContext ??= document.createElement('canvas').getContext('2d') ?? undefined);
    if (!context)
        return { width: Math.max(1, Math.ceil(fontSize * 0.6) + widthAdjustment), height: Math.max(1, Math.ceil(fontSize * 1.2) + heightAdjustment) };
    context.font = canvasFont(fontSize, family, fallbackFont);
    const metrics = context.measureText('M');
    const size = { width: Math.ceil(metrics.width), height: Math.ceil((metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || fontSize) + (metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent || Math.ceil(fontSize * 0.2))) };
    fontMetricsCache.set(key, size);
    return { width: Math.max(1, size.width + widthAdjustment), height: Math.max(1, size.height + heightAdjustment) };
}
export function terminalDimensions(width, height, fontSize, family, widthAdjustment = 0, heightAdjustment = 0, fallbackFont) {
    const padding = terminalPadding(width, height);
    const cell = fontCellSize(fontSize, family, undefined, widthAdjustment, heightAdjustment, fallbackFont);
    return { cols: Math.max(20, Math.min(300, Math.floor((width - padding * 2) / cell.width))), rows: Math.max(8, Math.min(150, Math.floor((height - padding * 2) / cell.height))) };
}
export function terminalContentOffset(width, height, cols, rows, cell) {
    return { x: Math.floor((width - cols * cell.width) / 2), y: Math.floor((height - rows * cell.height) / 2) };
}
function cellColor(cell, foreground, profile) {
    const value = foreground ? cell.getFgColor() : cell.getBgColor();
    if (foreground ? cell.isFgRGB() : cell.isBgRGB())
        return remapLegacyRgb(profile, `#${value.toString(16).padStart(6, '0')}`);
    if (foreground ? cell.isFgPalette() : cell.isBgPalette())
        return profileColor(profile, value);
    return foreground ? profile.foreground : profile.background;
}
function continuousVerticalProfile(ctx, chars, x, cell) {
    if (chars !== '│' && chars !== '┃' && chars !== '║' && chars !== '▎')
        return null;
    const width = Math.max(1, Math.ceil(cell.width));
    const height = Math.max(1, Math.ceil(cell.height));
    const phase = x - Math.floor(x);
    const key = `${ctx.font}:${chars}:${width}:${height}:${phase.toFixed(3)}`;
    if (boxDrawingProfileCache.has(key))
        return boxDrawingProfileCache.get(key) ?? null;
    try {
        const sample = document.createElement('canvas');
        sample.width = width;
        sample.height = height;
        const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
        if (!sampleCtx) {
            boxDrawingProfileCache.set(key, null);
            return null;
        }
        sampleCtx.font = ctx.font;
        sampleCtx.textAlign = 'left';
        sampleCtx.textBaseline = 'middle';
        sampleCtx.fillStyle = '#fff';
        sampleCtx.fillText(chars, phase, height / 2);
        // ponytail: one center scanline; sample several rows only if a font proves non-uniform stems.
        const pixels = sampleCtx.getImageData(0, Math.floor(height / 2), width, 1).data;
        const runs = [];
        for (let offset = 0; offset < width; offset += 1) {
            const alpha = pixels[offset * 4 + 3] / 255;
            if (!alpha)
                continue;
            const previous = runs[runs.length - 1];
            if (previous && previous.offset + previous.width === offset && previous.alpha === alpha)
                previous.width += 1;
            else
                runs.push({ offset, width: 1, alpha });
        }
        boxDrawingProfileCache.set(key, runs.length ? runs : null);
        return runs.length ? runs : null;
    }
    catch {
        boxDrawingProfileCache.set(key, null);
        return null;
    }
}
function drawContinuousVertical(ctx, chars, x, top, cell) {
    const profile = continuousVerticalProfile(ctx, chars, x, cell);
    if (!profile)
        return false;
    const left = Math.floor(x);
    const height = Math.max(1, Math.ceil(cell.height));
    for (const run of profile) {
        ctx.globalAlpha *= run.alpha;
        ctx.fillRect(left + run.offset, top, run.width, height);
        ctx.globalAlpha /= run.alpha;
    }
    return true;
}
function rgb(value) {
    return [Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16)];
}
function relativeLuminance(value) {
    return rgb(value).reduce((total, channel) => {
        const normalized = channel / 255;
        return total + (normalized <= .03928 ? normalized / 12.92 : Math.pow((normalized + .055) / 1.055, 2.4));
    }, 0);
}
export function accessibleTextColor(foreground, background) {
    const foregroundLuma = relativeLuminance(foreground);
    const backgroundLuma = relativeLuminance(background);
    const contrast = (Math.max(foregroundLuma, backgroundLuma) + .05) / (Math.min(foregroundLuma, backgroundLuma) + .05);
    if (contrast >= 4.5)
        return foreground;
    const blackContrast = (backgroundLuma + .05) / .05;
    const whiteContrast = 1.05 / (backgroundLuma + .05);
    return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
}
function blendColor(background, foreground, alpha) {
    const base = rgb(background);
    const overlay = rgb(foreground);
    return `#${base.map((channel, index) => Math.round(channel * (1 - alpha) + overlay[index] * alpha).toString(16).padStart(2, '0')).join('')}`;
}
function brightenColor(color, amount) {
    if (amount <= 0 || !/^#[0-9a-f]{6}$/i.test(color))
        return color;
    return `#${rgb(color).map((channel) => Math.min(255, Math.round(channel * (1 + amount))).toString(16).padStart(2, '0')).join('')}`;
}
export function applyTabColorMode(background, colorMode = 'color', backgroundDesaturation = 0.5) {
    if (colorMode === 'color')
        return background;
    const [red, green, blue] = rgb(background).map((channel) => channel / 255);
    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const tint = { bw: [1, 1, 1], green: [.45, 1, .62], 'green-p39': [.25, 1, .15], amber: [1.1, .68, .2], blue: [.42, .72, 1] }[colorMode] ?? [1, 1, 1];
    const desaturation = Math.min(1, Math.max(0, backgroundDesaturation));
    const channels = tint.map((channel) => luma * channel * (1 - desaturation) + luma * desaturation).map((channel) => Math.round(Math.min(1, channel) * 255));
    return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
export function terminalAverageColor(terminal, profile, colorMode = 'color', backgroundDesaturation = 0.5) {
    const buffer = terminal.buffer.active;
    const cell = buffer.getNullCell();
    const total = [0, 0, 0];
    let count = 0;
    for (let row = 0; row < terminal.rows; row += 1) {
        const line = buffer.getLine(buffer.viewportY + row);
        if (!line)
            continue;
        for (let column = 0; column < terminal.cols; column += 1) {
            const current = line.getCell(column, cell);
            if (!current)
                continue;
            let bg = rgb(cellColor(current, false, profile));
            let fg = rgb(cellColor(current, true, profile));
            if (current.isInverse && current.isInverse())
                [bg, fg] = [fg, bg];
            const ink = current.getChars() ? .22 : 0;
            for (let channel = 0; channel < 3; channel += 1)
                total[channel] += bg[channel] * (1 - ink) + fg[channel] * ink;
            count += 1;
        }
    }
    const average = total.map((channel) => Math.round(channel / Math.max(1, count)));
    const background = applyTabColorMode(`#${average.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`, colorMode, backgroundDesaturation);
    const [red, green, blue] = rgb(background);
    const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
    return { background, foreground: luminance > 145 ? '#101a14' : '#d7f5df' };
}
function luma([red, green, blue]) {
    return (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
}
// This estimates the full source raster without a canvas readback. A glyph covers
// only a small fraction of its cell; treating it as the tab-color 22% coverage
// makes a single bright character disproportionately drive HV breathing.
export function terminalAverageLuma(terminal, profile, frame) {
    const baseLuma = luma(rgb(profile.background));
    const totalArea = Math.max(1, frame ? frame.width * frame.height : terminal.cols * terminal.rows);
    let total = baseLuma * totalArea;
    const buffer = terminal.buffer.active;
    const cell = buffer.getNullCell();
    for (let row = 0; row < terminal.rows; row += 1) {
        const line = buffer.getLine(buffer.viewportY + row);
        if (!line)
            continue;
        for (let column = 0; column < terminal.cols; column += 1) {
            const current = line.getCell(column, cell);
            if (!current || current.getWidth() === 0)
                continue;
            let bg = rgb(cellColor(current, false, profile));
            let fg = rgb(cellColor(current, true, profile));
            if (current.isInverse && current.isInverse())
                [bg, fg] = [fg, bg];
            const x = frame ? frame.padding + column * frame.cellWidth : column;
            const y = frame ? frame.padding + row * frame.cellHeight : row;
            const width = frame ? frame.cellWidth * current.getWidth() : current.getWidth();
            const height = frame ? frame.cellHeight : 1;
            const area = frame
                ? Math.max(0, Math.min(frame.width, x + width) - Math.max(0, x)) * Math.max(0, Math.min(frame.height, y + height) - Math.max(0, y))
                : width * height;
            if (area === 0)
                continue;
            const backgroundLuma = luma(bg);
            total += (backgroundLuma - baseLuma) * area;
            if (current.getChars() && !current.isInvisible?.())
                total += (luma(fg) - backgroundLuma) * area * 0.08 * (current.isDim?.() ? 0.6 : 1);
        }
    }
    return Math.min(1, Math.max(0, total / totalArea));
}
export class TerminalRenderer {
    sourceCanvas = document.createElement('canvas');
    compositedCanvas = document.createElement('canvas');
    scrollFromCanvas = document.createElement('canvas');
    scrollTargetCanvas = document.createElement('canvas');
    scrollFrameCanvas = document.createElement('canvas');
    terminal = null;
    selection = null;
    searchMatches = [];
    searchMatchesByLine = new Map();
    activeSearchMatch = -1;
    dirty = true;
    fullDirty = true;
    focused = true;
    rowSignatures = [];
    rowContentSignatures = [];
    rowTexts = [];
    scrollDiagnostics = [];
    snapshotCols = -1;
    snapshotRows = -1;
    snapshotViewportY = -1;
    snapshotBaseY = -1;
    snapshotBuffer = null;
    terminalOutputDirty = false;
    smoothScrollingEnabled = false;
    cursorRow = null;
    disposables = [];
    sourceLuma = 0.12;
    hasMeasuredSourceLuma = false;
    lastCursorPhase = -1;
    lastCursorMoveTime = 0;
    lastCursorX = -1;
    lastCursorY = -1;
    cursorMoved = false;
    scrollTransition = null;
    scrollTargetReady = false;
    scrollStarted = false;
    scrollCellHeight = 16;
    scrollContentTop = 0;
    constructor() { }
    bindTerminal(terminal, onScroll) {
        this.cancelScroll();
        this.disposables.forEach((item) => item.dispose());
        this.disposables = [];
        this.terminal = terminal;
        this.rowSignatures = [];
        this.rowContentSignatures = [];
        this.rowTexts = [];
        this.snapshotCols = -1;
        this.snapshotRows = -1;
        this.snapshotViewportY = -1;
        this.snapshotBaseY = -1;
        this.snapshotBuffer = null;
        this.terminalOutputDirty = false;
        this.cursorRow = null;
        this.hasMeasuredSourceLuma = false;
        this.lastCursorPhase = -1;
        this.lastCursorMoveTime = 0;
        this.lastCursorX = -1;
        this.lastCursorY = -1;
        this.cursorMoved = false;
        this.markDirty();
        if (terminal)
            this.disposables.push(terminal.onCursorMove(() => this.markCursorMoved()), terminal.onWriteParsed(() => this.markTerminalDirty()), terminal.onScroll((viewportY) => { this.markDirty(); onScroll?.(viewportY); }));
    }
    resizeSource(resolution, output) {
        const width = resolution.id.startsWith('physical') ? output.width || 1 : resolution.width || 1;
        const height = resolution.id.startsWith('physical') ? output.height || 1 : resolution.height || 1;
        this.cancelScroll();
        if (this.sourceCanvas.width === width && this.sourceCanvas.height === height) {
            this.markDirty();
            return false;
        }
        this.sourceCanvas.width = width;
        this.sourceCanvas.height = height;
        this.compositedCanvas.width = width;
        this.compositedCanvas.height = height;
        this.scrollFromCanvas.width = width;
        this.scrollFromCanvas.height = height;
        this.scrollTargetCanvas.width = width;
        this.scrollTargetCanvas.height = height;
        this.scrollFrameCanvas.width = width;
        this.scrollFrameCanvas.height = height;
        this.markDirty();
        return true;
    }
    setSmoothScrollingEnabled(enabled) {
        this.smoothScrollingEnabled = enabled;
        if (!enabled && this.scrollTransition)
            this.cancelScroll();
    }
    exportSmoothScrollDiagnostics() { return JSON.stringify({ version: 1, entries: this.scrollDiagnostics.map((entry) => JSON.parse(entry)) }, null, 2); }
    recordSmoothScrollDiagnostic(entry) {
        if (!SMOOTH_SCROLL_DIAGNOSTICS)
            return;
        this.scrollDiagnostics.push(JSON.stringify({ at: new Date().toISOString(), ...entry }));
        if (this.scrollDiagnostics.length > 60)
            this.scrollDiagnostics.shift();
    }
    beginScroll(fromViewportY, toViewportY) {
        if (!this.terminal || fromViewportY === toViewportY || this.terminal.buffer.active !== this.terminal.buffer.normal)
            return false;
        const started = this.startScroll(toViewportY - fromViewportY, 0, this.terminal.rows, 'normal', Math.abs(toViewportY - fromViewportY) > FAST_SCROLL_THRESHOLD_ROWS, fromViewportY, toViewportY);
        if (started && this.scrollTransition)
            this.scrollTransition.expectedViewportY = toViewportY;
        return started;
    }
    scrollDuration(distance, fast) {
        const pixels = Math.max(1, distance * this.lineHeight());
        return fast ? Math.min(0.24, Math.max(0.1, 0.1 + distance * 0.012)) : Math.max(0.1, pixels / SMOOTH_SCROLL_PIXELS_PER_SECOND);
    }
    scrollProgress(transition) {
        return Math.min(1, Math.max(0, (performance.now() / 1000 - transition.startedAt) / Math.max(0.001, transition.duration)));
    }
    scrollPosition(transition) {
        const from = transition.fromPosition ?? 0;
        const to = transition.toPosition ?? from + transition.deltaRows;
        const progress = this.scrollProgress(transition);
        const eased = transition.fast ? 1 - Math.pow(1 - progress, 3) : progress;
        return from + (to - from) * eased;
    }
    retargetScroll(transition, targetPosition, topRow, bottomRow) {
        const now = performance.now() / 1000;
        const visualPosition = this.scrollPosition(transition);
        const fromPosition = transition.fromPosition ?? 0;
        const distance = Math.abs(targetPosition - fromPosition);
        const fast = Boolean(transition.fast) || Math.abs(targetPosition - visualPosition) > FAST_SCROLL_THRESHOLD_ROWS;
        transition.deltaRows = targetPosition - fromPosition;
        transition.topRow = topRow;
        transition.bottomRow = bottomRow;
        transition.toPosition = targetPosition;
        transition.distance = distance;
        transition.fast = fast;
        transition.duration = this.scrollDuration(distance, fast);
        const fraction = distance === 0 ? 1 : Math.min(1, Math.max(0, (visualPosition - fromPosition) / (targetPosition - fromPosition)));
        const progress = fast ? 1 - Math.cbrt(1 - fraction) : fraction;
        transition.startedAt = now - progress * transition.duration;
        this.scrollTargetReady = false;
    }
    canRetargetScroll(transition, kind, targetPosition, topRow, bottomRow) {
        if (transition.kind !== kind || transition.topRow !== topRow || transition.bottomRow !== bottomRow)
            return false;
        const from = transition.fromPosition ?? 0;
        const previousTarget = transition.toPosition ?? from + transition.deltaRows;
        const direction = Math.sign(previousTarget - from);
        const nextDirection = Math.sign(targetPosition - from);
        return direction !== 0 && nextDirection === direction && (direction > 0 ? targetPosition >= previousTarget : targetPosition <= previousTarget);
    }
    startScroll(deltaRows, topRow, bottomRow, kind, fast = false, fromPosition, toPosition) {
        if (!this.terminal || !deltaRows || bottomRow <= topRow)
            return false;
        const existing = this.scrollTransition;
        const sameKind = existing?.kind === kind;
        const initialPosition = sameKind && existing ? this.scrollPosition(existing) : (fromPosition ?? 0);
        const targetPosition = toPosition ?? (sameKind && existing ? (existing.toPosition ?? initialPosition) + deltaRows : initialPosition + deltaRows);
        let capturedVisual = false;
        if (existing && this.canRetargetScroll(existing, kind, targetPosition, topRow, bottomRow)) {
            this.retargetScroll(existing, targetPosition, topRow, bottomRow);
            return true;
        }
        if (existing) {
            const from = this.scrollFromCanvas.getContext('2d');
            if (!from || typeof from.drawImage !== 'function')
                return false;
            from.drawImage(this.scrollFrameCanvas, 0, 0);
            capturedVisual = true;
            this.cancelScroll();
        }
        const from = this.scrollFromCanvas.getContext('2d');
        if (!from || typeof from.drawImage !== 'function')
            return false;
        const distance = Math.abs(targetPosition - initialPosition);
        const accelerated = fast || distance > FAST_SCROLL_THRESHOLD_ROWS;
        if (!capturedVisual) {
            from.drawImage(this.sourceCanvas, 0, 0);
            const frame = this.scrollFrameCanvas.getContext('2d');
            if (frame && typeof frame.drawImage === 'function')
                frame.drawImage(this.sourceCanvas, 0, 0);
        }
        this.scrollTransition = { deltaRows: targetPosition - initialPosition, topRow, bottomRow, startedAt: performance.now() / 1000, duration: this.scrollDuration(distance, accelerated), distance, kind, fromPosition: initialPosition, toPosition: targetPosition, fast: accelerated };
        this.scrollTargetReady = false;
        this.scrollStarted = true;
        return true;
    }
    cancelScroll() {
        if (this.scrollTransition && this.scrollTargetReady) {
            const output = this.compositedCanvas.getContext('2d');
            if (output && typeof output.drawImage === 'function') {
                const top = this.scrollContentTop + this.scrollTransition.topRow * this.scrollCellHeight;
                const bottom = this.scrollContentTop + this.scrollTransition.bottomRow * this.scrollCellHeight;
                output.save();
                output.beginPath();
                output.rect(0, top, this.compositedCanvas.width, bottom - top);
                output.clip();
                output.clearRect(0, top, this.compositedCanvas.width, bottom - top);
                output.drawImage(this.scrollTargetCanvas, 0, 0);
                output.restore();
            }
        }
        this.scrollTransition = null;
        this.scrollTargetReady = false;
        this.scrollStarted = false;
    }
    consumeScrollStart() { const started = this.scrollStarted; this.scrollStarted = false; return started; }
    get isScrollAnimating() { return this.scrollTransition !== null; }
    sourcePointAt(clientX, clientY, output, settings) {
        const rect = output.getBoundingClientRect();
        if (!rect.width || !rect.height)
            return null;
        let u = (clientX - rect.left) / rect.width;
        let v = (clientY - rect.top) / rect.height;
        if (settings.crtEmulation) {
            if ((settings.bezelThickness ?? 0) > 0) {
                const insetX = settings.bezelThickness / (output.width || rect.width);
                const insetY = settings.bezelThickness / (output.height || rect.height);
                u = (u - insetX) / Math.max(0.0001, 1 - 2 * insetX);
                v = (v - insetY) / Math.max(0.0001, 1 - 2 * insetY);
            }
            if (settings.curvature > 0) {
                let x = (u - .5) * 2 * (1 + settings.curvature * .1);
                let y = (v - .5) * 2 * (1 + settings.curvature * .1);
                x *= 1 + Math.pow(Math.abs(y) / 5, 2) * settings.curvature * 5;
                y *= 1 + Math.pow(Math.abs(x) / 4, 2) * settings.curvature * 5;
                u = x / 2 + .5;
                v = y / 2 + .5;
            }
        }
        return { x: u * this.sourceCanvas.width, y: v * this.sourceCanvas.height };
    }
    setFocused(focused) {
        if (this.focused === focused)
            return;
        this.focused = focused;
        if (focused)
            this.lastCursorMoveTime = performance.now() / 1000;
        this.markDirty();
    }
    markDirty() { this.dirty = true; this.fullDirty = true; }
    markTerminalDirty() { this.dirty = true; this.terminalOutputDirty = true; }
    markCursorMoved() { this.cursorMoved = true; this.dirty = true; }
    isCursorBlinkActive() { return this.focused; }
    getCursorBlinkPhase(time) {
        if (!this.isCursorBlinkActive())
            return 0;
        const idleTime = Math.max(0, time - this.lastCursorMoveTime);
        if (idleTime < 0.5)
            return 0;
        return Math.floor(idleTime * 2);
    }
    isCursorVisibleAt(time, buffer, isCursorHidden) {
        if (buffer.viewportY !== buffer.baseY || isCursorHidden)
            return false;
        if (buffer.cursorX < 0 || buffer.cursorY < 0)
            return false;
        return this.getCursorBlinkPhase(time) % 2 === 0;
    }
    get averageLuma() { return this.sourceLuma; }
    get hasMeasuredLuma() { return this.hasMeasuredSourceLuma; }
    setSelection(selection) { if (selection || this.selection)
        this.cancelScroll(); this.selection = selection; this.markDirty(); }
    setSearchMatches(matches, activeIndex = -1) {
        this.cancelScroll();
        this.searchMatches = matches;
        this.searchMatchesByLine = new Map();
        matches.forEach((match, index) => {
            const entries = this.searchMatchesByLine.get(match.line) ?? [];
            entries.push({ match, index });
            this.searchMatchesByLine.set(match.line, entries);
        });
        this.activeSearchMatch = activeIndex;
        this.markDirty();
    }
    cellAtPoint(clientX, clientY, output, settings) {
        const terminal = this.terminal;
        if (!terminal)
            return null;
        const rect = output.getBoundingClientRect();
        if (!rect.width || !rect.height)
            return null;
        let u = (clientX - rect.left) / rect.width;
        let v = (clientY - rect.top) / rect.height;
        if (settings.crtEmulation) {
            if ((settings.bezelThickness ?? 0) > 0) {
                const insetX = settings.bezelThickness / (output.width || rect.width);
                const insetY = settings.bezelThickness / (output.height || rect.height);
                u = (u - insetX) / Math.max(0.0001, 1 - 2 * insetX);
                v = (v - insetY) / Math.max(0.0001, 1 - 2 * insetY);
            }
            if (settings.curvature > 0) {
                let x = (u - .5) * 2 * (1 + settings.curvature * .1);
                let y = (v - .5) * 2 * (1 + settings.curvature * .1);
                x *= 1 + Math.pow(Math.abs(y) / 5, 2) * settings.curvature * 5;
                y *= 1 + Math.pow(Math.abs(x) / 4, 2) * settings.curvature * 5;
                u = x / 2 + .5;
                v = y / 2 + .5;
            }
        }
        const cell = fontCellSize(settings.consoleFontSize, settings.consoleFont, undefined, settings.cellWidthAdjustment, settings.cellHeightAdjustment, settings.fallbackFont);
        const offset = terminalContentOffset(this.sourceCanvas.width, this.sourceCanvas.height, terminal.cols, terminal.rows, cell);
        return { col: Math.max(1, Math.min(terminal.cols, Math.floor((u * this.sourceCanvas.width - offset.x) / cell.width) + 1)), row: Math.max(1, Math.min(terminal.rows, Math.floor((v * this.sourceCanvas.height - offset.y) / cell.height) + 1)) };
    }
    draw(time, settings) {
        const source = this.sourceCanvas;
        const terminal = this.terminal;
        if (!terminal) {
            this.drawMock(time, settings);
            this.composeTerminal(this.compositedCanvas);
            return true;
        }
        const buffer = terminal.buffer.active;
        if (this.snapshotBuffer !== buffer) {
            this.cancelScroll();
            this.snapshotBuffer = buffer;
            this.rowSignatures = [];
            this.rowContentSignatures = [];
            this.rowTexts = [];
            this.snapshotCols = -1;
            this.snapshotRows = -1;
            this.snapshotViewportY = -1;
            this.snapshotBaseY = -1;
            this.terminalOutputDirty = false;
            this.dirty = true;
            this.fullDirty = true;
        }
        if (this.scrollTransition?.kind === 'normal' && buffer.viewportY !== this.scrollTransition.expectedViewportY) {
            this.cancelScroll();
            this.markDirty();
        }
        const cursorX = buffer.cursorX;
        const cursorY = buffer.cursorY;
        const cursorMoved = cursorX !== this.lastCursorX || cursorY !== this.lastCursorY || this.cursorMoved;
        if (cursorMoved) {
            this.cursorMoved = false;
            this.lastCursorX = cursorX;
            this.lastCursorY = cursorY;
            this.lastCursorMoveTime = time;
            this.dirty = true;
        }
        const cursorPhase = this.getCursorBlinkPhase(time);
        if (!this.dirty && cursorPhase === this.lastCursorPhase && !this.scrollTransition)
            return false;
        const ctx = source.getContext('2d');
        if (!ctx)
            return false;
        const profile = colorProfile(settings.colorProfile);
        const cellSize = fontCellSize(settings.consoleFontSize, settings.consoleFont, ctx, settings.cellWidthAdjustment, settings.cellHeightAdjustment, settings.fallbackFont);
        this.scrollCellHeight = cellSize.height;
        const cell = buffer.getNullCell();
        const offset = terminalContentOffset(source.width, source.height, terminal.cols, terminal.rows, cellSize);
        this.scrollContentTop = offset.y;
        const core = terminal._core;
        const cursorVisible = this.isCursorVisibleAt(time, buffer, core?.coreService?.isCursorHidden === true);
        const nextCursorRow = cursorVisible && buffer.cursorY >= 0 && buffer.cursorY < terminal.rows ? buffer.cursorY : null;
        const changedRows = new Set();
        const nextSignatures = [];
        const nextContentSignatures = [];
        const nextTexts = [];
        if (this.dirty)
            for (let row = 0; row < terminal.rows; row += 1) {
                const line = buffer.getLine(buffer.viewportY + row);
                const signature = this.rowSignature(line, terminal.cols, cell);
                nextSignatures.push(signature);
                nextContentSignatures.push(this.rowSignature(line, terminal.cols, cell, true));
                nextTexts.push(this.rowText(line, terminal.cols, cell));
                if (this.fullDirty || signature !== this.rowSignatures[row])
                    changedRows.add(row);
            }
        if (this.cursorRow !== null)
            changedRows.add(this.cursorRow);
        if (nextCursorRow !== null)
            changedRows.add(nextCursorRow);
        const previousSignatures = this.rowSignatures;
        const stableNormalViewport = buffer === terminal.buffer.normal && buffer.viewportY === buffer.baseY && buffer.viewportY === this.snapshotViewportY && buffer.baseY === this.snapshotBaseY;
        if (this.terminalOutputDirty) {
            const base = { buffer: buffer === terminal.buffer.alternate ? 'alternate' : buffer === terminal.buffer.normal ? 'normal' : 'other', cols: terminal.cols, rows: terminal.rows, viewportY: buffer.viewportY, baseY: buffer.baseY, previousViewportY: this.snapshotViewportY, previousBaseY: this.snapshotBaseY, fullDirty: this.fullDirty, selection: Boolean(this.selection), smoothEnabled: this.smoothScrollingEnabled };
            if (!this.smoothScrollingEnabled)
                this.recordSmoothScrollDiagnostic({ ...base, outcome: 'skipped', reason: 'disabled' });
            else if (this.fullDirty)
                this.recordSmoothScrollDiagnostic({ ...base, outcome: 'skipped', reason: 'full-repaint' });
            else if (this.selection)
                this.recordSmoothScrollDiagnostic({ ...base, outcome: 'skipped', reason: 'selection-active' });
            else if (this.snapshotBuffer !== buffer || this.snapshotCols !== terminal.cols || this.snapshotRows !== terminal.rows || previousSignatures.length !== nextSignatures.length)
                this.recordSmoothScrollDiagnostic({ ...base, outcome: 'skipped', reason: 'snapshot-mismatch', previousRows: previousSignatures.length });
            else if (buffer !== terminal.buffer.alternate && !stableNormalViewport)
                this.recordSmoothScrollDiagnostic({ ...base, outcome: 'skipped', reason: 'normal-viewport-or-scrollback-changed' });
            else {
                const detection = inspectVerticalScroll(previousSignatures, nextSignatures, this.rowContentSignatures, nextContentSignatures);
                const textOverlap = detection.candidate ? null : this.longestTextOverlap(this.rowTexts, nextTexts);
                this.recordSmoothScrollDiagnostic({ ...base, outcome: detection.candidate ? 'animated' : 'rejected', candidate: detection.candidate, boundaries: detection.candidate ? this.scrollBoundaryRows(detection.candidate, previousSignatures, this.rowTexts, nextSignatures, nextTexts) : null, exactOverlap: { rows: detection.maxExactOverlap, deltaRows: detection.maxExactDelta }, textOverlap, reason: detection.rejection });
                if (detection.candidate)
                    this.startScroll(detection.candidate.deltaRows, detection.candidate.topRow, detection.candidate.bottomRow, 'tui');
            }
        }
        if (changedRows.size === 0) {
            this.dirty = false;
            this.fullDirty = false;
            this.terminalOutputDirty = false;
            this.lastCursorPhase = cursorPhase;
            if (this.scrollTransition && !this.scrollTargetReady)
                this.composeTerminal(this.scrollTargetCanvas);
            if (this.scrollTransition)
                this.renderScroll(time);
            else
                this.composeTerminal(this.compositedCanvas);
            this.drawCursor(this.compositedCanvas.getContext('2d'), settings, profile, offset, cellSize, buffer, nextCursorRow);
            return Boolean(this.scrollTransition);
        }
        const baseFont = canvasFont(settings.consoleFontSize, settings.consoleFont, settings.fallbackFont);
        ctx.globalAlpha = 1;
        ctx.fillStyle = profile.background;
        if (this.fullDirty)
            ctx.fillRect(0, 0, source.width, source.height);
        ctx.font = baseFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (const row of changedRows)
            this.drawRow(ctx, buffer.getLine(buffer.viewportY + row), row, terminal.cols, buffer.viewportY, cell, profile, offset, cellSize, baseFont);
        if (nextSignatures.length) {
            this.sourceLuma = terminalAverageLuma(terminal, profile, { width: source.width, height: source.height, cellWidth: cellSize.width, cellHeight: cellSize.height, padding: terminalPadding(source.width, source.height) });
            this.hasMeasuredSourceLuma = true;
        }
        this.rowSignatures = nextSignatures.length ? nextSignatures : this.rowSignatures;
        this.rowContentSignatures = nextContentSignatures.length ? nextContentSignatures : this.rowContentSignatures;
        this.rowTexts = nextTexts.length ? nextTexts : this.rowTexts;
        if (nextSignatures.length) {
            this.snapshotCols = terminal.cols;
            this.snapshotRows = terminal.rows;
            this.snapshotViewportY = buffer.viewportY;
            this.snapshotBaseY = buffer.baseY;
        }
        this.cursorRow = nextCursorRow;
        this.lastCursorPhase = cursorPhase;
        this.dirty = false;
        this.fullDirty = false;
        this.terminalOutputDirty = false;
        if (this.scrollTransition)
            this.composeTerminal(this.scrollTargetCanvas);
        else
            this.composeTerminal(this.compositedCanvas);
        const animated = this.renderScroll(time);
        this.drawCursor(this.compositedCanvas.getContext('2d'), settings, profile, offset, cellSize, buffer, nextCursorRow);
        return animated || true;
    }
    composeTerminal(destination = this.compositedCanvas) {
        const ctx = destination.getContext('2d');
        if (!ctx || typeof ctx.clearRect !== 'function' || typeof ctx.drawImage !== 'function')
            return;
        if (destination.width !== this.sourceCanvas.width || destination.height !== this.sourceCanvas.height) {
            destination.width = this.sourceCanvas.width;
            destination.height = this.sourceCanvas.height;
        }
        ctx.clearRect(0, 0, destination.width, destination.height);
        ctx.drawImage(this.sourceCanvas, 0, 0);
        if (destination === this.scrollTargetCanvas)
            this.scrollTargetReady = true;
    }
    drawCursor(ctx, settings, profile, offset, cellSize, buffer, cursorRow) {
        if (!ctx || cursorRow === null)
            return;
        const x = offset.x + cellSize.width * buffer.cursorX;
        const y = offset.y + cellSize.height * buffer.cursorY;
        ctx.fillStyle = brightenColor(profile.cursor ?? profile.foreground, settings.cursorBrightness ?? 0);
        const cursorStyle = settings.cursorStyle ?? this.terminal?.options.cursorStyle ?? 'block';
        if (cursorStyle === 'underline') {
            const underlineHeight = Math.max(2, Math.round(cellSize.height * 0.1));
            ctx.fillRect(x, y + Math.ceil(cellSize.height) - underlineHeight - 1, cellSize.width, underlineHeight);
        }
        else if (cursorStyle === 'bar') {
            const barWidth = Math.max(2, Math.min(cellSize.width, this.terminal?.options.cursorWidth ?? cellSize.width * 0.15));
            ctx.fillRect(x, y, barWidth, Math.ceil(cellSize.height));
        }
        else {
            const height = Math.max(1, Math.ceil(cellSize.height) - 2);
            ctx.fillRect(x, y + 1, cellSize.width, height);
        }
    }
    renderScroll(time) {
        const transition = this.scrollTransition;
        if (!transition)
            return false;
        const targetCtx = this.scrollTargetCanvas.getContext('2d');
        const outputCtx = this.compositedCanvas.getContext('2d');
        if (!targetCtx || !outputCtx || typeof outputCtx.drawImage !== 'function') {
            this.cancelScroll();
            return false;
        }
        this.composeTerminal(this.compositedCanvas);
        const progress = Math.min(1, Math.max(0, (time - transition.startedAt) / transition.duration));
        const eased = transition.fast ? 1 - Math.pow(1 - progress, 3) : progress;
        const top = Math.floor(this.scrollContentTop + transition.topRow * this.scrollCellHeight);
        const bottom = Math.ceil(this.scrollContentTop + transition.bottomRow * this.scrollCellHeight);
        const distance = Math.min(bottom - top, Math.round(transition.distance * this.lineHeight()));
        const offset = Math.round(distance * eased);
        const smoothing = outputCtx.imageSmoothingEnabled;
        outputCtx.imageSmoothingEnabled = false;
        outputCtx.save();
        outputCtx.beginPath();
        outputCtx.rect(0, top, this.compositedCanvas.width, bottom - top);
        outputCtx.clip();
        outputCtx.clearRect(0, top, this.compositedCanvas.width, bottom - top);
        if (transition.deltaRows > 0) {
            outputCtx.drawImage(this.scrollFromCanvas, 0, -offset);
            outputCtx.save();
            outputCtx.beginPath();
            outputCtx.rect(0, bottom - offset, this.compositedCanvas.width, offset);
            outputCtx.clip();
            outputCtx.drawImage(this.scrollTargetCanvas, 0, distance - offset);
            outputCtx.restore();
        }
        else {
            outputCtx.drawImage(this.scrollFromCanvas, 0, offset);
            outputCtx.save();
            outputCtx.beginPath();
            outputCtx.rect(0, top, this.compositedCanvas.width, offset);
            outputCtx.clip();
            outputCtx.drawImage(this.scrollTargetCanvas, 0, offset - distance);
            outputCtx.restore();
        }
        outputCtx.restore();
        outputCtx.imageSmoothingEnabled = smoothing;
        const frame = this.scrollFrameCanvas.getContext('2d');
        if (frame && typeof frame.drawImage === 'function')
            frame.drawImage(this.compositedCanvas, 0, 0);
        if (progress >= 1)
            this.cancelScroll();
        return true;
    }
    lineHeight() { return this.scrollCellHeight; }
    rowText(line, cols, cell) {
        if (!line)
            return '';
        let text = '';
        for (let column = 0; column < cols; column += 1) {
            const current = line.getCell(column, cell);
            if (!current || current.getWidth() === 0)
                continue;
            text += current.getChars() || ' '.repeat(current.getWidth());
        }
        return text.trimEnd().slice(0, 240);
    }
    longestTextOverlap(previous, next) {
        if (previous.length !== next.length)
            return null;
        let best = null;
        for (let delta = 1 - previous.length; delta < previous.length; delta += 1) {
            if (!delta)
                continue;
            let start = -1;
            for (let row = 0; row <= next.length; row += 1) {
                const matches = row < next.length && row + delta >= 0 && row + delta < previous.length && next[row] === previous[row + delta];
                if (matches && start < 0)
                    start = row;
                if (!matches && start >= 0) {
                    const overlapRows = row - start;
                    if (!best || overlapRows > best.overlapRows)
                        best = { deltaRows: delta, start, overlapRows };
                    start = -1;
                }
            }
        }
        return best && best.overlapRows >= MIN_SCROLL_OVERLAP ? { deltaRows: best.deltaRows, overlapRows: best.overlapRows, samples: next.slice(best.start, best.start + best.overlapRows).filter(Boolean).slice(0, 6) } : null;
    }
    scrollBoundaryRows(candidate, previous, previousTexts, next, nextTexts) {
        const rows = new Set();
        for (const boundary of [candidate.matchTopRow, candidate.matchBottomRow])
            for (let row = boundary - 2; row <= boundary + 2; row += 1)
                if (row >= 0 && row < next.length)
                    rows.add(row);
        return [...rows].sort((a, b) => a - b).map((newRow) => {
            const oldRow = newRow + candidate.deltaRows;
            const oldText = oldRow >= 0 && oldRow < previousTexts.length ? previousTexts[oldRow] : null;
            const sameSignature = oldRow >= 0 && oldRow < previous.length && next[newRow] === previous[oldRow];
            return { newRow, oldRow, newText: nextTexts[newRow], oldText, sameText: oldText === nextTexts[newRow], sameSignature };
        });
    }
    rowSignature(line, cols, cell, contentOnly = false) {
        if (!line)
            return '';
        let signature = '';
        for (let column = 0; column < cols; column += 1) {
            const current = line.getCell(column, cell);
            if (!current) {
                signature += ';';
                continue;
            }
            const chars = current.getChars();
            const attributes = CELL_ATTRIBUTES.map((attribute) => Number(cellAttribute(current, attribute))).join('');
            const colors = `${current.getFgColor()},${current.getBgColor()},${Number(current.isFgRGB())}${Number(current.isBgRGB())}${Number(current.isFgPalette())}${Number(current.isBgPalette())},${Number(current.isInverse())}`;
            const presentation = contentOnly ? '' : `${colors}${Number(current.isDim())}${attributes}`;
            signature += `${chars.length}:${chars},${current.getWidth()},${presentation}${Number(current.isInvisible())};`;
        }
        return signature;
    }
    drawRow(ctx, line, row, cols, viewportY, cell, profile, offset, cellSize, baseFont) {
        const y = offset.y + cellSize.height * (row + .5);
        ctx.globalAlpha = 1;
        ctx.fillStyle = profile.background;
        ctx.fillRect(0, Math.floor(y - cellSize.height / 2), this.sourceCanvas.width, Math.ceil(cellSize.height));
        if (!line)
            return;
        const selectionStart = this.selection ? this.selection.start.row * cols + this.selection.start.column : -1;
        const selectionEnd = this.selection ? this.selection.end.row * cols + this.selection.end.column : -1;
        const lineSearchMatches = this.searchMatchesByLine.get(viewportY + row) ?? [];
        for (let column = 0; column < cols; column += 1) {
            const current = line.getCell(column, cell);
            if (!current || current.getWidth() === 0)
                continue;
            let fg = cellColor(current, true, profile);
            let bg = cellColor(current, false, profile);
            if (current.isInverse())
                [fg, bg] = [bg, fg];
            const x = offset.x + cellSize.width * column;
            const left = Math.floor(x);
            const top = Math.floor(y - cellSize.height / 2);
            const width = Math.ceil(cellSize.width * current.getWidth());
            const height = Math.ceil(cellSize.height);
            if (bg !== profile.background) {
                ctx.globalAlpha = 1;
                ctx.fillStyle = bg;
                ctx.fillRect(left, top, width, height);
            }
            const point = (viewportY + row) * cols + column;
            if (this.selection && point >= Math.min(selectionStart, selectionEnd) && point <= Math.max(selectionStart, selectionEnd)) {
                ctx.globalAlpha = 1;
                ctx.fillStyle = 'rgba(125, 210, 255, 0.42)';
                ctx.fillRect(left, top, width, height);
            }
            const searchEntry = lineSearchMatches.find((entry) => column >= entry.match.startColumn && column < entry.match.endColumn);
            if (searchEntry) {
                const searchAlpha = searchEntry.index === this.activeSearchMatch ? .78 : .34;
                ctx.globalAlpha = 1;
                ctx.fillStyle = searchEntry.index === this.activeSearchMatch ? 'rgba(255, 208, 92, 0.78)' : 'rgba(255, 208, 92, 0.34)';
                ctx.fillRect(left, top, width, height);
                fg = accessibleTextColor(fg, blendColor(bg, '#ffd05c', searchAlpha));
            }
            const chars = current.getChars();
            const invisible = current.isInvisible();
            const bold = cellAttribute(current, 'isBold');
            const italic = cellAttribute(current, 'isItalic');
            const underline = cellAttribute(current, 'isUnderline');
            const strikethrough = cellAttribute(current, 'isStrikethrough');
            const overline = cellAttribute(current, 'isOverline');
            if (!invisible && (chars || underline || strikethrough || overline)) {
                ctx.globalAlpha = current.isDim() ? .6 : 1;
                ctx.fillStyle = fg;
                if (chars) {
                    ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${baseFont}`;
                }
                if (chars) {
                    if (!drawContinuousVertical(ctx, chars, x, top, cellSize))
                        ctx.fillText(chars, x, y, width);
                }
                if (overline)
                    ctx.fillRect(left, top, width, 1);
                if (strikethrough)
                    ctx.fillRect(left, top + Math.floor(height / 2), width, 1);
                if (underline)
                    ctx.fillRect(left, top + height - 1, width, 1);
            }
        }
    }
    drawMock(time, settings) {
        const ctx = this.sourceCanvas.getContext('2d');
        if (!ctx)
            return;
        const { width, height } = this.sourceCanvas;
        const size = settings.consoleFontSize;
        const line = Math.floor(size * 1.5);
        const profile = colorProfile(settings.colorProfile);
        ctx.fillStyle = '#050806';
        ctx.fillRect(0, 0, width, height);
        ctx.font = canvasFont(size, settings.consoleFont, settings.fallbackFont);
        ctx.textBaseline = 'top';
        const lines = [
            'SCANLINE TERM // CRT DISPLAY DIAGNOSTIC',
            `virtual framebuffer ${width}×${height}`,
            '[ OK ] phosphor matrix online',
            '[ OK ] scanline generator synchronized',
            '[ OK ] WebGL fragment pipeline ready',
            '> rendering an ordinary terminal as an old monitor',
            '> browser preview uses a mock session',
            '',
            `  frame ${Math.floor(time * 10) % 10000}  uptime ${(time % 3600).toFixed(1)}s`,
        ];
        lines.forEach((text, i) => {
            ctx.fillStyle = ['#7dffae', '#4ecf83', '#9affbd', '#62db91', '#78c9ff', '#ffd166', '#ff8a80'][i % 7];
            ctx.fillText(text, size, size + line * i);
        });
        const promptY = size + line * lines.length;
        const promptText = 'ready> ';
        ctx.fillStyle = '#7dffae';
        ctx.fillText(promptText, size, promptY);
        const cursorPhase = Math.floor(time * 2);
        if (cursorPhase % 2 === 0) {
            const cursorX = size + ctx.measureText(promptText).width;
            const cursorW = ctx.measureText('M').width;
            const cursorH = size;
            const cursorStyle = settings.cursorStyle ?? 'block';
            ctx.fillStyle = brightenColor(profile.cursor ?? '#7dffae', settings.cursorBrightness ?? 0);
            if (cursorStyle === 'underline') {
                const h = Math.max(2, Math.round(cursorH * 0.12));
                ctx.fillRect(cursorX, promptY + cursorH - h - 1, cursorW, h);
            }
            else if (cursorStyle === 'bar') {
                const w = Math.max(2, Math.min(cursorW, cursorW * 0.2));
                ctx.fillRect(cursorX, promptY, w, cursorH);
            }
            else {
                ctx.fillRect(cursorX, promptY + 1, cursorW, Math.max(1, cursorH - 2));
            }
        }
    }
    dispose() { this.cancelScroll(); this.disposables.forEach((item) => item.dispose()); this.disposables = []; this.terminal = null; this.rowSignatures = []; this.rowContentSignatures = []; this.rowTexts = []; this.snapshotCols = -1; this.snapshotRows = -1; this.snapshotViewportY = -1; this.snapshotBaseY = -1; this.snapshotBuffer = null; this.terminalOutputDirty = false; this.cursorRow = null; this.lastCursorPhase = -1; this.lastCursorMoveTime = 0; this.lastCursorX = -1; this.lastCursorY = -1; this.cursorMoved = false; }
}
//# sourceMappingURL=TerminalRenderer.js.map