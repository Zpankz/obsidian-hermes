
import { listDirectory } from '../services/vaultOperations';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

export const declaration = {
  name: 'list_directory',
  description: 'Lists all available files in the vault using paths relative to vault root.'
};

export const instruction = `- list_directory: Use this to get an overview of the user's vault. All file paths are relative to vault root. Always call this if you are unsure of the available files.`;

export const execute = (_args: ToolArgs, callbacks: ToolCallbacks): Promise<{ files: string[] }> => {
  const files = listDirectory();
  callbacks.onSystem('Registry scanned', {
    name: 'list_directory',
    filename: 'Vault Root',
    files: files
  });
  return Promise.resolve({ files });
};
