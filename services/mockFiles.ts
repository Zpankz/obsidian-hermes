
import { loadFiles, saveFiles } from './persistence';
import { SearchResult, SearchMatch } from '../types';

// Check if we are running inside Obsidian
// @ts-ignore
const isObsidian = typeof app !== 'undefined' && app.vault !== undefined;

const DEFAULT_FILES: Record<string, string> = {
  'first.md': `Green leaves in the wind,
Softly dancing on the branch,
Nature's quiet song.`,
  'second.md': `Golden sun descends,
Painting clouds in fire light,
Day turns into night.`,
  'third.md': `Winter's cold embrace,
Snowflakes drift on silent air,
World is white and still.`,
  'projects/ideas.md': `# Project Ideas
- Voice controlled vault
- Markdown visualizer
- AI Haiku generator`,
  'projects/tasks.md': `# Task List
- [ ] Implement rename tool
- [ ] Fix markdown rendering
- [ ] Add batch action logic`,
  'projects/notes.md': `# Research Notes
Vaults are better when they are interactive. Hermes is the messenger.`
};

let MOCK_FILES: Record<string, string> = { ...DEFAULT_FILES };
let initialized = false;

export const initFileSystem = async () => {
  if (initialized) return;
  if (isObsidian) {
    initialized = true;
    return;
  }
  const persisted = await loadFiles();
  if (persisted) {
    MOCK_FILES = persisted;
  } else {
    await saveFiles(DEFAULT_FILES);
  }
  initialized = true;
};

export const listDirectory = (): string[] => {
  if (isObsidian) {
    // @ts-ignore
    return app.vault.getMarkdownFiles().map(f => f.path);
  }
  return Object.keys(MOCK_FILES);
};

export const readFile = async (filename: string): Promise<string> => {
  if (isObsidian) {
    // @ts-ignore
    const file = app.vault.getAbstractFileByPath(filename);
    if (!file) throw new Error(`File not found in vault: ${filename}`);
    // @ts-ignore
    return await app.vault.read(file);
  }

  const content = MOCK_FILES[filename.toLowerCase()];
  if (!content) {
    throw new Error(`File not found: ${filename}`);
  }
  return content;
};

export const createFile = async (filename: string, content: string): Promise<string> => {
  if (isObsidian) {
    // @ts-ignore
    await app.vault.create(filename, content);
    return `Created ${filename} in vault`;
  }

  const key = filename.toLowerCase();
  if (MOCK_FILES[key]) {
    throw new Error(`File already exists: ${filename}`);
  }
  MOCK_FILES[key] = content;
  await saveFiles(MOCK_FILES);
  return `Successfully created ${filename}`;
};

export const updateFile = async (filename: string, content: string): Promise<string> => {
  if (isObsidian) {
    // @ts-ignore
    const file = app.vault.getAbstractFileByPath(filename);
    if (!file) throw new Error(`File not found: ${filename}`);
    // @ts-ignore
    await app.vault.modify(file, content);
    return `Updated ${filename} in vault`;
  }

  const key = filename.toLowerCase();
  if (!MOCK_FILES[key]) {
    throw new Error(`File not found: ${filename}`);
  }
  MOCK_FILES[key] = content;
  await saveFiles(MOCK_FILES);
  return `Successfully updated ${filename}`;
};

// Fix for Error: Cannot find name 'old'. (line 120)
// Completing the renameFile function and ensuring all logic branches are correctly closed.
export const renameFile = async (oldFilename: string, newFilename: string): Promise<string> => {
  if (isObsidian) {
    // @ts-ignore
    const file = app.vault.getAbstractFileByPath(oldFilename);
    if (!file) throw new Error(`File not found: ${oldFilename}`);
    // @ts-ignore
    await app.fileManager.renameFile(file, newFilename);
    return `Renamed ${oldFilename} to ${newFilename} in vault`;
  }

  const oldKey = oldFilename.toLowerCase();
  const newKey = newFilename.toLowerCase();
  
  if (!MOCK_FILES[oldKey]) {
    throw new Error(`File not found: ${oldFilename}`);
  }
  if (MOCK_FILES[newKey]) {
    throw new Error(`File already exists: ${newFilename}`);
  }
  
  const content = MOCK_FILES[oldKey];
  delete MOCK_FILES[oldKey];
  MOCK_FILES[newKey] = content;
  await saveFiles(MOCK_FILES);
  return `Successfully renamed ${oldFilename} to ${newFilename}`;
};

// Fix for Error: Module '"../services/mockFiles"' has no exported member 'editFile'.
// Implementation of granular line-based editing.
export const editFile = async (filename: string, operation: string, text?: string, lineNumber?: number): Promise<string> => {
  const content = await readFile(filename);
  const lines = content.split('\n');

  if (operation === 'append') {
    lines.push(text || '');
  } else if (operation === 'replace_line') {
    if (lineNumber === undefined || lineNumber < 1 || lineNumber > lines.length) {
      throw new Error(`Invalid line number: ${lineNumber}`);
    }
    lines[lineNumber - 1] = text || '';
  } else if (operation === 'remove_line') {
    if (lineNumber === undefined || lineNumber < 1 || lineNumber > lines.length) {
      throw new Error(`Invalid line number: ${lineNumber}`);
    }
    lines.splice(lineNumber - 1, 1);
  } else {
    throw new Error(`Unknown operation: ${operation}`);
  }

  const newContent = lines.join('\n');
  await updateFile(filename, newContent);
  return `Successfully performed ${operation} on ${filename}`;
};

// Fix for Error: Module '"../services/mockFiles"' has no exported member 'searchFiles'.
// Implementation of keyword and regex based search across the vault.
export const searchFiles = async (query: string, isRegex: boolean = false, flags: string = 'i'): Promise<SearchResult[]> => {
  const filenames = listDirectory();
  const results: SearchResult[] = [];

  const regex = isRegex ? new RegExp(query, flags) : null;
  const keyword = !isRegex ? query.toLowerCase() : '';

  for (const filename of filenames) {
    const content = await readFile(filename);
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];

    lines.forEach((line, index) => {
      let matched = false;
      if (isRegex && regex) {
        matched = regex.test(line);
      } else {
        matched = line.toLowerCase().includes(keyword);
      }

      if (matched) {
        matches.push({
          line: index + 1,
          content: line,
          contextBefore: lines.slice(Math.max(0, index - 2), index),
          contextAfter: lines.slice(index + 1, Math.min(lines.length, index + 3))
        });
      }
    });

    if (matches.length > 0) {
      results.push({ filename, matches });
    }
  }

  return results;
};
