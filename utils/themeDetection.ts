/**
 * Theme detection utilities for Obsidian
 * Helps determine if Obsidian is in light or dark mode
 */

import { isObsidian } from './environment';

export interface ThemeInfo {
  isDark: boolean;
  isLight: boolean;
  themeName: string;
}

/**
 * Detects the current Obsidian theme (light/dark)
 * Works both in Obsidian environment and standalone mode
 */
export function detectTheme(): ThemeInfo {
  // Check if we're in Obsidian environment
  const inObsidian = isObsidian();
  
  if (inObsidian) {
    // In Obsidian, check the body class or CSS variables
    const body = document.body;
    const isDark = body.classList.contains('theme-dark') || 
                  getComputedStyle(document.documentElement).getPropertyValue('--background-primary').trim().startsWith('#');
    
    return {
      isDark,
      isLight: !isDark,
      themeName: isDark ? 'dark' : 'light'
    };
  } else {
    // In standalone mode, use prefers-color-scheme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    return {
      isDark,
      isLight: !isDark,
      themeName: isDark ? 'dark' : 'light'
    };
  }
}

/**
 * Listen for theme changes in Obsidian
 */
export function onThemeChange(callback: (themeInfo: ThemeInfo) => void): () => void {
  const inObsidian = isObsidian();
  
  if (inObsidian) {
    // In Obsidian, watch for class changes on body
    const observer = new MutationObserver(() => {
      callback(detectTheme());
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Also listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => callback(detectTheme());
    mediaQuery.addEventListener('change', handleChange);
    
    // Return cleanup function
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  } else {
    // In standalone mode, just listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => callback(detectTheme());
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }
}

/**
 * Apply theme class to root element for CSS targeting
 */
export function applyThemeClass(): void {
  const theme = detectTheme();
  const root = document.querySelector<HTMLElement>('.hermes-root');
  
  if (root) {
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${theme.themeName}`);
  }
}

/**
 * Get appropriate text color based on theme
 */
export function getAdaptiveTextColor(lightColor: string, darkColor: string): string {
  const theme = detectTheme();
  return theme.isDark ? darkColor : lightColor;
}

/**
 * Get appropriate background color based on theme
 */
export function getAdaptiveBgColor(lightColor: string, darkColor: string): string {
  const theme = detectTheme();
  return theme.isDark ? darkColor : lightColor;
}
