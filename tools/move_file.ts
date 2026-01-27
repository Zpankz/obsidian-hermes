import { Type } from '@google/genai';
import { moveFile } from '../services/vaultOperations';
import type { ToolCallbacks } from '../types';

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const declaration = {
  name: 'move_file',
  description: 'Move a file from one folder to another using paths relative to vault root',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sourcePath: {
        type: Type.STRING,
        description: 'Current path relative to vault root (e.g., "projects/notes.md" or "notes.md" for root level)'
      },
      targetPath: {
        type: Type.STRING, 
        description: 'New path relative to vault root (e.g., "archive/projects/notes.md" or "notes.md" for root level)'
      }
    },
    required: ['sourcePath', 'targetPath']
  }
};

export const instruction = `- move_file: Move a file using paths relative to vault root. All paths are relative to vault root (e.g., "projects/notes.md" or "notes.md" for root level files). Use this to reorganize files between folders.`;

export const execute = async (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ status: string; from: string; to: string }> => {
  const sourcePath = getStringArg(args, 'sourcePath');
  const targetPath = getStringArg(args, 'targetPath');
  if (!sourcePath || !targetPath) {
    throw new Error('Missing sourcePath or targetPath');
  }
  await moveFile(sourcePath, targetPath);
  
  callbacks.onSystem(`Moved ${sourcePath} to ${targetPath}`, {
    name: 'move_file',
    filename: sourcePath,
    displayFormat: `<span style="color: #fb923c; font-weight: 600;">${sourcePath}</span> <span style="color: #6b7280;">→</span> <span style="color: #10b981; font-weight: 600;">${targetPath}</span>`,
    dropdown: false
  });
  return { status: 'moved', from: sourcePath, to: targetPath };
};
