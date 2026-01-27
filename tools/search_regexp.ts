
import { Type } from '@google/genai';
import { searchFiles } from '../services/vaultOperations';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'search_regexp',
  description: 'Search using a regular expression across all files.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      pattern: { type: Type.STRING, description: 'The regex pattern' },
      flags: { type: Type.STRING, description: 'Optional regex flags (default: "i")' }
    },
    required: ['pattern']
  }
};

export const instruction = `- search_regexp: Advanced regex search. Use this to identify files for global replacements.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ results: unknown }> => {
  const pattern = getStringArg(args, 'pattern');
  const flags = getStringArg(args, 'flags') || 'i';
  if (!pattern) {
    throw new Error('Missing pattern');
  }
  const results = await searchFiles(pattern, true, flags);
  callbacks.onSystem(`Regex search complete for /${pattern}/`, {
    name: 'search_regexp',
    filename: `Regex: /${pattern}/${flags}`,
    searchResults: results,
    displayFormat: `Regex search "<strong>/${pattern}/${flags}</strong>" (${results.length} results)`
  });
  return { results };
};
