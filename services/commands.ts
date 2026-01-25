
import * as list_directory from '../tools/list_directory';
import * as list_vault_files from '../tools/list_vault_files';
import * as get_folder_tree from '../tools/get_folder_tree';
import * as dirlist from '../tools/dirlist';
import * as read_file from '../tools/read_file';
import * as create_file from '../tools/create_file';
import * as update_file from '../tools/update_file';
import * as edit_file from '../tools/edit_file';
import * as rename_file from '../tools/rename_file';
import * as move_file from '../tools/move_file';
import * as search_keyword from '../tools/search_keyword';
import * as search_regexp from '../tools/search_regexp';
import * as search_replace_file from '../tools/search_replace_file';
import * as search_replace_global from '../tools/search_replace_global';
import * as topic_switch from '../tools/topic_switch';
import * as web_search from '../tools/web_search';
import { ToolData } from '../types';

const TOOLS: Record<string, any> = {
  list_directory,
  list_vault_files,
  get_folder_tree,
  dirlist,
  read_file,
  create_file,
  update_file,
  edit_file,
  rename_file,
  move_file,
  search_keyword,
  search_regexp,
  search_and_replace_regex_in_file: search_replace_file,
  search_and_replace_regex_global: search_replace_global,
  topic_switch,
  internet_search: web_search
};

export const COMMAND_DECLARATIONS = Object.values(TOOLS).map(t => t.declaration);

export const executeCommand = async (
  name: string, 
  args: any, 
  callbacks: {
    onLog: (msg: string, type: 'action' | 'error', duration?: number, errorDetails?: any) => void,
    onSystem: (text: string, toolData?: ToolData) => void,
    onFileState: (folder: string, note: string | string[] | null) => void
  }
): Promise<any> => {
  const startTime = performance.now();
  const tool = TOOLS[name];

  if (!tool) {
    const errorDetails = {
      toolName: name,
      content: JSON.stringify(args, null, 2),
      contentSize: JSON.stringify(args).length,
      apiCall: 'executeCommand'
    };
    callbacks.onLog(`Tool not found: ${name}`, 'error', undefined, errorDetails);
    throw new Error(`Command ${name} not found`);
  }

  const toolCallId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  // Signal start of execution
  callbacks.onSystem(`${name.replace(/_/g, ' ').toUpperCase()}...`, {
    id: toolCallId,
    name,
    filename: args.filename || (name === 'internet_search' ? 'Web' : 'Registry'),
    status: 'pending'
  });

  // Wrapped callbacks to ensure tool call ID is preserved for updates
  const wrappedCallbacks = {
    ...callbacks,
    onSystem: (text: string, toolData?: ToolData) => {
      callbacks.onSystem(text, { ...toolData, id: toolCallId } as ToolData);
    }
  };

  try {
    const result = await tool.execute(args, wrappedCallbacks);
    
    // Check if result exceeds threshold
    if (result && result.files && result.files.length > 200) {
      const error = new Error(`Tool returned ${result.files.length} entries, exceeding threshold of 200. Please refine your search.`);
      const duration = Math.round(performance.now() - startTime);
      const errorDetails = {
        toolName: name,
        content: `Returned ${result.files.length} files: ${result.files.slice(0, 5).join(', ')}${result.files.length > 5 ? '...' : ''}`,
        contentSize: result.files.length,
        apiCall: 'threshold_check'
      };
      callbacks.onLog(`Error in ${name}: ${error.message}`, 'error', duration, errorDetails);
      wrappedCallbacks.onSystem(`Error: ${error.message}`, { 
        name, 
        filename: args.filename || (name === 'internet_search' ? 'Web' : 'unknown'), 
        error: error.message,
        status: 'error'
      } as ToolData);
      throw error;
    }
    
    const duration = Math.round(performance.now() - startTime);
    callbacks.onLog(`Executed ${name} in ${duration}ms`, 'action', duration);
    return result;
  } catch (error: any) {
    const duration = Math.round(performance.now() - startTime);
    const errorDetails = {
      toolName: name,
      content: JSON.stringify(args, null, 2),
      contentSize: JSON.stringify(args).length,
      stack: error.stack,
      apiCall: 'tool_execution'
    };
    callbacks.onLog(`Error in ${name}: ${error.message}`, 'error', duration, errorDetails);
    wrappedCallbacks.onSystem(`Error: ${error.message}`, { 
      name, 
      filename: args.filename || (name === 'internet_search' ? 'Web' : 'unknown'), 
      error: error.message,
      status: 'error'
    } as ToolData);
    throw error;
  }
};
