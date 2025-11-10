// src/utils/theme.js

const THEME_CLASS_PREFIX = 'theme-';
const THEME_CLASSES = ['theme-ocean','theme-forest','theme-sunset','theme-slate','theme-contrast'];

let systemMedia = null;
const systemHandler = () => applyTheme('system');

function clearThemeClasses(root) {
  for (const cls of THEME_CLASSES) root.classList.remove(cls);
}

function ensureSystemListener(enabled) {
  if (typeof window === 'undefined' || !window.matchMedia) return;
  if (enabled) {
    if (!systemMedia) {
      systemMedia = window.matchMedia('(prefers-color-scheme: dark)');
      systemMedia.addEventListener('change', systemHandler);
    }
  } else if (systemMedia) {
    systemMedia.removeEventListener('change', systemHandler);
    systemMedia = null;
  }
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  clearThemeClasses(root);

  // Base dark/light handling
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else if (theme === 'system') {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    ensureSystemListener(true);
  } else {
    ensureSystemListener(false);
    // Named themes
    root.classList.remove('dark'); // named themes manage their own palette
    root.classList.add(`${THEME_CLASS_PREFIX}${theme}`);
  }

  if (theme !== 'system') {
    ensureSystemListener(false);
  }

  if (theme === 'system') {
    // Nothing else, handled above
  } else {
    // ensure theme class for named options already handled
  }

  try { localStorage.setItem('ui.theme', theme); } catch {}
}

export function initThemeFromStorage() {
  try {
    const saved = localStorage.getItem('ui.theme') || 'system';
    applyTheme(saved);
    if (saved === 'system') ensureSystemListener(true);
  } catch {}
}


