import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultScreenProfile } from '../src/core/profile';
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
    const [antiMoire, passThroughSmoothing] = Array.from(element.querySelectorAll('.display-section input[type="checkbox"]')) as HTMLInputElement[];
    act(() => antiMoire.click());
    expect(next.crt.antiAliasedPixels).toBe(!profile.crt.antiAliasedPixels);
    act(() => passThroughSmoothing.click());
    expect(next.crt.passThroughSmoothing).toBe(!profile.crt.passThroughSmoothing);
    const smoothToggle = Array.from(element.querySelectorAll('.terminal-section input[type="checkbox"]')).at(0) as HTMLInputElement;
    act(() => smoothToggle.click());
    expect(smooth).toBe(true);
    const colorMode = element.querySelector('[data-testid="color-mode-select"]') as HTMLSelectElement;
    act(() => { colorMode.value = 'green'; colorMode.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(next.crt.colorMode).toBe('green');
  });
});
