
import { getFolderTree } from '../services/vaultOperations';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

export const declaration = {
  name: 'get_folder_tree',
  description: 'Lists all folders in the vault as a flat array to understand hierarchy, or lists all files (notes and other files) in a specific folder. All paths are relative to vault root.',
  parameters: {
    folder_path: {
      type: 'string',
      description: 'Optional: Path to a specific folder to query. If provided, returns all files (notes, images, PDFs, etc.) in that folder and its subfolders. If not provided, returns all folders in the vault.',
      required: false
    }
  }
};

export const instruction = `- get_folder_tree: Use this to see a simple list of all folders in the vault hierarchy. Optionally provide a folder_path parameter to query all files (notes, images, PDFs, etc.) in a specific folder and its subfolders. All paths are relative to vault root.`;

export const execute = (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ files: string[] }> => {
  const folderPath = args.folder_path as string | undefined;
  const files = getFolderTree(folderPath);
  
  const operation = folderPath ? `Folder contents queried for: ${folderPath}` : 'Folder structure scanned';
  const filename = folderPath ? `Folder Contents: ${folderPath}` : 'Folder Tree';
  
  callbacks.onSystem(operation, {
    name: 'get_folder_tree',
    filename,
    files
  });
  return Promise.resolve({ files });
};
