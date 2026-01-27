
import { Type } from '@google/genai';
import { createFile } from '../services/vaultOperations';
import { getDirectoryFromPath, openFileInObsidian } from '../utils/environment';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'create_file',
  description: 'Create a new file with initial content using path relative to vault root.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: 'Path relative to vault root (e.g., "projects/notes.md" or "notes.md" for root level)' },
      content: { type: Type.STRING }
    },
    required: ['filename', 'content']
  }
};

export const instruction = `- create_file: Use this to initialize new notes in the vault. All paths are relative to vault root (e.g., "projects/notes.md" or "notes.md" for root level). Always provide meaningful initial content.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ status: string }> => {
  const filename = getStringArg(args, 'filename');
  const content = getStringArg(args, 'content') ?? '';
  if (!filename) {
    throw new Error('Missing filename');
  }

  await createFile(filename, content);
  
  // Open the newly created file in Obsidian
  await openFileInObsidian(filename);
  
  callbacks.onSystem(`Created ${filename}`, {
    name: 'create_file',
    filename: filename,
    oldContent: '',
    newContent: content,
    additions: content.split('\n').length,
    removals: 0
  });
  const fileDirectory = getDirectoryFromPath(filename);
  callbacks.onFileState(fileDirectory, filename);
  return { status: 'created' };
};
