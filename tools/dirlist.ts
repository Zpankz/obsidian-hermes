import { getDirectoryList } from '../services/mockFiles';
import { ToolData } from '../types';

export const declaration = {
  name: 'dirlist',
  description: 'Lists only directory structure, ignoring files, to understand vault hierarchy. All paths are relative to vault root.'
};

export const instruction = `- dirlist: Use this to see the pure directory structure of the vault without any file information. All paths are relative to vault root.`;

export const execute = async (args: any, callbacks: any): Promise<any> => {
  const directories = getDirectoryList();
  callbacks.onSystem(`Directory Structure Scanned`, {
    name: 'dirlist',
    filename: 'Directory List',
    directoryInfo: directories.map(dir => ({ ...dir, hasChildren: dir.children.length > 0 }))
  });
  return { directories };
};
