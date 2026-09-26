import { Fragment, useEffect, useState } from 'react';
import type { BezelGlowMode, BloomAlgorithm, CRTColorMode, CRTMaskType } from '../core/CRTFilter.js';
import type { ColorProfileId } from '../core/color-profiles.js';
import { COLOR_PROFILES } from '../core/color-profiles.js';
import type { CRTVisualSettings, ScreenMode, ScreenProfile, TerminalSettings } from '../core/profile.js';
import { Knob, formatValue } from './Knob.js';
import { SegmentedControl, Switch } from './Controls.js';

type NumericKey = Exclude<
  keyof CRTVisualSettings,
  | 'crtEmulation'
  | 'bezelGlow'
  | 'bezelGlowMode'
  | 'showBezel'
  | 'antiAliasedPixels'
  | 'passThroughSmoothing'
  | 'channelSwitchEffect'
  | 'reflexBarEnabled'
  | 'colorMode'
  | 'maskType'
  | 'bloomAlgorithm'
>;

const controls: Record<string, { key: NumericKey; label: string; min: number; max: number; step: number }[]> = {
  'Final image': [
    { key: 'imageBrightness', label: 'Brightness', min: 0.5, max: 1.5, step: 0.05 },
    { key: 'imageContrast', label: 'Contrast', min: 0.5, max: 1.5, step: 0.05 },
    { key: 'phosphor', label: 'Phosphor / grain', min: 0, max: 1, step: 0.05 },
  ],
  Geometry: [
    { key: 'curvature', label: 'Curvature', min: 0, max: 0.5, step: 0.01 },
    { key: 'vignette', label: 'Vignette', min: 0, max: 1, step: 0.05 },
  ],
  Raster: [
    { key: 'scanlineCount', label: 'Scanline count', min: 0, max: 768, step: 10 },
    { key: 'scanlineIntensity', label: 'Scanline intensity', min: 0, max: 1, step: 0.05 },
    { key: 'beamModulation', label: 'Beam modulation', min: 0, max: 1, step: 0.05 },
  ],
  Light: [
    { key: 'bloom', label: 'Bloom', min: 0, max: 1, step: 0.05 },
    { key: 'glow', label: 'Screen glow', min: 0, max: 2, step: 0.05 },
    { key: 'glowRadius', label: 'Glow radius', min: 1, max: 6, step: 0.25 },
    { key: 'ambientGlassLight', label: 'Ambient glass light', min: 0, max: 1, step: 0.05 },
  ],
  Temporal: [
    { key: 'persistence', label: 'Phosphor trail', min: 0, max: 1, step: 0.05 },
    { key: 'persistenceEnergy', label: 'Afterglow energy', min: 0, max: 0.5, step: 0.01 },
    { key: 'persistenceIntensity', label: 'Trail intensity', min: 0, max: 4, step: 0.05 },
    { key: 'breathing', label: 'HV breathing', min: 0, max: 1, step: 0.05 },
    { key: 'imperfectSignal', label: 'Imperfect signal', min: 0, max: 1, step: 0.05 },
    { key: 'humBar', label: 'Hum-bar', min: 0, max: 1, step: 0.05 },
  ],
};

export type SmoothScrollingSettings = {
  enabled: boolean;
  tuiEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onTuiEnabledChange: (enabled: boolean) => void;
};

type ProfileSectionProps = { value: ScreenProfile; onChange: (value: ScreenProfile) => void };

export function DisplaySettingsSection({ value, modes, onChange }: ProfileSectionProps & { modes: readonly ScreenMode[] }) {
  const update = (patch: Partial<CRTVisualSettings>) => onChange({ ...value, crt: { ...value.crt, ...patch } });
  return (
    <fieldset className="svs-settings-section screen-section display-section">
      <legend>Display</legend>
      {modes.length > 1 && <label className="svs-field resolution-control">Virtual resolution<select value={value.virtualScreen.modeId} onChange={(event) => onChange({ ...value, virtualScreen: { modeId: event.target.value } })}>{modes.map((mode) => <option key={mode.id} value={mode.id}>{mode.label ?? mode.id}</option>)}</select></label>}
      <Switch label="Anti-moiré pixels" checked={value.crt.antiAliasedPixels} onChange={(antiAliasedPixels) => update({ antiAliasedPixels })} />
      <Switch label="Smooth pixels without CRT" checked={value.crt.passThroughSmoothing} onChange={(passThroughSmoothing) => update({ passThroughSmoothing })} />
    </fieldset>
  );
}

