import type { ScreenMode, ScreenProfile } from '../core/profile.js';
export type PresetControlState = {
    name: string;
    draftName: string;
    dirty: boolean;
};
export declare function DisplaySettingsSection({ value, modes, onChange }: {
    value: ScreenProfile;
    modes: readonly ScreenMode[];
    onChange: (value: ScreenProfile) => void;
}): import("react/jsx-runtime").JSX.Element;
export declare function TerminalSettingsSection({ value, fonts, onChange }: {
    value: ScreenProfile;
    fonts: readonly string[];
    onChange: (value: ScreenProfile) => void;
}): import("react/jsx-runtime").JSX.Element;
export declare function CRTSettingsSection({ value, onChange }: {
    value: ScreenProfile;
    onChange: (value: ScreenProfile) => void;
}): import("react/jsx-runtime").JSX.Element;
export declare function PresetSettingsSection({ value, names, disabled, onNameChange, onLoad, onSave }: {
    value: PresetControlState | null;
    names: readonly string[];
    disabled?: boolean;
    onNameChange: (name: string) => void;
    onLoad: (name: string) => void;
    onSave: (name: string) => void;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ScreenProfileSections.d.ts.map