/**
 * Unit tests for color utility functions
 * Tests WCAG 2.1 luminance calculations and contrast color detection
 */

import {
  hexToRgb,
  getLuminance,
  parseColor,
  getContrastColor,
  getEffectiveBackgroundColor,
} from '../color-utils';

describe('hexToRgb', () => {
  test('converts 6-digit hex to RGB', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#FF5733')).toEqual({ r: 255, g: 87, b: 51 });
  });

  test('converts 3-digit hex to RGB', () => {
    expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#F53')).toEqual({ r: 255, g: 85, b: 51 });
  });

  test('handles hex with # prefix', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });

  test('handles hex without # prefix', () => {
    expect(hexToRgb('FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });

  test('returns null for invalid hex', () => {
    expect(hexToRgb('invalid')).toBeNull();
    expect(hexToRgb('#GGGGGG')).toBeNull();
    expect(hexToRgb('#12')).toBeNull();
  });
});

describe('getLuminance', () => {
  test('pure white has luminance close to 1', () => {
    const luminance = getLuminance(255, 255, 255);
    expect(luminance).toBeCloseTo(1, 1);
  });

  test('pure black has luminance close to 0', () => {
    const luminance = getLuminance(0, 0, 0);
    expect(luminance).toBeCloseTo(0, 2);
  });

  test('medium gray has luminance around 0.5', () => {
    const luminance = getLuminance(128, 128, 128);
    expect(luminance).toBeGreaterThan(0.1);
    expect(luminance).toBeLessThan(0.9);
  });

  test('Dark blue (#1E3A5F) is dark', () => {
    const luminance = getLuminance(30, 58, 95);
    expect(luminance).toBeLessThan(0.5);
  });

  test('light blue (#E8F4FD) is light', () => {
    const luminance = getLuminance(232, 244, 253);
    expect(luminance).toBeGreaterThan(0.5);
  });
});

describe('parseColor', () => {
  test('parses hex colors', () => {
    expect(parseColor('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('parses rgb() format', () => {
    expect(parseColor('rgb(255, 255, 255)')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('rgb(0,0,0)')).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('parses rgba() format (ignores alpha)', () => {
    expect(parseColor('rgba(255, 255, 255, 0.5)')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('rgba(0, 0, 0, 1)')).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('parses named colors', () => {
    expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseColor('gray')).toEqual({ r: 128, g: 128, b: 128 });
  });

  test('returns null for invalid colors', () => {
    expect(parseColor('invalid')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

describe('getContrastColor', () => {
  test('pure white background returns black text', () => {
    expect(getContrastColor('#FFFFFF')).toBe('black');
    expect(getContrastColor('white')).toBe('black');
  });

  test('pure black background returns white text', () => {
    expect(getContrastColor('#000000')).toBe('white');
    expect(getContrastColor('black')).toBe('white');
  });

  test('light backgrounds return black text', () => {
    expect(getContrastColor('#F8F9FA')).toBe('black'); // Bootstrap gray-100
    expect(getContrastColor('#E8F4FD')).toBe('black'); // Light blue
  });

  test('dark backgrounds return white text', () => {
    expect(getContrastColor('#1E3A5F')).toBe('white'); // Dark blue
    expect(getContrastColor('#333333')).toBe('white'); // Dark gray
  });

  test('fallback to black for invalid colors', () => {
    expect(getContrastColor('invalid')).toBe('black');
  });
});

describe('getEffectiveBackgroundColor', () => {
  test('returns gradient color when gradient enabled', () => {
    const result = getEffectiveBackgroundColor(
      '#FFFFFF',
      undefined,
      {
        enabled: true,
        type: 'preset',
        preset: {
          color: '#000000',
          startOpacity: 70,
          endOpacity: 0,
        },
      }
    );
    expect(result).toBe('#000000');
  });

  test('returns dark gray for background images (safe default)', () => {
    const result = getEffectiveBackgroundColor('#FFFFFF', '/images/hero.jpg', undefined);
    expect(result).toBe('#333333');
  });

  test('returns solid color when no gradient or image', () => {
    expect(getEffectiveBackgroundColor('white')).toBe('#FFFFFF');
    expect(getEffectiveBackgroundColor('gray')).toBe('#F8F9FA');
    expect(getEffectiveBackgroundColor('blue')).toBe('#1E3A5F');
  });

  test('falls through transparent gradients to background', () => {
    const result = getEffectiveBackgroundColor(
      'blue',
      undefined,
      {
        enabled: true,
        type: 'preset',
        preset: {
          color: '#FFFFFF',
          startOpacity: 10, // Very transparent
          endOpacity: 0,
        },
      }
    );
    expect(result).toBe('#1E3A5F'); // Falls through to blue background
  });
});
