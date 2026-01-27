import { Type } from '@google/genai';
import { createDirectory } from '../services/vaultOperations';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'create_directory',
  description: 'Create a new directory in the vault. Parent directories will be created automatically if they don\'t exist.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: 'Directory path relative to vault root (e.g., "projects/notes" or "archive" for root level)' }
    },
    required: ['path']
  }
};

export const instruction = `- create_directory: Use this to create new directories in the vault. All paths are relative to vault root. Parent directories are created automatically.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ status: string; path: string }> => {
  const path = getStringArg(args, 'path');
  if (!path) {
    throw new Error('Missing directory path');
  }
  await createDirectory(path);
  const dirName = path.split('/').pop() || path;
  const parentPath = path.replace(/[^/]+$/, '');
  
  callbacks.onSystem(`Created directory ${path}`, {
    name: 'create_directory',
    filename: path,
    displayFormat: `${parentPath}<span style="color: #10b981; font-weight: 600;">${dirName}</span>`,
    dropdown: false
  });
  // Don't automatically open the newly created directory
  // callbacks.onFileState(directoryPath, args.path);
  return { status: 'created', path };
};
