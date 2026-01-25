/**
 * Environment detection utilities
 * Helps determine if the code is running in Obsidian vs standalone mode
 */

/**
 * Detects if the code is running inside Obsidian
 * @returns true if running in Obsidian, false if standalone
 */
export function isObsidian(): boolean {
  // Check if we're in Obsidian environment
  // @ts-ignore - Obsidian global app
  return typeof (globalThis as any).app !== 'undefined' && (globalThis as any).app?.vault !== undefined;
}

/**
 * Gets the Obsidian app instance if available
 * @returns Obsidian app instance or null
 */
export function getObsidianApp(): any {
  if (isObsidian()) {
    // @ts-ignore - Obsidian global app
    return (globalThis as any).app;
  }
  return null;
}

/**
 * Checks if Obsidian API is available
 * @returns true if Obsidian API methods are available
 */
export function hasObsidianAPI(): boolean {
  const app = getObsidianApp();
  return app && typeof app.vault !== 'undefined' && typeof app.workspace !== 'undefined';
}

/**
 * Gets the current vault if in Obsidian
 * @returns Obsidian vault or null
 */
export function getVault(): any {
  const app = getObsidianApp();
  return app?.vault || null;
}

/**
 * Gets the current workspace if in Obsidian
 * @returns Obsidian workspace or null
 */
export function getWorkspace(): any {
  const app = getObsidianApp();
  return app?.workspace || null;
}

/**
 * Environment type enum
 */
export enum Environment {
  OBSIDIAN = 'obsidian',
  STANDALONE = 'standalone'
}

/**
 * Gets the current environment type
 * @returns Environment enum value
 */
export function getEnvironment(): Environment {
  return isObsidian() ? Environment.OBSIDIAN : Environment.STANDALONE;
}
