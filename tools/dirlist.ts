import { getDirectoryList } from '../services/vaultOperations';
import type { ToolCallbacks, DirectoryInfoItem } from '../types';

type ToolArgs = Record<string, unknown>;

export const declaration = {
  name: 'dirlist',
  description: 'Lists only directory structure, ignoring files, to understand vault hierarchy. All paths are relative to vault root.'
};

export const instruction = `- dirlist: Use this to see the pure directory structure of the vault without any file information. All paths are relative to vault root.`;

export const execute = (_args: ToolArgs, callbacks: ToolCallbacks): Promise<{ directories: DirectoryInfoItem[] }> => {
  const directories = getDirectoryList();
  const directoryInfo: DirectoryInfoItem[] = directories.map(dir => ({
    path: dir.path || '/',
    type: 'directory',
    hasChildren: dir.children.length > 0
  }));
  callbacks.onSystem('Directory structure scanned', {
    name: 'dirlist',
    filename: 'Directory List',
    directoryInfo
  });
  return Promise.resolve({ directories: directoryInfo });
};
