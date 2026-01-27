
import { Type } from '@google/genai';
import { getVaultFiles } from '../services/vaultOperations';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getNumberArg = (args: ToolArgs, key: string, fallback?: number): number | undefined => {
  const value = args[key];
  if (typeof value === 'number') return value;
  return fallback;
};

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'list_vault_files',
  description: 'Lists markdown files in the vault with pagination and sorting. Essential for large vaults.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: { type: Type.NUMBER, description: 'Max number of files to return (default: 20)' },
      offset: { type: Type.NUMBER, description: 'Number of files to skip (default: 0)' },
      sortBy: { 
        type: Type.STRING, 
        enum: ['mtime', 'name', 'size'],
        description: 'Property to sort by. mtime is last modified time.'
      },
      sortOrder: { 
        type: Type.STRING, 
        enum: ['asc', 'desc'],
        description: 'Sort order (default: desc)'
      },
      filter: { 
        type: Type.STRING, 
        description: 'Optional text filter for path or filename.' 
      }
    }
  }
};

export const instruction = `- list_vault_files: Use this to explore large vaults. It supports paging and sorting. Default is most recently modified first.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<unknown> => {
  const limit = getNumberArg(args, 'limit');
  const offset = getNumberArg(args, 'offset', 0) ?? 0;
  const sortBy = getStringArg(args, 'sortBy') as 'mtime' | 'name' | 'size' | undefined;
  const sortOrder = getStringArg(args, 'sortOrder') as 'asc' | 'desc' | undefined;
  const filter = getStringArg(args, 'filter');
  const result = await getVaultFiles({ limit, offset, sortBy, sortOrder, filter });
  
  const displayNames = result.files.map(f => f.path);
  
  callbacks.onSystem(`Vault files (${offset}-${offset + result.files.length} of ${result.total})`, {
    name: 'list_vault_files',
    filename: 'Vault Explorer',
    files: displayNames
  });
  
  return result;
};
