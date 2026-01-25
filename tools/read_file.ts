
import { Type } from '@google/genai';
import { readFile } from '../services/mockFiles';
import { getDirectoryFromPath } from '../utils/environment';

export const declaration = {
  name: 'read_file',
  description: 'Read the full content of a specified file using path relative to vault root.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: { type: Type.STRING, description: 'Path relative to vault root (e.g., "projects/notes.md" or "notes.md" for root level)' }
    },
    required: ['filename']
  }
};

export const instruction = `- read_file: Use this to ingest the contents of a note. All paths are relative to vault root (e.g., "projects/notes.md" or "notes.md" for root level). You should read a file before proposing major edits to ensure context.`;

export const execute = async (args: any, callbacks: any): Promise<any> => {
  const readContent = await readFile(args.filename);
  callbacks.onSystem(`Opened ${args.filename}`, {
    name: 'read_file',
    filename: args.filename,
    oldContent: readContent,
    newContent: readContent,
    additions: 0,
    removals: 0
  });
  const fileDirectory = getDirectoryFromPath(args.filename);
  callbacks.onFileState(fileDirectory, args.filename);
  return { content: readContent };
};
