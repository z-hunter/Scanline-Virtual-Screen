import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultScreenProfile } from '../src/core/profile';
import { DisplaySettingsSection } from '../src/react/ScreenProfileSections';

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
});
