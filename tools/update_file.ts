
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
  name: 'update_file',
  description: 'Overwrite the entire content of an existing file.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING },
      content: { type: Type.STRING }
    },
    required: ['filename', 'content']
  }
};

export const instruction = `- update_file: Use this for total overwrites. For smaller changes, prefer edit_file.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ status: string }> => {
  const filename = getStringArg(args, 'filename');
  const content = getStringArg(args, 'content') ?? '';
  if (!filename) {
    throw new Error('Missing filename');
  }

  const oldContent = await readFile(filename).catch(() => '');
  await updateFile(filename, content);
  
  // Open the updated file in Obsidian using smart tab management
  await openFileInObsidian(filename);
  
  const oldLines = oldContent.split('\n');
  const newLines = content.split('\n');
  const additions = newLines.filter(l => !oldLines.includes(l)).length;
  const removals = oldLines.filter(l => !newLines.includes(l)).length;

  callbacks.onSystem(`Updated ${filename}`, {
    name: 'update_file',
    filename: filename,
    oldContent,
    newContent: content,
    additions,
    removals
  });
  const fileDirectory = getDirectoryFromPath(filename);
  callbacks.onFileState(fileDirectory, filename);
  return { status: 'updated' };
};
