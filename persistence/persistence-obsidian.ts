import type { Plugin } from 'obsidian';

import type { Plugin } from 'obsidian';
import type { AppSettings } from '../types';

let obsidianPlugin: Plugin | null = null;
let cachedSettings: AppSettings | null = null;

export const setObsidianPlugin = (plugin: Plugin) => {
  obsidianPlugin = plugin;
};

export const getObsidianPlugin = (): Plugin | null => obsidianPlugin;

export const saveFiles = (_files: Record<string, string>): Promise<void> => {
  // For Obsidian, we could use the vault API in the future
  // For now, this is a placeholder that does nothing since files are managed by Obsidian
  console.warn('saveFiles called in Obsidian mode - files are managed by Obsidian vault');
  return Promise.resolve();
};

export const loadFiles = (): Promise<Record<string, string> | null> => {
  // For Obsidian, files are managed by the vault
  // Return null to indicate no local file storage
  return Promise.resolve(null);
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  try {
    const toSave = { ...settings };
    cachedSettings = toSave;
    
    if (obsidianPlugin) {
      await obsidianPlugin.saveData(toSave);
    }
  } catch (error) {
    console.error('Failed to save settings', error);
  }
};

export const loadAppSettings = (): AppSettings | null => {
  if (cachedSettings) return cachedSettings;
  return null;
};

export const loadAppSettingsAsync = async (): Promise<AppSettings | null> => {
  if (obsidianPlugin) {
    try {
      const data = await obsidianPlugin.loadData();
      cachedSettings = (data || {}) as AppSettings;
      
      // If plugin has its own settings, merge them
      const pluginSettings = (obsidianPlugin as { settings?: AppSettings }).settings;
      if (pluginSettings) {
        cachedSettings = { ...cachedSettings, ...pluginSettings };
      }
      
      return cachedSettings;
    } catch (error) {
      console.error('Failed to load settings from Obsidian', error);
      return null;
    }
  }
  
  return null;
};

export const reloadAppSettings = async (): Promise<AppSettings | null> => {
  // Clear cache and reload from Obsidian
  cachedSettings = null;
  return await loadAppSettingsAsync();
};

export const saveChatHistory = async (history: string[]): Promise<void> => {
  try {
    if (obsidianPlugin) {
      const currentData = (await obsidianPlugin.loadData()) || {};
      const nextData = { ...currentData, chatHistory: history };
      await obsidianPlugin.saveData(nextData);
    }
  } catch (error) {
    console.error('Failed to save chat history', error);
  }
};

export const loadChatHistory = (): string[] => {
  if (cachedSettings?.chatHistory) {
    return cachedSettings.chatHistory;
  }
  return [];
};
