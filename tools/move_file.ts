import { Type } from '@google/genai';
import { moveFile } from '../services/mockFiles';

export const declaration = {
  name: 'move_file',
  description: 'Move a file from one folder to another',
  parameters: {
    type: Type.OBJECT,
    properties: {
      sourcePath: {
        type: Type.STRING,
        description: 'Current path of the file to move (e.g., "projects/notes.md")'
      },
      targetPath: {
        type: Type.STRING, 
        description: 'New path for the file (e.g., "archive/projects/notes.md")'
      }
    },
    required: ['sourcePath', 'targetPath']
  }
};

export const instruction = `- move_file: Move a file from one location to another in the vault. Use this to reorganize files between folders.`;

export const execute = async (args: any, callbacks: any): Promise<any> => {
  const result = await moveFile(args.sourcePath, args.targetPath);
  callbacks.onSystem(`Moved ${args.sourcePath} to ${args.targetPath}`, {
    name: 'move_file',
    filename: args.sourcePath,
    oldContent: args.sourcePath,
    newContent: args.targetPath
  });
  callbacks.onFileState('/', [args.sourcePath, args.targetPath]);
  return { status: 'moved', from: args.sourcePath, to: args.targetPath };
};
