
import { Type } from '@google/genai';
import { searchFiles } from '../services/vaultOperations';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'search_keyword',
  description: 'Search for a keyword across all files in the vault.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      keyword: { type: Type.STRING, description: 'The text to search for' }
    },
    required: ['keyword']
  }
};

export const instruction = `- search_keyword: Fast plaintext search across all files.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ results: unknown }> => {
  const keyword = getStringArg(args, 'keyword');
  if (!keyword) {
    throw new Error('Missing keyword');
  }
  const results = await searchFiles(keyword, false);
  callbacks.onSystem(`Search complete for "${keyword}"`, {
    name: 'search_keyword',
    filename: `Global Search: "${keyword}"`,
    searchKeyword: keyword,
    searchResults: results,
    displayFormat: `Searching for "<strong>${keyword}</strong>" (${results.length} results)`
  });
  return { results };
};
