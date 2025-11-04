// Color utility functions for HSL manipulation

/**
 * Convert hex color to HSL
 * @param {string} hex - Hex color string (e.g., "#3b82f6" or "#7c3aed")
 * @returns {{h: number, s: number, l: number}} HSL object
 */
export function hexToHsl(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  
  return { h, s, l };
}

/**
 * Convert HSL to CSS string
 * @param {{h: number, s: number, l: number}} hsl - HSL object
 * @returns {string} CSS HSL string
 */
export function hslToString({ h, s, l }) {
  return `hsl(${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

/**
 * Create HSL with modified saturation
 * @param {{h: number, s: number, l: number}} hsl - Base HSL
 * @param {number} sat - New saturation (0-1)
 * @returns {{h: number, s: number, l: number}} Modified HSL
 */
export function withSaturation(hsl, sat) {
  return { ...hsl, s: Math.max(0, Math.min(1, sat)) };
}

/**
 * Create HSL with modified lightness
 * @param {{h: number, s: number, l: number}} hsl - Base HSL
 * @param {number} light - New lightness (0-1)
 * @returns {{h: number, s: number, l: number}} Modified HSL
 */
export function withLightness(hsl, light) {
  return { ...hsl, l: Math.max(0, Math.min(1, light)) };
}

/**
 * Determine readable text color (black or white) based on background lightness
 * @param {{h: number, s: number, l: number}} hsl - Background HSL
 * @returns {string} Text color (#111111 or #ffffff)
 */
export function readableTextOn(hsl) {
  return hsl.l > 0.6 ? '#111111' : '#ffffff';
}

/**
 * Convert Tailwind color class to hex
 * Maps common Tailwind colors to their hex values
 */
const TAILWIND_TO_HEX = {
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-green-500': '#22c55e',
  'bg-orange-500': '#f97316',
  'bg-red-500': '#ef4444',
  'bg-yellow-500': '#eab308',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
  'bg-teal-500': '#14b8a6',
  'bg-cyan-500': '#06b6d4',
};

/**
 * Convert Tailwind color class to hex
 * @param {string} tailwindClass - Tailwind class (e.g., "bg-blue-500")
 * @returns {string} Hex color
 */
export function tailwindToHex(tailwindClass) {
  return TAILWIND_TO_HEX[tailwindClass] || TAILWIND_TO_HEX['bg-blue-500'];
}

