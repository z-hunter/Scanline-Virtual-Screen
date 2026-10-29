export declare const COLOR_PROFILE_IDS: readonly ["dos-vga", "windows-legacy", "windows-campbell", "xterm-x11", "solarized-dark", "ibm-3279", "commodore-64", "commodore-128", "cyberpunk", "chalkbox", "inverted"];
export type ColorProfileId = (typeof COLOR_PROFILE_IDS)[number] | `lua:${string}`;
export type TerminalColorProfile = Readonly<{
    id: ColorProfileId;
    label: string;
    foreground: string;
    background: string;
    cursor?: string;
    colors: readonly string[];
}>;
export declare const DEFAULT_COLOR_PROFILE_ID: ColorProfileId;
export declare const COLOR_PROFILES: readonly TerminalColorProfile[];
export declare function isColorProfile(value: unknown): value is ColorProfileId;
export declare function colorProfile(id: ColorProfileId): TerminalColorProfile;
export declare function replaceCustomColorProfiles(profiles: readonly TerminalColorProfile[]): void;
export declare function getCustomColorProfiles(): readonly TerminalColorProfile[];
export declare function profileColor(profile: TerminalColorProfile, index: number): string;
export declare function remapLegacyRgb(profile: TerminalColorProfile, color: string): string;
//# sourceMappingURL=color-profiles.d.ts.map