/**
 * Color Utility Functions for Automatic Text Color Adaptation
 *
 * Implements WCAG 2.1 luminance calculation to determine optimal text color
 * (black or white) based on background brightness for accessibility compliance.
 */

/**
 * Converts hex color to RGB values
 * Supports both 3-digit (#FFF) and 6-digit (#FFFFFF) hex codes
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle 3-digit hex codes (#FFF -> #FFFFFF)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return null;
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Calculate relative luminance using WCAG 2.1 formula
 * Formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
 * where R, G, B are sRGB values converted to linear RGB
 *
 * Returns value between 0 (darkest) and 1 (brightest)
 */
export function getLuminance(r: number, g: number, b: number): number {
  // Convert 8-bit RGB to linear RGB
  const toLinear = (channel: number): number => {
    const c = channel / 255;
    return c <= 0.03928
      ? c / 12.92
      : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);

  // Calculate relative luminance (WCAG 2.1 standard)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Parse various color formats to RGB
 * Supports: hex (#FFFFFF), rgb(255,255,255), rgba(255,255,255,1), named colors
 */
export function parseColor(color: string): { r: number; g: number; b: number } | null {
  color = color.trim();

  // Handle hex colors
  if (color.startsWith('#')) {
    return hexToRgb(color);
  }

  // Handle rgb() and rgba()
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  // Handle named colors (common cases)
  const namedColors: Record<string, string> = {
    white: '#FFFFFF',
    black: '#000000',
    gray: '#808080',
    grey: '#808080',
    blue: '#0000FF',
    red: '#FF0000',
    green: '#008000',
    yellow: '#FFFF00',
    transparent: '#FFFFFF', // Assume white background for transparent
  };

  if (namedColors[color.toLowerCase()]) {
    return hexToRgb(namedColors[color.toLowerCase()]);
  }

  return null;
}

/**
 * Get optimal text contrast color (black or white) for a given background
 * Uses WCAG 2.1 luminance threshold of 0.5
 *
 * @param backgroundColor - Color in any format (hex, rgb, rgba, named)
 * @returns 'black' for light backgrounds, 'white' for dark backgrounds
 */
export function getContrastColor(backgroundColor: string): 'black' | 'white' {
  const rgb = parseColor(backgroundColor);

  // Fallback to black if color parsing fails
  if (!rgb) {
    console.warn(`Failed to parse color: ${backgroundColor}, defaulting to black text`);
    return 'black';
  }

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);

  // WCAG threshold: luminance > 0.5 = light background = use black text
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Get background color from section configuration
 * Priority: backgroundImage > gradient > solid color
 *
 * @param solidColor - Preset background color (white, gray, blue, etc.)
 * @param backgroundImage - Optional custom background image URL
 * @param gradient - Optional gradient overlay configuration
 * @returns Effective background color for contrast calculation
 */
export function getEffectiveBackgroundColor(
  solidColor?: string,
  backgroundImage?: string,
  gradient?: {
    enabled: boolean;
    type: 'preset' | 'custom';
    preset?: {
      color: string;
      startOpacity: number;
      endOpacity: number;
    };
  }
): string {
  // Priority 1: Gradient overlay (most visible to user)
  if (gradient?.enabled && gradient.type === 'preset' && gradient.preset) {
    // Use the dominant color (highest opacity endpoint)
    const { color, startOpacity, endOpacity } = gradient.preset;
    const dominantOpacity = Math.max(startOpacity, endOpacity);

    // If gradient is very transparent (<30%), fall through to background
    if (dominantOpacity < 30) {
      // Continue to next priority
    } else {
      return color;
    }
  }

  // Priority 2: Background image (assume dark for safety)
  if (backgroundImage) {
    // Safe default: assume most hero/footer images are dark
    // Return dark gray to indicate dark image → white text
    return '#333333';
  }

  // Priority 3: Solid background color
  // Pass through hex/rgb colors directly
  if (solidColor && (solidColor.startsWith('#') || solidColor.startsWith('rgb'))) {
    return solidColor;
  }

  const colorMap: Record<string, string> = {
    white: '#FFFFFF',
    gray: '#F8F9FA',
    grey: '#F8F9FA',
    blue: '#1E3A5F',
    lightblue: '#E8F4FD',
    transparent: '#FFFFFF',
  };

  return colorMap[solidColor?.toLowerCase() || 'white'] || '#FFFFFF';
}

/**
 * Get Tailwind CSS classes for text color based on contrast
 *
 * @param contrastColor - 'black' or 'white'
 * @returns Object with Tailwind classes for text, muted text, and links
 */
export function getTextColorClasses(contrastColor: 'black' | 'white') {
  if (contrastColor === 'white') {
    return {
      text: 'text-white',
      muted: 'text-white-50',
      link: 'text-white text-decoration-none',
      cursor: 'adaptive-cursor-light',
    };
  } else {
    return {
      text: 'text-dark',
      muted: 'text-muted',
      link: 'text-dark text-decoration-none',
      cursor: 'adaptive-cursor-dark',
    };
  }
}
