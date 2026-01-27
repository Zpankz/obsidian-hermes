
import { Type } from '@google/genai';
import { readFile, updateFile } from '../services/vaultOperations';
import { getDirectoryFromPath, openFileInObsidian } from '../utils/environment';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'search_and_replace_regex_in_file',
  description: 'Search and replace text in a specific file using regex.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING },
      pattern: { type: Type.STRING },
      replacement: { type: Type.STRING },
      flags: { type: Type.STRING, description: 'Optional regex flags (default: "g")' }
    },
    required: ['filename', 'pattern', 'replacement']
  }
};

export const instruction = `- search_and_replace_regex_in_file: Targeted regex replacement within a single node.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ status: string }> => {
  const filename = getStringArg(args, 'filename');
  const pattern = getStringArg(args, 'pattern');
  const replacement = getStringArg(args, 'replacement') ?? '';
  const flags = getStringArg(args, 'flags') || 'g';
  if (!filename || !pattern) {
    throw new Error('Missing filename or pattern');
  }

  const oldContent = await readFile(filename);
  const re = new RegExp(pattern, flags);
  const newContent = oldContent.replace(re, replacement);
  await updateFile(filename, newContent);

  // Open the modified file in Obsidian using smart tab management
  await openFileInObsidian(filename);

  callbacks.onSystem(`Replaced in ${filename}`, {
    name: 'search_and_replace_regex_in_file',
    filename: filename,
    oldContent,
    newContent,
    additions: 1, // Simplified
    removals: 1   // Simplified
  });
  const fileDirectory = getDirectoryFromPath(filename);
  callbacks.onFileState(fileDirectory, filename);
  return { status: 'success' };
};