export function TerminalSettingsSection({ value, fonts, onChange, smoothScrolling }: ProfileSectionProps & { fonts: readonly string[]; smoothScrolling?: SmoothScrollingSettings }) {
  const update = (patch: Partial<TerminalSettings>) => onChange({ ...value, terminal: { ...value.terminal, ...patch } });
  const [fontSizeInput, setFontSizeInput] = useState(String(value.terminal.fontSize));
  useEffect(() => setFontSizeInput((current) => {
    const parsed = /^[+-]?\d+$/.test(current.trim()) ? Number(current) : NaN;
    return parsed === value.terminal.fontSize ? current : String(value.terminal.fontSize);
  }), [value.terminal.fontSize]);
  const commitFontSize = () => {
    const parsed = /^\d+$/.test(fontSizeInput.trim()) ? Number(fontSizeInput) : value.terminal.fontSize;
    const fontSize = Math.max(6, Math.min(32, parsed));
    update({ fontSize });
    setFontSizeInput(String(fontSize));
  };
  const updateInteger = (key: 'cellWidthAdjustment' | 'cellHeightAdjustment', raw: string) => {
    const value = Number(raw);
    if (Number.isInteger(value) && value >= -8 && value <= 16) update({ [key]: value });
  };
  return (
    <fieldset className="svs-settings-section screen-section terminal-section">
      <legend>Terminal</legend>
      <label className="svs-field resolution-control">ANSI color profile<select value={value.terminal.colorProfile} data-testid="color-profile-select" onChange={(event) => update({ colorProfile: event.target.value as ColorProfileId })}>{COLOR_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
      <div className="svs-font-row font-control-row">
        <label className="svs-field resolution-control font-name-control">Console font<select value={value.terminal.fontFamily} onChange={(event) => update({ fontFamily: event.target.value })}>{!fonts.includes(value.terminal.fontFamily) && <option value={value.terminal.fontFamily}>{value.terminal.fontFamily} (fallback)</option>}{fonts.map((font) => <option key={font} value={font}>{font}</option>)}</select></label>
        <label className="svs-field resolution-control font-size-control">Size<input type="number" min={6} max={32} step={1} value={fontSizeInput} onChange={(event) => { const next = event.target.value; setFontSizeInput(next); const parsed = /^[+-]?\d+$/.test(next.trim()) ? Number(next) : NaN; if (parsed >= 6 && parsed <= 32) update({ fontSize: parsed }); }} onBlur={commitFontSize} onKeyDown={(event) => { if (event.key === 'Enter') commitFontSize(); }} /></label>
      </div>
      <div className="svs-font-row font-control-row">
        <label className="svs-field resolution-control font-size-control">Cell width ±px<input type="number" min={-8} max={16} step={1} value={value.terminal.cellWidthAdjustment} data-testid="cell-width-adjustment" onChange={(event) => updateInteger('cellWidthAdjustment', event.target.value)} /></label>
        <label className="svs-field resolution-control font-size-control">Cell height ±px<input type="number" min={-8} max={16} step={1} value={value.terminal.cellHeightAdjustment} data-testid="cell-height-adjustment" onChange={(event) => updateInteger('cellHeightAdjustment', event.target.value)} /></label>
      </div>
      {smoothScrolling && <><Switch label="Smooth terminal scrolling" checked={smoothScrolling.enabled} onChange={smoothScrolling.onEnabledChange} />{smoothScrolling.enabled && <Switch label="Heuristic TUI scrolling" checked={smoothScrolling.tuiEnabled} onChange={smoothScrolling.onTuiEnabledChange} />}</>}
      <div className="svs-setting-block setting-block"><span className="svs-setting-label setting-label">Cursor style</span><SegmentedControl value={value.terminal.cursorStyle} data-testid="cursor-style-segmented" options={[{ value: 'block', label: 'Block' }, { value: 'underline', label: 'Underline' }, { value: 'bar', label: 'Bar' }]} onChange={(cursorStyle) => update({ cursorStyle })} /></div>
      <label className="svs-slider-control slider-control"><span>Cursor brightness<output>{formatValue(value.terminal.cursorBrightness)}</output></span><Knob label="Cursor brightness" min={0} max={1} step={0.05} value={value.terminal.cursorBrightness} onChange={(cursorBrightness) => update({ cursorBrightness })} /></label>
    </fieldset>
  );
}

export function AdvancedCRTSettingsSection({ value, onChange }: ProfileSectionProps) {
  const update = (patch: Partial<CRTVisualSettings>) => onChange({ ...value, crt: { ...value.crt, ...patch } });
  const updateNumber = (key: NumericKey, next: number) => update({ [key]: next } as Partial<CRTVisualSettings>);
  return (
    <fieldset className="svs-settings-section screen-section crt-section">
      <legend>CRT</legend>
      <Switch label="CRT Emulation" checked={value.crt.crtEmulation} data-testid="control-crtEmulation" onChange={(crtEmulation) => update({ crtEmulation })} />
      {value.crt.crtEmulation && <div className="svs-crt-subsections crt-subsections">
        <fieldset className="svs-knob-group knob-group colors-group"><legend>Colors</legend>
          <div className="svs-font-row font-control-row">
            <label className="svs-field resolution-control font-name-control">Color mode<select value={value.crt.colorMode} data-testid="color-mode-select" onChange={(event) => update({ colorMode: event.target.value as CRTColorMode })}><option value="color">Color</option><option value="bw">B&amp;W</option><option value="green">Green (P31)</option><option value="green-p39">Green (P39)</option><option value="amber">Amber</option><option value="blue">Phosphor Blue</option></select></label>
            {value.crt.colorMode !== 'color' && value.crt.colorMode !== 'bw' && <KnobControl label="Surface desat." knobLabel="Background desaturation" value={value.crt.backgroundDesaturation} min={0} max={1} step={0.05} onChange={(backgroundDesaturation) => update({ backgroundDesaturation })} />}
          </div>
          {value.crt.colorMode === 'color' && <div className="svs-font-row font-control-row"><label className="svs-field resolution-control font-name-control">Color mask<select value={value.crt.maskType} data-testid="color-mask-select" onChange={(event) => update({ maskType: event.target.value as CRTMaskType })}><option value="off">Off</option><option value="aperture">Aperture grille</option><option value="slot">Slot mask</option><option value="shadow">Shadow mask</option></select></label><KnobControl label="Strength" knobLabel="Color mask strength" value={value.crt.maskStrength} min={0} max={1} step={0.05} disabled={value.crt.maskType === 'off'} onChange={(maskStrength) => update({ maskStrength })} /></div>}
          {value.crt.colorMode === 'color' && <div className="svs-font-row convergence-controls"><KnobControl label={<>Edge<br />misconvergence</>} knobLabel="Edge misconvergence" value={value.crt.aberration} min={0} max={5} step={0.25} suffix=" px" onChange={(aberration) => update({ aberration })} /><KnobControl label="Edge falloff" knobLabel="Edge falloff" value={value.crt.aberrationFalloff} min={1} max={4} step={0.25} disabled={value.crt.aberration === 0} onChange={(aberrationFalloff) => update({ aberrationFalloff })} /></div>}
        </fieldset>
        {Object.entries(controls).map(([group, groupControls]) => <fieldset className={`svs-knob-group knob-group ${groupControls.length === 2 ? 'two-columns' : ''}`} key={group}><legend>{group}</legend>
          {groupControls.map((control) => {
            const slider = <KnobControl key={control.key} label={control.label} knobLabel={control.label} value={value.crt[control.key] as number} min={control.min} max={control.max} step={control.step} onChange={(next) => updateNumber(control.key, next)} />;
            if (group === 'Light' && control.key === 'bloom') return <div className="svs-bloom-card bloom-card" key={control.key}>{slider}<SegmentedControl value={value.crt.bloomAlgorithm} disabled={value.crt.bloom === 0} options={[{ value: 'soft', label: 'Soft' }, { value: 'spiral', label: 'Spiral' }]} onChange={(bloomAlgorithm) => update({ bloomAlgorithm: bloomAlgorithm as BloomAlgorithm })} /></div>;
            if (group === 'Light' && control.key === 'ambientGlassLight') return <Fragment key={control.key}>{slider}<Switch className="reflex-bar-switch" label="Reflex-bar" checked={value.crt.reflexBarEnabled} onChange={(reflexBarEnabled) => update({ reflexBarEnabled })} /></Fragment>;
            return slider;
          })}
          {group === 'Light' && <div className="svs-reflex-subsection reflex-subsection">{value.crt.reflexBarEnabled && <div className="svs-reflex-control-row reflex-control-row active"><KnobControl className="reflex-bar-control" label="Intensity" knobLabel="Intensity" value={value.crt.reflexBar} min={0} max={1} step={0.05} onChange={(reflexBar) => update({ reflexBar })} /><KnobControl className="reflex-pos-y-control" label="Vertical pos." knobLabel="Vertical pos." value={value.crt.reflexBarPosY} min={0} max={0.5} step={0.01} onChange={(reflexBarPosY) => update({ reflexBarPosY })} /><KnobControl className="reflex-width-control" label="Width" knobLabel="Width" value={value.crt.reflexBarWidth} min={0.95} max={1} step={0.005} onChange={(reflexBarWidth) => update({ reflexBarWidth })} /><KnobControl className="reflex-height-control" label="Height" knobLabel="Height" value={value.crt.reflexBarHeight} min={0.05} max={0.6} step={0.01} onChange={(reflexBarHeight) => update({ reflexBarHeight })} /></div>}</div>}
          {group === 'Temporal' && <Switch label="Channel switch roll" checked={value.crt.channelSwitchEffect} onChange={(channelSwitchEffect) => update({ channelSwitchEffect })} />}
        </fieldset>)}
        <fieldset className="svs-bezel-section"><legend>Bezel</legend><div className="svs-setting-block setting-block"><span className="svs-setting-label setting-label">Bezel glow</span><SegmentedControl<'off' | BezelGlowMode> value={value.crt.bezelGlow ? value.crt.bezelGlowMode : 'off'} options={[{ value: 'off', label: 'Off' }, { value: 'spill', label: 'Spill' }, { value: 'reflection', label: 'Relect.' }]} onChange={(bezelGlowMode) => update(bezelGlowMode === 'off' ? { bezelGlow: false } : { bezelGlow: true, bezelGlowMode })} /></div><div className="svs-bezel-control-row bezel-control-row"><KnobControl className="bezel-thickness-control" label="Bezel thickness" knobLabel="Bezel thickness" value={value.crt.bezelThickness} min={0} max={10} step={1} onChange={(bezelThickness) => update({ bezelThickness })} /><KnobControl className="bezel-highlight-control" label="Bezel highlight" knobLabel="Bezel highlight" value={value.crt.bezelHighlight} min={0} max={1} step={0.05} onChange={(bezelHighlight) => update({ bezelHighlight })} /></div><Switch label="Monitor frame" checked={value.crt.showBezel} onChange={(showBezel) => update({ showBezel })} /></fieldset>
      </div>}
    </fieldset>
  );
}

export const CRTSettingsSection = AdvancedCRTSettingsSection;

function KnobControl({ label, knobLabel, value, min, max, step, onChange, disabled = false, className = '', suffix = '' }: { label: React.ReactNode; knobLabel: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; disabled?: boolean; className?: string; suffix?: string }) {
  return <label className={`svs-slider-control slider-control ${className}${disabled ? ' disabled' : ''}`}><span>{label}<output>{formatValue(value)}{suffix}</output></span><Knob label={knobLabel} min={min} max={max} step={step} value={value} disabled={disabled} onChange={onChange} /></label>;
}

export type PresetControlState = { name: string; draftName: string; dirty: boolean };

export function PresetSettingsSection({ value, names, disabled = false, onNameChange, onLoad, onSave }: { value: PresetControlState | null; names: readonly string[]; disabled?: boolean; onNameChange: (name: string) => void; onLoad: (name: string) => void; onSave: (name: string) => void }) {
  return <fieldset className="svs-settings-section preset-controls" disabled={disabled}><legend>Presets</legend><div className="preset-picker-row"><input value={value?.draftName ?? ''} placeholder="Preset name" aria-label="Preset name" onChange={(event) => onNameChange(event.target.value)} /><button type="button" data-testid="preset-save" disabled={!value || (!value.dirty && value.draftName === value.name)} onClick={() => value && onSave(value.draftName)}>Save</button></div><label className="preset-load-control"><select aria-label="Load preset" defaultValue="" onChange={(event) => { const name = event.target.value; event.currentTarget.value = ''; if (name) onLoad(name); }}><option value="" disabled>Load preset…</option>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select></label></fieldset>;
}
