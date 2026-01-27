import { getObsidianApp } from '../utils/environment';
import type { ToolCallbacks } from '../types';
import { getObsidianApp } from '../utils/environment';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'open_folder_in_system',
  description: 'Opens the specified folder in the system file browser/finder.'
};

export const instruction = `- open_folder_in_system: Use this to open a folder in the system file browser. Takes a folder path as argument (e.g., path: "documents/notes"). Use "." or empty path for vault root.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<unknown> => {
  const app = getObsidianApp();
  
  if (!app || !app.vault) {
    callbacks.onSystem('Error: Not running in Obsidian or vault unavailable', {
      name: 'open_folder_in_system',
      filename: 'System Browser',
      error: 'Obsidian vault not available'
    });
    return { error: 'Obsidian vault not available' };
  }

  try {
    const folderPath = getStringArg(args, 'path') || getStringArg(args, 'folder') || '.';
    const vault = app.vault;
    
    let targetPath: string;
    let targetName: string;
    
    if (folderPath === '.' || folderPath === '' || folderPath === '/') {
      // Open vault root
      targetPath = vault.adapter.getBasePath();
      targetName = 'Vault Root';
    } else {
      // Get the folder/file object
      const abstractFile = vault.getAbstractFileByPath(folderPath);
      
      if (!abstractFile) {
        callbacks.onSystem(`Path not found: ${folderPath}`, {
          name: 'open_folder_in_system',
          filename: 'System Browser',
          status: 'error',
          error: `Path "${folderPath}" does not exist in vault`
        });
        return { error: `Path "${folderPath}" does not exist in vault` };
      }
      
      if (abstractFile.extension !== undefined) {
        // It's a file, get its parent directory
        const parentPath = abstractFile.parent?.path || '';
        targetPath = parentPath ? 
          vault.adapter.getFullPath(parentPath) : 
          vault.adapter.getBasePath();
        targetName = abstractFile.parent?.name || 'Vault Root';
      } else {
        // It's a folder
        targetPath = vault.adapter.getFullPath(folderPath);
        targetName = abstractFile.name;
      }
    }

    // Use Obsidian's built-in method to reveal in system file manager
    // Obsidian provides a cross-platform way to do this
    if (app.vault.adapter.openPath) {
      // Use Obsidian's built-in openPath method
      await app.vault.adapter.openPath(targetPath);
    } else {
      const openWithDefaultApp = (app as { openWithDefaultApp?: (path: string) => Promise<void> | void }).openWithDefaultApp;
      if (openWithDefaultApp) {
        await openWithDefaultApp(targetPath);
      }
    }

    callbacks.onSystem(`Opened folder in system browser`, {
      name: 'open_folder_in_system',
      filename: targetName,
      status: 'success',
      folderPath: folderPath,
      systemPath: targetPath
    });

    return { 
      success: true, 
      folderPath: folderPath,
      systemPath: targetPath,
      targetName: targetName,
      message: `Folder "${targetName}" opened in system browser`
    };
    
  } catch (error) {
    callbacks.onSystem('Error opening folder in system browser', {
      name: 'open_folder_in_system',
      filename: 'System Browser',
      status: 'error',
      error: error.message || String(error)
    });
    return { error: error.message || String(error) };
  }
};
