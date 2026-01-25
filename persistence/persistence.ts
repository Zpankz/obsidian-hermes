import type { Plugin } from 'obsidian';
import * as localStoragePersistence from '../persistence/persistence-local-storage';
import * as obsidianPersistence from '../persistence/persistence-obsidian';

let useObsidian = false;

export const setObsidianPlugin = (plugin: Plugin) => {
  useObsidian = true;
  obsidianPersistence.setObsidianPlugin(plugin);
};

export const getObsidianPlugin = (): Plugin | null => {
  return obsidianPersistence.getObsidianPlugin();
};

export const saveFiles = async (files: Record<string, string>): Promise<void> => {
  if (useObsidian) {
    return obsidianPersistence.saveFiles(files);
  }
  return localStoragePersistence.saveFiles(files);
};

export const loadFiles = async (): Promise<Record<string, string> | null> => {
  if (useObsidian) {
    return obsidianPersistence.loadFiles();
  }
  return localStoragePersistence.loadFiles();
};

export const saveAppSettings = async (settings: any): Promise<void> => {
  if (useObsidian) {
    return obsidianPersistence.saveAppSettings(settings);
  }
  return localStoragePersistence.saveAppSettings(settings);
};

export const loadAppSettings = (): any | null => {
  if (useObsidian) {
    return obsidianPersistence.loadAppSettings();
  }
  return localStoragePersistence.loadAppSettings();
};

export const loadAppSettingsAsync = async (): Promise<any | null> => {
  if (useObsidian) {
    return obsidianPersistence.loadAppSettingsAsync();
  }
  return localStoragePersistence.loadAppSettingsAsync();
};

export const reloadAppSettings = async (): Promise<any | null> => {
  if (useObsidian) {
    return obsidianPersistence.reloadAppSettings();
  }
  return localStoragePersistence.reloadAppSettings();
};

export const saveChatHistory = async (history: string[]): Promise<void> => {
  if (useObsidian) {
    return obsidianPersistence.saveChatHistory(history);
  }
  return localStoragePersistence.saveChatHistory(history);
};

export const loadChatHistory = (): string[] => {
  if (useObsidian) {
    return obsidianPersistence.loadChatHistory();
  }
  return localStoragePersistence.loadChatHistory();
};
