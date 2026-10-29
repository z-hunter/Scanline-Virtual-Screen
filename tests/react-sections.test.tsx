import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultScreenProfile } from '../src/core/profile';
import { replaceCustomColorProfiles } from '../src/core/color-profiles';
import { AdvancedCRTSettingsSection, DisplaySettingsSection, TerminalSettingsSection } from '../src/react/ScreenProfileSections';

const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => { roots.splice(0).forEach((root) => root.unmount()); });

describe('controlled display section', () => {
  it('hides mode selector when the host exposes one mode', () => {
    const element = document.createElement('div'); document.body.append(element);
    const root = createRoot(element); roots.push(root);
    act(() => root.render(<DisplaySettingsSection value={defaultScreenProfile()} modes={[{ id: 'fixed' }]} onChange={() => undefined} />));
    expect(element.querySelector('[value="fixed"]')).toBeNull();
  });

  it('reports mode changes to the host', () => {
    const element = document.createElement('div'); document.body.append(element);
    const root = createRoot(element); roots.push(root);
    let selected = '';
    act(() => root.render(<DisplaySettingsSection value={defaultScreenProfile()} modes={[{ id: 'a' }, { id: 'b' }]} onChange={(next) => { selected = next.virtualScreen.modeId; }} />));
    act(() => { const select = element.querySelector('select') as HTMLSelectElement; select.value = 'b'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(selected).toBe('b');
  });

  it('keeps Display, Terminal, and CRT independently controlled', () => {
    const element = document.createElement('div'); document.body.append(element);
    const root = createRoot(element); roots.push(root);
    const profile = defaultScreenProfile();
    let next = profile;
    let smooth = false;
    act(() => root.render(<><DisplaySettingsSection value={profile} modes={[{ id: 'a' }, { id: 'b' }]} onChange={(value) => { next = value; }} /><TerminalSettingsSection value={profile} fonts={['Consolas']} onChange={(value) => { next = value; }} smoothScrolling={{ enabled: false, tuiEnabled: true, onEnabledChange: (value) => { smooth = value; }, onTuiEnabledChange: () => undefined }} /><AdvancedCRTSettingsSection value={profile} onChange={(value) => { next = value; }} /></>));
    const [antiMoire, pixelSmoothing] = Array.from(element.querySelectorAll('.display-section input[type="checkbox"]')) as HTMLInputElement[];
    act(() => antiMoire.click());
    expect(next.crt.antiAliasedPixels).toBe(!profile.crt.antiAliasedPixels);
    act(() => pixelSmoothing.click());
    expect(next.crt.pixelSmoothing).toBe(!profile.crt.pixelSmoothing);
    const smoothToggle = Array.from(element.querySelectorAll('.terminal-section input[type="checkbox"]')).at(0) as HTMLInputElement;
    act(() => smoothToggle.click());
    expect(smooth).toBe(true);
    const colorMode = element.querySelector('[data-testid="color-mode-select"]') as HTMLSelectElement;
    act(() => { colorMode.value = 'green'; colorMode.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(next.crt.colorMode).toBe('green');
  });

  it('marks every CRT subsection for shared styling', () => {
    const element = document.createElement('div'); document.body.append(element);
    const root = createRoot(element); roots.push(root);
    act(() => root.render(<AdvancedCRTSettingsSection value={defaultScreenProfile()} onChange={() => undefined} />));
    expect(element.querySelectorAll('.svs-colors-group, .svs-final-image-group, .svs-geometry-group, .svs-raster-group, .svs-light-group, .svs-temporal-group, .svs-bezel-section')).toHaveLength(7);
  });

  it('groups custom palettes after built-ins and retains a missing saved reference', () => {
    replaceCustomColorProfiles([{ id: 'lua:users', label: "User's", foreground: '#eeeeee', background: '#111111', colors: Array(16).fill('#123456') }]);
    const element = document.createElement('div'); document.body.append(element);
    const root = createRoot(element); roots.push(root);
    const profile = { ...defaultScreenProfile(), terminal: { ...defaultScreenProfile().terminal, colorProfile: 'lua:missing' as const } };
    act(() => root.render(<TerminalSettingsSection value={profile} fonts={[]} onChange={() => undefined} />));
    const select = element.querySelector('[data-testid="color-profile-select"]') as HTMLSelectElement;
    expect(Array.from(select.children).map((group) => (group as HTMLOptGroupElement).label)).toEqual(['Built-in palettes', 'User palettes']);
    expect(select.value).toBe('lua:missing');
    expect(select.querySelector('option[value="lua:missing"]')?.textContent).toContain('Missing palette');
    replaceCustomColorProfiles([]);
  });
});
