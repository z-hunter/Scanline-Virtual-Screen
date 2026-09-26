import type { ScreenMode, ScreenProfile } from '../core/profile.js';
export type SmoothScrollingSettings = {
    enabled: boolean;
    tuiEnabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
    onTuiEnabledChange: (enabled: boolean) => void;
};
type ProfileSectionProps = {
    value: ScreenProfile;
    onChange: (value: ScreenProfile) => void;
};
export declare function DisplaySettingsSection({ value, modes, onChange }: ProfileSectionProps & {
    modes: readonly ScreenMode[];
}): import("react/jsx-runtime").JSX.Element;
export declare function TerminalSettingsSection({ value, fonts, onChange, smoothScrolling }: ProfileSectionProps & {
    fonts: readonly string[];
    smoothScrolling?: SmoothScrollingSettings;
}): import("react/jsx-runtime").JSX.Element;
export declare function AdvancedCRTSettingsSection({ value, onChange }: ProfileSectionProps): import("react/jsx-runtime").JSX.Element;
export declare const CRTSettingsSection: typeof AdvancedCRTSettingsSection;
export type PresetControlState = {
    name: string;
    draftName: string;
    dirty: boolean;
};
export declare function PresetSettingsSection({ value, names, disabled, onNameChange, onLoad, onSave }: {
    value: PresetControlState | null;
    names: readonly string[];
    disabled?: boolean;
    onNameChange: (name: string) => void;
    onLoad: (name: string) => void;
    onSave: (name: string) => void;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ScreenProfileSections.d.ts.map