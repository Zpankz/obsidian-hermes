
import { getFolderTree } from '../services/vaultOperations';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

export const declaration = {
  name: 'get_folder_tree',
  description: 'Lists all folders in the vault as a flat array to understand hierarchy. All paths are relative to vault root.'
};

export const instruction = `- get_folder_tree: Use this to see a simple list of all folders in the vault hierarchy. All paths are relative to vault root.`;

export const execute = (_args: ToolArgs, callbacks: ToolCallbacks): Promise<{ folders: string[] }> => {
  const folders = getFolderTree();
  callbacks.onSystem('Folder structure scanned', {
    name: 'get_folder_tree',
    filename: 'Folder Tree',
    files: folders
  });
  return Promise.resolve({ folders });
};
