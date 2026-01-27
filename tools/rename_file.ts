
import { Type } from '@google/genai';
import { renameFile } from '../services/vaultOperations';
import { getDirectoryFromPath, openFileInObsidian } from '../utils/environment';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'rename_file',
  description: 'Rename an existing file to a new name.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      oldFilename: { type: Type.STRING, description: 'The current name of the file' },
      newFilename: { type: Type.STRING, description: 'The new name for the file' }
    },
    required: ['oldFilename', 'newFilename']
  }
};

export const instruction = `- rename_file: Use this to change the name of a note. Ensure the new name follows markdown extension conventions if applicable.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ status: string; from: string; to: string }> => {
  const oldFilename = getStringArg(args, 'oldFilename');
  const newFilename = getStringArg(args, 'newFilename');
  if (!oldFilename || !newFilename) {
    throw new Error('Missing oldFilename or newFilename');
  }

  await renameFile(oldFilename, newFilename);
  
  // Open the renamed file in Obsidian
  await openFileInObsidian(newFilename);
  
  callbacks.onSystem(`Renamed ${oldFilename} to ${newFilename}`, {
    name: 'rename_file',
    filename: oldFilename,
    oldContent: oldFilename,
    newContent: newFilename
  });
  const newFileDirectory = getDirectoryFromPath(newFilename);
  callbacks.onFileState(newFileDirectory, newFilename);
  return { status: 'renamed', from: oldFilename, to: newFilename };
};
