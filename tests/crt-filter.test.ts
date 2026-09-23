import { describe, expect, it } from 'vitest';
import { breathingExpansion, channelSwitchProgress, crtEffectMask, persistenceDecay, phosphorMaskScale } from '../src/core/CRTFilter.js';
import { DEFAULT_CRT_SETTINGS } from '../src/core/defaults.js';

describe('CRT helpers', () => {
  it('decays phosphor history by elapsed time rather than render frames', () => {
    expect(persistenceDecay(1, 1 / 60).decay).toBeCloseTo(0.99432, 5);
    expect(persistenceDecay(1, 1).decay).toBeLessThan(0.72);
  });

  it('compiles only the enabled heavy CRT effects', () => {
    expect(crtEffectMask({ persistence: 0, bloom: 0, glow: 0, imperfectSignal: 0, humBar: 0, channelSwitchEffect: false })).toBe(0);
    expect(crtEffectMask({ persistence: 1, bloom: 0, glow: 0, imperfectSignal: 0, humBar: 0, channelSwitchEffect: false })).toBe(1);
    expect(crtEffectMask({ persistence: 0, bloom: 1, glow: 0, imperfectSignal: 0, humBar: 0, channelSwitchEffect: false })).toBe(2);
    expect(crtEffectMask({ persistence: 0, bloom: 0, glow: 1, imperfectSignal: 0, humBar: 0, channelSwitchEffect: false })).toBe(4);
    expect(crtEffectMask({ persistence: 1, bloom: 1, glow: 1, imperfectSignal: 0, humBar: 0, channelSwitchEffect: false })).toBe(7);
    expect(crtEffectMask({ persistence: 0, bloom: 0, glow: 0, imperfectSignal: 1, humBar: 0, channelSwitchEffect: false })).toBe(8);
    expect(crtEffectMask({ persistence: 0, bloom: 0, glow: 0, imperfectSignal: 0, humBar: 1, channelSwitchEffect: false })).toBe(16);
    expect(crtEffectMask({ persistence: 0, bloom: 0, glow: 0, imperfectSignal: 0, humBar: 0, channelSwitchEffect: true })).toBe(32);
    expect(crtEffectMask({ persistence: 0, bloom: 0, glow: 0, ambientGlassLight: 1, imperfectSignal: 0, humBar: 0, channelSwitchEffect: false })).toBe(64);
    expect(crtEffectMask({ persistence: 0, bloom: 0, glow: 0, bezelHighlight: 1, imperfectSignal: 0, humBar: 0, channelSwitchEffect: false })).toBe(256);
    expect(crtEffectMask({ persistence: 0, bloom: 0, glow: 0, reflexBar: 1, imperfectSignal: 0, humBar: 0, channelSwitchEffect: false })).toBe(512);
    expect(crtEffectMask({ persistence: 0, glow: 0, imperfectSignal: 0, humBar: 0, channelSwitchEffect: false, reflexBarEnabled: false, reflexBar: 1 })).toBe(0);
  });

  it('keeps final image correction out of HV breathing geometry', () => {
    expect(breathingExpansion(0.5, 1)).toBeCloseTo(0.0276);
    expect(breathingExpansion(Number.NaN, 1)).toBeCloseTo(0.010272);
  });

  it('eases the channel switch roll to a complete screen turn', () => {
    expect(channelSwitchProgress(100, 100)).toBe(0);
    expect(channelSwitchProgress(100, 310)).toBe(0.5);
    expect(channelSwitchProgress(100, 520)).toBe(1);
  });

  it('keeps default CRT parameters without the removed hum setting', () => {
    expect(DEFAULT_CRT_SETTINGS.curvature).toBe(0.13);
    expect(DEFAULT_CRT_SETTINGS.scanlineCount).toBe(270);
    expect(DEFAULT_CRT_SETTINGS.breathing).toBe(0.5);
    expect(DEFAULT_CRT_SETTINGS.scanlineIntensity).toBe(0.5);
    expect(DEFAULT_CRT_SETTINGS.beamModulation).toBe(0.5);
    expect(DEFAULT_CRT_SETTINGS.imperfectSignal).toBe(0);
    expect(DEFAULT_CRT_SETTINGS.humBar).toBe(0);
    expect(DEFAULT_CRT_SETTINGS.ambientGlassLight).toBe(0);
    expect(DEFAULT_CRT_SETTINGS.bezelHighlight).toBe(0.35);
    expect(DEFAULT_CRT_SETTINGS.bezelThickness).toBe(0);
    expect(DEFAULT_CRT_SETTINGS.reflexBarEnabled).toBe(false);
    expect(DEFAULT_CRT_SETTINGS.reflexBar).toBe(0.35);
    expect(DEFAULT_CRT_SETTINGS.reflexBarPosY).toBe(0.09);
    expect(DEFAULT_CRT_SETTINGS.reflexBarWidth).toBe(1);
    expect(DEFAULT_CRT_SETTINGS.reflexBarHeight).toBe(0.23);
    expect(DEFAULT_CRT_SETTINGS.channelSwitchEffect).toBe(true);
    expect(DEFAULT_CRT_SETTINGS.glow).toBe(1);
    expect(DEFAULT_CRT_SETTINGS.glowRadius).toBe(3);
    expect(DEFAULT_CRT_SETTINGS.persistence).toBe(0.9);
    expect(DEFAULT_CRT_SETTINGS.persistenceEnergy).toBe(0.09);
    expect(DEFAULT_CRT_SETTINGS.persistenceIntensity).toBe(1.8);
    expect(DEFAULT_CRT_SETTINGS.imageBrightness).toBe(1);
    expect(DEFAULT_CRT_SETTINGS.imageContrast).toBe(1);
    expect(DEFAULT_CRT_SETTINGS.backgroundDesaturation).toBe(0.5);
    expect(DEFAULT_CRT_SETTINGS.bloomAlgorithm).toBe('spiral');
    expect(DEFAULT_CRT_SETTINGS.colorMode).toBe('color');
    expect(DEFAULT_CRT_SETTINGS.maskType).toBe('off');
    expect(DEFAULT_CRT_SETTINGS.maskStrength).toBe(0.3);
    expect(DEFAULT_CRT_SETTINGS.cursorStyle).toBe('block');
    expect(DEFAULT_CRT_SETTINGS.cursorBrightness).toBe(0);
    expect(DEFAULT_CRT_SETTINGS.crtEmulation).toBe(true);
    expect(DEFAULT_CRT_SETTINGS.aberration).toBe(0);
    expect(DEFAULT_CRT_SETTINGS.aberrationFalloff).toBe(2);
  });

  it('uses an integer phosphor scale near 640 triads across', () => {
    expect(phosphorMaskScale(1920)).toBe(1);
    expect(phosphorMaskScale(3840)).toBe(2);
    expect(phosphorMaskScale(5760)).toBe(3);
    expect(phosphorMaskScale(1)).toBe(1);
    expect(phosphorMaskScale(9999)).toBe(3);
  });
});
