
import { Type } from '@google/genai';
import { readFile, editFile } from '../services/vaultOperations';
import { getDirectoryFromPath, openFileInObsidian } from '../utils/environment';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

const getNumberArg = (args: ToolArgs, key: string): number | undefined => {
  const value = args[key];
  return typeof value === 'number' ? value : undefined;
};

export const declaration = {
  name: 'edit_file',
  description: 'Perform granular line-based edits on a file.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING },
      operation: { 
        type: Type.STRING, 
        enum: ['append', 'replace_line', 'remove_line']
      }, 
      text: { type: Type.STRING }, 
      lineNumber: { type: Type.NUMBER }
    },
    required: ['filename', 'operation']
  }
};

export const instruction = `- edit_file: Use this for targeted modifications (appending, replacing lines, or removing lines).`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ status: string }> => {
  const filename = getStringArg(args, 'filename');
  const operation = getStringArg(args, 'operation') as 'append' | 'replace_line' | 'remove_line' | undefined;
  const text = getStringArg(args, 'text');
  const lineNumber = getNumberArg(args, 'lineNumber');

  if (!filename || !operation) {
    throw new Error('Missing filename or operation');
  }

  const oldContent = await readFile(filename).catch(() => '');
  await editFile(filename, operation, text, lineNumber);
  const newContent = await readFile(filename);

  // Open the edited file in Obsidian using smart tab management
  await openFileInObsidian(filename);

  callbacks.onSystem(`Edited ${filename}`, {
    name: 'edit_file',
    filename: filename,
    oldContent,
    newContent,
    additions: operation === 'append' ? 1 : (operation === 'replace_line' ? 1 : 0),
    removals: operation === 'remove_line' ? 1 : (operation === 'replace_line' ? 1 : 0)
  });
  const fileDirectory = getDirectoryFromPath(filename);
  callbacks.onFileState(fileDirectory, filename);
  return { status: 'edited' };
};
