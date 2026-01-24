
import { Type } from '@google/genai';

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
3. This will automatically trigger an ARCHIVE process, creating a .md file of the conversation history for that segment.
4. The archive will format your responses as blockquotes (>) and system/tool data as code blocks.
5. Respond with "Done." then proceed with the new topic.`;

export const execute = async (args: any, callbacks: any): Promise<any> => {
  callbacks.onSystem("Context Update", {
    name: 'topic_switch',
    filename: 'Session Context',
    newContent: args.summary
  });
  return { status: "context_reset" };
};
