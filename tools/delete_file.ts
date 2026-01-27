import { Type } from '@google/genai';
import { deleteFile } from '../services/vaultOperations';
import { getDirectoryFromPath } from '../utils/environment';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'delete_file',
  description: 'Move an existing file from the vault to the trash folder (chat history/trash). Files in trash are hidden from directory listings.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: 'Path relative to vault root (e.g., "projects/notes.md" or "notes.md" for root level)' }
    },
    required: ['filename']
  }
};

export const instruction = `- delete_file: Use this to move a note to the trash folder (chat history/trash). Files in trash are hidden from directory listings but can be recovered manually. All paths are relative to vault root.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ status: string; filename: string }> => {
  const filename = getStringArg(args, 'filename');
  if (!filename) {
    throw new Error('Missing filename');
  }
  await deleteFile(filename);
  callbacks.onSystem(`Moved ${filename} to trash`, {
    name: 'delete_file',
    filename: filename,
    oldContent: filename,
    newContent: ''
  });
  const fileDirectory = getDirectoryFromPath(filename);
  callbacks.onFileState(fileDirectory, null);
  return { status: 'moved_to_trash', filename: filename };
};
