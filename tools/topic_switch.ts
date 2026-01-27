
import { Type } from '@google/genai';
import type { ToolCallbacks } from '../types';

export const declaration = {
  name: 'topic_switch',
  description: 'Signal that a major topic shift has occurred. Provide a summary of the previous conversation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: 'A short one-sentence summary of the preceding conversation segment.' }
    },
    required: ['summary']
  }
};

export const instruction = `
TOPIC SWITCHING & PERSISTENCE: 
1. Monitor for significant topic switches in the conversation flow.
2. If a switch occurs, call "topic_switch" with a concise summary.
3. This will automatically trigger an ARCHIVE process.
4. Do NOT say "Done." after calling this. Proceed immediately to the next topic.`;

type ToolArgs = Record<string, unknown>;

const getStringArg = (args: ToolArgs, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
};

export const execute = (args: ToolArgs, callbacks: ToolCallbacks): Promise<{ status: string }> => {
  // Generate filename with x-chat-history prefix
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `x-chat-history-${timestamp}.md`;
  const summary = getStringArg(args, 'summary') || 'Topic switch';
  
  callbacks.onSystem('Context update', {
    name: 'topic_switch',
    filename: filename,
    newContent: summary
  });
  return Promise.resolve({ status: 'context_reset' });
};
