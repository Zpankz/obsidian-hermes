import { Type } from '@google/genai';
import { createDirectory } from '../services/mockFiles';

export const declaration = {
  name: 'create_directory',
  description: 'Create a new directory in the vault. Parent directories will be created automatically if they don\'t exist.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: 'Directory path relative to vault root (e.g., "projects/notes" or "archive" for root level)' }
    },
    required: ['path']
  }
};

export const instruction = `- create_directory: Use this to create new directories in the vault. All paths are relative to vault root. Parent directories are created automatically.`;

export const execute = async (args: any, callbacks: any): Promise<any> => {
  await createDirectory(args.path);
  callbacks.onSystem(`Created directory ${args.path}`, {
    name: 'create_directory',
    filename: args.path,
    newContent: `Directory created: ${args.path}`
  });
  callbacks.onFileState('/', args.path);
  return { status: 'created', path: args.path };
};
