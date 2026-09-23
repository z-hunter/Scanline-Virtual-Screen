import type { CRTSettings, CursorStyle } from './CRTFilter';
import { type ColorProfileId } from './color-profiles';
type TerminalKeys = 'colorProfile' | 'consoleFont' | 'fallbackFont' | 'consoleFontSize' | 'cellWidthAdjustment' | 'cellHeightAdjustment' | 'cursorStyle' | 'cursorBrightness';
export type TerminalSettings = {
    colorProfile: ColorProfileId;
    fontFamily: string;
    fallbackFont?: string;
    fontSize: number;
    cellWidthAdjustment: number;
    cellHeightAdjustment: number;
    cursorStyle: CursorStyle;
    cursorBrightness: number;
};
export type CRTVisualSettings = Omit<CRTSettings, TerminalKeys>;
export type ScreenProfile = {
    schemaVersion: 1;
    virtualScreen: {
        modeId: string;
    };
    terminal: TerminalSettings;
    crt: CRTVisualSettings;
};
export type ScreenMode = {
    id: string;
    label?: string;
    width?: number;
    height?: number;
};
export type RenderSettings = CRTVisualSettings & {
    colorProfile: ColorProfileId;
    consoleFont: string;
    fallbackFont?: string;
    consoleFontSize: number;
    cellWidthAdjustment: number;
    cellHeightAdjustment: number;
    cursorStyle: CursorStyle;
    cursorBrightness: number;
};
export declare function profileToRenderSettings(profile: ScreenProfile): RenderSettings;
export declare function profileFromRenderSettings(settings: RenderSettings, modeId: string): ScreenProfile;
export declare function defaultScreenProfile(modeId?: string): ScreenProfile;
export declare function normalizeProfile(input: unknown, fallback?: ScreenProfile, availableModes?: readonly ScreenMode[]): ScreenProfile | null;
export declare function profileToJSON(profile: ScreenProfile): string;
export type LegacyPreset = {
    version: 1;
    resolution: string;
    crt: CRTSettings;
};
export declare function profileFromLegacyPreset(preset: LegacyPreset, availableModes?: readonly ScreenMode[]): ScreenProfile;
export declare function legacyPresetFromProfile(profile: ScreenProfile): LegacyPreset;
export {};
//# sourceMappingURL=profile.d.ts.map