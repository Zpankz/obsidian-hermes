import type { AppSettings } from '../types';

const FILES_KEY = 'hermes_os_filesystem';
const SETTINGS_KEY = 'hermes_os_settings';
const CHAT_HISTORY_KEY = 'hermes_os_chat_history';

const memoryStore = new Map<string, string>();
let cachedSettings: AppSettings | null = null;

export const saveFiles = (files: Record<string, string>): Promise<void> => {
  memoryStore.set(FILES_KEY, JSON.stringify(files));
  return Promise.resolve();
};

export const loadFiles = (): Promise<Record<string, string> | null> => {
  const data = memoryStore.get(FILES_KEY);
  if (!data) return Promise.resolve(null);
  try {
    return Promise.resolve(JSON.parse(data) as Record<string, string>);
  } catch (error) {
    console.error('Failed to parse persistent storage', error);
    return Promise.resolve(null);
  }
};

export const saveAppSettings = (settings: AppSettings): Promise<void> => {
  try {
    const toSave = { ...settings };
    cachedSettings = toSave;
    memoryStore.set(SETTINGS_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save settings', error);
  }
  return Promise.resolve();
};

export const loadAppSettings = (): AppSettings | null => {
  if (cachedSettings) return cachedSettings;

  const data = memoryStore.get(SETTINGS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AppSettings;
  } catch (error) {
    console.error('Failed to load settings', error);
    return null;
  }
};

export const loadAppSettingsAsync = (): Promise<AppSettings | null> => {
  return Promise.resolve(loadAppSettings());
};

export const reloadAppSettings = (): Promise<AppSettings | null> => {
  cachedSettings = null;
  return loadAppSettingsAsync();
};

export const saveChatHistory = (history: string[]): Promise<void> => {
  try {
    memoryStore.set(CHAT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save chat history', error);
  }
  return Promise.resolve();
};

export const loadChatHistory = (): string[] => {
  const data = memoryStore.get(CHAT_HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as string[];
  } catch (error) {
    console.error('Failed to load chat history', error);
    return [];
  }
};
