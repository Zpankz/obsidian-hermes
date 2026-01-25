import { getDirectoryList } from '../services/mockFiles';
import { ToolData } from '../types';

export const declaration = {
  name: 'dirlist',
  description: 'Lists only directory structure, ignoring files, to understand vault hierarchy.'
};

export const instruction = `- dirlist: Use this to see the pure directory structure of the vault without any file information.`;

export const execute = async (args: any, callbacks: any): Promise<any> => {
  const directories = getDirectoryList();
  callbacks.onSystem(`Directory Structure Scanned`, {
    name: 'dirlist',
    filename: 'Directory List',
    files: directories
  });
  return { directories };
};
