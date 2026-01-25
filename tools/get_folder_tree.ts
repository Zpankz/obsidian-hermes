
import { getFolderTree } from '../services/mockFiles';

export const declaration = {
  name: 'get_folder_tree',
  description: 'Lists all folders in the vault as a flat array to understand hierarchy. All paths are relative to vault root.'
};

export const instruction = `- get_folder_tree: Use this to see a simple list of all folders in the vault hierarchy. All paths are relative to vault root.`;

export const execute = async (args: any, callbacks: any): Promise<any> => {
  const folders = getFolderTree();
  callbacks.onSystem(`Folder Structure Scanned`, {
    name: 'get_folder_tree',
    filename: 'Folder Tree',
    files: folders
  });
  return { folders };
};
