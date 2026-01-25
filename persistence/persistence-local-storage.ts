const FILES_KEY = 'hermes_os_filesystem';
const SETTINGS_KEY = 'hermes_os_settings';
const CHAT_HISTORY_KEY = 'hermes_os_chat_history';

let cachedSettings: any = null;

export const saveFiles = async (files: Record<string, string>): Promise<void> => {
  localStorage.setItem(FILES_KEY, JSON.stringify(files));
};

export const loadFiles = async (): Promise<Record<string, string> | null> => {
  const data = localStorage.getItem(FILES_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse persistent storage', e);
    return null;
  }
};

export const saveAppSettings = async (settings: any): Promise<void> => {
  try {
    const toSave = { ...settings };
    cachedSettings = toSave;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
};

export const loadAppSettings = (): any | null => {
  if (cachedSettings) return cachedSettings;
  
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load settings', e);
    return null;
  }
};

export const loadAppSettingsAsync = async (): Promise<any | null> => {
  if (cachedSettings) return cachedSettings;
  return loadAppSettings();
};

export const reloadAppSettings = async (): Promise<any | null> => {
  // Clear cache and reload from localStorage
  cachedSettings = null;
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    cachedSettings = parsed;
    return parsed;
  } catch (e) {
    console.error('Failed to load settings', e);
    return null;
  }
};

export const saveChatHistory = async (history: string[]): Promise<void> => {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save chat history', e);
  }
};

export const loadChatHistory = (): string[] => {
  const data = localStorage.getItem(CHAT_HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load chat history', e);
    return [];
  }
};
