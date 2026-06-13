import { create } from 'zustand';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'fts-theme';

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

function getInitialTheme(): Theme {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
  toggleTheme: () => {
    get().setTheme(get().theme === 'light' ? 'dark' : 'light');
  },
}));

/** Sync the store with the theme the inline script already applied. Call once at startup. */
export function initTheme(): void {
  useThemeStore.getState().setTheme(getInitialTheme());
}
